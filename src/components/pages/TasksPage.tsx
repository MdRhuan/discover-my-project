'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Task, Empresa } from '@/types'

const EMPTY: Partial<Task> = { titulo: '', descricao: '', prioridade: 'media', status: 'pendente', responsavel: '', categoria: '', vencimento: '' }

export function TasksPage() {
  const { t, lang, toast } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Task>>(EMPTY)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [tk, e] = await Promise.all([db.tasks.toArray(), db.empresas.toArray()])
    setTasks(tk); setEmpresas(e)
  }

  async function save() {
    if (!form.titulo?.trim()) { toast('Título é obrigatório.', 'error'); return }
    try {
      if (editing) {
        await db.tasks.update(editing, form)
      } else {
        await db.tasks.add(form as Task)
        await db.auditLog.add({ acao: `Task criada: ${form.titulo}`, modulo: 'Tasks', timestamp: new Date().toISOString() })
      }
      toast(t.saved); setModal(false); setForm(EMPTY); setEditing(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    await db.tasks.delete(id); toast(t.deleted); setConfirmId(null); load()
  }

  async function toggleStatus(tk: Task) {
    const next = tk.status === 'concluida' ? 'pendente' : tk.status === 'pendente' ? 'em-andamento' : 'concluida'
    await db.tasks.update(tk.id!, { status: next })
    setTasks(prev => prev.map(t => t.id === tk.id ? { ...t, status: next } : t))
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = tasks.filter(tk => {
    const matchStatus = filterStatus === 'all' || tk.status === filterStatus
    const matchSearch = !search || tk.titulo.toLowerCase().includes(search.toLowerCase()) || (tk.responsavel || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  }).sort((a, b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999'))

  const PRIO: Record<string, { badge: string; label: string }> = {
    alta: { badge: 'red', label: 'Alta' }, media: { badge: 'yellow', label: 'Média' }, baixa: { badge: 'green', label: 'Baixa' }
  }
  const STATUS: Record<string, { badge: string; label: string }> = {
    pendente: { badge: 'yellow', label: 'Pendente' }, 'em-andamento': { badge: 'blue', label: 'Em andamento' }, concluida: { badge: 'green', label: 'Concluída' }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Tasks & Deadlines</div>
          <div className="page-header-sub">{tasks.filter(tk => tk.status !== 'concluida').length} abertas</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditing(null); setModal(true) }}>
          <i className="fas fa-plus" />Nova Task
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Vencidas', count: tasks.filter(tk => tk.status !== 'concluida' && tk.vencimento && tk.vencimento < today).length, color: 'var(--red)', icon: 'fa-triangle-exclamation' },
          { label: 'Pendentes', count: tasks.filter(tk => tk.status === 'pendente').length, color: 'var(--yellow)', icon: 'fa-clock' },
          { label: 'Em andamento', count: tasks.filter(tk => tk.status === 'em-andamento').length, color: 'var(--brand)', icon: 'fa-spinner' },
          { label: 'Concluídas', count: tasks.filter(tk => tk.status === 'concluida').length, color: 'var(--green)', icon: 'fa-check-circle' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 10, padding: '10px 18px' }}>
            <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 280 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
        </div>
        <div className="tabs">
          {[['all','Todas'],['pendente','Pendentes'],['em-andamento','Em andamento'],['concluida','Concluídas']].map(([v,l]) => (
            <button key={v} className={`tab ${filterStatus === v ? 'active' : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Tarefa</th><th>Empresa</th><th>Responsável</th><th>Categoria</th><th>Vencimento</th><th>Prioridade</th><th>Status</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state"><i className="fas fa-list-check" /><p>{t.noRecords}</p></div></td></tr>}
              {filtered.map(tk => {
                const emp = empresas.find(e => e.id === tk.empresaId)
                const prio = PRIO[tk.prioridade] || { badge: 'brand', label: tk.prioridade }
                const st = STATUS[tk.status] || { badge: 'brand', label: tk.status }
                const isOverdue = tk.status !== 'concluida' && tk.vencimento && tk.vencimento < today
                return (
                  <tr key={tk.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: isOverdue ? 'var(--red)' : 'var(--text-primary)' }}>{tk.titulo}</div>
                      {tk.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tk.descricao}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                    <td style={{ fontSize: 12 }}>{tk.responsavel || '—'}</td>
                    <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{tk.categoria || '—'}</span></td>
                    <td style={{ color: isOverdue ? 'var(--red)' : 'var(--text-secondary)', fontWeight: isOverdue ? 700 : 400, fontSize: 12 }}>
                      {tk.vencimento ? fmt.date(tk.vencimento, lang) : '—'}
                      {isOverdue && <span style={{ marginLeft: 6, fontSize: 10 }}>⚠ Vencida</span>}
                    </td>
                    <td><span className={`badge badge-${prio.badge}`}>{prio.label}</span></td>
                    <td>
                      <button onClick={() => toggleStatus(tk)} className={`badge badge-${st.badge}`} style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>
                        {st.label}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => { setForm({ ...tk }); setEditing(tk.id!); setModal(true) }}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(tk.id!)}><i className="fas fa-trash" /></button>
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
          title={editing ? 'Editar Task' : 'Nova Task'}
          onClose={() => { setModal(false); setForm(EMPTY); setEditing(null) }}
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
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <select className="form-select" value={form.empresaId || ''} onChange={e => setForm(p => ({ ...p, empresaId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">Nenhuma</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <input className="form-input" value={form.responsavel || ''} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-select" value={form.prioridade || 'media'} onChange={e => setForm(p => ({ ...p, prioridade: e.target.value as Task['prioridade'] }))}>
                <option value="alta">🔴 Alta</option><option value="media">🟡 Média</option><option value="baixa">🟢 Baixa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'pendente'} onChange={e => setForm(p => ({ ...p, status: e.target.value as Task['status'] }))}>
                <option value="pendente">Pendente</option><option value="em-andamento">Em andamento</option><option value="concluida">Concluída</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.vencimento || ''} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria || ''} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                <option value="">Selecione...</option>
                {['Fiscal','Jurídico','Compliance','Licenças','Financeiro','RH','TI','Gestão','Outros'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
