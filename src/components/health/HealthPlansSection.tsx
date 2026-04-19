'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useApp } from '@/context/AppContext'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { HealthPlanDocs } from './HealthPlanDocs'

export interface HealthPlan {
  id: number
  pessoa: string
  operadora: string
  nome_plano: string | null
  modalidade: string | null
  status: string | null
  beneficiario_principal: string | null
  dependentes: string | null
  acomodacao: string | null
  vigencia_inicio: string | null
  vigencia_fim: string | null
  mensalidade: number | null
  moeda: string | null
  coparticipacao: boolean | null
  observacoes: string | null
}

const MODALIDADES = ['Empresarial', 'Individual', 'Familiar', 'Coletivo por adesão', 'PME']
const STATUSES = ['Ativo', 'Pendente', 'Cancelado', 'Em renovação']
const ACOMODACOES = ['Apartamento', 'Enfermaria', 'Quarto coletivo']
const MOEDAS = ['BRL (R$)', 'USD ($)', 'EUR (€)']

const STATUS_BADGE: Record<string, string> = {
  ativo: 'green', Ativo: 'green',
  pendente: 'yellow', Pendente: 'yellow',
  cancelado: 'red', Cancelado: 'red',
  'em renovação': 'blue', 'Em renovação': 'blue',
}

const EMPTY_PLAN: Partial<HealthPlan> = {
  operadora: '', nome_plano: '', modalidade: 'Empresarial', status: 'Ativo',
  beneficiario_principal: '', dependentes: '', acomodacao: 'Apartamento',
  vigencia_inicio: '', vigencia_fim: '', mensalidade: undefined, moeda: 'BRL (R$)',
  coparticipacao: false, observacoes: '',
}

interface Props {
  pessoa: string | null
  registeredPeople: string[]
}

export function HealthPlansSection({ pessoa, registeredPeople }: Props) {
  const { lang, toast } = useApp()
  const [plans, setPlans] = useState<HealthPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<HealthPlan>>(EMPTY_PLAN)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('health_plans').select('*').order('created_at', { ascending: false })
    if (pessoa) q = q.eq('pessoa', pessoa)
    const { data, error } = await q
    if (error) { toast(error.message, 'error'); setPlans([]) }
    else setPlans((data as HealthPlan[]) || [])
    setLoading(false)
  }, [pessoa, toast])

  useEffect(() => { load() }, [load])

  function openNew() {
    if (!pessoa) { toast('Selecione uma pessoa antes de criar um plano.', 'error'); return }
    if (!registeredPeople.includes(pessoa)) { toast('Pessoa inválida.', 'error'); return }
    setForm({ ...EMPTY_PLAN, pessoa, beneficiario_principal: pessoa })
    setModal(true)
  }

  function openEdit(p: HealthPlan) {
    setForm({ ...p })
    setModal(true)
  }

  async function save() {
    if (!form.operadora?.trim()) { toast('Operadora obrigatória.', 'error'); return }
    if (!form.pessoa?.trim() || !registeredPeople.includes(form.pessoa)) { toast('Pessoa inválida.', 'error'); return }
    try {
      const payload = {
        pessoa: form.pessoa,
        operadora: form.operadora,
        nome_plano: form.nome_plano || null,
        modalidade: form.modalidade || null,
        status: form.status || 'Ativo',
        beneficiario_principal: form.beneficiario_principal || null,
        dependentes: form.dependentes || null,
        acomodacao: form.acomodacao || null,
        vigencia_inicio: form.vigencia_inicio || null,
        vigencia_fim: form.vigencia_fim || null,
        mensalidade: form.mensalidade ?? null,
        moeda: form.moeda || 'BRL',
        coparticipacao: !!form.coparticipacao,
        observacoes: form.observacoes || null,
      }
      if (form.id) {
        const { error } = await supabase.from('health_plans').update(payload).eq('id', form.id)
        if (error) throw error
        toast('Plano atualizado.', 'success')
      } else {
        const { error } = await supabase.from('health_plans').insert(payload)
        if (error) throw error
        toast('Plano cadastrado.', 'success')
      }
      setModal(false); setForm(EMPTY_PLAN); load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error')
    }
  }

  async function remove(id: number) {
    const { error } = await supabase.from('health_plans').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('Plano removido.', 'success'); setConfirmId(null); load()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--surface-border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(236,72,153,.12)' }}>
          <i className="fas fa-hospital" style={{ fontSize: 16, color: '#ec4899' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Plano de saúde</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{plans.length} plano{plans.length !== 1 ? 's' : ''}{pessoa ? ` · ${pessoa}` : ''}</div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={openNew}>
          <i className="fas fa-plus" />Novo Plano
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Carregando…
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12, background: 'var(--surface-hover)', borderRadius: 8, border: '1px dashed var(--surface-border)' }}>
          <i className="fas fa-folder-open" style={{ fontSize: 18, display: 'block', marginBottom: 6 }} />
          Nenhum plano cadastrado
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plans.map(p => {
            const badge = STATUS_BADGE[p.status || ''] || 'brand'
            return (
              <div key={p.id} style={{ padding: 12, background: 'var(--surface-hover)', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(236,72,153,.12)', flexShrink: 0 }}>
                    <i className="fas fa-hospital-user" style={{ fontSize: 15, color: '#ec4899' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.operadora}{p.nome_plano ? ` — ${p.nome_plano}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                      {p.modalidade && <span><i className="fas fa-layer-group" style={{ marginRight: 3 }} />{p.modalidade}</span>}
                      {p.acomodacao && <span><i className="fas fa-bed" style={{ marginRight: 3 }} />{p.acomodacao}</span>}
                      {p.beneficiario_principal && <span><i className="fas fa-user" style={{ marginRight: 3 }} />{p.beneficiario_principal}</span>}
                      {p.vigencia_inicio && p.vigencia_fim && <span><i className="fas fa-calendar" style={{ marginRight: 3 }} />{fmt.date(p.vigencia_inicio, lang)} → {fmt.date(p.vigencia_fim, lang)}</span>}
                      {p.mensalidade != null && <span><i className="fas fa-money-bill" style={{ marginRight: 3 }} />{p.moeda?.split(' ')[0] || 'BRL'} {Number(p.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    </div>
                    {p.dependentes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}><i className="fas fa-users" style={{ marginRight: 4 }} />Dependentes: {p.dependentes}</div>}
                    {p.observacoes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic' }}>{p.observacoes}</div>}
                  </div>
                  {p.status && <span className={`badge badge-${badge}`} style={{ flexShrink: 0 }}>{p.status}</span>}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn-icon" title="Editar" onClick={() => openEdit(p)}><i className="fas fa-pen" /></button>
                    <button className="btn-icon danger" title="Excluir" onClick={() => setConfirmId(p.id)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
                <HealthPlanDocs healthPlanId={p.id} planLabel={`${p.operadora}${p.nome_plano ? ' — ' + p.nome_plano : ''}`} />
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title={form.id ? 'Editar Plano' : 'Novo Plano de Saúde'} onClose={() => { setModal(false); setForm(EMPTY_PLAN) }} large
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />Salvar</button>
          </>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Operadora *</label>
              <input className="form-input" value={form.operadora || ''} onChange={e => setForm(f => ({ ...f, operadora: e.target.value }))} placeholder="Bradesco Saúde" />
            </div>
            <div className="form-group">
              <label className="form-label">Nome do plano</label>
              <input className="form-input" value={form.nome_plano || ''} onChange={e => setForm(f => ({ ...f, nome_plano: e.target.value }))} placeholder="Top Nacional Flex" />
            </div>
            <div className="form-group">
              <label className="form-label">Modalidade</label>
              <select className="form-select" value={form.modalidade || ''} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))}>
                {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'Ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Beneficiário principal</label>
              <select className="form-select" value={form.beneficiario_principal || ''} onChange={e => setForm(f => ({ ...f, beneficiario_principal: e.target.value }))}>
                <option value="">— Selecione —</option>
                {registeredPeople.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Acomodação</label>
              <select className="form-select" value={form.acomodacao || ''} onChange={e => setForm(f => ({ ...f, acomodacao: e.target.value }))}>
                {ACOMODACOES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vigência início</label>
              <input className="form-input" type="date" value={form.vigencia_inicio || ''} onChange={e => setForm(f => ({ ...f, vigencia_inicio: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Vigência fim</label>
              <input className="form-input" type="date" value={form.vigencia_fim || ''} onChange={e => setForm(f => ({ ...f, vigencia_fim: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Mensalidade</label>
              <input className="form-input" type="number" step="0.01" value={form.mensalidade ?? ''} onChange={e => setForm(f => ({ ...f, mensalidade: e.target.value === '' ? undefined : Number(e.target.value) }))} placeholder="3800.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Moeda</label>
              <select className="form-select" value={form.moeda || 'BRL (R$)'} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}>
                {MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id="hp-cop" type="checkbox" checked={!!form.coparticipacao} onChange={e => setForm(f => ({ ...f, coparticipacao: e.target.checked }))} />
              <label htmlFor="hp-cop" className="form-label" style={{ margin: 0 }}>Possui coparticipação</label>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Dependentes</label>
              <input className="form-input" value={form.dependentes || ''} onChange={e => setForm(f => ({ ...f, dependentes: e.target.value }))} placeholder="Ex: Carla, Rejane" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={3} value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Plano família — inclui Carla e Rejane" />
            </div>
          </div>
        </Modal>
      )}

      {confirmId !== null && (
        <ConfirmDialog msg="Excluir este plano de saúde?" onConfirm={() => remove(confirmId)} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}
