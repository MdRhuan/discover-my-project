// ── Valuations Page ─────────────────────────────────────────
function ValuationsPage() {
  const { t, lang, toast } = useApp();
  const [valuations, setValuations] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const DEFAULT_VALUATIONS_LOCAL = [
    { id:1, empresaId:'1', data:'2024-01-20', metodo:'DCF', valor:'28.000.000', proposito:'Gestão', responsavel:'Deloitte', notas:'Múltiplo EBITDA 8x — crescimento projetado 22% a.a.', historico:[{data:'2022-06-01',valor:'18.000.000'},{data:'2023-01-15',valor:'23.000.000'}], docs:[] },
    { id:2, empresaId:'3', data:'2023-09-10', metodo:'Múltiplos de Mercado', valor:'45.000.000', proposito:'Transação', responsavel:'Ernst & Young', notas:'Análise para potencial M&A', historico:[{data:'2021-03-01',valor:'31.000.000'}], docs:[] },
  ];

  const load = useCallback(async () => {
    const [emps, cfgVa] = await Promise.all([db.empresas.toArray(), db.config.get('valuations')]);
    setEmpresas(emps);
    setValuations(cfgVa?.value || DEFAULT_VALUATIONS_LOCAL);
  }, []);
  useEffect(() => { load(); }, []);

  function download(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.','error'); return; }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nome || r.nomeArq || 'doc'; a.click();
  }

  function openValuation(r) {
    setForm(r ? {...r} : { id: Date.now(), empresaId:'', data:'', metodo:'DCF', valor:'', proposito:'Gestão', responsavel:'', notas:'', historico:[], docs:[] });
    setModal('valuation');
  }
  async function saveValuation() {
    const updated = valuations.find(v=>v.id===form.id) ? valuations.map(v=>v.id===form.id?form:v) : [...valuations, form];
    await db.config.put({ chave:'valuations', value: updated });
    toast(t.saved,'success'); setModal(null); load();
  }
  function deleteValuation(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const updated = valuations.filter(v=>v.id!==id);
      await db.config.put({ chave:'valuations', value: updated });
      toast(t.deleted,'success'); setConfirm(null); load();
    }});
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Valuations</div>
          <div className="page-header-sub">{valuations.length} valuation{valuations.length!==1?'s':''} registrado{valuations.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-primary" onClick={()=>openValuation(null)}><i className="fas fa-plus"/>Novo Valuation</button>
      </div>

      {valuations.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-chart-line"/><p>Nenhum valuation cadastrado.</p></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {valuations.map(v => {
            const emp = empresas.find(e=>String(e.id)===String(v.empresaId));
            return (
              <div key={v.id} className="card">
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{emp?.nome||v.entidade||'Entidade não vinculada'}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{v.metodo} · {fmt.date(v.data,lang)} · {v.proposito}</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <div style={{fontSize:18,fontWeight:800,color:'var(--green)'}}>{v.valor ? fmt.currency(Number(v.valor.replace(/[^\d.]/g,'')||v.valor), 'BRL', lang) : '—'}</div>
                    <button className="btn btn-secondary" style={{fontSize:11,padding:'5px 12px'}} onClick={()=>openValuation(v)}><i className="fas fa-pen"/>Editar</button>
                    <button className="btn-icon danger" title="Excluir" onClick={()=>deleteValuation(v.id)}><i className="fas fa-trash"/></button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'6px 20px',fontSize:12}}>
                  {[
                    { label:'Método',       val: v.metodo },
                    { label:'Data',         val: fmt.date(v.data, lang) },
                    { label:'Propósito',    val: v.proposito },
                    { label:'Responsável',  val: v.responsavel||'—' },
                  ].map(({label,val})=>(
                    <div key={label}>
                      <div style={{color:'var(--text-muted)',fontSize:10,textTransform:'uppercase'}}>{label}</div>
                      <div style={{color:'var(--text-primary)',fontWeight:500,marginTop:1}}>{val||'—'}</div>
                    </div>
                  ))}
                </div>
                {v.notas && <div style={{marginTop:10,fontSize:12,color:'var(--text-secondary)',background:'var(--surface-hover)',borderRadius:8,padding:'8px 12px'}}>{v.notas}</div>}
                {(v.historico||[]).length > 0 && (
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:6}}>Histórico</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {v.historico.map((h,i) => (
                        <div key={i} style={{background:'var(--surface-hover)',borderRadius:8,padding:'6px 12px',fontSize:11}}>
                          <div style={{color:'var(--text-muted)'}}>{fmt.date(h.data,lang)}</div>
                          <div style={{color:'var(--text-primary)',fontWeight:600}}>{h.valor}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(v.docs||[]).length > 0 && (
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:6}}>Documentos</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {(v.docs||[]).map((d,i) => (
                        <button key={i} type="button" onClick={()=>download(d)}
                          style={{display:'flex',alignItems:'center',gap:5,background:'var(--surface-hover)',border:'1px solid var(--surface-border)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,color:'var(--text-secondary)'}}>
                          <i className={`fas fa-file-${d.tipo==='PDF'?'pdf':d.tipo==='XLSX'?'excel':'alt'}`} style={{color:'var(--brand)',fontSize:10}}/>
                          {d.nome.length>28?d.nome.slice(0,28)+'…':d.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Valuation modal */}
      {modal === 'valuation' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">{form.id && valuations.find(v=>v.id===form.id) ? 'Editar Valuation' : 'Novo Valuation'}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Entidade</label>
                  <select className="form-select" value={form.empresaId||''} onChange={e=>setForm(f=>({...f,empresaId:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data do Valuation</label>
                  <input className="form-input" type="date" value={form.data||''} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Método</label>
                  <select className="form-select" value={form.metodo||'DCF'} onChange={e=>setForm(f=>({...f,metodo:e.target.value}))}>
                    {['DCF','Múltiplos de Mercado','Patrimônio Líquido','Book Value','Transações Comparáveis','Outro'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$ ou US$)</label>
                  <input className="form-input" value={form.valor||''} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="Ex: 5.000.000"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Propósito</label>
                  <select className="form-select" value={form.proposito||'Gestão'} onChange={e=>setForm(f=>({...f,proposito:e.target.value}))}>
                    {['Gestão','Transação','Fiscal','Planejamento Sucessório','Outro'].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assessor Responsável</label>
                  <input className="form-input" value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Ex: Deloitte, Ernst & Young"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Observações</label>
                  <textarea className="form-textarea" rows={2} value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    Documentos (Laudo, Metodologia)
                    <button type="button" className="btn btn-secondary" style={{fontSize:11,padding:'3px 10px'}}
                      onClick={()=>{
                        const inp = document.createElement('input');
                        inp.type = 'file';
                        inp.onchange = e => {
                          const file = e.target.files[0]; if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const doc = {
                              nome: file.name,
                              tamanho: file.size/1024>1024?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB',
                              tipo: file.name.split('.').pop().toUpperCase(),
                              conteudo: ev.target.result,
                            };
                            setForm(f => ({ ...f, docs: [...(f.docs||[]), doc] }));
                          };
                          reader.readAsDataURL(file);
                        };
                        inp.click();
                      }}
                    ><i className="fas fa-paperclip"/>Anexar</button>
                  </label>
                  {(form.docs||[]).length === 0
                    ? <div style={{fontSize:12,color:'var(--text-muted)',padding:'8px 0'}}>Nenhum documento anexado.</div>
                    : <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:4}}>
                        {(form.docs||[]).map((d,i) => (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-hover)',borderRadius:7,padding:'7px 12px'}}>
                            <i className={`fas fa-file-${d.tipo==='PDF'?'pdf':d.tipo==='XLSX'?'excel':'alt'}`} style={{color:'var(--brand)',fontSize:13,flexShrink:0}}/>
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
              <button className="btn btn-primary" onClick={saveValuation}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
