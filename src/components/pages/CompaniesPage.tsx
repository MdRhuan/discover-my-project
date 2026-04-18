'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Empresa } from '@/types'

const EMPTY_EMPRESA: Partial<Empresa> = {
  nome: '', pais: 'BR', cnpj: '', ein: '', status: 'ativo',
  cidade: '', estado: '', website: '', legalType: '', taxRegime: '',
  fundacao: '', setor: '', notas: '',
}

export function CompaniesPage() {
  const { t, lang, toast } = useApp()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterPais, setFilterPais] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Empresa>>(EMPTY_EMPRESA)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Empresa | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setEmpresas(await db.empresas.toArray())
  }

  async function save() {
    if (!form.nome?.trim()) { toast('Nome é obrigatório.', 'error'); return }
    try {
      if (editing) {
        await db.empresas.update(editing, form)
        await db.auditLog.add({ acao: `Empresa editada: ${form.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
        toast(t.saved)
      } else {
        await db.empresas.add(form as Empresa)
        await db.auditLog.add({ acao: `Empresa criada: ${form.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
        toast(t.saved)
      }
      setModal(false); setForm(EMPTY_EMPRESA); setEditing(null)
      load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    try {
      const e = empresas.find(x => x.id === id)
      await db.empresas.delete(id)
      await db.auditLog.add({ acao: `Empresa excluída: ${e?.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
      toast(t.deleted); setConfirmId(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  function openEdit(e: Empresa) {
    setForm({ ...e }); setEditing(e.id!); setModal(true)
  }
  function openNew() {
    setForm(EMPTY_EMPRESA); setEditing(null); setModal(true)
  }

  const filtered = empresas.filter(e => {
    const matchPais = filterPais === 'all' || e.pais === filterPais
    const matchSearch = !search || e.nome.toLowerCase().includes(search.toLowerCase()) ||
      (e.cnpj || '').includes(search) || (e.ein || '').includes(search)
    return matchPais && matchSearch
  })

  const statusBadge = (s: string) => {
    const sl = s?.toLowerCase() || ''
    if (sl.includes('ativ') || sl === 'active') return 'badge-green'
    if (sl.includes('inativ') || sl === 'inactive') return 'badge-gray'
    return 'badge-brand'
  }

  const countryCounts = { BR: empresas.filter(e => e.pais === 'BR').length, US: empresas.filter(e => e.pais === 'US').length }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.companies}</div>
          <div className="page-header-sub">{empresas.length} empresas no portfólio</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fas fa-plus" />{t.newCompany}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: empresas.length, icon: 'fa-building', color: 'var(--brand)' },
          { label: 'Ativas', value: empresas.filter(e => ['ativo','ativa'].includes((e.status||'').toLowerCase())).length, icon: 'fa-circle-check', color: 'var(--green)' },
          { label: 'Brasil', value: countryCounts.BR, icon: 'fa-flag', color: 'var(--brand)' },
          { label: 'EUA', value: countryCounts.US, icon: 'fa-flag', color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
            <i className="fas" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: s.color, opacity: .35 }}>{/* icon */}</i>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 300 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <div className="tabs">
          {[['all','Todas'],['BR','Brasil'],['US','EUA']].map(([v,l]) => (
            <button key={v} className={`tab ${filterPais === v ? 'active' : ''}`} onClick={() => setFilterPais(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th><th>País</th><th>CNPJ / EIN</th>
                <th>Tipo Jurídico</th><th>Setor</th><th>Status</th><th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-building" /><p>{t.noRecords}</p></div></td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: e.pais === 'US' ? 'rgba(59,130,246,.15)' : 'var(--brand-dim)', color: e.pais === 'US' ? 'var(--blue)' : 'var(--brand)', fontSize: 11 }}>
                        {e.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.cidade}{e.estado ? `, ${e.estado}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${e.pais === 'BR' ? 'badge-brand' : 'badge-blue'}`}>{e.pais === 'BR' ? '🇧🇷 BR' : '🇺🇸 US'}</span></td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.pais === 'BR' ? e.cnpj || '—' : e.ein || '—'}</td>
                  <td style={{ fontSize: 12 }}>{e.legalType || '—'}</td>
                  <td style={{ fontSize: 12 }}>{e.setor || '—'}</td>
                  <td><span className={`badge ${statusBadge(e.status)}`}>{e.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => setDetail(e)} title="Ver detalhes"><i className="fas fa-eye" /></button>
                      <button className="btn-icon" onClick={() => openEdit(e)} title={t.edit}><i className="fas fa-pen" /></button>
                      <button className="btn-icon danger" onClick={() => setConfirmId(e.id!)} title={t.delete}><i className="fas fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New Modal */}
      {modal && (
        <Modal
          title={editing ? 'Editar Empresa' : t.newCompany}
          onClose={() => { setModal(false); setForm(EMPTY_EMPRESA); setEditing(null) }}
          large
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setForm(EMPTY_EMPRESA); setEditing(null) }}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />{t.save}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Razão Social *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <select className="form-select" value={form.pais || 'BR'} onChange={e => setForm(p => ({ ...p, pais: e.target.value as 'BR' | 'US' }))}>
                <option value="BR">🇧🇷 Brasil</option>
                <option value="US">🇺🇸 EUA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {['ativo','inativo','em liquidação','holding'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {form.pais === 'BR' ? (
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input className="form-input" value={form.cnpj || ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">EIN</label>
                <input className="form-input" value={form.ein || ''} onChange={e => setForm(p => ({ ...p, ein: e.target.value }))} placeholder="00-0000000" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tipo Jurídico</label>
              <select className="form-select" value={form.legalType || ''} onChange={e => setForm(p => ({ ...p, legalType: e.target.value }))}>
                <option value="">Selecione...</option>
                {form.pais === 'BR'
                  ? ['Ltda','S.A.','MEI','EIRELI','SCP','Fundação'].map(s => <option key={s} value={s}>{s}</option>)
                  : ['LLC','Corporation','S-Corp','C-Corp','Partnership','Trust'].map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Regime Tributário</label>
              <select className="form-select" value={form.taxRegime || ''} onChange={e => setForm(p => ({ ...p, taxRegime: e.target.value }))}>
                <option value="">Selecione...</option>
                {form.pais === 'BR'
                  ? ['Simples Nacional','Lucro Presumido','Lucro Real','MEI'].map(s => <option key={s} value={s}>{s}</option>)
                  : ['C-Corp','S-Corp','Pass-Through','Disregarded Entity'].map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" value={form.cidade || ''} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <input className="form-input" value={form.estado || ''} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Setor</label>
              <input className="form-input" value={form.setor || ''} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} placeholder="Tecnologia, Imóveis..." />
            </div>
            <div className="form-group">
              <label className="form-label">Fundação</label>
              <input className="form-input" type="date" value={form.fundacao || ''} onChange={e => setForm(p => ({ ...p, fundacao: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" value={form.notas || ''} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.nome} onClose={() => setDetail(null)} large>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['País', detail.pais === 'BR' ? '🇧🇷 Brasil' : '🇺🇸 EUA'],
              ['Status', detail.status],
              [detail.pais === 'BR' ? 'CNPJ' : 'EIN', detail.pais === 'BR' ? detail.cnpj || '—' : detail.ein || '—'],
              ['Tipo Jurídico', detail.legalType || '—'],
              ['Regime Tributário', detail.taxRegime || '—'],
              ['Setor', detail.setor || '—'],
              ['Cidade/Estado', `${detail.cidade || '—'}${detail.estado ? ', '+detail.estado : ''}`],
              ['Fundação', fmt.date(detail.fundacao, lang)],
              ['Website', detail.website || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
            {detail.notas && (
              <div style={{ gridColumn: '1/-1', padding: '8px 0' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Observações</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.notas}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmId && (
        <ConfirmDialog
          msg={t.deleteConfirm}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
