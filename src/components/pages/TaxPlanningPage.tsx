'use client'

import { FiscalDocPage } from './FiscalDocPage'

const SUBCATS = [
  { key: 'Tax Planning (US)', icon: 'fa-flag-usa', color: 'blue',  label: 'Tax Planning (US)' },
  { key: 'Tax Planning (BR)', icon: 'fa-flag',     color: 'green', label: 'Tax Planning (BR)' },
]

export function TaxPlanningPage() {
  return <FiscalDocPage title="Tax Planning" subcats={SUBCATS} defaultSubcat="Tax Planning (US)" defaultJurisdiction="US" showJurisdiction />
}
