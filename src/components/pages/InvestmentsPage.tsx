'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Ativo {
  id: number
  nome: string
  ticker?: string
  classe: string
  corretora?: string
  moeda: string
  pais: string
  qtd?: string
  preco_medio?: string
  preco_atual?: string
  vl_investido?: string
  vl_atual?: string
  rentab_pct?: string
  dt_vencimento?: string
  notas?: string
}

const CLASSES = [
  { key: 'Renda Fixa',     icon: 'fa-shield-halved',    colorVar: 'var(--blue)',        bg: 'rgba(59,130,246,.12)'   },
  { key: 'Renda Variável', icon: 'fa-chart-line',       colorVar: 'var(--brand)',       bg: 'var(--brand-dim)'       },
  { key: 'FIIs',           icon: 'fa-building-columns', colorVar: 'var(--yellow)',      bg: 'rgba(245,158,11,.12)'   },
  { key: 'ETFs',           icon: 'fa-layer-group',      colorVar: 'var(--green)',       bg: 'rgba(34,197,94,.12)'    },
  { key: 'BDRs',           icon: 'fa-globe',            colorVar: 'var(--orange)',      bg: 'rgba(249,115,22,.12)'   },
  { key: 'Previdência',    icon: 'fa-piggy-bank',       colorVar: '#a78bfa',            bg: 'rgba(167,139,250,.12)'  },
  { key: 'Criptoativos',  icon: 'fa-bitcoin-sign',     colorVar: 'var(--orange)',      bg: 'rgba(249,115,22,.12)'   },
  { key: 'Outros',         icon: 'fa-ellipsis',         colorVar: 'var(--text-muted)', bg: 'var(--surface-hover)'   },
]

const CHART_COLORS = ['#6470f1','#3b82f6','#f59e0b','#22c55e','#f97316','#a78bfa','#ef4444','#94a3b8']

function classeInfo(key: string) {
  return CLASSES.find(c => c.key === key) || CLASSES[CLASSES.length - 1]
}

function calcRentab(f: Partial<Ativo>): string {
  if (f.vl_investido && f.vl_atual) {
    const inv = parseFloat(f.vl_investido), cur = parseFloat(f.vl_atual)
    if (inv > 0) return ((cur - inv) / inv * 100).toFixed(2)
  }
  if (f.preco_medio && f.preco_atual) {
    const pm = parseFloat(f.preco_medio), pa = parseFloat(f.preco_atual)
    if (pm > 0) return ((pa - pm) / pm * 100).toFixed(2)
  }
  return f.rentab_pct || ''
}

const EMPTY: Partial<Ativo> = {
  classe: 'Renda Variável', moeda: 'BRL', pais: 'BR',
  qtd: '', preco_medio: '', preco_atual: '', vl_investido: '', vl_atual: '', rentab_pct: '', dt_vencimento: '', notas: '',
}

export function InvestmentsPage() {
  const { lang, toast } = useApp()
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [search, setSearch] = useState('')
  const [filterClasse, setFilterClasse] = useState('')
  const [filterMoeda, setFilterMoeda] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Ativo>>(EMPTY)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'carteira' | 'graficos'>('carteira')
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInst = useRef<Chart | null>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const barInst = useRef<Chart | null>(null)

  const load = useCallback(async () => {
    const cfg = await db.config.get('investments')
    setAtivos((cfg?.value as Ativo[]) || [])
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!ativos.length || activeTab !== 'graficos') return
    const timer = setTimeout(() => {
      if (chartRef.current) {
        if (chartInst.current) chartInst.current.destroy()
        const classTotals: Record<string, number> = {}
        ativos.forEach(a => { classTotals[a.classe] = (classTotals[a.classe] || 0) + (parseFloat(a.vl_atual || '0') || 0) })
        const labels = Object.keys(classTotals)
        chartInst.current = new Chart(chartRef.current, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: Object.values(classTotals), backgroundColor: CHART_COLORS.slice(0, labels.length), borderWidth: 2, borderColor: 'var(--surface-card)' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'var(--text-primary)', font: { family: 'Lexend', size: 11 }, boxWidth: 12 } } }, cutout: '65%' },
        })
      }
      if (barRef.current) {
        if (barInst.current) barInst.current.destroy()
        const top = [...ativos].sort((a, b) => (parseFloat(b.rentab_pct || '0') || 0) - (parseFloat(a.rentab_pct || '0') || 0)).slice(0, 8)
        barInst.current = new Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: top.map(a => a.ticker || a.nome.slice(0, 10)),
            datasets: [{ label: 'Rentabilidade %', data: top.map(a => parseFloat(a.rentab_pct || '0') || 0), backgroundColor: top.map(a => (parseFloat(a.rentab_pct || '0') || 0) >= 0 ? 'rgba(100,112,241,.75)' : 'rgba(239,68,68,.65)'), borderRadius: 6 }],
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'var(--surface-border)' }, ticks: { color: 'var(--text-muted)', callback: (v) => v + '%' } }, y: { grid: { display: false }, ticks: { color: 'var(--text-primary)' } } } },
        })
      }
    }, 50)
    return () => {
      clearTimeout(timer)
      chartInst.current?.destroy(); chartInst.current = null
      barInst.current?.destroy(); barInst.current = null
    }
  }, [ativos, activeTab])

  const totalBRL = ativos.filter(a => a.moeda === 'BRL').reduce((s, a) => s + (parseFloat(a.vl_atual || '0') || 0), 0)
  const totalUSD = ativos.filter(a => a.moeda === 'USD').reduce((s, a) => s + (parseFloat(a.vl_atual || '0') || 0), 0)
  const totalInvBRL = ativos.filter(a => a.moeda === 'BRL').reduce((s, a) => s + (parseFloat(a.vl_investido || '0') || 0), 0)
  const totalInvUSD = ativos.filter(a => a.moeda === 'USD').reduce((s, a) => s + (parseFloat(a.vl_investido || '0') || 0), 0)
  const rentabBRL = totalInvBRL > 0 ? ((totalBRL - totalInvBRL) / totalInvBRL * 100) : 0
  const rentabUSD = totalInvUSD > 0 ? ((totalUSD - totalInvUSD) / totalInvUSD * 100) : 0

  const filtered = ativos.filter(a =>
    (!filterClasse || a.classe === filterClasse) &&
    (!filterMoeda || a.moeda === filterMoeda) &&
    (!search || a.nome?.toLowerCase().includes(search.toLowerCase()) || a.ticker?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return }
    try {
      const id = form.id ?? Date.now()
      const ativo = { ...form, id } as Ativo
      const updated = ativos.find(a => a.id === id) ? ativos.map(a => a.id === id ? ativo : a) : [...ativos, ativo]
      await db.config.put({ chave: 'investments', value: updated })
      toast('Salvo com sucesso!', 'success'); setModal(false); setForm(EMPTY); load()
    } catch { toast('Erro ao salvar.', 'error') }
  }

  async function handleDelete(id: number) {
    try {
      const updated = ativos.filter(a => a.id !== id)
      await db.config.put({ chave: 'investments', value: updated })
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  const totalGeral = ativos.reduce((s, a) => s + (parseFloat(a.vl_atual || '0') || 0), 0)

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Investimentos</div>
          <div className="page-header-sub">{ativos.length} ativo{ativos.length !== 1 ? 's' : ''} na carteira</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, id: Date.now() }); setModal(true) }}>
          <i className="fas fa-plus" />Novo Ativo
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total BRL', val: fmt.currency(totalBRL, 'BRL', lang), sub: `Investido: ${fmt.currency(totalInvBRL, 'BRL', lang)}`, rentab: rentabBRL, icon: 'fa-brazilian-real-sign', color: 'var(--brand)', bg: 'var(--brand-dim)' },
          { label: 'Total USD', val: fmt.currency(totalUSD, 'USD', lang), sub: `Investido: ${fmt.currency(totalInvUSD, 'USD', lang)}`, rentab: rentabUSD, icon: 'fa-dollar-sign', color: 'var(--green)', bg: 'rgba(34,197,94,.12)' },
          { label: 'Ativos BR', val: ativos.filter(a => a.pais === 'BR').length, sub: 'ativos no Brasil', rentab: null, icon: 'fa-flag', color: 'var(--yellow)', bg: 'rgba(245,158,11,.12)' },
          { label: 'Ativos US', val: ativos.filter(a => a.pais === 'US').length, sub: 'ativos nos EUA', rentab: null, icon: 'fa-flag', color: 'var(--blue)', bg: 'rgba(59,130,246,.12)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{k.val}</div>
                {k.rentab !== null ? (
                  <div style={{ fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{k.sub}</span>
                    <span style={{ color: k.rentab >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 12 }}>
                      <i className={`fas fa-caret-${k.rentab >= 0 ? 'up' : 'down'}`} style={{ marginRight: 2 }} />{Math.abs(k.rentab).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{k.sub}</div>
                )}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${k.icon}`} style={{ fontSize: 16, color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Class filter chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 18 }}>
        {CLASSES.map(cls => {
          const count = ativos.filter(a => a.classe === cls.key).length
          if (count === 0) return null
          return (
            <button key={cls.key} onClick={() => setFilterClasse(filterClasse === cls.key ? '' : cls.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', background: filterClasse === cls.key ? 'var(--surface-hover)' : 'var(--surface-card)', border: `1px solid ${filterClasse === cls.key ? 'var(--brand)' : 'var(--surface-border)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cls.bg }}>
                <i className={`fas ${cls.icon}`} style={{ fontSize: 13, color: cls.colorVar }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11, lineHeight: 1.3 }}>{cls.key}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{count} ativo{count !== 1 ? 's' : ''}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--surface-border)' }}>
        {[{ key: 'carteira', label: 'Carteira', icon: 'fa-table-list' }, { key: 'graficos', label: 'Gráficos', icon: 'fa-chart-pie' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as 'carteira' | 'graficos')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: activeTab === tab.key ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -1, transition: 'color .15s' }}>
            <i className={`fas ${tab.icon}`} style={{ fontSize: 12 }} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'carteira' && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
                <i className="fas fa-search" />
                <input placeholder="Buscar ativo, ticker..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ maxWidth: 200 }} value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
                <option value="">Todas as classes</option>
                {CLASSES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
              </select>
              <select className="form-select" style={{ maxWidth: 130 }} value={filterMoeda} onChange={e => setFilterMoeda(e.target.value)}>
                <option value="">Todas as moedas</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
              {(search || filterClasse || filterMoeda) && (
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterClasse(''); setFilterMoeda('') }}>
                  <i className="fas fa-xmark" />Limpar
                </button>
              )}
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div className="empty-state"><i className="fas fa-chart-pie" /><p>Nenhum ativo encontrado.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Ativo</th><th>Classe</th><th>Corretora</th><th>Moeda</th><th>Qtd / PM</th><th>Preço Atual</th><th>Vl. Investido</th><th>Vl. Atual</th><th>Rentab.</th><th>Ações</th></tr></thead>
                  <tbody>
                    {filtered.map(a => {
                      const cls = classeInfo(a.classe)
                      const rentab = parseFloat(a.rentab_pct || '0') || 0
                      const ganho = (parseFloat(a.vl_atual || '0') || 0) - (parseFloat(a.vl_investido || '0') || 0)
                      return (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{a.nome}</div>
                            {a.ticker && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-hover)', borderRadius: 4, padding: '1px 6px', display: 'inline-block', marginTop: 2, fontFamily: 'monospace' }}>{a.ticker}</span>}
                          </td>
                          <td><span style={{ fontSize: 11, color: cls.colorVar, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className={`fas ${cls.icon}`} style={{ fontSize: 10 }} />{a.classe}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.corretora || '—'}</td>
                          <td><span className={`badge badge-${a.moeda === 'USD' ? 'blue' : 'brand'}`}>{a.moeda || 'BRL'}</span></td>
                          <td style={{ fontSize: 12 }}>
                            {a.qtd ? <div style={{ fontWeight: 500 }}>{a.qtd}</div> : '—'}
                            {a.preco_medio ? <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>PM: {fmt.currency(parseFloat(a.preco_medio), a.moeda || 'BRL', lang)}</div> : null}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{a.preco_atual ? fmt.currency(parseFloat(a.preco_atual), a.moeda || 'BRL', lang) : '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.vl_investido ? fmt.currency(parseFloat(a.vl_investido), a.moeda || 'BRL', lang) : '—'}</td>
                          <td style={{ fontSize: 13, fontWeight: 700 }}>{a.vl_atual ? fmt.currency(parseFloat(a.vl_atual), a.moeda || 'BRL', lang) : '—'}</td>
                          <td>
                            {a.rentab_pct !== '' && a.rentab_pct !== undefined ? (
                              <span style={{ color: rentab >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <i className={`fas fa-caret-${rentab >= 0 ? 'up' : 'down'}`} />{Math.abs(rentab).toFixed(1)}%
                                {ganho !== 0 && <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 2 }}>({ganho > 0 ? '+' : ''}{fmt.currency(ganho, a.moeda || 'BRL', lang)})</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-icon" onClick={() => { setForm({ ...a }); setModal(true) }}><i className="fas fa-pen" /></button>
                              <button className="btn-icon danger" onClick={() => setConfirmId(a.id)}><i className="fas fa-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'graficos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Alocação por Classe</div>
            <div style={{ height: 260, position: 'relative' }}><canvas ref={chartRef} /></div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Top Rentabilidade</div>
            <div style={{ height: 260, position: 'relative' }}><canvas ref={barRef} /></div>
          </div>
          <div className="card" style={{ gridColumn: '1/-1' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Resumo por Classe</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Classe</th><th>Ativos</th><th>Vl. Investido</th><th>Vl. Atual</th><th>Resultado</th><th>% Carteira</th></tr></thead>
                <tbody>
                  {CLASSES.map(cls => {
                    const grupo = ativos.filter(a => a.classe === cls.key)
                    if (grupo.length === 0) return null
                    const inv = grupo.reduce((s, a) => s + (parseFloat(a.vl_investido || '0') || 0), 0)
                    const cur = grupo.reduce((s, a) => s + (parseFloat(a.vl_atual || '0') || 0), 0)
                    const rnt = inv > 0 ? ((cur - inv) / inv * 100) : 0
                    const pct = totalGeral > 0 ? (cur / totalGeral * 100) : 0
                    return (
                      <tr key={cls.key}>
                        <td><span style={{ fontSize: 12, color: cls.colorVar, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><i className={`fas ${cls.icon}`} style={{ fontSize: 10 }} />{cls.key}</span></td>
                        <td style={{ fontSize: 12 }}>{grupo.length}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt.currency(inv, 'BRL', lang)}</td>
                        <td style={{ fontSize: 13, fontWeight: 700 }}>{fmt.currency(cur, 'BRL', lang)}</td>
                        <td><span style={{ color: rnt >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 12 }}>{rnt >= 0 ? '+' : ''}{rnt.toFixed(1)}%</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--surface-border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: cls.colorVar, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={form.id && ativos.find(a => a.id === form.id) ? 'Editar Ativo' : 'Novo Ativo'} onClose={() => { setModal(false); setForm(EMPTY) }} large
          footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Tesouro IPCA+ 2035" />
            </div>
            <div className="form-group">
              <label className="form-label">Ticker</label>
              <input className="form-input" value={form.ticker || ''} onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} placeholder="Ex: PETR4" />
            </div>
            <div className="form-group">
              <label className="form-label">Classe</label>
              <select className="form-select" value={form.classe || 'Renda Variável'} onChange={e => setForm(f => ({ ...f, classe: e.target.value }))}>
                {CLASSES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Corretora</label>
              <input className="form-input" value={form.corretora || ''} onChange={e => setForm(f => ({ ...f, corretora: e.target.value }))} placeholder="Ex: XP Investimentos" />
            </div>
            <div className="form-group">
              <label className="form-label">Moeda</label>
              <select className="form-select" value={form.moeda || 'BRL'} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}>
                <option value="BRL">BRL</option><option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <select className="form-select" value={form.pais || 'BR'} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}>
                <option value="BR">Brasil</option><option value="US">EUA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade</label>
              <input className="form-input" type="number" value={form.qtd || ''} onChange={e => setForm(f => ({ ...f, qtd: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Preço Médio</label>
              <input className="form-input" type="number" value={form.preco_medio || ''} onChange={e => { const f2 = { ...form, preco_medio: e.target.value }; setForm({ ...f2, rentab_pct: calcRentab(f2) }) }} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Preço Atual</label>
              <input className="form-input" type="number" value={form.preco_atual || ''} onChange={e => { const f2 = { ...form, preco_atual: e.target.value }; setForm({ ...f2, rentab_pct: calcRentab(f2) }) }} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Vl. Investido ({form.moeda || 'BRL'})</label>
              <input className="form-input" type="number" value={form.vl_investido || ''} onChange={e => { const f2 = { ...form, vl_investido: e.target.value }; setForm({ ...f2, rentab_pct: calcRentab(f2) }) }} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Vl. Atual ({form.moeda || 'BRL'})</label>
              <input className="form-input" type="number" value={form.vl_atual || ''} onChange={e => { const f2 = { ...form, vl_atual: e.target.value }; setForm({ ...f2, rentab_pct: calcRentab(f2) }) }} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Rentabilidade %</label>
              <input className="form-input" type="number" value={form.rentab_pct || ''} onChange={e => setForm(f => ({ ...f, rentab_pct: e.target.value }))} placeholder="Calculado automaticamente" />
            </div>
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.dt_vencimento || ''} onChange={e => setForm(f => ({ ...f, dt_vencimento: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" rows={2} value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Notas adicionais..." />
            </div>
          </div>
        </Modal>
      )}
      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir este ativo?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
