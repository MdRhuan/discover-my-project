// ── Sidebar ──────────────────────────────────────────────────
const NAV_STRUCTURE = [
  // Top-level items (no section)
  { key: 'dashboard', icon: 'fa-gauge-high',    label: { pt: 'Dashboard',         en: 'Dashboard'         }, section: null },
  { key: 'tasks',     icon: 'fa-list-check',    label: { pt: 'Tasks & Deadlines', en: 'Tasks & Deadlines' }, section: null },

  // ── EMPRESAS ──────────────────────────────────────────────
  {
    key: 'sec-empresas', type: 'section', label: { pt: 'Empresas', en: 'Companies' },
    children: [
      { key: 'companies', icon: 'fa-building', label: { pt: 'Empresas', en: 'Companies' } },
      { key: 'orgchart',   icon: 'fa-sitemap',    label: { pt: 'Organograma',  en: 'Org Chart'   } },
      { key: 'valuations', icon: 'fa-chart-line', label: { pt: 'Valuations',   en: 'Valuations'  } },
    ],
  },

  // ── PESSOAL ───────────────────────────────────────────────
  {
    key: 'sec-pessoal', type: 'section', label: { pt: 'Pessoal', en: 'Personal' },
    children: [
      {
        key: 'baseIdentidade', icon: 'fa-id-card', label: { pt: 'Base & Identidade', en: 'Base & Identity' },
        children: [
          { key: 'personalDocs', icon: 'fa-passport', label: { pt: 'Documentos pessoais', en: 'Personal Documents' } },
        ],
      },
      {
        key: 'saudeQV', icon: 'fa-heart-pulse', label: { pt: 'Seguros', en: 'Insurance' },
        children: [
          { key: 'lifeInsurance',icon: 'fa-shield-heart',  label: { pt: 'Seguro de vida',        en: 'Life Insurance' } },
          { key: 'carInsurance', icon: 'fa-car',           label: { pt: 'Seguro do carro',       en: 'Car Insurance'  } },
          { key: 'aptInsurance', icon: 'fa-building',      label: { pt: 'Seguro do apartamento', en: 'Apt Insurance'  } },
        ],
      },
      {
        key: 'estruturaPessoal', icon: 'fa-users', label: { pt: 'Estrutura pessoal', en: 'Personal Structure' },
        children: [
          { key: 'employees', icon: 'fa-user-tie', label: { pt: 'Funcionários pessoais', en: 'Personal Employees' } },
        ],
      },
      {
        key: 'financeiroPatrimonio', icon: 'fa-coins', label: { pt: 'Financeiro & Patrimônio', en: 'Finance & Assets' },
        children: [
          { key: 'investments', icon: 'fa-chart-pie', label: { pt: 'Investimentos',      en: 'Investments' } },
          { key: 'realEstate',  icon: 'fa-house',     label: { pt: 'Imóveis & Mortgage', en: 'Real Estate' } },
        ],
      },
      {
        key: 'juridicoLegal', icon: 'fa-scale-balanced', label: { pt: 'Jurídico & Estrutura Legal', en: 'Legal Structure' },
        children: [
          { key: 'juridico',       icon: 'fa-gavel',       label: { pt: 'Jurídico',          en: 'Legal'                    } },
          { key: 'acordoGaveta',   icon: 'fa-handshake',   label: { pt: 'Acordo de gaveta',  en: 'Side Agreement'           } },
          { key: 'trademarks',     icon: 'fa-trademark',   label: { pt: 'Registro de Marca', en: 'Trademark Registration'   } },
        ],
      },
      {
        key: 'fiscalBRUS', icon: 'fa-receipt', label: { pt: 'Fiscal BR vs US', en: 'Fiscal BR vs US' },
        children: [
          { key: 'fiscalTax',     icon: 'fa-file-invoice-dollar', label: { pt: 'Tax Return – IRS', en: 'Tax Return – IRS' } },
          { key: 'taxPlanning',   icon: 'fa-chess',               label: { pt: 'Tax planning',     en: 'Tax Planning'    } },
        ],
      },
      {
        key: 'rotinasControles', icon: 'fa-rotate', label: { pt: 'Rotinas & Controles', en: 'Routines & Controls' },
        children: [
          { key: 'checkBox', icon: 'fa-square-check', label: { pt: 'Check-the-box', en: 'Check-the-box' } },
        ],
      },
      { key: 'fixedExpenses', icon: 'fa-file-invoice', label: { pt: 'Despesas Fixas', en: 'Fixed Expenses' } },
    ],
  },

  // ── FERRAMENTAS ───────────────────────────────────────────
  {
    key: 'sec-tools', type: 'section', label: { pt: 'Ferramentas', en: 'Tools' },
    children: [
      { key: 'backup',   icon: 'fa-database',      label: { pt: 'Backup',    en: 'Backup'    } },
      { key: 'auditLog', icon: 'fa-shield-halved',  label: { pt: 'Auditoria', en: 'Audit Log' } },
    ],
  },
];

function NavItem({ item, page, setPage, onClose, lang, depth = 0 }) {
  const isActive = page === item.key || (item.children && item.children.some(c => c.key === page || (c.children && c.children.some(cc => cc.key === page))));
  const [open, setOpen] = React.useState(isActive);

  if (item.type === 'section') {
    return (
      <div>
        <div className="sidebar-section">{item.label[lang === 'en-US' ? 'en' : 'pt']}</div>
        {item.children.map(child => (
          <NavItem key={child.key} item={child} page={page} setPage={setPage} onClose={onClose} lang={lang} depth={0} />
        ))}
      </div>
    );
  }

  const hasChildren = item.children && item.children.length > 0;
  const isLeafActive = page === item.key;

  if (hasChildren) {
    const isNavigable = !!item.key && !item.key.startsWith('sec-') && !['baseIdentidade','saudeQV','estruturaPessoal','financeiroPatrimonio','juridicoLegal','fiscalBRUS','rotinasControles'].includes(item.key);
    return (
      <div>
        <div
          className={`nav-item nav-item-parent ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 14 + depth * 12, display:'flex', alignItems:'center', cursor:'pointer' }}
        >
          {isNavigable ? (
            <button
              style={{ background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:8, flex:1, cursor:'pointer', color:'inherit', font:'inherit', textAlign:'left', minWidth:0 }}
              onClick={() => { setPage(item.key); onClose(); setOpen(true); }}
            >
              <i className={`fas ${item.icon}`} style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}/>
              <span style={{ flex: 1 }}>{item.label[lang === 'en-US' ? 'en' : 'pt']}</span>
            </button>
          ) : (
            <span style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }} onClick={() => setOpen(v => !v)}>
              <i className={`fas ${item.icon}`} style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}/>
              <span style={{ flex: 1 }}>{item.label[lang === 'en-US' ? 'en' : 'pt']}</span>
            </span>
          )}
          <i className={`fas fa-chevron-${open ? 'down' : 'right'}`}
            style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, padding:'0 4px', cursor:'pointer' }}
            onClick={() => setOpen(v => !v)}
          />
        </div>
        {open && (
          <div className="nav-submenu">
            {item.children.map(child => (
              <NavItem key={child.key} item={child} page={page} setPage={setPage} onClose={onClose} lang={lang} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`nav-item nav-item-leaf ${isLeafActive ? 'active' : ''}`}
      style={{ paddingLeft: 14 + depth * 14 }}
      onClick={() => { setPage(item.key); onClose(); }}
    >
      <i className={`fas ${item.icon}`} style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}/>
      <span>{item.label[lang === 'en-US' ? 'en' : 'pt']}</span>
    </button>
  );
}

function Sidebar({ page, setPage, open, onClose, lang }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose}/>}
      <nav className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span>Hub<span style={{color:'var(--brand)'}}>.</span><br/><small>Eduardo Vanzak</small></span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {NAV_STRUCTURE.map(item => (
            <NavItem key={item.key} item={item} page={page} setPage={setPage} onClose={onClose} lang={lang} />
          ))}
        </div>
      </nav>
    </>
  );
}
