import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  deleteEmployee,
  formatSalary,
  listEmployees,
  toggleArchiveEmployee,
  type Employee,
} from "@/features/employees/api";
import { listCompanies, type Company } from "@/features/companies/api";
import { EmployeeFormDialog } from "@/features/employees/EmployeeFormDialog";

const ALL = "__all__";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  useEffect(() => {
    document.title = "Funcionários — Hub Empresarial";
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const [emp, comp] = await Promise.all([
        listEmployees(includeArchived),
        listCompanies(true),
      ]);
      setEmployees(emp);
      setCompanies(comp);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const companyName = (id: string | null) =>
    id ? companies.find((c) => c.id === id)?.nome ?? "—" : "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (companyFilter !== ALL && e.company_id !== companyFilter) return false;
      if (!q) return true;
      return (
        e.nome.toLowerCase().includes(q) ||
        (e.cargo ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, search, companyFilter]);

  const activeCount = employees.filter((e) => e.status === "ativo" && !e.arquivado).length;

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (e: Employee) => {
    setEditing(e);
    setFormOpen(true);
  };
  const handleArchive = async (e: Employee) => {
    try {
      await toggleArchiveEmployee(e.id, !e.arquivado);
      toast.success(e.arquivado ? "Funcionário restaurado" : "Funcionário arquivado");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEmployee(confirmDelete.id);
      toast.success("Funcionário excluído");
      setConfirmDelete(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <AppLayout title="Funcionários">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Funcionários</h2>
            <p className="text-sm text-muted-foreground">
              {activeCount} ativos de {employees.length} registrados
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Novo funcionário
          </Button>
        </header>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cargo ou e-mail..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as empresas</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={includeArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludeArchived((v) => !v)}
              >
                <Archive className="h-4 w-4" />
                {includeArchived ? "Mostrando arquivados" : "Ver arquivados"}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Salário</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum funcionário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((e) => (
                      <TableRow key={e.id} className={e.arquivado ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="font-medium">{e.nome}</div>
                          {e.email && (
                            <div className="text-xs text-muted-foreground">{e.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{companyName(e.company_id)}</TableCell>
                        <TableCell>{e.cargo ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.departamento ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatSalary(e.salario != null ? Number(e.salario) : null, e.moeda_salario)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.admissao
                            ? new Date(e.admissao).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={e.status === "ativo" ? "default" : "secondary"}>
                            {e.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(e)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleArchive(e)}
                              aria-label={e.arquivado ? "Restaurar" : "Arquivar"}
                            >
                              {e.arquivado ? (
                                <ArchiveRestore className="h-4 w-4" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConfirmDelete(e)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeeFormDialog
        open={formOpen}
        employee={editing}
        companies={companies.filter((c) => !c.arquivada)}
        onOpenChange={setFormOpen}
        onSaved={reload}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. {confirmDelete?.nome} será removido
              permanentemente. Considere arquivar em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
