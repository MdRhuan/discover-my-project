// ── Company Detail (ficha completa da empresa) ───────────────
function CompanyDetail({ empresa, onClose, onEdit, lang, toast }) {
  const { t } = useApp();
  const [tab, setTab] = useState('overview');
  const [docs, setDocs] = useState([]);
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({});
  const [docTagInput, setDocTagInput] = useState('');
  const [docFilterTag, setDocFilterTag] = useState('');
  const docFileRef = useRef(null);

  // Fiscal obligations
  const FISCAL_KEY = `fiscal_obrigacoes_${empresa.id}`;
  const [fiscalObs, setFiscalObs] = useState([]);
  const [fiscalModal, setFiscalModal] = useState(false);
  const [fiscalForm, setFiscalForm] = useState({});

  // Compliance checklist
  const COMPLIANCE_KEY = `compliance_${empresa.id}`;
  const [checklist, setChecklist] = useState([]);
  const [checkModal, setCheckModal] = useState(false);
  const [checkForm, setCheckForm] = useState({});

  const DEFAULT_CHECKLIST_US = [
    'Annual Report filing', 'Registered Agent renewal', 'State franchise tax',
    'BOI Report (FinCEN)', 'Annual minutes / resolutions',
  ];
  const DEFAULT_CHECKLIST_BR = [
    'Renovação de Alvará', 'Declaração DEFIS/PGDAS', 'ECF entrega',
    'SPED Contábil', 'Renovação CNPJ Status',
  ];

  useEffect(() => {
    db.documentos.where('empresaId').equals(empresa.id).toArray().then(setDocs);
    db.config.get(FISCAL_KEY).then(rec => setFiscalObs(rec?.value || []));
    db.config.get(COMPLIANCE_KEY).then(rec => {
      if (rec?.value) { setChecklist(rec.value); }
      else {
        const defaults = (empresa.pais === 'US' ? DEFAULT_CHECKLIST_US : DEFAULT_CHECKLIST_BR)
          .map((d, i) => ({ id: i + 1, descricao: d, recorrencia: 'Anual', prazo: '', status: 'Pendente' }));
        setChecklist(defaults);
        db.config.put({ chave: COMPLIANCE_KEY, value: defaults });
      }
    });
  }, [empresa.id]);

  async function saveDoc() {
    if (!docForm.nome?.trim()) { toast('Nome do documento é obrigatório.', 'error'); return; }
    await db.documentos.add({ ...docForm, empresaId: empresa.id, subcategoria: docForm.categoria, dataUpload: docForm.dataUpload || new Date().toISOString().slice(0,10) });
    await db.auditLog.add({ acao: `Documento adicionado: ${docForm.nome} — ${empresa.nome}`, modulo: 'Documentos', timestamp: new Date().toISOString() });
    toast('Documento salvo!', 'success');
    setDocModal(false); setDocForm({});
    db.documentos.where('empresaId').equals(empresa.id).toArray().then(setDocs);
  }

  async function saveFiscal() {
    if (!fiscalForm.descricao?.trim()) { toast('Descrição obrigatória.', 'error'); return; }
    const updated = fiscalForm.id
      ? fiscalObs.map(o => o.id === fiscalForm.id ? fiscalForm : o)
      : [...fiscalObs, { ...fiscalForm, id: Date.now() }];
    await db.config.put({ chave: FISCAL_KEY, value: updated });
    setFiscalObs(updated); setFiscalModal(false); setFiscalForm({});
    toast('Obrigação salva!', 'success');
  }

  async function deleteFiscal(id) {
    const updated = fiscalObs.filter(o => o.id !== id);
    await db.config.put({ chave: FISCAL_KEY, value: updated });
    setFiscalObs(updated);
  }

  async function toggleCheck(id) {
    const updated = checklist.map(c => c.id === id
      ? { ...c, status: c.status === 'Concluído' ? 'Pendente' : 'Concluído' }
      : c);
    await db.config.put({ chave: COMPLIANCE_KEY, value: updated });
    setChecklist(updated);
  }

  async function saveCheckItem() {
    if (!checkForm.descricao?.trim()) { toast('Descrição obrigatória.', 'error'); return; }
    const updated = [...checklist, { ...checkForm, id: Date.now(), status: 'Pendente' }];
    await db.config.put({ chave: COMPLIANCE_KEY, value: updated });
    setChecklist(updated); setCheckModal(false); setCheckForm({});
  }

  async function deleteCheckItem(id) {
    const updated = checklist.filter(c => c.id !== id);
    await db.config.put({ chave: COMPLIANCE_KEY, value: updated });
    setChecklist(updated);
  }

  const STATUS_EMP = [
    { v:'ativa',         l:'Ativa',             badge:'green' },
    { v:'ativo',         l:'Ativa',             badge:'green' },
    { v:'em-construcao', l:'Em Desenvolvimento', badge:'blue'  },
    { v:'encerrada',     l:'Encerrada',          badge:'dark'  },
    { v:'inativo',       l:'Encerrada',          badge:'dark'  },
    { v:'holding',       l:'Holding',            badge:'gold'  },
    { v:'parada',        l:'Parada',             badge:'gray'  },
  ];
  const statusInfo = v => STATUS_EMP.find(s => s.v === v) || { l: v||'—', badge:'brand' };
  const si = statusInfo(empresa.status);

  const YEARS = ['2021','2022','2023','2024','2025','2026'];

  function download(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.','error'); return; }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nome || r.nomeArq || 'doc'; a.click();
  }

  // Doc lookup helpers
  const docsInCat = cat => docs.filter(d => d.subcategoria === cat || d.categoria === cat);
  const findDoc = (cat, nome) => docsInCat(cat).find(d =>
    nome.toLowerCase().split(/[\s/]+/).some(k => d.nome?.toLowerCase().includes(k))
  );
  const findDocYear = (cat, nome, year) => docs.filter(d =>
    (d.subcategoria === cat || d.categoria === cat) &&
    String(d.anoFiscal) === String(year) &&
    nome.toLowerCase().split(/[\s/]+/).some(k => d.nome?.toLowerCase().includes(k))
  )[0];

  const CONST_DOCS = [
    'Contrato Social / Articles of Incorporation',
    'Estatuto / Operating Agreement',
    'Certificado de Registro / Certificate of Formation',
    'EIN Letter / CNPJ Comprovante',
    'Registered Agent Info',
    'Alterações contratuais / Amendments',
  ];
  const CONTABIL_DOCS = ['Balanço Patrimonial','DRE','Fluxo de Caixa','Notas Explicativas','Parecer do Auditor'];
  const FISCAL_DOCS = ['Federal Tax Return','State Tax Return','IRPJ / CSLL','ECF / ECD','Comprovante de Pagamento'];
  const OPER_DOCS = ['Contratos relevantes','Licenças & Alvarás','Apólice de Seguro'];

  function DocStatusRow({ doc, found, onDownload }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8,
        background: found ? 'rgba(34,197,94,.06)' : 'rgba(234,179,8,.04)',
        border: `1px solid ${found ? 'rgba(34,197,94,.15)' : 'rgba(234,179,8,.12)'}`, marginBottom:5 }}>
        <i className={`fas ${found ? 'fa-circle-check' : 'fa-clock'}`}
           style={{ color: found ? 'var(--green)' : 'var(--yellow)', fontSize:12, flexShrink:0 }}/>
        <span style={{ flex:1, fontSize:12, color: found ? 'var(--text-primary)' : 'var(--text-muted)' }}>{doc}</span>
        {found
          ? <button type="button" onClick={() => onDownload(found)}
              style={{ fontSize:10, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px' }}>
              <i className="fas fa-download" style={{ marginRight:3 }}/>{found.nomeArq || found.nome}
            </button>
          : <span style={{ fontSize:10, color:'var(--yellow)', fontWeight:600, background:'rgba(234,179,8,.15)', borderRadius:4, padding:'2px 8px' }}>
              Pendente Upload
            </span>
        }
      </div>
    );
  }

  const [openSections, setOpenSections] = useState({ const:true, contabil:true, fiscal:false, oper:true });
  const toggleSection = k => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  const [fiscalYear, setFiscalYear] = useState('2025');

  const FISCAL_STATUS = [
    { v:'Pendente',    color:'var(--yellow)' },
    { v:'Em Andamento',color:'var(--brand)'  },
    { v:'Entregue',    color:'var(--blue)'   },
    { v:'Pago',        color:'var(--green)'  },
  ];
  const fiscalStatusColor = v => FISCAL_STATUS.find(s => s.v === v)?.color || 'var(--text-muted)';

  const today = new Date().toISOString().slice(0,10);
  const checkStatusColor = item => {
    if (item.status === 'Concluído') return 'var(--green)';
    if (item.prazo && item.prazo < today) return 'var(--red)';
    if (item.prazo) {
      const days = (new Date(item.prazo) - new Date()) / 86400000;
      if (days < 30) return 'var(--yellow)';
    }
    return 'var(--text-muted)';
  };

  const TABS = [
    { key:'overview',   label:'Overview',              icon:'fa-circle-info'    },
    { key:'docs',       label:'Documentos',            icon:'fa-folder-open'    },
    { key:'fiscal',     label:'Fiscal & Taxes',        icon:'fa-receipt'        },
    { key:'compliance', label:'Compliance Checklist',  icon:'fa-list-check'     },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'var(--surface)', overflowY:'auto' }}>
      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'var(--surface-card)', borderBottom:'1px solid var(--surface-border)', minHeight:56 }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', gap:16, minHeight:56 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          <i className="fas fa-arrow-left"/>Empresas
        </button>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
          <div className="avatar" style={{ background:fmt.avatarColor(empresa.nome), color:'#fff', width:32, height:32, fontSize:12, borderRadius:8 }}>{fmt.initials(empresa.nome)}</div>
          <span style={{ fontFamily:'Playfair Display', fontWeight:800, fontSize:16, color:'var(--text-primary)' }}>{empresa.nome}</span>
          <span className={`badge badge-${si.badge}`} style={{ fontSize:10 }}>{si.l}</span>
          <span className={`badge badge-${empresa.pais==='BR'?'green':'blue'}`} style={{ fontSize:10 }}>{empresa.pais==='BR'?'Brasil':'EUA'}</span>
          {empresa.cfcFlag && <span style={{ background:'rgba(239,68,68,.15)', color:'var(--red)', borderRadius:4, padding:'1px 7px', fontSize:10, fontWeight:700 }}>CFC</span>}
          {empresa.legalType && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{empresa.legalType}</span>}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(empresa)}>
          <i className="fas fa-pen"/>Editar
        </button>
      </div>
      </div>

      {/* Tab bar */}
      <div style={{ position:'sticky', top:56, zIndex:9, background:'var(--surface-card)', borderBottom:'1px solid var(--surface-border)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', display:'flex', gap:0, overflowX:'auto' }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              display:'flex', alignItems:'center', gap:7, padding:'12px 18px',
              background:'none', border:'none', cursor:'pointer', fontSize:13,
              color: tab===tb.key ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: tab===tb.key ? '2px solid var(--brand)' : '2px solid transparent',
              fontFamily:'Lexend, sans-serif', fontWeight: tab===tb.key ? 600 : 400,
              marginBottom:-1, whiteSpace:'nowrap', flexShrink:0,
            }}>
              <i className={`fas ${tb.icon}`} style={{ fontSize:12 }}/>{tb.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px', maxWidth:900, margin:'0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Info grid */}
            <div className="card">
              <div className="card-title"><i className="fas fa-circle-info" style={{ marginRight:8 }}/>Dados Cadastrais</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px 24px' }}>
                {[
                  { label:'País/Jurisdição',      val: empresa.pais==='BR'?'Brasil':'EUA' },
                  { label:'Estado',               val: empresa.estado },
                  { label:'Cidade',               val: empresa.cidade },
                  { label: empresa.pais==='BR'?'CNPJ':'EIN', val: empresa.pais==='BR'?empresa.cnpj:empresa.ein },
                  empresa.pais==='BR' && { label:'Inscrição Estadual', val: empresa.inscricaoEstadual },
                  { label:'Setor',                val: empresa.setor },
                  { label:'Website',              val: empresa.website },
                  { label:'E-mail',               val: empresa.email },
                  { label:'Telefone',             val: empresa.telefone },
                  { label:'Data de Abertura',     val: fmt.date(empresa.fundacao, lang) },
                  empresa.dataEncerramento && { label:'Data Encerramento', val: fmt.date(empresa.dataEncerramento, lang) },
                  { label:'Regime Tributário',    val: empresa.taxRegime },
                  empresa.pais==='US' && empresa.ctbElection && { label:'Check-the-Box', val: empresa.ctbElection },
                  empresa.cfcClass && { label:'Classificação CFC', val: empresa.cfcClass },
                ].filter(Boolean).map(({ label, val }) => val ? (
                  <div key={label}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
                  </div>
                ) : null)}
              </div>
              {empresa.obrigacoesAcessorias && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Obrigações Acessórias</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', background:'var(--surface-hover)', borderRadius:8, padding:'8px 12px' }}>{empresa.obrigacoesAcessorias}</div>
                </div>
              )}
            </div>

            {/* Sócios */}
            {(empresa.socios||[]).length > 0 && (
              <div className="card">
                <div className="card-title"><i className="fas fa-users" style={{ marginRight:8 }}/>Sócios & Participação</div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Nome</th><th>Participação</th><th>Documento</th></tr></thead>
                    <tbody>
                      {(empresa.socios||[]).map((s,i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:600 }}>{s.nome}</td>
                          <td><span className="badge badge-brand">{s.percentual}%</span></td>
                          <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-muted)' }}>{s.documento||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tags */}
            {(empresa.tags||[]).length > 0 && (
              <div className="card">
                <div className="card-title"><i className="fas fa-tags" style={{ marginRight:8 }}/>Tags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {(empresa.tags||[]).map(tag => (
                    <span key={tag} style={{ background:'var(--brand-dim)', color:'var(--brand-light)', borderRadius:20, padding:'4px 12px', fontSize:12 }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {empresa.notas && (
              <div className="card">
                <div className="card-title"><i className="fas fa-note-sticky" style={{ marginRight:8 }}/>Observações Estratégicas</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, borderLeft:'3px solid var(--brand)', paddingLeft:14, marginTop:4 }}>{empresa.notas}</div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {tab === 'docs' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Header bar */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {/* All tags used in this company's docs */}
              {(() => {
                const allTags = [...new Set(docs.flatMap(d => d.tags||[]))].sort();
                return allTags.length > 0 ? (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1, alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}><i className="fas fa-tag" style={{ marginRight:4 }}/>Filtrar:</span>
                    {allTags.map(tag => (
                      <button key={tag} type="button"
                        onClick={() => setDocFilterTag(t => t===tag ? '' : tag)}
                        style={{ fontSize:11, padding:'2px 10px', borderRadius:99, border:'none', cursor:'pointer', fontFamily:'Lexend,sans-serif',
                          background: docFilterTag===tag ? 'var(--brand)' : 'var(--surface-hover)',
                          color: docFilterTag===tag ? '#fff' : 'var(--text-secondary)',
                          outline: docFilterTag===tag ? 'none' : '1px solid var(--surface-border)',
                        }}>
                        {tag}
                      </button>
                    ))}
                    {docFilterTag && (
                      <button type="button" onClick={() => setDocFilterTag('')}
                        style={{ fontSize:11, padding:'2px 8px', borderRadius:99, border:'none', cursor:'pointer', background:'transparent', color:'var(--text-muted)' }}>
                        <i className="fas fa-xmark"/>
                      </button>
                    )}
                  </div>
                ) : <div style={{ flex:1 }}/>;
              })()}
              <button className="btn btn-primary" onClick={() => { setDocForm({ categoria:'Constituição & Governança' }); setDocTagInput(''); setDocModal(true); }}>
                <i className="fas fa-plus"/>Adicionar Documento
              </button>
            </div>

            {/* Section helper */}
            {[
              { key:'const',   label:'Constituição & Governança', icon:'fa-file-contract', cat:'Constituição & Governança', expectedDocs: CONST_DOCS, byYear:false },
              { key:'contabil',label:'Contábil Anual',            icon:'fa-chart-pie',     cat:'Contábil Anual',            expectedDocs: CONTABIL_DOCS, byYear:true },
              { key:'fiscald', label:'Fiscal Anual',              icon:'fa-receipt',       cat:'Fiscal Anual',              expectedDocs: FISCAL_DOCS,   byYear:true },
              { key:'oper',    label:'Operacional',               icon:'fa-briefcase',     cat:'Operacional',               expectedDocs: OPER_DOCS,     byYear:false },
            ].map(sec => (
              <div key={sec.key} className="card" style={{ padding:0, overflow:'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleSection(sec.key)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                >
                  <i className={`fas ${sec.icon}`} style={{ color:'var(--brand)', fontSize:14 }}/>
                  <span style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:14, color:'var(--text-primary)', flex:1 }}>{sec.label}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:8 }}>
                    {sec.byYear
                      ? `${docs.filter(d => d.subcategoria===sec.cat||d.categoria===sec.cat).length} docs`
                      : `${sec.expectedDocs.filter(d => findDoc(sec.cat, d)).length}/${sec.expectedDocs.length} ok`
                    }
                  </span>
                  <i className={`fas fa-chevron-${openSections[sec.key]?'up':'down'}`} style={{ fontSize:11, color:'var(--text-muted)' }}/>
                </button>
                {openSections[sec.key] && (
                  <div style={{ padding:'0 18px 16px' }}>
                    {!sec.byYear ? (
                      sec.expectedDocs.map(d => (
                        <DocStatusRow key={d} doc={d} found={findDoc(sec.cat, d)} onDownload={download}/>
                      ))
                    ) : (
                      YEARS.map(year => {
                        const yearDocs = docs.filter(d => (d.subcategoria===sec.cat||d.categoria===sec.cat) && String(d.anoFiscal)===year);
                        const hasAny = yearDocs.length > 0;
                        return (
                          <div key={year} style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--brand)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                              <i className="fas fa-calendar-days" style={{ fontSize:10 }}/>{year}
                              {hasAny && <span style={{ color:'var(--green)', fontSize:10 }}>● {yearDocs.length} doc{yearDocs.length!==1?'s':''}</span>}
                            </div>
                            {sec.expectedDocs.map(d => (
                              <DocStatusRow key={d} doc={d} found={findDocYear(sec.cat, d, year)} onDownload={download}/>
                            ))}
                          </div>
                        );
                      })
                    )}
                    {/* Extra docs not in expected list */}
                    {docsInCat(sec.cat).filter(d =>
                      !sec.expectedDocs.some(ed => ed.toLowerCase().split(/[\s/]+/).some(k => d.nome?.toLowerCase().includes(k))) &&
                      (!docFilterTag || (d.tags||[]).includes(docFilterTag))
                    ).map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, background:'var(--surface-hover)', border:'1px solid var(--surface-border)', marginBottom:5, flexWrap:'wrap' }}>
                        <i className="fas fa-file" style={{ color:'var(--brand)', fontSize:12, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:12, color:'var(--text-primary)', minWidth:100 }}>{d.nome}</span>
                        {(d.tags||[]).map(tag => (
                          <span key={tag} style={{ fontSize:10, padding:'1px 8px', borderRadius:99, background:'var(--brand-dim)', color:'var(--brand)', border:'1px solid var(--brand)33', flexShrink:0 }}>{tag}</span>
                        ))}
                        {d.anoFiscal && <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{d.anoFiscal}</span>}
                        <button type="button" onClick={() => download(d)} style={{ fontSize:10, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', flexShrink:0 }}>
                          <i className="fas fa-download"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Doc modal */}
            {docModal && (
              <div className="modal-backdrop" onClick={() => setDocModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
                  <div className="modal-header">
                    <div className="modal-title">Adicionar Documento</div>
                    <button className="modal-close" onClick={() => setDocModal(false)}><i className="fas fa-xmark"/></button>
                  </div>
                  <div className="modal-body">
                    <div className="form-grid">
                      <div className="form-group" style={{ gridColumn:'1/-1' }}>
                        <label className="form-label">Nome <span style={{ color:'var(--red)' }}>*</span></label>
                        <input className="form-input" value={docForm.nome||''} onChange={e => setDocForm(f => ({ ...f, nome:e.target.value }))} placeholder="Ex: Contrato Social — 2024"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Categoria</label>
                        <select className="form-select" value={docForm.categoria||'Constituição & Governança'} onChange={e => setDocForm(f => ({ ...f, categoria:e.target.value }))}>
                          {['Constituição & Governança','Contábil Anual','Fiscal Anual','Operacional'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ano Fiscal</label>
                        <select className="form-select" value={docForm.anoFiscal||''} onChange={e => setDocForm(f => ({ ...f, anoFiscal:e.target.value }))}>
                          <option value="">— nenhum —</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tipo</label>
                        <select className="form-select" value={docForm.tipo||'PDF'} onChange={e => setDocForm(f => ({ ...f, tipo:e.target.value }))}>
                          {['PDF','DOC','DOCX','XLSX','JPG','PNG','Outro'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Data</label>
                        <input className="form-input" type="date" value={docForm.dataUpload||''} onChange={e => setDocForm(f => ({ ...f, dataUpload:e.target.value }))}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Vencimento</label>
                        <input className="form-input" type="date" value={docForm.vencimento||''} onChange={e => setDocForm(f => ({ ...f, vencimento:e.target.value }))}/>
                      </div>
                      <div className="form-group" style={{ gridColumn:'1/-1' }}>
                        <label className="form-label">Tags</label>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                          {(docForm.tags||[]).map(tag => (
                            <span key={tag} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 10px', borderRadius:99, background:'var(--brand-dim)', color:'var(--brand)', border:'1px solid var(--brand)44' }}>
                              {tag}
                              <button type="button" onClick={() => setDocForm(f => ({ ...f, tags: f.tags.filter(t => t!==tag) }))}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--brand)', padding:0, lineHeight:1, fontSize:11 }}>
                                <i className="fas fa-xmark"/>
                              </button>
                            </span>
                          ))}
                        </div>
                        {(docForm.tags||[]).length >= 3
                          ? <div style={{ fontSize:11, color:'var(--text-muted)', padding:'4px 0' }}><i className="fas fa-circle-info" style={{ marginRight:5 }}/>Limite de 3 tags atingido.</div>
                          : (
                          <div style={{ display:'flex', gap:6 }}>
                            <input className="form-input" style={{ flex:1 }} placeholder="Nova tag (Enter para adicionar)"
                              value={docTagInput} onChange={e => setDocTagInput(e.target.value)}
                              onKeyDown={e => {
                                if ((e.key==='Enter'||e.key===',') && docTagInput.trim()) {
                                  e.preventDefault();
                                  const tag = docTagInput.trim().replace(/,$/,'');
                                  if (tag && !(docForm.tags||[]).includes(tag) && (docForm.tags||[]).length < 3) {
                                    setDocForm(f => ({ ...f, tags: [...(f.tags||[]), tag] }));
                                  }
                                  setDocTagInput('');
                                }
                              }}
                            />
                            <button type="button" className="btn btn-secondary" style={{ padding:'6px 14px', fontSize:12, flexShrink:0 }}
                              onClick={() => {
                                const tag = docTagInput.trim();
                                if (tag && !(docForm.tags||[]).includes(tag) && (docForm.tags||[]).length < 3) {
                                  setDocForm(f => ({ ...f, tags: [...(f.tags||[]), tag] }));
                                }
                                setDocTagInput('');
                              }}>
                              <i className="fas fa-plus"/>
                            </button>
                          </div>
                          )}
                        {/* Sugestão de tags já usadas */}
                        {(docForm.tags||[]).length < 3 && (() => {
                          const existing = [...new Set(docs.flatMap(d => d.tags||[]))].filter(t => !(docForm.tags||[]).includes(t));
                          return existing.length > 0 ? (
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Sugeridas:</span>
                              {existing.map(tag => (
                                <button key={tag} type="button"
                                  onClick={() => { if ((docForm.tags||[]).length < 3) setDocForm(f => ({ ...f, tags: [...(f.tags||[]), tag] })); }}
                                  style={{ fontSize:10, padding:'1px 8px', borderRadius:99, border:'1px solid var(--surface-border)', background:'var(--surface-hover)', color:'var(--text-secondary)', cursor:'pointer' }}>
                                  + {tag}
                                </button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="form-group" style={{ gridColumn:'1/-1' }}>
                        <label className="form-label" style={{ display:'flex', justifyContent:'space-between' }}>
                          Arquivo
                          <button type="button" className="btn btn-secondary" style={{ fontSize:11, padding:'3px 10px' }} onClick={() => docFileRef.current?.click()}>
                            <i className="fas fa-upload"/>Selecionar
                          </button>
                        </label>
                        <input ref={docFileRef} type="file" style={{ display:'none' }} onChange={e => handleDocFile(e, setDocForm)}/>
                        {docForm.conteudo
                          ? <div style={{ fontSize:12, color:'var(--green)', padding:'4px 0' }}><i className="fas fa-check" style={{ marginRight:6 }}/>{docForm.nomeArq} ({docForm.tamanho})</div>
                          : <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 0' }}>Nenhum arquivo selecionado</div>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => setDocModal(false)}>{t.cancel}</button>
                    <button className="btn btn-primary" onClick={saveDoc}><i className="fas fa-floppy-disk"/>{t.save}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FISCAL & TAXES ── */}
        {tab === 'fiscal' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Ano fiscal:</span>
                <div style={{ display:'flex', gap:4 }}>
                  {YEARS.map(y => (
                    <button key={y} onClick={() => setFiscalYear(y)} className={`btn btn-sm ${fiscalYear===y?'btn-primary':'btn-ghost'}`} style={{ padding:'4px 10px', fontSize:11 }}>{y}</button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => { setFiscalForm({ anoFiscal: fiscalYear, status:'Pendente' }); setFiscalModal(true); }}>
                <i className="fas fa-plus"/>Nova Obrigação
              </button>
            </div>

            {fiscalObs.filter(o => !fiscalYear || String(o.anoFiscal) === fiscalYear).length === 0 ? (
              <div className="empty-state card"><i className="fas fa-receipt"/><p>Nenhuma obrigação fiscal cadastrada para {fiscalYear}.</p></div>
            ) : (
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th>Obrigação</th><th>Tipo</th><th>Prazo</th><th>Status</th><th>Assessor</th><th>Valor Pago</th><th></th>
                    </tr></thead>
                    <tbody>
                      {fiscalObs.filter(o => !fiscalYear || String(o.anoFiscal) === fiscalYear).map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{o.descricao}</td>
                          <td style={{ fontSize:11, color:'var(--text-muted)' }}>{o.tipo||'—'}</td>
                          <td style={{ fontSize:12 }}>{o.prazo ? fmt.date(o.prazo, lang) : '—'}</td>
                          <td>
                            <span style={{ fontSize:11, fontWeight:700, color: fiscalStatusColor(o.status), background: fiscalStatusColor(o.status)+'22', borderRadius:6, padding:'2px 8px' }}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ fontSize:12, color:'var(--text-muted)' }}>{o.assessor||'—'}</td>
                          <td style={{ fontSize:12 }}>{o.valorPago ? fmt.currency(Number(o.valorPago), o.moeda||'BRL', lang) : '—'}</td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn-icon" onClick={() => { setFiscalForm(o); setFiscalModal(true); }}><i className="fas fa-pen"/></button>
                              <button className="btn-icon danger" onClick={() => deleteFiscal(o.id)}><i className="fas fa-trash"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fiscalModal && (
              <div className="modal-backdrop" onClick={() => setFiscalModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:500 }}>
                  <div className="modal-header">
                    <div className="modal-title">{fiscalForm.id ? 'Editar Obrigação' : 'Nova Obrigação Fiscal'}</div>
                    <button className="modal-close" onClick={() => setFiscalModal(false)}><i className="fas fa-xmark"/></button>
                  </div>
                  <div className="modal-body">
                    <div className="form-grid">
                      <div className="form-group" style={{ gridColumn:'1/-1' }}>
                        <label className="form-label">Descrição <span style={{ color:'var(--red)' }}>*</span></label>
                        <input className="form-input" value={fiscalForm.descricao||''} onChange={e => setFiscalForm(f => ({ ...f, descricao:e.target.value }))} placeholder="Ex: Federal Tax Return — Form 1120"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tipo</label>
                        <select className="form-select" value={fiscalForm.tipo||''} onChange={e => setFiscalForm(f => ({ ...f, tipo:e.target.value }))}>
                          <option value="">—</option>
                          {['Federal','Estadual','Municipal','IRS','IR Brasil','FBAR','FATCA','ECF','ECD','Outro'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ano Fiscal</label>
                        <select className="form-select" value={fiscalForm.anoFiscal||fiscalYear} onChange={e => setFiscalForm(f => ({ ...f, anoFiscal:e.target.value }))}>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prazo</label>
                        <input className="form-input" type="date" value={fiscalForm.prazo||''} onChange={e => setFiscalForm(f => ({ ...f, prazo:e.target.value }))}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={fiscalForm.status||'Pendente'} onChange={e => setFiscalForm(f => ({ ...f, status:e.target.value }))}>
                          {['Pendente','Em Andamento','Entregue','Pago'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Assessor Responsável</label>
                        <input className="form-input" value={fiscalForm.assessor||''} onChange={e => setFiscalForm(f => ({ ...f, assessor:e.target.value }))} placeholder="Nome do assessor"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Valor Pago</label>
                        <input className="form-input" type="number" value={fiscalForm.valorPago||''} onChange={e => setFiscalForm(f => ({ ...f, valorPago:e.target.value }))} placeholder="0"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Moeda</label>
                        <select className="form-select" value={fiscalForm.moeda||'BRL'} onChange={e => setFiscalForm(f => ({ ...f, moeda:e.target.value }))}>
                          <option value="BRL">BRL</option><option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => setFiscalModal(false)}>{t.cancel}</button>
                    <button className="btn btn-primary" onClick={saveFiscal}><i className="fas fa-floppy-disk"/>{t.save}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPLIANCE CHECKLIST ── */}
        {tab === 'compliance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setCheckForm({}); setCheckModal(true); }}>
                <i className="fas fa-plus"/>Adicionar Item
              </button>
            </div>
            {checklist.length === 0 ? (
              <div className="empty-state card"><i className="fas fa-list-check"/><p>Nenhum item no checklist.</p></div>
            ) : checklist.map(item => {
              const color = checkStatusColor(item);
              const isVencido = item.prazo && item.prazo < today && item.status !== 'Concluído';
              return (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10,
                  background: item.status==='Concluído' ? 'rgba(34,197,94,.06)' : isVencido ? 'rgba(239,68,68,.06)' : 'var(--surface-hover)',
                  border: `1px solid ${item.status==='Concluído' ? 'rgba(34,197,94,.2)' : isVencido ? 'rgba(239,68,68,.2)' : 'var(--surface-border)'}`,
                }}>
                  <button type="button" onClick={() => toggleCheck(item.id)} style={{ flexShrink:0, width:22, height:22, borderRadius:6, border:`2px solid ${color}`, background: item.status==='Concluído' ? color : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                    {item.status==='Concluído' && <i className="fas fa-check" style={{ fontSize:10, color:'#fff' }}/>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: item.status==='Concluído' ? 400 : 600, color: item.status==='Concluído' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.status==='Concluído' ? 'line-through' : 'none' }}>
                      {item.descricao}
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:3, fontSize:11, color:'var(--text-muted)' }}>
                      {item.recorrencia && <span><i className="fas fa-rotate" style={{ marginRight:3 }}/>{item.recorrencia}</span>}
                      {item.prazo && <span style={{ color }}><i className="fas fa-calendar" style={{ marginRight:3 }}/>{fmt.date(item.prazo, lang)}</span>}
                      {isVencido && <span style={{ color:'var(--red)', fontWeight:700 }}>Vencido</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color, background: color+'22', borderRadius:6, padding:'2px 8px', whiteSpace:'nowrap' }}>
                    {isVencido ? 'Vencido' : item.status}
                  </span>
                  <button className="btn-icon danger" onClick={() => deleteCheckItem(item.id)}><i className="fas fa-trash"/></button>
                </div>
              );
            })}

            {checkModal && (
              <div className="modal-backdrop" onClick={() => setCheckModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
                  <div className="modal-header">
                    <div className="modal-title">Novo Item — Compliance</div>
                    <button className="modal-close" onClick={() => setCheckModal(false)}><i className="fas fa-xmark"/></button>
                  </div>
                  <div className="modal-body">
                    <div className="form-grid">
                      <div className="form-group" style={{ gridColumn:'1/-1' }}>
                        <label className="form-label">Descrição <span style={{ color:'var(--red)' }}>*</span></label>
                        <input className="form-input" value={checkForm.descricao||''} onChange={e => setCheckForm(f => ({ ...f, descricao:e.target.value }))} placeholder="Ex: Annual Report filing"/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recorrência</label>
                        <select className="form-select" value={checkForm.recorrencia||'Anual'} onChange={e => setCheckForm(f => ({ ...f, recorrencia:e.target.value }))}>
                          {['Mensal','Trimestral','Semestral','Anual','Único'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prazo</label>
                        <input className="form-input" type="date" value={checkForm.prazo||''} onChange={e => setCheckForm(f => ({ ...f, prazo:e.target.value }))}/>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => setCheckModal(false)}>{t.cancel}</button>
                    <button className="btn btn-primary" onClick={saveCheckItem}><i className="fas fa-check"/>Adicionar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Documentos Gerais (sub-componente de CompaniesPage) ──────
function CompanyGeneralDocs({ empresas, toast, t, lang }) {
  const [docs, setDocs]           = useState([]);
  const [search, setSearch]       = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({});
  const [tagInput, setTagInput]   = useState('');
  const [confirm, setConfirm]     = useState(null);
  const fileRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  const CATS = ['Constituição','Legal','Financeiro','Tax','Licenças','Contratos','RH','Outros'];
  const ANOS = ['2020','2021','2022','2023','2024','2025','2026'];
  const STATUS_LIST = ['Atual','Pendente Upload','Desatualizado','Substituído'];
  const STATUS_BADGE = { 'Atual':'green','Pendente Upload':'yellow','Desatualizado':'red','Substituído':'blue' };

  const load = useCallback(async () => {
    setDocs(await db.documentos.toArray());
  }, []);
  useEffect(() => { load(); }, []);

  const empName = id => empresas.find(e => e.id === id)?.nome || '—';
  const allTags = [...new Set(docs.flatMap(d => d.tags || []))].sort();

  const filtered = docs.filter(d =>
    (!filterEmp || d.empresaId === Number(filterEmp)) &&
    (!filterCat || d.categoria === filterCat) &&
    (!filterTag || (d.tags || []).includes(filterTag)) &&
    (!filterAno || String(d.anoFiscal) === filterAno) &&
    (!search || d.nome?.toLowerCase().includes(search.toLowerCase()))
  );

  function openNew() {
    setForm({ tipo:'PDF', statusDoc:'Atual', dataUpload: today });
    setTagInput('');
    setModal(true);
  }

  async function saveDoc() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return; }
    if (!form.empresaId)    { toast('Selecione a empresa.', 'error'); return; }
    try {
      if (form.id) {
        await db.documentos.update(form.id, form);
      } else {
        await db.documentos.add(form);
      }
      await db.auditLog.add({ acao: `Doc geral ${form.id?'editado':'adicionado'}: ${form.nome}`, modulo: 'Documentos', timestamp: new Date().toISOString() });
      toast('Salvo!', 'success');
      setModal(false); setForm({});
      load();
    } catch { toast('Erro ao salvar.', 'error'); }
  }

  async function deleteDoc(id, nome) {
    setConfirm({ msg: `Excluir "${nome}"?`, onConfirm: async () => {
      await db.documentos.delete(id);
      toast('Excluído!', 'success');
      setConfirm(null); load();
    }});
  }

  function dlDoc(d) {
    if (!d.conteudo) { toast('Arquivo não disponível.', 'error'); return; }
    const a = document.createElement('a'); a.href = d.conteudo; a.download = d.nome || 'doc'; a.click();
  }

  const hasFilter = search || filterEmp || filterCat || filterTag || filterAno;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div className="search-bar" style={{ flex:1, minWidth:180 }}>
          <i className="fas fa-search"/>
          <input placeholder="Buscar documento..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-select" style={{ maxWidth:200 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">Todas as empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth:150 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Categoria</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth:140 }} value={filterAno} onChange={e => setFilterAno(e.target.value)}>
          <option value="">Todos os anos</option>
          {ANOS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {hasFilter && (
          <button className="btn btn-secondary" style={{ fontSize:12, padding:'6px 12px' }}
            onClick={() => { setSearch(''); setFilterEmp(''); setFilterCat(''); setFilterTag(''); setFilterAno(''); }}>
            <i className="fas fa-xmark"/>Limpar
          </button>
        )}
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>Novo Documento</button>
      </div>

      {/* Tags rápidas */}
      {allTags.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}><i className="fas fa-tag" style={{ marginRight:4 }}/>Tags:</span>
          {allTags.map(tag => (
            <button key={tag} type="button" onClick={() => setFilterTag(t => t === tag ? '' : tag)}
              style={{ fontSize:11, padding:'2px 10px', borderRadius:99, border:'none', cursor:'pointer', fontFamily:'Lexend,sans-serif',
                background: filterTag === tag ? 'var(--brand)' : 'var(--surface-hover)',
                color: filterTag === tag ? '#fff' : 'var(--text-secondary)',
                outline: filterTag === tag ? 'none' : '1px solid var(--surface-border)',
              }}>
              {tag}
            </button>
          ))}
          {filterTag && (
            <button type="button" onClick={() => setFilterTag('')}
              style={{ fontSize:11, padding:'2px 8px', borderRadius:99, border:'none', cursor:'pointer', background:'transparent', color:'var(--text-muted)' }}>
              <i className="fas fa-xmark"/>
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state"><i className="fas fa-folder-open"/><p>Nenhum documento encontrado.</p></div>
      ) : (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>Nome</th><th>Empresa</th><th>Categoria</th><th>Tags</th><th>Status</th><th>Ano</th><th>Data</th><th>Ações</th>
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight:600, color:'var(--text-primary)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <i className={`fas fa-file-${d.tipo==='PDF'?'pdf':d.tipo==='XLSX'?'excel':'alt'}`}
                          style={{ color: d.tipo==='PDF'?'var(--red)':d.tipo==='XLSX'?'#22c55e':'var(--brand)', fontSize:13 }}/>
                        {d.nome}
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{empName(d.empresaId)}</td>
                    <td style={{ fontSize:12 }}>{d.categoria || d.subcategoria || '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {(d.tags||[]).map(tag => (
                          <span key={tag} style={{ fontSize:10, padding:'1px 8px', borderRadius:99, background:'var(--brand-dim)', color:'var(--brand)', border:'1px solid var(--brand)33' }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {d.statusDoc
                        ? <span style={{ fontSize:11, fontWeight:700, color:`var(--${STATUS_BADGE[d.statusDoc]||'brand'})`, background:`var(--${STATUS_BADGE[d.statusDoc]||'brand'}-dim,rgba(100,112,241,.1))`, borderRadius:6, padding:'2px 8px' }}>{d.statusDoc}</span>
                        : '—'}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{d.anoFiscal || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{d.dataUpload ? fmt.date(d.dataUpload, lang) : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        {d.conteudo && <button className="btn-icon" title="Download" onClick={() => dlDoc(d)}><i className="fas fa-download"/></button>}
                        <button className="btn-icon" title="Editar" onClick={() => { setForm({...d}); setTagInput(''); setModal(true); }}><i className="fas fa-pen"/></button>
                        <button className="btn-icon danger" title="Excluir" onClick={() => deleteDoc(d.id, d.nome)}><i className="fas fa-trash"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:560 }}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-file" style={{ marginRight:8 }}/>{form.id ? 'Editar Documento' : 'Novo Documento'}</div>
              <button className="modal-close" onClick={() => setModal(false)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Nome <span style={{ color:'var(--red)' }}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e => setForm(f => ({...f, nome:e.target.value}))} placeholder="Ex: Contrato Social 2024"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa <span style={{ color:'var(--red)' }}>*</span></label>
                  <select className="form-select" value={form.empresaId||''} onChange={e => setForm(f => ({...f, empresaId:Number(e.target.value)}))}>
                    <option value="">— selecione —</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={form.categoria||''} onChange={e => setForm(f => ({...f, categoria:e.target.value}))}>
                    <option value="">— selecione —</option>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.tipo||'PDF'} onChange={e => setForm(f => ({...f, tipo:e.target.value}))}>
                    {['PDF','DOC','DOCX','XLSX','JPG','PNG','Outro'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.statusDoc||'Atual'} onChange={e => setForm(f => ({...f, statusDoc:e.target.value}))}>
                    {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano Fiscal</label>
                  <select className="form-select" value={form.anoFiscal||''} onChange={e => setForm(f => ({...f, anoFiscal:e.target.value}))}>
                    <option value="">— nenhum —</option>
                    {ANOS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input className="form-input" type="date" value={form.dataUpload||''} onChange={e => setForm(f => ({...f, dataUpload:e.target.value}))}/>
                </div>
                {/* Tags */}
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Tags <span style={{ fontSize:10, fontWeight:400, color:'var(--text-muted)' }}>(máx. 3)</span></label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                    {(form.tags||[]).map(tag => (
                      <span key={tag} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 10px', borderRadius:99, background:'var(--brand-dim)', color:'var(--brand)', border:'1px solid var(--brand)44' }}>
                        {tag}
                        <button type="button" onClick={() => setForm(f => ({...f, tags:(f.tags||[]).filter(tg => tg!==tag)}))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--brand)', padding:0, fontSize:11 }}>
                          <i className="fas fa-xmark"/>
                        </button>
                      </span>
                    ))}
                  </div>
                  {(form.tags||[]).length < 3 && (
                    <div style={{ display:'flex', gap:6 }}>
                      <input className="form-input" style={{ flex:1 }} placeholder="Nova tag (Enter)" value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if ((e.key==='Enter'||e.key===',') && tagInput.trim()) {
                            e.preventDefault();
                            const tag = tagInput.trim().replace(/,$/,'');
                            if (tag && !(form.tags||[]).includes(tag) && (form.tags||[]).length < 3)
                              setForm(f => ({...f, tags:[...(f.tags||[]), tag]}));
                            setTagInput('');
                          }
                        }}
                      />
                      <button type="button" className="btn btn-secondary" style={{ padding:'6px 14px', fontSize:12 }}
                        onClick={() => {
                          const tag = tagInput.trim();
                          if (tag && !(form.tags||[]).includes(tag) && (form.tags||[]).length < 3)
                            setForm(f => ({...f, tags:[...(f.tags||[]), tag]}));
                          setTagInput('');
                        }}>
                        <i className="fas fa-plus"/>
                      </button>
                    </div>
                  )}
                  {/* Sugestões */}
                  {(form.tags||[]).length < 3 && (() => {
                    const sug = [...new Set(docs.flatMap(d => d.tags||[]))].filter(tg => !(form.tags||[]).includes(tg));
                    return sug.length > 0 ? (
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>Sugeridas:</span>
                        {sug.map(tag => (
                          <button key={tag} type="button"
                            onClick={() => { if ((form.tags||[]).length < 3) setForm(f => ({...f, tags:[...(f.tags||[]), tag]})); }}
                            style={{ fontSize:10, padding:'1px 8px', borderRadius:99, border:'1px solid var(--surface-border)', background:'var(--surface-hover)', color:'var(--text-secondary)', cursor:'pointer' }}>
                            + {tag}
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {/* Arquivo */}
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label" style={{ display:'flex', justifyContent:'space-between' }}>
                    Arquivo
                    <button type="button" className="btn btn-secondary" style={{ fontSize:11, padding:'3px 10px' }} onClick={() => fileRef.current?.click()}>
                      <i className="fas fa-upload"/>Selecionar
                    </button>
                  </label>
                  <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => handleDocFile(e, setForm)}/>
                  {form.conteudo
                    ? <div style={{ fontSize:12, color:'var(--green)', padding:'4px 0' }}><i className="fas fa-check" style={{ marginRight:6 }}/>{form.nomeArq} ({form.tamanho})</div>
                    : <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 0' }}>Nenhum arquivo selecionado</div>
                  }
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveDoc}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}
    </div>
  );
}

// ── Empresas ─────────────────────────────────────────────────
function CompaniesPage({ openEmpresaId } = {}) {
  const { t, lang, toast } = useApp();
  const [pageTab, setPageTab] = useState('empresas'); // 'empresas' | 'docs'
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const [showArchived, setShowArchived] = useState(false);
  const [detail, setDetail] = useState(null);
  const didOpenRef = useRef(false);

  const load = useCallback(async () => setRows(await db.empresas.toArray()), []);
  useEffect(() => { load(); }, []);

  // Abre empresa diretamente ao carregar, quando vier da navegação do organograma
  useEffect(() => {
    if (!openEmpresaId || didOpenRef.current || rows.length === 0) return;
    const emp = rows.find(r => r.id === openEmpresaId);
    if (emp) { setDetail(emp); didOpenRef.current = true; }
  }, [openEmpresaId, rows]);

  const filtered = React.useMemo(() =>
    rows
      .filter(r => showArchived ? r.statusReg === 'arquivado' : r.statusReg !== 'arquivado')
      .filter(r => r.nome?.toLowerCase().includes(search.toLowerCase()) || r.cnpj?.includes(search) || r.ein?.includes(search)),
  [rows, showArchived, search]);

  const archivedCount = React.useMemo(() => rows.filter(r => r.statusReg === 'arquivado').length, [rows]);

  const STATUS_EMP = [
    { v:'ativa',          l:'Ativa',             badge:'green',  icon:'fa-circle-check'   },
    { v:'em-construcao',  l:'Em Desenvolvimento', badge:'blue',   icon:'fa-hammer'         },
    { v:'encerrada',      l:'Encerrada',          badge:'dark',   icon:'fa-circle-xmark'   },
    { v:'holding',        l:'Holding',            badge:'gold',   icon:'fa-sitemap'        },
    { v:'parada',         l:'Parada',             badge:'gray',   icon:'fa-circle-pause'   },
    // legado
    { v:'ativo',          l:'Ativa',              badge:'green',  icon:'fa-circle-check'   },
    { v:'inativo',        l:'Encerrada',          badge:'dark',   icon:'fa-circle-xmark'   },
  ];
  const statusInfo = v => STATUS_EMP.find(s => s.v === v) || { l: v||'—', badge:'brand', icon:'fa-circle' };

  const [formTab, setFormTab] = useState('geral');

  function openNew()  { setForm({ pais:'BR', status:'ativa', socios:[], tags:[] }); setFormTab('geral'); setModal('form'); }
  function openEdit(r){ setForm({ socios:[], tags:[], ...r, socios: r.socios||[], tags: r.tags||[] }); setFormTab('geral'); setModal('form'); }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome da entidade é obrigatório.', 'error'); setFormTab('geral'); return; }
    if (!form.taxRegime) { toast('Regime tributário é obrigatório.', 'error'); setFormTab('fiscal'); return; }
    if ((form.legalType === 'LLC') && !form.ctbElection) { toast('Entidades LLC exigem a eleição Check-the-Box.', 'error'); setFormTab('fiscal'); return; }

    // Auto-detect CFC flag: BR entity where Eduardo or Carla have ≥10% participation
    const sociosCFC = (form.socios||[]).filter(s => /eduardo|carla/i.test(s.nome) && parseFloat(s.percentual||0) >= 10);
    const cfcFlag = form.pais === 'BR' && sociosCFC.length > 0;
    const saved = { ...form, cfcFlag };

    try {
      if (saved.id) { await db.empresas.update(saved.id, saved); }
      else { await db.empresas.add(saved); }
      await db.auditLog.add({ acao: `Empresa ${saved.id?'atualizada':'criada'}: ${saved.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() });
      toast(t.saved, 'success');
      setModal(null);
      load();
    } catch { toast(t.errorSave, 'error'); }
  }

  async function handleDelete(id, nome) {
    setConfirm({ msg: 'Arquivar esta empresa? O registro não será excluído — ficará oculto e pode ser restaurado.', onConfirm: async () => {
      await db.empresas.update(id, { statusReg: 'arquivado' });
      await db.auditLog.add({ acao: `Empresa arquivada: ${nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() });
      toast('Empresa arquivada.', 'success');
      setConfirm(null);
      load();
    }});
  }

  const F = ({label, field, type='text', opts=null, req=false}) => (
    <div className="form-group">
      <label className="form-label">{label}{req&&<span style={{color:'var(--red)'}}> *</span>}</label>
      {opts ? (
        <select className="form-select" value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : type==='textarea' ? (
        <textarea className="form-textarea" value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/>
      ) : (
        <input className="form-input" type={type} value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.companies}</div>
          <div className="page-header-sub">{rows.length} empresas cadastradas</div>
        </div>
        {pageTab === 'empresas'
          ? <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newCompany}</button>
          : null}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--surface-border)', marginBottom:20 }}>
        {[
          { key:'empresas', label:'Empresas',          icon:'fa-building'     },
          { key:'docs',     label:'Documentos Gerais', icon:'fa-folder-open'  },
        ].map(tb => (
          <button key={tb.key} onClick={() => setPageTab(tb.key)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'10px 18px',
            background:'none', border:'none', cursor:'pointer', fontSize:13,
            color: pageTab===tb.key ? 'var(--brand)' : 'var(--text-muted)',
            borderBottom: pageTab===tb.key ? '2px solid var(--brand)' : '2px solid transparent',
            fontFamily:'Lexend, sans-serif', fontWeight: pageTab===tb.key ? 600 : 400,
            marginBottom:-1, whiteSpace:'nowrap',
          }}>
            <i className={`fas ${tb.icon}`} style={{ fontSize:12 }}/>{tb.label}
          </button>
        ))}
      </div>

      {/* ── Documentos Gerais ── */}
      {pageTab === 'docs' && (
        <CompanyGeneralDocs empresas={rows} toast={toast} t={t} lang={lang}/>
      )}

      {pageTab === 'empresas' && <div className="card">
        <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}><i className="fas fa-search"/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <button
            onClick={()=>setShowArchived(v=>!v)}
            className={`btn ${showArchived?'btn-primary':'btn-secondary'}`}
            style={{fontSize:12,padding:'6px 14px'}}
          >
            <i className={`fas fa-${showArchived?'eye':'archive'}`}/>
            {showArchived ? 'Ver Ativas' : `Arquivadas${archivedCount>0?' ('+archivedCount+')':''}`}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-building"/><p>{t.noRecords}</p></div>
        ) : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr>
              <th>{t.name}</th><th>{t.country}</th><th>{t.legalType}</th>
              <th>{t.cnpj}/{t.ein}</th><th>{t.city}/{t.state}</th><th>{t.status}</th><th>{t.actions}</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="avatar" style={{background:fmt.avatarColor(r.nome),color:'#fff'}}>{fmt.initials(r.nome)}</div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontWeight:600,color:'var(--brand)',cursor:'pointer',textDecoration:'underline'}} onClick={()=>setDetail(r)}>{r.nome}</span>
                          {r.cfcFlag && <span title="Entidade BR com participação de Eduardo/Carla — impacto CFC na declaração US" style={{background:'rgba(239,68,68,.15)',color:'var(--red)',borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700,cursor:'help'}}>CFC</span>}
                        </div>
                        <div style={{fontSize:11,color:'var(--text-muted)',display:'flex',gap:4,flexWrap:'wrap',marginTop:2}}>
                          {r.setor && <span>{r.setor}</span>}
                          {(r.tags||[]).slice(0,2).map(tag=><span key={tag} style={{background:'var(--brand-dim)',color:'var(--brand-light)',borderRadius:4,padding:'1px 5px',fontSize:10}}>{tag}</span>)}
                          {(r.tags||[]).length>2 && <span style={{color:'var(--text-muted)',fontSize:10}}>+{(r.tags||[]).length-2}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge badge-${r.pais==='BR'?'green':'blue'}`}>{r.pais==='BR'?t.brazil:t.usa}</span></td>
                  <td style={{fontSize:12}}>{r.legalType||'—'}</td>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.pais==='BR'?r.cnpj:r.ein||'—'}</td>
                  <td style={{fontSize:12}}>
                    <div>{r.cidade}{r.estado?', '+r.estado:''}</div>
                    {(r.socios||[]).length>0 && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}><i className="fas fa-users" style={{fontSize:9,marginRight:3}}/>{(r.socios||[]).length} sócio{(r.socios||[]).length!==1?'s':''}</div>}
                  </td>
                  <td><span className={`badge badge-${statusInfo(r.status).badge}`}><i className={`fas ${statusInfo(r.status).icon}`} style={{fontSize:9,marginRight:4}}/>{statusInfo(r.status).l}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)} title="Editar"><i className="fas fa-pen"/></button>
                      {r.statusReg==='arquivado'
                        ? <button className="btn btn-ghost btn-sm" title="Restaurar" onClick={async()=>{await db.empresas.update(r.id,{statusReg:'ativo'});load();}}><i className="fas fa-rotate-left"/></button>
                        : <button className="btn btn-danger btn-sm" title="Arquivar (sem exclusão)" onClick={()=>handleDelete(r.id,r.nome)}><i className="fas fa-archive"/></button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>}

      {modal==='form' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:680}}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? 'Editar Empresa' : t.newCompany}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>

            {/* Form tabs */}
            <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--surface-border)',marginBottom:20}}>
              {[
                { key:'geral',   label:'Dados Gerais',    icon:'fa-building'       },
                { key:'socios',  label:'Sócios',          icon:'fa-users'          },
                { key:'fiscal',  label:'Regime Fiscal',   icon:'fa-receipt'        },
                { key:'tags',    label:'Tags & Notas',    icon:'fa-tags'           },
              ].map(tab => (
                <button key={tab.key} onClick={()=>setFormTab(tab.key)} style={{
                  display:'flex',alignItems:'center',gap:6,padding:'8px 14px',
                  background:'none',border:'none',cursor:'pointer',fontSize:12,
                  color: formTab===tab.key ? 'var(--brand)' : 'var(--text-muted)',
                  borderBottom: formTab===tab.key ? '2px solid var(--brand)' : '2px solid transparent',
                  fontFamily:'Lexend, sans-serif', fontWeight: formTab===tab.key ? 600 : 400,
                  marginBottom:-1, whiteSpace:'nowrap',
                }}>
                  <i className={`fas ${tab.icon}`} style={{fontSize:11}}/>{tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Dados Gerais */}
            {formTab === 'geral' && (
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome Legal da Entidade <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Grupo Meridian Ltda"/>
                </div>
                <div className="form-group">
                  <label className="form-label">País / Jurisdição</label>
                  <select className="form-select" value={form.pais||'BR'} onChange={e=>setForm(f=>({...f,pais:e.target.value}))}>
                    <option value="BR">Brasil</option>
                    <option value="US">EUA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Entidade</label>
                  <select className="form-select" value={form.legalType||''} onChange={e=>setForm(f=>({...f,legalType:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {form.pais==='BR'
                      ? ['Ltda','S.A.','EIRELI','MEI','CFC','Holding'].map(v=><option key={v} value={v}>{v}</option>)
                      : ['LLC','C-Corp','S-Corp','LP','Trust','CFC'].map(v=><option key={v} value={v}>{v}</option>)
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado / Unidade Federativa</label>
                  <input className="form-input" value={form.estado||''} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} placeholder={form.pais==='BR'?'SP, RJ, MG...':'FL, DE, TX...'}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input className="form-input" value={form.cidade||''} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status||'ativa'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="ativa">Ativa</option>
                    <option value="em-construcao">Em Desenvolvimento</option>
                    <option value="encerrada">Encerrada</option>
                    <option value="holding">Holding</option>
                    <option value="parada">Parada</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Abertura</label>
                  <input className="form-input" type="date" value={form.fundacao||''} onChange={e=>setForm(f=>({...f,fundacao:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Encerramento</label>
                  <input className="form-input" type="date" value={form.dataEncerramento||''} onChange={e=>setForm(f=>({...f,dataEncerramento:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{form.pais==='BR' ? 'CNPJ' : 'EIN'}</label>
                  <input className="form-input" value={form.pais==='BR'?(form.cnpj||''):(form.ein||'')} onChange={e=>setForm(f=>form.pais==='BR'?{...f,cnpj:e.target.value}:{...f,ein:e.target.value})} placeholder={form.pais==='BR'?'00.000.000/0001-00':'00-0000000'}/>
                </div>
                {form.pais==='BR' && (
                  <div className="form-group">
                    <label className="form-label">Inscrição Estadual</label>
                    <input className="form-input" value={form.inscricaoEstadual||''} onChange={e=>setForm(f=>({...f,inscricaoEstadual:e.target.value}))}/>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Setor de Atuação</label>
                  <input className="form-input" value={form.setor||''} onChange={e=>setForm(f=>({...f,setor:e.target.value}))} placeholder="Ex: Tecnologia, Construção, Imóveis..."/>
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" value={form.website||''} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="https://..."/>
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={form.telefone||''} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/>
                </div>
              </div>
            )}

            {/* TAB: Sócios */}
            {formTab === 'socios' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>Sócios e participação societária</span>
                  <button className="btn btn-secondary" style={{fontSize:12,padding:'5px 12px'}} onClick={()=>setForm(f=>({...f,socios:[...(f.socios||[]),{nome:'',percentual:'',documento:'',tipo:'pessoa-fisica'}]}))}>
                    <i className="fas fa-plus"/>Adicionar Sócio
                  </button>
                </div>
                {(!form.socios||form.socios.length===0) ? (
                  <div className="empty-state" style={{padding:'32px 0'}}><i className="fas fa-user-group"/><p>Nenhum sócio cadastrado</p></div>
                ) : (
                  form.socios.map((s,i) => (
                    <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:8,alignItems:'end',marginBottom:10,background:'var(--surface-hover)',borderRadius:10,padding:'10px 12px'}}>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label" style={{fontSize:11}}>Nome do Sócio</label>
                        <input className="form-input" style={{height:34}} value={s.nome} onChange={e=>{const sc=[...form.socios];sc[i]={...sc[i],nome:e.target.value};setForm(f=>({...f,socios:sc}));}} placeholder="Nome completo"/>
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label" style={{fontSize:11}}>Participação %</label>
                        <input className="form-input" style={{height:34}} value={s.percentual} onChange={e=>{const sc=[...form.socios];sc[i]={...sc[i],percentual:e.target.value};setForm(f=>({...f,socios:sc}));}} placeholder="0.00"/>
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label" style={{fontSize:11}}>CPF / SSN / ID</label>
                        <input className="form-input" style={{height:34}} value={s.documento} onChange={e=>{const sc=[...form.socios];sc[i]={...sc[i],documento:e.target.value};setForm(f=>({...f,socios:sc}));}} placeholder="Documento"/>
                      </div>
                      <button onClick={()=>setForm(f=>({...f,socios:f.socios.filter((_,idx)=>idx!==i)}))} style={{height:34,width:34,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,color:'var(--red)',cursor:'pointer',flexShrink:0,marginBottom:0}}>
                        <i className="fas fa-trash" style={{fontSize:12}}/>
                      </button>
                    </div>
                  ))
                )}
                {form.socios?.length > 0 && (() => {
                  const total = form.socios.reduce((s,sc)=>s+parseFloat(sc.percentual||0),0);
                  return (
                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                      <span style={{fontSize:12,color:Math.abs(total-100)<0.01?'var(--green)':'var(--yellow)',fontWeight:700}}>
                        <i className={`fas fa-${Math.abs(total-100)<0.01?'check-circle':'triangle-exclamation'}`} style={{marginRight:6}}/>
                        Total: {total.toFixed(2)}%{Math.abs(total-100)>=0.01?' (deve ser 100%)':''}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB: Regime Fiscal */}
            {formTab === 'fiscal' && (
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Regime Tributário</label>
                  <select className="form-select" value={form.taxRegime||''} onChange={e=>setForm(f=>({...f,taxRegime:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {form.pais==='BR'
                      ? ['Simples Nacional','Lucro Presumido','Lucro Real','Imune','Isenta'].map(v=><option key={v} value={v}>{v}</option>)
                      : ['C-Corp','S-Corp','LLC Disregarded','LLC Partnership','Check-the-Box','Pass-Through','Exempt'].map(v=><option key={v} value={v}>{v}</option>)
                    }
                  </select>
                </div>
                {form.pais==='US' && (
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label className="form-label">Check-the-Box Election</label>
                    <select className="form-select" value={form.ctbElection||''} onChange={e=>setForm(f=>({...f,ctbElection:e.target.value}))}>
                      <option value="">N/A</option>
                      <option value="disregarded">Disregarded Entity (Form 8832)</option>
                      <option value="partnership">Partnership</option>
                      <option value="corporation">Corporation</option>
                    </select>
                  </div>
                )}
                {form.pais==='BR' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Ano-Calendário Vigente</label>
                      <input className="form-input" value={form.anoCalendario||''} onChange={e=>setForm(f=>({...f,anoCalendario:e.target.value}))} placeholder="2024"/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipo de Apuração</label>
                      <select className="form-select" value={form.apuracao||''} onChange={e=>setForm(f=>({...f,apuracao:e.target.value}))}>
                        <option value="">Selecione...</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="anual">Anual (Estimativa Mensal)</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Classificação CFC</label>
                  <select className="form-select" value={form.cfcClass||''} onChange={e=>setForm(f=>({...f,cfcClass:e.target.value}))}>
                    <option value="">Não aplicável</option>
                    <option value="cfc-ativo">CFC — Regime Ativo</option>
                    <option value="cfc-passivo">CFC — Regime Passivo</option>
                    <option value="transparente">Entidade Transparente</option>
                    <option value="holding">Holding Pura</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Obrigações Acessórias Relevantes</label>
                  <textarea className="form-textarea" rows={2} value={form.obrigacoesAcessorias||''} onChange={e=>setForm(f=>({...f,obrigacoesAcessorias:e.target.value}))} placeholder="Ex: ECF, SPED, FBAR, Form 5471, DIRPF..."/>
                </div>
              </div>
            )}

            {/* TAB: Tags & Notas */}
            {formTab === 'tags' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Tags da Entidade</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
                    {['Estrutura Relevante','Transparente','CFC','Holding','Operacional','Investimento','Imóvel','Financeira','Em Liquidação'].map(tag => {
                      const active = (form.tags||[]).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={()=>setForm(f=>({...f,tags:active?(f.tags||[]).filter(tg=>tg!==tag):[...(f.tags||[]),tag]}))}
                          style={{
                            padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                            border: active ? '1px solid var(--brand)' : '1px solid var(--surface-border)',
                            background: active ? 'var(--brand-dim)' : 'var(--surface-hover)',
                            color: active ? 'var(--brand-light)' : 'var(--text-muted)',
                            fontFamily:'Lexend, sans-serif', fontWeight: active ? 600 : 400,
                          }}
                        >
                          {active && <i className="fas fa-check" style={{fontSize:10,marginRight:5}}/>}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group" style={{marginTop:16}}>
                  <label className="form-label">Observações Estratégicas</label>
                  <textarea className="form-textarea" rows={5} value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Notas sobre estrutura societária, planejamento fiscal, decisões estratégicas, historico relevante..."/>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-check"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} t={t}/>}
      {detail && (
        <CompanyDetail
          empresa={detail}
          onClose={() => setDetail(null)}
          onEdit={r => { setDetail(null); openEdit(r); }}
          lang={lang}
          toast={toast}
        />
      )}
    </div>
  );
}
