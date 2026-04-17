import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getConfig, setConfig } from "@/features/config/api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";

interface Valuation {
  id: number; empresaId?: string; data?: string; metodo: string; valor?: string;
  proposito: string; responsavel?: string; notas?: string; historico?: { data: string; valor: string }[];
}

const KEY = "valuations";
const METODOS = ["DCF","Múltiplos de Mercado","Patrimônio Líquido","Book Value","Transações Comparáveis","Outro"];
const PROPOSITOS = ["Gestão","Transação","Fiscal","Planejamento Sucessório","Outro"];

export default function ValuationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: valuations = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Valuation[]>(KEY).then(d => d ?? []) });
  const { data: empresas = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("companies").select("id, nome").eq("user_id", user.id);
      return data ?? [];
    }
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Valuation>>({});

  const save = useMutation({
    mutationFn: (list: Valuation[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  function openForm(v?: Valuation) {
    setForm(v ? { ...v } : { metodo: "DCF", proposito: "Gestão", historico: [] });
    setOpen(true);
  }

  function handleSave() {
    const entry = { ...form, id: form.id || Date.now() } as Valuation;
    const updated = valuations.find(v => v.id === entry.id) ? valuations.map(v => v.id === entry.id ? entry : v) : [...valuations, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.valuations}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Valuations</h1><p className="text-sm text-muted-foreground">{valuations.length} registrados</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Novo Valuation</Button>
      </div>
      {valuations.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhum valuation cadastrado.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {valuations.map(v => {
            const emp = empresas.find(e => String(e.id) === String(v.empresaId));
            return (
              <Card key={v.id}><CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div><div className="font-semibold">{emp?.nome || "Entidade não vinculada"}</div><div className="text-xs text-muted-foreground">{v.metodo} · {v.data} · {v.proposito}</div></div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">{v.valor ? `R$ ${v.valor}` : "—"}</span>
                    <Button variant="ghost" size="icon" onClick={() => openForm(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => save.mutate(valuations.filter(x => x.id !== v.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                {v.responsavel && <div className="text-xs text-muted-foreground">Assessor: {v.responsavel}</div>}
                {v.notas && <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">{v.notas}</div>}
              </CardContent></Card>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id && valuations.find(v => v.id === form.id) ? "Editar Valuation" : "Novo Valuation"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Entidade</Label>
              <Select value={form.empresaId ?? ""} onValueChange={v => setForm(f => ({...f, empresaId: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data ?? ""} onChange={e => setForm(f => ({...f, data: e.target.value}))} /></div>
            <div><Label>Método</Label>
              <Select value={form.metodo ?? "DCF"} onValueChange={v => setForm(f => ({...f, metodo: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METODOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input value={form.valor ?? ""} onChange={e => setForm(f => ({...f, valor: e.target.value}))} placeholder="5.000.000" /></div>
            <div><Label>Propósito</Label>
              <Select value={form.proposito ?? "Gestão"} onValueChange={v => setForm(f => ({...f, proposito: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPOSITOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Assessor</Label><Input value={form.responsavel ?? ""} onChange={e => setForm(f => ({...f, responsavel: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notas ?? ""} onChange={e => setForm(f => ({...f, notas: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
