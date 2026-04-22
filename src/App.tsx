import { lazy, Suspense } from 'react'
import { AppProvider, useApp } from '@/context/AppContext'
import { AuthScreen } from '@/components/layout/AuthScreen'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ToastContainer } from '@/components/ui/Toast'

const DashboardPage     = lazy(() => import('@/components/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const TasksPage         = lazy(() => import('@/components/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const CompaniesPage     = lazy(() => import('@/components/pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })))
const EmConstrucaoPage  = lazy(() => import('@/components/pages/EmConstrucaoPage').then(m => ({ default: m.EmConstrucaoPage })))
const EmployeesPage     = lazy(() => import('@/components/pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const DocumentsPage     = lazy(() => import('@/components/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const BillingPage       = lazy(() => import('@/components/pages/BillingPage').then(m => ({ default: m.BillingPage })))
const OrgChartPage      = lazy(() => import('@/components/pages/OrgChartPage').then(m => ({ default: m.OrgChartPage })))
const ValuationsPage    = lazy(() => import('@/components/pages/ValuationsPage').then(m => ({ default: m.ValuationsPage })))
const PersonalDocsPage  = lazy(() => import('@/components/pages/PersonalDocsPage').then(m => ({ default: m.PersonalDocsPage })))
const LifeInsurancePage = lazy(() => import('@/components/pages/LifeInsurancePage').then(m => ({ default: m.LifeInsurancePage })))
const CarInsurancePage  = lazy(() => import('@/components/pages/CarInsurancePage').then(m => ({ default: m.CarInsurancePage })))
const AptInsurancePage  = lazy(() => import('@/components/pages/AptInsurancePage').then(m => ({ default: m.AptInsurancePage })))
const InvestmentsPage   = lazy(() => import('@/components/pages/InvestmentsPage').then(m => ({ default: m.InvestmentsPage })))
const RealEstatePage    = lazy(() => import('@/components/pages/RealEstatePage').then(m => ({ default: m.RealEstatePage })))
const BensMoveisPage    = lazy(() => import('@/components/pages/BensMoveisPage').then(m => ({ default: m.BensMoveisPage })))
const FixedExpensesPage = lazy(() => import('@/components/pages/FixedExpensesPage').then(m => ({ default: m.FixedExpensesPage })))
const FairsEventsPage   = lazy(() => import('@/components/pages/FairsEventsPage').then(m => ({ default: m.FairsEventsPage })))
const JuridicoPage      = lazy(() => import('@/components/pages/JuridicoPage').then(m => ({ default: m.JuridicoPage })))
const AcordoGavetaPage  = lazy(() => import('@/components/pages/AcordoGavetaPage').then(m => ({ default: m.AcordoGavetaPage })))
const TrademarksPage    = lazy(() => import('@/components/pages/TrademarksPage').then(m => ({ default: m.TrademarksPage })))
const FiscalTaxPage     = lazy(() => import('@/components/pages/FiscalTaxPage').then(m => ({ default: m.FiscalTaxPage })))
const TaxPlanningPage   = lazy(() => import('@/components/pages/TaxPlanningPage').then(m => ({ default: m.TaxPlanningPage })))
const CheckBoxPage      = lazy(() => import('@/components/pages/CheckBoxPage').then(m => ({ default: m.CheckBoxPage })))
const BackupPage        = lazy(() => import('@/components/pages/BackupPage').then(m => ({ default: m.BackupPage })))
const AuditLogPage      = lazy(() => import('@/components/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))
const UsersPage         = lazy(() => import('@/components/pages/UsersPage').then(m => ({ default: m.UsersPage })))

function PlaceholderPage({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><i className={`fas ${icon}`} /> {title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <i className={`fas ${icon}`} style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Em desenvolvimento</div>
        <div style={{ fontSize: 13 }}>Esta seção estará disponível em breve.</div>
      </div>
    </div>
  )
}

function Shell() {
  const { user, page, isAdmin } = useApp()

  if (!user) return <AuthScreen />

  // Bloqueio de rota: não-admin não acessa Despesas Fixas
  let effectivePage = page
  if (!isAdmin && page === 'fixedExpenses') effectivePage = 'dashboard'
  if (!isAdmin && page === 'users') effectivePage = 'dashboard'

  const fallback = (
    <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
      <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />
      Carregando…
    </div>
  )

  let content: React.ReactNode = null
  switch (effectivePage) {
    case 'dashboard':      content = <DashboardPage />; break
    case 'tasks':          content = <TasksPage />; break
    case 'companies':      content = <CompaniesPage />; break
    case 'emConstrucao':   content = <EmConstrucaoPage />; break
    case 'employees':      content = <EmployeesPage />; break
    case 'documents':      content = <DocumentsPage />; break
    case 'billing':        content = <BillingPage />; break
    case 'orgchart':       content = <OrgChartPage />; break
    case 'valuations':     content = <ValuationsPage />; break
    case 'personalDocs':   content = <PersonalDocsPage />; break
    case 'lifeInsurance':  content = <LifeInsurancePage />; break
    case 'carInsurance':   content = <CarInsurancePage />; break
    case 'aptInsurance':   content = <AptInsurancePage />; break
    case 'investments':    content = <InvestmentsPage />; break
    case 'realEstate':     content = <RealEstatePage />; break
    case 'bensMoveis':     content = <BensMoveisPage />; break
    case 'bensImoveis':    content = <PlaceholderPage title="Bens Imóveis" subtitle="Em breve: gestão de imóveis." icon="fa-building-user" />; break
    case 'relatoriosPatr': content = <PlaceholderPage title="Relatórios" subtitle="Em breve: relatórios consolidados de patrimônio." icon="fa-chart-column" />; break
    case 'fixedExpenses':  content = <FixedExpensesPage />; break
    case 'fairsEvents':    content = <FairsEventsPage />; break
    case 'juridico':       content = <JuridicoPage />; break
    case 'acordoGaveta':   content = <AcordoGavetaPage />; break
    case 'trademarks':     content = <TrademarksPage />; break
    case 'fiscalTax':      content = <FiscalTaxPage />; break
    case 'taxPlanning':    content = <TaxPlanningPage />; break
    case 'checkBox':       content = <CheckBoxPage />; break
    case 'backup':         content = <BackupPage />; break
    case 'auditLog':       content = <AuditLogPage />; break
    case 'users':          content = <UsersPage />; break
    default:               content = <DashboardPage />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <Suspense fallback={fallback}>{content}</Suspense>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
