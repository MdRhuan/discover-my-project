'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Documento, Empresa } from '@/types'

const CATS = ['Constituição','Financeiro','Legal','Tax','Licenças','Contratos','RH','Compliance','Outros']

export function DocumentsPage() {
  const { t, lang, toast } = useApp()
  const [docs, setDocs] = useState<Documento[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState<number | 'all'>('all')
  const [filterCat, setFilterCat] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Documento>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [d, e] = await Promise.all([db.documentos.toArray(), db.empresas.toArray()])
    setDocs(d); setEmpresas(e)
  }

  async function save() {
    if (!form.nome?.trim()) { toast('Nome é obrigatório.', 'error'); return }
    try {
      if (editing) {
        await db.documentos.update(editing, form)
      } else {
        await db.documentos.add({ ...form, dataUpload: form.dataUpload || new Date().toISOString().slice(0, 10) } as Documento)
        await db.auditLog.add({ acao: `Documento adicionado: ${form.nome}`, modulo: 'Documentos', timestamp: new Date().toISOString() })
      }
      toast(t.saved); setModal(false); setForm({}); setEditing(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    await db.documentos.delete(id)
    toast(t.deleted); setConfirmId(null); load()
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = docs.filter(d => {
    const matchEmp = filterEmpresa === 'all' || d.empresaId === filterEmpresa
    const matchCat = filterCat === 'all' || d.categoria === filterCat
    const matchSearch = !search || d.nome.toLowerCase().includes(search.toLowerCase()) || (d.categoria || '').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchCat && matchSearch
  })

  const vencBadge = (v?: string) => {
    if (!v) return null
    if (v < today) return <span className="badge badge-red" style={{ fontSize: 10 }}>Vencido</span>
    if (v <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)) return <span className="badge badge-yellow" style={{ fontSize: 10 }}>Vence em breve</span>
    return <span className="badge badge-green" style={{ fontSize: 10 }}>Válido</span>
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.documents}</div>
          <div className="page-header-sub">{docs.length} documentos</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setEditing(null); setModal(true) }}>
          <i className="fas fa-plus" />{t.newDocument}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 280 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{t.allCompanies}</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 150 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Todas categorias</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Documento</th><th>Empresa</th><th>Categoria</th><th>Versão</th><th>Upload</th><th>Vencimento</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-file" /><p>{t.noRecords}</p></div></td></tr>}
              {filtered.map(d => {
                const emp = empresas.find(e => e.id === d.empresaId)
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`fas ${d.tipo === 'PDF' ? 'fa-file-pdf' : d.tipo === 'XLSX' ? 'fa-file-excel' : 'fa-file'}`} style={{ color: d.tipo === 'PDF' ? 'var(--red)' : d.tipo === 'XLSX' ? 'var(--green)' : 'var(--brand)', fontSize: 18, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.nome}</div>
                          {d.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.descricao}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                    <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{d.categoria}</span></td>
                    <td style={{ fontSize: 12 }}>v{d.versao || '1'}</td>
                    <td style={{ fontSize: 12 }}>{fmt.date(d.dataUpload, lang)}</td>
                    <td>{vencBadge(d.vencimento)} <span style={{ fontSize: 11, marginLeft: 4 }}>{d.vencimento ? fmt.date(d.vencimento, lang) : '—'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => { setForm({ ...d }); setEditing(d.id!); setModal(true) }}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(d.id!)}><i className="fas fa-trash" /></button>
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
        <Modal
          title={editing ? 'Editar Documento' : t.newDocument}
          onClose={() => { setModal(false); setForm({}); setEditing(null) }}
          large
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setForm({}) }}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />{t.save}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome do Documento *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <select className="form-select" value={form.empresaId || ''} onChange={e => setForm(p => ({ ...p, empresaId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">Nenhuma (pessoal)</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria || ''} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                <option value="">Selecione...</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo || 'PDF'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {['PDF','DOCX','XLSX','TXT','IMG','Outro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Versão</label>
              <input className="form-input" value={form.versao || ''} onChange={e => setForm(p => ({ ...p, versao: e.target.value }))} placeholder="1" />
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
