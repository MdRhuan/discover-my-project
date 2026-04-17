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
import { PieChart, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface Ativo {
  id: number; nome: string; ticker?: string; classe: string; corretora?: string;
  moeda: string; pais: string; qtd?: string; preco_medio?: string; preco_atual?: string;
  vl_investido?: string; vl_atual?: string; rentab_pct?: string; dt_vencimento?: string; notas?: string;
}

const KEY = "investments";
const CLASSES = ["Renda Fixa","Renda Variável","FIIs","ETFs","BDRs","Previdência","Criptoativos","Outros"];

export default function Investments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: ativos = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Ativo[]>(KEY).then(d => d ?? []) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Ativo>>({});
  const [filterClasse, setFilterClasse] = useState("");
  const [search, setSearch] = useState("");

  const save = useMutation({
    mutationFn: (list: Ativo[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  const filtered = ativos.filter(a =>
    (!filterClasse || a.classe === filterClasse) &&
    (!search || a.nome?.toLowerCase().includes(search.toLowerCase()) || a.ticker?.toLowerCase().includes(search.toLowerCase()))
  );

  function openForm(a?: Ativo) {
    setForm(a ? { ...a } : { classe: "Renda Variável", moeda: "BRL", pais: "BR" });
    setOpen(true);
  }

  function handleSave() {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    const entry = { ...form, id: form.id || Date.now() } as Ativo;
    const updated = ativos.find(a => a.id === entry.id) ? ativos.map(a => a.id === entry.id ? entry : a) : [...ativos, entry];
    save.mutate(updated); setOpen(false);
  }

  const totalBRL = ativos.filter(a => a.moeda === "BRL").reduce((s, a) => s + (parseFloat(a.vl_atual || "0")), 0);
  const totalUSD = ativos.filter(a => a.moeda === "USD").reduce((s, a) => s + (parseFloat(a.vl_atual || "0")), 0);

  return (
    <AppLayout title={t.investments}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.investments}</h1><p className="text-sm text-muted-foreground">{ativos.length} ativos na carteira</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Novo Ativo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total BRL</div><div className="text-lg font-bold">R$ {totalBRL.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total USD</div><div className="text-lg font-bold">US$ {totalUSD.toLocaleString("en-US")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ativos BR</div><div className="text-lg font-bold">{ativos.filter(a => a.pais === "BR").length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ativos US</div><div className="text-lg font-bold">{ativos.filter(a => a.pais === "US").length}</div></CardContent></Card>
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="Buscar ativo, ticker..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterClasse} onValueChange={setFilterClasse}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas as classes" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as classes</SelectItem>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><PieChart className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhum ativo encontrado.</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ativo</TableHead><TableHead>Classe</TableHead><TableHead>Moeda</TableHead>
              <TableHead>Investido</TableHead><TableHead>Atual</TableHead><TableHead>Rentab.</TableHead><TableHead>Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(a => {
                const rentab = parseFloat(a.rentab_pct || "0");
                return (
                  <TableRow key={a.id}>
                    <TableCell><div className="font-medium">{a.nome}</div>{a.ticker && <span className="text-xs text-muted-foreground font-mono">{a.ticker}</span>}</TableCell>
                    <TableCell><Badge variant="outline">{a.classe}</Badge></TableCell>
                    <TableCell>{a.moeda}</TableCell>
                    <TableCell className="text-sm">{a.vl_investido || "—"}</TableCell>
                    <TableCell className="font-medium">{a.vl_atual || "—"}</TableCell>
                    <TableCell>
                      {a.rentab_pct ? (
                        <span className={`flex items-center gap-1 text-sm font-semibold ${rentab >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {rentab >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(rentab).toFixed(1)}%
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openForm(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => save.mutate(ativos.filter(x => x.id !== a.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar Ativo" : "Novo Ativo"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Label>Ticker</Label><Input value={form.ticker ?? ""} onChange={e => setForm(f => ({...f, ticker: e.target.value}))} /></div>
            <div><Label>Classe</Label>
              <Select value={form.classe ?? "Renda Variável"} onValueChange={v => setForm(f => ({...f, classe: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Corretora</Label><Input value={form.corretora ?? ""} onChange={e => setForm(f => ({...f, corretora: e.target.value}))} /></div>
            <div><Label>Moeda</Label>
              <Select value={form.moeda ?? "BRL"} onValueChange={v => setForm(f => ({...f, moeda: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Qtd</Label><Input value={form.qtd ?? ""} onChange={e => setForm(f => ({...f, qtd: e.target.value}))} /></div>
            <div><Label>PM</Label><Input value={form.preco_medio ?? ""} onChange={e => setForm(f => ({...f, preco_medio: e.target.value}))} /></div>
            <div><Label>Preço Atual</Label><Input value={form.preco_atual ?? ""} onChange={e => setForm(f => ({...f, preco_atual: e.target.value}))} /></div>
            <div><Label>Valor Investido</Label><Input value={form.vl_investido ?? ""} onChange={e => setForm(f => ({...f, vl_investido: e.target.value}))} /></div>
            <div><Label>Valor Atual</Label><Input value={form.vl_atual ?? ""} onChange={e => setForm(f => ({...f, vl_atual: e.target.value}))} /></div>
            <div><Label>Rentab. %</Label><Input value={form.rentab_pct ?? ""} onChange={e => setForm(f => ({...f, rentab_pct: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
