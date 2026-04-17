import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createEmployee,
  updateEmployee,
  type Employee,
} from "@/features/employees/api";
import type { Company } from "@/features/companies/api";

interface FormState {
  nome: string;
  company_id: string;
  cargo: string;
  departamento: string;
  salario: string;
  moeda_salario: "BRL" | "USD";
  admissao: string;
  status: "ativo" | "inativo";
  email: string;
  telefone: string;
  pais: "BR" | "US";
  documento: string;
}

const NONE = "__none__";

const empty: FormState = {
  nome: "",
  company_id: NONE,
  cargo: "",
  departamento: "",
  salario: "",
  moeda_salario: "BRL",
  admissao: "",
  status: "ativo",
  email: "",
  telefone: "",
  pais: "BR",
  documento: "",
};

interface Props {
  open: boolean;
  employee: Employee | null;
  companies: Company[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EmployeeFormDialog({
  open,
  employee,
  companies,
  onOpenChange,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        nome: employee.nome,
        company_id: employee.company_id ?? NONE,
        cargo: employee.cargo ?? "",
        departamento: employee.departamento ?? "",
        salario: employee.salario != null ? String(employee.salario) : "",
        moeda_salario: (employee.moeda_salario as "BRL" | "USD") ?? "BRL",
        admissao: employee.admissao ?? "",
        status: (employee.status as "ativo" | "inativo") ?? "ativo",
        email: employee.email ?? "",
        telefone: employee.telefone ?? "",
        pais: (employee.pais as "BR" | "US") ?? "BR",
        documento: employee.documento ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [employee, open]);

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
        company_id: form.company_id === NONE ? null : form.company_id,
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        salario: form.salario ? Number(form.salario) : null,
        moeda_salario: form.moeda_salario,
        admissao: form.admissao || null,
        status: form.status,
        email: form.email || null,
        telefone: form.telefone || null,
        pais: form.pais,
        documento: form.documento || null,
      };
      if (employee) {
        await updateEmployee(employee.id, payload);
        toast.success("Funcionário atualizado");
      } else {
        await createEmployee(payload);
        toast.success("Funcionário criado");
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
          <DialogTitle>
            {employee ? "Editar funcionário" : "Novo funcionário"}
          </DialogTitle>
          <DialogDescription>Dados pessoais e contratuais</DialogDescription>
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
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as "ativo" | "inativo")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => update("cargo", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept">Departamento</Label>
              <Input
                id="dept"
                value={form.departamento}
                onChange={(e) => update("departamento", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salario">Salário</Label>
              <Input
                id="salario"
                type="number"
                step="0.01"
                value={form.salario}
                onChange={(e) => update("salario", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select
                value={form.moeda_salario}
                onValueChange={(v) =>
                  update("moeda_salario", v as "BRL" | "USD")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissao">Admissão</Label>
              <Input
                id="admissao"
                type="date"
                value={form.admissao}
                onChange={(e) => update("admissao", e.target.value)}
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
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="US">EUA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => update("telefone", e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="documento">
                {form.pais === "US" ? "SSN" : "CPF"}
              </Label>
              <Input
                id="documento"
                value={form.documento}
                onChange={(e) => update("documento", e.target.value)}
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
