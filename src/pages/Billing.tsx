import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getTransacoes, upsertTransacao, deleteTransacao } from "@/features/billing/api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DollarSign, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";

export default function Billing() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["transacoes"], queryFn: getTransacoes });
  const { data: empresas = [] } = useQuery({
    queryKey: ["companies-billing"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("companies").select("id, nome, pais").eq("user_id", user.id);
      return data ?? [];
    }
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const saveMut = useMutation({ mutationFn: upsertTransacao, onSuccess: () => { qc.invalidateQueries({ queryKey: ["transacoes"] }); toast.success("Salvo!"); setOpen(false); } });
  const delMut = useMutation({ mutationFn: deleteTransacao, onSuccess: () => { qc.invalidateQueries({ queryKey: ["transacoes"] }); toast.success("Removido!"); } });

  const totRev = rows.filter((r: any) => r.tipo === "receita").reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totExp = rows.filter((r: any) => r.tipo === "despesa").reduce((s: number, r: any) => s + Number(r.valor || 0), 0);

  function openForm(r?: any) {
    setForm(r ? { ...r } : { tipo: "receita", moeda: "BRL", data: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  return (
    <AppLayout title="Faturamento">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Faturamento</h1><p className="text-sm text-muted-foreground">{rows.length} transações</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Nova Transação</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-5 w-5 text-green-600" /><div><div className="text-xs text-muted-foreground">Receitas</div><div className="text-lg font-bold text-green-600">R$ {totRev.toLocaleString("pt-BR")}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingDown className="h-5 w-5 text-red-500" /><div><div className="text-xs text-muted-foreground">Despesas</div><div className="text-lg font-bold text-red-500">R$ {totExp.toLocaleString("pt-BR")}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><DollarSign className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">Saldo</div><div className={`text-lg font-bold ${totRev - totExp >= 0 ? "text-green-600" : "text-red-500"}`}>R$ {(totRev - totExp).toLocaleString("pt-BR")}</div></div></CardContent></Card>
      </div>
      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><DollarSign className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma transação registrada.</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{rows.slice(0, 50).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.data || "—"}</TableCell>
                <TableCell><Badge variant={r.tipo === "receita" ? "default" : "destructive"}>{r.tipo === "receita" ? "Receita" : "Despesa"}</Badge></TableCell>
                <TableCell>{r.categoria || "—"}</TableCell>
                <TableCell>{r.descricao || "—"}</TableCell>
                <TableCell className={`font-semibold ${r.tipo === "receita" ? "text-green-600" : "text-red-500"}`}>{r.moeda === "USD" ? "US$" : "R$"} {Number(r.valor || 0).toLocaleString("pt-BR")}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova Transação"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div><Label>Tipo</Label><Select value={form.tipo ?? "receita"} onValueChange={v => setForm((f: any) => ({...f, tipo: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent></Select></div>
            <div><Label>Data</Label><Input type="date" value={form.data ?? ""} onChange={e => setForm((f: any) => ({...f, data: e.target.value}))} /></div>
            <div><Label>Categoria</Label><Input value={form.categoria ?? ""} onChange={e => setForm((f: any) => ({...f, categoria: e.target.value}))} /></div>
            <div><Label>Valor</Label><Input type="number" value={form.valor ?? ""} onChange={e => setForm((f: any) => ({...f, valor: e.target.value}))} /></div>
            <div><Label>Empresa</Label><Select value={form.company_id ?? ""} onValueChange={v => setForm((f: any) => ({...f, company_id: v, moeda: empresas.find((e: any) => e.id === v)?.pais === "US" ? "USD" : "BRL"}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Moeda</Label><Input value={form.moeda ?? "BRL"} readOnly className="opacity-60" /></div>
            <div className="col-span-2"><Label>Descrição</Label><Input value={form.descricao ?? ""} onChange={e => setForm((f: any) => ({...f, descricao: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => saveMut.mutate(form)}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
