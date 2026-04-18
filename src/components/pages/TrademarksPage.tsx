'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Trademark, Empresa } from '@/types'

const STATUS_MAP: Record<string, { color: string; bg: string; icon: string }> = {
  'Registro em vigor':                { color: '#16a34a', bg: 'rgba(22,163,74,.12)',   icon: 'fa-shield-halved'    },
  'Aguardando exame de mérito':       { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: 'fa-magnifying-glass' },
  'Publicado para oposição':          { color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  icon: 'fa-bullhorn'         },
  'Oposição apresentada':             { color: '#f97316', bg: 'rgba(249,115,22,.12)',  icon: 'fa-gavel'            },
  'Aguardando recurso / Em recurso':  { color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', icon: 'fa-rotate'           },
  'Sobrestado':                       { color: '#06b6d4', bg: 'rgba(6,182,212,.12)',   icon: 'fa-pause-circle'     },
  'Indeferido':                       { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: 'fa-ban'              },
  'Arquivado / Abandonado':           { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: 'fa-archive'          },
  'Caducado':                         { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: 'fa-hourglass-end'    },
  'Renovado':                         { color: '#16a34a', bg: 'rgba(22,163,74,.12)',   icon: 'fa-rotate'           },
}

const ALL_STATUSES = Object.keys(STATUS_MAP)

const EMPTY: Partial<Trademark> = {
  nome: '', numero: '', classe: '', jurisdicao: 'BR', status: 'Aguardando exame de mérito',
  dataDeposito: '', dataVencimento: '', notas: '',
}

export function TrademarksPage() {
  const { lang, toast } = useApp()
  const [rows, setRows] = useState<Trademark[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Trademark>>(EMPTY)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const load = useCallback(async () => {
    const [tm, emps] = await Promise.all([db.trademarks.toArray(), db.empresas.toArray()])
    setRows(tm); setEmpresas(emps)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  const filtered = rows.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.numero?.toLowerCase().includes(search.toLowerCase()) || r.classe?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome da marca obrigatório.', 'error'); return }
    try {
      if (form.id) await db.trademarks.update(form.id, form)
      else await db.trademarks.add(form as Trademark)
      await db.auditLog.add({ acao: `Marca ${form.id ? 'atualizada' : 'cadastrada'}: ${form.nome}`, modulo: 'Trademarks', timestamp: new Date().toISOString() })
      toast('Salvo com sucesso!', 'success'); setModal(false); setForm(EMPTY); load()
    } catch { toast('Erro ao salvar.', 'error') }
  }

  async function handleDelete(id: number) {
    try {
      await db.trademarks.delete(id)
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  function statusInfo(s?: string) {
    return STATUS_MAP[s || ''] || { color: 'var(--text-muted)', bg: 'var(--surface-hover)', icon: 'fa-circle-question' }
  }

  const ativos = rows.filter(r => r.status === 'Registro em vigor' || r.status === 'Renovado').length
  const pendentes = rows.filter(r => r.status?.includes('Aguardando') || r.status?.includes('Publicado') || r.status === 'Sobrestado').length
  const vencendo = rows.filter(r => r.dataVencimento && r.dataVencimento > today && r.dataVencimento <= in90).length

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Trademarks & Marcas</div>
          <div className="page-header-sub">{rows.length} marca{rows.length !== 1 ? 's' : ''} registrada{rows.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setGuideOpen(!guideOpen)}>
            <i className="fas fa-circle-info" />Guia INPI
          </button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>
            <i className="fas fa-plus" />Nova Marca
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Registros ativos', val: ativos, color: 'var(--green)', bg: 'rgba(22,163,74,.12)', icon: 'fa-shield-halved' },
          { label: 'Em andamento', val: pendentes, color: 'var(--yellow)', bg: 'rgba(245,158,11,.12)', icon: 'fa-hourglass-half' },
          { label: 'Vencendo em 90d', val: vencendo, color: 'var(--orange)', bg: 'rgba(249,115,22,.12)', icon: 'fa-clock' },
          { label: 'Total', val: rows.length, color: 'var(--brand)', bg: 'var(--brand-dim)', icon: 'fa-registered' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fas ${k.icon}`} style={{ fontSize: 15, color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* INPI Guide */}
      {guideOpen && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-circle-info" style={{ color: 'var(--brand)' }} />Guia de Status INPI
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 8 }}>
            {ALL_STATUSES.map(s => {
              const info = STATUS_MAP[s]
              return (
                <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-hover)', borderRadius: 8, padding: '10px 12px' }}>
                  <i className={`fas ${info.icon}`} style={{ color: info.color, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: info.color }}>{s}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <i className="fas fa-search" />
            <input placeholder="Buscar marca, número, classe..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 240 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || filterStatus) && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>
              <i className="fas fa-xmark" />Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Marca</th><th>Empresa</th><th>Número</th><th>Classe(s)</th><th>Jurisdição</th><th>Status</th><th>Depósito</th><th>Vencimento</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state"><i className="fas fa-registered" /><p>Nenhuma marca encontrada.</p></div></td></tr>}
              {filtered.map(r => {
                const info = statusInfo(r.status)
                const emp = empresas.find(e => e.id === r.empresaId)
                const isExpiring = r.dataVencimento && r.dataVencimento > today && r.dataVencimento <= in90
                const isExpired = r.dataVencimento && r.dataVencimento < today
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nome}</div>
                      {r.notas && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.notas.slice(0, 60)}{r.notas.length > 60 ? '…' : ''}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.numero || '—'}</span></td>
                    <td style={{ fontSize: 12 }}>{r.classe || '—'}</td>
                    <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{r.jurisdicao || 'BR'}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: info.color, fontWeight: 600, background: info.bg, borderRadius: 6, padding: '3px 8px' }}>
                        <i className={`fas ${info.icon}`} style={{ fontSize: 10 }} />{r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.dataDeposito ? fmt.date(r.dataDeposito, lang) : '—'}</td>
                    <td style={{ fontSize: 12, color: isExpired ? 'var(--red)' : isExpiring ? 'var(--yellow)' : 'var(--text-secondary)', fontWeight: (isExpired || isExpiring) ? 700 : 400 }}>
                      {r.dataVencimento ? fmt.date(r.dataVencimento, lang) : '—'}
                      {isExpired && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
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
        <Modal title={form.id ? 'Editar Marca' : 'Nova Marca'} onClose={() => { setModal(false); setForm(EMPTY) }} large
          footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome da Marca *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: MERIDIAN" />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <select className="form-select" value={form.empresaId || ''} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">Nenhuma</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número do Pedido</label>
              <input className="form-input" value={form.numero || ''} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 921234567" />
            </div>
            <div className="form-group">
              <label className="form-label">Classe(s) NICE</label>
              <input className="form-input" value={form.classe || ''} onChange={e => setForm(f => ({ ...f, classe: e.target.value }))} placeholder="Ex: 36, 45" />
            </div>
            <div className="form-group">
              <label className="form-label">Jurisdição</label>
              <select className="form-select" value={form.jurisdicao || 'BR'} onChange={e => setForm(f => ({ ...f, jurisdicao: e.target.value }))}>
                {['BR', 'US', 'EU', 'Internacional'].map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status || ''} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data de Depósito</label>
              <input className="form-input" type="date" value={form.dataDeposito || ''} onChange={e => setForm(f => ({ ...f, dataDeposito: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Vencimento</label>
              <input className="form-input" type="date" value={form.dataVencimento || ''} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" rows={2} value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir esta marca?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
