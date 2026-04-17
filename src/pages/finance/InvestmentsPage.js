// ── Investments Page ─────────────────────────────────────────
function InvestmentsPage() {
  const { t, lang, toast } = useApp();
  const [ativos, setAtivos] = useState([]);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterMoeda, setFilterMoeda] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('carteira');
  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const barRef = useRef(null);
  const barInst = useRef(null);

  const CLASSES = [
    { key: 'Renda Fixa',      icon: 'fa-shield-halved',   color: 'blue',   colorVar: 'var(--blue)',   bg: 'rgba(59,130,246,.12)'  },
    { key: 'Renda Variável',  icon: 'fa-chart-line',      color: 'brand',  colorVar: 'var(--brand)',  bg: 'var(--brand-dim)'       },
    { key: 'FIIs',            icon: 'fa-building-columns', color: 'yellow', colorVar: 'var(--yellow)', bg: 'rgba(245,158,11,.12)'  },
    { key: 'ETFs',            icon: 'fa-layer-group',     color: 'green',  colorVar: 'var(--green)',  bg: 'rgba(34,197,94,.12)'   },
    { key: 'BDRs',            icon: 'fa-globe',           color: 'orange', colorVar: 'var(--orange)', bg: 'rgba(249,115,22,.12)'  },
    { key: 'Previdência',     icon: 'fa-piggy-bank',      color: 'purple', colorVar: '#a78bfa',       bg: 'rgba(167,139,250,.12)' },
    { key: 'Criptoativos',   icon: 'fa-bitcoin-sign',    color: 'orange', colorVar: 'var(--orange)', bg: 'rgba(249,115,22,.12)'  },
    { key: 'Outros',          icon: 'fa-ellipsis',        color: 'gray',   colorVar: 'var(--text-muted)', bg: 'var(--surface-hover)' },
  ];

  const DEFAULT_ATIVOS = [];

  const load = useCallback(async () => {
    const cfg = await db.config.get('investments');
    setAtivos(cfg?.value || DEFAULT_ATIVOS);
  }, []);
  useEffect(() => { load(); }, []);

  // Build charts after data loads
  useEffect(() => {
    if (!ativos.length) return;

    // Donut — allocation by class
    if (chartRef.current) {
      if (chartInst.current) chartInst.current.destroy();
      const classTotals = {};
      ativos.forEach(a => {
        const v = parseFloat(a.vl_atual) || 0;
        classTotals[a.classe] = (classTotals[a.classe] || 0) + v;
      });
      const labels = Object.keys(classTotals);
      const values = Object.values(classTotals);
      const CHART_COLORS = ['#6470f1','#3b82f6','#f59e0b','#22c55e','#f97316','#a78bfa','#ef4444','#94a3b8'];
      chartInst.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: CHART_COLORS.slice(0, labels.length), borderWidth: 2, borderColor: 'var(--surface-card)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'var(--text-primary)', font: { family: 'Lexend', size: 11 }, boxWidth: 12 } } }, cutout: '65%' }
      });
    }

    // Bar — performance by asset
    if (barRef.current) {
      if (barInst.current) barInst.current.destroy();
      const top = [...ativos].sort((a,b) => (parseFloat(b.rentab_pct)||0) - (parseFloat(a.rentab_pct)||0)).slice(0,8);
      barInst.current = new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: top.map(a => a.ticker || a.nome.slice(0,10)),
          datasets: [{
            label: 'Rentabilidade %',
            data: top.map(a => parseFloat(a.rentab_pct)||0),
            backgroundColor: top.map(a => (parseFloat(a.rentab_pct)||0) >= 0 ? 'rgba(100,112,241,.75)' : 'rgba(239,68,68,.65)'),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'var(--surface-border)' }, ticks: { color: 'var(--text-muted)', font: { family: 'Lexend', size: 11 }, callback: v => v + '%' } },
            y: { grid: { display: false }, ticks: { color: 'var(--text-primary)', font: { family: 'Lexend', size: 11 } } }
          }
        }
      });
    }

    return () => {
      if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
      if (barInst.current)   { barInst.current.destroy();   barInst.current   = null; }
    };
  }, [ativos, activeTab]);

  const totalBRL = ativos.filter(a => a.moeda === 'BRL').reduce((s,a) => s + (parseFloat(a.vl_atual)||0), 0);
  const totalUSD = ativos.filter(a => a.moeda === 'USD').reduce((s,a) => s + (parseFloat(a.vl_atual)||0), 0);
  const totalInvBRL = ativos.filter(a => a.moeda === 'BRL').reduce((s,a) => s + (parseFloat(a.vl_investido)||0), 0);
  const totalInvUSD = ativos.filter(a => a.moeda === 'USD').reduce((s,a) => s + (parseFloat(a.vl_investido)||0), 0);
  const rentabBRL = totalInvBRL > 0 ? ((totalBRL - totalInvBRL) / totalInvBRL * 100) : 0;
  const rentabUSD = totalInvUSD > 0 ? ((totalUSD - totalInvUSD) / totalInvUSD * 100) : 0;

  const filtered = React.useMemo(() =>
    ativos.filter(a =>
      (!filterClasse || a.classe === filterClasse) &&
      (!filterMoeda  || a.moeda  === filterMoeda)  &&
      (!search || a.nome?.toLowerCase().includes(search.toLowerCase()) || a.ticker?.toLowerCase().includes(search.toLowerCase()))
    ),
  [ativos, filterClasse, filterMoeda, search]);

  function openNew() {
    setForm({ id: Date.now(), classe: filterClasse || 'Renda Variável', moeda: 'BRL', pais: 'BR', qtd: '', preco_medio: '', preco_atual: '', vl_investido: '', vl_atual: '', rentab_pct: '', dt_vencimento: '', notas: '' });
    setModal('form');
  }
  function openEdit(r) { setForm({...r}); setModal('form'); }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.','error'); return; }
    const updated = ativos.find(a => a.id === form.id)
      ? ativos.map(a => a.id === form.id ? form : a)
      : [...ativos, form];
    await db.config.put({ chave: 'investments', value: updated });
    toast(t.saved, 'success'); setModal(null); load();
  }

  function handleDelete(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const updated = ativos.filter(a => a.id !== id);
      await db.config.put({ chave: 'investments', value: updated });
      toast(t.deleted, 'success'); setConfirm(null); load();
    }});
  }

  // Auto-calc rentabilidade when prices/values change
  function calcRentab(f) {
    if (f.vl_investido && f.vl_atual) {
      const inv = parseFloat(f.vl_investido), cur = parseFloat(f.vl_atual);
      if (inv > 0) return ((cur - inv) / inv * 100).toFixed(2);
    }
    if (f.preco_medio && f.preco_atual) {
      const pm = parseFloat(f.preco_medio), pa = parseFloat(f.preco_atual);
      if (pm > 0) return ((pa - pm) / pm * 100).toFixed(2);
    }
    return f.rentab_pct || '';
  }

  const classeInfo = (key) => CLASSES.find(c => c.key === key) || CLASSES[CLASSES.length-1];

  const TABS = [
    { key: 'carteira',    label: 'Carteira',    icon: 'fa-table-list' },
    { key: 'graficos',    label: 'Gráficos',    icon: 'fa-chart-pie'  },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.investmentsPage}</div>
          <div className="page-header-sub">{ativos.length} ativo{ativos.length !== 1 ? 's' : ''} na carteira</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newAsset}</button>
      </div>

      {/* KPI Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20}}>
        {[
          { label: 'Total BRL',        val: fmt.currency(totalBRL, 'BRL', lang),   sub: `Investido: ${fmt.currency(totalInvBRL,'BRL',lang)}`, rentab: rentabBRL, icon:'fa-brazilian-real-sign', color:'var(--brand)',  bg:'var(--brand-dim)' },
          { label: 'Total USD',        val: fmt.currency(totalUSD, 'USD', lang),   sub: `Investido: ${fmt.currency(totalInvUSD,'USD',lang)}`, rentab: rentabUSD, icon:'fa-dollar-sign',          color:'var(--green)',  bg:'rgba(34,197,94,.12)' },
          { label: 'Ativos BR',        val: ativos.filter(a=>a.pais==='BR').length, sub: 'ativos no Brasil',  rentab: null, icon:'fa-flag', color:'var(--yellow)', bg:'rgba(245,158,11,.12)' },
          { label: 'Ativos US',        val: ativos.filter(a=>a.pais==='US').length, sub: 'ativos nos EUA',    rentab: null, icon:'fa-flag', color:'var(--blue)',   bg:'rgba(59,130,246,.12)'  },
        ].map(k => (
          <div key={k.label} className="card" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
              <div>
                <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{k.label}</div>
                <div style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',lineHeight:1.1}}>{k.val}</div>
                {k.rentab !== null ? (
                  <div style={{fontSize:12,marginTop:5,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{color:'var(--text-muted)',fontSize:11}}>{k.sub}</span>
                    <span style={{color: k.rentab >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700, fontSize:12}}>
                      <i className={`fas fa-caret-${k.rentab >= 0 ? 'up' : 'down'}`} style={{marginRight:2}}/>{Math.abs(k.rentab).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:5}}>{k.sub}</div>
                )}
              </div>
              <div style={{width:40,height:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`fas ${k.icon}`} style={{fontSize:16,color:k.color}}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Classes filter cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:18}}>
        {CLASSES.map(cls => {
          const count = ativos.filter(a => a.classe === cls.key).length;
          if (count === 0) return null;
          return (
            <button key={cls.key} onClick={() => setFilterClasse(filterClasse === cls.key ? '' : cls.key)}
              style={{display:'flex',alignItems:'center',gap:9,textAlign:'left',background:filterClasse===cls.key?'var(--surface-hover)':'var(--surface-card)',border:`1px solid ${filterClasse===cls.key?'var(--brand)':'var(--surface-border)'}`,borderRadius:10,padding:'10px 12px',cursor:'pointer'}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:cls.bg}}>
                <i className={`fas ${cls.icon}`} style={{fontSize:13,color:cls.colorVar}}/>
              </div>
              <div>
                <div style={{fontWeight:600,color:'var(--text-primary)',fontSize:11,lineHeight:1.3}}>{cls.key}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{count} ativo{count!==1?'s':''}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--surface-border)',paddingBottom:0}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',color:activeTab===tab.key?'var(--brand)':'var(--text-muted)',borderBottom:activeTab===tab.key?'2px solid var(--brand)':'2px solid transparent',marginBottom:-1,transition:'color .15s'}}>
            <i className={`fas ${tab.icon}`} style={{fontSize:12}}/>{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'carteira' && (
        <>
          {/* Filters */}
          <div className="card" style={{marginBottom:14}}>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
              <div className="search-bar" style={{flex:1,minWidth:180}}>
                <i className="fas fa-search"/>
                <input placeholder="Buscar ativo, ticker..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="form-select" style={{maxWidth:200}} value={filterClasse} onChange={e=>setFilterClasse(e.target.value)}>
                <option value="">Todas as classes</option>
                {CLASSES.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}
              </select>
              <select className="form-select" style={{maxWidth:130}} value={filterMoeda} onChange={e=>setFilterMoeda(e.target.value)}>
                <option value="">Todas as moedas</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
              {(search||filterClasse||filterMoeda) && (
                <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{setSearch('');setFilterClasse('');setFilterMoeda('');}}>
                  <i className="fas fa-xmark"/>Limpar
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {filtered.length === 0 ? (
              <div className="empty-state"><i className="fas fa-chart-pie"/><p>{t.noAssets}</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.assetName}</th>
                      <th>{t.assetClass}</th>
                      <th>{t.broker}</th>
                      <th>{t.moeda}</th>
                      <th>{t.quantity} / PM</th>
                      <th>{t.currentPrice}</th>
                      <th>{t.investedValue}</th>
                      <th>{t.currentValue}</th>
                      <th>{t.returnPct}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const cls = classeInfo(a.classe);
                      const rentab = parseFloat(a.rentab_pct) || 0;
                      const ganho = (parseFloat(a.vl_atual)||0) - (parseFloat(a.vl_investido)||0);
                      return (
                        <tr key={a.id}>
                          <td>
                            <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)'}}>{a.nome}</div>
                            {a.ticker && <span style={{fontSize:10,color:'var(--text-muted)',background:'var(--surface-hover)',borderRadius:4,padding:'1px 6px',display:'inline-block',marginTop:2,fontFamily:'monospace'}}>{a.ticker}</span>}
                          </td>
                          <td>
                            <span style={{fontSize:11,color:cls.colorVar,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>
                              <i className={`fas ${cls.icon}`} style={{fontSize:10}}/>{a.classe}
                            </span>
                          </td>
                          <td style={{fontSize:12,color:'var(--text-muted)'}}>{a.corretora||'—'}</td>
                          <td><span className={`badge badge-${a.moeda==='USD'?'blue':'brand'}`}>{a.moeda||'BRL'}</span></td>
                          <td style={{fontSize:12}}>
                            {a.qtd ? <div style={{color:'var(--text-primary)',fontWeight:500}}>{a.qtd}</div> : '—'}
                            {a.preco_medio ? <div style={{color:'var(--text-muted)',fontSize:11}}>PM: {fmt.currency(parseFloat(a.preco_medio),a.moeda||'BRL',lang)}</div> : null}
                          </td>
                          <td style={{fontSize:12,color:'var(--text-primary)',fontWeight:500}}>
                            {a.preco_atual ? fmt.currency(parseFloat(a.preco_atual),a.moeda||'BRL',lang) : '—'}
                          </td>
                          <td style={{fontSize:12,color:'var(--text-muted)'}}>{a.vl_investido ? fmt.currency(parseFloat(a.vl_investido),a.moeda||'BRL',lang) : '—'}</td>
                          <td style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{a.vl_atual ? fmt.currency(parseFloat(a.vl_atual),a.moeda||'BRL',lang) : '—'}</td>
                          <td>
                            {a.rentab_pct !== '' && a.rentab_pct !== undefined ? (
                              <span style={{color: rentab >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:3}}>
                                <i className={`fas fa-caret-${rentab >= 0 ? 'up' : 'down'}`}/>
                                {Math.abs(rentab).toFixed(1)}%
                                {ganho !== 0 && <span style={{fontWeight:400,fontSize:10,color:rentab>=0?'var(--green)':'var(--red)',marginLeft:2}}>({ganho>0?'+':''}{fmt.currency(ganho,a.moeda||'BRL',lang)})</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <div style={{display:'flex',gap:4}}>
                              <button className="btn-icon" title="Editar" onClick={()=>openEdit(a)}><i className="fas fa-pen"/></button>
                              <button className="btn-icon danger" title="Excluir" onClick={()=>handleDelete(a.id)}><i className="fas fa-trash"/></button>
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
        </>
      )}

      {activeTab === 'graficos' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:'var(--text-primary)'}}>{t.allocation}</div>
            <div style={{height:260,position:'relative'}}><canvas ref={chartRef}/></div>
          </div>
          <div className="card">
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:'var(--text-primary)'}}>Top Rentabilidade</div>
            <div style={{height:260,position:'relative'}}><canvas ref={barRef}/></div>
          </div>
          {/* Breakdown table */}
          <div className="card" style={{gridColumn:'1/-1'}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:'var(--text-primary)'}}>Resumo por Classe</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Classe</th><th>Ativos</th><th>Vl. Investido (BRL)</th><th>Vl. Atual (BRL)</th><th>Resultado</th><th>% Carteira</th></tr>
                </thead>
                <tbody>
                  {CLASSES.map(cls => {
                    const grupo = ativos.filter(a => a.classe === cls.key);
                    if (grupo.length === 0) return null;
                    const inv  = grupo.reduce((s,a) => s + (parseFloat(a.vl_investido)||0), 0);
                    const cur  = grupo.reduce((s,a) => s + (parseFloat(a.vl_atual)||0), 0);
                    const rnt  = inv > 0 ? ((cur - inv) / inv * 100) : 0;
                    const totalGeral = ativos.reduce((s,a) => s + (parseFloat(a.vl_atual)||0), 0);
                    const pct  = totalGeral > 0 ? (cur / totalGeral * 100) : 0;
                    return (
                      <tr key={cls.key}>
                        <td><span style={{fontSize:12,color:cls.colorVar,fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}><i className={`fas ${cls.icon}`} style={{fontSize:10}}/>{cls.key}</span></td>
                        <td style={{fontSize:12}}>{grupo.length}</td>
                        <td style={{fontSize:12,color:'var(--text-muted)'}}>{fmt.currency(inv,'BRL',lang)}</td>
                        <td style={{fontSize:13,fontWeight:700}}>{fmt.currency(cur,'BRL',lang)}</td>
                        <td><span style={{color:rnt>=0?'var(--green)':'var(--red)',fontWeight:700,fontSize:12}}>{rnt>=0?'+':''}{rnt.toFixed(1)}%</span></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{flex:1,height:6,background:'var(--surface-border)',borderRadius:4,overflow:'hidden'}}>
                              <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:cls.colorVar,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:11,color:'var(--text-muted)',width:36,textAlign:'right'}}>{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {modal === 'form' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620}}>
            <div className="modal-header">
              <div className="modal-title">{form.id && ativos.find(a=>a.id===form.id) ? t.editAsset : t.newAsset}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.assetName} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Tesouro IPCA+ 2035"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.ticker}</label>
                  <input className="form-input" value={form.ticker||''} onChange={e=>setForm(f=>({...f,ticker:e.target.value}))} placeholder="Ex: PETR4"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.assetClass}</label>
                  <select className="form-select" value={form.classe||'Renda Variável'} onChange={e=>setForm(f=>({...f,classe:e.target.value}))}>
                    {CLASSES.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.broker}</label>
                  <input className="form-input" value={form.corretora||''} onChange={e=>setForm(f=>({...f,corretora:e.target.value}))} placeholder="Ex: XP Investimentos"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.moeda}</label>
                  <select className="form-select" value={form.moeda||'BRL'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="BRL">BRL</option><option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.pais}</label>
                  <select className="form-select" value={form.pais||'BR'} onChange={e=>setForm(f=>({...f,pais:e.target.value}))}>
                    <option value="BR">Brasil</option><option value="US">EUA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.quantity}</label>
                  <input className="form-input" type="number" value={form.qtd||''} onChange={e=>setForm(f=>({...f,qtd:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.avgPrice}</label>
                  <input className="form-input" type="number" value={form.preco_medio||''} onChange={e=>{ const f2={...form,preco_medio:e.target.value}; setForm({...f2,rentab_pct:calcRentab(f2)}); }} placeholder="0,00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.currentPrice}</label>
                  <input className="form-input" type="number" value={form.preco_atual||''} onChange={e=>{ const f2={...form,preco_atual:e.target.value}; setForm({...f2,rentab_pct:calcRentab(f2)}); }} placeholder="0,00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.investedValue} ({form.moeda||'BRL'})</label>
                  <input className="form-input" type="number" value={form.vl_investido||''} onChange={e=>{ const f2={...form,vl_investido:e.target.value}; setForm({...f2,rentab_pct:calcRentab(f2)}); }} placeholder="0,00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.currentValue} ({form.moeda||'BRL'})</label>
                  <input className="form-input" type="number" value={form.vl_atual||''} onChange={e=>{ const f2={...form,vl_atual:e.target.value}; setForm({...f2,rentab_pct:calcRentab(f2)}); }} placeholder="0,00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.returnPct}</label>
                  <input className="form-input" type="number" value={form.rentab_pct||''} onChange={e=>setForm(f=>({...f,rentab_pct:e.target.value}))} placeholder="Calculado automaticamente"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dueDate}</label>
                  <input className="form-input" type="date" value={form.dt_vencimento||''} onChange={e=>setForm(f=>({...f,dt_vencimento:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.notes}</label>
                  <textarea className="form-input" rows={2} value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Notas adicionais..."/>
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

      {/* Confirm Delete */}
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
