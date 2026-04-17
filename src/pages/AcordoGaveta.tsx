import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getConfig, setConfig } from "@/features/config/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Handshake, Plus, Pencil, Trash2, AlertTriangle, Lock } from "lucide-react";

interface Acordo {
  id: string; nome: string; tipo: string; status: string; parteA?: string; parteB?: string;
  dataAssinatura?: string; vencimento?: string; valor?: string; descricao?: string;
  confidencial?: boolean; advogado?: string;
}

const KEY = "acordoGaveta_docs";
const TIPOS = ["Promessa de Compra e Venda","Pacto Parassocial","Opção de Compra","Cessão de Direitos","Acordo de Confidencialidade","Outros"];
const STATUS_MAP: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", vencido: "Vencido", encerrado: "Encerrado" };

export default function AcordoGaveta() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Acordo[]>(KEY).then(d => d ?? []) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Acordo>>({});

  const save = useMutation({
    mutationFn: (list: Acordo[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  function openForm(r?: Acordo) {
    setForm(r ? { ...r } : { id: crypto.randomUUID(), tipo: "Promessa de Compra e Venda", status: "ativo", confidencial: true, dataAssinatura: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  function handleSave() {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    if (!form.parteA?.trim() || !form.parteB?.trim()) { toast.error("Partes A e B são obrigatórias."); return; }
    const entry = form as Acordo;
    const updated = rows.find(r => r.id === entry.id) ? rows.map(r => r.id === entry.id ? entry : r) : [...rows, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.acordoGaveta}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.acordoGaveta}</h1><p className="text-sm text-muted-foreground">{rows.length} acordos · Documentos sigilosos</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Novo Acordo</Button>
      </div>
      <Alert variant="destructive" className="mb-4"><AlertTriangle className="h-4 w-4" /><AlertDescription><strong>Documentos Sigilosos.</strong> Acordos de gaveta contêm informações sensíveis e restritas.</AlertDescription></Alert>
      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Handshake className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhum acordo cadastrado.</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Acordo</TableHead><TableHead>Tipo</TableHead><TableHead>Parte A</TableHead><TableHead>Parte B</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map(r => (
              <TableRow key={r.id}>
                <TableCell><div className="flex items-center gap-2"><span className="font-medium">{r.nome}</span>{r.confidencial && <Lock className="h-3 w-3 text-destructive" />}</div></TableCell>
                <TableCell><Badge variant="outline">{r.tipo}</Badge></TableCell>
                <TableCell>{r.parteA || "—"}</TableCell>
                <TableCell>{r.parteB || "—"}</TableCell>
                <TableCell>{r.dataAssinatura || "—"}</TableCell>
                <TableCell><Badge>{STATUS_MAP[r.status] || r.status}</Badge></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => save.mutate(rows.filter(x => x.id !== r.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id && rows.find(r => r.id === form.id) ? "Editar Acordo" : "Novo Acordo"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Label>Tipo</Label><Select value={form.tipo ?? "Promessa de Compra e Venda"} onValueChange={v => setForm(f => ({...f, tipo: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status ?? "ativo"} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Parte A *</Label><Input value={form.parteA ?? ""} onChange={e => setForm(f => ({...f, parteA: e.target.value}))} /></div>
            <div><Label>Parte B *</Label><Input value={form.parteB ?? ""} onChange={e => setForm(f => ({...f, parteB: e.target.value}))} /></div>
            <div><Label>Data Assinatura</Label><Input type="date" value={form.dataAssinatura ?? ""} onChange={e => setForm(f => ({...f, dataAssinatura: e.target.value}))} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={form.vencimento ?? ""} onChange={e => setForm(f => ({...f, vencimento: e.target.value}))} /></div>
            <div><Label>Valor</Label><Input value={form.valor ?? ""} onChange={e => setForm(f => ({...f, valor: e.target.value}))} /></div>
            <div><Label>Advogado</Label><Input value={form.advogado ?? ""} onChange={e => setForm(f => ({...f, advogado: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Textarea value={form.descricao ?? ""} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
