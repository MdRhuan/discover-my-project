'use client'

import { FiscalDocPage } from './FiscalDocPage'

const SUBCATS = [
  { key: 'Mútuo / Intercompany', icon: 'fa-arrows-left-right', color: 'green',  label: 'Mútuo / Intercompany' },
  { key: 'Contratos',            icon: 'fa-file-signature',    color: 'blue',   label: 'Contratos'            },
  { key: 'Societário',           icon: 'fa-building',          color: 'brand',  label: 'Societário'           },
  { key: 'Compliance',           icon: 'fa-shield-halved',     color: 'yellow', label: 'Compliance'           },
]

export function JuridicoPage() {
  return <FiscalDocPage title="Jurídico" subcats={SUBCATS} defaultSubcat="Contratos" showJurisdiction />
}
