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
import { toast } from "sonner";
import { Car, Plus, Pencil, Trash2 } from "lucide-react";

interface Seguro {
  id: number; seguradora: string; produto?: string; veiculo?: string; placa?: string;
  chassi?: string; ano_fab?: number; ano_modelo?: number; cor?: string;
  segurado?: string; apolice?: string; cobertura_tipo?: string; status: string;
  franquia?: string; moeda: string; premio_mensal?: string; premio_anual?: string;
  inicio?: string; vencimento?: string; seguradora_contato?: string; obs?: string;
}

const KEY = "carInsurance_data";
const STATUS_MAP: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ativo: { variant: "default", label: "Ativo" },
  vencido: { variant: "destructive", label: "Vencido" },
  cancelado: { variant: "secondary", label: "Cancelado" },
  suspenso: { variant: "outline", label: "Suspenso" },
};

export default function CarInsurance() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: seguros = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Seguro[]>(KEY).then(d => d ?? []) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Seguro>>({});

  const save = useMutation({
    mutationFn: (list: Seguro[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  function openForm(seg?: Seguro) {
    setForm(seg ? { ...seg } : { status: "ativo", moeda: "BRL", cobertura_tipo: "Compreensiva" });
    setOpen(true);
  }

  function handleSave() {
    if (!form.seguradora?.trim()) { toast.error("Seguradora obrigatória."); return; }
    const entry = { ...form, id: form.id || Date.now() } as Seguro;
    const updated = seguros.find(s => s.id === entry.id) ? seguros.map(s => s.id === entry.id ? entry : s) : [...seguros, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.carInsurance}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.carInsurance}</h1><p className="text-sm text-muted-foreground">{seguros.filter(s => s.status === "ativo").length} apólices ativas</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Nova Apólice</Button>
      </div>

      {seguros.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Car className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma apólice cadastrada.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seguros.map(seg => {
            const st = STATUS_MAP[seg.status] ?? STATUS_MAP.ativo;
            return (
              <Card key={seg.id}><CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div><div className="font-semibold">{seg.veiculo || seg.seguradora}</div><div className="text-xs text-muted-foreground">{seg.seguradora} · {seg.produto}</div></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openForm(seg)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => save.mutate(seguros.filter(s => s.id !== seg.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex gap-2 mb-3"><Badge variant={st.variant}>{st.label}</Badge><Badge variant="outline">{seg.cobertura_tipo}</Badge><Badge variant="outline">{seg.moeda}</Badge></div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {seg.placa && <div>Placa: {seg.placa}</div>}
                  {seg.premio_mensal && <div>Prêmio: {seg.moeda === "USD" ? "US$" : "R$"} {seg.premio_mensal}/mês</div>}
                  {seg.franquia && <div>Franquia: {seg.moeda === "USD" ? "US$" : "R$"} {seg.franquia}</div>}
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar Apólice" : "Nova Apólice"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div><Label>Seguradora *</Label><Input value={form.seguradora ?? ""} onChange={e => setForm(f => ({...f, seguradora: e.target.value}))} /></div>
            <div><Label>Produto</Label><Input value={form.produto ?? ""} onChange={e => setForm(f => ({...f, produto: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Veículo</Label><Input value={form.veiculo ?? ""} onChange={e => setForm(f => ({...f, veiculo: e.target.value}))} placeholder="Ex: BMW X5 2024" /></div>
            <div><Label>Placa</Label><Input value={form.placa ?? ""} onChange={e => setForm(f => ({...f, placa: e.target.value}))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status ?? "ativo"} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Moeda</Label>
              <Select value={form.moeda ?? "BRL"} onValueChange={v => setForm(f => ({...f, moeda: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Franquia</Label><Input value={form.franquia ?? ""} onChange={e => setForm(f => ({...f, franquia: e.target.value}))} /></div>
            <div><Label>Prêmio Mensal</Label><Input value={form.premio_mensal ?? ""} onChange={e => setForm(f => ({...f, premio_mensal: e.target.value}))} /></div>
            <div><Label>Prêmio Anual</Label><Input value={form.premio_anual ?? ""} onChange={e => setForm(f => ({...f, premio_anual: e.target.value}))} /></div>
            <div><Label>Início</Label><Input type="date" value={form.inicio ?? ""} onChange={e => setForm(f => ({...f, inicio: e.target.value}))} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={form.vencimento ?? ""} onChange={e => setForm(f => ({...f, vencimento: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
