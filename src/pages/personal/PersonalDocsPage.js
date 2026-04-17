// ── Próximas Obrigações sub-component ──────────────────────
// ── Próximas Obrigações (sub-componente de PersonalDocsPage) ─
function ProximasObrigacoes({ alertColor, fmt, lang, t, toast }) {
  const OB_KEY = 'proximas_obrigacoes';
  const [obList, setObList]       = useState(null);
  const [obModal, setObModal]     = useState(false);
  const [obForm, setObForm]       = useState({});
  const [obConfirm, setObConfirm] = useState(null);

  useEffect(() => {
    db.config.get(OB_KEY).then(rec => {
      if (rec?.value) { setObList(rec.value); }
      else {
        const defaults = [
          { id:1, label:'Naturalization Eligibility', info:'Verificar elegibilidade após 5 anos de residência permanente', data:'' },
          { id:2, label:'Green Card Renewal — Eduardo', info:'Renovação obrigatória antes do vencimento', data:'' },
          { id:3, label:'Green Card Renewal — Carla',   info:'Renovação obrigatória antes do vencimento', data:'' },
        ];
        setObList(defaults);
        db.config.put({ chave: OB_KEY, value: defaults });
      }
    });
  }, []);

  async function saveOb() {
    if (!obForm.label?.trim()) { toast('Título obrigatório.','error'); return; }
    const updated = obForm.id
      ? obList.map(o => o.id === obForm.id ? obForm : o)
      : [...obList, { ...obForm, id: Date.now() }];
    await db.config.put({ chave: OB_KEY, value: updated });
    setObList(updated); setObModal(false); setObForm({});
    toast('Salvo!','success');
  }

  async function deleteOb(id) {
    const updated = obList.filter(o => o.id !== id);
    await db.config.put({ chave: OB_KEY, value: updated });
    setObList(updated); setObConfirm(null);
    toast('Removido.','success');
  }

  if (!obList) return null;
  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div className="card-title" style={{marginBottom:0}}><i className="fas fa-clock-rotate-left" style={{marginRight:8}}/>{t.upcomingObligation}</div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setObForm({}); setObModal(true); }}>
          <i className="fas fa-plus"/>{t.addObligation}
        </button>
      </div>
      {obList.length === 0 ? (
        <div className="empty-state" style={{padding:'20px 0'}}><i className="fas fa-calendar-check"/><p>{t.noObligation}</p></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {obList.map(ob => {
            const c = alertColor(ob.data);
            return (
              <div key={ob.id} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:'var(--surface-hover)',borderRadius:8,border:`1px solid ${c?c+'44':'var(--surface-border)'}`}}>
                <i className="fas fa-calendar-check" style={{color:c||'var(--brand)',fontSize:14,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{ob.label}</div>
                  {ob.info && <div style={{fontSize:11,color:'var(--text-muted)'}}>{ob.info}</div>}
                </div>
                {ob.data && <span style={{fontSize:11,color:c||'var(--text-secondary)',fontWeight:c?700:400,flexShrink:0}}>{fmt.date(ob.data,lang)}</span>}
                <div style={{display:'flex',gap:4,flexShrink:0}}>
                  <button className="btn-icon" title="Editar" onClick={()=>{ setObForm({...ob}); setObModal(true); }}><i className="fas fa-pen"/></button>
                  <button className="btn-icon danger" title="Excluir" onClick={()=>setObConfirm(ob.id)}><i className="fas fa-trash"/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {obModal && (
        <div className="modal-backdrop" onClick={()=>setObModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-calendar-plus" style={{marginRight:8}}/>{obForm.id?'Editar Obrigação':'Nova Obrigação'}</div>
              <button className="modal-close" onClick={()=>setObModal(false)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Título <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={obForm.label||''} onChange={e=>setObForm(f=>({...f,label:e.target.value}))} placeholder="Ex: Renovação do passaporte"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Descrição</label>
                  <input className="form-input" value={obForm.info||''} onChange={e=>setObForm(f=>({...f,info:e.target.value}))} placeholder="Detalhes opcionais..."/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Data / Prazo</label>
                  <input className="form-input" type="date" value={obForm.data||''} onChange={e=>setObForm(f=>({...f,data:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setObModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveOb}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {obConfirm && (
        <ConfirmDialog
          msg="Excluir esta obrigação?"
          onConfirm={()=>deleteOb(obConfirm)}
          onCancel={()=>setObConfirm(null)}
        />
      )}
    </div>
  );
}

// defaults para assessores quando não há dados
const DEFAULT_ASSESSORES = [
  { id:1, nome:'John Mitchell Jr.', escritorio:'Baker McKenzie', tipo:'Tax US', contato_nome:'John Mitchell Jr.', contato_email:'jmitchell@bakermckenzie.com', contato_phone:'+1 305 789-4500', escopo:'Grupo Meridian EUA, Alvo Properties — federal & state tax', proxima_reuniao:'2025-05-15' },
  { id:2, nome:'Dra. Camila Rocha', escritorio:'Rocha & Associados', tipo:'Tax BR', contato_nome:'Dra. Camila Rocha', contato_email:'camila@rochaadv.com.br', contato_phone:'(11) 3456-7890', escopo:'Grupo Meridian BR, Construtora Alvo — IRPJ, CSLL, planejamento fiscal', proxima_reuniao:'2025-04-28' },
  { id:3, nome:'Michael Torres', escritorio:'Torres Immigration Law', tipo:'Imigração', contato_nome:'Michael Torres', contato_email:'mtorres@torreslaw.com', contato_phone:'+1 305 555-0300', escopo:'Eduardo & Carla — Green Card, naturalization, renewals', proxima_reuniao:'' },
];

// ── PessoaFichaCard ──────────────────────────────────────────
function PessoaFichaCard({ p, pessoas, savePessoas, deletePessoa, lang, toast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});

  function startEdit() { setDraft({...p}); setEditing(true); }
  function cancelEdit() { setEditing(false); setDraft({}); }
  async function saveEdit() {
    const updated = pessoas.map(x => x.id === p.id ? { ...x, ...draft } : x);
    await savePessoas(updated);
    setEditing(false);
    toast('Dados salvos!', 'success');
  }
  function set(k, v) { setDraft(d => ({...d, [k]: v})); }

  const Field = ({ label, value, icon }) => (
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{fontSize:10,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:4}}>
        {icon && <i className={`fas ${icon}`} style={{fontSize:9,color:p.cor}}/>}{label}
      </div>
      <div style={{fontSize:13,color: value ? 'var(--text-primary)' : 'var(--text-muted)',fontWeight: value ? 500 : 400}}>
        {value || <span style={{fontStyle:'italic',fontSize:12}}>Não informado</span>}
      </div>
    </div>
  );

  const InputField = ({ label, fieldKey, placeholder, type='text' }) => (
    <div className="form-group">
      <label className="form-label" style={{fontSize:11}}>{label}</label>
      <input className="form-input" style={{fontSize:13}} type={type} value={draft[fieldKey]||''} placeholder={placeholder||''} onChange={e=>set(fieldKey,e.target.value)}/>
    </div>
  );

  const isDefault = ['p-Eduardo','p-Carla','p-Rejane'].includes(p.id);

  return (
    <div className="card" style={{padding:'20px 24px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
        <div style={{width:52,height:52,borderRadius:14,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className="fas fa-user" style={{fontSize:22,color:p.cor}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:17,color:'var(--text-primary)'}}>{p.nome}</span>
            {p.relacao && <span style={{fontSize:11,color:p.cor,background:p.bg,borderRadius:6,padding:'2px 9px',fontWeight:600}}>{p.relacao}</span>}
          </div>
          {p.profissao && <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{p.profissao}{p.residenteFiscal ? ` · Residente fiscal: ${p.residenteFiscal}` : ''}</div>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={startEdit} style={{fontSize:12}}>
              <i className="fas fa-pen"/>Editar ficha
            </button>
          )}
          {!isDefault && !editing && (
            <button className="btn-icon danger" title="Remover pessoa" onClick={()=>deletePessoa(p.id)}>
              <i className="fas fa-trash" style={{fontSize:11}}/>
            </button>
          )}
        </div>
      </div>

      {/* ── VIEW mode ── */}
      {!editing && (
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {/* BR */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:p.cor,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:16,height:16,borderRadius:4,background:p.bg,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9}}>🇧🇷</span>
              Dados Brasileiros
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'12px 24px'}}>
              <Field label="CPF"              value={p.cpf}           icon="fa-id-card"/>
              <Field label="RG"               value={p.rg}            icon="fa-address-card"/>
              <Field label="Data de Nasc."    value={p.dataNasc ? fmt.date(p.dataNasc, lang) : ''} icon="fa-cake-candles"/>
              <Field label="Naturalidade"     value={p.naturalidade}  icon="fa-location-dot"/>
              <Field label="Nacionalidade"    value={p.nacionalidade} icon="fa-flag"/>
              <Field label="Estado Civil"     value={p.estadoCivil}   icon="fa-ring"/>
              {p.conjugeNome && <Field label="Cônjuge"      value={p.conjugeNome}   icon="fa-heart"/>}
              {p.enderecoBR  && <Field label="Endereço BR"  value={p.enderecoBR}    icon="fa-house"/>}
            </div>
          </div>

          {/* Divisor */}
          <div style={{height:1,background:'var(--surface-border)',margin:'4px 0 16px'}}/>

          {/* US */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:p.cor,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:16,height:16,borderRadius:4,background:p.bg,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9}}>🇺🇸</span>
              Dados Americanos
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'12px 24px'}}>
              <Field label="SSN"              value={p.ssn ? '•••–••–' + p.ssn.slice(-4) : ''} icon="fa-shield-halved"/>
              <Field label="Passaporte BR"    value={p.passaporteBR}  icon="fa-passport"/>
              <Field label="Passaporte US"    value={p.passaporteUS}  icon="fa-passport"/>
              {p.enderecoUS  && <Field label="Endereço US"  value={p.enderecoUS}    icon="fa-building"/>}
              <Field label="Res. Fiscal"      value={p.residenteFiscal} icon="fa-globe"/>
            </div>
          </div>

          {p.notas && (
            <div style={{marginTop:14,padding:'10px 14px',background:'var(--surface-hover)',borderRadius:8,fontSize:12,color:'var(--text-secondary)',borderLeft:`3px solid ${p.cor}`}}>
              <i className="fas fa-note-sticky" style={{marginRight:6,color:p.cor}}/>
              {p.notas}
            </div>
          )}
        </div>
      )}

      {/* ── EDIT mode ── */}
      {editing && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:0}}>
            {/* Seção BR */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:p.cor,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
                🇧🇷 Dados Brasileiros
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
                <InputField label="CPF"           fieldKey="cpf"          placeholder="000.000.000-00"/>
                <InputField label="RG"            fieldKey="rg"           placeholder="00.000.000-0"/>
                <InputField label="Data de Nasc." fieldKey="dataNasc"     type="date"/>
                <InputField label="Naturalidade"  fieldKey="naturalidade" placeholder="São Paulo - SP"/>
                <InputField label="Nacionalidade" fieldKey="nacionalidade" placeholder="Brasileira"/>
                <InputField label="Estado Civil"  fieldKey="estadoCivil"  placeholder="Casado"/>
                <InputField label="Cônjuge"       fieldKey="conjugeNome"  placeholder="Nome do cônjuge"/>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{fontSize:11}}>Endereço Brasil</label>
                  <input className="form-input" style={{fontSize:13}} value={draft.enderecoBR||''} placeholder="Rua, número, bairro, cidade, estado, CEP" onChange={e=>set('enderecoBR',e.target.value)}/>
                </div>
              </div>
            </div>

            {/* Seção US */}
            <div style={{borderTop:'1px solid var(--surface-border)',paddingTop:16,marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:p.cor,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
                🇺🇸 Dados Americanos
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
                <InputField label="SSN"              fieldKey="ssn"            placeholder="000-00-0000"/>
                <InputField label="Nº Passaporte BR" fieldKey="passaporteBR"   placeholder="AA000000"/>
                <InputField label="Nº Passaporte US" fieldKey="passaporteUS"   placeholder="A00000000"/>
                <InputField label="Residência Fiscal" fieldKey="residenteFiscal" placeholder="BR / US / BR+US"/>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{fontSize:11}}>Endereço EUA</label>
                  <input className="form-input" style={{fontSize:13}} value={draft.enderecoUS||''} placeholder="Street, City, State, ZIP" onChange={e=>set('enderecoUS',e.target.value)}/>
                </div>
              </div>
            </div>

            <div style={{borderTop:'1px solid var(--surface-border)',paddingTop:16,marginBottom:16}}>
              <div className="form-group">
                <label className="form-label" style={{fontSize:11}}>Notas / Observações</label>
                <textarea className="form-textarea" rows={2} value={draft.notas||''} onChange={e=>set('notas',e.target.value)} placeholder="Informações adicionais..."/>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid var(--surface-border)',paddingTop:14}}>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveEdit}><i className="fas fa-floppy-disk"/>Salvar ficha</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HealthPlanTab ────────────────────────────────────────────
const HP_KEY = 'healthPlan_data';

const HP_DEFAULT = [
  { id:1, operadora:'Bradesco Saúde', plano:'Top Nacional Flex', modalidade:'Empresarial', beneficiario:'Eduardo Vanzak', cpf:'', acomodacao:'Apartamento', coparticipacao:false, inicio:'2022-03-01', vencimento:'2026-02-28', mensalidade:'3.800', moeda:'BRL', status:'ativo', obs:'Plano família — inclui Carla e Rejane', docs:[] },
  { id:2, operadora:'Florida Blue',   plano:'BlueOptions Silver 1547', modalidade:'Individual', beneficiario:'Eduardo Vanzak', cpf:'', acomodacao:'—', coparticipacao:true, inicio:'2023-01-01', vencimento:'2025-12-31', mensalidade:'620', moeda:'USD', status:'ativo', obs:'Plano de saúde EUA — cobre Eduardo & Carla', docs:[] },
];

function HealthPlanTab({ lang, toast, t }) {
  const [planos, setPlanos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const STATUS_MAP = { ativo:{ badge:'green', label:t.statusActive }, vencido:{ badge:'red', label:t.statusOverdue }, cancelado:{ badge:'muted', label:t.statusCancelled } };

  useEffect(() => {
    db.config.get(HP_KEY).then(rec => setPlanos(rec?.value || HP_DEFAULT));
  }, []);

  async function save() {
    if (!form.operadora?.trim()) { toast('Operadora obrigatória.', 'error'); return; }
    const all = (await db.config.get(HP_KEY))?.value || HP_DEFAULT;
    const idx = all.findIndex(p => p.id === form.id);
    const entry = { ...form, id: form.id || Date.now() };
    const updated = idx >= 0 ? all.map(p => p.id === entry.id ? entry : p) : [...all, entry];
    await db.config.put({ chave: HP_KEY, value: updated });
    toast(t.saved, 'success'); setModal(null);
    db.config.get(HP_KEY).then(rec => setPlanos(rec?.value || []));
  }

  function del(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const all = (await db.config.get(HP_KEY))?.value || [];
      await db.config.put({ chave: HP_KEY, value: all.filter(p => p.id !== id) });
      setPlanos(prev => prev.filter(p => p.id !== id));
      toast(t.deleted, 'success'); setConfirm(null);
    }});
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

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-primary" onClick={() => { setForm({ id: null, status:'ativo', moeda:'BRL', docs:[] }); setModal('form'); }}>
          <i className="fas fa-plus"/>{t.newPlan}
        </button>
      </div>

      {planos.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-hospital"/><p>{t.noPlanFound}</p></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
          {planos.map(p => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.ativo;
            return (
              <div key={p.id} className="card" style={{padding:'18px 20px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:2}}>{p.operadora}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:6}}>{p.plano}</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span className={`badge badge-${st.badge}`}>{st.label}</span>
                      <span className="badge badge-muted" style={{fontSize:10}}>{p.modalidade}</span>
                      <span className="badge badge-muted" style={{fontSize:10}}>{p.moeda === 'USD' ? '🇺🇸 USD' : '🇧🇷 BRL'}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn-icon" onClick={() => { setForm({...p}); setModal('form'); }}><i className="fas fa-pen"/></button>
                    <button className="btn-icon danger" onClick={() => del(p.id)}><i className="fas fa-trash"/></button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5,fontSize:12,color:'var(--text-secondary)',marginBottom:10}}>
                  <div><i className="fas fa-user" style={{width:16,color:'var(--brand)'}}/>  {p.beneficiario||'—'}</div>
                  {p.acomodacao && p.acomodacao !== '—' && <div><i className="fas fa-bed" style={{width:16,color:'var(--brand)'}}/>  {p.acomodacao}</div>}
                  <div><i className="fas fa-calendar" style={{width:16,color:'var(--brand)'}}/>  {p.inicio ? fmt.date(p.inicio,lang) : '—'} → {p.vencimento ? fmt.date(p.vencimento,lang) : '—'}</div>
                  {p.mensalidade && <div><i className="fas fa-coins" style={{width:16,color:'var(--green)'}}/>  {p.moeda === 'USD' ? 'US$' : 'R$'} {p.mensalidade}/mês</div>}
                  {p.coparticipacao && <div><i className="fas fa-percent" style={{width:16,color:'var(--yellow)'}}/>  Com coparticipação</div>}
                </div>
                {p.obs && <div style={{fontSize:11,color:'var(--text-muted)',background:'var(--surface-hover)',borderRadius:6,padding:'6px 10px',marginBottom:8}}>{p.obs}</div>}
                {(p.docs||[]).length > 0 && (
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                    {p.docs.map((d,i) => (
                      <button key={i} onClick={() => downloadDoc(d)}
                        style={{display:'flex',alignItems:'center',gap:5,background:'var(--surface-hover)',border:'1px solid var(--surface-border)',borderRadius:6,padding:'3px 9px',cursor:'pointer',fontSize:11,color:'var(--text-secondary)'}}>
                        <i className="fas fa-file-pdf" style={{color:'var(--brand)',fontSize:10}}/>{d.nome.length>22?d.nome.slice(0,22)+'…':d.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal === 'form' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? t.editPlan : t.newPlan}</div>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">{t.provider} <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.operadora||''} onChange={e=>setForm(f=>({...f,operadora:e.target.value}))} placeholder="Ex: Bradesco Saúde"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.planName}</label>
                  <input className="form-input" value={form.plano||''} onChange={e=>setForm(f=>({...f,plano:e.target.value}))} placeholder="Ex: Top Nacional Flex"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.modality}</label>
                  <select className="form-select" value={form.modalidade||'Individual'} onChange={e=>setForm(f=>({...f,modalidade:e.target.value}))}>
                    {['Individual','Familiar','Empresarial','Coletivo'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.mainBeneficiary}</label>
                  <input className="form-input" value={form.beneficiario||''} onChange={e=>setForm(f=>({...f,beneficiario:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.accommodation}</label>
                  <select className="form-select" value={form.acomodacao||'Apartamento'} onChange={e=>setForm(f=>({...f,acomodacao:e.target.value}))}>
                    {['Apartamento','Enfermaria','—'].map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.validityStart}</label>
                  <input className="form-input" type="date" value={form.inicio||''} onChange={e=>setForm(f=>({...f,inicio:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.validityEnd}</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.monthlyPremium}</label>
                  <input className="form-input" value={form.mensalidade||''} onChange={e=>setForm(f=>({...f,mensalidade:e.target.value}))} placeholder="3.800"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.moeda}</label>
                  <select className="form-select" value={form.moeda||'BRL'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10}}>
                  <input type="checkbox" id="chk-cop" checked={!!form.coparticipacao} onChange={e=>setForm(f=>({...f,coparticipacao:e.target.checked}))} style={{width:15,height:15,cursor:'pointer'}}/>
                  <label htmlFor="chk-cop" style={{fontSize:13,cursor:'pointer'}}>{t.hasCoinsurance}</label>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.notes}</label>
                  <textarea className="form-textarea" rows={2} value={form.obs||''} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Documentos</label>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFile}/>
                  <button type="button" className="btn btn-secondary" onClick={()=>fileRef.current?.click()}>
                    <i className="fas fa-paperclip"/>Anexar arquivo
                  </button>
                  {(form.docs||[]).length > 0 && (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                      {form.docs.map((d,i)=>(
                        <span key={i} style={{display:'flex',alignItems:'center',gap:5,background:'var(--surface-hover)',borderRadius:6,padding:'3px 9px',fontSize:11}}>
                          <i className="fas fa-file" style={{color:'var(--brand)',fontSize:10}}/>{d.nome.length>22?d.nome.slice(0,22)+'…':d.nome}
                          <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',padding:0,marginLeft:2,fontSize:11}} onClick={()=>setForm(f=>({...f,docs:f.docs.filter((_,j)=>j!==i)}))}>×</button>
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

// ── PersonalDocsPage ────────────────────────────────────────
function PersonalDocsPage() {
  const { t, lang, toast } = useApp();
  const [activeTab, setActiveTab] = useState('p-Eduardo');
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [modal, setModal] = useState(null); // 'doc'|'assessor'|'novaPessoa'
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [assessores, setAssessores] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [novaPessoa, setNovaPessoa] = useState({ nome:'', relacao:'', notas:'' });
  const fileRef = useRef(null);
  const docFileRef = useRef(null);

  const today = new Date().toISOString().slice(0,10);
  const in90  = new Date(Date.now() + 90*86400000).toISOString().slice(0,10);
  const in30  = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);

  const ANOS = ['2020','2021','2022','2023','2024','2025','2026'];

  const DEFAULT_PESSOAS = [
    { id:'p-Eduardo', nome:'Eduardo',  relacao:'Titular',  cor:'var(--brand)', bg:'var(--brand-dim)', notas:'',
      cpf:'', rg:'', dataNasc:'', naturalidade:'', nacionalidade:'Brasil',
      ssn:'', passaporteBR:'', passaporteUS:'',
      estadoCivil:'Casado', conjugeNome:'Carla',
      email:'', telefone:'', enderecoBR:'', enderecoUS:'',
      profissao:'Empresário', residenteFiscal:'BR/US',
    },
    { id:'p-Carla', nome:'Carla', relacao:'Cônjuge', cor:'#ec4899', bg:'rgba(236,72,153,.12)', notas:'',
      cpf:'', rg:'', dataNasc:'', naturalidade:'', nacionalidade:'Brasil',
      ssn:'', passaporteBR:'', passaporteUS:'',
      estadoCivil:'Casado', conjugeNome:'Eduardo',
      email:'', telefone:'', enderecoBR:'', enderecoUS:'',
      profissao:'', residenteFiscal:'BR/US',
    },
    { id:'p-Rejane', nome:'Rejane', relacao:'Mãe', cor:'#a855f7', bg:'rgba(168,85,247,.12)', notas:'Dependência fiscal',
      cpf:'', rg:'', dataNasc:'', naturalidade:'', nacionalidade:'Brasil',
      ssn:'', passaporteBR:'', passaporteUS:'',
      estadoCivil:'', conjugeNome:'',
      email:'', telefone:'', enderecoBR:'', enderecoUS:'',
      profissao:'', residenteFiscal:'BR',
    },
  ];

  const load = useCallback(async () => {
    const [docs, emps] = await Promise.all([db.docsPessoais.toArray(), db.empresas.toArray()]);
    setRows(docs);
    setEmpresas(emps);
    const cfgAs  = await db.config.get('assessores');
    const cfgPes = await db.config.get('pessoas');
    setAssessores(cfgAs?.value || DEFAULT_ASSESSORES);
    // Merge: se existem pessoas salvas, garante que os novos campos estejam presentes
    const FICHA_DEFAULTS = { cpf:'', rg:'', dataNasc:'', naturalidade:'', nacionalidade:'', ssn:'', passaporteBR:'', passaporteUS:'', estadoCivil:'', conjugeNome:'', email:'', telefone:'', enderecoBR:'', enderecoUS:'', profissao:'', residenteFiscal:'' };
    const savedPessoas = cfgPes?.value;
    const pessoasComMigration = savedPessoas
      ? savedPessoas.map(p => ({ ...FICHA_DEFAULTS, ...DEFAULT_PESSOAS.find(d=>d.id===p.id)||{}, ...p }))
      : DEFAULT_PESSOAS;
    setPessoas(pessoasComMigration);
  }, []);
  useEffect(() => { load(); }, []);

  async function savePessoas(list) {
    await db.config.put({ chave:'pessoas', value: list });
    setPessoas(list);
  }

  async function addPessoa() {
    if (!novaPessoa.nome.trim()) { toast('Nome obrigatório.','error'); return; }
    const CORES = ['#f97316','#22c55e','#3b82f6','#eab308','#14b8a6','#f43f5e','#8b5cf6'];
    const cor = CORES[pessoas.length % CORES.length];
    const nova = { id: 'p-' + Date.now(), nome: novaPessoa.nome.trim(), relacao: novaPessoa.relacao, notas: novaPessoa.notas, cor, bg: cor+'22' };
    const updated = [...pessoas, nova];
    await savePessoas(updated);
    setNovaPessoa({ nome:'', relacao:'', notas:'' });
    setModal(null);
    setActiveTab(nova.id);
    toast('Pessoa adicionada.','success');
  }

  async function deletePessoa(id) {
    setConfirm({ msg: 'Remover esta pessoa? Os documentos vinculados não serão excluídos.', onConfirm: async () => {
      const updated = pessoas.filter(p => p.id !== id);
      await savePessoas(updated);
      setActiveTab('p-Eduardo');
      setConfirm(null);
      toast('Pessoa removida.','success');
    }});
  }

  // ── helpers ────────────────────────────────────────────────
  const docsFor = (subcategoria) => rows.filter(r => r.subcategoria === subcategoria);

  function alertColor(venc) {
    if (!venc) return null;
    if (venc < today)  return 'var(--red)';
    if (venc <= in30)  return 'var(--yellow)';
    if (venc <= in90)  return 'var(--orange)';
    return null;
  }

  function VencBadge({ venc }) {
    if (!venc) return <span style={{color:'var(--text-muted)',fontSize:11}}>—</span>;
    const c = alertColor(venc);
    return (
      <span style={{fontSize:11,color:c||'var(--text-secondary)',fontWeight:c?700:400}}>
        {c && <i className="fas fa-clock" style={{marginRight:4,fontSize:9}}/>}
        {fmt.date(venc, lang)}
      </span>
    );
  }

  // ── doc file handler ───────────────────────────────────────
  function handleDocFile(e, setter) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(f => ({
      ...f,
      nomeArq: f.nomeArq || file.name,
      tamanho: file.size/1024>1024?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB',
      conteudo: ev.target.result,
    }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function download(r) {
    if (!r.conteudo) { toast('Arquivo não disponível.','error'); return; }
    const a = document.createElement('a'); a.href = r.conteudo; a.download = r.nome || r.nomeArq || 'doc'; a.click();
  }

  // ── doc CRUD ───────────────────────────────────────────────
  function openDoc(subcategoria, pessoa, r) {
    setForm(r ? {...r} : { subcategoria, pessoa, categoria:'Documentos Pessoais', tipo:'PDF', status:'ativo', dataUpload: today });
    setModal('doc');
  }
  async function saveDoc() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.','error'); return; }
    try {
      if (form.id) await db.docsPessoais.update(form.id, form);
      else await db.docsPessoais.add(form);
      await db.auditLog.add({ acao:`Doc pessoal ${form.id?'editado':'adicionado'}: ${form.nome}`, modulo:'Docs Pessoais', timestamp: new Date().toISOString() });
      toast(t.saved,'success'); setModal(null); load();
    } catch { toast(t.errorSave,'error'); }
  }
  function deleteDoc(id, nome) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      await db.docsPessoais.delete(id); toast(t.deleted,'success'); setConfirm(null); load();
    }});
  }

  // ── assessor CRUD ──────────────────────────────────────────
  function openAssessor(r) {
    setForm(r ? {...r} : { id: Date.now(), tipo:'Tax US', contato_nome:'', contato_email:'', contato_phone:'', escopo:'', proxima_reuniao:'', docs:[] });
    setModal('assessor');
  }
  async function saveAssessor() {
    if (!form.nome?.trim()) { toast('Nome obrigatório.','error'); return; }
    const updated = assessores.find(a=>a.id===form.id) ? assessores.map(a=>a.id===form.id?form:a) : [...assessores, form];
    await db.config.put({ chave:'assessores', value: updated });
    toast(t.saved,'success'); setModal(null); load();
  }
  function deleteAssessor(id) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const updated = assessores.filter(a=>a.id!==id);
      await db.config.put({ chave:'assessores', value: updated });
      toast(t.deleted,'success'); setConfirm(null); load();
    }});
  }

  // ── sub-component: doc list card ──────────────────────────
  function DocCard({ subcategoria, pessoa, extraFields }) {
    const [filterAno, setFilterAno] = useState('');
    const [search, setSearch] = useState('');
    const docs = docsFor(subcategoria).filter(r =>
      (!filterAno || (r.dataUpload && r.dataUpload.startsWith(filterAno))) &&
      (!search || r.nome?.toLowerCase().includes(search.toLowerCase()))
    );
    return (
      <div className="card" style={{marginBottom:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <div className="search-bar" style={{minWidth:160,flex:1}}>
              <i className="fas fa-search"/>
              <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="form-select" style={{maxWidth:120}} value={filterAno} onChange={e=>setFilterAno(e.target.value)}>
              <option value="">Todos os anos</option>
              {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{fontSize:12,padding:'6px 14px'}} onClick={()=>openDoc(subcategoria, pessoa, null)}>
            <i className="fas fa-plus"/>{t.add}
          </button>
        </div>
        {docs.length === 0 ? (
          <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
            <i className="fas fa-folder-open" style={{fontSize:20,display:'block',marginBottom:6}}/>Nenhum documento
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>Documento</th>
                {extraFields?.map(f=><th key={f.key}>{f.label}</th>)}
                <th>Vencimento</th>
                <th>Adicionado</th>
                <th>Ações</th>
              </tr></thead>
              <tbody>
                {docs.map(r => {
                  const c = alertColor(r.vencimento);
                  return (
                    <tr key={r.id} style={{opacity: r.status==='vencido'?0.6:1}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <i className={`fas fa-file-${r.tipo==='PDF'?'pdf':r.tipo==='XLSX'?'excel':r.tipo==='DOCX'||r.tipo==='DOC'?'word':'alt'}`} style={{color: r.tipo==='PDF'?'var(--red)':r.tipo==='XLSX'?'var(--green)':'var(--brand)',fontSize:14,flexShrink:0}}/>
                          <div>
                            <div style={{fontWeight:600,color:'var(--text-primary)',fontSize:12}}>{r.nome}</div>
                            {r.descricao && <div style={{fontSize:10,color:'var(--text-muted)'}}>{r.descricao.slice(0,60)}</div>}
                          </div>
                        </div>
                      </td>
                      {extraFields?.map(f=><td key={f.key} style={{fontSize:11,color:'var(--text-secondary)'}}>{r[f.key]||'—'}</td>)}
                      <td>
                        {r.vencimento
                          ? <span style={{fontSize:11,color:c||'var(--text-secondary)',fontWeight:c?700:400}}>{c&&<i className="fas fa-clock" style={{marginRight:3,fontSize:9}}/>}{fmt.date(r.vencimento,lang)}</span>
                          : <span style={{color:'var(--text-muted)',fontSize:11}}>—</span>}
                      </td>
                      <td style={{fontSize:11,color:'var(--text-muted)'}}>{fmt.date(r.dataUpload,lang)}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {r.conteudo && <button className="btn-icon" title="Download" onClick={()=>download(r)}><i className="fas fa-download"/></button>}
                          <button className="btn-icon" title="Editar" onClick={()=>openDoc(subcategoria,pessoa,r)}><i className="fas fa-pen"/></button>
                          <button className="btn-icon danger" title="Excluir" onClick={()=>deleteDoc(r.id,r.nome)}><i className="fas fa-trash"/></button>
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
    );
  }

  // ── TABS definition (pessoas são dinâmicas) ────────────────
  const STATIC_TABS = [
    { key:'greencard',  label: t.greencardImmig, icon:'fa-passport'  },
    { key:'assessores', label: t.advisors,        icon:'fa-handshake' },
    { key:'healthPlan', label: t.healthPlan,      icon:'fa-hospital'  },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.personalDocs}</div>
          <div className="page-header-sub">{rows.length} documentos · {assessores.length} assessores</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:2,marginBottom:24,borderBottom:'1px solid var(--surface-border)',paddingBottom:0,flexWrap:'wrap',alignItems:'flex-end'}}>
        {/* Pessoas dinâmicas */}
        {pessoas.map(p => (
          <button key={p.id} onClick={()=>setActiveTab(p.id)} style={{
            display:'flex',alignItems:'center',gap:7,padding:'9px 16px',
            background:'none',border:'none',cursor:'pointer',
            color: activeTab===p.id ? p.cor : 'var(--text-muted)',
            borderBottom: activeTab===p.id ? `2px solid ${p.cor}` : '2px solid transparent',
            fontFamily:'Lexend,sans-serif',fontWeight:activeTab===p.id?600:400,
            fontSize:12,marginBottom:-1,whiteSpace:'nowrap',transition:'color .15s',
          }}>
            <i className="fas fa-user" style={{fontSize:11}}/>{p.nome}
          </button>
        ))}
        {/* Botão adicionar pessoa */}
        <button onClick={()=>setModal('novaPessoa')} style={{
          display:'flex',alignItems:'center',gap:5,padding:'7px 12px',
          background:'none',border:'1px dashed var(--surface-border)',borderRadius:8,
          cursor:'pointer',color:'var(--text-muted)',fontSize:11,
          marginBottom:4,marginLeft:4,transition:'all .15s',
        }}>
          <i className="fas fa-plus" style={{fontSize:10}}/>Pessoa
        </button>
        {/* Divisor */}
        <div style={{width:1,height:28,background:'var(--surface-border)',margin:'0 6px 4px'}}/>
        {/* Abas estáticas */}
        {STATIC_TABS.map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{
            display:'flex',alignItems:'center',gap:7,padding:'9px 16px',
            background:'none',border:'none',cursor:'pointer',
            color: activeTab===tab.key?'var(--brand)':'var(--text-muted)',
            borderBottom: activeTab===tab.key?'2px solid var(--brand)':'2px solid transparent',
            fontFamily:'Lexend,sans-serif',fontWeight:activeTab===tab.key?600:400,
            fontSize:12,marginBottom:-1,whiteSpace:'nowrap',transition:'color .15s',
          }}>
            <i className={`fas ${tab.icon}`} style={{fontSize:11}}/>{tab.label}
          </button>
        ))}
      </div>

      {/* ── PESSOA (dinâmico) ── */}
      {pessoas.map(p => activeTab === p.id && (
        <div key={p.id} style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* ── Ficha Pessoal ── */}
          <PessoaFichaCard
            p={p}
            pessoas={pessoas}
            savePessoas={savePessoas}
            deletePessoa={deletePessoa}
            lang={lang}
            toast={toast}
          />
          {/* Checklist rápido de docs comuns */}
          <div className="card" style={{padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Status de Documentos</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'7px 16px'}}>
              {['Passaporte BR','Passaporte US','CPF / RG','SSN','Driver\'s License','Green Card','Certidão Nasc.','Certidão Casamento'].map(label => {
                const keywords = label.toLowerCase().split(/[\s\/]+/);
                const r = docsFor(p.nome).find(d => keywords.some(k => d.nome?.toLowerCase().includes(k))) ||
                          rows.filter(d => d.pessoa === p.nome).find(d => keywords.some(k => d.nome?.toLowerCase().includes(k)));
                const c = r?.vencimento ? alertColor(r.vencimento) : null;
                return (
                  <div key={label} style={{display:'flex',alignItems:'center',gap:7,fontSize:12}}>
                    <i className={`fas ${r ? 'fa-circle-check' : 'fa-circle-xmark'}`}
                       style={{color: r ? (c || 'var(--green)') : 'var(--surface-border)', fontSize:12, flexShrink:0}}/>
                    <span style={{color: r ? 'var(--text-primary)' : 'var(--text-muted)'}}>{label}</span>
                    {r?.vencimento && <VencBadge venc={r.vencimento}/>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Documentos */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
              Documentos — {p.nome}
            </div>
            <DocCard subcategoria={p.nome} pessoa={p.nome} extraFields={[{key:'numero',label:'Número'},{key:'descricao',label:'Descrição'}]}/>
          </div>
          {/* Notas livres */}
          <div className="card">
            <div className="card-title"><i className="fas fa-note-sticky" style={{marginRight:8}}/>Notas</div>
            <textarea
              className="form-textarea" rows={3}
              placeholder={`Observações sobre ${p.nome}...`}
              defaultValue={p.notas}
              onBlur={async e => {
                const updated = pessoas.map(x => x.id===p.id ? {...x,notas:e.target.value} : x);
                await savePessoas(updated);
              }}
            />
          </div>
        </div>
      ))}

      {/* ── GREENCARD & IMIGRAÇÃO ── */}
      {activeTab === 'greencard' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Status card */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
            {[
              { label:'Green Card — Eduardo', venc: docsFor('Greencard & Imigração').find(d=>d.nome?.includes('Eduardo'))?.vencimento },
              { label:'Green Card — Carla',   venc: docsFor('Greencard & Imigração').find(d=>d.nome?.includes('Carla'))?.vencimento },
              { label:'EAD',                  venc: docsFor('Greencard & Imigração').find(d=>d.nome?.includes('EAD'))?.vencimento },
              { label:'Passaporte US',        venc: docsFor('Eduardo').find(d=>d.nome?.toLowerCase().includes('us passport') || d.nome?.toLowerCase().includes('passaporte us'))?.vencimento },
            ].map(item => {
              const c = alertColor(item.venc);
              return (
                <div key={item.label} className="card" style={{padding:'14px 18px',borderColor: c?c+'55':'var(--surface-border)'}}>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>{item.label}</div>
                  {item.venc
                    ? <div style={{fontSize:15,fontWeight:700,color:c||'var(--green)'}}>{fmt.date(item.venc,lang)}</div>
                    : <div style={{fontSize:13,color:'var(--text-muted)'}}>Sem registro</div>}
                </div>
              );
            })}
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Documentos de Imigração</div>
            <DocCard subcategoria="Greencard & Imigração" pessoa="Eduardo" extraFields={[{key:'numero',label:'Número'},{key:'advogado',label:'Advogado'}]}/>
          </div>
          {/* Obrigações */}
          <ProximasObrigacoes alertColor={alertColor} fmt={fmt} lang={lang} t={t} toast={toast}/>
        </div>
      )}

      {/* ── ASSESSORES ── */}
      {activeTab === 'assessores' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={()=>openAssessor(null)}><i className="fas fa-plus"/>{t.newAdvisor}</button>
          </div>
          {assessores.length === 0 ? (
            <div className="empty-state card"><i className="fas fa-handshake"/><p>Nenhum assessor cadastrado.</p></div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
              {assessores.map(a => {
                const reunAlert = a.proxima_reuniao && alertColor(a.proxima_reuniao);
                const TYPE_COLOR = { 'Tax US':'blue','Tax BR':'green','Legal US':'blue','Legal BR':'green','Contabilidade':'yellow','Imigração':'brand' };
                const tc = TYPE_COLOR[a.tipo] || 'brand';
                return (
                  <div key={a.id} className="card" style={{padding:'18px 20px'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:3}}>{a.nome}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{a.escritorio||'—'}</div>
                        <span className={`badge badge-${tc}`} style={{fontSize:10,marginTop:4}}>{a.tipo}</span>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" onClick={()=>openAssessor(a)}><i className="fas fa-pen"/></button>
                        <button className="btn-icon danger" onClick={()=>deleteAssessor(a.id)}><i className="fas fa-trash"/></button>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:12,color:'var(--text-secondary)',marginBottom:10}}>
                      {a.contato_nome  && <div><i className="fas fa-user"   style={{width:16,color:'var(--brand)'}}/>  {a.contato_nome}</div>}
                      {a.contato_email && <div><i className="fas fa-envelope" style={{width:16,color:'var(--brand)'}}/>  {a.contato_email}</div>}
                      {a.contato_phone && <div><i className="fas fa-phone"   style={{width:16,color:'var(--brand)'}}/>  {a.contato_phone}</div>}
                    </div>
                    {a.escopo && <div style={{fontSize:11,color:'var(--text-muted)',background:'var(--surface-hover)',borderRadius:6,padding:'6px 10px',marginBottom:8}}>{a.escopo}</div>}
                    {a.proxima_reuniao && (
                      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:reunAlert||'var(--text-secondary)',marginBottom:(a.docs||[]).length>0?6:0}}>
                        <i className="fas fa-calendar-check" style={{fontSize:11}}/> Próxima reunião: {fmt.date(a.proxima_reuniao,lang)}
                      </div>
                    )}
                    {(a.docs||[]).length > 0 && (
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                        {(a.docs||[]).map((d,i) => (
                          <button key={i} type="button" onClick={()=>download(d)}
                            style={{display:'flex',alignItems:'center',gap:5,background:'var(--surface-hover)',border:'1px solid var(--surface-border)',borderRadius:6,padding:'3px 9px',cursor:'pointer',fontSize:11,color:'var(--text-secondary)'}}>
                            <i className={`fas fa-file-${d.tipo==='PDF'?'pdf':d.tipo==='XLSX'?'excel':'alt'}`} style={{color:'var(--brand)',fontSize:10}}/>
                            {d.nome.length>22?d.nome.slice(0,22)+'…':d.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PLANO DE SAÚDE ── */}
      {activeTab === 'healthPlan' && (
        <HealthPlanTab lang={lang} toast={toast} t={t} />
      )}

      {/* ── MODALS ── */}
      {/* Nova Pessoa modal */}
      {modal === 'novaPessoa' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-user-plus" style={{marginRight:8}}/>Nova Pessoa</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={novaPessoa.nome||''} onChange={e=>setNovaPessoa(p=>({...p,nome:e.target.value}))} placeholder="Ex: Ana, Pedro..."/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Relação / Parentesco</label>
                  <input className="form-input" value={novaPessoa.relacao||''} onChange={e=>setNovaPessoa(p=>({...p,relacao:e.target.value}))} placeholder="Ex: Filho, Sócio, Dependente..."/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Cor (personalização)</label>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {['#6470f1','#ec4899','#a855f7','#22c55e','#f97316','#14b8a6','#eab308','#ef4444'].map(c=>(
                      <button key={c} type="button" onClick={()=>setNovaPessoa(p=>({...p,cor:c}))}
                        style={{width:26,height:26,borderRadius:'50%',background:c,border:novaPessoa.cor===c?'2px solid #fff':'2px solid transparent',cursor:'pointer',padding:0,outline:'none'}}/>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Notas iniciais</label>
                  <textarea className="form-textarea" rows={2} value={novaPessoa.notas||''} onChange={e=>setNovaPessoa(p=>({...p,notas:e.target.value}))} placeholder="Observações, CPF, vínculo..."/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={addPessoa} disabled={!novaPessoa.nome?.trim()}>
                <i className="fas fa-user-plus"/>Adicionar Pessoa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doc modal */}
      {modal === 'doc' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:580}}>
            <div className="modal-header">
              <div className="modal-title">{form.id?'Editar Documento':'Novo Documento'} — {form.subcategoria}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Passaporte Brasileiro"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Número do Documento</label>
                  <input className="form-input" value={form.numero||''} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} placeholder="Ex: BR123456"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.tipo||'PDF'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    {['PDF','DOC','DOCX','JPG','PNG','XLSX','Outro'].map(tp=><option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Adição</label>
                  <input className="form-input" type="date" value={form.dataUpload||''} onChange={e=>setForm(f=>({...f,dataUpload:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimento</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.description}</label>
                  <textarea className="form-textarea" rows={2} value={form.descricao||''} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
                    Arquivo
                    <button type="button" className="btn btn-secondary" style={{fontSize:11,padding:'3px 10px'}} onClick={()=>docFileRef.current?.click()}><i className="fas fa-upload"/>Selecionar</button>
                  </label>
                  <input ref={docFileRef} type="file" style={{display:'none'}} onChange={e=>handleDocFile(e, setForm)}/>
                  {form.conteudo
                    ? <div style={{fontSize:12,color:'var(--green)',padding:'6px 0'}}><i className="fas fa-check" style={{marginRight:6}}/>Arquivo: {form.nomeArq||form.nome} ({form.tamanho})</div>
                    : <div style={{fontSize:12,color:'var(--text-muted)',padding:'6px 0'}}>Nenhum arquivo selecionado</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveDoc}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assessor modal */}
      {modal === 'assessor' && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <div className="modal-header">
              <div className="modal-title">{form.id && assessores.find(a=>a.id===form.id) ? t.editAdvisor : t.newAdvisor}</div>
              <button className="modal-close" onClick={()=>setModal(null)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nome <span style={{color:'var(--red)'}}>*</span></label>
                  <input className="form-input" value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: John Smith"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.office}</label>
                  <input className="form-input" value={form.escritorio||''} onChange={e=>setForm(f=>({...f,escritorio:e.target.value}))} placeholder="Ex: Deloitte US"/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.type}</label>
                  <select className="form-select" value={form.tipo||'Tax US'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    {['Tax US','Tax BR','Legal US','Legal BR','Contabilidade','Imigração','Wealth Management','Outro'].map(tp=><option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.nextMeeting}</label>
                  <input className="form-input" type="date" value={form.proxima_reuniao||''} onChange={e=>setForm(f=>({...f,proxima_reuniao:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={form.contato_email||''} onChange={e=>setForm(f=>({...f,contato_email:e.target.value}))} placeholder="assessor@firma.com"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={form.contato_phone||''} onChange={e=>setForm(f=>({...f,contato_phone:e.target.value}))} placeholder="+1 305 555-0100"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t.scope}</label>
                  <textarea className="form-textarea" rows={2} value={form.escopo||''} onChange={e=>setForm(f=>({...f,escopo:e.target.value}))} placeholder="Ex: Grupo Meridian, Alvo Properties — planejamento fiscal federal"/>
                </div>
                {/* Documentos: Contrato + LOE */}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    Documentos (Contrato, LOE)
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
              <button className="btn btn-primary" onClick={saveAssessor}><i className="fas fa-floppy-disk"/>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
