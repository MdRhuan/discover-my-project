'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { DocPessoal } from '@/types'

const OB_KEY = 'proximas_obrigacoes'

interface Obrigacao {
  id: number
  label: string
  info?: string
  data?: string
  pessoas?: string[]
  categorias?: string[]
}

const OB_DEFAULTS: Obrigacao[] = [
  { id: 1, label: 'Naturalization Eligibility', info: 'Verificar elegibilidade após 5 anos de residência permanente', data: '', pessoas: [], categorias: [] },
  { id: 2, label: 'Green Card Renewal — Eduardo', info: 'Renovação obrigatória antes do vencimento', data: '', pessoas: [], categorias: [] },
  { id: 3, label: 'Green Card Renewal — Carla', info: 'Renovação obrigatória antes do vencimento', data: '', pessoas: [], categorias: [] },
]

const SUBCATS = [
  { key: 'Identidade',  icon: 'fa-id-card',         color: 'brand'  },
  { key: 'Residência',  icon: 'fa-house',            color: 'blue'   },
  { key: 'Passaporte',  icon: 'fa-passport',         color: 'green'  },
  { key: 'Visto',       icon: 'fa-stamp',            color: 'yellow' },
  { key: 'Outros',      icon: 'fa-folder',           color: 'orange' },
]
const COLOR_VAR: Record<string, string> = { brand: 'var(--brand)', blue: 'var(--blue)', green: 'var(--green)', yellow: 'var(--yellow)', orange: 'var(--orange)' }
const COLOR_BG: Record<string, string>  = { brand: 'var(--brand-dim)', blue: 'rgba(59,130,246,.12)', green: 'rgba(34,197,94,.12)', yellow: 'rgba(245,158,11,.12)', orange: 'rgba(249,115,22,.12)' }
const STATUS_MAP: Record<string, { badge: string; label: string }> = {
  ativo: { badge: 'brand', label: 'Ativo' }, pendente: { badge: 'yellow', label: 'Pendente' },
  vencido: { badge: 'red', label: 'Vencido' }, renovado: { badge: 'green', label: 'Renovado' },
}

const EMPTY_DOC: Partial<DocPessoal> = { pessoa: 'Eduardo', categoria: 'Identidade', subcategoria: 'CPF', nome: '', tipo: 'PDF', descricao: '', status: 'ativo', dataUpload: new Date().toISOString().slice(0, 10), vencimento: '' }

export function PersonalDocsPage() {
  const { lang, toast } = useApp()
  const [docs, setDocs] = useState<DocPessoal[]>([])
  const [obList, setObList] = useState<Obrigacao[]>([])
  const [search, setSearch] = useState('')
  const [filterPessoa, setFilterPessoa] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [docModal, setDocModal] = useState(false)
  const [obModal, setObModal] = useState(false)
  const [form, setForm] = useState<Partial<DocPessoal>>(EMPTY_DOC)
  const [obForm, setObForm] = useState<Partial<Obrigacao>>({})
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmObId, setConfirmObId] = useState<number | null>(null)
  const [obFilterPessoas, setObFilterPessoas] = useState<string[]>([])
  const [obFilterCats, setObFilterCats] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in60  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const [d, ob] = await Promise.all([db.docsPessoais.toArray(), db.config.get(OB_KEY)])
    setDocs(d)
    setObList((ob?.value as Obrigacao[]) || OB_DEFAULTS)
  }, [])

  useEffect(() => { load() }, [load])

  const pessoas = [...new Set(docs.map(d => d.pessoa).filter(Boolean))] as string[]
  const categorias = [...new Set(docs.map(d => d.categoria).filter(Boolean))] as string[]
  const filtered = docs.filter(d =>
    (!filterPessoa || d.pessoa === filterPessoa) &&
    (!filterCat || d.categoria === filterCat) &&
    (!search || d.nome?.toLowerCase().includes(search.toLowerCase()) || d.pessoa?.toLowerCase().includes(search.toLowerCase()))
  )

  const obFiltered = obList.filter(ob => {
    const okP = obFilterPessoas.length === 0 || (ob.pessoas || []).some(p => obFilterPessoas.includes(p))
    const okC = obFilterCats.length === 0 || (ob.categorias || []).some(c => obFilterCats.includes(c))
    return okP && okC
  })

  function alertColor(v?: string) {
    if (!v) return null
    if (v < today) return 'var(--red)'
    if (v <= in60)  return 'var(--yellow)'
    return null
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({
      ...f, nome: f.nome || file.name,
      tamanho: file.size / 1024 > 1024 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB',
      tipo: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      conteudo: ev.target?.result as string,
    }))
    reader.readAsDataURL(file)
  }

  function download(r: DocPessoal) {
    if (!r.conteudo) { toast('Arquivo não disponível.', 'error'); return }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nome || 'doc'; a.click()
  }

  async function saveDoc() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return }
    if (!form.pessoa?.trim()) { toast('Pessoa obrigatória.', 'error'); return }
    if (!form.categoria?.trim()) { toast('Categoria obrigatória.', 'error'); return }
    if (!form.subcategoria?.trim()) { toast('Subcategoria obrigatória.', 'error'); return }
    try {
      const payload = { ...form }
      const editingId = payload.id
      delete payload.id
      if (editingId) await db.docsPessoais.update(editingId, payload)
      else await db.docsPessoais.add(payload as DocPessoal)
      toast('Salvo com sucesso!', 'success'); setDocModal(false); setForm(EMPTY_DOC); load()
    } catch (err) {
      console.error('[PersonalDocs] saveDoc error:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
      toast(msg, 'error')
    }
  }

  async function deleteDoc(id: number) {
    try { await db.docsPessoais.delete(id); toast('Excluído com sucesso!', 'success'); setConfirmId(null); load() }
    catch { toast('Erro ao excluir.', 'error') }
  }

  async function saveOb() {
    if (!obForm.label?.trim()) { toast('Título obrigatório.', 'error'); return }
    const updated = obForm.id
      ? obList.map(o => o.id === obForm.id ? { ...o, ...obForm } as Obrigacao : o)
      : [...obList, { ...obForm, id: Date.now() } as Obrigacao]
    await db.config.put({ chave: OB_KEY, value: updated })
    setObList(updated); setObModal(false); setObForm({}); toast('Salvo!', 'success')
  }

  async function deleteOb(id: number) {
    const updated = obList.filter(o => o.id !== id)
    await db.config.put({ chave: OB_KEY, value: updated })
    setObList(updated); setConfirmObId(null); toast('Removido.', 'success')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Documentos Pessoais</div>
          <div className="page-header-sub">{docs.length} documento{docs.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_DOC, dataUpload: today }); setDocModal(true) }}>
          <i className="fas fa-plus" />Novo Documento
        </button>
      </div>

      {/* Próximas Obrigações */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}><i className="fas fa-clock-rotate-left" style={{ marginRight: 8, color: 'var(--brand)' }} />Próximas Obrigações</div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setObForm({}); setObModal(true) }}><i className="fas fa-plus" />Adicionar</button>
        </div>
        {obList.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Nenhuma obrigação cadastrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {obList.map(ob => {
              const c = alertColor(ob.data)
              return (
                <div key={ob.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 8, border: `1px solid ${c ? c + '44' : 'var(--surface-border)'}` }}>
                  <i className="fas fa-calendar-check" style={{ color: c || 'var(--brand)', fontSize: 14, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ob.label}</div>
                    {ob.info && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ob.info}</div>}
                  </div>
                  {ob.data && <span style={{ fontSize: 11, color: c || 'var(--text-secondary)', fontWeight: c ? 700 : 400, flexShrink: 0 }}>{fmt.date(ob.data, lang)}</span>}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => { setObForm({ ...ob }); setObModal(true) }}><i className="fas fa-pen" /></button>
                    <button className="btn-icon danger" onClick={() => setConfirmObId(ob.id)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subcategory chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {SUBCATS.map(cat => {
          const count = docs.filter(d => d.categoria === cat.key).length
          if (count === 0) return null
          return (
            <button key={cat.key} onClick={() => setFilterCat(filterCat === cat.key ? '' : cat.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', background: filterCat === cat.key ? 'var(--surface-hover)' : 'var(--surface-card)', border: `1px solid ${filterCat === cat.key ? 'var(--brand)' : 'var(--surface-border)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_BG[cat.color] }}>
                <i className={`fas ${cat.icon}`} style={{ fontSize: 13, color: COLOR_VAR[cat.color] }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 11 }}>{cat.key}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{count}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <i className="fas fa-search" />
            <input placeholder="Buscar documento..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 160 }} value={filterPessoa} onChange={e => setFilterPessoa(e.target.value)}>
            <option value="">Todas as pessoas</option>
            {pessoas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {SUBCATS.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
          </select>
          {(search || filterPessoa || filterCat) && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterPessoa(''); setFilterCat('') }}>
              <i className="fas fa-xmark" />Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Documento</th><th>Pessoa</th><th>Categoria</th><th>Status</th><th>Upload</th><th>Vencimento</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-id-card" /><p>Nenhum documento encontrado.</p></div></td></tr>}
              {filtered.map(r => {
                const sub = SUBCATS.find(s => s.key === r.categoria)
                const st = STATUS_MAP[r.status || 'ativo']
                const c = alertColor(r.vencimento)
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nome}</div>
                      {r.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.descricao}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{r.pessoa}</td>
                    <td>
                      {sub && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLOR_VAR[sub.color], fontWeight: 600 }}>
                        <i className={`fas ${sub.icon}`} style={{ fontSize: 10 }} />{r.categoria}
                      </span>}
                    </td>
                    <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.dataUpload ? fmt.date(r.dataUpload, lang) : '—'}</td>
                    <td style={{ fontSize: 12, color: c || 'var(--text-secondary)', fontWeight: c ? 700 : 400 }}>
                      {r.vencimento ? fmt.date(r.vencimento, lang) : '—'}
                      {c && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.conteudo && (
                          <button className="btn-icon" title="Download" onClick={() => download(r)}><i className="fas fa-download" /></button>
                        )}
                        <button className="btn-icon" onClick={() => { setForm({ ...r }); setDocModal(true) }}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(r.id!)}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doc Modal */}
      {docModal && (
        <Modal title={form.id ? 'Editar Documento' : 'Novo Documento Pessoal'} onClose={() => { setDocModal(false); setForm(EMPTY_DOC) }} large
          footer={<><button className="btn btn-ghost" onClick={() => setDocModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveDoc}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome do documento *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Passaporte Eduardo — 2025" />
            </div>
            <div className="form-group">
              <label className="form-label">Pessoa</label>
              <input className="form-input" value={form.pessoa || ''} onChange={e => setForm(f => ({ ...f, pessoa: e.target.value }))} placeholder="Ex: Eduardo" />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria || 'Identidade'} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {SUBCATS.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subcategoria</label>
              <input className="form-input" value={form.subcategoria || ''} onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))} placeholder="Ex: CPF, RG, Green Card" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data Upload</label>
              <input className="form-input" type="date" value={form.dataUpload || ''} onChange={e => setForm(f => ({ ...f, dataUpload: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.vencimento || ''} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição</label>
              <input className="form-input" value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Observações..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Arquivo</label>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }} onClick={() => fileRef.current?.click()}>
                <i className="fas fa-upload" />{form.nome ? form.nome : 'Clique para selecionar arquivo'}
              </button>
              {form.tamanho && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Tamanho: {form.tamanho}</div>}
            </div>
          </div>
        </Modal>
      )}

      {/* Obrigação Modal */}
      {obModal && (
        <Modal title={obForm.id ? 'Editar Obrigação' : 'Nova Obrigação'} onClose={() => { setObModal(false); setObForm({}) }}
          footer={<><button className="btn btn-ghost" onClick={() => setObModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveOb}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Título *</label>
              <input className="form-input" value={obForm.label || ''} onChange={e => setObForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Renovação do passaporte" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição</label>
              <input className="form-input" value={obForm.info || ''} onChange={e => setObForm(f => ({ ...f, info: e.target.value }))} placeholder="Detalhes opcionais..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Data / Prazo</label>
              <input className="form-input" type="date" value={obForm.data || ''} onChange={e => setObForm(f => ({ ...f, data: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir este documento?" onConfirm={() => deleteDoc(confirmId)} onCancel={() => setConfirmId(null)} />}
      {confirmObId !== null && <ConfirmDialog msg="Excluir esta obrigação?" onConfirm={() => deleteOb(confirmObId)} onCancel={() => setConfirmObId(null)} />}
    </div>
  )
}
