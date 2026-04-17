import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { getConfig, setConfig } from "@/features/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserRound, CalendarCheck, Plus, Pencil, Trash2, BriefcaseBusiness } from "lucide-react";

interface Pessoa {
  id: string; nome: string; relacao?: string; cpf?: string; rg?: string;
  dataNasc?: string; naturalidade?: string; nacionalidade?: string;
  estadoCivil?: string; conjugeNome?: string; enderecoBR?: string;
  ssn?: string; passaporteBR?: string; passaporteUS?: string;
  enderecoUS?: string; residenteFiscal?: string; profissao?: string;
  notas?: string; cor?: string; bg?: string;
}

interface Obrigacao { id: number; label: string; info?: string; data?: string; }
interface Assessor { id: number; nome: string; escritorio?: string; tipo?: string; contato_email?: string; contato_phone?: string; escopo?: string; proxima_reuniao?: string; }

export default function PersonalDocs() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: pessoas = [] } = useQuery({ queryKey: ["config", "pessoas"], queryFn: () => getConfig<Pessoa[]>("pessoas") });
  const { data: obrigacoes = [] } = useQuery({ queryKey: ["config", "proximas_obrigacoes"], queryFn: () => getConfig<Obrigacao[]>("proximas_obrigacoes") });
  const { data: assessores = [] } = useQuery({ queryKey: ["config", "assessores"], queryFn: () => getConfig<Assessor[]>("assessores") });

  const [pessoaModal, setPessoaModal] = useState(false);
  const [pessoaForm, setPessoaForm] = useState<Partial<Pessoa>>({});
  const [obModal, setObModal] = useState(false);
  const [obForm, setObForm] = useState<Partial<Obrigacao>>({});
  const [assModal, setAssModal] = useState(false);
  const [assForm, setAssForm] = useState<Partial<Assessor>>({});

  const savePessoas = useMutation({
    mutationFn: (list: Pessoa[]) => setConfig("pessoas", list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", "pessoas"] }); toast.success("Salvo!"); },
  });
  const saveObs = useMutation({
    mutationFn: (list: Obrigacao[]) => setConfig("proximas_obrigacoes", list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", "proximas_obrigacoes"] }); toast.success("Salvo!"); },
  });
  const saveAss = useMutation({
    mutationFn: (list: Assessor[]) => setConfig("assessores", list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config", "assessores"] }); toast.success("Salvo!"); },
  });

  function handleSavePessoa() {
    if (!pessoaForm.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    const list = pessoas ?? [];
    const entry = { ...pessoaForm, id: pessoaForm.id || crypto.randomUUID() } as Pessoa;
    const updated = list.find(p => p.id === entry.id) ? list.map(p => p.id === entry.id ? entry : p) : [...list, entry];
    savePessoas.mutate(updated);
    setPessoaModal(false);
  }

  function handleSaveOb() {
    if (!obForm.label?.trim()) { toast.error("Título obrigatório."); return; }
    const list = obrigacoes ?? [];
    const entry = { ...obForm, id: obForm.id || Date.now() } as Obrigacao;
    const updated = list.find(o => o.id === entry.id) ? list.map(o => o.id === entry.id ? entry : o) : [...list, entry];
    saveObs.mutate(updated);
    setObModal(false);
  }

  function handleSaveAss() {
    if (!assForm.nome?.trim()) { toast.error("Nome obrigatório."); return; }
    const list = assessores ?? [];
    const entry = { ...assForm, id: assForm.id || Date.now() } as Assessor;
    const updated = list.find(a => a.id === entry.id) ? list.map(a => a.id === entry.id ? entry : a) : [...list, entry];
    saveAss.mutate(updated);
    setAssModal(false);
  }

  return (
    <AppLayout title={t.personalDocs}>
      <div className="space-y-6">
        {/* Pessoas */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fichas Pessoais</h2>
          <Button size="sm" onClick={() => { setPessoaForm({}); setPessoaModal(true); }}><Plus className="h-4 w-4 mr-1" />Nova Pessoa</Button>
        </div>
        {(!pessoas || pessoas.length === 0) ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><UserRound className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nenhuma ficha pessoal cadastrada.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(pessoas ?? []).map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><UserRound className="h-5 w-5 text-primary" /></div>
                      <div><div className="font-semibold">{p.nome}</div>{p.relacao && <span className="text-xs text-muted-foreground">{p.relacao}</span>}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setPessoaForm({...p}); setPessoaModal(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { const updated = (pessoas ?? []).filter(x => x.id !== p.id); savePessoas.mutate(updated); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {p.cpf && <div>CPF: {p.cpf}</div>}
                    {p.dataNasc && <div>Nasc: {p.dataNasc}</div>}
                    {p.residenteFiscal && <div>Res. Fiscal: {p.residenteFiscal}</div>}
                    {p.profissao && <div>{p.profissao}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Obrigações */}
        <div className="flex items-center justify-between mt-8">
          <h2 className="text-lg font-semibold">Próximas Obrigações</h2>
          <Button size="sm" onClick={() => { setObForm({}); setObModal(true); }}><Plus className="h-4 w-4 mr-1" />Nova Obrigação</Button>
        </div>
        {(!obrigacoes || obrigacoes.length === 0) ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground"><CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Nenhuma obrigação cadastrada.</p></CardContent></Card>
        ) : (
          <div className="space-y-2">
            {(obrigacoes ?? []).map(ob => (
              <Card key={ob.id}><CardContent className="p-3 flex items-center gap-3">
                <CalendarCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium">{ob.label}</div>{ob.info && <div className="text-xs text-muted-foreground truncate">{ob.info}</div>}</div>
                {ob.data && <span className="text-xs text-muted-foreground">{ob.data}</span>}
                <Button variant="ghost" size="icon" onClick={() => { setObForm({...ob}); setObModal(true); }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" onClick={() => saveObs.mutate((obrigacoes ?? []).filter(o => o.id !== ob.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </CardContent></Card>
            ))}
          </div>
        )}

        {/* Assessores */}
        <div className="flex items-center justify-between mt-8">
          <h2 className="text-lg font-semibold">Assessores</h2>
          <Button size="sm" onClick={() => { setAssForm({}); setAssModal(true); }}><Plus className="h-4 w-4 mr-1" />Novo Assessor</Button>
        </div>
        {(!assessores || assessores.length === 0) ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground"><BriefcaseBusiness className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Nenhum assessor cadastrado.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(assessores ?? []).map(a => (
              <Card key={a.id}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{a.nome}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setAssForm({...a}); setAssModal(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => saveAss.mutate((assessores ?? []).filter(x => x.id !== a.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {a.escritorio && <div>{a.escritorio}</div>}
                  {a.tipo && <div className="font-medium text-primary">{a.tipo}</div>}
                  {a.contato_email && <div>{a.contato_email}</div>}
                  {a.escopo && <div className="truncate">{a.escopo}</div>}
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {/* Pessoa Dialog */}
      <Dialog open={pessoaModal} onOpenChange={setPessoaModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{pessoaForm.id ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={pessoaForm.nome ?? ""} onChange={e => setPessoaForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Label>Relação</Label><Input value={pessoaForm.relacao ?? ""} onChange={e => setPessoaForm(f => ({...f, relacao: e.target.value}))} placeholder="Titular, Cônjuge..." /></div>
            <div><Label>Profissão</Label><Input value={pessoaForm.profissao ?? ""} onChange={e => setPessoaForm(f => ({...f, profissao: e.target.value}))} /></div>
            <div><Label>CPF</Label><Input value={pessoaForm.cpf ?? ""} onChange={e => setPessoaForm(f => ({...f, cpf: e.target.value}))} /></div>
            <div><Label>Data Nasc.</Label><Input type="date" value={pessoaForm.dataNasc ?? ""} onChange={e => setPessoaForm(f => ({...f, dataNasc: e.target.value}))} /></div>
            <div><Label>Res. Fiscal</Label><Input value={pessoaForm.residenteFiscal ?? ""} onChange={e => setPessoaForm(f => ({...f, residenteFiscal: e.target.value}))} placeholder="BR / US / BR+US" /></div>
            <div><Label>SSN</Label><Input value={pessoaForm.ssn ?? ""} onChange={e => setPessoaForm(f => ({...f, ssn: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Notas</Label><Textarea value={pessoaForm.notas ?? ""} onChange={e => setPessoaForm(f => ({...f, notas: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPessoaModal(false)}>Cancelar</Button><Button onClick={handleSavePessoa}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Obrigação Dialog */}
      <Dialog open={obModal} onOpenChange={setObModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{obForm.id ? "Editar Obrigação" : "Nova Obrigação"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Título *</Label><Input value={obForm.label ?? ""} onChange={e => setObForm(f => ({...f, label: e.target.value}))} /></div>
            <div><Label>Descrição</Label><Input value={obForm.info ?? ""} onChange={e => setObForm(f => ({...f, info: e.target.value}))} /></div>
            <div><Label>Data / Prazo</Label><Input type="date" value={obForm.data ?? ""} onChange={e => setObForm(f => ({...f, data: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setObModal(false)}>Cancelar</Button><Button onClick={handleSaveOb}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assessor Dialog */}
      <Dialog open={assModal} onOpenChange={setAssModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{assForm.id ? "Editar Assessor" : "Novo Assessor"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2"><Label>Nome *</Label><Input value={assForm.nome ?? ""} onChange={e => setAssForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Label>Escritório</Label><Input value={assForm.escritorio ?? ""} onChange={e => setAssForm(f => ({...f, escritorio: e.target.value}))} /></div>
            <div><Label>Tipo</Label><Input value={assForm.tipo ?? ""} onChange={e => setAssForm(f => ({...f, tipo: e.target.value}))} placeholder="Tax US, Tax BR..." /></div>
            <div><Label>Email</Label><Input value={assForm.contato_email ?? ""} onChange={e => setAssForm(f => ({...f, contato_email: e.target.value}))} /></div>
            <div><Label>Telefone</Label><Input value={assForm.contato_phone ?? ""} onChange={e => setAssForm(f => ({...f, contato_phone: e.target.value}))} /></div>
            <div className="col-span-2"><Label>Escopo</Label><Input value={assForm.escopo ?? ""} onChange={e => setAssForm(f => ({...f, escopo: e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssModal(false)}>Cancelar</Button><Button onClick={handleSaveAss}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
