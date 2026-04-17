// ============================================================
// main.js — App root, Provider, Router, ReactDOM.render
// ============================================================

function App() {
  const [user, setUser]         = useState(null);
  const [page, setPage]         = useState('dashboard');
  const [lang, setLang]         = useState('pt-BR');
  const [currency, setCurrency] = useState('BRL');
  const [toasts, setToasts]     = useState([]);
  const [dbReady, setDbReady]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Carrega prefs do Supabase após login
  useEffect(() => {
    if (!user) {
      setDbReady(true); // sem usuário → mostra AuthScreen imediatamente
      return;
    }
    setDbReady(false);
    db.config.get('prefs').then(rec => {
      if (rec?.value) {
        setLang(rec.value.lang || 'pt-BR');
        setCurrency(rec.value.currency || 'BRL');
      }
      setDbReady(true);
    }).catch(() => setDbReady(true));
  }, [user]);

  useEffect(() => {
    if (!user || !dbReady) return;
    db.config.put({ chave: 'prefs', value: { lang, currency } });
  }, [lang, currency]);

  const t = TRANSLATIONS[lang];

  function toast(msg, type = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  const PAGE_TITLES = {
    dashboard: t.dashboard,
    companies: t.companies,
    employees: t.employees,
    documents: t.documents,
    billing:   t.billing,
    orgchart:  t.orgchart,
    backup:    t.backup,
    auditLog:  t.auditLog,
  };

  function renderPage() {
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'companies': return <CompaniesPage />;
      case 'employees': return <EmployeesPage />;
      case 'documents': return <DocumentsPage />;
      case 'billing':   return <BillingPage />;
      case 'orgchart':  return <OrgChartPage />;
      case 'backup':    return <BackupPage />;
      case 'auditLog':  return <AuditLogPage />;
      default:          return <DashboardPage />;
    }
  }

  if (!dbReady) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'var(--surface)' }}>
        <div style={{ fontFamily:'Playfair Display', fontSize:26, fontWeight:800 }}>Hub<span style={{color:'var(--brand)'}}>.</span></div>
        <div style={{ color:'var(--text-muted)', fontSize:13 }}><i className="fas fa-spinner fa-spin" style={{marginRight:8}}/>Inicializando banco de dados...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <AppContext.Provider value={{ t, lang, setLang, currency, setCurrency, toast }}>
        <AuthScreen onLogin={(u) => setUser(u)} lang={lang} setLang={setLang} />
        <ToastContainer toasts={toasts} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ t, lang, setLang, currency, setCurrency, toast }}>
      <div className="app-layout">
        <Sidebar
          page={page}
          setPage={setPage}
          t={t}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={async () => {
            try { await db.auditLog.add({ acao: 'Logout realizado', modulo: 'Auth', timestamp: new Date().toISOString() }); } catch(_) {}
            await supabaseSignOut();
            setUser(null);
            setDbReady(false);
          }}
        />
        <div className="main-area">
          <Topbar
            title={PAGE_TITLES[page] || t.dashboard}
            lang={lang}
            setLang={setLang}
            currency={currency}
            setCurrency={setCurrency}
            t={t}
            onMenuOpen={() => setSidebarOpen(true)}
          />
          {renderPage()}
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </AppContext.Provider>
  );
}

// ── Error boundary ───────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'#0f1117', padding:32, fontFamily:'Lexend, sans-serif' }}>
          <div style={{ fontFamily:'Playfair Display', fontSize:26, fontWeight:800, color:'#f1f3f9' }}>Hub<span style={{color:'#6470f1'}}>.</span></div>
          <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:12, padding:'16px 24px', maxWidth:600, width:'100%' }}>
            <div style={{ color:'#ef4444', fontWeight:700, marginBottom:8 }}>Erro ao carregar o aplicativo</div>
            <pre style={{ color:'#fca5a5', fontSize:12, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{String(this.state.error)}</pre>
          </div>
          <button
            onClick={() => { indexedDB.deleteDatabase('HubEmpresarial'); window.location.reload(); }}
            style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'Lato', fontWeight:600 }}
          >Resetar banco de dados e recarregar</button>
          <p style={{ color:'#525d72', fontSize:12, textAlign:'center' }}>Se o erro persistir, clique no botão acima para resetar o banco de dados local.<br/>Isso apagará os dados de demonstração e os recriará automaticamente.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Bootstrap ────────────────────────────────────────────────
const rootEl = document.getElementById('root');
const reactRoot = ReactDOM.createRoot(rootEl);
reactRoot.render(<ErrorBoundary><App /></ErrorBoundary>);
