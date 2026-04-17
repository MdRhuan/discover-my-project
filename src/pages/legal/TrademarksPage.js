// ── INPI Status Guide ─────────────────────────────────────
function INPIStatusGuide({ isEN }) {
  const [open, setOpen] = React.useState(false);

  const SECTIONS = [
    {
      title: isEN ? 'Active Registrations' : 'Registros Ativos',
      icon: 'fa-circle-check',
      color: '#16a34a',
      items: [
        { status: 'Registro em vigor', color: '#16a34a', icon: 'fa-shield-halved', desc: 'A marca foi concedida e está ativa. Proteção legal completa no território brasileiro para as classes registradas. Validade de 10 anos, renováveis.' },
      ],
    },
    {
      title: isEN ? 'Pending Applications' : 'Pedidos em Andamento',
      icon: 'fa-hourglass-half',
      color: '#f59e0b',
      items: [
        { status: 'Aguardando exame de mérito', color: '#f59e0b', icon: 'fa-magnifying-glass', desc: 'Pedido protocolado e na fila para análise técnica pelo examinador do INPI. Fase mais longa — pode durar de 1 a 3 anos.' },
        { status: 'Publicado para oposição', color: '#3b82f6', icon: 'fa-bullhorn', desc: 'Marca publicada na Revista da Propriedade Industrial (RPI). Terceiros têm 60 dias para contestar. Se ninguém se opuser, avança para concessão.' },
        { status: 'Oposição apresentada', color: '#f97316', icon: 'fa-gavel', desc: 'Um terceiro contestou seu pedido. Você tem prazo para apresentar manifestação de contestação. O processo fica suspenso até a decisão.' },
        { status: 'Aguardando recurso / Em recurso', color: '#8b5cf6', icon: 'fa-rotate', desc: 'Uma das partes apresentou recurso administrativo. O processo aguarda julgamento do recurso.' },
        { status: 'Sobrestado', color: '#06b6d4', icon: 'fa-pause-circle', desc: 'Processo temporariamente suspenso aguardando resolução de outro processo relacionado, como uma marca anterior em conflito.' },
      ],
    },
    {
      title: isEN ? 'Closed / Blocked' : 'Encerrados ou Bloqueados',
      icon: 'fa-ban',
      color: '#ef4444',
      items: [
        { status: 'Definitivamente arquivado', color: '#ef4444', icon: 'fa-box-archive', desc: 'Pedido abandonado ou cancelado sem chegar ao registro. Causas: falta de pagamento de taxas, não cumprimento de exigências ou desistência do titular.' },
        { status: 'Indeferido', color: '#ef4444', icon: 'fa-xmark-circle', desc: 'O INPI negou o registro após análise técnica. Motivos: falta de distintividade, conflito com marca anterior, marca descritiva ou genérica. É possível recorrer.' },
        { status: 'Caducado', color: '#dc2626', icon: 'fa-hourglass-end', desc: 'Registro concedido mas expirado por falta de renovação ou por não uso comprovado da marca por 5 anos consecutivos.' },
        { status: 'Extinto', color: '#9ca3af', icon: 'fa-trash-can', desc: 'Registro cancelado definitivamente por pedido do próprio titular, decisão judicial ou outro motivo legal.' },
      ],
    },
  ];

  return (
    <div style={{marginBottom:16,borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
      <button
        onClick={()=>setOpen(v=>!v)}
        style={{width:'100%',background:'var(--surface)',border:'none',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',gap:10}}
      >
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#16a34a18',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="fas fa-book-open" style={{fontSize:12,color:'#16a34a'}}/>
          </div>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>
              {isEN ? 'INPI Trademark Status Guide' : 'Guia de Status INPI — Registro de Marca'}
            </div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>
              {isEN ? '10 stages · Click to expand' : '10 etapas · Clique para expandir'}
            </div>
          </div>
        </div>
        <i className={`fas fa-chevron-${open?'up':'down'}`} style={{fontSize:11,color:'var(--text-muted)',flexShrink:0}}/>
      </button>

      {open && (
        <div style={{background:'var(--card)',borderTop:'1px solid var(--border)',padding:'16px'}}>

          {/* Sections */}
          {SECTIONS.map(sec => (
            <div key={sec.title} style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <i className={`fas ${sec.icon}`} style={{fontSize:12,color:sec.color}}/>
                <span style={{fontSize:11,fontWeight:800,color:sec.color,textTransform:'uppercase',letterSpacing:'0.07em'}}>{sec.title}</span>
                <div style={{flex:1,height:1,background:`${sec.color}30`}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8}}>
                {sec.items.map((item,i) => (
                  <div key={i} style={{display:'flex',gap:11,padding:'10px 12px',borderRadius:10,background:'var(--surface)',border:`1px solid ${item.color}25`,alignItems:'flex-start'}}>
                    <div style={{flexShrink:0,width:28,height:28,borderRadius:8,background:`${item.color}15`,border:`1.5px solid ${item.color}35`,display:'flex',alignItems:'center',justifyContent:'center',marginTop:1}}>
                      <i className={`fas ${item.icon}`} style={{fontSize:11,color:item.color}}/>
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{display:'inline-flex',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:`${item.color}18`,color:item.color,marginBottom:5,lineHeight:1.4}}>
                        {item.status}
                      </div>
                      <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.55}}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Flow diagram */}
          <div style={{marginTop:4,background:'var(--surface)',borderRadius:10,padding:'14px 16px',border:'1px solid var(--border)'}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
              <i className="fas fa-diagram-project" style={{color:'var(--brand)'}}/>{isEN?'Process Flow':'Fluxo do Processo'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:0,flexWrap:'wrap',rowGap:6}}>
              {[
                {label:isEN?'Filing':'Depósito',         color:'#3b82f6'},
                {label:isEN?'Formal Review':'Exame Formal', color:'#8b5cf6'},
                {label:isEN?'Merit Exam':'Exame Mérito',  color:'#f59e0b'},
                {label:isEN?'Publication':'Publicação',   color:'#06b6d4'},
                {label:isEN?'Opposition':'Oposição',      color:'#f97316', optional:true},
                {label:isEN?'Grant':'Concessão',          color:'#16a34a'},
                {label:isEN?'Registered':'Em Vigor ✅',   color:'#16a34a', bold:true},
              ].map((step,i,arr) => (
                <React.Fragment key={i}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                    <div style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700,background:`${step.color}18`,color:step.color,border:`1px solid ${step.color}35`,whiteSpace:'nowrap'}}>
                      {step.label}
                    </div>
                    {step.optional && <div style={{fontSize:9,color:'var(--text-muted)',fontStyle:'italic'}}>(se houver)</div>}
                  </div>
                  {i < arr.length-1 && <i className="fas fa-arrow-right" style={{fontSize:9,color:'var(--text-muted)',margin:'0 4px',flexShrink:0}}/>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Links */}
          <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>
            <a href="https://busca.inpi.gov.br" target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
              <button className="btn-secondary" style={{fontSize:11,display:'flex',alignItems:'center',gap:6}}>
                <i className="fas fa-external-link-alt"/>busca.inpi.gov.br
              </button>
            </a>
          </div>

        </div>
      )}
    </div>
  );
}

// ── USPTO Status Guide ────────────────────────────────────
function USPTOStatusGuide({ isEN }) {
  const [open, setOpen] = React.useState(false);

  const STEPS = [
    { status:'Drafting',                        color:'#94a3b8', icon:'fa-pen-to-square',    desc:'Marca ainda está sendo preparada para protocolo. Ainda não foi enviada ao USPTO.' },
    { status:'Filed',                           color:'#3b82f6', icon:'fa-file-arrow-up',    desc:'Pedido já foi protocolado no USPTO e aguarda análise inicial.' },
    { status:'Under Examination',               color:'#8b5cf6', icon:'fa-magnifying-glass', desc:'O examinador do USPTO está analisando o pedido. Pode aprovar ou emitir exigência.' },
    { status:'Office Action – Pending Response',color:'#f97316', icon:'fa-triangle-exclamation', desc:'O USPTO identificou um problema e exige resposta dentro de prazo. Se não responder, o pedido é abandonado.' },
    { status:'Approved for Publication',        color:'#06b6d4', icon:'fa-circle-check',     desc:'O examinador aprovou. A marca será publicada para possíveis oposições de terceiros.' },
    { status:'Published – Opposition Period',   color:'#0ea5e9', icon:'fa-bullhorn',         desc:'Marca publicada oficialmente. Terceiros têm 30 dias para contestar. Se não houver oposição, segue para registro.' },
    { status:'Notice of Allowance',             color:'#10b981', icon:'fa-envelope-open-text', desc:'Marca aprovada, mas precisa comprovar uso comercial antes de virar registro definitivo.' },
    { status:'Statement of Use Filed',          color:'#22c55e', icon:'fa-file-signature',   desc:'Comprovante de uso já enviado ao USPTO. Aguardando validação final para registro.' },
    { status:'Extension of Time to File SOU',   color:'#f59e0b', icon:'fa-clock-rotate-left', desc:'Prazo adicional solicitado para comprovar uso. Existe limite máximo de extensões.' },
    { status:'Registered',                      color:'#16a34a', icon:'fa-shield-halved',    desc:'Marca oficialmente registrada. Proteção ativa nos EUA.' },
    { status:'Abandoned',                       color:'#ef4444', icon:'fa-ban',              desc:'Processo encerrado pelo USPTO por falta de resposta ou cumprimento de exigências.' },
    { status:'Client Decided Not to Proceed',   color:'#6b7280', icon:'fa-hand',             desc:'Decisão estratégica da empresa de não continuar com o processo.' },
  ];

  return (
    <div style={{marginBottom:16,borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
      {/* Header toggle */}
      <button
        onClick={()=>setOpen(v=>!v)}
        style={{width:'100%',background:'var(--surface)',border:'none',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',gap:10}}
      >
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#3b82f618',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="fas fa-circle-info" style={{fontSize:13,color:'#3b82f6'}}/>
          </div>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>
              {isEN ? 'USPTO Trademark Process Guide' : 'Guia do Processo de Marca no USPTO'}
            </div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>
              {isEN ? '12 stages · Click to expand' : '12 etapas · Clique para expandir'}
            </div>
          </div>
        </div>
        <i className={`fas fa-chevron-${open?'up':'down'}`} style={{fontSize:11,color:'var(--text-muted)',flexShrink:0}}/>
      </button>

      {/* Content */}
      {open && (
        <div style={{background:'var(--card)',borderTop:'1px solid var(--border)',padding:'16px 16px 12px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8}}>
            {STEPS.map((step, i) => (
              <div key={step.status} style={{
                display:'flex',gap:12,padding:'10px 12px',borderRadius:10,
                background:'var(--surface)',border:`1px solid ${step.color}28`,
                alignItems:'flex-start',
              }}>
                {/* Step number + icon */}
                <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:4,paddingTop:2}}>
                  <div style={{
                    width:28,height:28,borderRadius:8,
                    background:`${step.color}18`,border:`1.5px solid ${step.color}40`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <i className={`fas ${step.icon}`} style={{fontSize:11,color:step.color}}/>
                  </div>
                  <span style={{fontSize:9,fontWeight:800,color:step.color,opacity:0.7}}>{String(i+1).padStart(2,'0')}</span>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{
                    display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:6,
                    fontSize:11,fontWeight:700,background:`${step.color}18`,color:step.color,
                    marginBottom:5,lineHeight:1.4,
                  }}>
                    {step.status}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.55}}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* USPTO link */}
          <div style={{marginTop:10}}>
            <a href="https://uspto.gov/trademarks/search" target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
              <button className="btn-secondary" style={{fontSize:11,display:'flex',alignItems:'center',gap:6}}>
                <i className="fas fa-external-link-alt"/>uspto.gov/trademarks/search
              </button>
            </a>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Trademark Management ───────────────────────────────────
function TrademarksPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows]           = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('BR');
  const [search, setSearch]       = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterClass, setFilterClass]   = React.useState('all');
  const [filterOwner, setFilterOwner]   = React.useState('all');
  const [modal, setModal]         = React.useState(false);
  const [modalPais, setModalPais] = React.useState('BR');
  const [form, setForm]           = React.useState({});
  const [editing, setEditing]     = React.useState(null);
  const [detail, setDetail]       = React.useState(null);
  const [confirm, setConfirm]     = React.useState(null);
  const isEN = lang === 'en-US';

  const SEED_BR = [];
  const SEED_US = [];

  const STATUS_BR = {
    registrada:  { label:'Registrada',  en:'Registered',  color:'#22c55e' },
    em_analise:  { label:'Em Análise',  en:'Under Review', color:'#f59e0b' },
    oposicao:    { label:'Oposição',    en:'Opposition',   color:'#f97316' },
    indeferida:  { label:'Indeferida',  en:'Refused',      color:'#ef4444' },
  };
  const STATUS_US = {
    registered:  { label:'Registered',  pt:'Registrada',  color:'#22c55e' },
    pending:     { label:'Pending',     pt:'Pendente',     color:'#f59e0b' },
    opposition:  { label:'Opposition',  pt:'Oposição',     color:'#f97316' },
    abandoned:   { label:'Abandoned',   pt:'Abandonada',   color:'#ef4444' },
  };

  const NICE_CLASSES = Array.from({length:45},(_,i)=>{
    const n = i+1;
    const desc = {1:'Químicos',2:'Tintas',3:'Cosméticos',4:'Lubrificantes',5:'Farmacêuticos',6:'Metais',7:'Máquinas',8:'Ferramentas',9:'Eletrônicos/Software',10:'Instrumentos Médicos',11:'Iluminação',12:'Veículos',13:'Armas',14:'Joias',15:'Instrumentos Musicais',16:'Papel/Impressos',17:'Borracha',18:'Couro',19:'Materiais Construção',20:'Móveis',21:'Utensílios Domésticos',22:'Cordas/Redes',23:'Fios',24:'Têxteis',25:'Vestuário',26:'Rendas/Bordados',27:'Tapetes',28:'Brinquedos',29:'Alimentos',30:'Alimentos Processados',31:'Produtos Agrícolas',32:'Bebidas',33:'Bebidas Alcoólicas',34:'Tabaco',35:'Publicidade/Negócios',36:'Finanças/Seguros',37:'Construção',38:'Telecomunicações',39:'Transporte',40:'Tratamento Materiais',41:'Educação/Entretenimento',42:'Serviços Científicos/TI',43:'Restaurantes/Hotéis',44:'Saúde',45:'Serviços Jurídicos'};
    return {val:String(n).padStart(2,'0'), label:`Cl. ${n} – ${desc[n]||''}`};
  });

  async function load() {
    const data = await db.trademarks.toArray();
    if (data.length === 0) {
      const all = [...SEED_BR, ...SEED_US];
      for (const r of all) await db.trademarks.add(r);
      setRows([...SEED_BR, ...SEED_US].map((r,i) => ({...r, id: i+1})));
    } else {
      setRows(data.sort((a,b) => (b.id||0)-(a.id||0)));
    }
  }

  React.useEffect(() => { load(); }, []);

  // ── Deadline helpers ──────────────────────────────────────
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000*60*60*24));
  }
  function deadlineBadge(dateStr) {
    const d = daysUntil(dateStr);
    if (d === null) return null;
    if (d < 0) return { label: isEN ? 'Overdue' : 'Vencida', color:'#ef4444' };
    if (d <= 7) return { label: isEN ? `Urgent (${d}d)` : `Urgente (${d}d)`, color:'#ef4444' };
    if (d <= 30) return { label: isEN ? `Due soon (${d}d)` : `Vence em breve (${d}d)`, color:'#f97316' };
    return null;
  }

  const tabRows = rows.filter(r => r.pais === activeTab);
  const owners  = [...new Set(tabRows.map(r => r.titular).filter(Boolean))];
  const classes = [...new Set(tabRows.map(r => r.classe).filter(Boolean))];

  const filtered = React.useMemo(() => {
    const base = rows.filter(r => r.pais === activeTab);
    return base.filter(r => {
      const q = search.toLowerCase();
      const mq = !q || r.nome?.toLowerCase().includes(q) || r.titular?.toLowerCase().includes(q);
      const ms = filterStatus === 'all' || r.status === filterStatus;
      const mc = filterClass  === 'all' || r.classe === filterClass;
      const mo = filterOwner  === 'all' || r.titular === filterOwner;
      return mq && ms && mc && mo;
    });
  }, [rows, activeTab, search, filterStatus, filterClass, filterOwner]);

  const urgentCount = React.useMemo(() => {
    return rows.filter(r => {
      const deadline = r.next_deadline || r.due_date || r.data_vencimento;
      const d = daysUntil(deadline);
      return d !== null && d >= 0 && d <= 30;
    }).length;
  }, [rows]);

  // ── CRUD ──────────────────────────────────────────────────
  function openNew(pais) {
    setModalPais(pais);
    setForm({ pais, status: pais==='BR'?'em_analise':'pending', tipo:'nominativa' });
    setEditing(null);
    setModal(true);
  }
  function openEdit(row) {
    setModalPais(row.pais);
    setForm({...row});
    setEditing(row.id);
    setModal(true);
  }
  async function handleSave() {
    if (!form.nome?.trim()) { toast(isEN?'Trademark name required':'Nome da marca obrigatório','error'); return; }
    if (!form.titular?.trim()) { toast(isEN?'Owner required':'Titular obrigatório','error'); return; }
    if (editing) {
      await db.trademarks.update(editing, {...form});
      toast(isEN?'Updated':'Atualizado');
    } else {
      await db.trademarks.add({...form});
      toast(isEN?'Trademark added':'Marca cadastrada');
    }
    setModal(false);
    load();
  }
  async function handleDelete(id) {
    await db.trademarks.delete(id);
    setConfirm(null);
    setDetail(null);
    toast(isEN?'Deleted':'Excluído');
    load();
  }
  function fv(key) { return e => setForm(p => ({...p, [key]: typeof e === 'string' ? e : e.target.value})); }

  const StatusMap = activeTab==='BR' ? STATUS_BR : STATUS_US;
  function getStatusInfo(row) {
    const map = row.pais==='BR' ? STATUS_BR : STATUS_US;
    const s = map[row.status] || {};
    const lbl = row.pais==='BR' ? (isEN ? s.en : s.label) : (isEN ? s.label : s.pt);
    return { label: lbl || row.status, color: s.color || '#888' };
  }

  // ── Detail Modal (helper) ─────────────────────────────────
  function DetailModal() {
    if (!detail) return null;
    const { label: sLabel, color: sColor } = getStatusInfo(detail);
    const deadline = detail.next_deadline || detail.due_date || detail.data_vencimento;
    const badge = deadlineBadge(deadline);
    const isBR = detail.pais === 'BR';
    const inpiUrl = isBR && detail.numero_processo
      ? `https://busca.inpi.gov.br/pePI/servlet/MarcasServletController?Action=searchMarca&NumPedido=${detail.numero_processo}`
      : null;

    function Field({ label, value, full }) {
      if (!value) return null;
      return (
        <div style={{background:'var(--surface)',borderRadius:8,padding:'10px 14px',gridColumn: full ? '1/-1' : undefined}}>
          <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{value}</div>
        </div>
      );
    }

    function SectionTitle({ icon, label }) {
      return (
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,marginTop:20}}>
          <i className={`fas ${icon}`} style={{fontSize:12,color:'var(--brand)'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</span>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
        </div>
      );
    }

    return (
      <div className="modal-overlay" onClick={()=>setDetail(null)}>
        <div className="modal" style={{maxWidth:680,padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>

          {/* ── Banner header ── */}
          <div style={{
            background: `linear-gradient(135deg, ${sColor}22 0%, ${sColor}08 100%)`,
            borderBottom: `1px solid ${sColor}30`,
            padding: '22px 24px 18px',
          }}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:48,height:48,borderRadius:14,
                  background:`${sColor}18`,border:`2px solid ${sColor}40`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:24,flexShrink:0,
                }}>
                  {isBR ? '🇧🇷' : '🇺🇸'}
                </div>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--text)',lineHeight:1.2}}>{detail.nome}</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginTop:3}}>{detail.titular}</div>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                <button className="modal-close" onClick={()=>setDetail(null)} style={{margin:0}}><i className="fas fa-times"/></button>
                <span style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,background:sColor+'22',color:sColor,whiteSpace:'nowrap'}}>{sLabel}</span>
                {badge && <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:badge.color+'15',color:badge.color,display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}><i className="fas fa-clock" style={{fontSize:9}}/>{badge.label}</span>}
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{padding:'4px 24px 20px',overflowY:'auto',maxHeight:'calc(90vh - 160px)'}}>

            {/* Identification section */}
            <SectionTitle icon="fa-fingerprint" label={isEN ? 'Identification' : 'Identificação'}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label={isEN?'Trademark':'Marca'} value={detail.nome}/>
              <Field label="Owner" value={detail.titular}/>
              <Field label="Class" value={detail.classe ? `Cl. ${parseInt(detail.classe)} – Nice` : null}/>
              {isBR && <Field label={isEN?'Brand Type':'Tipo de Marca'} value={detail.tipo}/>}
              {!isBR && <Field label="US Serial Number" value={detail.us_serial}/>}
              <Field label={isEN?'Registration':'Nº Registro'} value={detail.numero_registro}/>
              {isBR && <Field label={isEN?'Application (INPI)':'Nº Processo (INPI)'} value={detail.numero_processo}/>}
            </div>

            {/* Dates section */}
            <SectionTitle icon="fa-calendar-alt" label={isEN ? 'Dates & Deadlines' : 'Datas & Prazos'}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label={isEN?'Filing Date':'Data de Depósito'} value={detail.data_deposito}/>
              {isBR && <Field label={isEN?'Grant Date':'Data de Concessão'} value={detail.data_concessao}/>}
              <Field label={isEN?'Expiry':'Vencimento'} value={detail.data_vencimento}/>
              <Field label={isEN?'Next Deadline':'Próximo Prazo'} value={detail.next_deadline}/>
              {!isBR && <Field label="Due Date" value={detail.due_date}/>}
            </div>

            {/* Financial section (BR only) */}
            {isBR && detail.valor && <>
              <SectionTitle icon="fa-dollar-sign" label={isEN ? 'Financial' : 'Financeiro'}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Field label={isEN?'Value':'Valor'} value={`R$ ${parseFloat(detail.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}`}/>
              </div>
            </>}

            {/* INPI Link (BR only) */}
            {inpiUrl && <>
              <SectionTitle icon="fa-link" label="INPI"/>
              <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.05em'}}>Link de Consulta</div>
                  <div style={{fontSize:11,color:'var(--brand)',wordBreak:'break-all',lineHeight:1.5}}>{inpiUrl}</div>
                </div>
                <a href={inpiUrl} target="_blank" rel="noreferrer" style={{textDecoration:'none',flexShrink:0}}>
                  <button className="btn-secondary" style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
                    <i className="fas fa-external-link-alt"/>Abrir INPI
                  </button>
                </a>
              </div>
            </>}

            {/* Goods/Services (US only) */}
            {!isBR && detail.goods_services && <>
              <SectionTitle icon="fa-tags" label="Proposed Goods / Services"/>
              <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:13,color:'var(--text)',lineHeight:1.7}}>{detail.goods_services}</div>
              </div>
            </>}

            {/* Notes */}
            {detail.observacoes && <>
              <SectionTitle icon="fa-note-sticky" label={isEN?'Notes':'Observações'}/>
              <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:13,color:'var(--text)',lineHeight:1.7}}>{detail.observacoes}</div>
              </div>
            </>}

            {/* Files */}
            <SectionTitle icon="fa-paperclip" label="Files"/>
            <div style={{background:'var(--surface)',borderRadius:8,padding:'12px 14px'}}>
              {(!detail.files || detail.files.length===0) ? (
                <div style={{fontSize:12,color:'var(--text-muted)',fontStyle:'italic'}}>{isEN?'No files attached.':'Nenhum arquivo anexado.'}</div>
              ) : (
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {detail.files.map((f,i)=>(
                    <span key={i} style={{fontSize:11,background:'var(--border)',padding:'4px 12px',borderRadius:6,display:'flex',alignItems:'center',gap:5}}>
                      <i className="fas fa-file" style={{fontSize:10,color:'var(--brand)'}}/>{f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer actions ── */}
          <div style={{padding:'14px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:8,background:'var(--card)'}}>
            <button className="btn-secondary" onClick={()=>setDetail(null)}>{isEN?'Close':'Fechar'}</button>
            <button className="btn-secondary" onClick={()=>{openEdit(detail);setDetail(null);}}>
              <i className="fas fa-edit" style={{marginRight:6}}/>{isEN?'Edit':'Editar'}
            </button>
            <button className="btn-danger" onClick={()=>setConfirm(detail.id)}>
              <i className="fas fa-trash" style={{marginRight:6}}/>{isEN?'Delete':'Excluir'}
            </button>
          </div>
        </div>

        {/* Confirm delete inside detail modal */}
        {confirm === detail.id && (
          <div className="modal-overlay" style={{zIndex:210}} onClick={()=>setConfirm(null)}>
            <div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
              <div className="modal-header"><span className="modal-title">{isEN?'Confirm Delete':'Confirmar Exclusão'}</span></div>
              <div style={{padding:'16px 20px',fontSize:14,color:'var(--text)'}}>{isEN?'This cannot be undone.':'Esta ação não pode ser desfeita.'}</div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={()=>setConfirm(null)}>{isEN?'Cancel':'Cancelar'}</button>
                <button className="btn-danger" onClick={()=>handleDelete(detail.id)}>{isEN?'Delete':'Excluir'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main List View ────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,var(--brand) 0%,#6366f1 100%)',borderRadius:16,padding:'28px 32px',marginBottom:24,color:'#fff',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-20,top:-20,fontSize:120,opacity:0.08,lineHeight:1}}>™</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:6}}>Trademark Management</div>
        <div style={{fontSize:14,opacity:0.85,marginBottom:20}}>
          {isEN ? 'Manage your trademarks in Brazil and the United States' : 'Gerencie suas marcas registradas no Brasil e nos Estados Unidos'}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button
            onClick={()=>openNew('BR')}
            style={{background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.5)',borderRadius:10,padding:'9px 18px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:7,backdropFilter:'blur(4px)'}}
          >
            <span style={{fontSize:16}}>🇧🇷</span> + {isEN?'Add Brand BR':'Adicionar Marca BR'}
          </button>
          <button
            onClick={()=>openNew('US')}
            style={{background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.5)',borderRadius:10,padding:'9px 18px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:7,backdropFilter:'blur(4px)'}}
          >
            <span style={{fontSize:16}}>🇺🇸</span> + {isEN?'Add Brand USA':'Adicionar Marca USA'}
          </button>
        </div>
      </div>

      {/* Urgent alert banner */}
      {urgentCount > 0 && (
        <div style={{background:'#f97316'+'18',border:'1px solid #f9731640',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
          <i className="fas fa-triangle-exclamation" style={{color:'#f97316',fontSize:14}}/>
          <span style={{fontSize:13,color:'var(--text)',fontWeight:600}}>
            {urgentCount} {isEN ? `brand${urgentCount>1?'s':''} with deadline in the next 30 days` : `marca${urgentCount>1?'s':''} com prazo nos próximos 30 dias`}
          </span>
        </div>
      )}

      {/* Country tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface)',borderRadius:12,padding:4,width:'fit-content'}}>
        {[{key:'BR',flag:'🇧🇷',label:'Brasil'},{key:'US',flag:'🇺🇸',label:'USA'}].map(tab => {
          const cnt = rows.filter(r=>r.pais===tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={()=>{setActiveTab(tab.key);setFilterStatus('all');setFilterClass('all');setFilterOwner('all');setSearch('');}}
              style={{
                padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,
                display:'flex',alignItems:'center',gap:7,transition:'all 0.15s',
                background: activeTab===tab.key ? 'var(--brand)' : 'transparent',
                color: activeTab===tab.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              <span style={{fontSize:16}}>{tab.flag}</span>
              {tab.label}
              <span style={{
                fontSize:10,padding:'1px 7px',borderRadius:10,fontWeight:700,
                background: activeTab===tab.key ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                color: activeTab===tab.key ? '#fff' : 'var(--text-muted)',
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Status Guides — per country */}
      {activeTab === 'BR' && <INPIStatusGuide isEN={isEN}/>}
      {activeTab === 'US' && <USPTOStatusGuide isEN={isEN}/>}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 10px'}}>
        <div style={{position:'relative',flex:'1 1 180px'}}>
          <i className="fas fa-search" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:11,pointerEvents:'none'}}/>
          <input
            style={{paddingLeft:32,width:'100%',height:34,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',boxSizing:'border-box'}}
            placeholder={isEN?'Search trademark or owner…':'Buscar marca ou titular…'}
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {[
          { value: filterStatus, onChange: e=>setFilterStatus(e.target.value), options: [
            {val:'all', label: isEN?'All statuses':'Todos status'},
            ...Object.entries(activeTab==='BR'?STATUS_BR:STATUS_US).map(([k,v])=>({val:k, label: activeTab==='BR'?(isEN?v.en:v.label):(isEN?v.label:v.pt)})),
          ]},
          { value: filterClass, onChange: e=>setFilterClass(e.target.value), options: [
            {val:'all', label: isEN?'All classes':'Todas as classes'},
            ...classes.map(c=>({val:c, label:`Cl. ${c}`})),
          ]},
          { value: filterOwner, onChange: e=>setFilterOwner(e.target.value), options: [
            {val:'all', label: isEN?'All owners':'Todos os titulares'},
            ...owners.map(o=>({val:o, label:o})),
          ]},
        ].map((sel,i) => (
          <select key={i}
            value={sel.value} onChange={sel.onChange}
            style={{height:34,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:13,padding:'0 28px 0 10px',outline:'none',cursor:'pointer',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23888' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 10px) center',minWidth:130}}>
            {sel.options.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        ))}
        {(search||filterStatus!=='all'||filterClass!=='all'||filterOwner!=='all') && (
          <button onClick={()=>{setSearch('');setFilterStatus('all');setFilterClass('all');setFilterOwner('all');}}
            style={{height:34,padding:'0 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-muted)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
            <i className="fas fa-xmark" style={{fontSize:11}}/>{isEN?'Clear':'Limpar'}
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-trademark" style={{fontSize:32,color:'var(--brand)',marginBottom:12}}/>
          <p style={{fontSize:14}}>{isEN?'No trademarks found.':'Nenhuma marca encontrada.'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEN?'Trademark':'Marca'}</th>
                <th>{isEN?'Class':'Classe'}</th>
                <th>Status</th>
                <th>{isEN?'Owner':'Titular'}</th>
                {activeTab==='BR' ? <th>{isEN?'Registration':'Registro'}</th> : <th>US Serial Number</th>}
                <th>{isEN?'Next Deadline':'Próximo Prazo'}</th>
                <th style={{width:90}}>{isEN?'Actions':'Ações'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const { label: sLbl, color: sCol } = getStatusInfo(row);
                const deadline = row.next_deadline || row.due_date || row.data_vencimento;
                const badge = deadlineBadge(deadline);
                return (
                  <tr key={row.id} style={{cursor:'pointer'}} onClick={()=>setDetail(row)}>
                    <td style={{fontWeight:700,color:'var(--text)'}}>{row.nome}</td>
                    <td>
                      {row.classe
                        ? <span style={{display:'inline-flex',alignItems:'center',padding:'2px 9px',borderRadius:6,fontSize:11,fontWeight:700,background:'var(--brand)18',color:'var(--brand)',border:'1px solid var(--brand)30',whiteSpace:'nowrap'}}>Cl. {row.classe}</span>
                        : <span style={{color:'var(--text-muted)'}}>—</span>}
                    </td>
                    <td>
                      <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:sCol+'22',color:sCol,whiteSpace:'nowrap'}}>{sLbl}</span>
                    </td>
                    <td style={{fontSize:12,color:'var(--text-muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.titular}</td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{(activeTab==='BR'?row.numero_registro:row.us_serial)||'—'}</td>
                    <td>
                      {deadline ? (
                        <div style={{display:'flex',flexDirection:'column',gap:3}}>
                          <span style={{fontSize:12}}>{deadline}</span>
                          {badge && <span style={{fontSize:10,fontWeight:700,color:badge.color}}>{badge.label}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" title={isEN?'View':'Ver'} onClick={()=>setDetail(row)}><i className="fas fa-eye"/></button>
                        <button className="btn-icon" title={isEN?'Edit':'Editar'} onClick={()=>openEdit(row)}><i className="fas fa-edit"/></button>
                        <button className="btn-icon" title={isEN?'Delete':'Excluir'} style={{color:'var(--red)'}} onClick={()=>{setConfirm(row.id);}}><i className="fas fa-trash"/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline delete confirm (list view) */}
      {confirm && !detail && (
        <div className="modal-overlay" onClick={()=>setConfirm(null)}>
          <div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{isEN?'Confirm Delete':'Confirmar Exclusão'}</span></div>
            <div style={{padding:'16px 20px',fontSize:14,color:'var(--text)'}}>{isEN?'This cannot be undone.':'Esta ação não pode ser desfeita.'}</div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={()=>setConfirm(null)}>{isEN?'Cancel':'Cancelar'}</button>
              <button className="btn-danger" onClick={()=>handleDelete(confirm)}>{isEN?'Delete':'Excluir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Add / Edit */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modalPais==='BR' ? '🇧🇷' : '🇺🇸'}{' '}
                {editing ? (isEN?'Edit Trademark':'Editar Marca') : (isEN?'New Trademark':'Nova Marca')}
              </span>
              <button className="modal-close" onClick={()=>setModal(false)}><i className="fas fa-times"/></button>
            </div>
            <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {/* Common: Trademark name */}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Trademark *</label>
                <input className="form-input" value={form.nome||''} onChange={fv('nome')} placeholder="Nome da marca / Brand name"/>
              </div>

              {/* Owner */}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Owner *</label>
                <input className="form-input" value={form.titular||''} onChange={fv('titular')}/>
              </div>

              {/* Class — free text with tag preview */}
              <div className="form-group">
                <label className="form-label">Class *</label>
                <input
                  className="form-input"
                  value={form.classe||''}
                  onChange={fv('classe')}
                  placeholder={isEN?'e.g. 35':'ex: 35'}
                />
                {form.classe && (
                  <div style={{marginTop:6}}>
                    <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:12,fontWeight:700,background:'var(--brand)18',color:'var(--brand)',border:'1px solid var(--brand)30'}}>
                      Cl. {form.classe}
                    </span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select className="form-input" value={form.status||''} onChange={fv('status')}>
                  {Object.entries(modalPais==='BR'?STATUS_BR:STATUS_US).map(([k,v])=>(
                    <option key={k} value={k}>{modalPais==='BR'?(isEN?v.en:v.label):(isEN?v.label:v.pt)}</option>
                  ))}
                </select>
              </div>

              {/* BR-specific fields */}
              {modalPais==='BR' && <>
                <div className="form-group">
                  <label className="form-label">{isEN?'Brand Type *':'Tipo de Marca *'}</label>
                  <select className="form-input" value={form.tipo||'nominativa'} onChange={fv('tipo')}>
                    {[{v:'nominativa',l:'Nominativa'},{v:'figurativa',l:'Figurativa'},{v:'mista',l:'Mista'},{v:'tridimensional',l:'Tridimensional'}]
                      .map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{isEN?'Application / Process':'Nº Processo'}</label>
                  <input className="form-input" value={form.numero_processo||''} onChange={fv('numero_processo')} placeholder="90000000000"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{isEN?'Registration':'Nº Registro'}</label>
                  <input className="form-input" value={form.numero_registro||''} onChange={fv('numero_registro')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{isEN?'Value (R$)':'Valor (R$)'}</label>
                  <input className="form-input" type="number" value={form.valor||''} onChange={fv('valor')} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{isEN?'Filing Date':'Data de Depósito'}</label>
                  <input className="form-input" type="date" value={form.data_deposito||''} onChange={fv('data_deposito')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{isEN?'Grant Date / Expiry':'Data de Concessão / Vencimento'}</label>
                  <input className="form-input" type="date" value={form.data_vencimento||''} onChange={fv('data_vencimento')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Next Deadline</label>
                  <input className="form-input" type="date" value={form.next_deadline||''} onChange={fv('next_deadline')}/>
                  {form.next_deadline && deadlineBadge(form.next_deadline) && (
                    <div style={{marginTop:4,fontSize:11,fontWeight:700,color:deadlineBadge(form.next_deadline).color}}>
                      <i className="fas fa-triangle-exclamation" style={{marginRight:4}}/>{deadlineBadge(form.next_deadline).label}
                    </div>
                  )}
                </div>
              </>}

              {/* US-specific fields */}
              {modalPais==='US' && <>
                <div className="form-group">
                  <label className="form-label">US Serial Number</label>
                  <input className="form-input" value={form.us_serial||''} onChange={fv('us_serial')} placeholder="97123456"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Registration</label>
                  <input className="form-input" value={form.numero_registro||''} onChange={fv('numero_registro')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Filing Date</label>
                  <input className="form-input" type="date" value={form.data_deposito||''} onChange={fv('data_deposito')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date||''} onChange={fv('due_date')}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Next Deadline</label>
                  <input className="form-input" type="date" value={form.next_deadline||''} onChange={fv('next_deadline')}/>
                  {form.next_deadline && deadlineBadge(form.next_deadline) && (
                    <div style={{marginTop:4,fontSize:11,fontWeight:700,color:deadlineBadge(form.next_deadline).color}}>
                      <i className="fas fa-triangle-exclamation" style={{marginRight:4}}/>{deadlineBadge(form.next_deadline).label}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Proposed Goods/Services</label>
                  <textarea className="form-input" rows={2} value={form.goods_services||''} onChange={fv('goods_services')}/>
                </div>
              </>}

              {/* Notes */}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Notes / {isEN?'Observations':'Observações'}</label>
                <textarea className="form-input" rows={3} value={form.observacoes||''} onChange={fv('observacoes')}/>
              </div>

              {/* Files note */}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Files</label>
                <div style={{background:'var(--surface)',border:'2px dashed var(--border)',borderRadius:8,padding:'14px',textAlign:'center',color:'var(--text-muted)',fontSize:12}}>
                  <i className="fas fa-cloud-upload-alt" style={{fontSize:20,marginBottom:6,display:'block'}}/>
                  {isEN?'File upload available after saving (PDF, PNG, JPG)':'Upload de arquivos disponível após salvar (PDF, PNG, JPG)'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={()=>setModal(false)}>{isEN?'Cancel':'Cancelar'}</button>
              <button className="btn-primary" onClick={handleSave}>{isEN?'Save':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      <DetailModal/>
    </div>
  );
}
