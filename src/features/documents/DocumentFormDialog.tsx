import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DOC_CATEGORIES,
  DOC_STATUSES,
  FISCAL_YEARS,
  createDocument,
  formatBytes,
  updateDocument,
  uploadFile,
  type Document,
} from "@/features/documents/api";
import type { Company } from "@/features/companies/api";

const NONE = "__none__";

interface FormState {
  nome: string;
  company_id: string;
  categoria: string;
  status_doc: string;
  ano_fiscal: string;
  versao: string;
  data_upload: string;
  notas: string;
}

const empty = (): FormState => ({
  nome: "",
  company_id: NONE,
  categoria: "Legal",
  status_doc: "Atual",
  ano_fiscal: String(new Date().getFullYear()),
  versao: "1",
  data_upload: new Date().toISOString().slice(0, 10),
  notas: "",
});

interface Props {
  open: boolean;
  document: Document | null;
  companies: Company[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DocumentFormDialog({
  open,
  document: doc,
  companies,
  onOpenChange,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc) {
      setForm({
        nome: doc.nome,
        company_id: doc.company_id ?? NONE,
        categoria: doc.categoria,
        status_doc: doc.status_doc,
        ano_fiscal: doc.ano_fiscal ?? "",
        versao: doc.versao,
        data_upload: doc.data_upload,
        notas: doc.notas ?? "",
      });
    } else {
      setForm(empty());
    }
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [doc, open]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!form.nome) update("nome", f.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      let filePayload = {};
      if (file) {
        const uploaded = await uploadFile(file);
        filePayload = {
          file_path: uploaded.path,
          file_size: uploaded.size,
          file_type: uploaded.type,
          mime_type: uploaded.mime,
        };
      }
      const payload = {
        nome: form.nome.trim(),
        company_id: form.company_id === NONE ? null : form.company_id,
        categoria: form.categoria,
        status_doc: form.status_doc,
        ano_fiscal: form.ano_fiscal || null,
        versao: form.versao || "1",
        data_upload: form.data_upload,
        notas: form.notas || null,
        ...filePayload,
      };
      if (doc) {
        await updateDocument(doc.id, payload);
        toast.success("Documento atualizado");
      } else {
        await createDocument(payload);
        toast.success("Documento criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc ? "Editar documento" : "Novo documento"}</DialogTitle>
          <DialogDescription>
            Anexe um arquivo (até 20MB) ou apenas registre o documento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => update("nome", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={form.company_id}
                onValueChange={(v) => update("company_id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— sem vínculo —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => update("categoria", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status_doc}
                onValueChange={(v) => update("status_doc", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano fiscal</Label>
              <Select
                value={form.ano_fiscal || NONE}
                onValueChange={(v) => update("ano_fiscal", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {FISCAL_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="versao">Versão</Label>
              <Input
                id="versao"
                value={form.versao}
                onChange={(e) => update("versao", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_upload">Data de upload</Label>
              <Input
                id="data_upload"
                type="date"
                value={form.data_upload}
                onChange={(e) => update("data_upload", e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Arquivo</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  {doc?.file_path ? "Substituir arquivo" : "Anexar arquivo"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={onFileChange}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span>({formatBytes(file.size)})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {!file && doc?.file_path && (
                  <span className="text-xs text-muted-foreground">
                    Arquivo atual mantido
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notas">Observações</Label>
              <Textarea
                id="notas"
                rows={2}
                value={form.notas}
                onChange={(e) => update("notas", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
