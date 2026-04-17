import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import {
  createTask,
  updateTask,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
} from "./api";
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
  companies: Company[];
  onSaved: () => void;
}

const PRIO_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  "em-andamento": "Em andamento",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};

const inSevenDays = () =>
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export function TaskFormDialog({ open, onOpenChange, task, companies, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<string>("Fiscal");
  const [companyId, setCompanyId] = useState<string>("");
  const [vencimento, setVencimento] = useState<string>(inSevenDays());
  const [responsavel, setResponsavel] = useState("");
  const [prioridade, setPrioridade] = useState<string>("media");
  const [status, setStatus] = useState<string>("pendente");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(task?.titulo ?? "");
      setDescricao(task?.descricao ?? "");
      setTipo(task?.tipo ?? "Fiscal");
      setCompanyId(task?.company_id ?? "");
      setVencimento(task?.vencimento ?? inSevenDays());
      setResponsavel(task?.responsavel ?? "");
      setPrioridade(task?.prioridade ?? "media");
      setStatus(task?.status ?? "pendente");
      setNotas(task?.notas ?? "");
    }
  }, [open, task]);

  async function handleSave() {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    if (!vencimento) {
      toast.error("Prazo é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        company_id: companyId || null,
        vencimento,
        responsavel: responsavel.trim() || null,
        prioridade,
        status,
        notas: notas.trim() || null,
      };
      if (task?.id) {
        await updateTask(task.id, payload);
        toast.success("Tarefa atualizada.");
      } else {
        await createTask(payload);
        toast.success("Tarefa criada.");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="titulo">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Declaração IRPJ 2024, Renovar Green Card..."
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes, contexto, instruções..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entidade vinculada</Label>
            <Select value={companyId || "__none"} onValueChange={(v) => setCompanyId(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma (pessoal)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhuma (pessoal)</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vencimento">
              Prazo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input
              id="responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{PRIO_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações adicionais"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
