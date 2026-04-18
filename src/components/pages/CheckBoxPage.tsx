'use client'

import { FiscalDocPage } from './FiscalDocPage'

const SUBCATS = [
  { key: 'Check-the-Box Elections', icon: 'fa-check-square', color: 'brand', label: 'Check-the-Box Elections' },
]

const InfoCard = (
  <div className="card" style={{ marginBottom: 16, background: 'var(--brand-dim)', border: '1px solid var(--brand)', padding: '14px 18px' }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <i className="fas fa-circle-info" style={{ color: 'var(--brand)', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Check-the-Box (CTB)</strong> — Eleição tributária americana (Form 8832) que permite classificar entidades estrangeiras como corporations, partnerships ou disregarded entities para fins do IRS. Essencial para estruturas internacionais com presença no Brasil e EUA.
      </div>
    </div>
  </div>
)

export function CheckBoxPage() {
  return <FiscalDocPage title="Check-the-Box Elections" subcats={SUBCATS} defaultSubcat="Check-the-Box Elections" defaultJurisdiction="US" infoCard={InfoCard} showJurisdiction={false} />
}
