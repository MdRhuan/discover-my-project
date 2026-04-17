// ============================================================
// modules.js — Dashboard, Empresas, Funcionários, Documentos,
//              Faturamento, Organograma, Backup, AuditLog
// ============================================================

// ── Audit Feed (sub-component so hooks are valid) ────────────
function AuditFeed() {
  const [auditRows, setAuditRows] = useState([]);
  useEffect(() => {
    db.auditLog.orderBy('timestamp').reverse().limit(20).toArray().then(rows => setAuditRows(rows));
  }, []);

  const iconFor = (acao = '') => {
    if (acao.includes('mpresa'))                              return { icon:'fa-building',   color:'var(--brand)'    };
    if (acao.includes('Task') || acao.includes('task'))      return { icon:'fa-list-check',  color:'var(--yellow)'   };
    if (acao.includes('ocumento') || acao.includes('doc'))   return { icon:'fa-file',        color:'var(--green)'    };
    if (acao.includes('uncionário') || acao.includes('func'))return { icon:'fa-user',        color:'var(--blue)'     };
    if (acao.includes('iscal') || acao.includes('fiscal'))   return { icon:'fa-receipt',     color:'var(--orange)'   };
    if (acao.includes('ackup') || acao.includes('backup'))   return { icon:'fa-database',    color:'var(--gray)'     };
    return                                                           { icon:'fa-circle-dot',  color:'var(--text-muted)'};
  };

  const { t: tAudit } = useApp();
  if (auditRows.length === 0)
    return <div className="empty-state"><i className="fas fa-clock-rotate-left"/><p>{tAudit.noActionsLogged}</p></div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0,maxHeight:480,overflowY:'auto'}}>
      {auditRows.map((log, idx) => {
        const ic   = iconFor(log.acao || log.modulo || '');
        const diff = (Date.now() - new Date(log.timestamp).getTime()) / 1000;
        const ago  = diff < 60 ? 'agora' : diff < 3600 ? `${Math.floor(diff/60)}min atrás` : diff < 86400 ? `${Math.floor(diff/3600)}h atrás` : `${Math.floor(diff/86400)}d atrás`;
        const isLast = idx === auditRows.length - 1;
        return (
          <div key={log.id||idx} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 0',borderBottom: isLast ? 'none' : '1px solid var(--surface-border)'}}>
            <div style={{width:28,height:28,borderRadius:8,background:'var(--surface-hover)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
              <i className={`fas ${ic.icon}`} style={{fontSize:11,color:ic.color}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:'var(--text-primary)',fontWeight:500,lineHeight:1.4}}>{log.acao}</div>
              <div style={{display:'flex',gap:8,marginTop:3,fontSize:10,color:'var(--text-muted)'}}>
                {log.modulo && <span style={{color:'var(--brand)'}}>{log.modulo}</span>}
                <span>{ago}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function DashboardPage() {
  const { t, currency, lang } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const revenueChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const revenueChartInst = useRef(null);
  const pieChartInst = useRef(null);

  useEffect(() => {
    async function load() {
      const [empresas, funcionarios, transacoes, docs, taskList, alertList] = await Promise.all([
        db.empresas.toArray(),
        db.funcionarios.toArray(),
        db.transacoes.toArray(),
        db.documentos.toArray(),
        db.tasks ? db.tasks.toArray() : Promise.resolve([]),
        db.alertas ? db.alertas.toArray() : Promise.resolve([]),
      ]);
      setData({ empresas, funcionarios, transacoes, docs });
      setTasks(taskList);
      setAlertas(alertList);
    }
    load();
  }, []);

  useEffect(() => {
    if (!data || activeTab !== 'home') return;
    buildCharts();
    return () => {
      revenueChartInst.current?.destroy();
      pieChartInst.current?.destroy();
    };
  }, [data, currency, activeTab]);

  function buildCharts() {
    const convertVal = (val, moeda) => moeda === currency ? val : moeda === 'BRL' ? val * (1/5.2) : val * 5.2;
    const months = [];
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      months.push(d.toLocaleString(lang, {month:'short'}));
      monthKeys.push(d.toISOString().slice(0,7));
    }
    const rev = monthKeys.map(m => data.transacoes.filter(tx=>tx.tipo==='receita'&&tx.data?.startsWith(m)).reduce((s,tx)=>s+convertVal(tx.valor,tx.moeda),0));
    const exp = monthKeys.map(m => data.transacoes.filter(tx=>tx.tipo==='despesa'&&tx.data?.startsWith(m)).reduce((s,tx)=>s+convertVal(tx.valor,tx.moeda),0));

    if (revenueChartInst.current) revenueChartInst.current.destroy();
    if (revenueChartRef.current) {
      revenueChartInst.current = new Chart(revenueChartRef.current, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: t.revenue, data: rev, backgroundColor: 'rgba(100,112,241,0.7)', borderRadius: 6, borderSkipped: false },
            { label: t.expense, data: exp, backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 6, borderSkipped: false },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8b93a8', font: { size: 12 } } } },
          scales: {
            x: { grid: { color: 'rgba(30,37,53,0.8)' }, ticks: { color: '#525d72' } },
            y: { grid: { color: 'rgba(30,37,53,0.8)' }, ticks: { color: '#525d72', callback: v => currency+' '+Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v) } }
          }
        }
      });
    }

    const empColors = ['#6470f1','#22c55e','#f59e0b','#3b82f6'];
    const empRevs = data.empresas.map(e => data.transacoes.filter(tx=>tx.tipo==='receita'&&tx.empresaId===e.id).reduce((s,tx)=>s+convertVal(tx.valor,tx.moeda),0));
    if (pieChartInst.current) pieChartInst.current.destroy();
    if (pieChartRef.current) {
      pieChartInst.current = new Chart(pieChartRef.current, {
        type: 'doughnut',
        data: {
          labels: data.empresas.map(e=>e.nome),
          datasets: [{ data: empRevs, backgroundColor: empColors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#8b93a8', font:{size:11}, padding:12, boxWidth:12 } } },
          cutout: '65%'
        }
      });
    }
  }

  if (!data) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:'var(--text-muted)'}}><i className="fas fa-spinner fa-spin" style={{marginRight:8}}/>{t.loading}</div>;

  const convertVal = (val, moeda) => moeda === currency ? val : moeda === 'BRL' ? val * (1/5.2) : val * 5.2;
  const totalRev = data.transacoes.filter(tx=>tx.tipo==='receita').reduce((s,tx)=>s+convertVal(tx.valor,tx.moeda),0);
  const totalExp = data.transacoes.filter(tx=>tx.tipo==='despesa').reduce((s,tx)=>s+convertVal(tx.valor,tx.moeda),0);
  const activeCo = data.empresas.filter(e=>e.status==='ativo'||e.status==='ativa').length;
  const activeEm = data.funcionarios.filter(f=>f.status==='ativo').length;

  // Tasks helpers
  const pendingTasks = tasks.filter(tk => tk.status !== 'concluida');
  const today = new Date().toISOString().slice(0,10);
  const overdueTasks = pendingTasks.filter(tk => tk.vencimento < today);
  const todayTasks = pendingTasks.filter(tk => tk.vencimento === today);
  const upcomingTasks = pendingTasks.filter(tk => tk.vencimento > today).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));

  const PRIO_MAP = { alta: { badge:'red', label: t.priorityHigh }, media: { badge:'yellow', label: t.priorityMedium }, baixa: { badge:'green', label: t.priorityLow } };
  const STATUS_TASK = { pendente: { badge:'yellow', label: t.statusPending }, 'em-andamento': { badge:'blue', label: t.statusInProgress }, concluida: { badge:'green', label: t.statusDone } };

  // Alerts helpers
  const ALERT_MAP = {
    critico: { badge:'red',    icon:'fa-circle-exclamation', label: t.criticalAlert },
    aviso:   { badge:'yellow', icon:'fa-triangle-exclamation', label: t.warningAlert },
    info:    { badge:'blue',   icon:'fa-circle-info',        label: t.infoAlert    },
    sucesso: { badge:'green',  icon:'fa-circle-check',       label: t.successAlert },
  };
  const unreadCount = alertas.filter(a => !a.lido).length;

  async function markAlertRead(id) {
    await db.alertas.update(id, { lido: true });
    setAlertas(prev => prev.map(a => a.id === id ? {...a, lido:true} : a));
  }
  async function markAllRead() {
    await Promise.all(alertas.filter(a=>!a.lido).map(a => db.alertas.update(a.id, { lido: true })));
    setAlertas(prev => prev.map(a => ({...a, lido:true})));
  }
  async function toggleTaskStatus(tk) {
    const next = tk.status === 'concluida' ? 'pendente' : tk.status === 'pendente' ? 'em-andamento' : 'concluida';
    await db.tasks.update(tk.id, { status: next });
    setTasks(prev => prev.map(t => t.id === tk.id ? {...t, status:next} : t));
  }

  const TABS = [
    { key: 'home',   label: t.dashboard,             icon: 'fa-gauge-high'  },
    { key: 'tasks',  label: t.tasks,                 icon: 'fa-list-check', badge: pendingTasks.length },
    { key: 'alerts', label: t.recentAlerts,          icon: 'fa-bell',       badge: unreadCount },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.dashboard}</div>
          <div className="page-header-sub">{t.dashboardSub}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:'1px solid var(--surface-border)',paddingBottom:0}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
              background:'none', border:'none', cursor:'pointer',
              color: activeTab===tab.key ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: activeTab===tab.key ? '2px solid var(--brand)' : '2px solid transparent',
              fontFamily:'Lexend, sans-serif', fontWeight: activeTab===tab.key ? 600 : 400,
              fontSize:13, marginBottom:-1, whiteSpace:'nowrap', transition:'color .15s',
            }}
          >
            <i className={`fas ${tab.icon}`} style={{fontSize:13}}/>
            {tab.label}
            {tab.badge > 0 && (
              <span style={{background: tab.key==='alerts'&&unreadCount>0 ? 'var(--red)' : 'var(--brand)', color:'#fff', borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:700, minWidth:18, textAlign:'center'}}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === 'home' && (()=>{
        const today90 = new Date(Date.now() + 90*86400000).toISOString().slice(0,10);
        const today30 = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
        const today15 = new Date(Date.now() + 15*86400000).toISOString().slice(0,10);
        const today7  = new Date(Date.now() +  7*86400000).toISOString().slice(0,10);

        // --- Status Cards ---
        const entidadesAtivas = data.empresas.filter(e => {
          const s = (e.status||'').toLowerCase();
          return s === 'ativa' || s === 'ativo' || s === 'ativa' || s === 'Em Desenvolvimento' || s.includes('ativ') || s.includes('desenvolv');
        }).length;

        const docsVencidos = data.docs.filter(d => d.vencimento && d.vencimento < today).length;
        const docsVenc30   = data.docs.filter(d => d.vencimento && d.vencimento >= today && d.vencimento <= today30).length;
        const docsAlerta   = docsVencidos + docsVenc30;

        const tasksAbertas = tasks.filter(tk => tk.statusReg !== 'arquivado' && tk.status !== 'concluida').length;

        const obrig7  = tasks.filter(tk => tk.statusReg !== 'arquivado' && tk.status !== 'concluida' && tk.tipo === 'Fiscal' && tk.vencimento >= today && tk.vencimento <= today7).length;
        const obrig30 = tasks.filter(tk => tk.statusReg !== 'arquivado' && tk.status !== 'concluida' && tk.tipo === 'Fiscal' && tk.vencimento > today7 && tk.vencimento <= today30).length;
        const obrig90 = tasks.filter(tk => tk.statusReg !== 'arquivado' && tk.status !== 'concluida' && tk.tipo === 'Fiscal' && tk.vencimento > today30 && tk.vencimento <= today90).length;

        // --- Timeline items: tasks + docs with vencimento, next 90 days ---
        const timelineItems = [
          ...tasks
            .filter(tk => tk.statusReg !== 'arquivado' && tk.status !== 'concluida' && tk.vencimento && tk.vencimento <= today90)
            .map(tk => ({
              id: 'tk-'+tk.id,
              prazo: tk.vencimento,
              titulo: tk.titulo,
              entidade: data.empresas.find(e=>e.id===tk.empresaId)?.nome || '—',
              tipo: tk.tipo || 'Task',
              responsavel: tk.responsavel || '—',
              origem: 'task',
            })),
          ...data.docs
            .filter(d => d.vencimento && d.vencimento <= today90)
            .map(d => ({
              id: 'doc-'+d.id,
              prazo: d.vencimento,
              titulo: d.nome || d.titulo || 'Documento',
              entidade: '—',
              tipo: 'Documento',
              responsavel: '—',
              origem: 'doc',
            })),
        ].sort((a,b) => {
          // vencidos first, then by date asc
          const aOver = a.prazo < today ? 0 : 1;
          const bOver = b.prazo < today ? 0 : 1;
          if (aOver !== bOver) return aOver - bOver;
          return a.prazo.localeCompare(b.prazo);
        });

        function timelineColor(prazo) {
          if (prazo < today)  return { bar:'var(--red)',    badge:'red',    label:'Vencido'  };
          if (prazo <= today15) return { bar:'var(--yellow)', badge:'yellow', label:'< 15 dias' };
          return                       { bar:'var(--green)',  badge:'green',  label:'OK'       };
        }

        function daysLabel(prazo) {
          const diff = Math.round((new Date(prazo) - new Date(today)) / 86400000);
          if (diff < 0)  return `${Math.abs(diff)}d atrás`;
          if (diff === 0) return 'Hoje';
          return `em ${diff}d`;
        }

        return (
          <>
            {/* 4 Status Cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:24}}>
              {/* Card 1: Entidades ativas */}
              <div className="card" style={{padding:'18px 20px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:46,height:46,borderRadius:12,background:'var(--brand-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="fas fa-building" style={{fontSize:20,color:'var(--brand)'}}/>
                </div>
                <div>
                  <div style={{fontSize:28,fontWeight:800,color:'var(--text-primary)',lineHeight:1}}>{entidadesAtivas}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>{t.activeEntities}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{data.empresas.length} {t.totalInPortfolio}</div>
                </div>
              </div>
              {/* Card 2: Docs vencidos/vencendo */}
              <div className="card" style={{padding:'18px 20px',display:'flex',gap:14,alignItems:'center',borderColor: docsAlerta>0 ? '#f59e0b66' : 'var(--surface-border)'}}>
                <div style={{width:46,height:46,borderRadius:12,background: docsAlerta>0 ? '#f59e0b1f' : '#22c55e1f',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="fas fa-file-circle-exclamation" style={{fontSize:20,color: docsAlerta>0 ? 'var(--yellow)' : 'var(--green)'}}/>
                </div>
                <div>
                  <div style={{fontSize:28,fontWeight:800,color: docsAlerta>0 ? 'var(--yellow)' : 'var(--text-primary)',lineHeight:1}}>{docsAlerta}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>{t.docsWithAlert}</div>
                  <div style={{fontSize:11,marginTop:2}}>
                    {docsVencidos > 0 && <span style={{color:'var(--red)',marginRight:8}}><i className="fas fa-xmark" style={{fontSize:9,marginRight:3}}/>{docsVencidos} {t.expiredDocs}</span>}
                    {docsVenc30  > 0 && <span style={{color:'var(--yellow)'}}><i className="fas fa-clock" style={{fontSize:9,marginRight:3}}/>{docsVenc30} {t.in30days}</span>}
                    {docsAlerta === 0 && <span style={{color:'var(--green)'}}>{t.allCurrent}</span>}
                  </div>
                </div>
              </div>
              {/* Card 3: Tasks abertas */}
              <div className="card" style={{padding:'18px 20px',display:'flex',gap:14,alignItems:'center',borderColor: overdueTasks.length>0 ? '#ef444459' : 'var(--surface-border)'}}>
                <div style={{width:46,height:46,borderRadius:12,background: overdueTasks.length>0 ? '#ef444418' : 'var(--brand-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="fas fa-list-check" style={{fontSize:20,color: overdueTasks.length>0 ? 'var(--red)' : 'var(--brand)'}}/>
                </div>
                <div>
                  <div style={{fontSize:28,fontWeight:800,color: overdueTasks.length>0 ? 'var(--red)' : 'var(--text-primary)',lineHeight:1}}>{tasksAbertas}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>Tasks Abertas</div>
                  <div style={{fontSize:11,marginTop:2}}>
                    {overdueTasks.length > 0
                      ? <span style={{color:'var(--red)'}}><i className="fas fa-triangle-exclamation" style={{fontSize:9,marginRight:3}}/>{overdueTasks.length} vencidas</span>
                      : <span style={{color:'var(--green)'}}>Nenhuma vencida</span>}
                  </div>
                </div>
              </div>
              {/* Card 4: Obrigações fiscais */}
              <div className="card" style={{padding:'18px 20px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:46,height:46,borderRadius:12,background:'#f9731618',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="fas fa-receipt" style={{fontSize:20,color:'var(--orange)'}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:6}}>Obrigações Fiscais</div>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <div style={{textAlign:'center',background:'#ef444418',borderRadius:8,padding:'4px 10px'}}>
                      <div style={{fontSize:16,fontWeight:800,color:'var(--red)',lineHeight:1}}>{obrig7}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)'}}>7 dias</div>
                    </div>
                    <div style={{textAlign:'center',background:'#f59e0b1a',borderRadius:8,padding:'4px 10px'}}>
                      <div style={{fontSize:16,fontWeight:800,color:'var(--yellow)',lineHeight:1}}>{obrig30}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)'}}>30 dias</div>
                    </div>
                    <div style={{textAlign:'center',background:'#6470f11a',borderRadius:8,padding:'4px 10px'}}>
                      <div style={{fontSize:16,fontWeight:800,color:'var(--brand)',lineHeight:1}}>{obrig90}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)'}}>90 dias</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline + Audit Log side by side */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:16,alignItems:'start'}}>

              {/* Timeline de Deadlines */}
              <div className="card">
                <div className="card-title" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span><i className="fas fa-timeline" style={{marginRight:8}}/>Timeline de Deadlines — próximos 90 dias</span>
                  <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:400}}>{timelineItems.length} itens</span>
                </div>
                {timelineItems.length === 0 ? (
                  <div className="empty-state"><i className="fas fa-calendar-check"/><p>Nenhum prazo nos próximos 90 dias.</p></div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:0}}>
                    {timelineItems.map((item, idx) => {
                      const c = timelineColor(item.prazo);
                      const isLast = idx === timelineItems.length - 1;
                      return (
                        <div key={item.id} style={{display:'flex',gap:0,alignItems:'stretch'}}>
                          {/* Timeline spine */}
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:28,flexShrink:0}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:c.bar,marginTop:18,flexShrink:0,zIndex:1,boxShadow:`0 0 0 3px ${c.bar}22`}}/>
                            {!isLast && <div style={{width:2,flex:1,background:'var(--surface-border)',minHeight:12}}/>}
                          </div>
                          {/* Item body */}
                          <div style={{
                            flex:1, padding:'12px 14px', marginLeft:4, marginBottom: isLast?0:2,
                            background:'var(--surface-hover)', borderRadius:8,
                            border:`1px solid ${c.bar}33`,
                            marginBottom:6,
                          }}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                              <span style={{fontWeight:700,color:'var(--text-primary)',fontSize:13,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.titulo}</span>
                              <span className={`badge badge-${c.badge}`} style={{fontSize:10,flexShrink:0}}>{c.label}</span>
                              <span className="badge badge-brand" style={{fontSize:10,flexShrink:0}}>{item.tipo}</span>
                            </div>
                            <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:11,color:'var(--text-muted)'}}>
                              <span><i className="fas fa-building" style={{marginRight:4,color:'var(--brand)'}}/>{ item.entidade}</span>
                              {item.responsavel !== '—' && <span><i className="fas fa-user" style={{marginRight:4}}/>{ item.responsavel}</span>}
                              <span style={{color:c.bar,fontWeight:600}}>
                                <i className="fas fa-calendar" style={{marginRight:4}}/>
                                {fmt.date(item.prazo, lang)} · {daysLabel(item.prazo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Últimas Atualizações */}
              <div className="card" style={{position:'sticky',top:16}}>
                <div className="card-title"><i className="fas fa-clock-rotate-left" style={{marginRight:8}}/>Últimas Atualizações</div>
                <AuditFeed />
              </div>
            </div>
          </>
        );
      })()}

      {/* ── TASKS TAB ── */}
      {activeTab === 'tasks' && (
        <>
          {/* Summary pills */}
          <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            {[
              { label:'Vencidas', count: overdueTasks.length, color:'var(--red)', icon:'fa-circle-exclamation' },
              { label:'Hoje', count: todayTasks.length, color:'var(--yellow)', icon:'fa-clock' },
              { label:'Próximas', count: upcomingTasks.length, color:'var(--brand)', icon:'fa-calendar-check' },
              { label:'Concluídas', count: tasks.filter(tk=>tk.status==='concluida').length, color:'var(--green)', icon:'fa-circle-check' },
            ].map(s => (
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-card)',border:'1px solid var(--surface-border)',borderRadius:10,padding:'10px 18px'}}>
                <i className={`fas ${s.icon}`} style={{color:s.color,fontSize:16}}/>
                <div>
                  <div style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',lineHeight:1}}>{s.count}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {overdueTasks.length > 0 && (
            <div className="card" style={{marginBottom:16,borderColor:'rgba(239,68,68,.3)'}}>
              <div className="card-title" style={{color:'var(--red)'}}><i className="fas fa-circle-exclamation" style={{marginRight:8}}/>Tarefas Vencidas</div>
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>Tarefa</th><th>Empresa</th><th>Responsável</th><th>Vencimento</th><th>Prioridade</th><th>Status</th></tr></thead>
                <tbody>
                  {overdueTasks.map(tk => {
                    const emp = data.empresas.find(e=>e.id===tk.empresaId);
                    const prio = PRIO_MAP[tk.prioridade] || { badge:'brand', label: tk.prioridade };
                    const st = STATUS_TASK[tk.status] || { badge:'brand', label: tk.status };
                    return (
                      <tr key={tk.id}>
                        <td>
                          <div style={{fontWeight:600,color:'var(--text-primary)'}}>{tk.titulo}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{tk.categoria}</div>
                        </td>
                        <td style={{fontSize:12,color:'var(--text-secondary)'}}>{emp?.nome||'—'}</td>
                        <td style={{fontSize:12}}>{tk.responsavel}</td>
                        <td style={{color:'var(--red)',fontWeight:600,fontSize:12}}>{fmt.date(tk.vencimento,lang)}</td>
                        <td><span className={`badge badge-${prio.badge}`}>{prio.label}</span></td>
                        <td>
                          <button onClick={()=>toggleTaskStatus(tk)} className={`badge badge-${st.badge}`} style={{cursor:'pointer',border:'none',background:'transparent'}}>
                            {st.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
          )}

          <div className="card">
            <div className="card-title"><i className="fas fa-list-check" style={{marginRight:8}}/>Próximos Prazos</div>
            {pendingTasks.filter(tk=>tk.vencimento>=today).length === 0 ? (
              <div className="empty-state"><i className="fas fa-check-circle"/><p>Nenhuma tarefa pendente</p></div>
            ) : (
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>Tarefa</th><th>Empresa</th><th>Responsável</th><th>Categoria</th><th>Vencimento</th><th>Prioridade</th><th>Status</th></tr></thead>
                <tbody>
                  {[...todayTasks, ...upcomingTasks].map(tk => {
                    const emp = data.empresas.find(e=>e.id===tk.empresaId);
                    const prio = PRIO_MAP[tk.prioridade] || { badge:'brand', label: tk.prioridade };
                    const st = STATUS_TASK[tk.status] || { badge:'brand', label: tk.status };
                    const isToday = tk.vencimento === today;
                    return (
                      <tr key={tk.id}>
                        <td>
                          <div style={{fontWeight:600,color:'var(--text-primary)'}}>{tk.titulo}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{tk.descricao}</div>
                        </td>
                        <td style={{fontSize:12,color:'var(--text-secondary)'}}>{emp?.nome||'—'}</td>
                        <td style={{fontSize:12}}>{tk.responsavel}</td>
                        <td><span className="badge badge-brand" style={{fontSize:10}}>{tk.categoria}</span></td>
                        <td style={{color: isToday ? 'var(--yellow)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400, fontSize:12}}>
                          {isToday ? <><i className="fas fa-clock" style={{marginRight:4}}/>Hoje</> : fmt.date(tk.vencimento,lang)}
                        </td>
                        <td><span className={`badge badge-${prio.badge}`}>{prio.label}</span></td>
                        <td>
                          <button onClick={()=>toggleTaskStatus(tk)} className={`badge badge-${st.badge}`} style={{cursor:'pointer',border:'none',background:'transparent'}}>
                            {st.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </div>
        </>
      )}

      {/* ── ALERTS TAB ── */}
      {activeTab === 'alerts' && (
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',gap:12}}>
              {['critico','aviso','info','sucesso'].map(tipo => {
                const am = ALERT_MAP[tipo];
                const cnt = alertas.filter(a=>a.tipo===tipo).length;
                return (
                  <div key={tipo} style={{display:'flex',alignItems:'center',gap:6,background:'var(--surface-card)',border:'1px solid var(--surface-border)',borderRadius:8,padding:'6px 14px',fontSize:12}}>
                    <i className={`fas ${am.icon}`} style={{color:`var(--${am.badge==='brand'?'brand':am.badge})`}}/>
                    <span style={{color:'var(--text-secondary)'}}>{am.label}</span>
                    <span style={{color:'var(--text-primary)',fontWeight:700}}>{cnt}</span>
                  </div>
                );
              })}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-secondary" style={{fontSize:12,padding:'6px 14px'}}>
                <i className="fas fa-check-double"/>Marcar tudo como lido
              </button>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {alertas.length === 0 && (
              <div className="empty-state card"><i className="fas fa-bell-slash"/><p>Nenhum alerta registrado</p></div>
            )}
            {alertas.sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).map(alerta => {
              const am = ALERT_MAP[alerta.tipo] || ALERT_MAP.info;
              const emp = data.empresas.find(e=>e.id===alerta.empresaId);
              const tsDate = new Date(alerta.timestamp);
              const timeAgo = (() => {
                const diff = (Date.now() - tsDate.getTime()) / 1000;
                if (diff < 60) return 'agora';
                if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
                if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
                return `${Math.floor(diff/86400)}d atrás`;
              })();
              return (
                <div
                  key={alerta.id}
                  style={{
                    display:'flex', alignItems:'flex-start', gap:14,
                    background: alerta.lido ? 'var(--surface-card)' : 'var(--surface-hover)',
                    border: `1px solid ${alerta.lido ? 'var(--surface-border)' : alerta.tipo==='critico' ? 'rgba(239,68,68,.35)' : 'var(--surface-border)'}`,
                    borderRadius:10, padding:'14px 16px',
                    opacity: alerta.lido ? 0.65 : 1,
                    transition:'opacity .2s',
                  }}
                >
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: alerta.tipo==='critico' ? 'rgba(239,68,68,.15)' : alerta.tipo==='aviso' ? 'rgba(245,158,11,.15)' : alerta.tipo==='sucesso' ? 'rgba(34,197,94,.15)' : 'rgba(100,112,241,.15)',
                  }}>
                    <i className={`fas ${am.icon}`} style={{fontSize:16, color: alerta.tipo==='critico'?'var(--red)':alerta.tipo==='aviso'?'var(--yellow)':alerta.tipo==='sucesso'?'var(--green)':'var(--brand)'}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                      <span style={{fontWeight:700,color:'var(--text-primary)',fontSize:13}}>{alerta.titulo}</span>
                      <span className={`badge badge-${am.badge}`} style={{fontSize:10}}>{am.label}</span>
                      {!alerta.lido && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--brand)',flexShrink:0,display:'inline-block'}}/>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:6}}>{alerta.mensagem}</div>
                    <div style={{display:'flex',alignItems:'center',gap:12,fontSize:11,color:'var(--text-muted)'}}>
                      <span><i className="fas fa-building" style={{marginRight:4}}/>{emp?.nome||'Sistema'}</span>
                      <span><i className="fas fa-tag" style={{marginRight:4}}/>{alerta.modulo}</span>
                      <span><i className="fas fa-clock" style={{marginRight:4}}/>{timeAgo}</span>
                    </div>
                  </div>
                  {!alerta.lido && (
                    <button
                      onClick={() => markAlertRead(alerta.id)}
                      title="Marcar como lido"
                      style={{background:'none',border:'1px solid var(--surface-border)',borderRadius:6,padding:'4px 10px',color:'var(--text-muted)',cursor:'pointer',fontSize:11,flexShrink:0}}
                    >
                      Lido
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
