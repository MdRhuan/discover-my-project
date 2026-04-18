'use client'

import { AppProvider, useApp } from '@/context/AppContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { AuthScreen } from '@/components/layout/AuthScreen'
import { ToastContainer } from '@/components/ui/Toast'

import { DashboardPage } from '@/components/pages/DashboardPage'
import { TasksPage } from '@/components/pages/TasksPage'
import { CompaniesPage } from '@/components/pages/CompaniesPage'
import { EmployeesPage } from '@/components/pages/EmployeesPage'
import { DocumentsPage } from '@/components/pages/DocumentsPage'
import { BillingPage } from '@/components/pages/BillingPage'
import { OrgChartPage } from '@/components/pages/OrgChartPage'
import { ValuationsPage } from '@/components/pages/ValuationsPage'
import { PersonalDocsPage } from '@/components/pages/PersonalDocsPage'
import { InvestmentsPage } from '@/components/pages/InvestmentsPage'
import { FixedExpensesPage } from '@/components/pages/FixedExpensesPage'
import { JuridicoPage } from '@/components/pages/JuridicoPage'
import { AcordoGavetaPage } from '@/components/pages/AcordoGavetaPage'
import { TrademarksPage } from '@/components/pages/TrademarksPage'
import { FiscalTaxPage } from '@/components/pages/FiscalTaxPage'
import { TaxPlanningPage } from '@/components/pages/TaxPlanningPage'
import { CheckBoxPage } from '@/components/pages/CheckBoxPage'
import { AuditLogPage } from '@/components/pages/AuditLogPage'
import { LifeInsurancePage } from '@/components/pages/LifeInsurancePage'
import { CarInsurancePage } from '@/components/pages/CarInsurancePage'
import { AptInsurancePage } from '@/components/pages/AptInsurancePage'
import { RealEstatePage } from '@/components/pages/RealEstatePage'
import { BackupPage } from '@/components/pages/BackupPage'

function AppShell() {
  const { user, page, sidebarOpen, setSidebarOpen } = useApp()

  if (!user) return <AuthScreen />

  function renderPage() {
    switch (page) {
      case 'dashboard':    return <DashboardPage />
      case 'tasks':        return <TasksPage />
      case 'companies':    return <CompaniesPage />
      case 'employees':    return <EmployeesPage />
      case 'documents':    return <DocumentsPage />
      case 'billing':      return <BillingPage />
      case 'orgchart':     return <OrgChartPage />
      case 'valuations':   return <ValuationsPage />
      case 'personalDocs': return <PersonalDocsPage />
      case 'investments':  return <InvestmentsPage />
      case 'fixedExpenses':return <FixedExpensesPage />
      case 'juridico':     return <JuridicoPage />
      case 'acordoGaveta': return <AcordoGavetaPage />
      case 'trademarks':   return <TrademarksPage />
      case 'fiscalTax':    return <FiscalTaxPage />
      case 'taxPlanning':  return <TaxPlanningPage />
      case 'checkBox':     return <CheckBoxPage />
      case 'auditLog':     return <AuditLogPage />
      case 'lifeInsurance':  return <LifeInsurancePage />
      case 'carInsurance':   return <CarInsurancePage />
      case 'aptInsurance':   return <AptInsurancePage />
      case 'realEstate':     return <RealEstatePage />
      case 'backup':         return <BackupPage />
      default:               return <DashboardPage />
    }
  }

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
