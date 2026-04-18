'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

interface Despesa {
  id: number
  categoria: string
  descricao: string
  pais: 'BR' | 'US'
  moeda: 'BRL' | 'USD'
  valor: number
  ativo: boolean
  notas?: string
}

const CATEGORIAS = [
  { key: 'Moradia',         icon: 'fa-house',            colorVar: 'var(--brand)',   bg: 'var(--brand-dim)'         },
  { key: 'Funcionários',    icon: 'fa-user-tie',         colorVar: 'var(--blue)',    bg: 'rgba(59,130,246,.12)'     },
  { key: 'Transporte',      icon: 'fa-car',              colorVar: 'var(--yellow)',  bg: 'rgba(245,158,11,.12)'     },
  { key: 'Seguros',         icon: 'fa-shield-halved',    colorVar: 'var(--green)',   bg: 'rgba(34,197,94,.12)'      },
  { key: 'Assinaturas',     icon: 'fa-credit-card',      colorVar: 'var(--orange)',  bg: 'rgba(249,115,22,.12)'     },
  { key: 'Contabilidade',   icon: 'fa-calculator',       colorVar: '#a78bfa',        bg: 'rgba(167,139,250,.12)'    },
  { key: 'Educação',        icon: 'fa-graduation-cap',   colorVar: 'var(--brand)',   bg: 'var(--brand-dim)'         },
  { key: 'Saúde',           icon: 'fa-heart-pulse',      colorVar: 'var(--red)',     bg: 'rgba(239,68,68,.12)'      },
  { key: 'Outros',          icon: 'fa-ellipsis',         colorVar: 'var(--text-muted)', bg: 'var(--surface-hover)' },
]

const EMPTY: Partial<Despesa> = {
  categoria: 'Moradia', descricao: '', pais: 'BR', moeda: 'BRL', valor: 0, ativo: true, notas: '',
}

export function FixedExpensesPage() {
  const { lang, toast } = useApp()
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [filterPais, setFilterPais] = useState<'all' | 'BR' | 'US'>('all')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Despesa>>(EMPTY)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [usdRate, setUsdRate] = useState(5.05)
  const [cotacaoInfo, setCotacaoInfo] = useState<{ valor: number; hora: string; erro?: string } | null>(null)

  useEffect(() => {
    fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
      .then(r => r.json())
      .then(data => {
        const rate = parseFloat(data.USDBRL.bid)
        const dt = new Date(parseInt(data.USDBRL.timestamp) * 1000)
        const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        setUsdRate(rate)
        setCotacaoInfo({ valor: rate, hora })
      })
      .catch(() => setCotacaoInfo({ valor: 5.05, hora: '', erro: 'Falha ao buscar cotação' }))
  }, [])

  const load = useCallback(async () => {
    const cfg = await db.config.get('fixedExpenses')
    setDespesas((cfg?.value as Despesa[]) || [])
  }, [])

  useEffect(() => { load() }, [load])

  const ativas = despesas.filter(d => d.ativo !== false)

  const filtered = ativas.filter(d =>
    (filterPais === 'all' || d.pais === filterPais) &&
    (!filterCat || d.categoria === filterCat)
  )

  const totalBRL = ativas.filter(d => d.pais === 'BR').reduce((s, d) => s + (d.moeda === 'BRL' ? d.valor : d.valor * usdRate), 0)
  const totalUSD = ativas.filter(d => d.pais === 'US').reduce((s, d) => s + (d.moeda === 'USD' ? d.valor : d.valor / usdRate), 0)
  const totalConsolidadoBRL = totalBRL + totalUSD * usdRate

  function toDisplayVal(d: Despesa): number {
    return d.valor || 0
  }

  async function handleSave() {
    if (!form.descricao?.trim()) { toast('Descrição obrigatória.', 'error'); return }
    try {
      const id = form.id ?? Date.now()
      const item = { ...form, id } as Despesa
      const updated = despesas.find(d => d.id === id) ? despesas.map(d => d.id === id ? item : d) : [...despesas, item]
      await db.config.put({ chave: 'fixedExpenses', value: updated })
      toast('Salvo com sucesso!', 'success'); setModal(false); setForm(EMPTY); load()
    } catch { toast('Erro ao salvar.', 'error') }
  }

  async function handleDelete(id: number) {
    try {
      const updated = despesas.filter(d => d.id !== id)
      await db.config.put({ chave: 'fixedExpenses', value: updated })
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  const catInfo = (key: string) => CATEGORIAS.find(c => c.key === key) || CATEGORIAS[CATEGORIAS.length - 1]

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Despesas Fixas</div>
          <div className="page-header-sub">{ativas.length} despesa{ativas.length !== 1 ? 's' : ''} ativa{ativas.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, id: Date.now() }); setModal(true) }}>
          <i className="fas fa-plus" />Nova Despesa
        </button>
      </div>

      {/* Cotação */}
      {cotacaoInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <i className="fas fa-circle-info" style={{ color: 'var(--brand)' }} />
          {cotacaoInfo.erro
            ? cotacaoInfo.erro
            : `Cotação USD/BRL: R$ ${cotacaoInfo.valor.toFixed(2)} (atualizada às ${cotacaoInfo.hora})`}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total BR (BRL)', val: fmt.currency(totalBRL, 'BRL', lang), icon: 'fa-flag', color: 'var(--brand)', bg: 'var(--brand-dim)' },
          { label: 'Total US (USD)', val: fmt.currency(totalUSD, 'USD', lang), icon: 'fa-flag-usa', color: 'var(--blue)', bg: 'rgba(59,130,246,.12)' },
          { label: 'Consolidado (BRL)', val: fmt.currency(totalConsolidadoBRL, 'BRL', lang), icon: 'fa-globe', color: 'var(--green)', bg: 'rgba(34,197,94,.12)' },
          { label: 'Despesas ativas', val: ativas.length, icon: 'fa-receipt', color: 'var(--yellow)', bg: 'rgba(245,158,11,.12)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{k.val}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${k.icon}`} style={{ fontSize: 16, color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {CATEGORIAS.map(cat => {
          const count = ativas.filter(d => d.categoria === cat.key).length
          if (count === 0) return null
          return (
            <button key={cat.key} onClick={() => setFilterCat(filterCat === cat.key ? '' : cat.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', background: filterCat === cat.key ? 'var(--surface-hover)' : 'var(--surface-card)', border: `1px solid ${filterCat === cat.key ? 'var(--brand)' : 'var(--surface-border)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg }}>
                <i className={`fas ${cat.icon}`} style={{ fontSize: 13, color: cat.colorVar }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 11 }}>{cat.key}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{count}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters + Table */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="tabs">
          {[['all', 'Todos'], ['BR', 'Brasil'], ['US', 'EUA']].map(([v, l]) => (
            <button key={v} className={`tab ${filterPais === v ? 'active' : ''}`} onClick={() => setFilterPais(v as 'all' | 'BR' | 'US')}>{l}</button>
          ))}
        </div>
        {filterCat && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setFilterCat('')}>
            <i className="fas fa-xmark" />Limpar filtro
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Descrição</th><th>Categoria</th><th>País</th><th>Moeda</th><th>Valor</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-receipt" /><p>Nenhuma despesa encontrada.</p></div></td></tr>}
              {filtered.map(d => {
                const cat = catInfo(d.categoria)
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.descricao}</div>
                      {d.notas && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.notas}</div>}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: cat.colorVar, fontWeight: 600 }}>
                        <i className={`fas ${cat.icon}`} style={{ fontSize: 10 }} />{d.categoria}
                      </span>
                    </td>
                    <td><span className={`badge badge-${d.pais === 'US' ? 'blue' : 'brand'}`} style={{ fontSize: 10 }}>{d.pais}</span></td>
                    <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{d.moeda}</span></td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt.currency(toDisplayVal(d), d.moeda, lang)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => { setForm({ ...d }); setModal(true) }}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(d.id)}><i className="fas fa-trash" /></button>
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
        <Modal title={form.id && despesas.find(d => d.id === form.id) ? 'Editar Despesa' : 'Nova Despesa Fixa'} onClose={() => { setModal(false); setForm(EMPTY) }}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição *</label>
              <input className="form-input" value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aluguel apartamento Miami" />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria || 'Moradia'} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <select className="form-select" value={form.pais || 'BR'} onChange={e => setForm(f => ({ ...f, pais: e.target.value as 'BR' | 'US', moeda: e.target.value === 'US' ? 'USD' : 'BRL' }))}>
                <option value="BR">Brasil</option><option value="US">EUA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Moeda</label>
              <select className="form-select" value={form.moeda || 'BRL'} onChange={e => setForm(f => ({ ...f, moeda: e.target.value as 'BRL' | 'USD' }))}>
                <option value="BRL">BRL</option><option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor mensal</label>
              <input className="form-input" type="number" value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} placeholder="0,00" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" rows={2} value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir esta despesa?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
