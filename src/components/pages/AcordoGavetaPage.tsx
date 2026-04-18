'use client'

import { FiscalDocPage } from './FiscalDocPage'

const SUBCATS = [
  { key: 'Acordo de Gaveta', icon: 'fa-handshake', color: 'orange', label: 'Acordo de Gaveta' },
]

export function AcordoGavetaPage() {
  return <FiscalDocPage title="Acordos de Gaveta" subcats={SUBCATS} defaultSubcat="Acordo de Gaveta" showJurisdiction />
}
