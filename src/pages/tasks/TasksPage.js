// ── Tasks & Deadlines ────────────────────────────────────────
function TasksPage() {
  const { t, lang, toast } = useApp();
  const [rows, setRows]       = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch]   = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPrio, setFilterPrio]   = useState('');
  const [filterEmp, setFilterEmp]     = useState('');
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const TIPOS = ['Fiscal','Contábil','Documental','Jurídico','Imigração','Outro'];

  const PRIO = {
    alta:  { badge:'red',    label: t.priorityHigh   },
    media: { badge:'yellow', label: t.priorityMedium },
    baixa: { badge:'green',  label: t.priorityLow    },
  };
  const STATUS = {
    'pendente':      { badge:'yellow', label: t.statusPending    },
    'em-andamento':  { badge:'blue',   label: t.statusInProgress },
    'concluida':     { badge:'gray',   label: t.statusDone       },
    'bloqueada':     { badge:'red',    label: t.statusBlocked    },
  };

  const load = useCallback(async () => {
    const [tk, emp] = await Promise.all([db.tasks.toArray(), db.empresas.toArray()]);
    setRows(tk); setEmpresas(emp);
  }, []);
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0,10);
  const in7   = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);

  const filtered = React.useMemo(() =>
    rows
      .filter(r => r.statusReg !== 'arquivado')
      .filter(r =>
        (!filterTipo   || r.tipo === filterTipo) &&
        (!filterStatus || r.status === filterStatus) &&
        (!filterPrio   || r.prioridade === filterPrio) &&
        (!filterEmp    || String(r.empresaId) === String(filterEmp)) &&
        (r.titulo?.toLowerCase().includes(search.toLowerCase()) ||
         r.responsavel?.toLowerCase().includes(search.toLowerCase()) ||
         r.descricao?.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a,b) => {
        const aOver = a.vencimento < today ? 0 : 1;
        const bOver = b.vencimento < today ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.vencimento||'').localeCompare(b.vencimento||'');
      }),
  [rows, filterTipo, filterStatus, filterPrio, filterEmp, search, today]);

  const counts = React.useMemo(() => ({
    vencidas:   rows.filter(r=>r.statusReg!=='arquivado'&&r.status!=='concluida'&&r.vencimento<today).length,
    hoje:       rows.filter(r=>r.statusReg!=='arquivado'&&r.status!=='concluida'&&r.vencimento===today).length,
    semana:     rows.filter(r=>r.statusReg!=='arquivado'&&r.status!=='concluida'&&r.vencimento>today&&r.vencimento<=in7).length,
    concluidas: rows.filter(r=>r.status==='concluida').length,
    total:      rows.filter(r=>r.statusReg!=='arquivado').length,
  }), [rows, today, in7]);

  function openNew() {
    setForm({ status:'pendente', prioridade:'media', tipo:'Fiscal', vencimento: new Date(Date.now()+7*86400000).toISOString().slice(0,10), anexos:[] });
    setModal('form');
  }
  function openEdit(r) { setForm({ anexos:[], ...r, anexos: r.anexos||[] }); setModal('form'); }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const anexo = {
        nome: file.name,
        tamanho: file.size/1024>1024?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB',
        tipo: file.name.split('.').pop().toUpperCase(),
        conteudo: ev.target.result,
      };
      setForm(f => ({ ...f, anexos: [...(f.anexos||[]), anexo] }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removeAnexo(idx) {
    setForm(f => ({ ...f, anexos: (f.anexos||[]).filter((_,i)=>i!==idx) }));
  }

  function downloadAnexo(a) {
    const el = document.createElement('a');
    el.href = a.conteudo; el.download = a.nome; el.click();
  }

  async function handleSave() {
    if (!form.titulo?.trim()) { toast('Título é obrigatório.','error'); return; }
    if (!form.vencimento)     { toast('Prazo é obrigatório.','error'); return; }
    try {
      if (form.id) await db.tasks.update(form.id, form);
      else         await db.tasks.add(form);
      await db.auditLog.add({ acao:`Task ${form.id?'atualizada':'criada'}: ${form.titulo}`, modulo:'Tasks', timestamp: new Date().toISOString() });
      toast(t.saved,'success'); setModal(null); load();
    } catch { toast(t.errorSave,'error'); }
  }

  async function handleArchive(id, titulo) {
    setConfirm({ msg:'Arquivar esta task? O registro não será excluído.', onConfirm: async () => {
      await db.tasks.update(id, { statusReg:'arquivado' });
      await db.auditLog.add({ acao:`Task arquivada: ${titulo}`, modulo:'Tasks', timestamp: new Date().toISOString() });
      toast('Task arquivada.','success'); setConfirm(null); load();
    }});
  }

  async function cycleStatus(tk) {
    const order = ['pendente','em-andamento','concluida'];
    const next = order[(order.indexOf(tk.status)+1) % order.length];
    await db.tasks.update(tk.id, { status: next });
    setRows(prev => prev.map(r => r.id===tk.id ? {...r,status:next} : r));
  }

  const empName = id => empresas.find(e=>e.id===id)?.nome||'—';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.tasks}</div>
          <div className="page-header-sub">{counts.total} tarefas · {counts.vencidas > 0 ? <span style={{color:'var(--red)',fontWeight:600}}>{counts.vencidas} vencidas</span> : 'nenhuma vencida'}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newTask}</button>
      </div>

      {/* Summary pills */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          { label:t.overdueTasks,  count:counts.vencidas, color:'var(--red)',    icon:'fa-circle-exclamation', filterVal:'', filterKey:'vencidas' },
          { label:t.todayTasks,    count:counts.hoje,     color:'var(--yellow)', icon:'fa-clock',              filterVal:'', filterKey:'hoje'     },
          { label:t.weekTasks,     count:counts.semana,   color:'var(--brand)',  icon:'fa-calendar-week',      filterVal:'', filterKey:'semana'   },
          { label:t.completedTasks,count:counts.concluidas,color:'var(--gray)', icon:'fa-circle-check',       filterVal:'concluida', filterKey:'status' },
        ].map(s => (
          <div key={s.label} style={{
            display:'flex',alignItems:'center',gap:10,
            background:'var(--surface-card)',border:'1px solid var(--surface-border)',
            borderRadius:10,padding:'10px 18px',cursor:'pointer',
          }}
            onClick={()=>s.filterKey==='status'?setFilterStatus(filterStatus===s.filterVal?'':s.filterVal):null}
          >
            <i className={`fas ${s.icon}`} style={{color:s.color,fontSize:16}}/>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',lineHeight:1}}>{s.count}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filters */}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 10px'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}>
            <i className="fas fa-search"/>
            <input placeholder="Buscar tarefa, responsável..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{maxWidth:160}} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS.map(tp=><option key={tp} value={tp}>{tp}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([v,s])=><option key={v} value={v}>{s.label}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:130}} value={filterPrio} onChange={e=>setFilterPrio(e.target.value)}>
            <option value="">Prioridade</option>
            {Object.entries(PRIO).map(([v,p])=><option key={v} value={v}>{p.label}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:200}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
            <option value="">Todas as entidades</option>
            {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {(search||filterTipo||filterStatus||filterPrio||filterEmp) && (
            <button className="btn btn-secondary" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>{setSearch('');setFilterTipo('');setFilterStatus('');setFilterPrio('');setFilterEmp('');}}>
              <i className="fas fa-xmark"/>Limpar
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-list-check"/><p>{t.noTasksDue}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:32}}></th>
                  <th>{t.taskTitle}</th>
                  <th>{t.taskType}</th>
                  <th>{t.companies}</th>
                  <th>{t.responsible}</th>
                  <th>{t.dueDate2}</th>
                  <th>{t.priority}</th>
                  <th>{t.status}</th>
                  <th>{t.attachments}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tk => {
                  const st   = STATUS[tk.status] || { badge:'brand', label: tk.status };
                  const pr   = PRIO[tk.prioridade] || { badge:'brand', label: tk.prioridade };
                  const isOverdue  = tk.vencimento < today && tk.status !== 'concluida';
                  const isToday    = tk.vencimento === today && tk.status !== 'concluida';
                  const isWeek     = tk.vencimento > today && tk.vencimento <= in7 && tk.status !== 'concluida';
                  const isDone     = tk.status === 'concluida';
                  return (
                    <tr key={tk.id} style={{opacity: isDone ? 0.6 : 1}}>
                      <td>
                        <button
                          onClick={()=>cycleStatus(tk)}
                          title="Avançar status"
                          style={{
                            width:22,height:22,borderRadius:'50%',border:`2px solid ${isDone?'var(--green)':isOverdue?'var(--red)':'var(--surface-border)'}`,
                            background: isDone?'var(--green)':'transparent',color:'#fff',cursor:'pointer',
                            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                          }}
                        >
                          {isDone && <i className="fas fa-check" style={{fontSize:9}}/>}
                        </button>
                      </td>
                      <td>
                        <div style={{fontWeight:600,color:'var(--text-primary)',textDecoration:isDone?'line-through':'none'}}>{tk.titulo}</div>
                        {tk.descricao && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{tk.descricao.slice(0,60)}{tk.descricao.length>60?'…':''}</div>}
                      </td>
                      <td><span className="badge badge-brand" style={{fontSize:10}}>{tk.tipo||'—'}</span></td>
                      <td style={{fontSize:12,color:'var(--text-secondary)'}}>{empName(tk.empresaId)}</td>
                      <td style={{fontSize:12}}>{tk.responsavel||'—'}</td>
                      <td>
                        {tk.vencimento ? (
                          <span style={{
                            fontSize:12,fontWeight:isOverdue||isToday?700:400,
                            color:isOverdue?'var(--red)':isToday?'var(--yellow)':isWeek?'var(--brand)':'var(--text-secondary)',
                          }}>
                            {isOverdue&&<i className="fas fa-triangle-exclamation" style={{marginRight:4}}/>}
                            {isToday&&<i className="fas fa-clock" style={{marginRight:4}}/>}
                            {isToday?t.todayTasks:fmt.date(tk.vencimento,lang)}
                          </span>
                        ) : '—'}
                      </td>
                      <td><span className={`badge badge-${pr.badge}`}>{pr.label}</span></td>
                      <td>
                        <button onClick={()=>cycleStatus(tk)} className={`badge badge-${st.badge}`} style={{cursor:'pointer',border:'none',background:'transparent',whiteSpace:'nowrap'}}>
                          {st.label}
                        </button>
                      </td>
                      <td>
                        {(tk.anexos||[]).length > 0
                          ? <span style={{fontSize:12,color:'var(--brand)',cursor:'pointer'}} onClick={()=>openEdit(tk)}>
                              <i className="fas fa-paperclip" style={{marginRight:4}}/>{(tk.anexos||[]).length}
                            </span>
                          : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>
                        }
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn-icon" title="Editar" onClick={()=>openEdit(tk)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon" title="Arquivar" onClick={()=>handleArchive(tk.id,tk.titulo)} style={{color:'var(--red)'}}><i className="fas fa-archive"/></button>
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
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:640}}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? t.editTask : t.newTask}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.taskTitle} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.titulo||''} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Declaração IRPJ 2024, Renovar Green Card..."/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.description}</label>
                  <textarea className="form-textarea" rows={2} value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Detalhes, contexto, instruções..."/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.taskType}</label>
                  <select className="form-select" value={form.tipo||''} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    {TIPOS.map(tp=><option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Entidade Vinculada</label>
                  <select className="form-select" value={form.empresaId||''} onChange={e=>setForm(f=>({...f,empresaId:e.target.value?Number(e.target.value):''}))}>
                    <option value="">Nenhuma (pessoal)</option>
                    {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.dueDate2} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.responsible}</label>
                  <input className="form-input" value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Nome do responsável"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.priority}</label>
                  <select className="form-select" value={form.prioridade||'media'} onChange={e=>setForm(f=>({...f,prioridade:e.target.value}))}>
                    {Object.entries(PRIO).map(([v,p])=><option key={v} value={v}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.status}</label>
                  <select className="form-select" value={form.status||'pendente'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS).map(([v,s])=><option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>

                {/* Anexos */}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {lang === 'en-US' ? 'Attached Files' : 'Documentos Anexos'}
                    <button type="button" className="btn btn-secondary" style={{fontSize:11,padding:'3px 10px'}} onClick={()=>fileRef.current?.click()}>
                      <i className="fas fa-paperclip"/>{t.attach}
                    </button>
                  </label>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileChange}/>
                  {(form.anexos||[]).length === 0 ? (
                    <div style={{fontSize:12,color:'var(--text-muted)',padding:'10px 0'}}>Nenhum arquivo anexado.</div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:6}}>
                      {(form.anexos||[]).map((a,i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface-hover)',borderRadius:8,padding:'7px 12px'}}>
                          <i className={`fas fa-file-${a.tipo==='PDF'?'pdf':a.tipo==='XLSX'?'excel':a.tipo==='DOCX'?'word':'alt'}`} style={{color:'var(--brand)',fontSize:14,flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.nome}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)'}}>{a.tamanho}</div>
                          </div>
                          <button type="button" onClick={()=>downloadAnexo(a)} style={{background:'none',border:'none',color:'var(--brand)',cursor:'pointer',padding:4}} title="Download"><i className="fas fa-download" style={{fontSize:12}}/></button>
                          <button type="button" onClick={()=>removeAnexo(i)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',padding:4}} title="Remover"><i className="fas fa-xmark" style={{fontSize:12}}/></button>
                        </div>
                      ))}
                    </div>
                  )}
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
