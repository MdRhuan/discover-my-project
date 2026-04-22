'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { BemMovel, BemMovelFile, BemMovelManutencao, BemMovelTransferencia } from '@/types'

const BUCKET = 'bens-moveis'

const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'doc', 'docx', 'xls', 'xlsx']
const ALLOWED_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.xls,.xlsx,image/*'
const MAX_SIZE = 25 * 1024 * 1024

const CATEGORIAS = [
  { value: 'Veículo',     icon: 'fa-car',           color: '#3b82f6' },
  { value: 'Eletrônico',  icon: 'fa-laptop',        color: '#8b5cf6' },
  { value: 'Mobiliário',  icon: 'fa-couch',         color: '#f59e0b' },
  { value: 'Equipamento', icon: 'fa-screwdriver-wrench', color: '#14b8a6' },
  { value: 'Obra de Arte', icon: 'fa-palette',      color: '#ec4899' },
  { value: 'Joia',        icon: 'fa-gem',           color: '#a855f7' },
  { value: 'Outros',      icon: 'fa-box',           color: '#64748b' },
]

const STATUS_OPTS: Array<{ value: BemMovel['status']; label: string; color: string; bg: string }> = [
  { value: 'ativo',       label: 'Ativo',         color: '#15803d', bg: '#dcfce7' },
  { value: 'manutencao',  label: 'Em manutenção', color: '#a16207', bg: '#fef3c7' },
  { value: 'inativo',     label: 'Inativo',       color: '#b91c1c', bg: '#fee2e2' },
  { value: 'descartado',  label: 'Descartado',    color: '#475569', bg: '#e2e8f0' },
]

const METODOS_DEP = ['Linear', 'Acelerada', 'Soma dos dígitos', 'Unidades produzidas']

const EMPTY: Partial<BemMovel> = {
  nome: '', codigoPatrimonial: '', numeroSerie: '', marca: '', modelo: '',
  categoria: 'Equipamento', fornecedor: '', dataCompra: '',
  valorAquisicao: 0, valorAtual: 0, moeda: 'BRL',
  setorResponsavel: '', colaboradorResponsavel: '', localizacao: '',
  vidaUtil: 60, metodoDepreciacao: 'Linear', status: 'ativo', notas: '',
}

function catMeta(cat?: string) {
  return CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[CATEGORIAS.length - 1]
}
function statusMeta(s?: BemMovel['status']) {
  return STATUS_OPTS.find(x => x.value === s) || STATUS_OPTS[0]
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
function formatDateTime(iso?: string) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}
function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXT.includes(ext)) return `Formato não suportado: .${ext}`
  if (file.size > MAX_SIZE) return `Arquivo muito grande (máx. 25MB): ${file.name}`
  return null
}
function safePath(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

function depreciacaoSerie(bem: BemMovel): { ano: number; valor: number }[] {
  const va = Number(bem.valorAquisicao) || 0
  const vu = Math.max(1, Math.round((bem.vidaUtil || 60) / 12))
  const out = [{ ano: 0, valor: va }]
  for (let i = 1; i <= vu; i++) {
    out.push({ ano: i, valor: Math.max(0, va * (1 - i / vu)) })
  }
  return out
}

export function BensMoveisPage() {
  const { toast } = useApp()
  const [items, setItems] = useState<BemMovel[]>([])
  const [files, setFiles] = useState<BemMovelFile[]>([])
  const [manuts, setManuts] = useState<BemMovelManutencao[]>([])
  const [transfs, setTransfs] = useState<BemMovelTransferencia[]>([])
  const [loading, setLoading] = useState(true)

  // filtros
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSetor, setFilterSetor] = useState('')
  const [filterResp, setFilterResp] = useState('')
  const [orderBy, setOrderBy] = useState<'nome' | 'valor' | 'data'>('nome')

  // modal cadastro/edição
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<BemMovel>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)

  // modal detalhes
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // manutenção / transferência
  const [manutForm, setManutForm] = useState<{ data: string; descricao: string; custo: number }>({ data: '', descricao: '', custo: 0 })
  const [transfForm, setTransfForm] = useState<{ data: string; setorOrigem: string; setorDestino: string; responsavel: string; observacoes: string }>({ data: '', setorOrigem: '', setorDestino: '', responsavel: '', observacoes: '' })

  // confirm
  const [confirm, setConfirm] = useState<null | { msg: string; onConfirm: () => void }>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, f, m, t] = await Promise.all([
        db.bensMoveis.toArray(),
        db.bensMoveisFiles.toArray(),
        db.bensMoveisManutencoes.toArray(),
        db.bensMoveisTransferencias.toArray(),
      ])
      setItems(b); setFiles(f); setManuts(m); setTransfs(t)
    } catch (e) {
      console.error('[BensMoveis] load', e)
      toast('Erro ao carregar bens', 'error')
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  // realtime
  useEffect(() => {
    const ch = supabase.channel('bens-moveis-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bens_moveis' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bens_moveis_files' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bens_moveis_manutencoes' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bens_moveis_transferencias' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  // listas auxiliares
  const setores = useMemo(() => Array.from(new Set(items.map(i => i.setorResponsavel).filter(Boolean))) as string[], [items])
  const responsaveis = useMemo(() => Array.from(new Set(items.map(i => i.colaboradorResponsavel).filter(Boolean))) as string[], [items])

  // KPIs
  const kpis = useMemo(() => {
    const total = items.length
    const valor = items.reduce((s, i) => s + (Number(i.valorAtual) || Number(i.valorAquisicao) || 0), 0)
    const manutencao = items.filter(i => i.status === 'manutencao').length
    const depreciados = items.filter(i => (Number(i.valorAtual) || 0) < (Number(i.valorAquisicao) || 0) * 0.5).length
    return { total, valor, manutencao, depreciados }
  }, [items])

  // tabela filtrada
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = items.filter(i => {
      if (q) {
        const hay = `${i.nome} ${i.codigoPatrimonial || ''} ${i.colaboradorResponsavel || ''} ${i.numeroSerie || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterCat && i.categoria !== filterCat) return false
      if (filterStatus && i.status !== filterStatus) return false
      if (filterSetor && i.setorResponsavel !== filterSetor) return false
      if (filterResp && i.colaboradorResponsavel !== filterResp) return false
      return true
    })
    arr = [...arr].sort((a, b) => {
      if (orderBy === 'valor') return (Number(b.valorAtual) || 0) - (Number(a.valorAtual) || 0)
      if (orderBy === 'data') return (b.dataCompra || '').localeCompare(a.dataCompra || '')
      return (a.nome || '').localeCompare(b.nome || '')
    })
    return arr
  }, [items, search, filterCat, filterStatus, filterSetor, filterResp, orderBy])

  // ações
  function openNew() {
    setEditId(null); setForm(EMPTY); setPendingPhoto(null); setModal(true)
  }
  function openEdit(b: BemMovel) {
    setEditId(b.id || null); setForm(b); setPendingPhoto(null); setModal(true)
  }

  async function uploadPhoto(bemId: number, file: File): Promise<string | null> {
    const path = `${bemId}/foto-${Date.now()}-${safePath(file.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream',
    })
    if (error) { console.error(error); return null }
    return path
  }

  async function save() {
    if (saving) return
    if (!form.nome?.trim()) { toast('Informe o nome do bem', 'error'); return }
    setSaving(true)
    try {
      let id = editId
      if (id != null) {
        await db.bensMoveis.update(id, form as BemMovel)
      } else {
        id = await db.bensMoveis.add(form as BemMovel)
      }
      if (pendingPhoto && id != null) {
        const path = await uploadPhoto(id, pendingPhoto)
        if (path) await db.bensMoveis.update(id, { fotoPath: path } as Partial<BemMovel>)
      }
      toast(editId != null ? 'Bem atualizado' : 'Bem cadastrado', 'success')
      setModal(false)
      await load()
    } catch (e) {
      console.error(e); toast('Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  function askDelete(id: number) {
    setConfirm({
      msg: 'Excluir este bem? Esta ação remove anexos, manutenções e transferências.',
      onConfirm: async () => {
        try {
          // remover arquivos do storage
          const bemFiles = files.filter(f => f.bemId === id)
          if (bemFiles.length) {
            await supabase.storage.from(BUCKET).remove(bemFiles.map(f => f.arquivoPath)).catch(() => {})
          }
          const bem = items.find(i => i.id === id)
          if (bem?.fotoPath) await supabase.storage.from(BUCKET).remove([bem.fotoPath]).catch(() => {})
          await db.bensMoveis.delete(id)
          toast('Excluído', 'success'); setConfirm(null); await load()
        } catch (e) {
          console.error(e); toast('Erro ao excluir', 'error'); setConfirm(null)
        }
      },
    })
  }

  // upload de arquivos no modal de detalhes
  async function uploadFiles(bemId: number, list: FileList | null) {
    if (!list || list.length === 0) return
    setUploadingFiles(true)
    const errors: string[] = []
    try {
      for (const file of Array.from(list)) {
        const err = validateFile(file)
        if (err) { errors.push(err); continue }
        const path = `${bemId}/${Date.now()}-${safePath(file.name)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream',
        })
        if (upErr) { errors.push(`${file.name}: ${upErr.message}`); continue }
        try {
          await db.bensMoveisFiles.add({
            bemId, nome: file.name, arquivoPath: path,
            tipo: file.type || 'application/octet-stream',
            tamanho: formatSize(file.size),
            dataUpload: new Date().toISOString(),
          })
        } catch (dbErr) {
          console.error(dbErr)
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
          errors.push(`${file.name}: erro no banco`)
        }
      }
      if (errors.length) toast(errors.join(' | '), 'error')
      else toast(`${list.length} arquivo(s) enviado(s)`, 'success')
      await load()
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function downloadFile(f: BemMovelFile) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.arquivoPath, 60)
    if (error || !data) { toast('Erro ao baixar', 'error'); return }
    window.open(data.signedUrl, '_blank')
  }
  async function viewFile(f: BemMovelFile) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.arquivoPath, 300)
    if (error || !data) { toast('Erro ao abrir', 'error'); return }
    window.open(data.signedUrl, '_blank')
  }
  async function removeFile(f: BemMovelFile) {
    if (!f.id) return
    setConfirm({
      msg: `Remover arquivo "${f.nome}"?`,
      onConfirm: async () => {
        try {
          await supabase.storage.from(BUCKET).remove([f.arquivoPath]).catch(() => {})
          await db.bensMoveisFiles.delete(f.id!)
          toast('Removido', 'success'); setConfirm(null); await load()
        } catch (e) { console.error(e); toast('Erro', 'error'); setConfirm(null) }
      },
    })
  }

  // foto signed URL cache
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  useEffect(() => {
    let cancelled = false
    async function fetchPhotos() {
      const next: Record<number, string> = {}
      await Promise.all(items.filter(i => i.fotoPath).map(async i => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(i.fotoPath!, 3600)
        if (data?.signedUrl && i.id != null) next[i.id] = data.signedUrl
      }))
      if (!cancelled) setPhotoUrls(next)
    }
    fetchPhotos()
    return () => { cancelled = true }
  }, [items])

  async function addManutencao(bemId: number) {
    if (!manutForm.descricao.trim()) { toast('Informe a descrição', 'error'); return }
    try {
      await db.bensMoveisManutencoes.add({ bemId, ...manutForm })
      setManutForm({ data: '', descricao: '', custo: 0 })
      toast('Manutenção registrada', 'success'); await load()
    } catch (e) { console.error(e); toast('Erro', 'error') }
  }
  async function delManutencao(id: number) {
    try { await db.bensMoveisManutencoes.delete(id); await load() } catch (e) { console.error(e) }
  }

  async function addTransferencia(bemId: number) {
    if (!transfForm.setorDestino.trim()) { toast('Informe o setor destino', 'error'); return }
    try {
      await db.bensMoveisTransferencias.add({ bemId, ...transfForm })
      // atualiza setor responsável atual
      await db.bensMoveis.update(bemId, { setorResponsavel: transfForm.setorDestino } as Partial<BemMovel>)
      setTransfForm({ data: '', setorOrigem: '', setorDestino: '', responsavel: '', observacoes: '' })
      toast('Transferência registrada', 'success'); await load()
    } catch (e) { console.error(e); toast('Erro', 'error') }
  }
  async function delTransferencia(id: number) {
    try { await db.bensMoveisTransferencias.delete(id); await load() } catch (e) { console.error(e) }
  }

  const detailsBem = items.find(i => i.id === detailsId)
  const detailsFiles = files.filter(f => f.bemId === detailsId)
  const detailsManuts = manuts.filter(m => m.bemId === detailsId).sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  const detailsTransfs = transfs.filter(t => t.bemId === detailsId).sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><i className="fas fa-couch" /> Bens Móveis</h1>
          <p className="page-subtitle">Controle patrimonial completo: cadastro, depreciação, manutenções e documentos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar" style={{ width: 300, maxWidth: 300 }}>
            <i className="fas fa-search" />
            <input
              placeholder="Buscar por nome, código ou responsável…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            <i className="fas fa-plus" /> Adicionar Bem
          </button>
        </div>
      </div>

      {/* KPIs (padrão kpi-card) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de Bens',       value: String(kpis.total),              icon: 'fa-boxes-stacked' },
          { label: 'Valor do Patrimônio', value: fmt.currency(kpis.valor, 'BRL'), icon: 'fa-sack-dollar' },
          { label: 'Em Manutenção',       value: String(kpis.manutencao),         icon: 'fa-screwdriver-wrench' },
          { label: 'Depreciados (<50%)',  value: String(kpis.depreciados),        icon: 'fa-arrow-trend-down' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <i className={`fas ${k.icon}`} style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: 'var(--brand)', opacity: .35 }} />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <i className="fas fa-filter" style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }} />
        <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="">Todos status</option>
          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" value={filterSetor} onChange={e => setFilterSetor(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="">Todos setores</option>
          {setores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filterResp} onChange={e => setFilterResp(e.target.value)} style={{ width: 'auto', minWidth: 170 }}>
          <option value="">Todos responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterCat || filterStatus || filterSetor || filterResp) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterCat(''); setFilterStatus(''); setFilterSetor(''); setFilterResp('') }}
          >
            <i className="fas fa-xmark" /> Limpar
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {visible.length} {visible.length === 1 ? 'item' : 'itens'} • Ordenar:
          </span>
          <select className="form-select" value={orderBy} onChange={e => setOrderBy(e.target.value as 'nome' | 'valor' | 'data')} style={{ width: 'auto', minWidth: 160 }}>
            <option value="nome">Nome</option>
            <option value="valor">Valor</option>
            <option value="data">Data de aquisição</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" /> Carregando…
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-couch" style={{ fontSize: 32, marginBottom: 12, opacity: .4 }} />
            <div>{items.length === 0 ? 'Nenhum bem cadastrado.' : 'Nenhum bem encontrado com esses filtros.'}</div>
            {items.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openNew}>
                <i className="fas fa-plus" /> Adicionar primeiro bem
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Foto</th>
                  <th>Nome / Código</th>
                  <th>Categoria</th>
                  <th>Responsável</th>
                  <th>Localização</th>
                  <th>Valor atual</th>
                  <th>Status</th>
                  <th style={{ width: 130 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const cm = catMeta(b.categoria)
                  const sm = statusMeta(b.status)
                  const photo = b.id != null ? photoUrls[b.id] : undefined
                  return (
                    <tr key={b.id}>
                      <td>
                        {photo ? (
                          <img src={photo} alt={b.nome} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: cm.color + '22', color: cm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            <i className={`fas ${cm.icon}`} />
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.nome}</div>
                        {b.codigoPatrimonial && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{b.codigoPatrimonial}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 999, background: cm.color + '22', color: cm.color, fontSize: 11, fontWeight: 600 }}>
                          <i className={`fas ${cm.icon}`} style={{ fontSize: 10 }} />
                          {b.categoria || '—'}
                        </span>
                      </td>
                      <td>
                        {b.colaboradorResponsavel ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: fmt.avatarColor(b.colaboradorResponsavel), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                              {fmt.initials(b.colaboradorResponsavel)}
                            </div>
                            <span style={{ fontSize: 13 }}>{b.colaboradorResponsavel}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 13 }}>{b.localizacao || b.setorResponsavel || '—'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {b.valorAtual || b.valorAquisicao
                          ? fmt.currency(Number(b.valorAtual || b.valorAquisicao), (b.moeda || 'BRL'))
                          : '—'}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, background: sm.bg, color: sm.color, fontSize: 11, fontWeight: 600, border: `1px solid ${sm.color}33` }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.color }} />
                          {sm.label}
                        </span>
                      </td>
                      <td>
                        <button className="icon-btn" title="Ver detalhes" onClick={() => setDetailsId(b.id!)}>
                          <i className="fas fa-eye" />
                        </button>
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(b)}>
                          <i className="fas fa-pen" />
                        </button>
                        <button className="icon-btn" title="Excluir" onClick={() => askDelete(b.id!)} style={{ color: 'var(--red)' }}>
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CADASTRO/EDIÇÃO */}
      {modal && (
        <Modal large title={editId != null ? 'Editar Bem' : 'Novo Bem'} onClose={() => !saving && setModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <h4 style={{ gridColumn: '1 / -1', margin: '0 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>📌 Informações principais</h4>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Nome do bem *</label>
              <input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Código patrimonial</label>
              <input value={form.codigoPatrimonial || ''} onChange={e => setForm({ ...form, codigoPatrimonial: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Número de série</label>
              <input value={form.numeroSerie || ''} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Marca</label>
              <input value={form.marca || ''} onChange={e => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Modelo</label>
              <input value={form.modelo || ''} onChange={e => setForm({ ...form, modelo: e.target.value })} />
            </div>

            <h4 style={{ gridColumn: '1 / -1', margin: '8px 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>💰 Financeiro</h4>
            <div className="form-row">
              <label>Categoria</label>
              <select value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Fornecedor</label>
              <input value={form.fornecedor || ''} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Data de compra</label>
              <input type="date" value={form.dataCompra || ''} onChange={e => setForm({ ...form, dataCompra: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Moeda</label>
              <select value={form.moeda || 'BRL'} onChange={e => setForm({ ...form, moeda: e.target.value as 'BRL' | 'USD' })}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="form-row">
              <label>Valor de aquisição</label>
              <input type="number" value={form.valorAquisicao ?? ''} onChange={e => setForm({ ...form, valorAquisicao: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <label>Valor atual</label>
              <input type="number" value={form.valorAtual ?? ''} onChange={e => setForm({ ...form, valorAtual: Number(e.target.value) })} />
            </div>

            <h4 style={{ gridColumn: '1 / -1', margin: '8px 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>👤 Responsabilidade</h4>
            <div className="form-row">
              <label>Setor responsável</label>
              <input value={form.setorResponsavel || ''} onChange={e => setForm({ ...form, setorResponsavel: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Colaborador responsável</label>
              <input value={form.colaboradorResponsavel || ''} onChange={e => setForm({ ...form, colaboradorResponsavel: e.target.value })} />
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Localização</label>
              <input placeholder="Ex.: escritório SP, filial RJ…" value={form.localizacao || ''} onChange={e => setForm({ ...form, localizacao: e.target.value })} />
            </div>

            <h4 style={{ gridColumn: '1 / -1', margin: '8px 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>📉 Depreciação</h4>
            <div className="form-row">
              <label>Vida útil (meses)</label>
              <input type="number" value={form.vidaUtil ?? ''} onChange={e => setForm({ ...form, vidaUtil: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <label>Método de depreciação</label>
              <select value={form.metodoDepreciacao || 'Linear'} onChange={e => setForm({ ...form, metodoDepreciacao: e.target.value })}>
                {METODOS_DEP.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Status</label>
              <select value={form.status || 'ativo'} onChange={e => setForm({ ...form, status: e.target.value as BemMovel['status'] })}>
                {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Foto do bem</label>
              <input type="file" accept="image/*" onChange={e => setPendingPhoto(e.target.files?.[0] || null)} />
              {pendingPhoto && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pendingPhoto.name}</div>}
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Notas</label>
              <textarea rows={3} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL DETALHES */}
      {detailsBem && (
        <Modal large title={`Detalhes: ${detailsBem.nome}`} onClose={() => setDetailsId(null)}>
          <DetailsView
            bem={detailsBem}
            files={detailsFiles}
            manuts={detailsManuts}
            transfs={detailsTransfs}
            photoUrl={detailsBem.id != null ? photoUrls[detailsBem.id] : undefined}
            uploading={uploadingFiles}
            fileInputRef={fileInputRef}
            onUpload={list => uploadFiles(detailsBem.id!, list)}
            onView={viewFile}
            onDownload={downloadFile}
            onRemoveFile={removeFile}
            manutForm={manutForm}
            setManutForm={setManutForm}
            addManutencao={() => addManutencao(detailsBem.id!)}
            delManutencao={delManutencao}
            transfForm={transfForm}
            setTransfForm={setTransfForm}
            addTransferencia={() => addTransferencia(detailsBem.id!)}
            delTransferencia={delTransferencia}
          />
        </Modal>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

interface DetailsProps {
  bem: BemMovel
  files: BemMovelFile[]
  manuts: BemMovelManutencao[]
  transfs: BemMovelTransferencia[]
  photoUrl?: string
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onUpload: (list: FileList | null) => void
  onView: (f: BemMovelFile) => void
  onDownload: (f: BemMovelFile) => void
  onRemoveFile: (f: BemMovelFile) => void
  manutForm: { data: string; descricao: string; custo: number }
  setManutForm: (v: { data: string; descricao: string; custo: number }) => void
  addManutencao: () => void
  delManutencao: (id: number) => void
  transfForm: { data: string; setorOrigem: string; setorDestino: string; responsavel: string; observacoes: string }
  setTransfForm: (v: { data: string; setorOrigem: string; setorDestino: string; responsavel: string; observacoes: string }) => void
  addTransferencia: () => void
  delTransferencia: (id: number) => void
}

function DetailsView(p: DetailsProps) {
  const [tab, setTab] = useState<'info' | 'manut' | 'transf' | 'docs' | 'dep'>('info')
  const cm = catMeta(p.bem.categoria)
  const sm = statusMeta(p.bem.status)
  const dep = depreciacaoSerie(p.bem)
  const maxV = Math.max(...dep.map(d => d.valor), 1)

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        {p.photoUrl ? (
          <img src={p.photoUrl} alt={p.bem.nome} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12 }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 12, background: cm.color + '22', color: cm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            <i className={`fas ${cm.icon}`} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{p.bem.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.bem.codigoPatrimonial && `#${p.bem.codigoPatrimonial} • `}{p.bem.marca} {p.bem.modelo}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <span style={{ padding: '3px 8px', borderRadius: 999, background: cm.color + '22', color: cm.color, fontSize: 11, fontWeight: 600 }}>{p.bem.categoria}</span>
            <span style={{ padding: '3px 8px', borderRadius: 999, background: sm.bg, color: sm.color, fontSize: 11, fontWeight: 600 }}>{sm.label}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--surface-border)', marginBottom: 16 }}>
        {[
          { id: 'info', label: 'Informações', icon: 'fa-circle-info' },
          { id: 'manut', label: 'Manutenções', icon: 'fa-wrench' },
          { id: 'transf', label: 'Transferências', icon: 'fa-right-left' },
          { id: 'docs', label: 'Documentos', icon: 'fa-paperclip' },
          { id: 'dep', label: 'Depreciação', icon: 'fa-chart-line' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'info' | 'manut' | 'transf' | 'docs' | 'dep')}
            style={{
              padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13,
              borderBottom: tab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            <i className={`fas ${t.icon}`} style={{ marginRight: 6, fontSize: 11 }} />{t.label}
          </button>
        ))}
      </div>

      {/* INFO */}
      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
          <Field label="Número de série" value={p.bem.numeroSerie} />
          <Field label="Marca / Modelo" value={[p.bem.marca, p.bem.modelo].filter(Boolean).join(' ')} />
          <Field label="Fornecedor" value={p.bem.fornecedor} />
          <Field label="Data de compra" value={fmt.date(p.bem.dataCompra)} />
          <Field label="Valor de aquisição" value={p.bem.valorAquisicao ? fmt.currency(p.bem.valorAquisicao, p.bem.moeda || 'BRL') : '—'} />
          <Field label="Valor atual" value={p.bem.valorAtual ? fmt.currency(p.bem.valorAtual, p.bem.moeda || 'BRL') : '—'} />
          <Field label="Setor responsável" value={p.bem.setorResponsavel} />
          <Field label="Colaborador" value={p.bem.colaboradorResponsavel} />
          <Field label="Localização" value={p.bem.localizacao} />
          <Field label="Vida útil" value={p.bem.vidaUtil ? `${p.bem.vidaUtil} meses` : '—'} />
          <Field label="Método de depreciação" value={p.bem.metodoDepreciacao} />
          <Field label="Status" value={sm.label} />
          {p.bem.notas && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notas</div>
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.bem.notas}</div>
            </div>
          )}
        </div>
      )}

      {/* MANUTENÇÕES */}
      {tab === 'manut' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px auto', gap: 8, marginBottom: 12 }}>
            <input type="date" value={p.manutForm.data} onChange={e => p.setManutForm({ ...p.manutForm, data: e.target.value })} />
            <input placeholder="Descrição da manutenção" value={p.manutForm.descricao} onChange={e => p.setManutForm({ ...p.manutForm, descricao: e.target.value })} />
            <input type="number" placeholder="Custo" value={p.manutForm.custo || ''} onChange={e => p.setManutForm({ ...p.manutForm, custo: Number(e.target.value) })} />
            <button className="btn btn-primary" onClick={p.addManutencao}><i className="fas fa-plus" /> Adicionar</button>
          </div>
          {p.manuts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma manutenção registrada</div>
          ) : (
            <table className="table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Custo</th><th /></tr></thead>
              <tbody>
                {p.manuts.map(m => (
                  <tr key={m.id}>
                    <td>{fmt.date(m.data)}</td>
                    <td>{m.descricao}</td>
                    <td>{m.custo ? fmt.currency(m.custo, 'BRL') : '—'}</td>
                    <td><button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => m.id && p.delManutencao(m.id)}><i className="fas fa-trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TRANSFERÊNCIAS */}
      {tab === 'transf' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input type="date" value={p.transfForm.data} onChange={e => p.setTransfForm({ ...p.transfForm, data: e.target.value })} />
            <input placeholder="Setor origem" value={p.transfForm.setorOrigem} onChange={e => p.setTransfForm({ ...p.transfForm, setorOrigem: e.target.value })} />
            <input placeholder="Setor destino *" value={p.transfForm.setorDestino} onChange={e => p.setTransfForm({ ...p.transfForm, setorDestino: e.target.value })} />
            <input placeholder="Responsável" value={p.transfForm.responsavel} onChange={e => p.setTransfForm({ ...p.transfForm, responsavel: e.target.value })} />
            <button className="btn btn-primary" onClick={p.addTransferencia}><i className="fas fa-plus" /> Registrar</button>
          </div>
          <input style={{ width: '100%', marginBottom: 12 }} placeholder="Observações" value={p.transfForm.observacoes} onChange={e => p.setTransfForm({ ...p.transfForm, observacoes: e.target.value })} />
          {p.transfs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma transferência registrada</div>
          ) : (
            <table className="table">
              <thead><tr><th>Data</th><th>De → Para</th><th>Responsável</th><th>Obs.</th><th /></tr></thead>
              <tbody>
                {p.transfs.map(t => (
                  <tr key={t.id}>
                    <td>{fmt.date(t.data)}</td>
                    <td>{(t.setorOrigem || '—')} → <strong>{t.setorDestino}</strong></td>
                    <td>{t.responsavel || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.observacoes || '—'}</td>
                    <td><button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => t.id && p.delTransferencia(t.id)}><i className="fas fa-trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DOCUMENTOS */}
      {tab === 'docs' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <i className="fas fa-upload" /> {p.uploading ? 'Enviando…' : 'Enviar arquivos'}
              <input
                ref={p.fileInputRef}
                type="file"
                accept={ALLOWED_ACCEPT}
                multiple
                hidden
                disabled={p.uploading}
                onChange={e => p.onUpload(e.target.files)}
              />
            </label>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, imagens, DOC, XLS — até 25MB cada</span>
          </div>
          {p.files.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fas fa-paperclip" style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }} />
              <div>Nenhum arquivo anexado</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {p.files.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid var(--surface-border)', borderRadius: 8 }}>
                  <i className="fas fa-file" style={{ color: 'var(--brand)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.tamanho} • {formatDateTime(f.dataUpload)}</div>
                  </div>
                  <button className="icon-btn" title="Visualizar" onClick={() => p.onView(f)}><i className="fas fa-eye" /></button>
                  <button className="icon-btn" title="Baixar" onClick={() => p.onDownload(f)}><i className="fas fa-download" /></button>
                  <button className="icon-btn" title="Remover" style={{ color: 'var(--red)' }} onClick={() => p.onRemoveFile(f)}><i className="fas fa-trash" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEPRECIAÇÃO */}
      {tab === 'dep' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Projeção linear baseada em vida útil de {p.bem.vidaUtil || 60} meses.
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, padding: '8px 0', borderBottom: '1px solid var(--surface-border)' }}>
            {dep.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt.currency(d.valor, p.bem.moeda || 'BRL')}</div>
                <div style={{ width: '100%', height: `${(d.valor / maxV) * 160}px`, background: 'linear-gradient(to top, var(--brand), var(--brand-glow, var(--brand)))', borderRadius: '4px 4px 0 0', minHeight: 2 }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ano {d.ano}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}
