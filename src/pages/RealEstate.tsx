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
import { toast } from "sonner";
import { Home, Plus, Pencil, Trash2 } from "lucide-react";

interface Imovel {
  id: number; endereco: string; proprietario?: string; pais?: string; moeda?: string;
  vl_aquisicao?: string; dt_aquisicao?: string; vl_mercado?: string;
  credor?: string; saldo_devedor?: string; parcela?: string; venc_mortgage?: string;
  dt_property_tax?: string; dt_insurance?: string;
}

const KEY = "imoveis";

export default function RealEstate() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: imoveis = [] } = useQuery({ queryKey: ["config", KEY], queryFn: () => getConfig<Imovel[]>(KEY).then(d => d ?? []) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Imovel>>({});

  const save = useMutation({
    mutationFn: (list: Imovel[]) => setConfig(KEY, list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", KEY] }); toast.success("Salvo!"); },
  });

  function openForm(im?: Imovel) {
    setForm(im ? { ...im } : { proprietario: "Eduardo", pais: "BR", moeda: "BRL" });
    setOpen(true);
  }

  function handleSave() {
    if (!form.endereco?.trim()) { toast.error("Endereço obrigatório."); return; }
    const entry = { ...form, id: form.id || Date.now() } as Imovel;
    const updated = imoveis.find(i => i.id === entry.id) ? imoveis.map(i => i.id === entry.id ? entry : i) : [...imoveis, entry];
    save.mutate(updated); setOpen(false);
  }

  return (
    <AppLayout title={t.realEstate}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">{t.realEstate}</h1><p className="text-sm text-muted-foreground">{imoveis.length} imóveis</p></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Novo Imóvel</Button>
      </div>
      {imoveis.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Home className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhum imóvel cadastrado.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {imoveis.map(im => (
            <Card key={im.id}><CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Home className="h-5 w-5 text-primary" /></div>
                  <div><div className="font-semibold">{im.endereco}</div><div className="text-xs text-muted-foreground">{im.proprietario} · {im.pais}</div></div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openForm(im)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => save.mutate(imoveis.filter(i => i.id !== im.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                {im.vl_aquisicao && <div><span className="font-medium">Aquisição:</span> {im.moeda === "USD" ? "US$" : "R$"} {im.vl_aquisicao}</div>}
                {im.vl_mercado && <div><span className="font-medium">Valor Mercado:</span> {im.moeda === "USD" ? "US$" : "R$"} {im.vl_mercado}</div>}
                {im.saldo_devedor && <div><span className="font-medium">Saldo Devedor:</span> {im.moeda === "USD" ? "US$" : "R$"} {im.saldo_devedor}</div>}
                {im.parcela && <div><span className="font-medium">Parcela:</span> {im.moeda === "USD" ? "US$" : "R$"} {im.parcela}</div>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Endereço *</Label><Input value={form.endereco ?? ""} onChange={e => setForm(f => ({...f, endereco: e.target.value}))} /></div>
            <div><Label>Proprietário</Label><Input value={form.proprietario ?? ""} onChange={e => setForm(f => ({...f, proprietario: e.target.value}))} /></div>
            <div><Label>País</Label>
              <Select value={form.pais ?? "BR"} onValueChange={v => setForm(f => ({...f, pais: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BR">Brasil</SelectItem><SelectItem value="US">EUA</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Moeda</Label>
              <Select value={form.moeda ?? "BRL"} onValueChange={v => setForm(f => ({...f, moeda: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor Aquisição</Label><Input value={form.vl_aquisicao ?? ""} onChange={e => setForm(f => ({...f, vl_aquisicao: e.target.value}))} /></div>
            <div><Label>Data Aquisição</Label><Input type="date" value={form.dt_aquisicao ?? ""} onChange={e => setForm(f => ({...f, dt_aquisicao: e.target.value}))} /></div>
            <div><Label>Valor Mercado</Label><Input value={form.vl_mercado ?? ""} onChange={e => setForm(f => ({...f, vl_mercado: e.target.value}))} /></div>
            <div><Label>Credor</Label><Input value={form.credor ?? ""} onChange={e => setForm(f => ({...f, credor: e.target.value}))} /></div>
            <div><Label>Saldo Devedor</Label><Input value={form.saldo_devedor ?? ""} onChange={e => setForm(f => ({...f, saldo_devedor: e.target.value}))} /></div>
            <div><Label>Parcela</Label><Input value={form.parcela ?? ""} onChange={e => setForm(f => ({...f, parcela: e.target.value}))} /></div>
            <div><Label>Venc. Mortgage</Label><Input type="date" value={form.venc_mortgage ?? ""} onChange={e => setForm(f => ({...f, venc_mortgage: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
