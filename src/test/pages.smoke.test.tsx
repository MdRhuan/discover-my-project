/**
 * Sequential page smoke test.
 *
 * Renders the full App once, then navigates programmatically through every
 * page key. After each navigation we wait for Suspense to resolve and assert
 * the ErrorBoundary fallback never appears.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { mockSupabaseClient } from './mockSupabase'

// --- Mock Supabase BEFORE importing anything that touches it ---
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getSupabase: () => mockSupabaseClient,
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}))

// Mock db helpers so every table read resolves to []
vi.mock('@/lib/db', () => {
  const tableMock: any = {
    toArray: async () => [],
    add: async () => 1,
    update: async () => {},
    delete: async () => {},
    get: async () => null,
    put: async () => {},
    where: () => ({
      equals: () => ({
        toArray: async () => [],
        delete: async () => {},
        first: async () => null,
      }),
    }),
    bulkAdd: async () => [],
    clear: async () => {},
    count: async () => 0,
  }
  return {
    db: new Proxy({}, { get: () => tableMock }),
    supabaseSignOut: async () => {},
    uploadFile: async () => 'mock/path',
    downloadFile: async () => new Blob(),
    deleteFile: async () => {},
    getFileUrl: async () => 'https://mock',
  }
})

// Stub heavy chart libs that misbehave under jsdom
vi.mock('chart.js', () => {
  class Stub { destroy() {} update() {} resize() {} }
  return {
    Chart: Stub,
    registerables: [],
    CategoryScale: Stub, LinearScale: Stub, BarElement: Stub,
    Title: Stub, Tooltip: Stub, Legend: Stub, ArcElement: Stub,
    PointElement: Stub, LineElement: Stub, Filler: Stub,
    DoughnutController: Stub, BarController: Stub,
    LineController: Stub, PieController: Stub,
  }
})

vi.mock('react-chartjs-2', () => ({
  Bar: () => null, Line: () => null, Pie: () => null,
  Doughnut: () => null, Chart: () => null,
}))

vi.mock('reactflow', async () => {
  const React = await import('react')
  const Pass = ({ children }: any) => React.createElement('div', null, children)
  return {
    __esModule: true,
    default: Pass,
    ReactFlow: Pass,
    ReactFlowProvider: Pass,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    useNodesState: () => [[], () => {}, () => {}],
    useEdgesState: () => [[], () => {}, () => {}],
    useReactFlow: () => ({
      fitView: () => {}, zoomIn: () => {}, zoomOut: () => {},
      setViewport: () => {}, getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      project: (p: any) => p, screenToFlowPosition: (p: any) => p,
    }),
    addEdge: (e: any, edges: any[]) => [...edges, e],
    applyEdgeChanges: (_c: any, edges: any[]) => edges,
    applyNodeChanges: (_c: any, nodes: any[]) => nodes,
    MarkerType: { Arrow: 'arrow', ArrowClosed: 'arrowclosed' },
    ConnectionMode: { Loose: 'loose', Strict: 'strict' },
    BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  }
})

// Now import after mocks
import { AppProvider, useApp } from '@/context/AppContext'
import App from '@/App'
import type { PageKey } from '@/types'

const ALL_PAGES: PageKey[] = [
  'dashboard', 'tasks', 'companies', 'emConstrucao', 'employees',
  'documents', 'billing', 'orgchart', 'valuations', 'personalDocs',
  'lifeInsurance', 'carInsurance', 'aptInsurance', 'investments',
  'realEstate', 'bensMoveis', 'fixedExpenses', 'fairsEvents',
  'juridico', 'acordoGaveta', 'trademarks', 'fiscalTax',
  'taxPlanning', 'checkBox', 'backup', 'auditLog', 'users',
]

// Helper that exposes setPage to the test
let driver: { setPage: (p: PageKey) => void } | null = null
function NavigationDriver() {
  const { setPage } = useApp()
  driver = { setPage }
  return null
}

// Re-export the App as a tree we can mount with a driver injected
function TestTree() {
  return (
    <AppProvider>
      <NavigationDriver />
      {/* Mount App as a sibling — it has its own AppProvider but useApp resolves
          to the *nearest* provider, which for both subtrees is the outer one
          ONLY if App didn't wrap its own. Since App DOES wrap its own provider,
          we instead skip App and render the Shell directly via App's default. */}
      <AppShellForTests />
    </AppProvider>
  )
}

// Inline a minimal Shell that mirrors App's rendering logic, sharing our outer
// AppProvider so the driver can navigate.
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const pages = {
  dashboard:      lazy(() => import('@/components/pages/DashboardPage').then(m => ({ default: m.DashboardPage }))),
  tasks:          lazy(() => import('@/components/pages/TasksPage').then(m => ({ default: m.TasksPage }))),
  companies:      lazy(() => import('@/components/pages/CompaniesPage').then(m => ({ default: m.CompaniesPage }))),
  emConstrucao:   lazy(() => import('@/components/pages/EmConstrucaoPage').then(m => ({ default: m.EmConstrucaoPage }))),
  employees:      lazy(() => import('@/components/pages/EmployeesPage').then(m => ({ default: m.EmployeesPage }))),
  documents:      lazy(() => import('@/components/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage }))),
  billing:        lazy(() => import('@/components/pages/BillingPage').then(m => ({ default: m.BillingPage }))),
  orgchart:       lazy(() => import('@/components/pages/OrgChartPage').then(m => ({ default: m.OrgChartPage }))),
  valuations:     lazy(() => import('@/components/pages/ValuationsPage').then(m => ({ default: m.ValuationsPage }))),
  personalDocs:   lazy(() => import('@/components/pages/PersonalDocsPage').then(m => ({ default: m.PersonalDocsPage }))),
  lifeInsurance:  lazy(() => import('@/components/pages/LifeInsurancePage').then(m => ({ default: m.LifeInsurancePage }))),
  carInsurance:   lazy(() => import('@/components/pages/CarInsurancePage').then(m => ({ default: m.CarInsurancePage }))),
  aptInsurance:   lazy(() => import('@/components/pages/AptInsurancePage').then(m => ({ default: m.AptInsurancePage }))),
  investments:    lazy(() => import('@/components/pages/InvestmentsPage').then(m => ({ default: m.InvestmentsPage }))),
  realEstate:     lazy(() => import('@/components/pages/RealEstatePage').then(m => ({ default: m.RealEstatePage }))),
  bensMoveis:     lazy(() => import('@/components/pages/BensMoveisPage').then(m => ({ default: m.BensMoveisPage }))),
  fixedExpenses:  lazy(() => import('@/components/pages/FixedExpensesPage').then(m => ({ default: m.FixedExpensesPage }))),
  fairsEvents:    lazy(() => import('@/components/pages/FairsEventsPage').then(m => ({ default: m.FairsEventsPage }))),
  juridico:       lazy(() => import('@/components/pages/JuridicoPage').then(m => ({ default: m.JuridicoPage }))),
  acordoGaveta:   lazy(() => import('@/components/pages/AcordoGavetaPage').then(m => ({ default: m.AcordoGavetaPage }))),
  trademarks:     lazy(() => import('@/components/pages/TrademarksPage').then(m => ({ default: m.TrademarksPage }))),
  fiscalTax:      lazy(() => import('@/components/pages/FiscalTaxPage').then(m => ({ default: m.FiscalTaxPage }))),
  taxPlanning:    lazy(() => import('@/components/pages/TaxPlanningPage').then(m => ({ default: m.TaxPlanningPage }))),
  checkBox:       lazy(() => import('@/components/pages/CheckBoxPage').then(m => ({ default: m.CheckBoxPage }))),
  backup:         lazy(() => import('@/components/pages/BackupPage').then(m => ({ default: m.BackupPage }))),
  auditLog:       lazy(() => import('@/components/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage }))),
  users:          lazy(() => import('@/components/pages/UsersPage').then(m => ({ default: m.UsersPage }))),
} as const

function AppShellForTests() {
  const { page } = useApp()
  const Comp = (pages as any)[page] ?? pages.dashboard
  return (
    <ErrorBoundary resetKey={page}>
      <Suspense fallback={<div data-testid="suspense-fallback">loading</div>}>
        <Comp />
      </Suspense>
    </ErrorBoundary>
  )
}

describe('Sequential page navigation smoke test', () => {
  it('App imports cleanly (no module-load errors)', () => {
    expect(App).toBeTruthy()
  })

  it('mounts every page in sequence without triggering the ErrorBoundary', async () => {
    const { container } = render(<TestTree />)

    // Wait for the driver to mount and the first page to render
    await waitFor(() => expect(driver).not.toBeNull(), { timeout: 5000 })

    const failures: string[] = []

    for (const pageKey of ALL_PAGES) {
      // Navigate
      await act(async () => {
        driver!.setPage(pageKey)
      })

      // Wait for Suspense lazy chunk to resolve
      await waitFor(
        () => {
          const fallback = container.querySelector('[data-testid="suspense-fallback"]')
          expect(fallback).toBeNull()
        },
        { timeout: 8000 }
      )

      // Allow microtasks for first render to settle
      await act(async () => {
        await new Promise(r => setTimeout(r, 30))
      })

      // ErrorBoundary fallback check: text "Erro ao renderizar a página"
      const errorText = container.textContent ?? ''
      if (errorText.includes('Erro ao renderizar a página')) {
        failures.push(pageKey)
      }
    }

    expect(
      failures,
      `Pages that crashed during sequential navigation: ${failures.join(', ')}`
    ).toEqual([])
  }, 120000)
})
