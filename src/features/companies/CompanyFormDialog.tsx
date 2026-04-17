import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  COUNTRY_OPTIONS,
  STATUS_OPTIONS,
  createCompany,
  updateCompany,
  type Company,
} from "@/features/companies/api";

interface FormState {
  nome: string;
  pais: "BR" | "US";
  tipo_juridico: string;
  documento: string;
  estado: string;
  setor: string;
  data_abertura: string;
  data_encerramento: string;
  status: string;
  cfc_flag: boolean;
  tags: string;
  notas: string;
}

const empty: FormState = {
  nome: "",
  pais: "BR",
  tipo_juridico: "",
  documento: "",
  estado: "",
  setor: "",
  data_abertura: "",
  data_encerramento: "",
  status: "ativa",
  cfc_flag: false,
  tags: "",
  notas: "",
};

interface Props {
  open: boolean;
  company: Company | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CompanyFormDialog({ open, company, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        nome: company.nome,
        pais: (company.pais as "BR" | "US") ?? "BR",
        tipo_juridico: company.tipo_juridico ?? "",
        documento: company.documento ?? "",
        estado: company.estado ?? "",
        setor: company.setor ?? "",
        data_abertura: company.data_abertura ?? "",
        data_encerramento: company.data_encerramento ?? "",
        status: company.status,
        cfc_flag: company.cfc_flag,
        tags: (company.tags ?? []).join(", "),
        notas: company.notas ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [company, open]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        pais: form.pais,
        tipo_juridico: form.tipo_juridico || null,
        documento: form.documento || null,
        estado: form.estado || null,
        setor: form.setor || null,
        data_abertura: form.data_abertura || null,
        data_encerramento: form.data_encerramento || null,
        status: form.status,
        cfc_flag: form.cfc_flag,
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notas: form.notas || null,
      };
      if (company) {
        await updateCompany(company.id, payload);
        toast.success("Empresa atualizada");
      } else {
        await createCompany(payload);
        toast.success("Empresa criada");
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
          <DialogTitle>{company ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>Dados cadastrais da entidade</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome legal *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => update("nome", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>País</Label>
              <Select
                value={form.pais}
                onValueChange={(v) => update("pais", v as "BR" | "US")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo jurídico</Label>
              <Input
                id="tipo"
                placeholder="LLC, LTDA, S/A..."
                value={form.tipo_juridico}
                onChange={(e) => update("tipo_juridico", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc">{form.pais === "BR" ? "CNPJ" : "EIN"}</Label>
              <Input
                id="doc"
                value={form.documento}
                onChange={(e) => update("documento", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado / UF</Label>
              <Input
                id="estado"
                value={form.estado}
                onChange={(e) => update("estado", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input
                id="setor"
                value={form.setor}
                onChange={(e) => update("setor", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abertura">Data de abertura</Label>
              <Input
                id="abertura"
                type="date"
                value={form.data_abertura}
                onChange={(e) => update("data_abertura", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="encerramento">Data de encerramento</Label>
              <Input
                id="encerramento"
                type="date"
                value={form.data_encerramento}
                onChange={(e) => update("data_encerramento", e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                placeholder="holding, operacional, ..."
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="cfc"
                checked={form.cfc_flag}
                onCheckedChange={(v) => update("cfc_flag", v)}
              />
              <Label htmlFor="cfc" className="cursor-pointer">
                Marcar como CFC (Controlled Foreign Corporation)
              </Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notas">Observações</Label>
              <Textarea
                id="notas"
                rows={3}
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
