// ── AptInsurancePage ─────────────────────────────────────────
const AI_KEY = 'aptInsurance_data';

const AI_DEFAULTS = [];

function AptInsurancePage() {
  const { t, lang, toast } = useApp();
  const [seguros, setSeguros] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const fileRef = useRef(null);

  const STATUS_MAP = {
    ativo:     { badge: 'green',  label: t.statusActive    },
    vencido:   { badge: 'red',    label: t.statusOverdue   },
    cancelado: { badge: 'muted',  label: t.statusCancelled },
    suspenso:  { badge: 'yellow', label: t.statusSuspended },
  };

  const TIPOS_IMOVEL = ['Apartamento', 'Casa', 'Condomínio', 'Cobertura', 'Flat', 'Comercial'];
  const PAISES = [{ value:'BR', label:'🇧🇷 Brasil' }, { value:'US', label:'🇺🇸 EUA' }];

  useEffect(() => {
    db.config.get(AI_KEY).then(rec => setSeguros(rec?.value || AI_DEFAULTS));
  }, []);

  async function save() {
    if (!form.seguradora?.trim()) { toast('Seguradora obrigatória.', 'error'); return; }
    const all = (await db.config.get(AI_KEY))?.value || AI_DEFAULTS;
    const entry = { ...form, id: form.id || Date.now() };
    const updated = all.find(s => s.id === entry.id)
      ? all.map(s => s.id === entry.id ? entry : s)
      : [...all, entry];
    await db.config.put({ chave: AI_KEY, value: updated });
    setSeguros(updated); setModal(null);
    toast(t.saved, 'success');
  }

  function del(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const all = (await db.config.get(AI_KEY))?.value || [];
      const updated = all.filter(s => s.id !== id);
      await db.config.put({ chave: AI_KEY, value: updated });
      setSeguros(updated); setConfirm(null); setDetail(null);
      toast(t.deleted, 'success');
    }});
  }

  function openForm(seg) {
    setForm(seg ? { ...seg } : {
      id: null, status: 'ativo', moeda: 'BRL', pais: 'BR', tipo_imovel: 'Apartamento',
      cobertura_incendio: true, cobertura_roubo: true, cobertura_rcf: true,
      cobertura_danos_eletricos: false, cobertura_quebra_vidros: false, cobertura_vendaval: false,
      renovacao_auto: false, docs: [],
    });
    setModal('form');
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const doc = { nome: file.name, tipo: file.name.split('.').pop().toUpperCase(), tamanho: file.size > 1048576 ? (file.size/1048576).toFixed(1)+' MB' : (file.size/1024).toFixed(0)+' KB', conteudo: ev.target.result };
      setForm(f => ({ ...f, docs: [...(f.docs||[]), doc] }));
    };
    reader.readAsDataURL(file);
  }

  function downloadDoc(doc) {
    if (!doc.conteudo) return;
    const a = document.createElement('a'); a.href = doc.conteudo; a.download = doc.nome; a.click();
  }

  const totalBRL = seguros.filter(s=>s.status==='ativo'&&s.moeda==='BRL').reduce((a,s)=>a+parseFloat(s.valor_imovel?.replace(/[^\d.]/g,'')||0),0);
  const totalUSD = seguros.filter(s=>s.status==='ativo'&&s.moeda==='USD').reduce((a,s)=>a+parseFloat(s.valor_imovel?.replace(/[^\d.]/g,'')||0),0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#10b98140,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="fas fa-building" style={{ color:'#10b981', fontSize:18 }}/>
          </div>
          <div className="page-header-info">
            <div className="page-header-title">{t.aptInsurancePage}</div>
            <div className="page-header-sub">{seguros.filter(s=>s.status==='ativo').length} {t.activePolicies} · cobertura BRL {Number(totalBRL).toLocaleString('pt-BR')} + USD {Number(totalUSD).toLocaleString('en-US')}</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <i className="fas fa-plus"/>{t.newPolicy}
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label: t.activePolicies, value: seguros.filter(s=>s.status==='ativo').length, icon:'fa-file-shield', color:'var(--green)' },
          { label: t.propertiesBR, value: seguros.filter(s=>s.pais==='BR').length, icon:'fa-flag', color:'var(--brand)' },
          { label: t.propertiesUS, value: seguros.filter(s=>s.pais==='US').length, icon:'fa-flag-usa', color:'#f59e0b' },
          { label: t.totalValueBRL, value: 'R$ '+Number(totalBRL).toLocaleString('pt-BR'), icon:'fa-house', color:'var(--text-muted)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <i className={`fas ${c.icon}`} style={{ fontSize:20, color:c.color, flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{c.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {seguros.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-building"/><p>{t.noPolicies}</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:14 }}>
          {seguros.map(seg => {
            const st = STATUS_MAP[seg.status] || STATUS_MAP.ativo;
            return (
              <div key={seg.id} className="card" style={{ padding:'18px 20px', cursor:'pointer' }} onClick={() => setDetail(seg)}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ flex:1, minWidth:0, marginRight:8 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:2 }}>{seg.seguradora}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{seg.imovel}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span className={`badge badge-${st.badge}`}>{st.label}</span>
                      <span className="badge badge-muted" style={{ fontSize:10 }}>{seg.tipo_imovel}</span>
                      <span className="badge badge-muted" style={{ fontSize:10 }}>{seg.pais==='US'?'🇺🇸 EUA':'🇧🇷 BR'}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openForm(seg)}><i className="fas fa-pen"/></button>
                    <button className="btn-icon danger" onClick={() => del(seg.id)}><i className="fas fa-trash"/></button>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>
                  {seg.cidade && <div><i className="fas fa-location-dot" style={{ width:16, color:'var(--brand)' }}/> {seg.cidade}{seg.estado ? `, ${seg.estado}` : ''}</div>}
                  <div><i className="fas fa-house" style={{ width:16, color:'var(--brand)' }}/> Valor imóvel: {seg.moeda==='USD'?'US$':'R$'} {Number(seg.valor_imovel?.replace(/[^\d.]/g,'')||0).toLocaleString(seg.moeda==='USD'?'en-US':'pt-BR')}</div>
                  <div><i className="fas fa-hand-holding-dollar" style={{ width:16, color:'var(--green)' }}/> Prêmio: {seg.moeda==='USD'?'US$':'R$'} {seg.premio_mensal}/mês</div>
                  <div><i className="fas fa-calendar" style={{ width:16, color:'var(--brand)' }}/> {seg.inicio?fmt.date(seg.inicio,lang):'—'} → {seg.vencimento?fmt.date(seg.vencimento,lang):'—'}</div>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {seg.cobertura_incendio       && <span className="badge badge-green"  style={{ fontSize:10 }}>{t.fireCoverageApt}</span>}
                  {seg.cobertura_roubo          && <span className="badge badge-blue"   style={{ fontSize:10 }}>{t.theftCoverageApt}</span>}
                  {seg.cobertura_rcf            && <span className="badge badge-yellow" style={{ fontSize:10 }}>{t.civilLiability}</span>}
                  {seg.cobertura_danos_eletricos && <span className="badge badge-muted"  style={{ fontSize:10 }}>{t.electricDamage}</span>}
                  {seg.cobertura_vendaval       && <span className="badge badge-muted"  style={{ fontSize:10 }}>{t.windstormCoverage}</span>}
                  {seg.cobertura_quebra_vidros  && <span className="badge badge-muted"  style={{ fontSize:10 }}>{t.glassCoverage}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth:600 }}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-building" style={{ marginRight:8, color:'#10b981' }}/>{detail.seguradora} — {detail.produto}</div>
              <button className="modal-close" onClick={() => setDetail(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', fontSize:13 }}>
                {[
                  [t.insurer, detail.seguradora],
                  [t.product, detail.produto],
                  [t.policyNumber, detail.apolice],
                  [t.propertyType, detail.tipo_imovel],
                  [t.propertyAddress, detail.imovel],
                  ['Cidade / Estado', detail.cidade && `${detail.cidade}${detail.estado?', '+detail.estado:''}`],
                  [t.pais, detail.pais==='US'?'EUA':'Brasil'],
                  [t.propertyArea, detail.area_m2 && `${detail.area_m2} m²`],
                  [t.insured, detail.segurado],
                  [t.propertyValue, `${detail.moeda==='USD'?'US$':'R$'} ${Number(detail.valor_imovel?.replace(/[^\d.]/g,'')||0).toLocaleString(detail.moeda==='USD'?'en-US':'pt-BR')}`],
                  [t.contentValue, detail.valor_conteudo && `${detail.moeda==='USD'?'US$':'R$'} ${Number(detail.valor_conteudo?.replace(/[^\d.]/g,'')||0).toLocaleString(detail.moeda==='USD'?'en-US':'pt-BR')}`],
                  [t.deductible, `${detail.moeda==='USD'?'US$':'R$'} ${detail.franquia}`],
                  [t.monthlyPremiumIns, `${detail.moeda==='USD'?'US$':'R$'} ${detail.premio_mensal}`],
                  [t.annualPremium, `${detail.moeda==='USD'?'US$':'R$'} ${detail.premio_anual}`],
                  [t.startDate, detail.inicio ? fmt.date(detail.inicio,lang) : '—'],
                  [t.dueDate, detail.vencimento ? fmt.date(detail.vencimento,lang) : '—'],
                  [t.autoRenewal, detail.renovacao_auto?'Sim':'Não'],
                  [t.insurerContact, detail.seguradora_contato],
                ].map(([lbl,val]) => val ? (
                  <div key={lbl}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'.05em' }}>{lbl}</div>
                    <div style={{ fontWeight:500 }}>{val}</div>
                  </div>
                ) : null)}
              </div>
              {detail.obs && (
                <div style={{ marginTop:14, background:'var(--surface-hover)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>
                  <i className="fas fa-note-sticky" style={{ marginRight:6, color:'var(--brand)' }}/>{detail.obs}
                </div>
              )}
              {(detail.docs||[]).length > 0 && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em' }}>Documentos</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {detail.docs.map((d,i) => (
                      <button key={i} onClick={() => downloadDoc(d)} style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface-hover)', border:'1px solid var(--surface-border)', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--text-secondary)' }}>
                        <i className="fas fa-file-pdf" style={{ color:'var(--brand)', fontSize:11 }}/>{d.nome.length>24?d.nome.slice(0,24)+'…':d.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>{t.close}</button>
              <button className="btn btn-primary" onClick={() => { openForm(detail); setDetail(null); }}><i className="fas fa-pen"/>{t.edit}</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {modal === 'form' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth:640 }}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? t.editPolicy : `${t.newPolicy} — ${t.aptInsurancePage}`}</div>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">{t.insurer} <span style={{ color:'var(--red)' }}>*</span></label>
                  <input className="form-input" value={form.seguradora||''} onChange={e=>setForm(f=>({...f,seguradora:e.target.value}))} placeholder="Ex: Allianz"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.product}</label>
                  <input className="form-input" value={form.produto||''} onChange={e=>setForm(f=>({...f,produto:e.target.value}))}/>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">{t.propertyAddress}</label>
                  <input className="form-input" value={form.imovel||''} onChange={e=>setForm(f=>({...f,imovel:e.target.value}))} placeholder="Rua, número, apto"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.city}</label>
                  <input className="form-input" value={form.cidade||''} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.state}</label>
                  <input className="form-input" value={form.estado||''} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} placeholder="SP / FL"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.pais}</label>
                  <select className="form-select" value={form.pais||'BR'} onChange={e=>setForm(f=>({...f,pais:e.target.value}))}>
                    {PAISES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.propertyType}</label>
                  <select className="form-select" value={form.tipo_imovel||'Apartamento'} onChange={e=>setForm(f=>({...f,tipo_imovel:e.target.value}))}>
                    {TIPOS_IMOVEL.map(ti=><option key={ti}>{ti}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.propertyArea}</label>
                  <input className="form-input" type="number" value={form.area_m2||''} onChange={e=>setForm(f=>({...f,area_m2:Number(e.target.value)}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.insured}</label>
                  <input className="form-input" value={form.segurado||''} onChange={e=>setForm(f=>({...f,segurado:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.policyNumber}</label>
                  <input className="form-input" value={form.apolice||''} onChange={e=>setForm(f=>({...f,apolice:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.status}</label>
                  <select className="form-select" value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.propertyValue}</label>
                  <input className="form-input" value={form.valor_imovel||''} onChange={e=>setForm(f=>({...f,valor_imovel:e.target.value}))} placeholder="4.500.000"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.contentValue}</label>
                  <input className="form-input" value={form.valor_conteudo||''} onChange={e=>setForm(f=>({...f,valor_conteudo:e.target.value}))} placeholder="800.000"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.moeda}</label>
                  <select className="form-select" value={form.moeda||'BRL'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.deductible}</label>
                  <input className="form-input" value={form.franquia||''} onChange={e=>setForm(f=>({...f,franquia:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.monthlyPremiumIns}</label>
                  <input className="form-input" value={form.premio_mensal||''} onChange={e=>setForm(f=>({...f,premio_mensal:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.annualPremium}</label>
                  <input className="form-input" value={form.premio_anual||''} onChange={e=>setForm(f=>({...f,premio_anual:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.validityStart}</label>
                  <input className="form-input" type="date" value={form.inicio||''} onChange={e=>setForm(f=>({...f,inicio:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.validityEnd}</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">{t.insurerContact}</label>
                  <input className="form-input" value={form.seguradora_contato||''} onChange={e=>setForm(f=>({...f,seguradora_contato:e.target.value}))}/>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1', display:'flex', gap:20, flexWrap:'wrap' }}>
                  {[
                    ['cobertura_incendio','fa-fire',t.fireCoverageApt],
                    ['cobertura_roubo','fa-user-ninja',t.theftCoverageApt],
                    ['cobertura_rcf','fa-scale-balanced',t.civilLiability],
                    ['cobertura_danos_eletricos','fa-bolt',t.electricDamage],
                    ['cobertura_quebra_vidros','fa-window-restore',t.glassCoverage],
                    ['cobertura_vendaval','fa-wind',t.windstormCoverage],
                    ['renovacao_auto','fa-rotate',t.autoRenewal],
                  ].map(([key,icon,lbl]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{ width:14,height:14 }}/>
                      <i className={`fas ${icon}`} style={{ color:'var(--brand)', fontSize:12 }}/> {lbl}
                    </label>
                  ))}
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">{t.notes}</label>
                  <textarea className="form-textarea" rows={2} value={form.obs||''} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}/>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Documentos</label>
                  <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile}/>
                  <button type="button" className="btn btn-secondary" onClick={()=>fileRef.current?.click()}><i className="fas fa-paperclip"/>{t.attach}</button>
                  {(form.docs||[]).length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                      {form.docs.map((d,i)=>(
                        <span key={i} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--surface-hover)', borderRadius:6, padding:'3px 9px', fontSize:11 }}>
                          <i className="fas fa-file" style={{ color:'var(--brand)', fontSize:10 }}/>{d.nome.length>22?d.nome.slice(0,22)+'…':d.nome}
                          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', padding:0, marginLeft:2, fontSize:11 }} onClick={()=>setForm(f=>({...f,docs:f.docs.filter((_,j)=>j!==i)}))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
