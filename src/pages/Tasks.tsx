import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  Search,
  Pencil,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Clock,
  CalendarRange,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTasks,
  archiveTask,
  unarchiveTask,
  cycleTaskStatus,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
} from "@/features/tasks/api";
import { listCompanies, type Company } from "@/features/companies/api";
import { TaskFormDialog } from "@/features/tasks/TaskFormDialog";

const PRIO_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  "em-andamento": "Em andamento",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};

const PRIO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  alta: "destructive",
  media: "default",
  baixa: "secondary",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline",
  "em-andamento": "default",
  concluida: "secondary",
  bloqueada: "destructive",
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const inDaysStr = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("__all");
  const [filterStatus, setFilterStatus] = useState<string>("__all");
  const [filterPrio, setFilterPrio] = useState<string>("__all");
  const [filterEmp, setFilterEmp] = useState<string>("__all");
  const [filterVenc, setFilterVenc] = useState<string>("__all"); // vencidas | hoje | semana | futuras
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Task | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [tk, emp] = await Promise.all([listTasks(showArchived), listCompanies(false)]);
      setTasks(tk);
      setCompanies(emp);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const today = todayStr();
  const in7 = inDaysStr(7);

  const counts = useMemo(() => {
    const active = tasks.filter((r) => !r.arquivada);
    return {
      total: active.length,
      vencidas: active.filter((r) => r.status !== "concluida" && r.vencimento && r.vencimento < today).length,
      hoje: active.filter((r) => r.status !== "concluida" && r.vencimento === today).length,
      semana: active.filter((r) => r.status !== "concluida" && r.vencimento && r.vencimento > today && r.vencimento <= in7).length,
      concluidas: active.filter((r) => r.status === "concluida").length,
    };
  }, [tasks, today, in7]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks
      .filter((r) => {
        if (filterTipo !== "__all" && r.tipo !== filterTipo) return false;
        if (filterStatus !== "__all" && r.status !== filterStatus) return false;
        if (filterPrio !== "__all" && r.prioridade !== filterPrio) return false;
        if (filterEmp !== "__all") {
          if (filterEmp === "__none" && r.company_id) return false;
          if (filterEmp !== "__none" && r.company_id !== filterEmp) return false;
        }
        if (filterVenc !== "__all") {
          const v = r.vencimento;
          if (!v) return false;
          if (filterVenc === "vencidas" && !(v < today && r.status !== "concluida")) return false;
          if (filterVenc === "hoje" && v !== today) return false;
          if (filterVenc === "semana" && !(v > today && v <= in7)) return false;
          if (filterVenc === "futuras" && !(v > in7)) return false;
        }
        if (q) {
          const blob = `${r.titulo} ${r.descricao ?? ""} ${r.responsavel ?? ""}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aOver = a.vencimento && a.vencimento < today ? 0 : 1;
        const bOver = b.vencimento && b.vencimento < today ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.vencimento ?? "").localeCompare(b.vencimento ?? "");
      });
  }, [tasks, search, filterTipo, filterStatus, filterPrio, filterEmp, filterVenc, today, in7]);

  const empName = (id: string | null) => companies.find((c) => c.id === id)?.nome ?? "—";

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    try {
      if (archiveTarget.arquivada) {
        await unarchiveTask(archiveTarget.id);
        toast.success("Tarefa restaurada.");
      } else {
        await archiveTask(archiveTarget.id);
        toast.success("Tarefa arquivada.");
      }
      setArchiveTarget(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao arquivar tarefa.");
    }
  }

  async function handleCycleStatus(task: Task) {
    try {
      const updated = await cycleTaskStatus(task);
      setTasks((prev) => prev.map((r) => (r.id === task.id ? updated : r)));
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar status.");
    }
  }

  const hasFilters =
    search ||
    filterTipo !== "__all" ||
    filterStatus !== "__all" ||
    filterPrio !== "__all" ||
    filterEmp !== "__all" ||
    filterVenc !== "__all";

  function clearFilters() {
    setSearch("");
    setFilterTipo("__all");
    setFilterStatus("__all");
    setFilterPrio("__all");
    setFilterEmp("__all");
    setFilterVenc("__all");
  }

  const summaryCards = [
    { key: "vencidas", label: "Vencidas", count: counts.vencidas, icon: AlertTriangle, tone: "text-destructive" },
    { key: "hoje", label: "Hoje", count: counts.hoje, icon: Clock, tone: "text-yellow-600 dark:text-yellow-400" },
    { key: "semana", label: "Próx. 7 dias", count: counts.semana, icon: CalendarRange, tone: "text-primary" },
    { key: "concluidas", label: "Concluídas", count: counts.concluidas, icon: CheckCircle2, tone: "text-muted-foreground" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks & Deadlines</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {counts.total} tarefa{counts.total === 1 ? "" : "s"}
              {counts.vencidas > 0 && (
                <span className="text-destructive font-medium"> · {counts.vencidas} vencida{counts.vencidas === 1 ? "" : "s"}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Ocultar arquivadas" : "Ver arquivadas"}
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Nova tarefa
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((s) => {
            const Icon = s.icon;
            const active =
              (s.key === "concluidas" && filterStatus === "concluida") ||
              (s.key !== "concluidas" && filterVenc === s.key);
            return (
              <button
                key={s.key}
                onClick={() => {
                  if (s.key === "concluidas") {
                    setFilterStatus(filterStatus === "concluida" ? "__all" : "concluida");
                  } else {
                    setFilterVenc(filterVenc === s.key ? "__all" : s.key);
                  }
                }}
                className={`flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition hover:bg-accent ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                <Icon className={`h-5 w-5 ${s.tone}`} />
                <div>
                  <div className="text-2xl font-semibold leading-none">{s.count}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-3 flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa, responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os tipos</SelectItem>
              {TASK_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPrio} onValueChange={setFilterPrio}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Prioridade</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIO_LABEL[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterVenc} onValueChange={setFilterVenc}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Qualquer vencimento</SelectItem>
              <SelectItem value="vencidas">Vencidas</SelectItem>
              <SelectItem value="hoje">Vencem hoje</SelectItem>
              <SelectItem value="semana">Próximos 7 dias</SelectItem>
              <SelectItem value="futuras">Mais de 7 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as entidades</SelectItem>
              <SelectItem value="__none">Sem entidade (pessoal)</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {hasFilters ? "Nenhuma tarefa encontrada com esses filtros." : "Nenhuma tarefa cadastrada ainda."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tk) => {
                  const isOverdue = tk.vencimento && tk.vencimento < today && tk.status !== "concluida";
                  const isToday = tk.vencimento === today && tk.status !== "concluida";
                  const isWeek = tk.vencimento && tk.vencimento > today && tk.vencimento <= in7 && tk.status !== "concluida";
                  const isDone = tk.status === "concluida";
                  return (
                    <TableRow key={tk.id} className={isDone ? "opacity-60" : ""}>
                      <TableCell>
                        <div className={`font-medium ${isDone ? "line-through" : ""}`}>{tk.titulo}</div>
                        {tk.descricao && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {tk.descricao}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{tk.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {empName(tk.company_id)}
                      </TableCell>
                      <TableCell className="text-sm">{tk.responsavel ?? "—"}</TableCell>
                      <TableCell>
                        {tk.vencimento ? (
                          <span
                            className={`text-sm inline-flex items-center gap-1 ${
                              isOverdue
                                ? "text-destructive font-semibold"
                                : isToday
                                ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                                : isWeek
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                            {isToday && <Clock className="h-3.5 w-3.5" />}
                            {fmtDate(tk.vencimento)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIO_VARIANT[tk.prioridade] ?? "default"}>
                          {PRIO_LABEL[tk.prioridade] ?? tk.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleCycleStatus(tk)} title="Avançar status">
                          <Badge variant={STATUS_VARIANT[tk.status] ?? "default"} className="cursor-pointer">
                            {STATUS_LABEL[tk.status] ?? tk.status}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(tk)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setArchiveTarget(tk)}
                            title={tk.arquivada ? "Restaurar" : "Arquivar"}
                          >
                            {tk.arquivada ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        companies={companies}
        onSaved={load}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.arquivada ? "Restaurar tarefa?" : "Arquivar tarefa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.arquivada
                ? `A tarefa "${archiveTarget?.titulo}" voltará à lista ativa.`
                : `A tarefa "${archiveTarget?.titulo}" será ocultada da lista. Você pode restaurá-la depois em "Ver arquivadas".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              {archiveTarget?.arquivada ? "Restaurar" : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
