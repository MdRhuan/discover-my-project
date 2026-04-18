'use client'

import { useApp } from '@/context/AppContext'
import type { PageKey } from '@/types'

const PAGE_TITLES: Partial<Record<PageKey, string>> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks & Deadlines',
  companies: 'Empresas',
  employees: 'Funcionários',
  documents: 'Documentos',
  billing: 'Faturamento',
  orgchart: 'Organograma',
  backup: 'Backup',
  auditLog: 'Auditoria',
  personalDocs: 'Documentos Pessoais',
  lifeInsurance: 'Seguro de Vida',
  carInsurance: 'Seguro do Carro',
  aptInsurance: 'Seguro do Apartamento',
  investments: 'Investimentos',
  realEstate: 'Imóveis & Mortgage',
  fixedExpenses: 'Despesas Fixas',
  valuations: 'Valuations',
  juridico: 'Jurídico',
  acordoGaveta: 'Acordo de Gaveta',
  trademarks: 'Registro de Marca',
  fiscalTax: 'Tax Return – IRS',
  taxPlanning: 'Tax Planning',
  checkBox: 'Check-the-box',
}

export function Topbar() {
  const { page, lang, setLang, currency, setCurrency, theme, toggleTheme, setSidebarOpen } = useApp()

  const now = new Date()
  const tzBR = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const tzUS = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })
  const isDark = theme === 'dark'

  return (
    <header className="topbar">
      <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
        <i className="fas fa-bars" style={{ fontSize: 15 }} />
      </button>
      <span className="topbar-title">{PAGE_TITLES[page] || 'Dashboard'}</span>
      <span className="topbar-tz" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span><i className="fas fa-circle" style={{ color: 'var(--green)', fontSize: 6, marginRight: 4 }} />BR {tzBR}</span>
        <span><i className="fas fa-circle" style={{ color: 'var(--blue)', fontSize: 6, marginRight: 4 }} />US {tzUS}</span>
      </span>
      <button className={`topbar-pill ${currency === 'BRL' ? 'active' : ''}`} onClick={() => setCurrency('BRL')}>BRL</button>
      <button className={`topbar-pill ${currency === 'USD' ? 'active' : ''}`} onClick={() => setCurrency('USD')}>USD</button>
      <button className={`topbar-pill ${lang === 'pt-BR' ? 'active' : ''}`} onClick={() => setLang('pt-BR')}>PT</button>
      <button className={`topbar-pill ${lang === 'en-US' ? 'active' : ''}`} onClick={() => setLang('en-US')}>EN</button>
      <button className="theme-toggle" onClick={toggleTheme}>
        <span className="theme-toggle-thumb">
          <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'}`} />
        </span>
        {isDark ? 'Escuro' : 'Claro'}
      </button>
    </header>
  )
}
