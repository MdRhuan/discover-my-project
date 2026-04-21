import { useApp } from '@/context/AppContext'

export function FairsEventsPage() {
  const { } = useApp()

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Feiras & Eventos</div>
          <div className="page-header-sub">Gestão de feiras e eventos</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, color: 'var(--text-muted)' }}>
        <i className="fas fa-ticket" style={{ fontSize: 48, opacity: 0.3 }} />
        <div style={{ fontSize: 16, fontWeight: 500 }}>Em breve</div>
        <div style={{ fontSize: 13 }}>Esta seção está sendo desenvolvida.</div>
      </div>
    </div>
  )
}
