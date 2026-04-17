// ── Acordo de Gaveta Page ────────────────────────────────────
function AcordoGavetaPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const fileRef = useRef(null);

  const AG_KEY = 'acordoGaveta_docs';

  const TIPOS = [
    { key: 'Promessa de Compra e Venda', icon: 'fa-handshake', color: 'brand' },
    { key: 'Pacto Parassocial',          icon: 'fa-people-group', color: 'blue'  },
    { key: 'Opção de Compra',            icon: 'fa-tag',          color: 'green' },
    { key: 'Cessão de Direitos',         icon: 'fa-right-left',   color: 'yellow'},
    { key: 'Acordo de Confidencialidade',icon: 'fa-lock',         color: 'red'   },
    { key: 'Outros',                     icon: 'fa-file-lines',   color: 'muted' },
  ];

  const STATUS_MAP = {
    ativo:    { badge: 'brand',  label: t.statusActive    },
    pendente: { badge: 'yellow', label: t.statusPending   },
    vencido:  { badge: 'red',    label: t.statusOverdue   },
    encerrado:{ badge: 'muted',  label: t.statusCancelled },
  };

  const COLOR_VAR = { brand:'var(--brand)', blue:'var(--blue)', green:'var(--green)', yellow:'var(--yellow)', red:'var(--red)', muted:'var(--text-muted)' };
  const COLOR_BG  = { brand:'var(--brand-dim)', blue:'rgba(59,130,246,.12)', green:'rgba(34,197,94,.12)', yellow:'rgba(245,158,11,.12)', red:'rgba(239,68,68,.12)', muted:'rgba(100,116,139,.1)' };

  const load = useCallback(async () => {
    const rec = await db.config.get(AG_KEY);
    setRows(rec?.value || []);
    const emps = await db.empresas.toArray();
    setEmpresas(emps);
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterTipo   || r.tipo === filterTipo) &&
    (!search || r.nome?.toLowerCase().includes(search.toLowerCase()) ||
      r.parteA?.toLowerCase().includes(search.toLowerCase()) ||
      r.parteB?.toLowerCase().includes(search.toLowerCase()) ||
      r.descricao?.toLowerCase().includes(search.toLowerCase()))
  );

  function openNew() {
    setForm({
      id: Date.now().toString(),
      tipo: filterTipo || 'Promessa de Compra e Venda',
      status: 'ativo',
      dataAssinatura: new Date().toISOString().slice(0,10),
      confidencial: true,
    });
    setModal('form');
  }

  function openEdit(r) { setForm({...r}); setModal('form'); }

  function openDetail(r) {
    setDetailId(r.id);
    setDetailVisible(false);
    setTimeout(() => setDetailVisible(true), 30);
  }

  function closeDetail() {
    setDetailVisible(false);
    setTimeout(() => setDetailId(null), 250);
  }

  function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({
        ...f,
        nomeArquivo: f.nomeArquivo || file.name,
        tamanho: file.size > 1048576 ? (file.size/1048576).toFixed(1)+' MB' : (file.size/1024).toFixed(0)+' KB',
        tipoArquivo: file.name.split('.').pop().toUpperCase(),
        conteudo: ev.target.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleDownload(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.', 'error'); return; }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nomeArquivo || r.nome || 'acordo'; a.click();
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.', 'error'); return; }
    if (!form.parteA?.trim() || !form.parteB?.trim()) { toast('Partes A e B são obrigatórias.', 'error'); return; }

    const all = (await db.config.get(AG_KEY))?.value || [];
    const idx = all.findIndex(r => r.id === form.id);
    if (idx >= 0) all[idx] = form; else all.push(form);
    await db.config.put({ chave: AG_KEY, value: all });

    await db.auditLog.add({
      acao: form.id && idx >= 0 ? 'Editou Acordo de Gaveta' : 'Criou Acordo de Gaveta',
      modulo: 'Acordo de Gaveta',
      detalhe: form.nome,
      timestamp: new Date().toISOString(),
    });

    toast(t.saved, 'success'); setModal(null); load();
  }

  async function handleDelete(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const all = (await db.config.get(AG_KEY))?.value || [];
      await db.config.put({ chave: AG_KEY, value: all.filter(r => r.id !== id) });
      await db.auditLog.add({ acao: 'Excluiu Acordo de Gaveta', modulo: 'Acordo de Gaveta', timestamp: new Date().toISOString() });
      toast(t.deleted, 'success'); setConfirm(null);
      if (detailId === id) { setDetailVisible(false); setTimeout(() => setDetailId(null), 250); }
      load();
    }});
  }

  // ── Detail view ─────────────────────────────────────────────
  const detailRow = rows.find(r => r.id === detailId);

  if (detailId) {
    const dr = detailRow;
    const tipo = TIPOS.find(t => t.key === dr?.tipo) || TIPOS[TIPOS.length-1];
    const st = STATUS_MAP[dr?.status] || STATUS_MAP.ativo;
    return (
      <div className="page-content" style={{ opacity: detailVisible ? 1 : 0, transform: detailVisible ? 'translateY(0)' : 'translateY(10px)', transition:'opacity .22s, transform .22s' }}>
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={closeDetail}>
              <i className="fas fa-arrow-left" style={{fontSize:13}}/>
            </button>
            <div>
              <div className="page-header-title" style={{fontSize:17}}>{dr?.nome}</div>
              <div className="page-header-sub">Acordo de Gaveta · Confidencial</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            {dr?.conteudo && (
              <button className="btn btn-secondary" onClick={() => handleDownload(dr)}>
                <i className="fas fa-download"/>Baixar Documento
              </button>
            )}
            <button className="btn btn-primary" onClick={() => { setForm({...dr}); setModal('form'); }}>
              <i className="fas fa-pen"/>{t.edit}
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          {/* Info Card */}
          <div className="card" style={{padding:'20px 24px'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text-muted)',letterSpacing:.5,textTransform:'uppercase',marginBottom:16}}>Informações do Acordo</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:36,height:36,borderRadius:9,background:COLOR_BG[tipo.color],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={`fas ${tipo.icon}`} style={{color:COLOR_VAR[tipo.color],fontSize:14}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Tipo</div>
                  <div style={{fontWeight:600,fontSize:13}}>{dr?.tipo}</div>
                </div>
              </div>
              <InfoRow label="Status"        value={<span className={`badge badge-${st.badge}`}>{st.label}</span>}/>
              <InfoRow label="Assinado em"   value={dr?.dataAssinatura ? fmt.date(dr.dataAssinatura, lang) : '—'}/>
              <InfoRow label="Vencimento"    value={dr?.vencimento ? fmt.date(dr.vencimento, lang) : 'Sem vencimento'}/>
              <InfoRow label="Confidencial"  value={dr?.confidencial ? <span style={{color:'var(--red)',fontWeight:600,fontSize:12}}><i className="fas fa-lock" style={{marginRight:5}}/>Sim</span> : 'Não'}/>
              {dr?.valor && <InfoRow label="Valor"     value={dr.valor}/>}
              {dr?.descricao && (
                <div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{t.notes}</div>
                  <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5}}>{dr.descricao}</div>
                </div>
              )}
            </div>
          </div>

          {/* Parties Card */}
          <div className="card" style={{padding:'20px 24px'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text-muted)',letterSpacing:.5,textTransform:'uppercase',marginBottom:16}}>Partes Envolvidas</div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <PartyBlock label="Parte A" name={dr?.parteA} role={dr?.papelA} empresaId={dr?.empresaA} empresas={empresas}/>
              <div style={{height:1,background:'var(--surface-border)'}}/>
              <PartyBlock label="Parte B" name={dr?.parteB} role={dr?.papelB} empresaId={dr?.empresaB} empresas={empresas}/>
              {dr?.testemunha1 && (
                <>
                  <div style={{height:1,background:'var(--surface-border)'}}/>
                  <PartyBlock label="Testemunha 1" name={dr.testemunha1} role={null} empresaId={null} empresas={empresas}/>
                </>
              )}
              {dr?.testemunha2 && <PartyBlock label="Testemunha 2" name={dr.testemunha2} role={null} empresaId={null} empresas={empresas}/>}
              {dr?.advogado && (
                <>
                  <div style={{height:1,background:'var(--surface-border)'}}/>
                  <InfoRow label="Advogado / Escritório" value={dr.advogado}/>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Document & Audit */}
        <div className="card" style={{padding:'20px 24px'}}>
          <div style={{fontWeight:700,fontSize:13,color:'var(--text-muted)',letterSpacing:.5,textTransform:'uppercase',marginBottom:16}}>Documento</div>
          {dr?.conteudo ? (
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--surface-hover)',borderRadius:10,border:'1px solid var(--surface-border)'}}>
              <div style={{width:40,height:40,borderRadius:9,background:'var(--brand-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="fas fa-file-pdf" style={{color:'var(--brand)',fontSize:16}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{dr.nomeArquivo || dr.nome}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                  {dr.tipoArquivo && <span style={{background:'var(--surface-card)',borderRadius:4,padding:'1px 6px',marginRight:8,fontSize:10}}>{dr.tipoArquivo}</span>}
                  {dr.tamanho}
                </div>
              </div>
              <button className="btn btn-secondary" style={{fontSize:12}} onClick={() => handleDownload(dr)}>
                <i className="fas fa-download"/>Download
              </button>
            </div>
          ) : (
            <div className="empty-state" style={{padding:'24px 0'}}>
              <i className="fas fa-file-circle-xmark" style={{fontSize:24,color:'var(--text-muted)',marginBottom:8}}/>
              <p style={{fontSize:13}}>Nenhum documento anexado.</p>
            </div>
          )}
        </div>

        {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.acordoGavetaPage}</div>
          <div className="page-header-sub">{rows.length} acordo{rows.length !== 1 ? 's' : ''} · Documentos sigilosos</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newAgreement}</button>
      </div>

      {/* Alerta de confidencialidade */}
      <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 16px',background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,marginBottom:20}}>
        <i className="fas fa-triangle-exclamation" style={{color:'var(--red)',fontSize:14,marginTop:2,flexShrink:0}}/>
        <div style={{fontSize:12.5,color:'var(--text-secondary)',lineHeight:1.5}}>
          <strong style={{color:'var(--text-primary)'}}>Documentos Sigilosos.</strong>{' '}
          Acordos de gaveta são documentos com informações sensíveis e restritas. O acesso a este módulo é registrado em log de auditoria.
        </div>
      </div>

      {/* Type cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:20}}>
        {TIPOS.map(tp => {
          const count = rows.filter(r => r.tipo === tp.key).length;
          return (
            <button key={tp.key}
              onClick={() => setFilterTipo(filterTipo === tp.key ? '' : tp.key)}
              style={{display:'flex',alignItems:'center',gap:10,textAlign:'left',background:filterTipo===tp.key?'var(--surface-hover)':'var(--surface-card)',border:`1px solid ${filterTipo===tp.key?'var(--brand)':'var(--surface-border)'}`,borderRadius:12,padding:'11px 13px',cursor:'pointer',transition:'border-color .15s'}}>
              <div style={{width:34,height:34,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:COLOR_BG[tp.color]}}>
                <i className={`fas ${tp.icon}`} style={{fontSize:14,color:COLOR_VAR[tp.color]}}/>
              </div>
              <div>
                <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:11,lineHeight:1.3}}>{tp.key}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{count} acordo{count !== 1 ? 's' : ''}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}>
            <i className="fas fa-search"/>
            <input placeholder="Buscar por nome ou parte..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{maxWidth:240}} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS.map(tp=><option key={tp.key} value={tp.key}>{tp.key}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          {(search || filterTipo || filterStatus) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}}
              onClick={()=>{setSearch('');setFilterTipo('');setFilterStatus('');}}>
              <i className="fas fa-xmark"/>Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-handshake" style={{fontSize:28,color:'var(--text-muted)',marginBottom:10}}/>
            <p>{t.noAgreements}</p>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={openNew}>
              <i className="fas fa-plus"/>{t.newAgreement}
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.acordoGavetaPage}</th>
                  <th>{t.agreementType}</th>
                  <th>{t.parties} A</th>
                  <th>{t.parties} B</th>
                  <th>{t.signatureDate}</th>
                  <th>{t.expiryDateAg}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const tp = TIPOS.find(x => x.key === r.tipo) || TIPOS[TIPOS.length-1];
                  const st = STATUS_MAP[r.status] || STATUS_MAP.ativo;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:28,height:28,borderRadius:7,background:COLOR_BG[tp.color],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <i className={`fas ${tp.icon}`} style={{color:COLOR_VAR[tp.color],fontSize:11}}/>
                          </div>
                          <div>
                            <button style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--text-primary)',fontWeight:600,fontSize:13,textAlign:'left',lineHeight:1.3}}
                              onClick={() => openDetail(r)}>{r.nome}</button>
                            {r.confidencial && <span style={{fontSize:10,color:'var(--red)',marginLeft:6}}><i className="fas fa-lock" style={{fontSize:9}}/> Sigiloso</span>}
                          </div>
                        </div>
                      </td>
                      <td><span style={{fontSize:11,color:COLOR_VAR[tp.color],fontWeight:600}}>{r.tipo}</span></td>
                      <td><div style={{fontSize:13}}>{r.parteA||'—'}</div>{r.papelA&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{r.papelA}</div>}</td>
                      <td><div style={{fontSize:13}}>{r.parteB||'—'}</div>{r.papelB&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{r.papelB}</div>}</td>
                      <td>{r.dataAssinatura ? fmt.date(r.dataAssinatura, lang) : '—'}</td>
                      <td>{r.vencimento ? fmt.date(r.vencimento, lang) : <span style={{fontSize:12,color:'var(--text-muted)'}}>—</span>}</td>
                      <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn-icon" title="Ver detalhes" onClick={() => openDetail(r)}><i className="fas fa-eye"/></button>
                          {r.conteudo && <button className="btn-icon" title="Download" onClick={() => handleDownload(r)}><i className="fas fa-download"/></button>}
                          <button className="btn-icon" title={t.edit} onClick={() => openEdit(r)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon danger" title={t.delete} onClick={() => handleDelete(r.id)}><i className="fas fa-trash"/></button>
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

      {/* Form Modal */}
      {modal === 'form' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:620}}>
            <div className="modal-header">
              <div className="modal-title">{form.id && rows.find(r=>r.id===form.id) ? t.editAgreement : t.newAgreement}</div>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.18)',borderRadius:9,marginBottom:18}}>
                <i className="fas fa-lock" style={{color:'var(--red)',fontSize:12,marginTop:3}}/>
                <span style={{fontSize:12,color:'var(--text-secondary)'}}>Este registro é sigiloso. O acesso será registrado no log de auditoria.</span>
              </div>
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome / Identificação do Acordo <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
                    placeholder="Ex: Opção de Compra — Cota 30% Meridian BR"/>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.agreementType}</label>
                  <select className="form-select" value={form.tipo||'Promessa de Compra e Venda'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    {TIPOS.map(tp=><option key={tp.key} value={tp.key}>{tp.key}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.status}</label>
                  <select className="form-select" value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.signatureDate}</label>
                  <input className="form-input" type="date" value={form.dataAssinatura||''} onChange={e=>setForm(f=>({...f,dataAssinatura:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.expiryDateAg}</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>

                <div className="form-group">
                  <label className="form-label">Valor (opcional)</label>
                  <input className="form-input" value={form.valor||''} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}
                    placeholder="Ex: R$ 2.000.000 ou US$ 500k"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Advogado / Escritório</label>
                  <input className="form-input" value={form.advogado||''} onChange={e=>setForm(f=>({...f,advogado:e.target.value}))}
                    placeholder="Ex: Baker McKenzie"/>
                </div>

                {/* Separator */}
                <div style={{gridColumn:'1/-1',height:1,background:'var(--surface-border)',margin:'4px 0'}}/>
                <div style={{gridColumn:'1/-1',fontWeight:700,fontSize:12,color:'var(--text-muted)',letterSpacing:.4,textTransform:'uppercase'}}>{t.parties}</div>

                <div className="form-group">
                  <label className="form-label">Parte A <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.parteA||''} onChange={e=>setForm(f=>({...f,parteA:e.target.value}))}
                    placeholder="Nome da pessoa ou empresa"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Papel / Qualificação</label>
                  <input className="form-input" value={form.papelA||''} onChange={e=>setForm(f=>({...f,papelA:e.target.value}))}
                    placeholder="Ex: Vendedor, Cedente, Outorgante"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa relacionada (Parte A)</label>
                  <select className="form-select" value={form.empresaA||''} onChange={e=>setForm(f=>({...f,empresaA:e.target.value}))}>
                    <option value="">— Nenhuma —</option>
                    {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1',height:1,background:'var(--surface-border)',margin:'0'}}/>

                <div className="form-group">
                  <label className="form-label">Parte B <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.parteB||''} onChange={e=>setForm(f=>({...f,parteB:e.target.value}))}
                    placeholder="Nome da pessoa ou empresa"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Papel / Qualificação</label>
                  <input className="form-input" value={form.papelB||''} onChange={e=>setForm(f=>({...f,papelB:e.target.value}))}
                    placeholder="Ex: Comprador, Cessionário, Outorgado"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa relacionada (Parte B)</label>
                  <select className="form-select" value={form.empresaB||''} onChange={e=>setForm(f=>({...f,empresaB:e.target.value}))}>
                    <option value="">— Nenhuma —</option>
                    {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>

                {/* Optional: witnesses */}
                <div style={{gridColumn:'1/-1',height:1,background:'var(--surface-border)',margin:'4px 0'}}/>
                <div style={{gridColumn:'1/-1',fontWeight:700,fontSize:12,color:'var(--text-muted)',letterSpacing:.4,textTransform:'uppercase'}}>Testemunhas (opcional)</div>
                <div className="form-group">
                  <label className="form-label">Testemunha 1</label>
                  <input className="form-input" value={form.testemunha1||''} onChange={e=>setForm(f=>({...f,testemunha1:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Testemunha 2</label>
                  <input className="form-input" value={form.testemunha2||''} onChange={e=>setForm(f=>({...f,testemunha2:e.target.value}))}/>
                </div>

                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.notes}</label>
                  <textarea className="form-textarea" rows={2} value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                    placeholder="Condições suspensivas, cláusulas especiais, prazo de exercício..."/>
                </div>

                <div className="form-group" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                  <div>
                    <label className="form-label">Documento</label>
                    <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileChange}/>
                    <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                      <i className="fas fa-paperclip"/>{form.conteudo ? 'Trocar arquivo' : 'Anexar arquivo'}
                    </button>
                    {form.nomeArquivo && <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:10}}>{form.nomeArquivo} {form.tamanho && `(${form.tamanho})`}</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
                    <input type="checkbox" id="chk-conf" checked={!!form.confidencial} onChange={e=>setForm(f=>({...f,confidencial:e.target.checked}))} style={{width:15,height:15,cursor:'pointer'}}/>
                    <label htmlFor="chk-conf" style={{fontSize:13,cursor:'pointer',userSelect:'none'}}>
                      <i className="fas fa-lock" style={{color:'var(--red)',marginRight:5,fontSize:12}}/>Documento sigiloso
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
      <div style={{fontSize:11,color:'var(--text-muted)',minWidth:110,paddingTop:1}}>{label}</div>
      <div style={{fontSize:13,color:'var(--text-primary)',fontWeight:500,flex:1}}>{value || '—'}</div>
    </div>
  );
}

function PartyBlock({ label, name, role, empresaId, empresas }) {
  const emp = empresaId ? empresas.find(e => String(e.id) === String(empresaId)) : null;
  return (
    <div>
      <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{label}</div>
      <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)'}}>{name || '—'}</div>
      {role && <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:2}}>{role}</div>}
      {emp && (
        <div style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:4,background:'var(--surface-hover)',borderRadius:6,padding:'2px 8px',fontSize:11,color:'var(--brand)'}}>
          <i className="fas fa-building" style={{fontSize:10}}/>
          {emp.nome}
        </div>
      )}
    </div>
  );
}
