'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { DocPessoal, FiscalDoc } from '@/types'

type DocType = 'personal' | 'fiscal'

interface Props {
  title: string
  subtitle?: string
  docType: DocType
  defaultSubcat?: string
  subcats?: string[]
  icon?: string
}

export function GenericDocPage({ title, subtitle, docType, defaultSubcat = '', subcats = [], icon = 'fa-file' }: Props) {
  const { t, lang, toast } = useApp()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [docs, setDocs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterSubcat, setFilterSubcat] = useState('all')
  const [modal, setModal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const table = docType === 'personal' ? db.docsPessoais : db.fiscalDocs

  useEffect(() => { load() }, [])

  async function load() {
    setDocs(await table.toArray())
  }

  async function save() {
    if (!form.nome?.trim()) { toast('Nome é obrigatório.', 'error'); return }
    try {
      if (editing) {
        await table.update(editing, form)
      } else {
        await table.add({ ...form, subcategoria: form.subcategoria || defaultSubcat, dataUpload: form.dataUpload || new Date().toISOString().slice(0, 10) })
        await db.auditLog.add({ acao: `Documento adicionado: ${form.nome}`, modulo: title, timestamp: new Date().toISOString() })
      }
      toast(t.saved); setModal(false); setForm({}); setEditing(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    await table.delete(id); toast(t.deleted); setConfirmId(null); load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const today30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const filtered = docs.filter(d => {
    const matchSub = filterSubcat === 'all' || d.subcategoria === filterSubcat
    const matchSearch = !search || d.nome?.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  })

  const vencBadge = (v?: string) => {
    if (!v) return <span className="badge badge-gray" style={{ fontSize: 10 }}>Sem vencimento</span>
    if (v < today) return <span className="badge badge-red" style={{ fontSize: 10 }}>Vencido</span>
    if (v <= today30) return <span className="badge badge-yellow" style={{ fontSize: 10 }}>Vence em breve</span>
    return <span className="badge badge-green" style={{ fontSize: 10 }}>Válido</span>
  }

  const allSubcats = subcats.length ? subcats : Array.from(new Set(docs.map(d => d.subcategoria).filter(Boolean)))

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title"><i className={`fas ${icon}`} style={{ marginRight: 10, color: 'var(--brand)' }} />{title}</div>
          {subtitle && <div className="page-header-sub">{subtitle}</div>}
          <div className="page-header-sub">{docs.length} documentos cadastrados</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ subcategoria: defaultSubcat }); setEditing(null); setModal(true) }}>
          <i className="fas fa-plus" />Novo Documento
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 280 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        {allSubcats.length > 0 && (
          <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)}>
            <option value="all">Todas categorias</option>
            {allSubcats.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Subcategoria</th>
                {docType === 'personal' && <th>Pessoa</th>}
                {docType === 'fiscal' && <th>Jurisdição</th>}
                {docType === 'fiscal' && <th>Ano</th>}
                <th>Upload</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state"><i className={`fas ${icon}`} /><p>{t.noRecords}</p></div></td></tr>}
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.nome}</div>
                    {d.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.descricao}</div>}
                  </td>
                  <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{d.subcategoria || '—'}</span></td>
                  {docType === 'personal' && <td style={{ fontSize: 12 }}>{d.pessoa || '—'}</td>}
                  {docType === 'fiscal' && <td style={{ fontSize: 12 }}>{d.jurisdicao || '—'}</td>}
                  {docType === 'fiscal' && <td style={{ fontSize: 12 }}>{d.ano || '—'}</td>}
                  <td style={{ fontSize: 12 }}>{fmt.date(d.dataUpload, lang)}</td>
                  <td>{vencBadge(d.vencimento)}{d.vencimento ? <span style={{ fontSize: 11, marginLeft: 4 }}>{fmt.date(d.vencimento, lang)}</span> : null}</td>
                  <td><span className={`badge ${d.status === 'entregue' ? 'badge-green' : d.status === 'ativo' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>{d.status || 'ativo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => { setForm({ ...d }); setEditing(d.id); setModal(true) }}><i className="fas fa-pen" /></button>
                      <button className="btn-icon danger" onClick={() => setConfirmId(d.id)}><i className="fas fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Documento' : 'Novo Documento'}
          onClose={() => { setModal(false); setForm({}); setEditing(null) }}
          large
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />{t.save}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            {allSubcats.length > 0 && (
              <div className="form-group">
                <label className="form-label">Subcategoria</label>
                <select className="form-select" value={form.subcategoria || ''} onChange={e => setForm(p => ({ ...p, subcategoria: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {allSubcats.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {docType === 'personal' && (
              <div className="form-group">
                <label className="form-label">Pessoa</label>
                <input className="form-input" value={form.pessoa || ''} onChange={e => setForm(p => ({ ...p, pessoa: e.target.value }))} />
              </div>
            )}
            {docType === 'fiscal' && (
              <>
                <div className="form-group">
                  <label className="form-label">Jurisdição</label>
                  <select className="form-select" value={form.jurisdicao || ''} onChange={e => setForm(p => ({ ...p, jurisdicao: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {['BR','US','BR/US'].map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano</label>
                  <input className="form-input" value={form.ano || ''} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} placeholder="2024" />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <input className="form-input" value={form.responsavel || ''} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo || 'PDF'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {['PDF','DOCX','XLSX','TXT','Outro'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {['ativo','entregue','pendente','expirado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data de Upload</label>
              <input className="form-input" type="date" value={form.dataUpload || ''} onChange={e => setForm(p => ({ ...p, dataUpload: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.vencimento || ''} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição</label>
              <textarea className="form-textarea" value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
      {confirmId && <ConfirmDialog msg={t.deleteConfirm} onConfirm={() => remove(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
