'use client'

import { CATEGORIAS, catInfo } from './types'

interface Props {
  /** Valores agregados por categoria, em USD (consolidado) */
  data: Record<string, number>
  total: number
}

export function CategoryCards({ data, total }: Props) {
  const fmtUSD = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  // Sempre mostra TODAS as categorias, mesmo zeradas
  const categoriasComValor = CATEGORIAS

  return (
    <div style={{ marginTop: 24, marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: '0.02em' }}>Categorias</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 12 }}>
        {categoriasComValor.map(cat => {
          const valor = data[cat.key] || 0
          const pct = total > 0 ? (valor / total) * 100 : 0
          const info = catInfo(cat.key)
          return (
            <div
              key={cat.key}
              className="card"
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: info.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`fas ${info.icon}`} style={{ fontSize: 14, color: info.colorVar }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {pct.toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{cat.key}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: info.colorVar }}>{fmtUSD(valor)}</div>
              </div>
              <div style={{ height: 4, background: 'var(--surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`,
                  height: '100%',
                  background: info.colorVar,
                  borderRadius: 4,
                  transition: 'width .3s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
