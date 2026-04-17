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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BadgeCheck, Plus, Pencil, Trash2 } from "lucide-react";

interface Trademark {
  id: number; pais: string; marca: string; classe?: string; numero?: string;
  status: string; titular?: string; escritorio?: string; deposito?: string;
  concessao?: string; vencimento?: string; notas?: string;
}

const KEY = "trademarks_data";
const STATUS_BR: Record<string, string> = { registrada: "Registrada", em_analise: "Em Análise", oposicao: "Oposição", indeferida: "Indeferida" };
const STATUS_US: Record<string, string> = { registered: "Registered", pending: "Pending", opposition: "Opposition", abandoned: "Abandoned" };

export default function Trademarks() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Trademark[]>(KEY).then(d => d ?? []) });
  const [tab, setTab] = useState("BR");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Trademark>>({});

  const save = useMutation({
    mutationFn: (list: Trademark[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  const filtered = rows.filter(r => r.pais === tab);
  const statusMap = tab === "BR" ? STATUS_BR : STATUS_US;

  function openForm(r?: Trademark) {
    setForm(r ? { ...r } : { pais: tab, status: tab === "BR" ? "registrada" : "registered" });
    setOpen(true);
  }

  function handleSave() {
    if (!form.marca?.trim()) { toast.error("Nome da marca obrigatório."); return; }
    const entry = { ...form, id: form.id || Date.now() } as Trademark;
    const updated = rows.find(r => r.id === entry.id) ? rows.map(r => r.id === entry.id ? entry : r) : [...rows, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.trademarks}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.trademarks}</h1><p className="text-sm text-muted-foreground">{rows.length} marcas registradas</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Nova Marca</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList><TabsTrigger value="BR">🇧🇷 INPI (Brasil)</TabsTrigger><TabsTrigger value="US">🇺🇸 USPTO (EUA)</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground"><BadgeCheck className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma marca registrada nesta jurisdição.</p></CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Marca</TableHead><TableHead>Classe</TableHead><TableHead>Nº Processo</TableHead><TableHead>Titular</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.marca}</TableCell>
                    <TableCell>{r.classe || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.numero || "—"}</TableCell>
                    <TableCell>{r.titular || "—"}</TableCell>
                    <TableCell><Badge>{statusMap[r.status] || r.status}</Badge></TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => save.mutate(rows.filter(x => x.id !== r.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar Marca" : "Nova Marca"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome da Marca *</Label><Input value={form.marca ?? ""} onChange={e => setForm(f => ({...f, marca: e.target.value}))} /></div>
            <div><Label>País</Label><Select value={form.pais ?? "BR"} onValueChange={v => setForm(f => ({...f, pais: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BR">🇧🇷 Brasil</SelectItem><SelectItem value="US">🇺🇸 EUA</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status ?? ""} onValueChange={v => setForm(f => ({...f, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(form.pais === "US" ? STATUS_US : STATUS_BR).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Classe Nice</Label><Input value={form.classe ?? ""} onChange={e => setForm(f => ({...f, classe: e.target.value}))} placeholder="Ex: 09, 42" /></div>
            <div><Label>Nº Processo</Label><Input value={form.numero ?? ""} onChange={e => setForm(f => ({...f, numero: e.target.value}))} /></div>
            <div><Label>Titular</Label><Input value={form.titular ?? ""} onChange={e => setForm(f => ({...f, titular: e.target.value}))} /></div>
            <div><Label>Escritório</Label><Input value={form.escritorio ?? ""} onChange={e => setForm(f => ({...f, escritorio: e.target.value}))} /></div>
            <div><Label>Data Depósito</Label><Input type="date" value={form.deposito ?? ""} onChange={e => setForm(f => ({...f, deposito: e.target.value}))} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={form.vencimento ?? ""} onChange={e => setForm(f => ({...f, vencimento: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => setForm(f => ({...f, notas: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
