'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt, convertVal, timeAgo } from '@/lib/utils'
import type { Empresa, Funcionario, Transacao, Documento, Task, Alerta, AuditLog } from '@/types'

function AuditFeed() {
  const [rows, setRows] = useState<AuditLog[]>([])
  useEffect(() => {
    db.auditLog.orderBy('timestamp').reverse().limit(20).toArray().then(setRows)
  }, [])

  const iconFor = (acao = '') => {
    if (acao.includes('mpresa'))  return { icon: 'fa-building',   color: 'var(--brand)' }
    if (acao.includes('Task'))    return { icon: 'fa-list-check',  color: 'var(--yellow)' }
    if (acao.includes('ocumento'))return { icon: 'fa-file',        color: 'var(--green)' }
    if (acao.includes('uncion'))  return { icon: 'fa-user',        color: 'var(--blue)' }
    if (acao.includes('iscal'))   return { icon: 'fa-receipt',     color: 'var(--orange)' }
    return { icon: 'fa-circle-dot', color: 'var(--text-muted)' }
  }

  if (!rows.length) return <div className="empty-state"><i className="fas fa-clock-rotate-left" /><p>Nenhuma ação registrada.</p></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 480, overflowY: 'auto' }}>
      {rows.map((log, idx) => {
        const ic = iconFor(log.acao || log.modulo || '')
        const isLast = idx === rows.length - 1
        return (
          <div key={log.id ?? idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid var(--surface-border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <i className={`fas ${ic.icon}`} style={{ fontSize: 11, color: ic.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{log.acao}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 10, color: 'var(--text-muted)' }}>
                {log.modulo && <span style={{ color: 'var(--brand)' }}>{log.modulo}</span>}
                <span>{timeAgo(log.timestamp)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardPage() {
  const { t, currency, lang } = useApp()
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'alerts'>('home')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [docs, setDocs] = useState<Documento[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loaded, setLoaded] = useState(false)
  const revenueRef = useRef<HTMLCanvasElement>(null)
  const pieRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueInst = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pieInst = useRef<any>(null)

  useEffect(() => {
    Promise.all([
      db.empresas.toArray(),
      db.funcionarios.toArray(),
      db.transacoes.toArray(),
      db.documentos.toArray(),
      db.tasks.toArray(),
      db.alertas.toArray(),
    ]).then(([e, f, tx, d, tk, al]) => {
      setEmpresas(e); setFuncionarios(f); setTransacoes(tx)
      setDocs(d); setTasks(tk); setAlertas(al); setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded || activeTab !== 'home') return
    buildCharts()
    return () => {
      revenueInst.current?.destroy()
      pieInst.current?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, currency, activeTab])

  function buildCharts() {
    if (typeof window === 'undefined') return
    // Dynamic import Chart.js to avoid SSR issues
    import('chart.js/auto').then(({ default: Chart }) => {
      const months: string[] = []
      const monthKeys: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        months.push(d.toLocaleString(lang, { month: 'short' }))
        monthKeys.push(d.toISOString().slice(0, 7))
      }
      const rev = monthKeys.map(m => transacoes.filter(tx => tx.tipo === 'receita' && tx.data?.startsWith(m)).reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0))
      const exp = monthKeys.map(m => transacoes.filter(tx => tx.tipo === 'despesa' && tx.data?.startsWith(m)).reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0))

      revenueInst.current?.destroy()
      if (revenueRef.current) {
        revenueInst.current = new Chart(revenueRef.current, {
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
              x: { grid: { color: 'rgba(30,37,53,0.8)' }, ticks: { color: '#525d72' } },
              y: { grid: { color: 'rgba(30,37,53,0.8)' }, ticks: { color: '#525d72', callback: (v: unknown) => currency + ' ' + Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v as number) } },
            },
          },
        })
      }

      const empColors = ['#6470f1', '#22c55e', '#f59e0b', '#3b82f6']
      const empRevs = empresas.map(e => transacoes.filter(tx => tx.tipo === 'receita' && tx.empresaId === e.id).reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0))
      pieInst.current?.destroy()
      if (pieRef.current) {
        pieInst.current = new Chart(pieRef.current, {
          type: 'doughnut',
          data: {
            labels: empresas.map(e => e.nome),
            datasets: [{ data: empRevs, backgroundColor: empColors, borderWidth: 0, hoverOffset: 8 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8b93a8', font: { size: 11 }, padding: 12, boxWidth: 12 } } },
            cutout: '65%',
          },
        })
      }
    })
  }

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
      <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />{t.loading}
    </div>
  )

  const today = new Date().toISOString().slice(0, 10)
  const today15 = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  const today30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const today90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  const totalRev = transacoes.filter(tx => tx.tipo === 'receita').reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0)
  const totalExp = transacoes.filter(tx => tx.tipo === 'despesa').reduce((s, tx) => s + convertVal(tx.valor, tx.moeda, currency), 0)

  const pendingTasks = tasks.filter(tk => tk.status !== 'concluida')
  const overdueTasks = pendingTasks.filter(tk => tk.vencimento && tk.vencimento < today)
  const todayTasks = pendingTasks.filter(tk => tk.vencimento === today)
  const upcomingTasks = pendingTasks.filter(tk => tk.vencimento && tk.vencimento > today).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
  const unreadCount = alertas.filter(a => !a.lido).length

  const docsVencidos = docs.filter(d => d.vencimento && d.vencimento < today).length
  const docsVenc30 = docs.filter(d => d.vencimento && d.vencimento >= today && d.vencimento <= today30).length
  const docsAlerta = docsVencidos + docsVenc30
  const entidadesAtivas = empresas.filter(e => ['ativo', 'ativa'].includes((e.status || '').toLowerCase())).length

  const PRIO_MAP: Record<string, { badge: string; label: string }> = {
    alta: { badge: 'red', label: t.priorityHigh },
    media: { badge: 'yellow', label: t.priorityMedium },
    baixa: { badge: 'green', label: t.priorityLow },
  }
  const STATUS_TASK: Record<string, { badge: string; label: string }> = {
    pendente: { badge: 'yellow', label: t.statusPending },
    'em-andamento': { badge: 'blue', label: t.statusInProgress },
    concluida: { badge: 'green', label: t.statusDone },
  }
  const ALERT_MAP: Record<string, { badge: string; icon: string; label: string }> = {
    critico: { badge: 'red', icon: 'fa-circle-exclamation', label: t.criticalAlert },
    aviso: { badge: 'yellow', icon: 'fa-triangle-exclamation', label: t.warningAlert },
    info: { badge: 'blue', icon: 'fa-circle-info', label: t.infoAlert },
    sucesso: { badge: 'green', icon: 'fa-circle-check', label: t.successAlert },
  }

  async function markAlertRead(id: number) {
    await db.alertas.update(id, { lido: true })
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }
  async function markAllRead() {
    await Promise.all(alertas.filter(a => !a.lido).map(a => db.alertas.update(a.id!, { lido: true })))
    setAlertas(prev => prev.map(a => ({ ...a, lido: true })))
  }
  async function toggleTaskStatus(tk: Task) {
    const next = tk.status === 'concluida' ? 'pendente' : tk.status === 'pendente' ? 'em-andamento' : 'concluida'
    await db.tasks.update(tk.id!, { status: next })
    setTasks(prev => prev.map(t => t.id === tk.id ? { ...t, status: next } : t))
  }

  const timelineItems = [
    ...tasks.filter(tk => tk.status !== 'concluida' && tk.vencimento && tk.vencimento <= today90).map(tk => ({
      id: 'tk-' + tk.id,
      prazo: tk.vencimento!,
      titulo: tk.titulo,
      entidade: empresas.find(e => e.id === tk.empresaId)?.nome || '—',
      tipo: tk.categoria || 'Task',
      responsavel: tk.responsavel || '—',
    })),
    ...docs.filter(d => d.vencimento && d.vencimento <= today90).map(d => ({
      id: 'doc-' + d.id,
      prazo: d.vencimento!,
      titulo: d.nome,
      entidade: '—',
      tipo: 'Documento',
      responsavel: '—',
    })),
  ].sort((a, b) => {
    const ao = a.prazo < today ? 0 : 1; const bo = b.prazo < today ? 0 : 1
    if (ao !== bo) return ao - bo
    return a.prazo.localeCompare(b.prazo)
  })

  function tColor(prazo: string) {
    if (prazo < today) return { bar: 'var(--red)', badge: 'red', label: 'Vencido' }
    if (prazo <= today15) return { bar: 'var(--yellow)', badge: 'yellow', label: '< 15 dias' }
    return { bar: 'var(--green)', badge: 'green', label: 'OK' }
  }
  function daysLabel(prazo: string) {
    const diff = Math.round((new Date(prazo).getTime() - new Date(today).getTime()) / 86400000)
    if (diff < 0) return `${Math.abs(diff)}d atrás`
    if (diff === 0) return 'Hoje'
    return `em ${diff}d`
  }

  const TABS = [
    { key: 'home' as const, label: t.dashboard, icon: 'fa-gauge-high' },
    { key: 'tasks' as const, label: t.tasks, icon: 'fa-list-check', badge: pendingTasks.length },
    { key: 'alerts' as const, label: t.recentAlerts, icon: 'fa-bell', badge: unreadCount },
  ]

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.dashboard}</div>
          <div className="page-header-sub">{t.dashboardSub}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--surface-border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--brand)' : '2px solid transparent',
              fontWeight: activeTab === tab.key ? 600 : 400, fontSize: 13, marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            <i className={`fas ${tab.icon}`} style={{ fontSize: 13 }} />
            {tab.label}
            {'badge' in tab && (tab.badge ?? 0) > 0 && (
              <span style={{ background: tab.key === 'alerts' && unreadCount > 0 ? 'var(--red)' : 'var(--brand)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* HOME TAB */}
      {activeTab === 'home' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-building" style={{ fontSize: 20, color: 'var(--brand)' }} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{entidadesAtivas}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{t.activeEntities}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{empresas.length} {t.totalInPortfolio}</div>
              </div>
            </div>
            <div className="card" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', borderColor: docsAlerta > 0 ? '#f59e0b66' : 'var(--surface-border)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: docsAlerta > 0 ? '#f59e0b1f' : '#22c55e1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-file-circle-exclamation" style={{ fontSize: 20, color: docsAlerta > 0 ? 'var(--yellow)' : 'var(--green)' }} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: docsAlerta > 0 ? 'var(--yellow)' : 'var(--text-primary)', lineHeight: 1 }}>{docsAlerta}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{t.docsWithAlert}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {docsVencidos > 0 && <span style={{ color: 'var(--red)', marginRight: 8 }}>{docsVencidos} {t.expiredDocs}</span>}
                  {docsVenc30 > 0 && <span style={{ color: 'var(--yellow)' }}>{docsVenc30} {t.in30days}</span>}
                  {docsAlerta === 0 && <span style={{ color: 'var(--green)' }}>{t.allCurrent}</span>}
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', borderColor: overdueTasks.length > 0 ? '#ef444459' : 'var(--surface-border)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: overdueTasks.length > 0 ? '#ef444418' : 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-list-check" style={{ fontSize: 20, color: overdueTasks.length > 0 ? 'var(--red)' : 'var(--brand)' }} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: overdueTasks.length > 0 ? 'var(--red)' : 'var(--text-primary)', lineHeight: 1 }}>{pendingTasks.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Tasks Abertas</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {overdueTasks.length > 0
                    ? <span style={{ color: 'var(--red)' }}>{overdueTasks.length} vencidas</span>
                    : <span style={{ color: 'var(--green)' }}>Nenhuma vencida</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline + Audit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span><i className="fas fa-timeline" style={{ marginRight: 8 }} />Timeline de Deadlines — 90 dias</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{timelineItems.length} itens</span>
              </div>
              {timelineItems.length === 0 ? (
                <div className="empty-state"><i className="fas fa-calendar-check" /><p>Nenhum prazo nos próximos 90 dias.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {timelineItems.slice(0, 12).map((item, idx) => {
                    const c = tColor(item.prazo)
                    const isLast = idx === Math.min(timelineItems.length, 12) - 1
                    return (
                      <div key={item.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.bar, marginTop: 18, flexShrink: 0, boxShadow: `0 0 0 3px ${c.bar}22` }} />
                          {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--surface-border)', minHeight: 12 }} />}
                        </div>
                        <div style={{ flex: 1, padding: '12px 14px', marginLeft: 4, marginBottom: 6, background: 'var(--surface-hover)', borderRadius: 8, border: `1px solid ${c.bar}33` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</span>
                            <span className={`badge badge-${c.badge}`} style={{ fontSize: 10 }}>{c.label}</span>
                            <span className="badge badge-brand" style={{ fontSize: 10 }}>{item.tipo}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                            <span><i className="fas fa-building" style={{ marginRight: 4, color: 'var(--brand)' }} />{item.entidade}</span>
                            {item.responsavel !== '—' && <span><i className="fas fa-user" style={{ marginRight: 4 }} />{item.responsavel}</span>}
                            <span style={{ color: c.bar, fontWeight: 600 }}>
                              <i className="fas fa-calendar" style={{ marginRight: 4 }} />
                              {fmt.date(item.prazo, lang)} · {daysLabel(item.prazo)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="card" style={{ position: 'sticky', top: 16 }}>
              <div className="card-title"><i className="fas fa-clock-rotate-left" style={{ marginRight: 8 }} />Últimas Atualizações</div>
              <AuditFeed />
            </div>
          </div>
        </>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Vencidas', count: overdueTasks.length, color: 'var(--red)', icon: 'fa-circle-exclamation' },
              { label: 'Hoje', count: todayTasks.length, color: 'var(--yellow)', icon: 'fa-clock' },
              { label: 'Próximas', count: upcomingTasks.length, color: 'var(--brand)', icon: 'fa-calendar-check' },
              { label: 'Concluídas', count: tasks.filter(tk => tk.status === 'concluida').length, color: 'var(--green)', icon: 'fa-circle-check' },
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
          {overdueTasks.length > 0 && (
            <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,.3)' }}>
              <div className="card-title" style={{ color: 'var(--red)' }}><i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />Tarefas Vencidas</div>
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>Tarefa</th><th>Empresa</th><th>Responsável</th><th>Vencimento</th><th>Prioridade</th><th>Status</th></tr></thead>
                <tbody>
                  {overdueTasks.map(tk => {
                    const emp = empresas.find(e => e.id === tk.empresaId)
                    const prio = PRIO_MAP[tk.prioridade] || { badge: 'brand', label: tk.prioridade }
                    const st = STATUS_TASK[tk.status] || { badge: 'brand', label: tk.status }
                    return (
                      <tr key={tk.id}>
                        <td><div style={{ fontWeight: 600 }}>{tk.titulo}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tk.categoria}</div></td>
                        <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                        <td style={{ fontSize: 12 }}>{tk.responsavel}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 600, fontSize: 12 }}>{fmt.date(tk.vencimento, lang)}</td>
                        <td><span className={`badge badge-${prio.badge}`}>{prio.label}</span></td>
                        <td><button onClick={() => toggleTaskStatus(tk)} className={`badge badge-${st.badge}`} style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>{st.label}</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
            </div>
          )}
          <div className="card">
            <div className="card-title"><i className="fas fa-list-check" style={{ marginRight: 8 }} />Próximos Prazos</div>
            {pendingTasks.filter(tk => !tk.vencimento || tk.vencimento >= today).length === 0
              ? <div className="empty-state"><i className="fas fa-check-circle" /><p>Nenhuma tarefa pendente</p></div>
              : (
                <div className="table-wrap"><table className="data-table">
                  <thead><tr><th>Tarefa</th><th>Empresa</th><th>Categoria</th><th>Vencimento</th><th>Prioridade</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...todayTasks, ...upcomingTasks].map(tk => {
                      const emp = empresas.find(e => e.id === tk.empresaId)
                      const prio = PRIO_MAP[tk.prioridade] || { badge: 'brand', label: tk.prioridade }
                      const st = STATUS_TASK[tk.status] || { badge: 'brand', label: tk.status }
                      const isToday = tk.vencimento === today
                      return (
                        <tr key={tk.id}>
                          <td><div style={{ fontWeight: 600 }}>{tk.titulo}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tk.descricao}</div></td>
                          <td style={{ fontSize: 12 }}>{emp?.nome || '—'}</td>
                          <td><span className="badge badge-brand" style={{ fontSize: 10 }}>{tk.categoria}</span></td>
                          <td style={{ color: isToday ? 'var(--yellow)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400, fontSize: 12 }}>
                            {isToday ? <><i className="fas fa-clock" style={{ marginRight: 4 }} />Hoje</> : fmt.date(tk.vencimento, lang)}
                          </td>
                          <td><span className={`badge badge-${prio.badge}`}>{prio.label}</span></td>
                          <td><button onClick={() => toggleTaskStatus(tk)} className={`badge badge-${st.badge}`} style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>{st.label}</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table></div>
              )}
          </div>
        </>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['critico', 'aviso', 'info', 'sucesso'] as const).map(tipo => {
                const am = ALERT_MAP[tipo]
                const cnt = alertas.filter(a => a.tipo === tipo).length
                return (
                  <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>
                    <i className={`fas ${am.icon}`} style={{ color: `var(--${am.badge})` }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{am.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{cnt}</span>
                  </div>
                )
              })}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-secondary btn-sm">
                <i className="fas fa-check-double" />Marcar tudo lido
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alertas.length === 0 && <div className="empty-state card"><i className="fas fa-bell-slash" /><p>Nenhum alerta</p></div>}
            {[...alertas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(alerta => {
              const am = ALERT_MAP[alerta.tipo] || ALERT_MAP.info
              const emp = empresas.find(e => e.id === alerta.empresaId)
              return (
                <div key={alerta.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: alerta.lido ? 'var(--surface-card)' : 'var(--surface-hover)', border: `1px solid ${alerta.lido ? 'var(--surface-border)' : alerta.tipo === 'critico' ? 'rgba(239,68,68,.35)' : 'var(--surface-border)'}`, borderRadius: 10, padding: '14px 16px', opacity: alerta.lido ? 0.65 : 1 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: alerta.tipo === 'critico' ? 'rgba(239,68,68,.15)' : alerta.tipo === 'aviso' ? 'rgba(245,158,11,.15)' : alerta.tipo === 'sucesso' ? 'rgba(34,197,94,.15)' : 'rgba(100,112,241,.15)' }}>
                    <i className={`fas ${am.icon}`} style={{ fontSize: 16, color: alerta.tipo === 'critico' ? 'var(--red)' : alerta.tipo === 'aviso' ? 'var(--yellow)' : alerta.tipo === 'sucesso' ? 'var(--green)' : 'var(--brand)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{alerta.titulo}</span>
                      <span className={`badge badge-${am.badge}`} style={{ fontSize: 10 }}>{am.label}</span>
                      {!alerta.lido && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{alerta.mensagem}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span><i className="fas fa-building" style={{ marginRight: 4 }} />{emp?.nome || 'Sistema'}</span>
                      {alerta.modulo && <span><i className="fas fa-tag" style={{ marginRight: 4 }} />{alerta.modulo}</span>}
                      <span><i className="fas fa-clock" style={{ marginRight: 4 }} />{timeAgo(alerta.timestamp)}</span>
                    </div>
                  </div>
                  {!alerta.lido && (
                    <button onClick={() => markAlertRead(alerta.id!)} style={{ background: 'none', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '4px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
                      Lido
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
