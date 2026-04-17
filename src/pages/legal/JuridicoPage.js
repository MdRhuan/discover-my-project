// ── Juridico Page ───────────────────────────────────────────
function JuridicoPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const ANOS = ['2020','2021','2022','2023','2024','2025','2026'];
  const SUBCATS = [
    { key: 'Mútuo / Intercompany', icon: 'fa-arrows-left-right', color: 'green',  label: 'Mútuo / Intercompany' },
    { key: 'Contratos',            icon: 'fa-file-signature',    color: 'blue',   label: 'Contratos'            },
    { key: 'Societário',           icon: 'fa-building',          color: 'brand',  label: 'Societário'           },
    { key: 'Compliance',           icon: 'fa-shield-halved',     color: 'yellow', label: 'Compliance'           },
  ];
  const COLOR_VAR = { green:'var(--green)', blue:'var(--blue)', brand:'var(--brand)', yellow:'var(--yellow)' };
  const COLOR_BG  = { green:'rgba(34,197,94,.12)', blue:'rgba(59,130,246,.12)', brand:'var(--brand-dim)', yellow:'rgba(245,158,11,.12)' };
  const STATUS_MAP = { ativo:{badge:'brand',label:t.statusActive}, entregue:{badge:'green',label:t.statusDone}, pendente:{badge:'yellow',label:t.statusPending}, vencido:{badge:'red',label:t.statusOverdue} };

  const load = useCallback(async () => {
    const all = await db.fiscalDocs.toArray();
    setRows(all.filter(r => SUBCATS.some(s => s.key === r.subcategoria)));
  }, []);
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (!filterSub || r.subcategoria === filterSub) &&
    (!filterAno || String(r.ano) === filterAno) &&
    (!search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase()))
  );

  function openNew() {
    setForm({ subcategoria: filterSub || 'Mútuo / Intercompany', jurisdicao: 'BR/US', tipo: 'PDF', status: 'ativo', ano: new Date().getFullYear().toString(), dataUpload: new Date().toISOString().slice(0,10) });
    setModal('form');
  }
  function openEdit(r) { setForm({...r}); setModal('form'); }

  function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({...f, nome: f.nome||file.name, tamanho: file.size/1024>1024?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB', tipo: file.name.split('.').pop().toUpperCase(), conteudo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  }

  function handleDownload(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.','error'); return; }
    const a = document.createElement('a'); a.href=r.conteudo; a.download=r.nome||'doc'; a.click();
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.','error'); return; }
    if (form.id) await db.fiscalDocs.update(form.id, form);
    else await db.fiscalDocs.add(form);
    toast(t.saved,'success'); setModal(null); load();
  }

  async function handleDelete(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      await db.fiscalDocs.delete(id);
      toast(t.deleted,'success'); setConfirm(null); load();
    }});
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.juridicoPage}</div>
          <div className="page-header-sub">{rows.length} documento{rows.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newCase}</button>
      </div>

      {/* Category cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:20}}>
        {SUBCATS.map(s => {
          const count = rows.filter(r=>r.subcategoria===s.key).length;
          return (
            <button key={s.key} onClick={()=>setFilterSub(filterSub===s.key?'':s.key)}
              style={{display:'flex',alignItems:'center',gap:12,textAlign:'left',background:filterSub===s.key?'var(--surface-hover)':'var(--surface-card)',border:`1px solid ${filterSub===s.key?'var(--brand)':'var(--surface-border)'}`,borderRadius:12,padding:'12px 14px',cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:COLOR_BG[s.color]}}>
                <i className={`fas ${s.icon}`} style={{fontSize:15,color:COLOR_VAR[s.color]}}/>
              </div>
              <div>
                <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:12,lineHeight:1.3}}>{s.label}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{count} doc{count!==1?'s':''}</div>
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
            <input placeholder="Buscar documento..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{maxWidth:210}} value={filterSub} onChange={e=>setFilterSub(e.target.value)}>
            <option value="">Todas as categorias</option>
            {SUBCATS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:160}} value={filterAno} onChange={e=>setFilterAno(e.target.value)}>
            <option value="">Todos os anos</option>
            {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {(search||filterSub||filterAno) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{setSearch('');setFilterSub('');setFilterAno('');}}>
              <i className="fas fa-xmark"/>Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-gavel"/><p>{t.noCases}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.category}</th>
                  <th>{t.court}</th>
                  <th>{t.date}</th>
                  <th>{t.responsible}</th>
                  <th>{t.dueDate}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.ativo;
                  const sub = SUBCATS.find(s=>s.key===r.subcategoria);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{fontWeight:600,fontSize:13}}>{r.nome}</div>
                        {r.tipo && <span style={{fontSize:10,color:'var(--text-muted)',background:'var(--surface-hover)',borderRadius:4,padding:'1px 6px',display:'inline-block',marginTop:2}}>{r.tipo}</span>}
                      </td>
                      <td>{sub && <span style={{fontSize:11,color:COLOR_VAR[sub.color],fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}><i className={`fas ${sub.icon}`} style={{fontSize:10}}/>{r.subcategoria}</span>}</td>
                      <td>{r.jurisdicao||'—'}</td>
                      <td>{r.ano||'—'}</td>
                      <td>{r.responsavel||'—'}</td>
                      <td>{r.vencimento ? fmt.date(r.vencimento, lang) : '—'}</td>
                      <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {r.conteudo && <button className="btn-icon" title="Download" onClick={()=>handleDownload(r)}><i className="fas fa-download"/></button>}
                          <button className="btn-icon" title={t.edit} onClick={()=>openEdit(r)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon danger" title={t.delete} onClick={()=>handleDelete(r.id)}><i className="fas fa-trash"/></button>
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

      {/* Modal */}
      {modal === 'form' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? t.editCase : t.newCase}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome do Documento <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Contrato de Mútuo — Meridian BR"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.category}</label>
                  <select className="form-select" value={form.subcategoria||'Mútuo / Intercompany'} onChange={e=>setForm(f=>({...f,subcategoria:e.target.value}))}>
                    {SUBCATS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jurisdição</label>
                  <select className="form-select" value={form.jurisdicao||'BR/US'} onChange={e=>setForm(f=>({...f,jurisdicao:e.target.value}))}>
                    {['BR','US','BR/US'].map(j=><option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano</label>
                  <select className="form-select" value={form.ano||''} onChange={e=>setForm(f=>({...f,ano:e.target.value}))}>
                    {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.status}</label>
                  <select className="form-select" value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <input className="form-input" value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Ex: Advogado, Baker McKenzie"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dueDate}</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.description}</label>
                  <textarea className="form-textarea" rows={2} value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Arquivo</label>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileChange}/>
                  <button type="button" className="btn btn-secondary" onClick={()=>fileRef.current?.click()}>
                    <i className="fas fa-paperclip"/>{form.conteudo ? 'Trocar arquivo' : 'Anexar arquivo'}
                  </button>
                  {form.nome && <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:10}}>{form.nome}</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
