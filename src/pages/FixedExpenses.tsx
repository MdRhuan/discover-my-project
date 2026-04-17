import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getConfig, setConfig } from "@/features/config/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

interface Despesa {
  id: number; nome: string; categoria: string; pais: string; moeda: string;
  valor: string; recorrencia: string; ativo: boolean; notas?: string;
}

const KEY = "fixedExpenses";
const CATEGORIAS = ["Moradia","Funcionários","Transporte","Seguros","Assinaturas","Contábil / Fiscal","Educação","Outros"];

export default function FixedExpenses() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: despesas = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Despesa[]>(KEY).then(d => d ?? []) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Despesa>>({});
  const [filterPais, setFilterPais] = useState("all");

  const save = useMutation({
    mutationFn: (list: Despesa[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  const ativas = despesas.filter(d => d.ativo !== false);
  const filtered = ativas.filter(d => filterPais === "all" || d.pais === filterPais);
  const totalUS = ativas.filter(d => d.moeda === "USD").reduce((s, d) => s + parseFloat(d.valor || "0"), 0);
  const totalBR = ativas.filter(d => d.moeda === "BRL").reduce((s, d) => s + parseFloat(d.valor || "0"), 0);

  function openForm(d?: Despesa) {
    setForm(d ? { ...d } : { categoria: "Moradia", pais: "US", moeda: "USD", recorrencia: "mensal", ativo: true });
    setOpen(true);
  }

  function handleSave() {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    const entry = { ...form, id: form.id || Date.now() } as Despesa;
    const updated = despesas.find(d => d.id === entry.id) ? despesas.map(d => d.id === entry.id ? entry : d) : [...despesas, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.fixedExpenses}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.fixedExpenses}</h1><p className="text-sm text-muted-foreground">{ativas.length} despesas ativas</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Nova Despesa</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total USD/mês</div><div className="text-lg font-bold">US$ {totalUS.toLocaleString("en-US")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total BRL/mês</div><div className="text-lg font-bold">R$ {totalBR.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Despesas Ativas</div><div className="text-lg font-bold">{ativas.length}</div></CardContent></Card>
      </div>
      <Select value={filterPais} onValueChange={setFilterPais}><SelectTrigger className="w-40 mb-4"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="BR">🇧🇷 Brasil</SelectItem><SelectItem value="US">🇺🇸 EUA</SelectItem></SelectContent></Select>
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma despesa encontrada.</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Despesa</TableHead><TableHead>Categoria</TableHead><TableHead>País</TableHead><TableHead>Valor/mês</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                <TableCell>{d.pais === "US" ? "🇺🇸" : "🇧🇷"}</TableCell>
                <TableCell className="font-semibold">{d.moeda === "USD" ? "US$" : "R$"} {d.valor}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openForm(d)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => save.mutate(despesas.filter(x => x.id !== d.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{form.id ? "Editar Despesa" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Label>Categoria</Label><Select value={form.categoria ?? "Moradia"} onValueChange={v => setForm(f => ({...f, categoria: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>País</Label><Select value={form.pais ?? "US"} onValueChange={v => setForm(f => ({...f, pais: v, moeda: v === "US" ? "USD" : "BRL"}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BR">Brasil</SelectItem><SelectItem value="US">EUA</SelectItem></SelectContent></Select></div>
            <div><Label>Valor mensal</Label><Input value={form.valor ?? ""} onChange={e => setForm(f => ({...f, valor: e.target.value}))} /></div>
            <div><Label>Notas</Label><Input value={form.notas ?? ""} onChange={e => setForm(f => ({...f, notas: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
