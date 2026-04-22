'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/integrations/supabase/client'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

// ── Types ──────────────────────────────────────────────────────────────────
interface Feira { id: string; nome: string; cor: string }
interface Tag { id: string; nome: string; cor: string }
interface Nota {
  id: string; titulo: string; descricao: string; feiraId: string;
  tagIds: string[]; criadaEm: string;
}
interface FairnotesData { notas: Nota[]; feiras: Feira[]; tags: Tag[] }

// ── Constants ─────────────────────────────────────────────────────────────
const FAIR_COLORS = ['#EC4899','#A855F7','#F59E0B','#10B981','#3B82F6','#EF4444','#06B6D4','#F97316','#8B5CF6','#D946EF']
const TAG_COLORS: Record<string, string> = {
  Tendência: '#F59E0B', Lançamento: '#10B981', Skincare: '#3B82F6',
  Maquiagem: '#EC4899', Cabelo: '#A855F7', 'Vegano/Natural': '#22C55E',
  Fornecedor: '#F97316', Concorrente: '#EF4444', Embalagem: '#06B6D4', Fragrância: '#D946EF',
}
const EMPTY_FORM: Omit<Nota, 'id' | 'criadaEm'> = { titulo: '', descricao: '', feiraId: '', tagIds: [] }

// ── Helpers ───────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Sub-components ────────────────────────────────────────────────────────
function ColorDot({ cor, size = 10 }: { cor: string; size?: number }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: cor, flexShrink: 0 }} />
}

function TagChip({ nome, cor, small }: { nome: string; cor: string; small?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 99,
      fontSize: small ? 10 : 11, fontWeight: 600,
      background: cor + '22', color: cor, border: `1px solid ${cor}44`, whiteSpace: 'nowrap',
    }}>{nome}</span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
export function FairsEventsPage() {
  const { t, toast } = useApp()

  const [data, setData] = useState<FairnotesData>({ notas: [], feiras: [], tags: [] })
  const [rowId, setRowId] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [search, setSearch] = useState('')
  const [filterFeira, setFilterFeira] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'lista'>('cards')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [modalNota, setModalNota] = useState(false)
  const [editingNota, setEditingNota] = useState<Nota | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)

  const [modalFeiras, setModalFeiras] = useState(false)
  const [novaFeira, setNovaFeira] = useState('')
  const [fairColorIdx, setFairColorIdx] = useState(0)
  const [novaFeiraCor, setNovaFeiraCor] = useState(FAIR_COLORS[0])
  const novaFeiraRef = useRef<HTMLInputElement>(null)

  const [modalTags, setModalTags] = useState(false)
  const [novaTag, setNovaTag] = useState('')
  const novaTagRef = useRef<HTMLInputElement>(null)

  // Skip echoing our own UPDATE back from realtime
  const localWriteRef = useRef(0)

  // ── Persistence (shared table + realtime) ───────────────────────────────
  const save = useCallback(async (next: FairnotesData) => {
    setData(next)
    if (rowId == null) return
    localWriteRef.current = Date.now()
    const { error } = await supabase.from('fair_notes').update({ data: next as never }).eq('id', rowId)
    if (error) { console.error('fair_notes update', error); toast('Erro ao salvar', 'error') }
  }, [rowId, toast])

  // Initial load + realtime subscription
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: rows, error } = await supabase
        .from('fair_notes').select('id, data').order('id', { ascending: true }).limit(1)
      if (cancelled) return
      if (error) { console.error('fair_notes load', error); setLoaded(true); return }
      let row = rows?.[0]
      if (!row) {
        const ins = await supabase.from('fair_notes')
          .insert({ data: { notas: [], feiras: [], tags: [] } as never })
          .select('id, data').single()
        if (ins.error) { console.error(ins.error); setLoaded(true); return }
        row = ins.data
      }
      setRowId(row.id as number)
      setData((row.data || { notas: [], feiras: [], tags: [] }) as FairnotesData)
      setLoaded(true)
    })()

    const channel = supabase
      .channel('fair_notes-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fair_notes' }, (payload) => {
        // Ignore the echo of our own write (within 1.5s)
        if (Date.now() - localWriteRef.current < 1500) return
        const next = (payload.new as { data?: FairnotesData })?.data
        if (next) setData(next)
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────
  const { notas, feiras, tags } = data
  const filtered = notas
    .filter(n => {
      if (filterFeira && n.feiraId !== filterFeira) return false
      if (filterTag && !n.tagIds.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return n.titulo.toLowerCase().includes(q) || n.descricao.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime())

  const feiraMap = Object.fromEntries(feiras.map(f => [f.id, f]))
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t]))
  const feiraCount = new Set(notas.map(n => n.feiraId).filter(Boolean)).size
  const hasFilter = !!search || !!filterFeira || !!filterTag

  // ── Note CRUD ───────────────────────────────────────────────────────────
  function openNew() { setEditingNota(null); setForm({ ...EMPTY_FORM }); setModalNota(true) }
  function openEdit(n: Nota) {
    setEditingNota(n)
    setForm({ titulo: n.titulo, descricao: n.descricao, feiraId: n.feiraId, tagIds: [...n.tagIds] })
    setModalNota(true); setExpandedId(null)
  }
  async function handleSaveNota() {
    if (!form.titulo.trim()) { toast('Título obrigatório', 'error'); return }
    const next = { ...data }
    if (editingNota) {
      next.notas = next.notas.map(n => n.id === editingNota.id ? { ...editingNota, ...form } : n)
      toast(t.saved)
    } else {
      next.notas = [{ id: uid(), criadaEm: new Date().toISOString(), ...form }, ...next.notas]
      toast(t.saved)
    }
    await save(next); setModalNota(false)
  }
  async function handleDeleteNota(id: string) {
    const next = { ...data, notas: data.notas.filter(n => n.id !== id) }
    await save(next); setExpandedId(null); setConfirmDelId(null); toast(t.deleted)
  }

  // ── Feira CRUD ──────────────────────────────────────────────────────────
  async function handleAddFeira() {
    if (!novaFeira.trim()) return
    const next = { ...data, feiras: [...data.feiras, { id: uid(), nome: novaFeira.trim(), cor: novaFeiraCor }] }
    await save(next)
    setNovaFeira('')
    const nextIdx = (fairColorIdx + 1) % FAIR_COLORS.length
    setFairColorIdx(nextIdx); setNovaFeiraCor(FAIR_COLORS[nextIdx])
    novaFeiraRef.current?.focus()
  }
  async function handleRemoveFeira(id: string) {
    const next = {
      ...data,
      feiras: data.feiras.filter(f => f.id !== id),
      notas: data.notas.map(n => n.feiraId === id ? { ...n, feiraId: '' } : n),
    }
    if (filterFeira === id) setFilterFeira('')
    await save(next)
  }

  // ── Tag CRUD ────────────────────────────────────────────────────────────
  async function handleAddTag() {
    const nome = novaTag.trim()
    if (!nome) return
    if (data.tags.some(x => x.nome.toLowerCase() === nome.toLowerCase())) { toast('Tag já existe', 'error'); return }
    const cor = TAG_COLORS[nome] || '#BE4B83'
    const next = { ...data, tags: [...data.tags, { id: uid(), nome, cor }] }
    await save(next); setNovaTag(''); novaTagRef.current?.focus()
  }
  async function handleRemoveTag(id: string) {
    const next = {
      ...data,
      tags: data.tags.filter(x => x.id !== id),
      notas: data.notas.map(n => ({ ...n, tagIds: n.tagIds.filter(tid => tid !== id) })),
    }
    if (filterTag === id) setFilterTag('')
    await save(next)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ padding: 60 }}>
          <i className="fas fa-spinner fa-spin" />
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header (padrão do sistema) */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Feiras & Eventos</div>
          <div className="page-header-sub">{notas.length} anotações · sincronizadas em tempo real</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fas fa-plus" /> Nova Anotação
        </button>
      </div>

      {/* Stats (kpi-card padrão) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total de Anotações</div>
          <div className="kpi-value">{notas.length}</div>
          <i className="fas fa-clipboard" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: 'var(--brand)', opacity: .35 }} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Feiras Visitadas</div>
          <div className="kpi-value">{feiraCount}</div>
          <i className="fas fa-calendar-check" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: 'var(--brand)', opacity: .35 }} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Feiras Cadastradas</div>
          <div className="kpi-value">{feiras.length}</div>
          <i className="fas fa-store" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: 'var(--brand)', opacity: .35 }} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tags</div>
          <div className="kpi-value">{tags.length}</div>
          <i className="fas fa-tags" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: 'var(--brand)', opacity: .35 }} />
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
            <i className="fas fa-search" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
          </div>
          <div className="tabs" style={{ marginLeft: 'auto' }}>
            {(['cards','lista'] as const).map(mode => (
              <button key={mode} className={`tab ${viewMode === mode ? 'active' : ''}`} onClick={() => setViewMode(mode)}>
                <i className={mode === 'cards' ? 'fas fa-th-large' : 'fas fa-list'} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text-muted)', marginBottom: 7 }}>Filtrar por Feira</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setFilterFeira('')}
              className={`tab ${!filterFeira ? 'active' : ''}`}
              style={{ borderRadius: 99 }}>Todas</button>
            {feiras.map(f => (
              <button key={f.id} onClick={() => setFilterFeira(filterFeira === f.id ? '' : f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${filterFeira === f.id ? f.cor : 'var(--surface-border)'}`,
                  background: filterFeira === f.id ? f.cor + '22' : 'transparent',
                  color: filterFeira === f.id ? f.cor : 'var(--text-secondary)',
                }}>
                <ColorDot cor={f.cor} />{f.nome}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setModalFeiras(true)}>
              <i className="fas fa-cog" /> Gerenciar
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text-muted)', marginBottom: 7 }}>Filtrar por Tag</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {tags.map(tg => (
              <button key={tg.id} onClick={() => setFilterTag(filterTag === tg.id ? '' : tg.id)}
                style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${filterTag === tg.id ? tg.cor : tg.cor + '44'}`,
                  background: filterTag === tg.id ? tg.cor + '22' : tg.cor + '11',
                  color: filterTag === tg.id ? tg.cor : 'var(--text-secondary)',
                }}>{tg.nome}</button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setModalTags(true)}>
              <i className="fas fa-cog" /> Gerenciar
            </button>
          </div>
        </div>

        {hasFilter && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface-border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterFeira(''); setFilterTag('') }}>
              <i className="fas fa-times" /> Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="fas fa-clipboard" />
            <p>{hasFilter ? 'Nenhuma anotação para os filtros aplicados.' : 'Nenhuma anotação ainda. Clique em "Nova Anotação".'}</p>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(nota => {
            const feira = feiraMap[nota.feiraId]
            const isExpanded = expandedId === nota.id
            return (
              <div key={nota.id} className="card" onClick={() => setExpandedId(isExpanded ? null : nota.id)}
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${feira?.cor || 'var(--surface-border)'}`,
                  transition: 'transform .15s, box-shadow .2s',
                  transform: isExpanded ? 'translateY(-2px)' : 'none',
                }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>{nota.titulo}</div>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 10,
                  display: isExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: isExpanded ? undefined : 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: isExpanded ? 'visible' : 'hidden',
                }}>{nota.descricao}</div>
                {nota.tagIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {nota.tagIds.map(tid => {
                      const tg = tagMap[tid]
                      return tg ? <TagChip key={tid} nome={tg.nome} cor={tg.cor} small /> : null
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    {feira && <><ColorDot cor={feira.cor} /><span style={{ fontWeight: 500 }}>{feira.nome}</span></>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(nota.criadaEm)}</span>
                </div>
                {isExpanded && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(nota)}><i className="fas fa-pen" /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelId(nota.id)}><i className="fas fa-trash" /> Excluir</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Anotação</th><th>Feira</th><th>Tags</th><th>Data</th><th>{t.actions}</th></tr>
            </thead>
            <tbody>
              {filtered.map(nota => {
                const feira = feiraMap[nota.feiraId]
                return (
                  <tr key={nota.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nota.titulo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{nota.descricao}</div>
                    </td>
                    <td>{feira ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><ColorDot cor={feira.cor} />{feira.nome}</span> : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {nota.tagIds.slice(0, 3).map(tid => { const tg = tagMap[tid]; return tg ? <TagChip key={tid} nome={tg.nome} cor={tg.cor} small /> : null })}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(nota.criadaEm)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(nota)} title={t.edit}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmDelId(nota.id)} title={t.delete}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova/Editar Anotação */}
      {modalNota && (
        <Modal
          title={editingNota ? 'Editar Anotação' : 'Nova Anotação'}
          onClose={() => setModalNota(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalNota(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSaveNota}><i className="fas fa-check" /> {t.save}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Sérum vitamina C com niacinamida" />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={4} placeholder="Detalhes do produto, fórmula, preço, contato..." />
          </div>
          <div className="form-group">
            <label className="form-label">Feira / Evento</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {feiras.map(f => (
                <button key={f.id} onClick={() => setForm(frm => ({ ...frm, feiraId: frm.feiraId === f.id ? '' : f.id }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 99,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${form.feiraId === f.id ? f.cor : 'var(--surface-border)'}`,
                    background: form.feiraId === f.id ? f.cor + '22' : 'transparent',
                    color: form.feiraId === f.id ? f.cor : 'var(--text-secondary)',
                  }}>
                  <ColorDot cor={f.cor} />{f.nome}
                </button>
              ))}
              {feiras.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma feira. Use "Gerenciar" nos filtros.</span>}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {tags.map(tg => {
                const sel = form.tagIds.includes(tg.id)
                return (
                  <button key={tg.id} onClick={() =>
                    setForm(frm => ({ ...frm, tagIds: sel ? frm.tagIds.filter(id => id !== tg.id) : [...frm.tagIds, tg.id] }))
                  }
                    style={{
                      padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${sel ? tg.cor : tg.cor + '44'}`,
                      background: sel ? tg.cor + '22' : tg.cor + '11',
                      color: sel ? tg.cor : 'var(--text-secondary)',
                    }}>{tg.nome}</button>
                )
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gerenciar Feiras */}
      {modalFeiras && (
        <Modal title="Gerenciar Feiras" onClose={() => setModalFeiras(false)}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input ref={novaFeiraRef} className="form-input" value={novaFeira}
              onChange={e => setNovaFeira(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFeira()}
              placeholder="Nome da feira ou evento..." />
            <input type="color" value={novaFeiraCor} onChange={e => setNovaFeiraCor(e.target.value)}
              style={{ width: 42, height: 38, padding: 2, border: '1px solid var(--surface-border)', borderRadius: 8, background: 'transparent' }} />
            <button className="btn btn-primary" onClick={handleAddFeira}><i className="fas fa-plus" /></button>
          </div>
          {feiras.length === 0 ? (
            <div className="empty-state"><i className="fas fa-store" /><p>Nenhuma feira cadastrada.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {feiras.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--surface-border)', borderRadius: 8 }}>
                  <ColorDot cor={f.cor} size={14} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f.nome}</span>
                  <button className="btn-icon danger" onClick={() => handleRemoveFeira(f.id)} title={t.delete}><i className="fas fa-trash" /></button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal: Gerenciar Tags */}
      {modalTags && (
        <Modal title="Gerenciar Tags" onClose={() => setModalTags(false)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input ref={novaTagRef} className="form-input" value={novaTag}
              onChange={e => setNovaTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              placeholder="Nome da tag..." />
            <button className="btn btn-primary" onClick={handleAddTag}><i className="fas fa-plus" /></button>
          </div>
          {tags.length === 0 ? (
            <div className="empty-state"><i className="fas fa-tags" /><p>Nenhuma tag cadastrada.</p></div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tg => (
                <span key={tg.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 4px 4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: tg.cor + '22', color: tg.cor, border: `1px solid ${tg.cor}44`,
                }}>
                  {tg.nome}
                  <button onClick={() => handleRemoveTag(tg.id)}
                    style={{ background: 'transparent', border: 'none', color: tg.cor, cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                    title={t.delete}><i className="fas fa-times-circle" /></button>
                </span>
              ))}
            </div>
          )}
        </Modal>
      )}

      {confirmDelId && (
        <ConfirmDialog
          msg="Excluir esta anotação? Esta ação é irreversível."
          onConfirm={() => handleDeleteNota(confirmDelId)}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
    </div>
  )
}
