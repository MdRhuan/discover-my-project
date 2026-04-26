'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useApp } from '@/context/AppContext'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

export interface Pessoa {
  id: number
  nome: string
  label: string | null
  descricao: string | null
  ordem: number
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  naturalidade: string | null
  nacionalidade: string | null
  estado_civil: string | null
  conjuge: string | null
  ssn: string | null
  passaporte_br: string | null
  passaporte_us: string | null
  residencia_fiscal: string | null
}



interface Props {
  /** Notifica o pai sobre a pessoa ativa (para filtrar documentos). null = sem filtro */
  onActivePersonChange?: (nome: string | null) => void
  activePersonName?: string | null
}

const EMPTY_FORM: Partial<Pessoa> = {
  nome: '', label: 'Titular', descricao: '',
  cpf: '', rg: '', data_nascimento: '', naturalidade: '', nacionalidade: '', estado_civil: '', conjuge: '',
  ssn: '', passaporte_br: '', passaporte_us: '', residencia_fiscal: '',
}

function Field({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  const empty = !value || !value.trim()
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
        <i className={`fas ${icon}`} style={{ color: 'var(--brand)', fontSize: 10 }} />{label}
      </div>
      <div style={{ fontSize: 13, fontWeight: empty ? 400 : 600, color: empty ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: empty ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {empty ? 'Não informado' : value}
      </div>
    </div>
  )
}

export function PeopleTabs({ onActivePersonChange, activePersonName }: Props) {
  const { toast, isAdmin } = useApp()
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Pessoa>>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .order('ordem', { ascending: true })
      .order('id', { ascending: true })
    if (error) toast(error.message, 'error')
    else setPessoas((data as Pessoa[]) || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  // Componente totalmente CONTROLADO pelo pai via activePersonName.
  // activeId deriva apenas de pessoas + activePersonName (sem state local duplicado).
  const activeId: number | null = (() => {
    if (pessoas.length === 0) return null
    if (activePersonName) {
      const p = pessoas.find(x => x.nome === activePersonName)
      if (p) return p.id
    }
    return pessoas[0].id
  })()

  // Notifica o pai uma única vez quando pessoas carregam pela 1ª vez
  // ou quando a pessoa selecionada externamente desaparece da lista.
  useEffect(() => {
    if (pessoas.length === 0) return
    const current = pessoas.find(p => p.id === activeId)
    const nome = current?.nome || null
    if (nome !== (activePersonName ?? null)) {
      onActivePersonChange?.(nome)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoas])

  const setActive = (id: number) => {
    const p = pessoas.find(x => x.id === id)
    onActivePersonChange?.(p?.nome || null)
  }

  const active = pessoas.find(p => p.id === activeId) || null

  async function save() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return }
    try {
      const payload = { ...form }
      const editingId = payload.id
      delete payload.id
      if (editingId) {
        const { error } = await supabase.from('pessoas').update(payload).eq('id', editingId)
        if (error) throw error
        toast('Ficha atualizada.', 'success')
      } else {
        const ordem = pessoas.length
        const { data, error } = await supabase.from('pessoas').insert({ ...payload, nome: payload.nome!, ordem }).select().single()
        if (error) throw error
        if (data) onActivePersonChange?.((data as Pessoa).nome)
        toast('Pessoa criada.', 'success')
      }
      setModal(false); setForm(EMPTY_FORM); load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error')
    }
  }

  async function deletePerson(id: number) {
    const { error } = await supabase.from('pessoas').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('Pessoa removida.', 'success'); setConfirmId(null)
    if (activeId === id) onActivePersonChange?.(null)
    load()
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--surface-border)', overflowX: 'auto', marginBottom: 14, paddingBottom: 0 }}>
        {pessoas.map(p => {
          const isActive = p.id === activeId
          return (
            <button key={p.id} onClick={() => { setActiveId(p.id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px',
                background: 'transparent', border: 0,
                borderBottom: `2px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                whiteSpace: 'nowrap', marginBottom: -1,
              }}>
              <i className="fas fa-user" style={{ fontSize: 11 }} />{p.nome}
            </button>
          )
        })}
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setModal(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', marginLeft: 4,
            background: 'var(--surface-hover)', border: '1px dashed var(--surface-border)', borderRadius: 6,
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          <i className="fas fa-plus" />Pessoa
        </button>
      </div>

      {/* Painel */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Carregando…
        </div>
      ) : !active ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <i className="fas fa-user-plus" style={{ fontSize: 28, marginBottom: 8, display: 'block', color: 'var(--brand)' }} />
          <div style={{ fontSize: 13, marginBottom: 12 }}>Nenhuma pessoa cadastrada ainda.</div>
          <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_FORM }); setModal(true) }}>
            <i className="fas fa-plus" />Adicionar primeira pessoa
          </button>
        </div>
      ) : (
        <div className="card">
          {/* Cabeçalho da ficha */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-user" style={{ fontSize: 18, color: 'var(--brand)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{active.nome}</span>
                {active.label && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--brand-dim)', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{active.label}</span>
                )}
              </div>
              {active.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{active.descricao}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setForm({ ...active }); setModal(true) }}>
                <i className="fas fa-pen" />Editar ficha
              </button>
              {isAdmin && (
                <button className="btn-icon danger" title="Excluir" onClick={() => setConfirmId(active.id)}>
                  <i className="fas fa-trash" />
                </button>
              )}
            </div>
          </div>

          {/* Dados Brasileiros */}
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--surface-border)', marginBottom: 14 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--brand)', marginBottom: 12 }}>
              <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,.15)', color: 'var(--green)', fontSize: 9 }}>BR</span>
              DADOS BRASILEIROS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
              <Field icon="fa-id-card"   label="CPF"            value={active.cpf} />
              <Field icon="fa-id-card-clip" label="RG"          value={active.rg} />
              <Field icon="fa-cake-candles" label="Data de nasc." value={active.data_nascimento} />
              <Field icon="fa-location-dot" label="Naturalidade" value={active.naturalidade} />
              <Field icon="fa-flag"      label="Nacionalidade"  value={active.nacionalidade} />
              <Field icon="fa-ring"      label="Estado civil"   value={active.estado_civil} />
              <Field icon="fa-heart"     label="Cônjuge"        value={active.conjuge} />
            </div>
          </div>

          {/* Dados Americanos */}
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--surface-border)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--brand)', marginBottom: 12 }}>
              <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,.15)', color: 'var(--blue)', fontSize: 9 }}>US</span>
              DADOS AMERICANOS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
              <Field icon="fa-shield"      label="SSN"           value={active.ssn} />
              <Field icon="fa-passport"    label="Passaporte BR" value={active.passaporte_br} />
              <Field icon="fa-passport"    label="Passaporte US" value={active.passaporte_us} />
              <Field icon="fa-globe"       label="Res. fiscal"   value={active.residencia_fiscal} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {modal && (
        <Modal
          title={form.id ? `Editar ficha — ${form.nome || ''}` : 'Nova pessoa'}
          onClose={() => { setModal(false); setForm(EMPTY_FORM) }}
          large
          footer={<>
            <button className="btn btn-ghost" onClick={() => { setModal(false); setForm(EMPTY_FORM) }}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />Salvar</button>
          </>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Eduardo" />
            </div>
            <div className="form-group">
              <label className="form-label">Label</label>
              <input className="form-input" value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Titular, Dependente" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição curta</label>
              <input className="form-input" value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Empresário · Residente fiscal: BR/US" />
            </div>

            <div style={{ gridColumn: '1/-1', fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>
              <i className="fas fa-flag" style={{ marginRight: 5 }} />Dados Brasileiros
            </div>
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf || ''} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">RG</label>
              <input className="form-input" value={form.rg || ''} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de nascimento</label>
              <input className="form-input" type="date" value={form.data_nascimento || ''} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Naturalidade</label>
              <input className="form-input" value={form.naturalidade || ''} onChange={e => setForm(f => ({ ...f, naturalidade: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nacionalidade</label>
              <input className="form-input" value={form.nacionalidade || ''} onChange={e => setForm(f => ({ ...f, nacionalidade: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado civil</label>
              <input className="form-input" value={form.estado_civil || ''} onChange={e => setForm(f => ({ ...f, estado_civil: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cônjuge</label>
              <input className="form-input" value={form.conjuge || ''} onChange={e => setForm(f => ({ ...f, conjuge: e.target.value }))} />
            </div>

            <div style={{ gridColumn: '1/-1', fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>
              <i className="fas fa-flag-usa" style={{ marginRight: 5 }} />Dados Americanos
            </div>
            <div className="form-group">
              <label className="form-label">SSN</label>
              <input className="form-input" value={form.ssn || ''} onChange={e => setForm(f => ({ ...f, ssn: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Passaporte BR</label>
              <input className="form-input" value={form.passaporte_br || ''} onChange={e => setForm(f => ({ ...f, passaporte_br: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Passaporte US</label>
              <input className="form-input" value={form.passaporte_us || ''} onChange={e => setForm(f => ({ ...f, passaporte_us: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Residência fiscal</label>
              <input className="form-input" value={form.residencia_fiscal || ''} onChange={e => setForm(f => ({ ...f, residencia_fiscal: e.target.value }))} placeholder="Ex: BR/US" />
            </div>
          </div>
        </Modal>
      )}

      {confirmId !== null && (
        <ConfirmDialog msg="Excluir esta pessoa? A ação não pode ser desfeita." onConfirm={() => deletePerson(confirmId)} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}
