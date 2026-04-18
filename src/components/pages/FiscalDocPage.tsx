'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { FiscalDoc } from '@/types'

interface FiscalDocPageProps {
  title: string
  subcats: { key: string; icon: string; color: string; label: string }[]
  defaultSubcat?: string
  defaultJurisdiction?: string
  infoCard?: React.ReactNode
  showJurisdiction?: boolean
}

const ANOS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026']

const COLOR_VAR: Record<string, string> = {
  brand: 'var(--brand)', blue: 'var(--blue)', green: 'var(--green)',
  yellow: 'var(--yellow)', red: 'var(--red)', orange: 'var(--orange)',
}
const COLOR_BG: Record<string, string> = {
  brand: 'var(--brand-dim)', blue: 'rgba(59,130,246,.12)', green: 'rgba(34,197,94,.12)',
  yellow: 'rgba(245,158,11,.12)', red: 'rgba(239,68,68,.12)', orange: 'rgba(249,115,22,.12)',
}

const STATUS_MAP: Record<string, { badge: string; label: string }> = {
  ativo:    { badge: 'brand',  label: 'Ativo'    },
  entregue: { badge: 'green',  label: 'Entregue' },
  pendente: { badge: 'yellow', label: 'Pendente' },
  vencido:  { badge: 'red',    label: 'Vencido'  },
}

export function FiscalDocPage({ title, subcats, defaultSubcat, defaultJurisdiction, infoCard, showJurisdiction = true }: FiscalDocPageProps) {
  const { lang, toast } = useApp()
  const [rows, setRows] = useState<FiscalDoc[]>([])
  const [search, setSearch] = useState('')
  const [filterSub, setFilterSub] = useState('')
  const [filterJur, setFilterJur] = useState('')
  const [filterAno, setFilterAno] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<FiscalDoc>>({})
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const subcatKeys = subcats.map(s => s.key)

  const load = useCallback(async () => {
    const all = await db.fiscalDocs.toArray()
    setRows(all.filter((r: FiscalDoc) => subcatKeys.includes(r.subcategoria)))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r =>
    (!filterSub || r.subcategoria === filterSub) &&
    (!filterJur || r.jurisdicao === filterJur) &&
    (!filterAno || String(r.ano) === filterAno) &&
    (!search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase()))
  )

  const today = new Date().toISOString().slice(0, 10)
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  function openNew() {
    setForm({
      subcategoria: filterSub || defaultSubcat || subcats[0]?.key || '',
      jurisdicao: defaultJurisdiction || 'US',
      tipo: 'PDF', status: 'ativo',
      ano: new Date().getFullYear().toString(),
      dataUpload: new Date().toISOString().slice(0, 10),
    })
    setModal(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setForm(f => ({
        ...f,
        nome: f.nome || file.name,
        tamanho: file.size / 1024 > 1024 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB',
        tipo: file.name.split('.').pop()?.toUpperCase() || 'PDF',
        conteudo: ev.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleDownload(r: FiscalDoc) {
    if (!r.conteudo) { toast('Arquivo não disponível.', 'error'); return }
    const a = document.createElement('a')
    a.href = r.conteudo
    a.download = r.nome || 'documento'
    a.click()
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return }
    try {
      if (form.id) await db.fiscalDocs.update(form.id, form)
      else await db.fiscalDocs.add(form as FiscalDoc)
      await db.auditLog.add({ acao: `Doc ${form.id ? 'atualizado' : 'adicionado'}: ${form.nome}`, modulo: title, timestamp: new Date().toISOString() })
      toast('Salvo com sucesso!', 'success'); setModal(false); load()
    } catch { toast('Erro ao salvar.', 'error') }
  }

  async function handleDelete(id: number) {
    try {
      await db.fiscalDocs.delete(id)
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{title}</div>
          <div className="page-header-sub">{rows.length} documento{rows.length !== 1 ? 's' : ''} no repositório</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus" />Novo Documento</button>
      </div>

      {infoCard}

      {/* Subcategory cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 24 }}>
        {subcats.map(s => {
          const count = rows.filter(r => r.subcategoria === s.key).length
          const pending = rows.filter(r => r.subcategoria === s.key && r.status === 'pendente').length
          return (
            <button key={s.key} onClick={() => setFilterSub(filterSub === s.key ? '' : s.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: filterSub === s.key ? 'var(--surface-hover)' : 'var(--surface-card)', border: `1px solid ${filterSub === s.key ? 'var(--brand)' : 'var(--surface-border)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_BG[s.color] }}>
                <i className={`fas ${s.icon}`} style={{ fontSize: 15, color: COLOR_VAR[s.color] }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {count} doc{count !== 1 ? 's' : ''}
                  {pending > 0 && <span style={{ color: 'var(--yellow)', marginLeft: 6 }}><i className="fas fa-clock" style={{ fontSize: 9 }} /> {pending} pend.</span>}
                </div>
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
          {subcats.length > 1 && (
            <select className="form-select" style={{ maxWidth: 220 }} value={filterSub} onChange={e => setFilterSub(e.target.value)}>
              <option value="">Todas as categorias</option>
              {subcats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}
          {showJurisdiction && (
            <select className="form-select" style={{ maxWidth: 140 }} value={filterJur} onChange={e => setFilterJur(e.target.value)}>
              <option value="">Jurisdição</option>
              {['US', 'BR', 'BR/US'].map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          )}
          <select className="form-select" style={{ maxWidth: 130 }} value={filterAno} onChange={e => setFilterAno(e.target.value)}>
            <option value="">Todos os anos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(search || filterSub || filterJur || filterAno) && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterSub(''); setFilterJur(''); setFilterAno('') }}>
              <i className="fas fa-xmark" />Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                {showJurisdiction && <th>Jurisdição</th>}
                <th>Ano</th>
                <th>Status</th>
                <th>Upload</th>
                <th>Vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={showJurisdiction ? 8 : 7}><div className="empty-state"><i className="fas fa-folder-open" /><p>Nenhum documento encontrado.</p></div></td></tr>}
              {filtered.map(r => {
                const sub = subcats.find(s => s.key === r.subcategoria)
                const st = STATUS_MAP[r.status || 'ativo']
                const isExpiring = r.vencimento && r.vencimento > today && r.vencimento <= in60
                const isExpired = r.vencimento && r.vencimento < today
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nome}</div>
                      {r.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.descricao}</div>}
                      {r.responsavel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.responsavel}</div>}
                    </td>
                    <td>
                      {sub && (
                        <span style={{ fontSize: 11, color: COLOR_VAR[sub.color], fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className={`fas ${sub.icon}`} style={{ fontSize: 10 }} />{sub.label}
                        </span>
                      )}
                    </td>
                    {showJurisdiction && <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{r.jurisdicao || '—'}</span></td>}
                    <td style={{ fontSize: 12 }}>{r.ano || '—'}</td>
                    <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.dataUpload ? fmt.date(r.dataUpload, lang) : '—'}</td>
                    <td style={{ fontSize: 12, color: isExpired ? 'var(--red)' : isExpiring ? 'var(--yellow)' : 'var(--text-secondary)', fontWeight: (isExpired || isExpiring) ? 700 : 400 }}>
                      {r.vencimento ? fmt.date(r.vencimento, lang) : '—'}
                      {isExpired && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠ Vencido</span>}
                      {isExpiring && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠ Vence em breve</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.conteudo && (
                          <button className="btn-icon" title="Download" onClick={() => handleDownload(r)}><i className="fas fa-download" /></button>
                        )}
                        <button className="btn-icon" onClick={() => { setForm({ ...r }); setModal(true) }}><i className="fas fa-pen" /></button>
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

      {modal && (
        <Modal title={form.id ? 'Editar Documento' : 'Novo Documento'} onClose={() => setModal(false)} large
          footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome do documento *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Form 1040 — 2024" />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.subcategoria || ''} onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}>
                {subcats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            {showJurisdiction && (
              <div className="form-group">
                <label className="form-label">Jurisdição</label>
                <select className="form-select" value={form.jurisdicao || 'US'} onChange={e => setForm(f => ({ ...f, jurisdicao: e.target.value }))}>
                  {['US', 'BR', 'BR/US'].map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Ano</label>
              <select className="form-select" value={form.ano || ''} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <input className="form-input" value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
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
              <textarea className="form-textarea" rows={2} value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Observações..." />
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
      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir este documento?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
