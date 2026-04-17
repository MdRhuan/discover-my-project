import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getFiscalDocs, upsertFiscalDoc, deleteFiscalDoc } from "@/features/fiscal/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckSquare, Plus, Pencil, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SUB = "Check-the-Box Elections";
const STATUS_MAP: Record<string, string> = { ativo: "Ativo", entregue: "Entregue", pendente: "Pendente", vencido: "Vencido" };

export default function CheckBox() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["fiscal", "checkbox"], queryFn: () => getFiscalDocs([SUB]) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const saveMut = useMutation({ mutationFn: upsertFiscalDoc, onSuccess: () => { qc.invalidateQueries({ queryKey: ["fiscal", "checkbox"] }); toast.success("Salvo!"); setOpen(false); } });
  const delMut = useMutation({ mutationFn: deleteFiscalDoc, onSuccess: () => { qc.invalidateQueries({ queryKey: ["fiscal", "checkbox"] }); toast.success("Removido!"); } });

  function openForm(r?: any) {
    setForm(r ? { ...r } : { subcategoria: SUB, jurisdicao: "US", status: "ativo", ano: String(new Date().getFullYear()) });
    setOpen(true);
  }

  return (
    <AppLayout title="Check-the-Box Elections">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Check-the-Box Elections</h1><p className="text-sm text-muted-foreground">{rows.length} eleições registradas</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Nova Eleição</Button>
      </div>
      <Alert className="mb-4"><Info className="h-4 w-4" /><AlertDescription><strong>Check-the-Box (CTB)</strong> — Eleição de classificação de entidade perante o IRS (Form 8832). Fundamental no planejamento fiscal internacional.</AlertDescription></Alert>
      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma eleição encontrada.</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Ano</TableHead><TableHead>Status</TableHead><TableHead>Responsável</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{r.ano}</TableCell>
                <TableCell><Badge>{STATUS_MAP[r.status] || r.status}</Badge></TableCell>
                <TableCell>{r.responsavel || "—"}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{form.id ? "Editar Eleição" : "Nova Eleição CTB"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={e => setForm((f: any) => ({...f, nome: e.target.value}))} placeholder="Ex: Form 8832 — Alvo Properties LLC" /></div>
            <div><Label>Ano</Label><Input value={form.ano ?? ""} onChange={e => setForm((f: any) => ({...f, ano: e.target.value}))} /></div>
            <div><Label>Status</Label><Select value={form.status ?? "ativo"} onValueChange={v => setForm((f: any) => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Responsável</Label><Input value={form.responsavel ?? ""} onChange={e => setForm((f: any) => ({...f, responsavel: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Textarea value={form.descricao ?? ""} onChange={e => setForm((f: any) => ({...f, descricao: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { if (!form.nome?.trim()) { toast.error("Nome obrigatório."); return; } saveMut.mutate(form); }}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
