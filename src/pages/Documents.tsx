import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Download,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
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
  DOC_CATEGORIES,
  DOC_STATUSES,
  FISCAL_YEARS,
  deleteDocument,
  downloadFile,
  listDocuments,
  setDocumentStatus,
  type Document,
} from "@/features/documents/api";
import { listCompanies, type Company } from "@/features/companies/api";
import { DocumentFormDialog } from "@/features/documents/DocumentFormDialog";

const ALL = "__all__";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Atual: "default",
  "Pendente Upload": "outline",
  Desatualizado: "destructive",
  Substituído: "secondary",
  Arquivado: "secondary",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [yearFilter, setYearFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);

  useEffect(() => {
    document.title = "Documentos — Hub Empresarial";
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        listDocuments(showArchived),
        listCompanies(true),
      ]);
      setDocs(d);
      setCompanies(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const companyName = (id: string | null) =>
    id ? companies.find((c) => c.id === id)?.nome ?? "—" : "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (companyFilter !== ALL && d.company_id !== companyFilter) return false;
      if (categoryFilter !== ALL && d.categoria !== categoryFilter) return false;
      if (statusFilter !== ALL && d.status_doc !== statusFilter) return false;
      if (yearFilter !== ALL && d.ano_fiscal !== yearFilter) return false;
      if (!q) return true;
      return (
        d.nome.toLowerCase().includes(q) ||
        d.categoria.toLowerCase().includes(q)
      );
    });
  }, [docs, search, companyFilter, categoryFilter, statusFilter, yearFilter]);

  const archivedCount = docs.filter((d) => d.status_doc === "Arquivado").length;
  const hasFilters =
    !!search ||
    companyFilter !== ALL ||
    categoryFilter !== ALL ||
    statusFilter !== ALL ||
    yearFilter !== ALL;

  const clearFilters = () => {
    setSearch("");
    setCompanyFilter(ALL);
    setCategoryFilter(ALL);
    setStatusFilter(ALL);
    setYearFilter(ALL);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (d: Document) => {
    setEditing(d);
    setFormOpen(true);
  };
  const handleDownload = async (d: Document) => {
    if (!d.file_path) {
      toast.error("Sem arquivo anexado");
      return;
    }
    try {
      await downloadFile(d.file_path, d.nome);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no download");
    }
  };
  const handleArchive = async (d: Document) => {
    try {
      const next = d.status_doc === "Arquivado" ? "Atual" : "Arquivado";
      await setDocumentStatus(d.id, next);
      toast.success(next === "Arquivado" ? "Documento arquivado" : "Documento restaurado");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDocument(confirmDelete);
      toast.success("Documento excluído");
      setConfirmDelete(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <AppLayout title="Documentos">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
            <p className="text-sm text-muted-foreground">
              {docs.length} documentos no repositório
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Novo documento
          </Button>
        </header>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px]">
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

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Categoria</SelectItem>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Status</SelectItem>
                  {DOC_STATUSES.filter((s) => s !== "Arquivado").map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Ano</SelectItem>
                  {FISCAL_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}

              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived((v) => !v)}
              >
                <Archive className="h-4 w-4" />
                {showArchived
                  ? "Ver ativos"
                  : `Arquivados${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Upload</TableHead>
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
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum documento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText
                              className={`h-4 w-4 ${d.file_path ? "text-primary" : "text-muted-foreground"}`}
                            />
                            <span className="font-medium">{d.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {companyName(d.company_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.categoria}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[d.status_doc] ?? "outline"}>
                            {d.status_doc}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.ano_fiscal ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          v{d.versao}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(d.data_upload).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownload(d)}
                              disabled={!d.file_path}
                              aria-label="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(d)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleArchive(d)}
                              aria-label={
                                d.status_doc === "Arquivado" ? "Restaurar" : "Arquivar"
                              }
                            >
                              {d.status_doc === "Arquivado" ? (
                                <ArchiveRestore className="h-4 w-4" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConfirmDelete(d)}
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

      <DocumentFormDialog
        open={formOpen}
        document={editing}
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
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo associado também será
              removido do armazenamento. Considere arquivar em vez de excluir.
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
