// ── Fiscal & Tax ─────────────────────────────────────────────
function FiscalTaxPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterJur, setFilterJur] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const SUBCATS = [
    { key: 'IRS Filings',             icon: 'fa-building-columns',  color: 'brand'  },
    { key: 'IR Brasil',               icon: 'fa-landmark',          color: 'yellow' },
  ];

  const STATUS_MAP = {
    ativo:     { badge: 'brand',  label: t.statusActive    },
    entregue:  { badge: 'green',  label: t.statusDelivered },
    pendente:  { badge: 'yellow', label: t.statusPending   },
    vencido:   { badge: 'red',    label: t.statusOverdue   },
  };

  const load = useCallback(async () => {
    setRows(await db.fiscalDocs.toArray());
  }, []);
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (!filterSub || r.subcategoria === filterSub) &&
    (!filterJur || r.jurisdicao === filterJur) &&
    (!filterAno || String(r.ano) === filterAno) &&
    (r.nome?.toLowerCase().includes(search.toLowerCase()) ||
     r.descricao?.toLowerCase().includes(search.toLowerCase()) ||
     r.subcategoria?.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = SUBCATS.map(s => ({
    ...s,
    count: rows.filter(r => r.subcategoria === s.key).length,
    pending: rows.filter(r => r.subcategoria === s.key && r.status === 'pendente').length,
  }));

  const today = new Date().toISOString().slice(0,10);
  const in60  = new Date(Date.now() + 60*86400000).toISOString().slice(0,10);

  function openNew() {
    setForm({ subcategoria: filterSub || 'Tax Planning (US)', jurisdicao: 'US', tipo: 'PDF', status: 'ativo', ano: new Date().getFullYear().toString(), dataUpload: new Date().toISOString().slice(0,10) });
    setModal('form');
  }
  function openEdit(r) { setForm({...r}); setModal('form'); }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({
        ...f,
        nome: f.nome || file.name,
        tamanho: file.size / 1024 > 1024 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB',
        tipo: file.name.split('.').pop().toUpperCase(),
        mimeType: file.type,
        conteudo: ev.target.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleDownload(r) {
    if (!r.conteudo) { toast(t.fileNotAvailable, 'error'); return; }
    const a = document.createElement('a');
    a.href = r.conteudo;
    a.download = r.nome || 'documento';
    a.click();
  }

  async function handleSave() {
    try {
      if (form.id) await db.fiscalDocs.update(form.id, form);
      else await db.fiscalDocs.add(form);
      await db.auditLog.add({ acao: `Fiscal doc ${form.id?'atualizado':'adicionado'}: ${form.nome}`, modulo: 'Fiscal & Tax', timestamp: new Date().toISOString() });
      toast(t.saved, 'success'); setModal(null); load();
    } catch { toast(t.errorSave, 'error'); }
  }

  async function handleDelete(id, nome) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      await db.fiscalDocs.delete(id);
      toast(t.deleted, 'success'); setConfirm(null); load();
    }});
  }

  const COLOR_VAR = { brand:'var(--brand)', blue:'var(--blue)', green:'var(--green)', yellow:'var(--yellow)', red:'var(--red)' };
  const COLOR_BG  = { brand:'var(--brand-dim)', blue:'rgba(59,130,246,.12)', green:'rgba(34,197,94,.12)', yellow:'rgba(245,158,11,.12)', red:'rgba(239,68,68,.12)' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Fiscal & Tax</div>
          <div className="page-header-sub">{rows.length} {t.documentsInRepo}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newDocumentBtn}</button>
      </div>

      {/* Subcategory cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,marginBottom:24}}>
        {grouped.map(s => (
          <button
            key={s.key}
            onClick={() => setFilterSub(filterSub === s.key ? '' : s.key)}
            style={{
              display:'flex', alignItems:'center', gap:12, textAlign:'left',
              background: filterSub===s.key ? 'var(--surface-hover)' : 'var(--surface-card)',
              border: `1px solid ${filterSub===s.key ? 'var(--brand)' : 'var(--surface-border)'}`,
              borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all .15s',
            }}
          >
            <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:COLOR_BG[s.color]}}>
              <i className={`fas ${s.icon}`} style={{fontSize:15,color:COLOR_VAR[s.color]}}/>
            </div>
            <div>
              <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:12,lineHeight:1.3}}>{s.key}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                {s.count} doc{s.count!==1?'s':''}
                {s.pending>0 && <span style={{color:'var(--yellow)',marginLeft:6}}><i className="fas fa-clock" style={{fontSize:9}}/> {s.pending} pend.</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}>
            <i className="fas fa-search"/>
            <input placeholder={t.searchDocument} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{maxWidth:220}} value={filterSub} onChange={e=>setFilterSub(e.target.value)}>
            <option value="">{t.allCategories}</option>
            {SUBCATS.map(s=><option key={s.key} value={s.key}>{s.key}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:140}} value={filterJur} onChange={e=>setFilterJur(e.target.value)}>
            <option value="">{t.jurisdiction}</option>
            {['US','BR','BR/US'].map(j=><option key={j} value={j}>{j}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:150}} value={filterAno} onChange={e=>setFilterAno(e.target.value)}>
            <option value="">{t.allYears}</option>
            {['2020','2021','2022','2023','2024','2025','2026'].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          {(filterSub||filterJur||filterAno||search) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{ setFilterSub(''); setFilterJur(''); setFilterAno(''); setSearch(''); }}>
              <i className="fas fa-xmark"/>{t.clearFilters}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-receipt"/><p>{t.noDocumentsFound}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.documentLabel}</th>
                  <th>{t.categoryLabel}</th>
                  <th>{t.jurisdiction}</th>
                  <th>{t.yearLabel}</th>
                  <th>{t.responsibleLabel}</th>
                  <th>{t.dueDateLabel}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sub   = SUBCATS.find(s=>s.key===r.subcategoria) || SUBCATS[0];
                  const sm    = STATUS_MAP[r.status] || { badge:'brand', label: r.status||'—' };
                  const isExpiring = r.vencimento && r.vencimento <= in60 && r.vencimento >= today;
                  const isExpired  = r.vencimento && r.vencimento < today;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:8,background:COLOR_BG[sub.color],display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <i className={`fas ${sub.icon}`} style={{color:COLOR_VAR[sub.color],fontSize:13}}/>
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'var(--text-primary)',fontSize:13}}>{r.nome}</div>
                            <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.tamanho||'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:160}}>{r.subcategoria}</td>
                      <td>
                        <span className={`badge badge-${r.jurisdicao==='US'?'blue':r.jurisdicao==='BR'?'green':'brand'}`} style={{fontSize:10}}>
                          {r.jurisdicao||'—'}
                        </span>
                      </td>
                      <td style={{fontSize:12,color:'var(--text-secondary)'}}>{r.ano||'—'}</td>
                      <td style={{fontSize:12}}>{r.responsavel||'—'}</td>
                      <td>
                        {r.vencimento ? (
                          <span style={{fontSize:12,color:isExpired?'var(--red)':isExpiring?'var(--yellow)':'var(--text-secondary)',fontWeight:(isExpired||isExpiring)?700:400}}>
                            {isExpired && <i className="fas fa-circle-exclamation" style={{marginRight:4}}/>}
                            {isExpiring && !isExpired && <i className="fas fa-clock" style={{marginRight:4}}/>}
                            {fmt.date(r.vencimento, lang)}
                          </span>
                        ) : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}
                      </td>
                      <td><span className={`badge badge-${sm.badge}`}>{sm.label}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          {r.conteudo && <button className="btn-icon" title={t.download} onClick={()=>handleDownload(r)}><i className="fas fa-download"/></button>}
                          <button className="btn-icon" title={t.edit} onClick={()=>openEdit(r)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon danger" title={t.delete} onClick={()=>handleDelete(r.id, r.nome)}><i className="fas fa-trash"/></button>
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
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? t.editDocumentTax : t.newFiscalDocument}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.documentNameLabel} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Form 1040 — 2024"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.categoryLabel}</label>
                  <select className="form-select" value={form.subcategoria||''} onChange={e=>setForm(f=>({...f,subcategoria:e.target.value}))}>
                    {SUBCATS.map(s=><option key={s.key} value={s.key}>{s.key}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.jurisdiction}</label>
                  <select className="form-select" value={form.jurisdicao||''} onChange={e=>setForm(f=>({...f,jurisdicao:e.target.value}))}>
                    {['US','BR','BR/US'].map(j=><option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.referenceYear}</label>
                  <input className="form-input" value={form.ano||''} onChange={e=>setForm(f=>({...f,ano:e.target.value}))} placeholder="2024"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.status}</label>
                  <select className="form-select" value={form.status||''} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([v,s])=><option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.responsibleLabel}</label>
                  <input className="form-input" value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Ex: CPA, Contador..."/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.type}</label>
                  <select className="form-select" value={form.tipo||''} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    {['PDF','XLSX','DOC','DOCX','Outro'].map(tp=><option key={tp} value={tp}>{tp==='Outro'?t.other:tp}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dataUploadLabel}</label>
                  <input className="form-input" type="date" value={form.dataUpload||''} onChange={e=>setForm(f=>({...f,dataUpload:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dueDateLabel}</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.description}</label>
                  <textarea className="form-textarea" value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={2}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.fileLabel}</label>
                  <div
                    className="file-drop"
                    onClick={()=>fileRef.current?.click()}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){fileRef.current.files=e.dataTransfer.files;handleFileChange({target:{files:[f]}});}}}
                  >
                    <i className="fas fa-cloud-arrow-up" style={{fontSize:22,color:'var(--brand)',marginBottom:8}}/>
                    <span>{form.conteudo ? <span style={{color:'var(--green)'}}><i className="fas fa-check" style={{marginRight:6}}/>{t.fileLoaded} {form.nome}</span> : t.uploadFile}</span>
                  </div>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileChange}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
