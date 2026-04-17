// ── Documentos ───────────────────────────────────────────────
function DocumentsPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const CATS = ['Constituição','Legal','Financeiro','Tax','Licenças','Contratos','RH','Outros'];

  const load = useCallback(async () => {
    const [d, e] = await Promise.all([db.documentos.toArray(), db.empresas.toArray()]);
    setRows(d); setEmpresas(e);
  }, []);
  useEffect(() => { load(); }, []);

  const empName = id => empresas.find(e=>e.id===id)?.nome || '—';
  const STATUS_DOC = ['Atual','Pendente Upload','Desatualizado','Substituído','Arquivado'];
  const STATUS_DOC_BADGE = { 'Atual':'green','Pendente Upload':'yellow','Desatualizado':'red','Substituído':'blue','Arquivado':'brand' };

  const filtered = React.useMemo(() =>
    rows
      .filter(r => showArchivedDocs ? r.statusDoc==='Arquivado' : r.statusDoc!=='Arquivado')
      .filter(r =>
        (!filterEmp || r.empresaId===Number(filterEmp)) &&
        (!filterCat || r.categoria===filterCat) &&
        (!filterStatus || r.statusDoc===filterStatus) &&
        (!filterAno || String(r.anoFiscal) === filterAno) &&
        (r.nome?.toLowerCase().includes(search.toLowerCase()) || r.categoria?.toLowerCase().includes(search.toLowerCase()))
      ),
  [rows, showArchivedDocs, filterEmp, filterCat, filterStatus, filterAno, search]);
  const archivedDocsCount = rows.filter(r=>r.statusDoc==='Arquivado').length;

  function openNew()  { setForm({ categoria:'Legal', versao:'1', dataUpload: new Date().toISOString().slice(0,10), statusDoc:'Atual', anoFiscal: new Date().getFullYear().toString() }); setModal('form'); }
  function openEdit(r){ setForm({...r}); setModal('form'); }

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
      if (form.id) await db.documentos.update(form.id, form);
      else await db.documentos.add(form);
      await db.auditLog.add({ acao: `Documento ${form.id?'atualizado':'adicionado'}: ${form.nome}`, modulo: 'Documentos', timestamp: new Date().toISOString() });
      toast(t.saved, 'success'); setModal(null); load();
    } catch { toast(t.errorSave, 'error'); }
  }

  async function handleArchive(id, nome, action) {
    const newStatus = action === 'substituido' ? 'Substituído' : 'Arquivado';
    const msg = action === 'substituido' ? t.markAsReplaced : t.archiveDocument;
    setConfirm({ msg, onConfirm: async () => {
      await db.documentos.update(id, { statusDoc: newStatus });
      await db.auditLog.add({ acao: `Documento ${newStatus.toLowerCase()}: ${nome}`, modulo: 'Documentos', timestamp: new Date().toISOString() });
      toast(`${t.documentMarkedAs} ${newStatus}.`, 'success'); setConfirm(null); load();
    }});
  }

  // kept as alias so openEdit still works on archived docs
  async function handleDelete(id, nome) { handleArchive(id, nome, 'arquivado'); }

  const catColors = { 'Constituição':'brand','Legal':'blue','Financeiro':'green','Tax':'yellow','Licenças':'brand','Contratos':'blue','RH':'green','Outros':'yellow','Tax':'yellow','Sales':'blue','Operations':'green','Management':'brand' };
  const catColor = c => catColors[c] || 'brand';

  const F = ({label, field, type='text', opts=null}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts ? (
        <select className="form-select" value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.documents}</div>
          <div className="page-header-sub">{rows.length} {t.documentsInRepo}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newDocument}</button>
      </div>
      <div className="card">
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 10px'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}><i className="fas fa-search"/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-select" style={{maxWidth:200}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
            <option value="">{t.allCompanies}</option>
            {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:160}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">{t.category}</option>
            {CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:170}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">{t.allStatuses}</option>
            {STATUS_DOC.filter(s=>s!=='Arquivado').map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:150}} value={filterAno} onChange={e=>setFilterAno(e.target.value)}>
            <option value="">{t.allYears}</option>
            {['2020','2021','2022','2023','2024','2025','2026'].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          {(search||filterEmp||filterCat||filterStatus||filterAno) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{setSearch('');setFilterEmp('');setFilterCat('');setFilterStatus('');setFilterAno('');}}>
              <i className="fas fa-xmark"/>{t.clearFilter}
            </button>
          )}
          <button onClick={()=>setShowArchivedDocs(v=>!v)} className={`btn ${showArchivedDocs?'btn-primary':'btn-secondary'}`} style={{fontSize:12,padding:'6px 14px'}}>
            <i className={`fas fa-${showArchivedDocs?'eye':'archive'}`}/>
            {showArchivedDocs ? t.viewActive : `${t.archived}${archivedDocsCount>0?' ('+archivedDocsCount+')':''}`}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-folder-open"/><p>{t.noRecords}</p></div>
        ) : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr>
              <th>{t.name}</th><th>{t.companies}</th><th>{t.category}</th>
              <th>{t.status}</th><th>{t.fiscalYear}</th><th>{t.version}</th><th>{t.uploadDate}</th><th>{t.actions}</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div
                        title={r.conteudo ? t.clickToDownload : t.noFileAttached}
                        onClick={() => handleDownload(r)}
                        style={{
                          width:32, height:32, borderRadius:8,
                          background: r.conteudo ? 'var(--brand-dim)' : 'var(--surface-border)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: r.conteudo ? 'var(--brand-light)' : 'var(--text-muted)',
                          fontSize:14,
                          cursor: r.conteudo ? 'pointer' : 'default',
                          transition: 'opacity .15s',
                        }}
                        onMouseEnter={e => { if (r.conteudo) e.currentTarget.style.opacity = '.7'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        <i className={`fas fa-file-${r.tipo==='PDF'?'pdf':r.tipo==='XLSX'||r.tipo==='XLS'?'excel':r.tipo==='DOCX'||r.tipo==='DOC'?'word':'alt'}`}/>
                      </div>
                      <div>{r.nome}</div>
                    </div>
                  </td>
                  <td style={{fontSize:12}}>{empName(r.empresaId)}</td>
                  <td><span className={`badge badge-${catColor(r.categoria)}`}>{r.categoria}</span></td>
                  <td>
                    <span className={`badge badge-${STATUS_DOC_BADGE[r.statusDoc||'Atual']||'brand'}`} style={{fontSize:10}}>
                      {r.statusDoc||'Atual'}
                    </span>
                  </td>
                  <td style={{fontSize:12,color:'var(--text-secondary)'}}>{r.anoFiscal||'—'}</td>
                  <td>v{r.versao||1}</td>
                  <td>{fmt.date(r.dataUpload, lang)}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn-icon" title={t.edit} onClick={()=>openEdit(r)}><i className="fas fa-pen"/></button>
                      {r.statusDoc==='Arquivado'
                        ? <button className="btn-icon" title={t.restore} onClick={async()=>{await db.documentos.update(r.id,{statusDoc:'Atual'});load();}}><i className="fas fa-rotate-left"/></button>
                        : <>
                            <button className="btn-icon" title={t.markAsReplacedTitle} onClick={()=>handleArchive(r.id,r.nome,'substituido')} style={{color:'var(--yellow)'}}><i className="fas fa-arrows-rotate"/></button>
                            <button className="btn-icon" title={t.archiveNoDelete} onClick={()=>handleArchive(r.id,r.nome,'arquivado')} style={{color:'var(--red)'}}><i className="fas fa-archive"/></button>
                          </>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {modal==='form' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{form.id?t.edit:t.newDocument}</div>
            <div
              className="upload-zone"
              style={{marginBottom:16}}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-over')}}
              onDragLeave={e=>e.currentTarget.classList.remove('drag-over')}
              onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f){setForm(fm=>({...fm,nome:fm.nome||f.name,tamanho:(f.size/1024>1024?(f.size/1048576).toFixed(1)+' MB':(f.size/1024).toFixed(0)+' KB'),tipo:f.name.split('.').pop().toUpperCase()}))}}}
            >
              <i className="fas fa-cloud-arrow-up"/>
              {form.nome ? <span style={{color:'var(--text-primary)'}}>{form.nome} ({form.tamanho})</span> : t.uploadFile}
              <input type="file" ref={fileRef} style={{display:'none'}} onChange={handleFileChange}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <F label={t.name} field="nome"/>
              <F label={t.companies} field="empresaId" opts={empresas.map(e=>({v:e.id,l:e.nome}))}/>
              <F label={t.category} field="categoria" opts={CATS.map(c=>({v:c,l:c}))}/>
              <F label={t.documentStatus} field="statusDoc" opts={STATUS_DOC.filter(s=>s!=='Arquivado').map(s=>({v:s,l:s}))}/>
              <F label={t.fiscalYear} field="anoFiscal"/>
              <F label={t.version} field="versao"/>
              <F label={t.uploadDate} field="dataUpload" type="date"/>
              <F label={t.type} field="tipo" opts={[{v:'PDF',l:'PDF'},{v:'XLSX',l:'Excel'},{v:'DOCX',l:'Word'},{v:'IMG',l:t.image},{v:'Outro',l:t.other}]}/>
            </div>
            <div className="form-group">
              <label className="form-label">{t.description}</label>
              <textarea className="form-textarea" value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
            </div>
            <hr className="divider"/>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-check"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} t={t}/>}
    </div>
  );
}
