// ── Topbar ───────────────────────────────────────────────────
function Topbar({ title, lang, setLang, currency, setCurrency, t, onMenuOpen }) {
  const { theme, toggle } = useTheme();
  const now = new Date();
  const tzBR = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const tzUS = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
  const isDark = theme === 'dark';
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuOpen} title={t.openMenu} aria-label={t.openMenu}>
        <i className="fas fa-bars" style={{fontSize:15}}/>
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-tz" style={{fontSize:11,color:'var(--text-muted)',display:'flex',gap:10,alignItems:'center'}}>
        <span><i className="fas fa-circle" style={{color:'var(--green)',fontSize:6,marginRight:4}}/>BR {tzBR}</span>
        <span><i className="fas fa-circle" style={{color:'var(--blue)',fontSize:6,marginRight:4}}/>US {tzUS}</span>
      </span>
      <span className="topbar-pills-group">
        <button className={`topbar-pill ${currency==='BRL'?'active':''}`} onClick={()=>setCurrency('BRL')}>BRL</button>
        <button className={`topbar-pill ${currency==='USD'?'active':''}`} onClick={()=>setCurrency('USD')}>USD</button>
        <button className={`topbar-pill ${lang==='pt-BR'?'active':''}`} onClick={()=>setLang('pt-BR')}>PT</button>
        <button className={`topbar-pill ${lang==='en-US'?'active':''}`} onClick={()=>setLang('en-US')}>EN</button>
      </span>
      {/* Theme toggle */}
      <button className="theme-toggle" onClick={toggle} title={isDark ? t.lightTheme : t.darkTheme} aria-label="Alternar tema">
        <span className="theme-toggle-thumb">
          <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'}`}/>
        </span>
        <span className="theme-toggle-label">{isDark ? t.darkTheme : t.lightTheme}</span>
      </button>
    </header>
  );
}
