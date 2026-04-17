// ── Funcionários ─────────────────────────────────────────────
function EmployeesPage() {
  const { t, lang, currency, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const [f, e] = await Promise.all([db.funcionarios.toArray(), db.empresas.toArray()]);
    setRows(f); setEmpresas(e);
  }, []);
  useEffect(() => { load(); }, []);

  const [showArchivedEmp, setShowArchivedEmp] = useState(false);
  const empName = id => empresas.find(e=>e.id===id)?.nome || '—';
  const filtered = React.useMemo(() =>
    rows
      .filter(r => showArchivedEmp ? r.statusReg==='arquivado' : r.statusReg!=='arquivado')
      .filter(r =>
        (!filterEmp || r.empresaId===Number(filterEmp)) &&
        (r.nome?.toLowerCase().includes(search.toLowerCase()) || r.cargo?.toLowerCase().includes(search.toLowerCase()))
      ),
  [rows, showArchivedEmp, filterEmp, search]);
  const archivedEmpCount = rows.filter(r=>r.statusReg==='arquivado').length;

  function openNew()  { setForm({ statusReg:'ativo', moedaSalario:'BRL', pais:'BR' }); setModal('form'); }
  function openEdit(r){ setForm({...r}); setModal('form'); }

  async function handleSave() {
    try {
      if (form.id) await db.funcionarios.update(form.id, form);
      else await db.funcionarios.add(form);
      await db.auditLog.add({ acao: `Funcionário ${form.id?'atualizado':'criado'}: ${form.nome}`, modulo: 'Funcionários', timestamp: new Date().toISOString() });
      toast(t.saved, 'success'); setModal(null); load();
    } catch { toast(t.errorSave, 'error'); }
  }

  async function handleDelete(id, nome) {
    setConfirm({ msg: 'Arquivar este funcionário? O registro não será excluído.', onConfirm: async () => {
      await db.funcionarios.update(id, { statusReg: 'arquivado' });
      await db.auditLog.add({ acao: `Funcionário arquivado: ${nome}`, modulo: 'Funcionários', timestamp: new Date().toISOString() });
      toast('Funcionário arquivado.', 'success'); setConfirm(null); load();
    }});
  }

  const F = ({label, field, type='text', opts=null}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts ? (
        <select className="form-select" value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:type==='number'?Number(e.target.value):e.target.value}))}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:type==='number'?Number(e.target.value):e.target.value}))}/>
      )}
    </div>
  );

  const salFmt = (val, moeda) => fmt.currency(val||0, moeda==='USD'?'USD':'BRL', lang);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.employees}</div>
          <div className="page-header-sub">{rows.filter(r=>r.statusReg==='ativo').length} ativos de {rows.length} registrados</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newEmployee}</button>
      </div>
      <div className="card">
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 10px'}}>
          <div className="search-bar" style={{flex:1,minWidth:180}}><i className="fas fa-search"/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-select" style={{maxWidth:220}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
            <option value="">{t.allCompanies}</option>
            {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <button onClick={()=>setShowArchivedEmp(v=>!v)} className={`btn ${showArchivedEmp?'btn-primary':'btn-secondary'}`} style={{fontSize:12,padding:'6px 14px'}}>
            <i className={`fas fa-${showArchivedEmp?'eye':'archive'}`}/>
            {showArchivedEmp?'Ver Ativos':`Arquivados${archivedEmpCount>0?' ('+archivedEmpCount+')':''}`}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-users"/><p>{t.noRecords}</p></div>
        ) : (<div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>{t.name}</th><th>{t.companies}</th><th>{t.position}</th>
              <th>{t.department}</th><th>{t.salary}</th><th>{t.hireDate}</th>
              <th>{t.status}</th><th>{t.actions}</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="avatar" style={{background:fmt.avatarColor(r.nome),color:'#fff'}}>{fmt.initials(r.nome)}</div>
                      <div>
                        <div>{r.nome}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:12}}>{empName(r.empresaId)}</td>
                  <td>{r.cargo}</td>
                  <td>{r.departamento||'—'}</td>
                  <td style={{color:'var(--green)',fontWeight:600}}>{salFmt(r.salario,r.moedaSalario)}</td>
                  <td>{fmt.date(r.admissao, lang)}</td>
                  <td><span className={`badge badge-${r.statusReg==='ativo'?'green':'red'}`}>{r.statusReg==='ativo'?t.active:t.inactive}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn-icon" onClick={()=>openEdit(r)} title={t.edit}><i className="fas fa-pen"/></button>
                      {r.statusReg==='arquivado'
                        ? <button className="btn-icon" title={t.restore||'Restaurar'} onClick={async()=>{await db.funcionarios.update(r.id,{statusReg:'ativo'});load();}}><i className="fas fa-rotate-left"/></button>
                        : <button className="btn-icon" style={{color:'var(--red)'}} title={t.archive||'Arquivar'} onClick={()=>handleDelete(r.id,r.nome)}><i className="fas fa-archive"/></button>
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
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{form.id?t.edit:t.newEmployee}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <F label={t.name} field="nome"/>
              <F label={t.companies} field="empresaId" opts={empresas.map(e=>({v:e.id,l:e.nome}))}/>
              <F label={t.position} field="cargo"/>
              <F label={t.department} field="departamento"/>
              <F label={t.salary} field="salario" type="number"/>
              <F label={t.currency} field="moedaSalario" opts={[{v:'BRL',l:'BRL (R$)'},{v:'USD',l:'USD ($)'}]}/>
              <F label={t.hireDate} field="admissao" type="date"/>
              <F label={t.status} field="status" opts={[{v:'ativo',l:t.active},{v:'inativo',l:t.inactive}]}/>
              <F label={t.email} field="email" type="email"/>
              <F label={t.phone} field="telefone"/>
              <F label={t.country} field="pais" opts={[{v:'BR',l:'Brasil'},{v:'US',l:'EUA'}]}/>
              <F label={form.pais==='US'?t.ssn:t.cpf} field="documento"/>
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
