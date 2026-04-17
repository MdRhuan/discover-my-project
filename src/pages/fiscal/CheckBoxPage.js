// ── Check-the-Box Page ──────────────────────────────────────
function CheckBoxPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const ANOS = ['2020','2021','2022','2023','2024','2025','2026'];

  const load = useCallback(async () => {
    const all = await db.fiscalDocs.toArray();
    setRows(all.filter(r => r.subcategoria === 'Check-the-Box Elections'));
  }, []);
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (!filterAno || String(r.ano) === filterAno) &&
    (!search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase()))
  );

  function openNew() {
    setForm({ subcategoria: 'Check-the-Box Elections', jurisdicao: 'US', tipo: 'PDF', status: 'ativo', ano: new Date().getFullYear().toString(), dataUpload: new Date().toISOString().slice(0,10) });
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
    if (!r.conteudo) { toast(t.fileNotAvailable,'error'); return; }
    const a = document.createElement('a'); a.href=r.conteudo; a.download=r.nome||'doc'; a.click();
  }

  async function handleSave() {
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

  const STATUS_MAP = { ativo:{badge:'brand',label:t.statusActive}, entregue:{badge:'green',label:t.statusDelivered}, pendente:{badge:'yellow',label:t.statusPending}, vencido:{badge:'red',label:t.statusOverdue} };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Check-the-Box Elections</div>
          <div className="page-header-sub">{rows.length} {t.checkBoxElections}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newElectionCTB}</button>
      </div>

      {/* Info card */}
      <div className="card" style={{marginBottom:16,background:'var(--brand-dim)',border:'1px solid var(--brand)',padding:'14px 18px'}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <i className="fas fa-circle-info" style={{color:'var(--brand)',fontSize:16,marginTop:2,flexShrink:0}}/>
          <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6}}>
            <strong style={{color:'var(--text-primary)'}}>Check-the-Box (CTB)</strong> — {t.ctbInfoText}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}>
            <i className="fas fa-search"/>
            <input placeholder={t.searchDocument} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{maxWidth:160}} value={filterAno} onChange={e=>setFilterAno(e.target.value)}>
            <option value="">{t.allYears}</option>
            {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {(search||filterAno) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{setSearch('');setFilterAno('');}}>
              <i className="fas fa-xmark"/>{t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-check-to-slot"/><p>{t.noElectionsFound}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.documentLabel}</th>
                  <th>{t.entityDescription}</th>
                  <th>{t.yearLabel}</th>
                  <th>{t.responsibleLabel}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.ativo;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{fontWeight:600,color:'var(--text-primary)',fontSize:13}}>{r.nome}</div>
                        {r.tipo && <span style={{fontSize:10,color:'var(--text-muted)',background:'var(--surface-hover)',borderRadius:4,padding:'1px 6px',marginTop:2,display:'inline-block'}}>{r.tipo}</span>}
                      </td>
                      <td style={{fontSize:12,maxWidth:260}}>{r.descricao||'—'}</td>
                      <td>{r.ano||'—'}</td>
                      <td>{r.responsavel||'—'}</td>
                      <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {r.conteudo && <button className="btn-icon" title={t.download} onClick={()=>handleDownload(r)}><i className="fas fa-download"/></button>}
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
              <div className="modal-title">{form.id ? t.editElection : t.newElectionCTB}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.documentNameLabel} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Form 8832 — Alvo Properties LLC"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.yearLabel}</label>
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
                  <label className="form-label">{t.responsibleLabel}</label>
                  <input className="form-input" value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Ex: Tax Attorney"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dataUploadLabel}</label>
                  <input className="form-input" type="date" value={form.dataUpload||''} onChange={e=>setForm(f=>({...f,dataUpload:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.description}</label>
                  <textarea className="form-textarea" rows={2} value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Entity Classification Election — disregarded entity"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.fileLabel}</label>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileChange}/>
                  <button type="button" className="btn btn-secondary" onClick={()=>fileRef.current?.click()}>
                    <i className="fas fa-paperclip"/>{form.conteudo ? t.changeFile : t.attach}
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
