'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Funcionario, Empresa } from '@/types'

const EMPTY: Partial<Funcionario> = {
  empresaId: undefined, nome: '', cargo: '', departamento: '',
  salario: 0, moedaSalario: 'BRL', status: 'ativo',
  admissao: '', email: '', telefone: '', documento: '', pais: 'BR',
}

export function EmployeesPage() {
  const { t, lang, toast } = useApp()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState<number | 'all'>('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Funcionario>>(EMPTY)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [f, e] = await Promise.all([db.funcionarios.toArray(), db.empresas.toArray()])
    setFuncionarios(f); setEmpresas(e)
  }

  async function save() {
    if (!form.nome?.trim()) { toast('Nome é obrigatório.', 'error'); return }
    if (!form.empresaId) { toast('Selecione uma empresa.', 'error'); return }
    try {
      if (editing) {
        await db.funcionarios.update(editing, form)
        toast(t.saved)
      } else {
        await db.funcionarios.add(form as Funcionario)
        await db.auditLog.add({ acao: `Funcionário adicionado: ${form.nome}`, modulo: 'Funcionários', timestamp: new Date().toISOString() })
        toast(t.saved)
      }
      setModal(false); setForm(EMPTY); setEditing(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    await db.funcionarios.delete(id)
    toast(t.deleted); setConfirmId(null); load()
  }

  function openEdit(f: Funcionario) { setForm({ ...f }); setEditing(f.id!); setModal(true) }
  function openNew() { setForm({ ...EMPTY, empresaId: typeof filterEmpresa === 'number' ? filterEmpresa : undefined }); setEditing(null); setModal(true) }

  const filtered = funcionarios.filter(f => {
    const matchEmp = filterEmpresa === 'all' || f.empresaId === filterEmpresa
    const matchSearch = !search || f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.cargo || '').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchSearch
  })

  const avatarColor = (nome: string) => {
    const colors = ['#6470f1','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6']
    let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
    return colors[Math.abs(h) % colors.length]
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.employees}</div>
          <div className="page-header-sub">{funcionarios.length} funcionários cadastrados</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus" />{t.newEmployee}</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 300 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{t.allCompanies}</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Funcionário</th><th>Empresa</th><th>Cargo</th><th>Depto</th><th>Salário</th><th>Status</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-users" /><p>{t.noRecords}</p></div></td></tr>}
              {filtered.map(f => {
                const emp = empresas.find(e => e.id === f.empresaId)
                return (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: avatarColor(f.nome) + '22', color: avatarColor(f.nome), fontSize: 11 }}>
                          {f.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.nome}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                    <td style={{ fontSize: 12 }}>{f.cargo}</td>
                    <td style={{ fontSize: 12 }}>{f.departamento || '—'}</td>
                    <td style={{ fontSize: 12 }}>{f.salario ? fmt.currency(f.salario, f.moedaSalario || 'BRL') : '—'}</td>
                    <td><span className={`badge ${f.status === 'ativo' ? 'badge-green' : 'badge-gray'}`}>{f.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(f)}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(f.id!)}><i className="fas fa-trash" /></button>
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
          title={editing ? 'Editar Funcionário' : t.newEmployee}
          onClose={() => { setModal(false); setForm(EMPTY); setEditing(null) }}
          large
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setForm(EMPTY); setEditing(null) }}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />{t.save}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa *</label>
              <select className="form-select" value={form.empresaId || ''} onChange={e => setForm(p => ({ ...p, empresaId: Number(e.target.value) }))}>
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <select className="form-select" value={form.pais || 'BR'} onChange={e => setForm(p => ({ ...p, pais: e.target.value, moedaSalario: e.target.value === 'US' ? 'USD' : 'BRL' }))}>
                <option value="BR">🇧🇷 Brasil</option>
                <option value="US">🇺🇸 EUA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cargo</label>
              <input className="form-input" value={form.cargo || ''} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={form.departamento || ''} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Salário</label>
              <input className="form-input" type="number" value={form.salario || ''} onChange={e => setForm(p => ({ ...p, salario: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Moeda</label>
              <select className="form-select" value={form.moedaSalario || 'BRL'} onChange={e => setForm(p => ({ ...p, moedaSalario: e.target.value }))}>
                <option value="BRL">BRL</option><option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone || ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{form.pais === 'BR' ? 'CPF' : 'SSN'}</label>
              <input className="form-input" value={form.documento || ''} onChange={e => setForm(p => ({ ...p, documento: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Admissão</label>
              <input className="form-input" type="date" value={form.admissao || ''} onChange={e => setForm(p => ({ ...p, admissao: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {confirmId && <ConfirmDialog msg={t.deleteConfirm} onConfirm={() => remove(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
