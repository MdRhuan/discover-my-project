function RealEstatePage() {
  const { t, lang, toast } = useApp();
  const [imoveis, setImoveis] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const today = new Date().toISOString().slice(0,10);
  const in90  = new Date(Date.now() + 90*86400000).toISOString().slice(0,10);
  const in30  = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);

  const DEFAULT_IMOVEIS_LOCAL = [
    { id:1, endereco:'Casa Miami Beach — 123 Ocean Dr, Miami, FL', proprietario:'Eduardo & Carla', pais:'US', moeda:'USD', vl_aquisicao:'850000', dt_aquisicao:'2022-11-30', vl_mercado:'1100000', credor:'Wells Fargo', saldo_devedor:'620000', parcela:'4200', venc_mortgage:'2052-11-30', dt_property_tax:'2025-04-01', dt_insurance:'2025-11-30', docs:[] },
    { id:2, endereco:'Apartamento São Paulo — Rua Oscar Freire 500, Apto 82, SP', proprietario:'Eduardo', pais:'BR', moeda:'BRL', vl_aquisicao:'2400000', dt_aquisicao:'2019-07-15', vl_mercado:'3200000', credor:'Itaú', saldo_devedor:'980000', parcela:'9800', venc_mortgage:'2039-07-15', dt_property_tax:'', dt_insurance:'2025-07-15', docs:[] },
  ];

  const load = useCallback(async () => {
    const [emps, cfgIm] = await Promise.all([db.empresas.toArray(), db.config.get('imoveis')]);
    setEmpresas(emps);
    setImoveis(cfgIm?.value || DEFAULT_IMOVEIS_LOCAL);
  }, []);
  useEffect(() => { load(); }, []);

  function alertColor(venc) {
    if (!venc) return null;
    if (venc < today)  return 'var(--red)';
    if (venc <= in30)  return 'var(--yellow)';
    if (venc <= in90)  return 'var(--orange)';
    return null;
  }

  function download(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.','error'); return; }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nome || 'doc'; a.click();
  }

  function openImovel(r) {
    setForm(r ? {...r} : { id: Date.now(), proprietario:'Eduardo', vl_aquisicao:'', dt_aquisicao:'', vl_mercado:'', credor:'', saldo_devedor:'', parcela:'', venc_mortgage:'', docs:[] });
    setModal('imovel');
  }
  async function saveImovel() {
    if (!form.endereco?.trim()) { toast('Endereço obrigatório.','error'); return; }
    const updated = imoveis.find(i=>i.id===form.id) ? imoveis.map(i=>i.id===form.id?form:i) : [...imoveis, form];
    await db.config.put({ chave:'imoveis', value: updated });
    toast(t.saved,'success'); setModal(null); load();
  }
  function deleteImovel(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const updated = imoveis.filter(i=>i.id!==id);
      await db.config.put({ chave:'imoveis', value: updated });
      toast(t.deleted,'success'); setConfirm(null); load();
    }});
  }

  function ImovelDocRow({ doc }) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-hover)',borderRadius:7,padding:'7px 10px',marginBottom:4}}>
        <i className="fas fa-file-pdf" style={{color:'var(--red)',fontSize:12,flexShrink:0}}/>
        <span style={{flex:1,fontSize:12,color:'var(--text-primary)'}}>{doc.nome}</span>
        {doc.conteudo && <button className="btn-icon" style={{padding:3}} onClick={()=>download(doc)}><i className="fas fa-download" style={{fontSize:10}}/></button>}
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.realEstatePage}</div>
          <div className="page-header-sub">{imoveis.length} imóvel{imoveis.length!==1?'is':''} cadastrado{imoveis.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-primary" onClick={()=>openImovel(null)}><i className="fas fa-plus"/>{t.newProperty}</button>
      </div>

      {imoveis.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-house"/><p>{t.noProperties}</p></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {imoveis.map(im => {
            const taxAlert = im.dt_property_tax && alertColor(im.dt_property_tax);
            const insAlert = im.dt_insurance    && alertColor(im.dt_insurance);
            return (
              <div key={im.id} className="card">
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:42,height:42,borderRadius:10,background:'var(--brand-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <i className="fas fa-house" style={{fontSize:18,color:'var(--brand)'}}/>
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>{im.endereco || 'Imóvel sem endereço'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{im.proprietario} · {im.pais||''}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-secondary" style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openImovel(im)}><i className="fas fa-pen"/>{t.edit}</button>
                    <button className="btn-icon danger" onClick={()=>deleteImovel(im.id)}><i className="fas fa-trash"/></button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'8px 20px',fontSize:12,marginBottom:14}}>
                  {[
                    { label: t.owner,              val: im.proprietario },
                    { label: t.acquisitionValue,   val: im.vl_aquisicao ? fmt.currency(Number(im.vl_aquisicao), im.moeda||'BRL', lang) : '—' },
                    { label: t.acquisitionDate,    val: fmt.date(im.dt_aquisicao, lang) },
                    { label: t.marketValue,        val: im.vl_mercado ? fmt.currency(Number(im.vl_mercado), im.moeda||'BRL', lang) : '—' },
                    { label: t.lender,             val: im.credor||'—' },
                    { label: t.outstandingBalance, val: im.saldo_devedor ? fmt.currency(Number(im.saldo_devedor), im.moeda||'BRL', lang) : '—' },
                    { label: t.installment,        val: im.parcela ? fmt.currency(Number(im.parcela), im.moeda||'BRL', lang) : '—' },
                    { label: t.mortgageExpiry,     val: fmt.date(im.venc_mortgage, lang) },
                  ].map(({label,val}) => (
                    <div key={label}>
                      <div style={{color:'var(--text-muted)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
                      <div style={{color:'var(--text-primary)',fontWeight:500,marginTop:1}}>{val||'—'}</div>
                    </div>
                  ))}
                </div>
                {(taxAlert||insAlert) && (
                  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                    {taxAlert && <span style={{fontSize:11,color:taxAlert,fontWeight:600,background:taxAlert+'18',borderRadius:6,padding:'3px 10px'}}><i className="fas fa-triangle-exclamation" style={{marginRight:4}}/>Property Tax: {fmt.date(im.dt_property_tax,lang)}</span>}
                    {insAlert && <span style={{fontSize:11,color:insAlert,fontWeight:600,background:insAlert+'18',borderRadius:6,padding:'3px 10px'}}><i className="fas fa-shield-halved" style={{marginRight:4}}/>{t.insuranceExpiry}: {fmt.date(im.dt_insurance,lang)}</span>}
                  </div>
                )}
                {(im.docs||[]).length > 0 && (
                  <div>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:6}}>Documentos</div>
                    {(im.docs||[]).map((d,i)=><ImovelDocRow key={i} doc={d}/>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal imóvel */}
      {modal === 'imovel' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:700}}>
            <div className="modal-header">
              <div className="modal-title">{form.id && imoveis.find(i=>i.id===form.id) ? t.editProperty : t.newProperty}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.propertyAddressLbl} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.endereco||''} onChange={e=>setForm(f=>({...f,endereco:e.target.value}))} placeholder="Ex: 123 Ocean Dr, Miami Beach, FL 33139"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.owner}</label>
                  <select className="form-select" value={form.proprietario||'Eduardo'} onChange={e=>setForm(f=>({...f,proprietario:e.target.value}))}>
                    {['Eduardo','Carla','Eduardo & Carla',...empresas.map(e=>e.nome)].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.pais}</label>
                  <select className="form-select" value={form.pais||'BR'} onChange={e=>setForm(f=>({...f,pais:e.target.value}))}>
                    <option value="BR">Brasil</option><option value="US">EUA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.moeda}</label>
                  <select className="form-select" value={form.moeda||'BRL'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="BRL">BRL</option><option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.acquisitionValue}</label>
                  <input className="form-input" type="number" value={form.vl_aquisicao||''} onChange={e=>setForm(f=>({...f,vl_aquisicao:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.acquisitionDate}</label>
                  <input className="form-input" type="date" value={form.dt_aquisicao||''} onChange={e=>setForm(f=>({...f,dt_aquisicao:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.marketValue}</label>
                  <input className="form-input" type="number" value={form.vl_mercado||''} onChange={e=>setForm(f=>({...f,vl_mercado:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><div style={{borderTop:'1px solid var(--surface-border)',paddingTop:12,marginTop:4,fontWeight:600,fontSize:12,color:'var(--text-muted)',textTransform:'uppercase'}}>Financiamento</div></div>
                <div className="form-group">
                  <label className="form-label">{t.lender}</label>
                  <input className="form-input" value={form.credor||''} onChange={e=>setForm(f=>({...f,credor:e.target.value}))} placeholder="Ex: Wells Fargo, Itaú"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.outstandingBalance}</label>
                  <input className="form-input" type="number" value={form.saldo_devedor||''} onChange={e=>setForm(f=>({...f,saldo_devedor:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.installment}</label>
                  <input className="form-input" type="number" value={form.parcela||''} onChange={e=>setForm(f=>({...f,parcela:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.mortgageExpiry}</label>
                  <input className="form-input" type="date" value={form.venc_mortgage||''} onChange={e=>setForm(f=>({...f,venc_mortgage:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><div style={{borderTop:'1px solid var(--surface-border)',paddingTop:12,marginTop:4,fontWeight:600,fontSize:12,color:'var(--text-muted)',textTransform:'uppercase'}}>Alertas</div></div>
                <div className="form-group">
                  <label className="form-label">{t.propertyTaxDate}</label>
                  <input className="form-input" type="date" value={form.dt_property_tax||''} onChange={e=>setForm(f=>({...f,dt_property_tax:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.insuranceExpiry}</label>
                  <input className="form-input" type="date" value={form.dt_insurance||''} onChange={e=>setForm(f=>({...f,dt_insurance:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <div style={{borderTop:'1px solid var(--surface-border)',paddingTop:12,marginTop:4,marginBottom:12,fontWeight:600,fontSize:12,color:'var(--text-muted)',textTransform:'uppercase'}}>Documentos</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                    {['Deed','Mortgage Agreement','Title Insurance','Tax Assessment','Outro'].map(tipo => (
                      <button key={tipo} type="button" className="btn btn-secondary" style={{fontSize:11,padding:'4px 12px'}}
                        onClick={()=>{
                          const inp = document.createElement('input'); inp.type='file';
                          inp.onchange = e => {
                            const file = e.target.files[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setForm(f=>({...f,docs:[...(f.docs||[]),{nome:file.name,tipo_doc:tipo,tamanho:file.size/1024>1024?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB',tipo:file.name.split('.').pop().toUpperCase(),conteudo:ev.target.result}]}));
                            };
                            reader.readAsDataURL(file);
                          };
                          inp.click();
                        }}
                      ><i className="fas fa-paperclip" style={{marginRight:5}}/>{tipo}</button>
                    ))}
                  </div>
                  {(form.docs||[]).length === 0
                    ? <div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhum documento anexado.</div>
                    : <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        {(form.docs||[]).map((d,i) => (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-hover)',borderRadius:7,padding:'7px 12px'}}>
                            <i className={`fas fa-file-${d.tipo==='PDF'?'pdf':d.tipo==='XLSX'?'excel':'alt'}`} style={{color:'var(--brand)',fontSize:13,flexShrink:0}}/>
                            <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0,background:'var(--surface-border)',borderRadius:4,padding:'1px 6px'}}>{d.tipo_doc}</span>
                            <span style={{flex:1,fontSize:12,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.nome}</span>
                            <span style={{fontSize:10,color:'var(--text-muted)',flexShrink:0}}>{d.tamanho}</span>
                            {d.conteudo && <button type="button" style={{background:'none',border:'none',color:'var(--brand)',cursor:'pointer',padding:3}} onClick={()=>download(d)}><i className="fas fa-download" style={{fontSize:11}}/></button>}
                            <button type="button" style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',padding:3}} onClick={()=>setForm(f=>({...f,docs:(f.docs||[]).filter((_,j)=>j!==i)}))}><i className="fas fa-xmark" style={{fontSize:11}}/></button>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveImovel}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
