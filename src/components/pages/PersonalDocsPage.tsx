'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { supabase } from '@/integrations/supabase/client'
import { PeopleTabs } from '@/components/people/PeopleTabs'
import type { DocPessoal } from '@/types'

interface InsuranceDocLite {
  id: number
  insurance_type: 'life' | 'apt' | 'car'
  apolice_label: string | null
  nome: string
  categoria: string | null
  arquivo_path: string
  tipo: string | null
  tamanho: string | null
  data_upload: string | null
}

const INSURANCE_TYPES = [
  { key: 'life' as const, label: 'Seguro de vida',         icon: 'fa-heart-pulse', page: 'lifeInsurance' as const, color: 'red' },
  { key: 'apt'  as const, label: 'Seguro de apartamento',  icon: 'fa-building',    page: 'aptInsurance'  as const, color: 'blue' },
  { key: 'car'  as const, label: 'Seguro de carro',        icon: 'fa-car',         page: 'carInsurance'  as const, color: 'green' },
]
const INSURANCE_COLOR_VAR: Record<string, string> = { red: 'var(--red)', blue: 'var(--blue)', green: 'var(--green)' }
const INSURANCE_COLOR_BG: Record<string, string>  = { red: 'rgba(239,68,68,.12)', blue: 'rgba(59,130,246,.12)', green: 'rgba(34,197,94,.12)' }

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
  { key: 'Identidade',            icon: 'fa-id-card',         color: 'brand'  },
  { key: 'Residência',            icon: 'fa-house',            color: 'blue'   },
  { key: 'Passaporte',            icon: 'fa-passport',         color: 'green'  },
  { key: 'Visto',                 icon: 'fa-stamp',            color: 'yellow' },
  { key: 'Seguros',               icon: 'fa-shield-halved',    color: 'purple' },
  { key: 'Plano de saúde',        icon: 'fa-hospital',         color: 'pink'   },
  { key: 'Greencard / Imigração', icon: 'fa-id-badge',         color: 'teal'   },
  { key: 'Outros',                icon: 'fa-folder',           color: 'orange' },
]
const COLOR_VAR: Record<string, string> = { brand: 'var(--brand)', blue: 'var(--blue)', green: 'var(--green)', yellow: 'var(--yellow)', orange: 'var(--orange)', purple: '#a855f7', pink: '#ec4899', teal: '#14b8a6' }
const COLOR_BG: Record<string, string>  = { brand: 'var(--brand-dim)', blue: 'rgba(59,130,246,.12)', green: 'rgba(34,197,94,.12)', yellow: 'rgba(245,158,11,.12)', orange: 'rgba(249,115,22,.12)', purple: 'rgba(168,85,247,.12)', pink: 'rgba(236,72,153,.12)', teal: 'rgba(20,184,166,.12)' }
const STATUS_MAP: Record<string, { badge: string; label: string }> = {
  ativo: { badge: 'brand', label: 'Ativo' }, pendente: { badge: 'yellow', label: 'Pendente' },
  vencido: { badge: 'red', label: 'Vencido' }, renovado: { badge: 'green', label: 'Renovado' },
}

const EMPTY_DOC: Partial<DocPessoal> = { pessoa: 'Eduardo', categoria: 'Identidade', subcategoria: 'CPF', nome: '', tipo: 'PDF', descricao: '', status: 'ativo', dataUpload: new Date().toISOString().slice(0, 10), vencimento: '' }

export function PersonalDocsPage() {
  const { lang, toast, setPage } = useApp()
  const [docs, setDocs] = useState<DocPessoal[]>([])
  const [obList, setObList] = useState<Obrigacao[]>([])
  const [search, setSearch] = useState('')
  const [activePerson, setActivePerson] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [docModal, setDocModal] = useState(false)
  const [obModal, setObModal] = useState(false)
  const [form, setForm] = useState<Partial<DocPessoal>>(EMPTY_DOC)
  const [obForm, setObForm] = useState<Partial<Obrigacao>>({})
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmObId, setConfirmObId] = useState<number | null>(null)
  const [obFilterPessoas, setObFilterPessoas] = useState<string[]>([])
  const [obFilterCats, setObFilterCats] = useState<string[]>([])
  const [insuranceDocs, setInsuranceDocs] = useState<InsuranceDocLite[]>([])
  const [loadingIns, setLoadingIns] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in60  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const [d, ob] = await Promise.all([db.docsPessoais.toArray(), db.config.get(OB_KEY)])
    setDocs(d)
    setObList((ob?.value as Obrigacao[]) || OB_DEFAULTS)
  }, [])

  const loadInsurance = useCallback(async () => {
    setLoadingIns(true)
    const { data, error } = await supabase
      .from('insurance_docs')
      .select('id, insurance_type, apolice_label, nome, categoria, arquivo_path, tipo, tamanho, data_upload')
      .order('created_at', { ascending: false })
    if (error) { toast(error.message, 'error'); setInsuranceDocs([]) }
    else setInsuranceDocs((data as InsuranceDocLite[]) || [])
    setLoadingIns(false)
  }, [toast])

  useEffect(() => { load(); loadInsurance() }, [load, loadInsurance])

  async function downloadInsurance(d: InsuranceDocLite) {
    try {
      const { data, error } = await supabase.storage.from('insurance-documents').createSignedUrl(d.arquivo_path, 3600)
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl; a.download = d.nome; a.target = '_blank'
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar.', 'error')
    }
  }

  async function previewInsurance(d: InsuranceDocLite) {
    try {
      const { data, error } = await supabase.storage.from('insurance-documents').createSignedUrl(d.arquivo_path, 3600)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao visualizar.', 'error')
    }
  }

  const pessoas = [...new Set(docs.map(d => d.pessoa).filter(Boolean))] as string[]
  const categorias = [...new Set(docs.map(d => d.categoria).filter(Boolean))] as string[]
  const filtered = docs.filter(d =>
    (!activePerson || d.pessoa === activePerson) &&
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
        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_DOC, pessoa: activePerson || EMPTY_DOC.pessoa, dataUpload: today }); setDocModal(true) }}>
          <i className="fas fa-plus" />Novo Documento
        </button>
      </div>

      {/* Pessoas (abas) */}
      <PeopleTabs activePersonName={activePerson} onActivePersonChange={setActivePerson} />

      

      {/* Subcategory chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {SUBCATS.map(cat => {
          const count = cat.key === 'Seguros' ? insuranceDocs.length : docs.filter(d => d.categoria === cat.key).length
          if (count === 0 && cat.key !== 'Seguros') return null
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
          {activePerson && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: 'var(--brand-dim)', color: 'var(--brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i className="fas fa-user" style={{ fontSize: 10 }} />Filtrando por: {activePerson}
            </span>
          )}
          <select className="form-select" style={{ maxWidth: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {SUBCATS.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
          </select>
          {(search || filterCat) && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterCat('') }}>
              <i className="fas fa-xmark" />Limpar
            </button>
          )}
        </div>
      </div>

      {/* Seção especial: Seguros (read-only, sincronizada com insurance_docs) */}
      {filterCat === 'Seguros' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <i className="fas fa-info-circle" style={{ color: '#a855f7' }} />
              Esta categoria é <strong>sincronizada automaticamente</strong> com as páginas de seguros. Documentos não podem ser cadastrados aqui — adicione-os diretamente na apólice correspondente.
            </div>
          </div>

          {INSURANCE_TYPES.map(t => {
            const items = insuranceDocs.filter(d => d.insurance_type === t.key)
              .filter(d => !search || d.nome.toLowerCase().includes(search.toLowerCase()) || (d.apolice_label || '').toLowerCase().includes(search.toLowerCase()))
            return (
              <div key={t.key} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--surface-border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: INSURANCE_COLOR_BG[t.color] }}>
                    <i className={`fas ${t.icon}`} style={{ fontSize: 16, color: INSURANCE_COLOR_VAR[t.color] }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length} documento{items.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setPage(t.page)}>
                    <i className="fas fa-arrow-up-right-from-square" />Ir para a página
                  </button>
                </div>

                {loadingIns ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Carregando…
                  </div>
                ) : items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12, background: 'var(--surface-hover)', borderRadius: 8, border: '1px dashed var(--surface-border)' }}>
                    <i className="fas fa-folder-open" style={{ fontSize: 18, display: 'block', marginBottom: 6 }} />
                    Nenhum documento encontrado
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(d => {
                      const isImg = !!d.tipo && ['JPG','JPEG','PNG','WEBP','GIF'].includes(d.tipo.toUpperCase())
                      const isPdf = d.tipo?.toUpperCase() === 'PDF'
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 6, border: '1px solid var(--surface-border)' }}>
                          <i className={`fas ${isPdf ? 'fa-file-pdf' : isImg ? 'fa-file-image' : 'fa-file'}`} style={{ fontSize: 16, color: isPdf ? '#ef4444' : isImg ? '#3b82f6' : 'var(--text-muted)', width: 20, textAlign: 'center', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 1 }}>
                              {d.apolice_label && <span><i className="fas fa-shield" style={{ marginRight: 3 }} />{d.apolice_label}</span>}
                              {d.categoria && <span><i className="fas fa-tag" style={{ marginRight: 3 }} />{d.categoria}</span>}
                              {d.tipo && <span>{d.tipo}</span>}
                              {d.tamanho && <span>{d.tamanho}</span>}
                              {d.data_upload && <span>{fmt.date(d.data_upload, lang)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {(isImg || isPdf) && (
                              <button className="btn-icon" title="Visualizar" onClick={() => previewInsurance(d)}><i className="fas fa-eye" /></button>
                            )}
                            <button className="btn-icon" title="Baixar" onClick={() => downloadInsurance(d)}><i className="fas fa-download" /></button>
                            <button className="btn-icon" title="Ir para origem" onClick={() => setPage(t.page)}><i className="fas fa-arrow-up-right-from-square" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SUBCATS.filter(cat => cat.key !== 'Seguros' && (!filterCat || filterCat === cat.key)).map(cat => {
            const items = filtered.filter(d => d.categoria === cat.key)
            return (
              <div key={cat.key} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--surface-border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_BG[cat.color] }}>
                    <i className={`fas ${cat.icon}`} style={{ fontSize: 16, color: COLOR_VAR[cat.color] }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.key}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length} documento{items.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setForm({ ...EMPTY_DOC, pessoa: activePerson || EMPTY_DOC.pessoa, categoria: cat.key, dataUpload: today }); setDocModal(true) }}>
                    <i className="fas fa-plus" />Adicionar
                  </button>
                </div>

                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12, background: 'var(--surface-hover)', borderRadius: 8, border: '1px dashed var(--surface-border)' }}>
                    <i className="fas fa-folder-open" style={{ fontSize: 18, display: 'block', marginBottom: 6 }} />
                    Nenhum documento adicionado
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(r => {
                      const st = STATUS_MAP[r.status || 'ativo']
                      const c = alertColor(r.vencimento)
                      const isPdf = r.tipo?.toUpperCase() === 'PDF'
                      const isImg = !!r.tipo && ['JPG','JPEG','PNG','WEBP','GIF'].includes(r.tipo.toUpperCase())
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 6, border: '1px solid var(--surface-border)' }}>
                          <i className={`fas ${isPdf ? 'fa-file-pdf' : isImg ? 'fa-file-image' : 'fa-file'}`} style={{ fontSize: 16, color: isPdf ? '#ef4444' : isImg ? '#3b82f6' : 'var(--text-muted)', width: 20, textAlign: 'center', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 1 }}>
                              <span><i className="fas fa-user" style={{ marginRight: 3 }} />{r.pessoa}</span>
                              {r.subcategoria && <span><i className="fas fa-tag" style={{ marginRight: 3 }} />{r.subcategoria}</span>}
                              {r.tipo && <span>{r.tipo}</span>}
                              {r.dataUpload && <span>{fmt.date(r.dataUpload, lang)}</span>}
                              {r.vencimento && <span style={{ color: c || 'var(--text-muted)', fontWeight: c ? 700 : 400 }}>Venc: {fmt.date(r.vencimento, lang)}{c && ' ⚠'}</span>}
                            </div>
                          </div>
                          <span className={`badge badge-${st.badge}`} style={{ flexShrink: 0 }}>{st.label}</span>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {r.conteudo && <button className="btn-icon" title="Download" onClick={() => download(r)}><i className="fas fa-download" /></button>}
                            <button className="btn-icon" title="Editar" onClick={() => { setForm({ ...r }); setDocModal(true) }}><i className="fas fa-pen" /></button>
                            <button className="btn-icon danger" title="Excluir" onClick={() => setConfirmId(r.id!)}><i className="fas fa-trash" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Pessoas vinculadas</label>
              {pessoas.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--yellow)', padding: 8, background: 'rgba(245,158,11,.1)', borderRadius: 6 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                  Nenhuma pessoa cadastrada. Crie um documento com pessoa primeiro.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: 'var(--surface-hover)', borderRadius: 6, border: '1px solid var(--surface-border)', maxHeight: 120, overflowY: 'auto' }}>
                  {pessoas.map(p => {
                    const sel = (obForm.pessoas || []).includes(p)
                    return (
                      <button key={p} type="button"
                        onClick={() => setObForm(f => ({ ...f, pessoas: sel ? (f.pessoas || []).filter(x => x !== p) : [...(f.pessoas || []), p] }))}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, border: `1px solid ${sel ? 'var(--brand)' : 'var(--surface-border)'}`, background: sel ? 'var(--brand-dim)' : 'var(--surface-card)', color: sel ? 'var(--brand)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>
                        {sel && <i className="fas fa-check" style={{ marginRight: 4, fontSize: 10 }} />}{p}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Categorias vinculadas</label>
              {categorias.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--yellow)', padding: 8, background: 'rgba(245,158,11,.1)', borderRadius: 6 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                  Nenhuma categoria cadastrada. Crie um documento primeiro.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: 'var(--surface-hover)', borderRadius: 6, border: '1px solid var(--surface-border)', maxHeight: 120, overflowY: 'auto' }}>
                  {categorias.map(c => {
                    const sel = (obForm.categorias || []).includes(c)
                    return (
                      <button key={c} type="button"
                        onClick={() => setObForm(f => ({ ...f, categorias: sel ? (f.categorias || []).filter(x => x !== c) : [...(f.categorias || []), c] }))}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, border: `1px solid ${sel ? 'var(--brand)' : 'var(--surface-border)'}`, background: sel ? 'var(--brand-dim)' : 'var(--surface-card)', color: sel ? 'var(--brand)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>
                        {sel && <i className="fas fa-check" style={{ marginRight: 4, fontSize: 10 }} />}{c}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir este documento?" onConfirm={() => deleteDoc(confirmId)} onCancel={() => setConfirmId(null)} />}
      {confirmObId !== null && <ConfirmDialog msg="Excluir esta obrigação?" onConfirm={() => deleteOb(confirmObId)} onCancel={() => setConfirmObId(null)} />}
    </div>
  )
}
