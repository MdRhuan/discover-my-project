// ── Fixed Expenses Page ────────────────────────────────────
function FixedExpensesPage() {
  const { t, lang, toast } = useApp();
  const [paisFiltro, setPaisFiltro] = useState('all');
  const [mesFiltro, setMesFiltro]   = useState(new Date().toISOString().slice(0,7));
  const [activeCategoria, setActiveCategoria] = useState(null);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [confirm, setConfirm] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const pieUSRef  = useRef(null); const pieUSInst  = useRef(null);
  const pieBRRef  = useRef(null); const pieBRInst  = useRef(null);
  const pieGlRef  = useRef(null); const pieGlInst  = useRef(null);
  const lineRef   = useRef(null); const lineInst   = useRef(null);

  const [USD_TO_BRL, setUsdToBrl] = useState(5.05);
  const [cotacaoInfo, setCotacaoInfo] = useState(null); // { valor, hora, loading, erro }

  useEffect(() => {
    setCotacaoInfo(c => ({ ...c, loading: true, erro: null }));
    fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
      .then(r => r.json())
      .then(data => {
        const rate = parseFloat(data.USDBRL.bid);
        const dt   = new Date(parseInt(data.USDBRL.timestamp) * 1000);
        const hora = dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        setUsdToBrl(rate);
        setCotacaoInfo({ valor: rate, hora, loading: false, erro: null });
      })
      .catch(() => {
        setCotacaoInfo({ valor: 5.05, hora: null, loading: false, erro: 'Falha ao buscar cotação' });
      });
  }, []);

  const CATEGORIAS = [
    { key: 'Moradia',             icon: 'fa-house',             colorVar: 'var(--brand)',   bg: 'var(--brand-dim)',          chartColor: '#4f63e7' },
    { key: 'Funcionários',        icon: 'fa-user-tie',          colorVar: 'var(--blue)',    bg: 'rgba(59,130,246,.12)',      chartColor: '#0ea5e9' },
    { key: 'Transporte',          icon: 'fa-car',               colorVar: 'var(--green)',   bg: 'rgba(34,197,94,.12)',       chartColor: '#10b981' },
    { key: 'Seguros',             icon: 'fa-shield-halved',     colorVar: 'var(--yellow)',  bg: 'rgba(245,158,11,.12)',      chartColor: '#f59e0b' },
    { key: 'Assinaturas',         icon: 'fa-credit-card',       colorVar: 'var(--orange)',  bg: 'rgba(249,115,22,.12)',      chartColor: '#f97316' },
    { key: 'Contábil / Fiscal',   icon: 'fa-calculator',        colorVar: '#a78bfa',        bg: 'rgba(167,139,250,.12)',     chartColor: '#8b5cf6' },
    { key: 'Educação',            icon: 'fa-graduation-cap',    colorVar: 'var(--red)',     bg: 'rgba(239,68,68,.12)',       chartColor: '#f43f5e' },
    { key: 'Outros',              icon: 'fa-ellipsis',          colorVar: 'var(--text-muted)', bg: 'var(--surface-hover)',  chartColor: '#64748b' },
  ];

  const DEFAULT_DESPESAS = [
    // ── MORADIA ─────────────────────────────────────────────
    { id:1,  nome:'Mortgage — Miami Beach',          categoria:'Moradia',           pais:'US', moeda:'USD', valor:'4200', recorrencia:'mensal',  ativo:true, notas:'Wells Fargo' },
    { id:2,  nome:'Condomínio — Oscar Freire SP',    categoria:'Moradia',           pais:'BR', moeda:'BRL', valor:'3200', recorrencia:'mensal',  ativo:true, notas:'' },
    { id:3,  nome:'HOA — Miami Beach',               categoria:'Moradia',           pais:'US', moeda:'USD', valor:'950',  recorrencia:'mensal',  ativo:true, notas:'' },
    { id:4,  nome:'IPTU São Paulo (parcela)',         categoria:'Moradia',           pais:'BR', moeda:'BRL', valor:'1800', recorrencia:'mensal',  ativo:true, notas:'10x' },
    { id:5,  nome:'Property Tax — Miami (parcela)',  categoria:'Moradia',           pais:'US', moeda:'USD', valor:'610',  recorrencia:'mensal',  ativo:true, notas:'7x' },
    // ── FUNCIONÁRIOS ────────────────────────────────────────
    { id:6,  nome:'Diarista (2x/semana)',             categoria:'Funcionários',      pais:'BR', moeda:'BRL', valor:'1600', recorrencia:'mensal',  ativo:true, notas:'' },
    { id:7,  nome:'Motorista pessoal',                categoria:'Funcionários',      pais:'BR', moeda:'BRL', valor:'5800', recorrencia:'mensal',  ativo:true, notas:'CLT' },
    { id:8,  nome:'Housekeeper — Miami',             categoria:'Funcionários',      pais:'US', moeda:'USD', valor:'800',  recorrencia:'mensal',  ativo:true, notas:'Bi-weekly' },
    // ── TRANSPORTE ──────────────────────────────────────────
    { id:9,  nome:'Financiamento BMW SP',            categoria:'Transporte',        pais:'BR', moeda:'BRL', valor:'4200', recorrencia:'mensal',  ativo:true, notas:'48x' },
    { id:10, nome:'Lease Tesla Model Y — Miami',    categoria:'Transporte',        pais:'US', moeda:'USD', valor:'1150', recorrencia:'mensal',  ativo:true, notas:'' },
    { id:11, nome:'Gasolina SP',                     categoria:'Transporte',        pais:'BR', moeda:'BRL', valor:'800',  recorrencia:'mensal',  ativo:true, notas:'Estimativa' },
    { id:12, nome:'Gasolina / Gas Miami',            categoria:'Transporte',        pais:'US', moeda:'USD', valor:'320',  recorrencia:'mensal',  ativo:true, notas:'' },
    // ── SEGUROS ─────────────────────────────────────────────
    { id:13, nome:'Seguro de vida (BR)',             categoria:'Seguros',           pais:'BR', moeda:'BRL', valor:'1200', recorrencia:'mensal',  ativo:true, notas:'' },
    { id:14, nome:'Life Insurance (US)',             categoria:'Seguros',           pais:'US', moeda:'USD', valor:'420',  recorrencia:'mensal',  ativo:true, notas:'' },
    { id:15, nome:'Seguro auto BMW',                 categoria:'Seguros',           pais:'BR', moeda:'BRL', valor:'650',  recorrencia:'mensal',  ativo:true, notas:'' },
    { id:16, nome:'Auto Insurance Tesla',            categoria:'Seguros',           pais:'US', moeda:'USD', valor:'280',  recorrencia:'mensal',  ativo:true, notas:'' },
    { id:17, nome:'Home Insurance Miami',            categoria:'Seguros',           pais:'US', moeda:'USD', valor:'360',  recorrencia:'mensal',  ativo:true, notas:'' },
    { id:18, nome:'Plano de saúde (BR)',             categoria:'Seguros',           pais:'BR', moeda:'BRL', valor:'3800', recorrencia:'mensal',  ativo:true, notas:'Família' },
    // ── ASSINATURAS ─────────────────────────────────────────
    { id:19, nome:'Netflix',                         categoria:'Assinaturas',       pais:'US', moeda:'USD', valor:'22',   recorrencia:'mensal',  ativo:true, notas:'' },
    { id:20, nome:'Spotify',                         categoria:'Assinaturas',       pais:'BR', moeda:'BRL', valor:'25',   recorrencia:'mensal',  ativo:true, notas:'' },
    { id:21, nome:'Amazon Prime',                    categoria:'Assinaturas',       pais:'US', moeda:'USD', valor:'15',   recorrencia:'mensal',  ativo:true, notas:'' },
    { id:22, nome:'Apple One',                       categoria:'Assinaturas',       pais:'US', moeda:'USD', valor:'37',   recorrencia:'mensal',  ativo:true, notas:'' },
    { id:23, nome:'iCloud / Google One',             categoria:'Assinaturas',       pais:'BR', moeda:'BRL', valor:'45',   recorrencia:'mensal',  ativo:true, notas:'' },
    { id:24, nome:'Office 365',                      categoria:'Assinaturas',       pais:'US', moeda:'USD', valor:'10',   recorrencia:'mensal',  ativo:true, notas:'' },
    // ── CONTÁBIL / FISCAL ───────────────────────────────────
    { id:25, nome:'Contabilidade BR (honorários)',   categoria:'Contábil / Fiscal', pais:'BR', moeda:'BRL', valor:'3500', recorrencia:'mensal',  ativo:true, notas:'' },
    { id:26, nome:'CPA / Tax Advisor — US',         categoria:'Contábil / Fiscal', pais:'US', moeda:'USD', valor:'800',  recorrencia:'mensal',  ativo:true, notas:'Retainer mensal' },
    // ── EDUCAÇÃO ────────────────────────────────────────────
    { id:27, nome:'Escola internacional (criança)',  categoria:'Educação',          pais:'BR', moeda:'BRL', valor:'8500', recorrencia:'mensal',  ativo:true, notas:'' },
  ];

  const load = useCallback(async () => {
    const cfg = await db.config.get('fixedExpenses');
    setDespesas(cfg?.value || DEFAULT_DESPESAS);
  }, []);
  useEffect(() => { load(); }, []);

  // ── Calcular totais ──────────────────────────────────────
  const toUSD = (val, moeda) => moeda === 'BRL' ? val / USD_TO_BRL : val;
  const toBRL = (val, moeda) => moeda === 'USD' ? val * USD_TO_BRL : val;

  const ativas = React.useMemo(() => despesas.filter(d => d.ativo !== false), [despesas]);
  const totalUSD_US = React.useMemo(() => ativas.filter(d => d.pais === 'US').reduce((s,d) => s + parseFloat(d.valor||0), 0), [ativas]);
  const totalBRL_BR = React.useMemo(() => ativas.filter(d => d.pais === 'BR').reduce((s,d) => s + parseFloat(d.valor||0), 0), [ativas]);
  const totalGlobalUSD = React.useMemo(() => ativas.reduce((s,d) => s + toUSD(parseFloat(d.valor||0), d.moeda), 0), [ativas]);
  const totalGlobalBRL = React.useMemo(() => ativas.reduce((s,d) => s + toBRL(parseFloat(d.valor||0), d.moeda), 0), [ativas]);
  const pctUS = totalGlobalUSD > 0 ? (toUSD(totalUSD_US,'USD') / totalGlobalUSD * 100) : 0;
  const pctBR = totalGlobalUSD > 0 ? (toUSD(totalBRL_BR,'BRL') / totalGlobalUSD * 100) : 0;

  const despesasFiltradas = React.useMemo(() =>
    ativas.filter(d =>
      (paisFiltro === 'all' || d.pais === paisFiltro) &&
      (!activeCategoria || d.categoria === activeCategoria)
    ),
  [ativas, paisFiltro, activeCategoria]);

  // ── Totais por categoria ────────────────────────────────
  function totalCategoria(key, pais) {
    return ativas.filter(d => d.categoria === key && (pais === 'all' || d.pais === pais))
                 .reduce((s,d) => s + toUSD(parseFloat(d.valor||0), d.moeda), 0);
  }

  // ── Insights automáticos ────────────────────────────────
  const insights = [];
  if (pctUS > pctBR) insights.push(`${pctUS.toFixed(0)}% dos seus custos estão nos EUA`);
  else               insights.push(`${pctBR.toFixed(0)}% dos seus custos estão no Brasil`);
  const topCat = CATEGORIAS.map(c => ({ key: c.key, total: totalCategoria(c.key, 'all') })).sort((a,b)=>b.total-a.total)[0];
  if (topCat) insights.push(`Sua maior despesa é ${topCat.key} (${(topCat.total/totalGlobalUSD*100).toFixed(0)}%)`);
  insights.push(`Total global consolidado: ${fmt.currency(totalGlobalUSD,'USD',lang)} / mês`);
  const topUS = CATEGORIAS.map(c=>({key:c.key, t: totalCategoria(c.key,'US')})).sort((a,b)=>b.t-a.t)[0];
  if (topUS && topUS.t > 0) insights.push(`Nos EUA, ${topUS.key} lidera com ${fmt.currency(topUS.t,'USD',lang)}`);

  // ── Charts ──────────────────────────────────────────────
  function buildPie(ref, instRef, filterPais, moeda) {
    if (!ref.current) return;
    if (instRef.current) instRef.current.destroy();
    const labels = [], values = [], colors = [];
    CATEGORIAS.forEach(c => {
      const total = ativas.filter(d => d.categoria === c.key && (filterPais === 'all' || d.pais === filterPais))
                          .reduce((s,d) => s + toUSD(parseFloat(d.valor||0), d.moeda), 0);
      if (total > 0) { labels.push(c.key); values.push(total); colors.push(c.chartColor); }
    });
    instRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: 'transparent', hoverBorderColor: 'var(--surface-card)', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: 'var(--text-primary)', font: { family: 'Lexend', size: 10 }, boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: ctx => {
            const v = ctx.parsed; const sum = ctx.dataset.data.reduce((a,b)=>a+b,0);
            return ` ${ctx.label}: ${fmt.currency(v,'USD',lang)} (${(v/sum*100).toFixed(1)}%)`;
          }}}
        }
      }
    });
  }

  function buildLine(ref, instRef) {
    if (!ref.current) return;
    if (instRef.current) instRef.current.destroy();
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const base = totalGlobalUSD;
    const usData  = months.map((_,i) => parseFloat((toUSD(totalUSD_US,'USD') * (0.95 + Math.random()*0.1)).toFixed(0)));
    const brData  = months.map((_,i) => parseFloat((toUSD(totalBRL_BR,'BRL') * (0.95 + Math.random()*0.1)).toFixed(0)));
    instRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: '🇺🇸 EUA (USD)',    data: usData, backgroundColor: 'rgba(79,99,231,.82)',  borderRadius: 5, borderSkipped: false },
          { label: '🇧🇷 Brasil (USD)', data: brData, backgroundColor: 'rgba(16,185,129,.75)', borderRadius: 5, borderSkipped: false },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: 'var(--text-primary)', font: { family: 'Lexend', size: 11 } } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { family: 'Lexend', size: 11 } } },
          y: { stacked: true, grid: { color: 'var(--surface-border)' }, ticks: { color: 'var(--text-muted)', font: { family: 'Lexend', size: 11 }, callback: v => '$'+v.toLocaleString() } }
        }
      }
    });
  }

  useEffect(() => {
    if (!despesas.length) return;
    const tid = setTimeout(() => {
      buildPie(pieUSRef, pieUSInst, 'US', 'USD');
      buildPie(pieBRRef, pieBRInst, 'BR', 'BRL');
      buildPie(pieGlRef, pieGlInst, 'all', 'USD');
      buildLine(lineRef, lineInst);
    }, 80);
    return () => {
      clearTimeout(tid);
      [pieUSInst, pieBRInst, pieGlInst, lineInst].forEach(r => { if (r.current) { r.current.destroy(); r.current = null; } });
    };
  }, [despesas]);

  // ── CRUD ────────────────────────────────────────────────
  function openNew() {
    setForm({ id: Date.now(), nome:'', categoria:'Moradia', pais:'US', moeda:'USD', valor:'', recorrencia:'mensal', ativo:true, notas:'' });
    setModal('form');
  }
  function openEdit(d) { setForm({...d}); setModal('form'); }
  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.','error'); return; }
    const updated = despesas.find(d=>d.id===form.id) ? despesas.map(d=>d.id===form.id?form:d) : [...despesas,form];
    await db.config.put({ chave:'fixedExpenses', value: updated });
    toast(t.saved,'success'); setModal(null); load();
  }
  function handleDelete(id) {
    setConfirm({ msg: 'Deseja excluir esta despesa?', onConfirm: async () => {
      const updated = despesas.filter(d=>d.id!==id);
      await db.config.put({ chave:'fixedExpenses', value: updated });
      toast('Excluído!','success'); setConfirm(null); load();
    }});
  }

  const mesFmt = m => { const [y,mo] = m.split('-'); const nomes=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${nomes[parseInt(mo)-1]} ${y}`; };

  // Gera meses de Jan/2025 até 24 meses à frente do mês atual
  const MESES = (() => {
    const list = [];
    const start = new Date(2025, 0, 1);
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 24, 1);
    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return list;
  })();

  return (
    <div className="page-content">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{flexWrap:'wrap',gap:12}}>
        <div className="page-header-info">
          <div className="page-header-title">{t.fixedExpensesPage}</div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div className="page-header-sub">{ativas.length} {t.activeExpenses} · {mesFmt(mesFiltro)}</div>
            {cotacaoInfo?.loading && (
              <span style={{fontSize:11,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:4}}>
                <i className="fas fa-spinner fa-spin" style={{fontSize:10}}/>{t.fetchingRate}
              </span>
            )}
            {cotacaoInfo && !cotacaoInfo.loading && !cotacaoInfo.erro && (
              <span style={{fontSize:11,display:'flex',alignItems:'center',gap:5,background:'rgba(34,197,94,.10)',border:'1px solid rgba(34,197,94,.2)',borderRadius:6,padding:'2px 8px',color:'var(--green)',fontWeight:600}}>
                <i className="fas fa-circle" style={{fontSize:6}}/>
                USD 1 = R$ {cotacaoInfo.valor.toFixed(4)}
                <span style={{fontWeight:400,color:'var(--text-muted)',marginLeft:2}}>· {cotacaoInfo.hora}</span>
              </span>
            )}
            {cotacaoInfo?.erro && (
              <span style={{fontSize:11,color:'var(--yellow)',display:'flex',alignItems:'center',gap:4}}>
                <i className="fas fa-triangle-exclamation" style={{fontSize:10}}/>{t.fixedRate} R$ {USD_TO_BRL.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-select" style={{maxWidth:160}} value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}>
            {MESES.map(m=><option key={m} value={m}>{mesFmt(m)}</option>)}
          </select>
          <button className="btn btn-primary" style={{fontSize:12}} onClick={openNew}><i className="fas fa-plus"/>{t.newExpense}</button>
          <div style={{display:'flex',background:'var(--surface-hover)',borderRadius:10,padding:3,gap:2}}>
            {[{k:'all',l:'🌎 Global'},{k:'US',l:'🇺🇸 EUA'},{k:'BR',l:'🇧🇷 Brasil'}].map(p=>(
              <button key={p.k} onClick={()=>setPaisFiltro(p.k)}
                style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',
                  background: paisFiltro===p.k ? 'var(--surface-card)' : 'transparent',
                  color: paisFiltro===p.k ? 'var(--brand)' : 'var(--text-muted)',
                  boxShadow: paisFiltro===p.k ? '0 1px 4px rgba(0,0,0,.12)' : 'none'}}>
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Seção 1: KPI Cards ──────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,marginBottom:22}}>
        {[
          { label: t.globalTotal,     val: fmt.currency(totalGlobalUSD,'USD',lang), sub:`≈ ${fmt.currency(totalGlobalBRL,'BRL',lang)}`, icon:'fa-globe',              color:'var(--brand)',   bg:'var(--brand-dim)',         pct: null },
          { label: t.brazilTotal,     val: fmt.currency(totalBRL_BR,'BRL',lang),    sub:`≈ ${fmt.currency(toUSD(totalBRL_BR,'BRL'),'USD',lang)}`,         icon:'fa-brazilian-real-sign', color:'var(--green)',  bg:'rgba(34,197,94,.12)',      pct: pctBR },
          { label: t.usaTotal,        val: fmt.currency(totalUSD_US,'USD',lang),    sub:`≈ ${fmt.currency(toBRL(totalUSD_US,'USD'),'BRL',lang)}`,         icon:'fa-dollar-sign',         color:'var(--blue)',   bg:'rgba(59,130,246,.12)',     pct: pctUS },
          { label: t.activeExpenses,  val: ativas.length,                           sub:`${despesas.length - ativas.length} inativas`,                   icon:'fa-list-check',          color:'var(--yellow)', bg:'rgba(245,158,11,.12)',     pct: null },
        ].map(k => (
          <div key={k.label} className="card" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{k.label}</div>
                <div style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',lineHeight:1.1}}>{k.val}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:5,display:'flex',alignItems:'center',gap:6}}>
                  <span>{k.sub}</span>
                  {k.pct !== null && <span style={{color:'var(--brand)',fontWeight:700}}>{k.pct.toFixed(0)}% do total</span>}
                </div>
              </div>
              <div style={{width:40,height:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`fas ${k.icon}`} style={{fontSize:16,color:k.color}}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Seção 2: Visão por País ──────────────────────────── */}
      <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
        <i className="fas fa-earth-americas" style={{color:'var(--brand)',fontSize:13}}/>
        {t.distributionByCountry}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {[
          { ref: pieUSRef, flag:'🇺🇸', label:'EUA', sub: fmt.currency(totalUSD_US,'USD',lang), color:'var(--blue)' },
          { ref: pieBRRef, flag:'🇧🇷', label:'Brasil', sub: fmt.currency(totalBRL_BR,'BRL',lang), color:'var(--green)' },
        ].map(p => (
          <div key={p.label} className="card">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:20}}>{p.flag}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)'}}>{p.label}</div>
                <div style={{fontSize:12,color:p.color,fontWeight:700}}>{p.sub}</div>
              </div>
            </div>
            <div style={{height:220,position:'relative'}}><canvas ref={p.ref}/></div>
          </div>
        ))}
      </div>

      {/* Gráfico Consolidado */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <span style={{fontSize:20}}>🌎</span>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)'}}>{t.globalConsolidated}</div>
            <div style={{fontSize:12,color:'var(--brand)',fontWeight:700}}>{fmt.currency(totalGlobalUSD,'USD',lang)} / mês</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'center'}}>
          <div style={{height:240,position:'relative'}}><canvas ref={pieGlRef}/></div>
          {/* Insights */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
              <i className="fas fa-lightbulb" style={{color:'var(--yellow)',fontSize:12}}/>
              {t.autoInsights}
            </div>
            {insights.map((ins,i) => (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',background:'var(--surface-hover)',borderRadius:10,borderLeft:'3px solid var(--brand)'}}>
                <i className="fas fa-circle-check" style={{color:'var(--brand)',fontSize:11,marginTop:2,flexShrink:0}}/>
                <span style={{fontSize:12,color:'var(--text-primary)',lineHeight:1.5}}>{ins}</span>
              </div>
            ))}
            {/* Proporção BR vs US */}
            <div style={{padding:'12px 14px',background:'var(--surface-hover)',borderRadius:10,marginTop:4}}>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8,fontWeight:600}}>BR vs EUA (% do gasto global)</div>
              <div style={{display:'flex',height:10,borderRadius:6,overflow:'hidden',marginBottom:6}}>
                <div style={{width:`${pctBR}%`,background:'var(--green)',transition:'width .5s'}}/>
                <div style={{width:`${pctUS}%`,background:'var(--blue)',transition:'width .5s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:700}}>
                <span style={{color:'var(--green)'}}>🇧🇷 {pctBR.toFixed(0)}%</span>
                <span style={{color:'var(--blue)'}}>🇺🇸 {pctUS.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico Linha (evolução mensal) ─────────────────── */}
      <div className="card" style={{marginBottom:22}}>
        <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          <i className="fas fa-chart-column" style={{color:'var(--brand)',fontSize:13}}/>
          {t.monthlyEvolution}
          <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:400,marginLeft:4}}>valores em USD · dados ilustrativos</span>
        </div>
        <div style={{height:240,position:'relative'}}><canvas ref={lineRef}/></div>
      </div>

      {/* ── Grid de Categorias ───────────────────────────────── */}
      <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
        <i className="fas fa-grid-2" style={{color:'var(--brand)',fontSize:13}}/>
        {t.categories}
        {activeCategoria && (
          <button onClick={()=>setActiveCategoria(null)} style={{marginLeft:8,fontSize:11,padding:'3px 10px',borderRadius:6,border:'none',background:'var(--surface-hover)',color:'var(--text-muted)',cursor:'pointer'}}>
            <i className="fas fa-xmark" style={{marginRight:4}}/>{t.clearFilter}
          </button>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:22}}>
        {CATEGORIAS.map(cat => {
          const totalUsd = totalCategoria(cat.key, paisFiltro);
          if (totalUsd === 0 && paisFiltro !== 'all') return null;
          const pct = totalGlobalUSD > 0 ? (totalUsd / totalGlobalUSD * 100) : 0;
          const isActive = activeCategoria === cat.key;
          return (
            <button key={cat.key} onClick={()=>setActiveCategoria(isActive ? null : cat.key)}
              style={{display:'flex',flexDirection:'column',gap:10,textAlign:'left',padding:'14px 16px',background:isActive?'var(--surface-hover)':'var(--surface-card)',border:`1px solid ${isActive?'var(--brand)':'var(--surface-border)'}`,borderRadius:12,cursor:'pointer',transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{width:34,height:34,borderRadius:9,background:cat.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className={`fas ${cat.icon}`} style={{fontSize:14,color:cat.colorVar}}/>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:pct>30?'var(--brand)':'var(--text-muted)'}}>{pct.toFixed(0)}%</span>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:'var(--text-primary)',lineHeight:1.3}}>{cat.key}</div>
                <div style={{fontSize:13,fontWeight:800,color:cat.colorVar,marginTop:3}}>{fmt.currency(totalUsd,'USD',lang)}</div>
                <div style={{marginTop:6,height:4,background:'var(--surface-border)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:cat.colorVar,borderRadius:3,transition:'width .4s'}}/>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tabela de Detalhamento ───────────────────────────── */}
      <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
        <i className="fas fa-table-list" style={{color:'var(--brand)',fontSize:13}}/>
        {t.breakdown}
        {activeCategoria && <span style={{fontSize:12,color:'var(--brand)',fontWeight:400}}>— {t.filteringBy} {activeCategoria}</span>}
      </div>
      <div className="card">
        {despesasFiltradas.length === 0 ? (
          <div className="empty-state"><i className="fas fa-file-invoice"/><p>{t.noExpenses}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.expenseName}</th>
                  <th>{t.category}</th>
                  <th>{t.pais}</th>
                  <th>{t.valor}</th>
                  <th>Em USD</th>
                  <th>{t.recurrenceLabel}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {despesasFiltradas.map(d => {
                  const cat = CATEGORIAS.find(c=>c.key===d.categoria) || CATEGORIAS[CATEGORIAS.length-1];
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{fontWeight:600,fontSize:13,color:'var(--text-primary)'}}>{d.nome}</div>
                        {d.notas && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{d.notas}</div>}
                      </td>
                      <td>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:cat.colorVar}}>
                          <i className={`fas ${cat.icon}`} style={{fontSize:10}}/>{d.categoria}
                        </span>
                      </td>
                      <td><span className={`badge badge-${d.pais==='US'?'blue':'green'}`}>{d.pais==='US'?'🇺🇸 EUA':'🇧🇷 BR'}</span></td>
                      <td style={{fontWeight:700,fontSize:13,color:'var(--text-primary)'}}>{fmt.currency(parseFloat(d.valor||0),d.moeda,lang)}</td>
                      <td style={{fontSize:12,color:'var(--text-muted)'}}>{fmt.currency(toUSD(parseFloat(d.valor||0),d.moeda),'USD',lang)}</td>
                      <td><span className="badge badge-brand" style={{fontSize:10}}>{d.recorrencia||'mensal'}</span></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn-icon" onClick={()=>openEdit(d)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon danger" onClick={()=>handleDelete(d.id)}><i className="fas fa-trash"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Form ──────────────────────────────────────── */}
      {modal === 'form' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540}}>
            <div className="modal-header">
              <div className="modal-title">{despesas.find(d=>d.id===form.id) ? t.editExpense : t.newExpense}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.name} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Mortgage Miami"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.category}</label>
                  <select className="form-select" value={form.categoria||'Moradia'} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                    {CATEGORIAS.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.pais}</label>
                  <select className="form-select" value={form.pais||'US'} onChange={e=>setForm(f=>({...f,pais:e.target.value,moeda:e.target.value==='US'?'USD':'BRL'}))}>
                    <option value="US">🇺🇸 EUA</option>
                    <option value="BR">🇧🇷 Brasil</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.moeda}</label>
                  <select className="form-select" value={form.moeda||'USD'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="USD">USD</option>
                    <option value="BRL">BRL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.valor}</label>
                  <input className="form-input" type="number" value={form.valor||''} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.recurrenceLabel}</label>
                  <select className="form-select" value={form.recorrencia||'mensal'} onChange={e=>setForm(f=>({...f,recorrencia:e.target.value}))}>
                    <option value="mensal">{t.monthly}</option>
                    <option value="anual">{t.annual}</option>
                    <option value="trimestral">{t.quarterly}</option>
                    <option value="semanal">{t.weekly}</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.notes}</label>
                  <input className="form-input" value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Notas adicionais..."/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-check"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ──────────────────────────────────── */}
      {confirm && (
        <div className="modal-backdrop" onClick={()=>setConfirm(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-header"><div className="modal-title">{t.confirm}</div></div>
            <div className="modal-body"><p style={{color:'var(--text-primary)'}}>{confirm.msg}</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setConfirm(null)}>{t.cancel}</button>
              <button className="btn btn-primary" style={{background:'var(--red)',borderColor:'var(--red)'}} onClick={confirm.onConfirm}><i className="fas fa-trash"/>{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
