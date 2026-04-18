'use client'

import { FiscalDocPage } from './FiscalDocPage'

const SUBCATS = [
  { key: 'IRS Filings', icon: 'fa-building-columns', color: 'brand', label: 'IRS Filings' },
  { key: 'IR Brasil',   icon: 'fa-landmark',          color: 'yellow', label: 'IR Brasil'  },
]

export function FiscalTaxPage() {
  return <FiscalDocPage title="Fiscal & Tax" subcats={SUBCATS} defaultSubcat="IRS Filings" defaultJurisdiction="US" showJurisdiction />
}
