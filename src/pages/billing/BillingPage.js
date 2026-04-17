// ── Faturamento ──────────────────────────────────────────────
function BillingPage() {
  const { t, lang, currency, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  const load = useCallback(async () => {
    const [tx, e] = await Promise.all([db.transacoes.toArray(), db.empresas.toArray()]);
    setRows(tx); setEmpresas(e);
  }, []);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!rows.length) return;
    buildChart();
    return () => chartInst.current?.destroy();
  }, [rows, currency, filterEmp]);

  function buildChart() {
    const convertVal = (val, moeda) => moeda === currency ? val : moeda === 'BRL' ? val * (1/5.2) : val * 5.2;
    const txSet = filterEmp ? rows.filter(r=>r.empresaId===Number(filterEmp)) : rows;

    const months = [];
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      months.push(d.toLocaleString(lang, {month:'short'}));
      monthKeys.push(d.toISOString().slice(0,7));
    }
    const rev = monthKeys.map(m => txSet.filter(t=>t.tipo==='receita'&&t.data?.startsWith(m)).reduce((s,t)=>s+convertVal(t.valor,t.moeda),0));
    const exp = monthKeys.map(m => txSet.filter(t=>t.tipo==='despesa'&&t.data?.startsWith(m)).reduce((s,t)=>s+convertVal(t.valor,t.moeda),0));
    const bal = rev.map((r,i) => r - exp[i]);

    if (chartInst.current) chartInst.current.destroy();
    if (chartRef.current) {
      chartInst.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            { label: t.revenue, data: rev, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.1)', tension: .4, fill: true, pointRadius: 4 },
            { label: t.expense, data: exp, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', tension: .4, fill: true, pointRadius: 4 },
            { label: t.balance, data: bal, borderColor: '#6470f1', borderDash: [4,4], tension: .4, fill: false, pointRadius: 4 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8b93a8' } } },
          scales: {
            x: { grid: { color: 'rgba(30,37,53,.8)' }, ticks: { color: '#525d72' } },
            y: { grid: { color: 'rgba(30,37,53,.8)' }, ticks: { color: '#525d72', callback: v => currency+' '+Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v) } }
          }
        }
      });
    }
  }

  const convertVal = (val, moeda) => moeda === currency ? val : moeda === 'BRL' ? val*(1/5.2) : val*5.2;
  const txFiltered = React.useMemo(() =>
    rows.filter(r =>
      (!filterEmp  || r.empresaId===Number(filterEmp)) &&
      (!filterTipo || r.tipo===filterTipo)
    ),
  [rows, filterEmp, filterTipo]);
  const txSorted = React.useMemo(() =>
    [...txFiltered].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).slice(0,50),
  [txFiltered]);
  const totRev = txFiltered.filter(r=>r.tipo==='receita').reduce((s,r)=>s+convertVal(r.valor,r.moeda),0);
  const totExp = txFiltered.filter(r=>r.tipo==='despesa').reduce((s,r)=>s+convertVal(r.valor,r.moeda),0);
  const empName = id => empresas.find(e=>e.id===id)?.nome || '—';

  function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(t.billingReport, 14, 20);
    doc.setFontSize(10);
    let y = 35;
    txFiltered.slice(0,40).forEach(r => {
      doc.text(`${r.data||''} | ${r.tipo.toUpperCase()} | ${r.categoria||''} | ${r.descricao||''} | ${fmt.currency(convertVal(r.valor,r.moeda),currency,lang)}`, 14, y);
      y += 7; if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`faturamento_${new Date().toISOString().slice(0,10)}.pdf`);
    toast(t.pdfExported, 'success');
  }

  function exportExcel() {
    const data = txFiltered.map(r => ({
      Data: r.data, Tipo: r.tipo, Categoria: r.categoria, Descrição: r.descricao,
      Valor: r.valor, Moeda: r.moeda, Empresa: empName(r.empresaId)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faturamento');
    XLSX.writeFile(wb, `faturamento_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast(t.excelExported, 'success');
  }

  function empMoeda(empresaId) {
    const emp = empresas.find(e => e.id === Number(empresaId));
    return emp?.pais === 'US' ? 'USD' : 'BRL';
  }

  function openNew() { setForm({ tipo:'receita', moeda:'BRL', data: new Date().toISOString().slice(0,10) }); setModal('form'); }

  async function handleSave() {
    try {
      if (form.id) await db.transacoes.update(form.id, {...form, valor: Number(form.valor)});
      else await db.transacoes.add({...form, valor: Number(form.valor)});
      await db.auditLog.add({ acao: `Transação ${form.id?'atualizada':'criada'}: ${form.descricao}`, modulo: 'Faturamento', timestamp: new Date().toISOString() });
      toast(t.saved, 'success'); setModal(null); load();
    } catch { toast(t.errorSave, 'error'); }
  }

  async function handleDelete(id) {
    setConfirm({ msg: 'Arquivar esta transação? O registro não será excluído.', onConfirm: async () => {
      await db.transacoes.update(id, { statusReg: 'arquivado' });
      await db.auditLog.add({ acao: 'Transação arquivada', modulo: 'Faturamento', timestamp: new Date().toISOString() });
      toast('Transação arquivada.', 'success'); setConfirm(null); load();
    }});
  }

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
          <div className="page-header-title">{t.billing}</div>
          <div className="page-header-sub">{rows.length} {t.transactionsRegistered}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={exportPDF}><i className="fas fa-file-pdf"/>{t.exportPDF}</button>
          <button className="btn btn-ghost" onClick={exportExcel}><i className="fas fa-file-excel"/>{t.exportExcel}</button>
          <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus"/>{t.newTransaction}</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:20}}>
        <div className="kpi-card">
          <i className="fas fa-arrow-trend-up kpi-icon"/>
          <div className="kpi-label">{t.totalRevenue}</div>
          <div className="kpi-value" style={{fontSize:22,color:'var(--green)'}}>{fmt.currency(totRev,currency,lang)}</div>
        </div>
        <div className="kpi-card">
          <i className="fas fa-arrow-trend-down kpi-icon"/>
          <div className="kpi-label">{t.totalExpense}</div>
          <div className="kpi-value" style={{fontSize:22,color:'var(--red)'}}>{fmt.currency(totExp,currency,lang)}</div>
        </div>
        <div className="kpi-card">
          <i className="fas fa-scale-balanced kpi-icon"/>
          <div className="kpi-label">{t.netBalance}</div>
          <div className="kpi-value" style={{fontSize:22,color:totRev-totExp>=0?'var(--green)':'var(--red)'}}>{fmt.currency(totRev-totExp,currency,lang)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-title">{t.monthlyEvolution}</div>
        <div style={{height:200}}><canvas ref={chartRef}/></div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 10px'}}>
          <select className="form-select" style={{maxWidth:220}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
            <option value="">{t.allCompanies}</option>
            {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select className="form-select" style={{maxWidth:140}} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
            <option value="">{t.allTypes}</option>
            <option value="receita">{t.revenue}</option>
            <option value="despesa">{t.expense}</option>
          </select>
        </div>
        {txFiltered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-chart-line"/><p>{t.noRecords}</p></div>
        ) : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr>
              <th>{t.date}</th><th>{t.type}</th><th>{t.category}</th>
              <th>{t.description}</th><th>{t.companies}</th><th>{t.amount}</th><th>{t.actions}</th>
            </tr></thead>
            <tbody>
              {txSorted.map(r => (
                <tr key={r.id}>
                  <td style={{fontSize:12}}>{fmt.date(r.data,lang)}</td>
                  <td><span className={`badge badge-${r.tipo==='receita'?'green':'red'}`}>{r.tipo==='receita'?t.revenue:t.expense}</span></td>
                  <td style={{fontSize:12}}>{r.categoria}</td>
                  <td>{r.descricao}</td>
                  <td style={{fontSize:11,color:'var(--text-muted)'}}>{empName(r.empresaId)}</td>
                  <td style={{fontWeight:600,color:r.tipo==='receita'?'var(--green)':'var(--red)'}}>{fmt.currency(convertVal(r.valor,r.moeda),currency,lang)}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn-icon" onClick={()=>{setForm({...r});setModal('form')}} title={t.edit}><i className="fas fa-pen"/></button>
                      <button className="btn-icon" style={{color:'var(--red)'}} onClick={()=>handleDelete(r.id)} title={t.delete}><i className="fas fa-trash"/></button>
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
            <div className="modal-title">{form.id?t.edit:t.newTransaction}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <F label={t.type} field="tipo" opts={[{v:'receita',l:t.revenue},{v:'despesa',l:t.expense}]}/>
              <F label={t.date} field="data" type="date"/>
              <F label={t.category} field="categoria"/>
              <F label={t.amount} field="valor" type="number"/>
              <div className="form-group">
                <label className="form-label">{t.companies}</label>
                <select className="form-select" value={form.empresaId||''} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value, moeda: empMoeda(e.target.value) }))}>
                  <option value="">— selecione —</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.currency}</label>
                <input className="form-input" value={form.moeda || (form.empresaId ? empMoeda(form.empresaId) : 'BRL')} readOnly
                  style={{ opacity: .6, cursor: 'not-allowed', background: 'var(--surface)' }}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.description}</label>
              <input className="form-input" value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
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
