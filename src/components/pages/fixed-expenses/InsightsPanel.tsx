'use client'

interface Props {
  pctBR: number
  topCategoria: { nome: string; pct: number } | null
  totalUSD: number
}

export function InsightsPanel({ pctBR, topCategoria, totalUSD }: Props) {
  const fmtUSD = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const insights = [
    {
      icon: 'fa-globe-americas',
      color: 'var(--brand)',
      bg: 'var(--brand-dim)',
      label: 'Distribuição geográfica',
      value: `${pctBR.toFixed(0)}% dos seus custos estão no Brasil`,
    },
    {
      icon: 'fa-trophy',
      color: 'var(--orange)',
      bg: 'rgba(249,115,22,.12)',
      label: 'Maior despesa',
      value: topCategoria
        ? `Sua maior despesa é ${topCategoria.nome} (${topCategoria.pct.toFixed(1)}%)`
        : 'Sem despesas no período',
    },
    {
      icon: 'fa-sack-dollar',
      color: 'var(--green)',
      bg: 'rgba(34,197,94,.12)',
      label: 'Total consolidado',
      value: `Total global consolidado: ${fmtUSD(totalUSD)} / mês`,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginTop: 18 }}>
      {insights.map((ins) => (
        <div
          key={ins.label}
          className="card"
          style={{
            padding: 18,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            borderLeft: `3px solid ${ins.color}`,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: ins.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className={`fas ${ins.icon}`} style={{ fontSize: 18, color: ins.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {ins.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
              {ins.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
