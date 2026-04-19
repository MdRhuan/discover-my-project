'use client'

import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js'
import { CATEGORIAS, catInfo } from './types'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  title: string
  subtitle?: string
  icon: string
  iconColor: string
  iconBg: string
  data: Record<string, number> // categoria -> valor (na moeda alvo)
  currency: 'BRL' | 'USD'
  total: number
  emptyMessage?: string
}

export function ExpensesPieChart({ title, subtitle, icon, iconColor, iconBg, data, currency, total, emptyMessage }: Props) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const labels = entries.map(([k]) => k)
  const values = entries.map(([, v]) => v)
  const colors = entries.map(([k]) => catInfo(k).hex)

  const fmtCur = (v: number) =>
    new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(v)

  const chartData = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderColor: 'var(--surface-card)',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#0f172a',
          font: { size: 11 },
          padding: 10,
          boxWidth: 12,
          generateLabels: (chart) => {
            const data = chart.data
            if (!data.labels?.length) return []
            return (data.labels as string[]).map((label, i) => {
              const val = (data.datasets[0].data[i] as number) || 0
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'
              return {
                text: `${label} — ${pct}%`,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                lineWidth: 0,
                hidden: false,
                index: i,
              }
            })
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed as number
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0'
            return `${ctx.label}: ${fmtCur(v)} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ fontSize: 14, color: iconColor }} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{fmtCur(total)}</div>
      <div style={{ height: 280, position: 'relative' }}>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-chart-pie" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{emptyMessage || 'Sem dados no período'}</p>
          </div>
        ) : (
          <Pie data={chartData} options={options} />
        )}
      </div>
    </div>
  )
}
