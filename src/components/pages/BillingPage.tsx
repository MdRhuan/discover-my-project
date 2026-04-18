'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt, convertVal } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Transacao, Empresa } from '@/types'

const CATS_REV = ['Serviços','Vendas','Aluguel','Dividendos','Consultoria','Outros']
const CATS_EXP = ['Pessoal','Infraestrutura','Marketing','Aluguel','Impostos','Materiais','Outros']

export function BillingPage() {
  const { t, lang, currency, toast } = useApp()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState<number | 'all'>('all')
  const [filterTipo, setFilterTipo] = useState<'all' | 'receita' | 'despesa'>('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Transacao>>({ tipo: 'receita', moeda: 'BRL' })
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const chartRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInst = useRef<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [tx, e] = await Promise.all([db.transacoes.toArray(), db.empresas.toArray()])
    setTransacoes(tx); setEmpresas(e)
  }

  useEffect(() => {
    if (!transacoes.length) return
    buildChart()
    return () => { chartInst.current?.destroy() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacoes, currency])

  function buildChart() {
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {
      const months: string[] = []
      const monthKeys: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        months.push(d.toLocaleString('pt-BR', { month: 'short' }))
        monthKeys.push(d.toISOString().slice(0, 7))
      }
      const txFiltered = filterEmpresa === 'all' ? transacoes : transacoes.filter(tx => tx.empresaId === filterEmpresa)
      const rev = monthKeys.map(m => txFiltered.filter(tx => tx.tipo === 'receita' && tx.data?.startsWith(m)).reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0))
      const exp = monthKeys.map(m => txFiltered.filter(tx => tx.tipo === 'despesa' && tx.data?.startsWith(m)).reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0))

      chartInst.current?.destroy()
      if (chartRef.current) {
        chartInst.current = new Chart(chartRef.current, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: t.revenue, data: rev, backgroundColor: 'rgba(100,112,241,0.7)', borderRadius: 6, borderSkipped: false },
              { label: t.expense, data: exp, backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 6, borderSkipped: false },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8b93a8', font: { size: 12 } } } },
            scales: {
              x: { grid: { color: 'rgba(100,100,100,.1)' }, ticks: { color: '#525d72' } },
              y: { grid: { color: 'rgba(100,100,100,.1)' }, ticks: { color: '#525d72', callback: (v: unknown) => currency + ' ' + Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v as number) } },
            },
          },
        })
      }
    })
  }

  async function save() {
    if (!form.valor || !form.categoria || !form.data) { toast('Preencha todos os campos obrigatórios.', 'error'); return }
    try {
      if (editing) {
        await db.transacoes.update(editing, form)
      } else {
        await db.transacoes.add(form as Transacao)
        await db.auditLog.add({ acao: `Transação adicionada: ${form.tipo} ${fmt.currency(form.valor!, form.moeda || 'BRL')}`, modulo: 'Faturamento', timestamp: new Date().toISOString() })
      }
      toast(t.saved); setModal(false); setForm({ tipo: 'receita', moeda: 'BRL' }); setEditing(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  async function remove(id: number) {
    await db.transacoes.delete(id)
    toast(t.deleted); setConfirmId(null); load()
  }

  const txFiltered = (filterEmpresa === 'all' ? transacoes : transacoes.filter(tx => tx.empresaId === filterEmpresa))
  const totalRev = txFiltered.filter(tx => tx.tipo === 'receita').reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0)
  const totalExp = txFiltered.filter(tx => tx.tipo === 'despesa').reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0)

  const filtered = transacoes.filter(tx => {
    const matchEmp = filterEmpresa === 'all' || tx.empresaId === filterEmpresa
    const matchTipo = filterTipo === 'all' || tx.tipo === filterTipo
    const matchSearch = !search || (tx.descricao || '').toLowerCase().includes(search.toLowerCase()) || (tx.categoria || '').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchTipo && matchSearch
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.billing}</div>
          <div className="page-header-sub">{transacoes.length} transações</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ tipo: 'receita', moeda: 'BRL' }); setEditing(null); setModal(true) }}>
          <i className="fas fa-plus" />{t.newTransaction}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">{t.totalRevenue}</div>
          <div className="kpi-value" style={{ color: 'var(--green)', fontSize: 22 }}>{fmt.currency(totalRev, currency)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t.totalExpense}</div>
          <div className="kpi-value" style={{ color: 'var(--red)', fontSize: 22 }}>{fmt.currency(totalExp, currency)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t.netBalance}</div>
          <div className="kpi-value" style={{ color: totalRev - totalExp >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 22 }}>{fmt.currency(totalRev - totalExp, currency)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><i className="fas fa-chart-bar" style={{ marginRight: 8 }} />Evolução Mensal</div>
        <div style={{ height: 220 }}><canvas ref={chartRef} /></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 260 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{t.allCompanies}</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <div className="tabs">
          {[['all','Todas'],['receita','Receitas'],['despesa','Despesas']].map(([v,l]) => (
            <button key={v} className={`tab ${filterTipo === v ? 'active' : ''}`} onClick={() => setFilterTipo(v as typeof filterTipo)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Descrição</th><th>Empresa</th><th>Tipo</th><th>Categoria</th><th>Data</th><th>Valor</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-receipt" /><p>{t.noRecords}</p></div></td></tr>}
              {filtered.map(tx => {
                const emp = empresas.find(e => e.id === tx.empresaId)
                return (
                  <tr key={tx.id}>
                    <td>{tx.descricao || '—'}</td>
                    <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                    <td><span className={`badge ${tx.tipo === 'receita' ? 'badge-green' : 'badge-red'}`}>{tx.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}</span></td>
                    <td style={{ fontSize: 12 }}>{tx.categoria}</td>
                    <td style={{ fontSize: 12 }}>{fmt.date(tx.data, lang)}</td>
                    <td style={{ fontWeight: 700, color: tx.tipo === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {tx.tipo === 'receita' ? '+' : '-'}{fmt.currency(tx.valor, tx.moeda)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => { setForm({ ...tx }); setEditing(tx.id!); setModal(true) }}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(tx.id!)}><i className="fas fa-trash" /></button>
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
          title={editing ? 'Editar Transação' : t.newTransaction}
          onClose={() => { setModal(false); setForm({ tipo: 'receita', moeda: 'BRL' }); setEditing(null) }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-save" />{t.save}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tipo *</label>
              <select className="form-select" value={form.tipo || 'receita'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as 'receita' | 'despesa' }))}>
                <option value="receita">↑ Receita</option>
                <option value="despesa">↓ Despesa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <select className="form-select" value={form.empresaId || ''} onChange={e => setForm(p => ({ ...p, empresaId: Number(e.target.value) }))}>
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor *</label>
              <input className="form-input" type="number" value={form.valor || ''} onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Moeda</label>
              <select className="form-select" value={form.moeda || 'BRL'} onChange={e => setForm(p => ({ ...p, moeda: e.target.value }))}>
                <option value="BRL">BRL</option><option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <select className="form-select" value={form.categoria || ''} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                <option value="">Selecione...</option>
                {(form.tipo === 'receita' ? CATS_REV : CATS_EXP).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.data || ''} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição</label>
              <input className="form-input" value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {confirmId && <ConfirmDialog msg={t.deleteConfirm} onConfirm={() => remove(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
