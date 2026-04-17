// ── Organograma ──────────────────────────────────────────────
const NODE_W = 172;
const NODE_H = 88;
const LEVEL_GAP_Y = 140;
const SIBLING_GAP_X = 24;

const PRESET_COLORS = [
  { label: 'Índigo',   bg: '#3730a3', border: '#6470f1' },
  { label: 'Esmeralda',bg: '#065f46', border: '#10b981' },
  { label: 'Âmbar',   bg: '#78350f', border: '#f59e0b' },
  { label: 'Rosa',     bg: '#831843', border: '#ec4899' },
  { label: 'Ciano',    bg: '#164e63', border: '#06b6d4' },
  { label: 'Cinza',    bg: '#1e2535', border: '#475569' },
  { label: 'Vermelho', bg: '#7f1d1d', border: '#ef4444' },
  { label: 'Violeta',  bg: '#4c1d95', border: '#8b5cf6' },
];

// Calcula posições X/Y para cada nó via tree layout manual
// Suporta múltiplas raízes (árvores soltas), renderizando lado a lado
function computeLayout(nodes) {
  if (!nodes.length) return {};

  const nodeIds = new Set(nodes.map(n => n.id));
  const childrenOf = id => nodes.filter(n => n.parentId === id);

  // Nós raiz: sem parentId OU cujo pai não existe nesta empresa
  const roots = nodes.filter(n => !n.parentId || !nodeIds.has(n.parentId));
  if (!roots.length) return {};

  // Pós-ordem: calcula largura de cada sub-árvore
  function subtreeWidth(node) {
    const kids = childrenOf(node.id);
    if (!kids.length) return NODE_W;
    const kidsTotal = kids.reduce((s, k) => s + subtreeWidth(k), 0) + SIBLING_GAP_X * (kids.length - 1);
    return Math.max(NODE_W, kidsTotal);
  }

  const positions = {};
  function place(node, left, depth) {
    const kids = childrenOf(node.id);
    const sw = subtreeWidth(node);
    const cx = left + sw / 2;
    positions[node.id] = { x: cx - NODE_W / 2, y: depth * LEVEL_GAP_Y + 20 };
    if (kids.length) {
      let childLeft = left;
      kids.forEach(k => {
        place(k, childLeft, depth + 1);
        childLeft += subtreeWidth(k) + SIBLING_GAP_X;
      });
    }
  }

  // Posiciona cada árvore raiz lado a lado com gap entre elas
  const ROOT_GAP = 48;
  let cursor = 0;
  roots.forEach(root => {
    const sw = subtreeWidth(root);
    place(root, cursor, 0);
    cursor += sw + ROOT_GAP;
  });

  return positions;
}

// Linha curva entre centro-inferior do pai e centro-superior do filho
function edgePath(px, py, cx, cy) {
  const mx = px, my = (py + cy) / 2;
  return `M${px},${py} C${mx},${my} ${cx},${my} ${cx},${cy}`;
}

function sanitizeSvg(raw) {
  // Strip script tags and event handlers to prevent XSS
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

function OrgNodeCard({ node, pos, isSelected, onSelect, onEdit, onDelete, onAddChild, onDragStart }) {
  const bg     = node.cor     || '#1e2535';
  const border = node.corBorda|| '#3b82f6';
  const isRoot = !node.parentId;

  // Render the avatar area: SVG icon > photo > initials fallback
  function renderAvatar() {
    if (node.svgIcon) {
      return (
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: border + '22',
          border: `2px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}
          dangerouslySetInnerHTML={{ __html: node.svgIcon }}
        />
      );
    }
    if (node.foto) {
      return (
        <img
          src={node.foto}
          alt={node.nome}
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: `2px solid ${border}`, flexShrink: 0 }}
        />
      );
    }
    return (
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: border + '33',
        border: `2px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0,
      }}>
        {fmt.initials(node.nome)}
      </div>
    );
  }

  return (
    <div
      onMouseDown={e => { if (onDragStart) onDragStart(e, node.id, pos.x, pos.y); }}
      onClick={e => { e.stopPropagation(); onSelect(node.id); }}
      style={{
        position: 'absolute',
        left: pos.x, top: pos.y,
        width: NODE_W, height: NODE_H,
        background: bg,
        border: `2px solid ${isSelected ? '#fff' : border}`,
        borderRadius: 14,
        cursor: 'grab',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: isSelected ? `0 0 0 3px ${border}55, 0 8px 24px #0006` : '0 4px 14px #0004',
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        userSelect: 'none',
        zIndex: isSelected ? 10 : 1,
      }}
    >
      {/* Avatar / SVG icon / Foto */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        {renderAvatar()}
        {isRoot && (
          <div style={{ position:'absolute', top:-6, right:-6, width:16, height:16, borderRadius:'50%', background:'#f59e0b', border:'2px solid #0f1117', display:'flex',alignItems:'center',justifyContent:'center' }}>
            <i className="fas fa-crown" style={{ fontSize:7, color:'#fff' }}/>
          </div>
        )}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:12, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {node.nome || 'Sem nome'}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>
          {node.cargo || '—'}
        </div>
        {node.texto && (
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {node.texto}
          </div>
        )}
      </div>

      {/* Action buttons — só quando selecionado */}
      {isSelected && (
        <div
          style={{ position:'absolute', top:-16, right:0, display:'flex', gap:4, zIndex:20 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="btn btn-ghost btn-sm" style={{ padding:'3px 7px', fontSize:11 }} onClick={() => onEdit(node)} title="Editar">
            <i className="fas fa-pen"/>
          </button>
          <button className="btn btn-success btn-sm" style={{ padding:'3px 7px', fontSize:11 }} onClick={() => onAddChild(node)} title="Adicionar subordinado">
            <i className="fas fa-plus"/>
          </button>
          {true && (
            <button className="btn btn-danger btn-sm" style={{ padding:'3px 7px', fontSize:11 }} onClick={() => onDelete(node)} title="Excluir">
              <i className="fas fa-trash"/>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OrgEditModal({ node, empresas, allNodes, onSave, onCancel }) {
  const [form, setForm] = useState({ ...node });
  const fileRef = useRef(null);

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, foto: ev.target.result }));
    reader.readAsDataURL(file);
  }

  const F = ({ label, field, type='text', opts=null, full=false }) => (
    <div className="form-group" style={full ? { gridColumn:'1/-1' } : {}}>
      <label className="form-label">{label}</label>
      {opts ? (
        <select className="form-select" value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
          <option value="">— nenhum —</option>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/>
      )}
    </div>
  );

  const possibleParents = allNodes.filter(n => n.id !== node.id);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="fas fa-pen-to-square" style={{ marginRight:8, color:'var(--brand)' }}/>
          {node.id ? 'Editar Bloco' : 'Novo Bloco'}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <F label="Nome" field="nome" full/>
          <F label="Cargo / Título" field="cargo"/>
          <F label="Empresa" field="empresaId" opts={empresas.map(e=>({v:e.id,l:e.nome}))}/>
          <F label="Texto adicional" field="texto" full/>
          {!node._isNew && possibleParents.length > 0 && (
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Reporta a (pai)</label>
              <select className="form-select" value={form.parentId||''} onChange={e=>setForm(f=>({...f,parentId:e.target.value?Number(e.target.value):null}))}>
                <option value="">— raiz —</option>
                {possibleParents.map(n=><option key={n.id} value={n.id}>{n.nome} ({n.cargo})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Ícone SVG */}
        <div className="form-group">
          <label className="form-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Ícone SVG <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>(cole o código SVG aqui)</span></span>
            {form.svgIcon && (
              <button type="button" className="btn btn-danger btn-sm" style={{ padding:'2px 8px', fontSize:11 }} onClick={() => setForm(f=>({...f,svgIcon:''}))}>
                <i className="fas fa-times"/>Remover
              </button>
            )}
          </label>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <textarea
              className="form-textarea"
              rows={3}
              style={{ fontFamily:'monospace', fontSize:11, flex:1 }}
              placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'}
              value={form.svgIcon || ''}
              onChange={e => {
                const cleaned = sanitizeSvg(e.target.value);
                // Auto-size the SVG to fit the avatar box
                const sized = cleaned.replace(/<svg/, '<svg width="28" height="28"');
                setForm(f => ({ ...f, svgIcon: sized }));
              }}
            />
            {form.svgIcon ? (
              <div style={{
                width:52, height:52, borderRadius:10, flexShrink:0,
                background:'var(--surface-hover)', border:'2px solid var(--surface-border)',
                display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
              }}
                dangerouslySetInnerHTML={{ __html: form.svgIcon }}
              />
            ) : (
              <div style={{ width:52, height:52, borderRadius:10, flexShrink:0, background:'var(--surface)', border:'2px dashed var(--surface-border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
                <i className="fas fa-image" style={{ fontSize:18 }}/>
              </div>
            )}
          </div>
        </div>

        {/* Foto */}
        <div className="form-group">
          <label className="form-label">Foto <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>(usada se não houver ícone SVG)</span></label>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {form.foto ? (
              <img src={form.foto} alt="preview" style={{ width:52, height:52, borderRadius:10, objectFit:'cover', border:'2px solid var(--surface-border)' }}/>
            ) : (
              <div style={{ width:52, height:52, borderRadius:10, background:'var(--surface)', border:'2px dashed var(--surface-border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
                <i className="fas fa-user" style={{ fontSize:20 }}/>
              </div>
            )}
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <i className="fas fa-upload"/>Carregar foto
              </button>
              {form.foto && (
                <button className="btn btn-danger btn-sm" style={{ marginLeft:6 }} onClick={() => setForm(f=>({...f,foto:null}))}>
                  <i className="fas fa-times"/>Remover
                </button>
              )}
              <input type="file" ref={fileRef} accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
            </div>
          </div>
        </div>

        {/* Cor do bloco */}
        <div className="form-group">
          <label className="form-label">Cor do bloco</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
            {PRESET_COLORS.map(c => (
              <div
                key={c.label}
                title={c.label}
                onClick={() => setForm(f => ({ ...f, cor: c.bg, corBorda: c.border }))}
                style={{
                  width:28, height:28, borderRadius:8, cursor:'pointer',
                  background: c.bg, border: `3px solid ${c.border}`,
                  boxShadow: (form.cor===c.bg) ? `0 0 0 2px #fff` : 'none',
                  transition: 'box-shadow .1s',
                }}
              />
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div>
              <label className="form-label" style={{ marginBottom:3 }}>Fundo custom</label>
              <input type="color" value={form.cor||'#1e2535'} onChange={e=>setForm(f=>({...f,cor:e.target.value}))}
                style={{ width:44, height:32, borderRadius:8, border:'1px solid var(--surface-border)', cursor:'pointer', background:'none', padding:2 }}/>
            </div>
            <div>
              <label className="form-label" style={{ marginBottom:3 }}>Borda custom</label>
              <input type="color" value={form.corBorda||'#3b82f6'} onChange={e=>setForm(f=>({...f,corBorda:e.target.value}))}
                style={{ width:44, height:32, borderRadius:8, border:'1px solid var(--surface-border)', cursor:'pointer', background:'none', padding:2 }}/>
            </div>
            {/* Preview */}
            <div style={{ marginLeft:'auto', width:60, height:40, borderRadius:10, background:form.cor||'#1e2535', border:`2px solid ${form.corBorda||'#3b82f6'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:10, color:'#fff', opacity:.7 }}>preview</span>
            </div>
          </div>
        </div>

        <hr className="divider"/>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            <i className="fas fa-check"/>Salvar bloco
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Annotation System ─────────────────────────────────
// Tipos de anotação: 'texto' | 'icone' | 'seta' | 'borda'
// Armazenado em db.orgTexts (empresa) ou db.config key (estrutura)

const FA_ICONS = [
  'fa-star','fa-circle-exclamation','fa-triangle-exclamation','fa-circle-check',
  'fa-circle-xmark','fa-circle-info','fa-flag','fa-bookmark','fa-tag',
  'fa-crown','fa-lock','fa-unlock','fa-key','fa-shield-halved',
  'fa-building','fa-globe','fa-money-bill','fa-handshake','fa-file-contract',
  'fa-scale-balanced','fa-gavel','fa-briefcase','fa-chart-line','fa-percent',
  'fa-arrow-right','fa-arrow-left','fa-arrow-up','fa-arrow-down',
  'fa-link','fa-ban','fa-clock','fa-calendar','fa-eye',
];

function OrgIconNode({ item, isSelected, onSelect, onUpdate, onDelete, zoom }) {
  const dragRef = useRef(null);
  function startDrag(e) {
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y };
    function mv(ev) {
      if (!dragRef.current) return;
      onUpdate({ ...item, x: dragRef.current.ox + (ev.clientX - dragRef.current.sx)/zoom, y: dragRef.current.oy + (ev.clientY - dragRef.current.sy)/zoom });
    }
    function up() { dragRef.current = null; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); }
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  }
  return (
    <div onMouseDown={startDrag} onClick={e=>{e.stopPropagation();onSelect(item.id);}}
      style={{ position:'absolute', left:item.x, top:item.y, zIndex: isSelected?15:3,
        display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'grab', userSelect:'none' }}>
      <div style={{ width: item.size||40, height: item.size||40, borderRadius:10,
        background: (item.bgColor||'transparent') === 'transparent' ? 'transparent' : item.bgColor+'33',
        border: isSelected ? '1.5px dashed var(--brand)' : `1.5px solid ${item.cor||'var(--brand)'}44`,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <i className={`fas ${item.icon||'fa-star'}`} style={{ fontSize:(item.size||40)*0.45, color: item.cor||'var(--brand)' }}/>
      </div>
      {item.label && <div style={{ fontSize:10, color: item.cor||'var(--text-muted)', whiteSpace:'nowrap', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</div>}
      {isSelected && (
        <div style={{ position:'absolute', top:-30, left:0, display:'flex', gap:3, zIndex:20 }} onClick={e=>e.stopPropagation()}>
          <input type="color" value={item.cor||'#6470f1'} title="Cor"
            onChange={e=>onUpdate({...item,cor:e.target.value})}
            style={{width:20,height:20,borderRadius:4,border:'1px solid var(--surface-border)',cursor:'pointer',padding:1,background:'none'}}/>
          <button className="btn btn-ghost btn-sm" style={{padding:'1px 5px',fontSize:9}} title="Menor" onClick={()=>onUpdate({...item,size:Math.max(16,(item.size||40)-6)})}>−</button>
          <button className="btn btn-ghost btn-sm" style={{padding:'1px 5px',fontSize:9}} title="Maior" onClick={()=>onUpdate({...item,size:Math.min(80,(item.size||40)+6)})}>+</button>
          <button className="btn btn-danger btn-sm" style={{padding:'1px 5px',fontSize:9}} onClick={()=>onDelete(item.id)}><i className="fas fa-trash"/></button>
        </div>
      )}
    </div>
  );
}

function OrgArrowNode({ item, isSelected, onSelect, onUpdate, onDelete, zoom, snapTargets }) {
  const dragHeadRef = useRef(null);
  const dragTailRef = useRef(null);
  const dragBodyRef = useRef(null);
  const [snapHighlight, setSnapHighlight] = useState(null); // id of hovered snap target

  const SNAP_RADIUS = 44; // px in canvas coords

  // Resolve endpoints: if connected to a block, use its center
  function resolvePoint(cx, cy, connId) {
    if (!connId || !snapTargets) return { x: cx||0, y: cy||0 };
    const t = snapTargets.find(s => s.id === connId);
    return t ? { x: t.cx, y: t.cy } : { x: cx||0, y: cy||0 };
  }

  const p1 = resolvePoint(item.x1, item.y1, item.fromId);
  const p2 = resolvePoint(item.x2, item.y2, item.toId);
  const x1=p1.x, y1=p1.y, x2=p2.x, y2=p2.y;
  const color = item.cor||'#6470f1';
  const markerId = `arrow-${item.id}`;

  function findSnap(cx, cy) {
    if (!snapTargets) return null;
    let best = null, bestD = SNAP_RADIUS;
    for (const t of snapTargets) {
      const d = Math.sqrt((t.cx-cx)**2+(t.cy-cy)**2);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  function dragEndpoint(ref, endpoint) {
    return function startDrag(e) {
      e.stopPropagation(); e.preventDefault();
      ref.current = { sx: e.clientX, sy: e.clientY,
        ox: endpoint==='tail' ? (item.x1||0) : (item.x2||100),
        oy: endpoint==='tail' ? (item.y1||0) : (item.y2||0) };
      function mv(ev) {
        if (!ref.current) return;
        const dx = (ev.clientX - ref.current.sx) / zoom;
        const dy = (ev.clientY - ref.current.sy) / zoom;
        const nx = ref.current.ox + dx, ny = ref.current.oy + dy;
        const snap = findSnap(nx, ny);
        setSnapHighlight(snap ? snap.id : null);
        if (endpoint === 'tail') onUpdate({...item, fromId:null, x1:nx, y1:ny});
        else                     onUpdate({...item, toId:null,   x2:nx, y2:ny});
      }
      function up(ev) {
        if (!ref.current) return;
        const dx = (ev.clientX - ref.current.sx) / zoom;
        const dy = (ev.clientY - ref.current.sy) / zoom;
        const nx = ref.current.ox + dx, ny = ref.current.oy + dy;
        const snap = findSnap(nx, ny);
        setSnapHighlight(null);
        ref.current = null;
        if (snap) {
          if (endpoint==='tail') onUpdate({...item, fromId:snap.id, x1:snap.cx, y1:snap.cy});
          else                   onUpdate({...item, toId:snap.id,   x2:snap.cx, y2:snap.cy});
        }
        window.removeEventListener('mousemove', mv);
        window.removeEventListener('mouseup', up);
      }
      window.addEventListener('mousemove', mv);
      window.addEventListener('mouseup', up);
    };
  }

  function dragBody(ref) {
    return function startDrag(e) {
      e.stopPropagation(); e.preventDefault();
      ref.current = { sx: e.clientX, sy: e.clientY, ox1:item.x1||0, oy1:item.y1||0, ox2:item.x2||100, oy2:item.y2||0 };
      function mv(ev) {
        if (!ref.current) return;
        const dx = (ev.clientX - ref.current.sx) / zoom;
        const dy = (ev.clientY - ref.current.sy) / zoom;
        onUpdate({...item, fromId:null, toId:null,
          x1: ref.current.ox1+dx, y1: ref.current.oy1+dy,
          x2: ref.current.ox2+dx, y2: ref.current.oy2+dy });
      }
      function up() { ref.current=null; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); }
      window.addEventListener('mousemove', mv);
      window.addEventListener('mouseup', up);
    };
  }

  const svgPad = 24;
  const minX=Math.min(x1,x2)-svgPad, minY=Math.min(y1,y2)-svgPad;
  const svgW=Math.max(Math.abs(x2-x1)+svgPad*2, 1), svgH=Math.max(Math.abs(y2-y1)+svgPad*2, 1);
  const lx1=x1-minX, ly1=y1-minY, lx2=x2-minX, ly2=y2-minY;

  return (
    <>
      {/* Snap highlight rings — rendered behind everything */}
      {isSelected && snapTargets && snapTargets.map(t => (
        <div key={t.id} style={{
          position:'absolute', left: t.cx-20, top: t.cy-20, width:40, height:40,
          borderRadius:'50%', pointerEvents:'none', zIndex:1,
          border: snapHighlight===t.id
            ? '2px solid var(--brand)' : '1.5px dashed rgba(100,112,241,.3)',
          background: snapHighlight===t.id ? 'rgba(100,112,241,.12)' : 'transparent',
          transition:'background .1s, border-color .1s',
        }}/>
      ))}

      <div onClick={e=>{e.stopPropagation();onSelect(item.id);}}
        style={{ position:'absolute', left:minX, top:minY, width:svgW, height:svgH, zIndex:isSelected?15:2, cursor:'pointer', userSelect:'none' }}>
        <svg width={svgW} height={svgH} style={{overflow:'visible',pointerEvents:'none'}}>
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color}/>
            </marker>
          </defs>
          {/* Invisible thick stroke for easier clicking */}
          <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="transparent" strokeWidth={12} style={{pointerEvents:'stroke',cursor:'pointer'}}/>
          <line x1={lx1} y1={ly1} x2={lx2} y2={ly2}
            stroke={color} strokeWidth={item.espessura||2}
            strokeDasharray={item.tracejado?'8 4':'none'}
            markerEnd={item.semPonta ? undefined : `url(#${markerId})`}
            style={{pointerEvents:'none'}}/>
          {isSelected && <>
            {/* Tail handle */}
            <circle cx={lx1} cy={ly1} r={7} fill={item.fromId ? color : 'var(--surface-card)'}
              stroke={color} strokeWidth={2}
              style={{cursor:'crosshair',pointerEvents:'all'}}
              onMouseDown={dragEndpoint(dragTailRef,'tail')}/>
            {/* Head handle */}
            <circle cx={lx2} cy={ly2} r={7} fill={item.toId ? color : 'var(--surface-card)'}
              stroke={color} strokeWidth={2}
              style={{cursor:'crosshair',pointerEvents:'all'}}
              onMouseDown={dragEndpoint(dragHeadRef,'head')}/>
          </>}
        </svg>
        {/* Body drag */}
        <div onMouseDown={dragBody(dragBodyRef)}
          style={{position:'absolute',left:lx1+(lx2-lx1)/2-12,top:ly1+(ly2-ly1)/2-12,
            width:24,height:24,borderRadius:'50%',
            background:isSelected?color+'33':'transparent',cursor:'grab'}}/>
        {isSelected && (
          <div style={{position:'absolute',left:0,top:-34,display:'flex',gap:3,zIndex:20,background:'var(--surface-card)',borderRadius:8,padding:'3px 4px',border:'1px solid var(--surface-border)'}} onClick={e=>e.stopPropagation()}>
            <input type="color" value={item.cor||'#6470f1'} onChange={e=>onUpdate({...item,cor:e.target.value})}
              style={{width:20,height:20,borderRadius:4,border:'1px solid var(--surface-border)',cursor:'pointer',padding:1,background:'none'}}/>
            <button className="btn btn-ghost btn-sm" style={{padding:'1px 6px',fontSize:9}} title="Inverter direção"
              onClick={()=>onUpdate({...item, x1:item.x2, y1:item.y2, x2:item.x1, y2:item.y1, fromId:item.toId, toId:item.fromId})}>
              <i className="fas fa-right-left"/>
            </button>
            <button className={`btn btn-sm ${item.semPonta?'btn-primary':'btn-ghost'}`} style={{padding:'1px 6px',fontSize:9}} title={item.semPonta?'Com ponta':'Sem ponta'}
              onClick={()=>onUpdate({...item, semPonta:!item.semPonta})}>
              <i className="fas fa-minus"/>
            </button>
            <button className="btn btn-ghost btn-sm" style={{padding:'1px 6px',fontSize:9}} title="Tracejado" onClick={()=>onUpdate({...item,tracejado:!item.tracejado})}>
              <i className={`fas fa-${item.tracejado?'grip-lines':'minus'}`}/>
            </button>
            <button className="btn btn-ghost btn-sm" style={{padding:'1px 5px',fontSize:9}} onClick={()=>onUpdate({...item,espessura:Math.min(6,(item.espessura||2)+1)})}>+</button>
            <button className="btn btn-ghost btn-sm" style={{padding:'1px 5px',fontSize:9}} onClick={()=>onUpdate({...item,espessura:Math.max(1,(item.espessura||2)-1)})}>−</button>
            {(item.fromId||item.toId) && (
              <button className="btn btn-ghost btn-sm" style={{padding:'1px 6px',fontSize:9}} title="Desconectar"
                onClick={()=>onUpdate({...item,fromId:null,toId:null})}>
                <i className="fas fa-unlink"/>
              </button>
            )}
            <button className="btn btn-danger btn-sm" style={{padding:'1px 5px',fontSize:9}} onClick={()=>onDelete(item.id)}><i className="fas fa-trash"/></button>
          </div>
        )}
      </div>
    </>
  );
}

function OrgBorderNode({ item, isSelected, onSelect, onUpdate, onDelete, zoom }) {
  const dragRef=useRef(null);
  const resizeRef=useRef(null);
  function startDrag(e) {
    e.stopPropagation(); e.preventDefault();
    dragRef.current={sx:e.clientX,sy:e.clientY,ox:item.x,oy:item.y};
    function mv(ev){if(!dragRef.current)return;onUpdate({...item,x:dragRef.current.ox+(ev.clientX-dragRef.current.sx)/zoom,y:dragRef.current.oy+(ev.clientY-dragRef.current.sy)/zoom});}
    function up(){dragRef.current=null;window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);}
    window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up);
  }
  function startResize(e) {
    e.stopPropagation(); e.preventDefault();
    resizeRef.current={sx:e.clientX,sy:e.clientY,ow:item.w||200,oh:item.h||120};
    function mv(ev){if(!resizeRef.current)return;onUpdate({...item,w:Math.max(60,resizeRef.current.ow+(ev.clientX-resizeRef.current.sx)/zoom),h:Math.max(40,resizeRef.current.oh+(ev.clientY-resizeRef.current.sy)/zoom)});}
    function up(){resizeRef.current=null;window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);}
    window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up);
  }
  const bc=item.cor||'#6470f1';
  const style_map={solida:'none',tracejada:'6 3',pontilhada:'2 4'};
  return (
    <div onMouseDown={startDrag} onClick={e=>{e.stopPropagation();onSelect(item.id);}}
      style={{ position:'absolute', left:item.x, top:item.y, width:item.w||200, height:item.h||120,
        border:`${item.espessura||2}px ${item.estilo==='tracejada'?'dashed':item.estilo==='pontilhada'?'dotted':'solid'} ${bc}`,
        borderRadius:item.raio||12,
        background: item.fundo ? bc+'14' : 'transparent',
        zIndex:isSelected?14:1, cursor:'grab', userSelect:'none',
      }}>
      {item.label && (
        <div style={{position:'absolute',top:-12,left:8,background:'var(--surface-card)',padding:'1px 8px',borderRadius:4,fontSize:11,fontWeight:700,color:bc}}>{item.label}</div>
      )}
      {/* Resize handle */}
      <div onMouseDown={startResize}
        style={{position:'absolute',bottom:0,right:0,width:14,height:14,cursor:'se-resize',
          borderTop:`2px solid ${bc}`,borderLeft:`2px solid ${bc}`,borderRadius:'0 0 4px 0',
          background:'transparent'}}/>
      {isSelected && (
        <div style={{position:'absolute',top:-34,left:0,display:'flex',gap:3,zIndex:20}} onClick={e=>e.stopPropagation()}>
          <input type="color" value={item.cor||'#6470f1'} onChange={e=>onUpdate({...item,cor:e.target.value})}
            style={{width:20,height:20,borderRadius:4,border:'1px solid var(--surface-border)',cursor:'pointer',padding:1,background:'none'}}/>
          <select value={item.estilo||'solida'} onChange={e=>onUpdate({...item,estilo:e.target.value})}
            style={{fontSize:10,background:'var(--surface-card)',border:'1px solid var(--surface-border)',color:'var(--text-primary)',borderRadius:4,padding:'1px 4px',height:20}}>
            <option value="solida">─────</option>
            <option value="tracejada">- - -</option>
            <option value="pontilhada">· · ·</option>
          </select>
          <button className="btn btn-ghost btn-sm" style={{padding:'1px 5px',fontSize:9}} title="Fundo" onClick={()=>onUpdate({...item,fundo:!item.fundo})}>
            <i className={`fas fa-${item.fundo?'square':'square-dashed'}`}/>
          </button>
          <input value={item.label||''} onChange={e=>onUpdate({...item,label:e.target.value})}
            placeholder="Label..." style={{fontSize:10,width:70,background:'var(--surface)',border:'1px solid var(--surface-border)',color:'var(--text-primary)',borderRadius:4,padding:'1px 5px',height:20}} onClick={e=>e.stopPropagation()}/>
          <button className="btn btn-danger btn-sm" style={{padding:'1px 5px',fontSize:9}} onClick={()=>onDelete(item.id)}><i className="fas fa-trash"/></button>
        </div>
      )}
    </div>
  );
}

// Paleta de ícones modal
function OrgIconPicker({ onPick, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = FA_ICONS.filter(ic => ic.includes(search));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
        <div className="modal-header">
          <div className="modal-title"><i className="fas fa-icons" style={{marginRight:8}}/>Escolher Ícone</div>
          <button className="modal-close" onClick={onClose}><i className="fas fa-xmark"/></button>
        </div>
        <div className="modal-body">
          <input className="form-input" style={{marginBottom:12}} placeholder="Buscar ícone..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,maxHeight:260,overflowY:'auto'}}>
            {filtered.map(ic=>(
              <button key={ic} type="button" onClick={()=>onPick(ic)}
                style={{width:44,height:44,borderRadius:10,background:'var(--surface-hover)',border:'1px solid var(--surface-border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)',fontSize:18}}
                title={ic.replace('fa-','')}>
                <i className={`fas ${ic}`}/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook genérico para gerir anotações (texto/icone/seta/borda) num canvas
function useAnnotations(storeKey, isDb) {
  // isDb=true → db.orgTexts  isDb=false → db.config key
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (isDb) {
      db.orgTexts.toArray().then(rows => setItems(rows.filter(r => r.tipo)));
    } else {
      db.config.get(storeKey).then(rec => setItems(rec?.value || []));
    }
  }, [storeKey]);

  async function save(list) {
    if (isDb) {
      // handled individually
    } else {
      await db.config.put({ chave: storeKey, value: list });
    }
    setItems(list);
  }

  async function add(item) {
    if (isDb) {
      const id = await db.orgTexts.add(item);
      setItems(prev => [...prev, { ...item, id }]);
    } else {
      const list = [...items, { ...item, id: Date.now() }];
      await save(list);
    }
  }

  async function update(updated) {
    if (isDb) {
      const { id, ...data } = updated;
      await db.orgTexts.update(id, data);
      setItems(prev => prev.map(i => i.id===id ? updated : i));
    } else {
      const list = items.map(i => i.id===updated.id ? updated : i);
      await save(list);
    }
  }

  async function remove(id) {
    if (isDb) {
      await db.orgTexts.delete(id);
      setItems(prev => prev.filter(i => i.id!==id));
    } else {
      const list = items.filter(i => i.id!==id);
      await save(list);
    }
    setSelectedId(null);
  }

  return { items, selectedId, setSelectedId, add, update, remove };
}

// Barra de ferramentas de anotações
function OrgAnnotationToolbar({ activeToolRef, onSetTool, activeTool }) {
  const TOOLS = [
    { key:'texto',  icon:'fa-font',          label:'Texto'   },
    { key:'icone',  icon:'fa-icons',         label:'Ícone'   },
    { key:'seta',   icon:'fa-arrow-right',   label:'Seta'    },
    { key:'borda',  icon:'fa-vector-square', label:'Borda'   },
  ];
  return (
    <div style={{display:'flex',gap:4}}>
      {TOOLS.map(tool => (
        <button key={tool.key}
          className={`btn btn-sm ${activeTool===tool.key?'btn-primary':'btn-ghost'}`}
          onClick={()=>onSetTool(activeTool===tool.key?null:tool.key)}
          title={tool.label}
          style={{padding:'5px 10px',fontSize:12}}>
          <i className={`fas ${tool.icon}`}/>{tool.label}
        </button>
      ))}
    </div>
  );
}

// Renderiza todas as anotações num canvas
function OrgAnnotationLayer({ items, selectedId, onSelect, onUpdate, onDelete, zoom, canvasW, canvasH, snapTargets }) {
  const textItems   = items.filter(i => i.tipo==='texto'  || !i.tipo);
  const iconItems   = items.filter(i => i.tipo==='icone');
  const arrowItems  = items.filter(i => i.tipo==='seta');
  const borderItems = items.filter(i => i.tipo==='borda');

  return (
    <>
      {borderItems.map(item => (
        <OrgBorderNode key={item.id} item={item} isSelected={selectedId===item.id}
          onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} zoom={zoom}/>
      ))}
      {arrowItems.map(item => (
        <OrgArrowNode key={item.id} item={item} isSelected={selectedId===item.id}
          onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} zoom={zoom}
          snapTargets={snapTargets}/>
      ))}
      {iconItems.map(item => (
        <OrgIconNode key={item.id} item={item} isSelected={selectedId===item.id}
          onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} zoom={zoom}/>
      ))}
      {textItems.map(item => (
        <OrgTextLabel key={item.id} label={item} isSelected={selectedId===item.id}
          onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} zoom={zoom}/>
      ))}
    </>
  );
}

// Texto livre no canvas do organograma
function OrgTextLabel({ label, onUpdate, onDelete, onSelect, isSelected, zoom }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label.texto || '');
  const inputRef = useRef(null);
  const dragRef = useRef(null);

  function startEdit(e) {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== label.texto) onUpdate({ ...label, texto: trimmed || 'Texto' });
  }

  function startDrag(e) {
    if (editing) return;
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: label.x, oy: label.y };
    const z = zoom || 1;
    function mv(ev) {
      if (!dragRef.current) return;
      onUpdate({ ...label, x: dragRef.current.ox + (ev.clientX - dragRef.current.sx) / z, y: dragRef.current.oy + (ev.clientY - dragRef.current.sy) / z });
    }
    function up() { dragRef.current = null; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  }

  return (
    <div
      onMouseDown={startDrag}
      onClick={e => { e.stopPropagation(); onSelect(label.id); }}
      onDoubleClick={startEdit}
      style={{
        position: 'absolute',
        left: label.x, top: label.y,
        minWidth: 60, maxWidth: 320,
        cursor: editing ? 'text' : 'grab',
        userSelect: 'none',
        zIndex: isSelected ? 15 : 2,
      }}
    >
      {editing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(label.texto); setEditing(false); } }}
          style={{
            background: 'transparent',
            border: '1px dashed rgba(100,112,241,.6)',
            borderRadius: 6,
            color: label.cor || '#e2e8f0',
            fontSize: label.fontSize || 14,
            fontFamily: 'Lexend, sans-serif',
            fontWeight: label.bold ? 700 : 400,
            padding: '4px 8px',
            resize: 'both',
            minWidth: 80,
            outline: 'none',
            lineHeight: 1.5,
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <div style={{
          color: label.cor || '#e2e8f0',
          fontSize: label.fontSize || 14,
          fontFamily: label.bold ? 'Lexend, sans-serif' : 'Lexend, sans-serif',
          fontWeight: label.bold ? 700 : 400,
          padding: '4px 8px',
          borderRadius: 6,
          border: isSelected ? '1px dashed rgba(100,112,241,.5)' : '1px dashed transparent',
          background: isSelected ? 'rgba(100,112,241,.07)' : 'transparent',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
          transition: 'border-color .15s',
        }}>
          {label.texto || 'Texto'}
        </div>
      )}

      {/* Toolbar quando selecionado */}
      {isSelected && !editing && (
        <div
          style={{ position:'absolute', top:-28, left:0, display:'flex', gap:4, zIndex:20 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="btn btn-ghost btn-sm" style={{ padding:'2px 6px', fontSize:10 }} onClick={startEdit} title="Editar texto">
            <i className="fas fa-pen"/>
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:'2px 6px', fontSize:10 }}
            onClick={() => onUpdate({ ...label, bold: !label.bold })} title="Negrito">
            <i className="fas fa-bold"/>
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:'2px 6px', fontSize:10 }}
            onClick={() => onUpdate({ ...label, fontSize: Math.min(36, (label.fontSize||14)+2) })} title="Aumentar fonte">
            <i className="fas fa-plus" style={{fontSize:8}}/>A
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:'2px 6px', fontSize:10 }}
            onClick={() => onUpdate({ ...label, fontSize: Math.max(9, (label.fontSize||14)-2) })} title="Diminuir fonte">
            <i className="fas fa-minus" style={{fontSize:8}}/>A
          </button>
          <input type="color" value={label.cor||'#e2e8f0'} title="Cor do texto"
            onChange={e => onUpdate({ ...label, cor: e.target.value })}
            style={{ width:22, height:22, borderRadius:4, border:'1px solid var(--surface-border)', cursor:'pointer', padding:1, background:'none' }}
            onClick={e => e.stopPropagation()}
          />
          <button className="btn btn-danger btn-sm" style={{ padding:'2px 6px', fontSize:10 }} onClick={() => onDelete(label.id)} title="Excluir">
            <i className="fas fa-trash"/>
          </button>
        </div>
      )}
    </div>
  );
}


// ── Organograma Societário — nós e constantes ─────────────────
const SOC_NODE_W = 200;
const SOC_ROOT_W = 240;
const SOC_ROOT_H = 80;
const SOC_NODE_H = 90;
const SOC_LEVEL_GAP_Y = 160;
const SOC_SIBLING_GAP_X = 32;

const SOC_TIPOS = [
  'CFC', 'DE (C-Corp)', 'EIRELI', 'EPP', 'Holding',
  'LLC CA', 'LLC DE', 'LLC FL', 'Ltda', 'ME',
  'Pessoa Física', 'S/A', 'SD', 'Outros',
];

const SOC_TIPO_COLORS = {
  'Ltda':          { bg:'#1e3a5f', border:'#3b82f6', badge:'#3b82f6' },
  'S/A':           { bg:'#1a3a2a', border:'#22c55e', badge:'#22c55e' },
  'EIRELI':        { bg:'#3b1a5f', border:'#a855f7', badge:'#a855f7' },
  'ME':            { bg:'#3b2a0a', border:'#f59e0b', badge:'#f59e0b' },
  'EPP':           { bg:'#3b1a2a', border:'#ec4899', badge:'#ec4899' },
  'Holding':       { bg:'#2a1a3b', border:'#6470f1', badge:'#6470f1' },
  'Pessoa Física': { bg:'#0f2a2a', border:'#14b8a6', badge:'#14b8a6' },
  'LLC CA':        { bg:'#1a2a3b', border:'#38bdf8', badge:'#38bdf8' },
  'DE (C-Corp)':   { bg:'#1a1a4b', border:'#818cf8', badge:'#818cf8' },
  'LLC DE':        { bg:'#0f2a3b', border:'#22d3ee', badge:'#22d3ee' },
  'LLC FL':        { bg:'#0f3a2a', border:'#34d399', badge:'#34d399' },
  'SD':            { bg:'#2a1a1a', border:'#f87171', badge:'#f87171' },
  'CFC':           { bg:'#2a1a3b', border:'#c084fc', badge:'#c084fc' },
  'Outros':        { bg:'#2a2a2a', border:'#6b7280', badge:'#6b7280' },
};

const SOC_DEFAULT_NODES = [
  { id:'root', parentId:null, isRoot:true, nome:'Grupo Exemplo Holding', tipo:'Holding', cnpj:'', percentual:100, cor:'#1a1a3b', corBorda:'#6470f1', x:400, y:40 },
  { id:'n1', parentId:'root', isRoot:false, nome:'Empresa Alpha Ltda', tipo:'Ltda', cnpj:'', percentual:60, cor:'#1e3a5f', corBorda:'#3b82f6', x:100, y:260 },
  { id:'n2', parentId:'root', isRoot:false, nome:'Empresa Beta S/A', tipo:'S/A', cnpj:'', percentual:40, cor:'#1a3a2a', corBorda:'#22c55e', x:380, y:260 },
  { id:'n3', parentId:'root', isRoot:false, nome:'Empresa Gamma ME', tipo:'ME', cnpj:'', percentual:100, cor:'#3b2a0a', corBorda:'#f59e0b', x:660, y:260 },
  { id:'n4', parentId:'n1', isRoot:false, nome:'Empresa Delta Ltda', tipo:'Ltda', cnpj:'', percentual:51, cor:'#1e3a5f', corBorda:'#3b82f6', x:100, y:480 },
];

const SOC_DB_KEY = 'soc_nodes';

// Auto-layout para o organograma societário
function computeSocLayout(nodes) {
  if (!nodes.length) return {};
  const nodeIds = new Set(nodes.map(n => n.id));
  const childrenOf = id => nodes.filter(n => n.parentId === id);
  const roots = nodes.filter(n => !n.isFree && (n.isRoot || !n.parentId || !nodeIds.has(n.parentId)));
  if (!roots.length) return {};

  function subtreeWidth(node) {
    const kids = childrenOf(node.id);
    if (!kids.length) return SOC_NODE_W;
    const total = kids.reduce((s,k) => s + subtreeWidth(k), 0) + SOC_SIBLING_GAP_X * (kids.length - 1);
    return Math.max(SOC_NODE_W, total);
  }

  const positions = {};
  function place(node, left, depth) {
    const kids = childrenOf(node.id);
    const sw = subtreeWidth(node);
    const nodeW = node.isRoot ? SOC_ROOT_W : SOC_NODE_W;
    const cx = left + sw / 2;
    positions[node.id] = { x: cx - nodeW/2, y: depth * SOC_LEVEL_GAP_Y + 30 };
    if (kids.length) {
      let childLeft = left;
      kids.forEach(k => {
        place(k, childLeft, depth + 1);
        childLeft += subtreeWidth(k) + SOC_SIBLING_GAP_X;
      });
    }
  }

  const ROOT_GAP = 80;
  let cursor = 0;
  roots.forEach(root => {
    const sw = subtreeWidth(root);
    place(root, cursor, 0);
    cursor += sw + ROOT_GAP;
  });

  return positions;
}

// Bezier path between parent bottom-center and child top-center
function socEdgePath(x1,y1,x2,y2) {
  const cy = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`;
}

// ── Nó do Organograma Societário ─────────────────────────────
function SocNode({ node, pos, isSelected, isHovered, onSelect, onHover, onEdit, onDelete, onAddChild, onDragStart, onNavigate, zoom }) {
  const isRoot = node.isRoot;
  const typeStyle = SOC_TIPO_COLORS[node.tipo] || SOC_TIPO_COLORS['Outros'];
  const w = isRoot ? SOC_ROOT_W : SOC_NODE_W;
  const h = isRoot ? SOC_ROOT_H : SOC_NODE_H;
  const border = node.corBorda || typeStyle.border;
  const bg = node.cor || typeStyle.bg;
  const [nameHov, setNameHov] = React.useState(false);

  return (
    <div
      onMouseDown={e => { e.stopPropagation(); onDragStart(e, node.id, pos.x, pos.y); onSelect(node.id); }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => { onHover(null); setNameHov(false); }}
      onDoubleClick={e => { e.stopPropagation(); onEdit(node); }}
      style={{
        position: 'absolute',
        left: pos.x, top: pos.y,
        width: w, height: h,
        background: bg,
        border: `2px solid ${isSelected ? '#fff' : border}`,
        borderRadius: isRoot ? 18 : 14,
        cursor: 'grab',
        transition: 'box-shadow .15s, border-color .15s',
        boxShadow: isSelected
          ? `0 0 0 3px ${border}66, 0 12px 36px rgba(0,0,0,.6)`
          : isHovered
            ? `0 0 0 2px ${border}44, 0 8px 24px rgba(0,0,0,.5)`
            : '0 4px 14px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: isRoot ? '12px 18px' : '10px 14px',
        userSelect: 'none',
        zIndex: isSelected ? 20 : isHovered ? 10 : 2,
      }}
    >
      {/* Root crown badge */}
      {isRoot && (
        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
          background:'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius:10,
          padding:'2px 12px', fontSize:9, fontWeight:800, color:'#fff', letterSpacing:1,
          boxShadow:'0 2px 8px rgba(245,158,11,.4)', whiteSpace:'nowrap' }}>
          <i className="fas fa-crown" style={{marginRight:4,fontSize:8}}/>ENTIDADE CONTROLADORA
        </div>
      )}

      {/* Tipo badge */}
      <div style={{ position:'absolute', top: isRoot ? 6 : 4, right:8,
        background: typeStyle.badge + '22', border:`1px solid ${typeStyle.badge}55`,
        borderRadius:5, padding:'1px 7px', fontSize:9, fontWeight:700, color: typeStyle.badge,
        letterSpacing:.5 }}>
        {node.tipo}
      </div>

      {/* Nome — clicável: URL externa se cadastrada, senão página interna */}
      {(() => {
        const hasUrl = !!(node.urlSistema && node.urlSistema.trim());
        const tooltip = hasUrl ? 'Abrir no sistema externo' : 'Ver detalhes';
        return (
          <div style={{ position:'relative' }}>
            <div
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (hasUrl) window.open(node.urlSistema, '_blank', 'noopener,noreferrer');
                else onNavigate(node.id);
              }}
              onMouseEnter={() => setNameHov(true)}
              onMouseLeave={() => setNameHov(false)}
              title={tooltip}
              style={{ fontFamily:'Playfair Display', fontWeight:800,
                fontSize: isRoot ? 15 : 13,
                color: nameHov ? border : '#fff',
                lineHeight:1.3,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                maxWidth: w - 32,
                marginTop: isRoot ? 8 : 4,
                cursor: 'pointer',
                textDecoration: nameHov ? 'underline' : 'none',
                transition: 'color .12s',
              }}>
              {node.nome || 'Sem nome'}
            </div>
            {/* Tooltip custom */}
            {nameHov && (
              <div style={{
                position:'absolute', bottom:'calc(100% + 6px)', left:0,
                background:'rgba(15,17,26,.96)', border:'1px solid rgba(255,255,255,.12)',
                borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:600,
                color:'#fff', whiteSpace:'nowrap', pointerEvents:'none', zIndex:50,
                boxShadow:'0 4px 12px rgba(0,0,0,.5)',
              }}>
                {hasUrl
                  ? <><i className="fas fa-arrow-up-right-from-square" style={{marginRight:5,color:border,fontSize:9}}/>{tooltip}</>
                  : <><i className="fas fa-eye" style={{marginRight:5,color:border,fontSize:9}}/>{tooltip}</>
                }
              </div>
            )}
          </div>
        );
      })()}

      {/* CNPJ */}
      {node.cnpj && (
        <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', marginTop:2, fontFamily:'monospace' }}>
          {node.cnpj}
        </div>
      )}

      {/* Percentual */}
      <div style={{ marginTop:isRoot?6:5, display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ fontSize:isRoot?18:16, fontWeight:900, color:border, lineHeight:1 }}>
          {node.percentual}%
        </div>
        {!isRoot && (
          <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', lineHeight:1.2 }}>participação</div>
        )}
        {isRoot && (
          <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', lineHeight:1.2 }}>controle</div>
        )}
      </div>

      {/* Action buttons on hover/select */}
      {(isHovered || isSelected) && (
        <div
          style={{ position:'absolute', top:-14, right: isRoot ? 4 : 0, display:'flex', gap:3, zIndex:30 }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            title="Editar"
            onClick={e => { e.stopPropagation(); onEdit(node); }}
            style={{ width:24, height:24, borderRadius:6, background:'var(--surface-card)',
              border:'1px solid var(--surface-border)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--text-secondary)',
              fontSize:10 }}>
            <i className="fas fa-pen"/>
          </button>
          {!isRoot && (
            <>
              <button
                title="Adicionar subsidiária"
                onClick={e => { e.stopPropagation(); onAddChild(node); }}
                style={{ width:24, height:24, borderRadius:6, background:'var(--surface-card)',
                  border:'1px solid var(--brand)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'var(--brand)',
                  fontSize:10 }}>
                <i className="fas fa-plus"/>
              </button>
              <button
                title="Excluir"
                onClick={e => { e.stopPropagation(); onDelete(node); }}
                style={{ width:24, height:24, borderRadius:6, background:'rgba(239,68,68,.15)',
                  border:'1px solid rgba(239,68,68,.4)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'#ef4444',
                  fontSize:10 }}>
                <i className="fas fa-trash"/>
              </button>
            </>
          )}
          {isRoot && (
            <>
              <button
                title="Adicionar subsidiária"
                onClick={e => { e.stopPropagation(); onAddChild(node); }}
                style={{ width:24, height:24, borderRadius:6, background:'var(--surface-card)',
                  border:'1px solid var(--brand)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'var(--brand)',
                  fontSize:10 }}>
                <i className="fas fa-plus"/>
              </button>
              <button
                title="Excluir controladora"
                onClick={e => { e.stopPropagation(); onDelete(node); }}
                style={{ width:24, height:24, borderRadius:6, background:'rgba(239,68,68,.15)',
                  border:'1px solid rgba(239,68,68,.4)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'#ef4444',
                  fontSize:10 }}>
                <i className="fas fa-trash"/>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal de adição/edição de nó societário ──────────────────
function SocNodeModal({ node, allNodes, onSave, onCancel }) {
  const isNew = !node.id || node._isNew;
  const [form, setForm] = useState({
    nome: node.nome || '',
    tipo: node.tipo || 'Ltda',
    cnpj: node.cnpj || '',
    percentual: node.percentual ?? 100,
    cor: node.cor || '',
    corBorda: node.corBorda || '',
    parentId: node.isFree ? '' : (node.parentId || (allNodes.find(n=>n.isRoot)?.id || '')),
    urlSistema: node.urlSistema || '',
  });

  const typeStyle = SOC_TIPO_COLORS[form.tipo] || SOC_TIPO_COLORS['Outros'];
  const effectiveBg = form.cor || typeStyle.bg;
  const effectiveBorder = form.corBorda || typeStyle.border;

  // When tipo changes, reset colors to tipo defaults unless user manually set them
  const prevTipo = useRef(form.tipo);
  function handleTipoChange(newTipo) {
    const wasDefault = !form.cor || form.cor === (SOC_TIPO_COLORS[prevTipo.current]?.bg);
    const wasBorderDefault = !form.corBorda || form.corBorda === (SOC_TIPO_COLORS[prevTipo.current]?.border);
    prevTipo.current = newTipo;
    setForm(f => ({
      ...f,
      tipo: newTipo,
      cor: wasDefault ? '' : f.cor,
      corBorda: wasBorderDefault ? '' : f.corBorda,
    }));
  }

  const potentialParents = allNodes.filter(n => n.id !== node.id && !isDescendantOf(n.id, node.id, allNodes));

  function isDescendantOf(candidateId, ancestorId, nodes) {
    let cur = nodes.find(n => n.id === candidateId);
    while (cur && cur.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = nodes.find(n => n.id === cur.parentId);
    }
    return false;
  }

  function handleSave() {
    if (!form.nome.trim()) return;
    const ts = SOC_TIPO_COLORS[form.tipo] || SOC_TIPO_COLORS['Outros'];
    onSave({
      ...node,
      ...form,
      cor: form.cor || ts.bg,
      corBorda: form.corBorda || ts.border,
      percentual: Number(form.percentual) || 0,
      _isNew: isNew,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:520 }}>
        <div className="modal-header">
          <div className="modal-title">
            <i className={`fas ${isNew?'fa-plus-circle':'fa-pen'}`} style={{marginRight:8,color:'var(--brand)'}}/>
            {isNew ? 'Adicionar Empresa' : `Editar — ${node.nome}`}
          </div>
          <button className="modal-close" onClick={onCancel}><i className="fas fa-xmark"/></button>
        </div>
        <div className="modal-body">
          {/* Preview card */}
          <div style={{ marginBottom:16, display:'flex', justifyContent:'center' }}>
            <div style={{
              background: effectiveBg, border:`2px solid ${effectiveBorder}`,
              borderRadius:12, padding:'10px 20px', minWidth:180, textAlign:'center',
              boxShadow:`0 0 0 4px ${effectiveBorder}22`,
            }}>
              <div style={{ fontSize:9, fontWeight:700, color:effectiveBorder, letterSpacing:.5, marginBottom:4 }}>{form.tipo}</div>
              <div style={{ fontFamily:'Playfair Display', fontWeight:800, fontSize:13, color:'#fff' }}>{form.nome||'Nome da empresa'}</div>
              <div style={{ fontSize:16, fontWeight:900, color:effectiveBorder, marginTop:4 }}>{form.percentual}%</div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Nome da empresa <span style={{color:'var(--red)'}}>*</span></label>
              <input className="form-input" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
                placeholder="Ex: Empresa Alpha Ltda" autoFocus/>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo societário</label>
              <select className="form-select" value={form.tipo} onChange={e=>handleTipoChange(e.target.value)}>
                {SOC_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Participação (%)</label>
              <input className="form-input" type="number" min="0" max="100" step="0.01"
                value={form.percentual} onChange={e=>setForm(f=>({...f,percentual:e.target.value}))}/>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">CNPJ <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400}}>(opcional)</span></label>
              <input className="form-input" value={form.cnpj} onChange={e=>setForm(f=>({...f,cnpj:e.target.value}))}
                placeholder="00.000.000/0000-00"/>
            </div>
            {!node.isRoot && (
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Nó pai <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400}}>(opcional — deixe vazio para bloco livre)</span></label>
                <select className="form-select" value={form.parentId||''} onChange={e=>setForm(f=>({...f,parentId:e.target.value||null}))}>
                  <option value="">— Nenhum (bloco livre) —</option>
                  {potentialParents.map(n=>(
                    <option key={n.id} value={n.id}>{n.nome} {n.isRoot?'(controladora)':''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Cor de fundo</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={form.cor||typeStyle.bg}
                  onChange={e=>setForm(f=>({...f,cor:e.target.value}))}
                  style={{width:36,height:36,borderRadius:8,border:'1px solid var(--surface-border)',cursor:'pointer',padding:2,background:'none'}}/>
                <span style={{fontSize:11,color:'var(--text-muted)'}}>{form.cor||typeStyle.bg}</span>
                {form.cor && <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 8px'}} onClick={()=>setForm(f=>({...f,cor:''}))}>Reset</button>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Cor da borda</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={form.corBorda||typeStyle.border}
                  onChange={e=>setForm(f=>({...f,corBorda:e.target.value}))}
                  style={{width:36,height:36,borderRadius:8,border:'1px solid var(--surface-border)',cursor:'pointer',padding:2,background:'none'}}/>
                <span style={{fontSize:11,color:'var(--text-muted)'}}>{form.corBorda||typeStyle.border}</span>
                {form.corBorda && <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 8px'}} onClick={()=>setForm(f=>({...f,corBorda:''}))}>Reset</button>}
              </div>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">
                <i className="fas fa-link" style={{marginRight:6,color:'var(--brand)',fontSize:10}}/>
                URL do sistema interno
                <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400,marginLeft:6}}>(opcional)</span>
              </label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input className="form-input" value={form.urlSistema}
                  onChange={e=>setForm(f=>({...f,urlSistema:e.target.value}))}
                  placeholder="https://sistema.empresa.com.br/empresa/123"
                  style={{flex:1}}/>
                {form.urlSistema && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    style={{fontSize:11,whiteSpace:'nowrap'}}
                    onClick={()=>window.open(form.urlSistema,'_blank','noopener,noreferrer')}>
                    <i className="fas fa-arrow-up-right-from-square"/>Testar
                  </button>
                )}
              </div>
              {form.urlSistema && (
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                  <i className="fas fa-circle-check" style={{color:'#22c55e',fontSize:9}}/>
                  Clicar no nome da empresa no organograma abrirá este link
                </div>
              )}
              {!form.urlSistema && (
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                  <i className="fas fa-circle-info" style={{fontSize:9}}/>
                  Sem URL: clicar no nome navega para a página interna da empresa
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.nome.trim()}>
            <i className={`fas ${isNew?'fa-plus':'fa-check'}`}/>{isNew?'Adicionar':'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Interna de Empresa Societária ─────────────────────
const SOC_DOCS_KEY = 'soc_docs';

function SocEmpresaPage({ nodeId, allNodes, onBack, onUpdateNode, onNavigateTo }) {
  const { toast } = useApp();
  const node = allNodes.find(n => n.id === nodeId);
  const typeStyle = SOC_TIPO_COLORS[node?.tipo] || SOC_TIPO_COLORS['Outros'];
  const border = node?.corBorda || typeStyle.border;
  const bg = node?.cor || typeStyle.bg;

  // Extra fields state — merged from node or defaults
  const [extraFields, setExtraFields] = useState({
    site: node?.site || '',
    email: node?.email || '',
    telefone: node?.telefone || '',
    endereco: node?.endereco || '',
    responsavel: node?.responsavel || '',
    capitalSocial: node?.capitalSocial || '',
    dataConstituicao: node?.dataConstituicao || '',
    observacoes: node?.observacoes || '',
  });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ ...extraFields });

  // Documents state
  const [docs, setDocs] = useState([]);
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ nome:'', categoria:'Contrato Social', data: new Date().toISOString().slice(0,10), arquivo:null, nomeArquivo:'' });
  const fileInputRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const DOC_CATS = ['Contrato Social','Certidão','Balanço','Procuração','Ata','Outros'];
  const DOC_ICONS = {
    'pdf': { icon:'fa-file-pdf', color:'#ef4444' },
    'doc': { icon:'fa-file-word', color:'#3b82f6' },
    'docx':{ icon:'fa-file-word', color:'#3b82f6' },
    'xls': { icon:'fa-file-excel', color:'#22c55e' },
    'xlsx':{ icon:'fa-file-excel', color:'#22c55e' },
    'jpg': { icon:'fa-file-image', color:'#f59e0b' },
    'jpeg':{ icon:'fa-file-image', color:'#f59e0b' },
    'png': { icon:'fa-file-image', color:'#f59e0b' },
    'default':{ icon:'fa-file', color:'#6b7280' },
  };

  function getDocIcon(nome) {
    const ext = (nome||'').split('.').pop().toLowerCase();
    return DOC_ICONS[ext] || DOC_ICONS['default'];
  }

  // Fade-in on mount
  useEffect(() => { setTimeout(() => setVisible(true), 20); }, []);

  // Load docs for this node
  useEffect(() => {
    db.config.get(SOC_DOCS_KEY).then(rec => {
      const all = rec?.value || {};
      setDocs(all[nodeId] || []);
    });
  }, [nodeId]);

  // Sync extraFields when node changes
  useEffect(() => {
    if (node) {
      const fields = {
        site: node.site||'', email: node.email||'', telefone: node.telefone||'',
        endereco: node.endereco||'', responsavel: node.responsavel||'',
        capitalSocial: node.capitalSocial||'', dataConstituicao: node.dataConstituicao||'',
        observacoes: node.observacoes||'',
      };
      setExtraFields(fields);
      if (!editMode) setEditForm(fields);
    }
  }, [node?.id]);

  async function saveDocs(nodeId, list) {
    const rec = await db.config.get(SOC_DOCS_KEY);
    const all = rec?.value || {};
    all[nodeId] = list;
    await db.config.put({ chave: SOC_DOCS_KEY, value: all });
  }

  function handleSaveEdit() {
    const updated = { ...node, ...editForm };
    onUpdateNode(updated);
    setExtraFields({ ...editForm });
    setEditMode(false);
    toast('Informações salvas!', 'success');
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setDocForm(f => ({ ...f, arquivo: ev.target.result, nomeArquivo: file.name, nome: f.nome || file.name }));
    reader.readAsDataURL(file);
  }

  async function handleAddDoc() {
    if (!docForm.nomeArquivo && !docForm.nome) return;
    const newDoc = {
      id: Date.now(),
      nome: docForm.nome || docForm.nomeArquivo,
      categoria: docForm.categoria,
      data: docForm.data,
      arquivo: docForm.arquivo,
      nomeArquivo: docForm.nomeArquivo,
    };
    const updated = [...docs, newDoc];
    setDocs(updated);
    await saveDocs(nodeId, updated);
    setDocModal(false);
    setDocForm({ nome:'', categoria:'Contrato Social', data: new Date().toISOString().slice(0,10), arquivo:null, nomeArquivo:'' });
    toast('Documento adicionado!', 'success');
  }

  async function handleDeleteDoc(id) {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    await saveDocs(nodeId, updated);
    toast('Removido!', 'success');
  }

  function handleDownload(doc) {
    if (!doc.arquivo) return;
    const a = document.createElement('a');
    a.href = doc.arquivo;
    a.download = doc.nomeArquivo || doc.nome;
    a.click();
  }

  // Subsidiaries (children)
  const subsidiarias = allNodes.filter(n => n.parentId === nodeId);
  // Parent
  const controladora = node?.parentId ? allNodes.find(n => n.id === node.parentId) : null;

  if (!node) return null;

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity .25s ease, transform .25s ease',
    }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <button
          onClick={() => { setVisible(false); setTimeout(onBack, 220); }}
          className="btn btn-ghost btn-sm"
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <i className="fas fa-arrow-left" style={{fontSize:11}}/>Voltar ao Organograma
        </button>
        <div style={{ width:1, height:28, background:'var(--surface-border)' }}/>
        <div style={{
          width:40, height:40, borderRadius:12,
          background: bg, border:`2px solid ${border}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:800, color:border, flexShrink:0,
        }}>
          {fmt.initials(node.nome)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Playfair Display', fontWeight:800, fontSize:22, color:'var(--text-primary)', lineHeight:1.2 }}>
            {node.nome}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:4, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700, color:typeStyle.badge,
              background:typeStyle.badge+'22', border:`1px solid ${typeStyle.badge}44`,
              borderRadius:5, padding:'1px 8px' }}>
              {node.tipo}
            </span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {node.percentual}% participação
            </span>
            {controladora && (
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                · Controlada por <button
                  onClick={() => onNavigateTo(controladora.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                    color:'var(--brand)', textDecoration:'underline', padding:0 }}>
                  {controladora.nome}
                </button>
              </span>
            )}
          </div>
        </div>
        {/* Botão acesso rápido ao sistema externo — visível apenas se URL estiver preenchida */}
        {node.urlSistema && (
          <button
            onClick={() => window.open(node.urlSistema, '_blank', 'noopener,noreferrer')}
            style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:700,
              background: `linear-gradient(135deg, ${border}22, ${border}11)`,
              border: `1.5px solid ${border}66`,
              color: border, cursor:'pointer',
              transition:'background .15s, box-shadow .15s',
              boxShadow:`0 2px 10px ${border}22`,
              whiteSpace:'nowrap', flexShrink:0,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${border}44,${border}22)`;e.currentTarget.style.boxShadow=`0 4px 18px ${border}44`;}}
            onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${border}22,${border}11)`;e.currentTarget.style.boxShadow=`0 2px 10px ${border}22`;}}
            title={node.urlSistema}
          >
            <i className="fas fa-arrow-up-right-from-square" style={{fontSize:11}}/>
            Acessar no Sistema
            <i className="fas fa-chevron-right" style={{fontSize:9,opacity:.6}}/>
          </button>
        )}
      </div>

      {/* ── Seção: Dados ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:.6 }}>
            <i className="fas fa-building" style={{marginRight:8, color:border}}/>Dados da Empresa
          </div>
          {!editMode && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditForm({...extraFields}); setEditMode(true); }} style={{fontSize:12}}>
              <i className="fas fa-pen" style={{fontSize:10}}/>Editar Informações
            </button>
          )}
        </div>

        {!editMode ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {[
              { label:'CNPJ', value:node.cnpj, icon:'fa-id-card' },
              { label:'Tipo Societário', value:node.tipo, icon:'fa-briefcase' },
              { label:'Participação', value:node.percentual+'%', icon:'fa-percent' },
              { label:'Capital Social', value:extraFields.capitalSocial, icon:'fa-coins' },
              { label:'Constituição', value:extraFields.dataConstituicao ? fmt.date(extraFields.dataConstituicao) : '', icon:'fa-calendar' },
              { label:'Responsável / Sócio', value:extraFields.responsavel, icon:'fa-user-tie' },
              { label:'Site', value:extraFields.site, icon:'fa-globe', isLink:true },
              { label:'Sistema Interno', value:node.urlSistema, icon:'fa-link', isLink:true },
              { label:'E-mail', value:extraFields.email, icon:'fa-envelope' },
              { label:'Telefone', value:extraFields.telefone, icon:'fa-phone' },
              { label:'Endereço', value:extraFields.endereco, icon:'fa-location-dot', wide:true },
              { label:'Observações', value:extraFields.observacoes, icon:'fa-note-sticky', wide:true },
            ].filter(f => f.value).map((f,i) => (
              <div key={i} className="card" style={{
                padding:'10px 14px',
                gridColumn: f.wide ? '1 / -1' : 'auto',
                borderLeft:`3px solid ${border}`,
              }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3, display:'flex', alignItems:'center', gap:5 }}>
                  <i className={`fas ${f.icon}`} style={{fontSize:9, color:border}}/>
                  {f.label}
                </div>
                {f.isLink && f.value ? (
                  <a href={f.value.startsWith('http') ? f.value : 'https://'+f.value}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:13, fontWeight:600, color:'var(--brand)', textDecoration:'none' }}>
                    {f.value}
                  </a>
                ) : (
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{f.value}</div>
                )}
              </div>
            ))}
            {!node.cnpj && !extraFields.capitalSocial && !extraFields.responsavel && (
              <div style={{ gridColumn:'1/-1', color:'var(--text-muted)', fontSize:13, padding:'8px 0', display:'flex', alignItems:'center', gap:8 }}>
                <i className="fas fa-circle-info" style={{color:border}}/>
                Nenhuma informação cadastrada. Clique em "Editar Informações" para preencher.
              </div>
            )}
          </div>
        ) : (
          /* Edit form */
          <div className="card" style={{ padding:'20px 24px' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input className="form-input" value={editForm.cnpj !== undefined ? editForm.cnpj : (node.cnpj||'')}
                  onChange={e => setEditForm(f => ({...f, cnpj:e.target.value}))}
                  placeholder="00.000.000/0000-00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Capital Social</label>
                <input className="form-input" value={editForm.capitalSocial||''}
                  onChange={e => setEditForm(f => ({...f, capitalSocial:e.target.value}))}
                  placeholder="R$ 100.000,00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Data de Constituição</label>
                <input className="form-input" type="date" value={editForm.dataConstituicao||''}
                  onChange={e => setEditForm(f => ({...f, dataConstituicao:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Responsável / Sócio</label>
                <input className="form-input" value={editForm.responsavel||''}
                  onChange={e => setEditForm(f => ({...f, responsavel:e.target.value}))}
                  placeholder="Nome do responsável"/>
              </div>
              <div className="form-group">
                <label className="form-label">Site</label>
                <input className="form-input" value={editForm.site||''}
                  onChange={e => setEditForm(f => ({...f, site:e.target.value}))}
                  placeholder="www.empresa.com.br"/>
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={editForm.email||''}
                  onChange={e => setEditForm(f => ({...f, email:e.target.value}))}
                  placeholder="contato@empresa.com"/>
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={editForm.telefone||''}
                  onChange={e => setEditForm(f => ({...f, telefone:e.target.value}))}
                  placeholder="(11) 99999-9999"/>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Endereço</label>
                <input className="form-input" value={editForm.endereco||''}
                  onChange={e => setEditForm(f => ({...f, endereco:e.target.value}))}
                  placeholder="Rua, número, bairro, cidade, estado"/>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Observações</label>
                <textarea className="form-textarea" rows={3} value={editForm.observacoes||''}
                  onChange={e => setEditForm(f => ({...f, observacoes:e.target.value}))}
                  placeholder="Notas internas, histórico, planejamento..."/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                <i className="fas fa-check"/>Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Seção: Documentos ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:.6 }}>
            <i className="fas fa-folder-open" style={{marginRight:8, color:border}}/>Documentos
            {docs.length > 0 && (
              <span style={{ marginLeft:8, fontSize:11, background:border+'22', color:border,
                border:`1px solid ${border}44`, borderRadius:10, padding:'1px 8px', fontWeight:700 }}>
                {docs.length}
              </span>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setDocModal(true)} style={{fontSize:12}}>
            <i className="fas fa-plus"/>Adicionar Documento
          </button>
        </div>

        {docs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)',
            background:'var(--surface)', borderRadius:12, border:'1px dashed var(--surface-border)' }}>
            <i className="fas fa-folder-open" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.25 }}/>
            <div style={{ fontWeight:600, marginBottom:4 }}>Nenhum documento</div>
            <div style={{ fontSize:12 }}>Adicione contratos, certidões, balanços e outros arquivos desta empresa.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {docs.map(doc => {
              const { icon, color } = getDocIcon(doc.nomeArquivo || doc.nome);
              return (
                <div key={doc.id} className="card" style={{ padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:color+'18',
                    border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0 }}>
                    <i className={`fas ${icon}`} style={{ color, fontSize:16 }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {doc.nome}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, display:'flex', gap:8 }}>
                      <span style={{ background:'var(--surface-hover)', borderRadius:4, padding:'1px 6px' }}>{doc.categoria}</span>
                      <span>{doc.data ? fmt.date(doc.data) : ''}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    {doc.arquivo && (
                      <button className="btn btn-ghost btn-sm" style={{padding:'4px 8px',fontSize:11}}
                        onClick={() => handleDownload(doc)} title="Download">
                        <i className="fas fa-download"/>
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{padding:'4px 8px',fontSize:11,color:'var(--red)'}}
                      onClick={() => handleDeleteDoc(doc.id)} title="Excluir">
                      <i className="fas fa-trash"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Seção: Subsidiárias ── */}
      {subsidiarias.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:.6, marginBottom:12 }}>
            <i className="fas fa-diagram-project" style={{marginRight:8, color:border}}/>Subsidiárias
            <span style={{ marginLeft:8, fontSize:11, background:border+'22', color:border,
              border:`1px solid ${border}44`, borderRadius:10, padding:'1px 8px', fontWeight:700 }}>
              {subsidiarias.length}
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
            {subsidiarias.map(sub => {
              const st = SOC_TIPO_COLORS[sub.tipo] || SOC_TIPO_COLORS['Outros'];
              const sb = sub.corBorda || st.border;
              return (
                <div key={sub.id}
                  onClick={() => onNavigateTo(sub.id)}
                  className="card"
                  style={{ padding:'12px 16px', cursor:'pointer',
                    borderLeft:`3px solid ${sb}`,
                    transition:'box-shadow .15s, transform .15s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 4px 16px ${sb}33`;e.currentTarget.style.transform='translateY(-1px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='';e.currentTarget.style.transform='';}}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:sub.cor||st.bg,
                      border:`1.5px solid ${sb}`, display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:800, color:sb, flexShrink:0 }}>
                      {fmt.initials(sub.nome)}
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {sub.nome}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:9, fontWeight:700, color:st.badge,
                      background:st.badge+'22', borderRadius:4, padding:'1px 6px' }}>{sub.tipo}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:sb }}>{sub.percentual}%</span>
                    <i className="fas fa-arrow-right" style={{ fontSize:9, color:'var(--text-muted)', marginLeft:'auto' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Adicionar Documento ── */}
      {docModal && (
        <div className="modal-backdrop" onClick={() => setDocModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-file-plus" style={{marginRight:8,color:'var(--brand)'}}/>Adicionar Documento</div>
              <button className="modal-close" onClick={() => setDocModal(false)}><i className="fas fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Arquivo</label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button className="btn btn-ghost" style={{fontSize:12}} onClick={() => fileInputRef.current?.click()}>
                      <i className="fas fa-upload"/>Escolher arquivo
                    </button>
                    {docForm.nomeArquivo && (
                      <span style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
                        {docForm.nomeArquivo}
                      </span>
                    )}
                    <input ref={fileInputRef} type="file" style={{display:'none'}} onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"/>
                  </div>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Nome do documento</label>
                  <input className="form-input" value={docForm.nome}
                    onChange={e => setDocForm(f => ({...f, nome:e.target.value}))}
                    placeholder="Ex: Contrato Social 2024"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={docForm.categoria}
                    onChange={e => setDocForm(f => ({...f, categoria:e.target.value}))}>
                    {DOC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input className="form-input" type="date" value={docForm.data}
                    onChange={e => setDocForm(f => ({...f, data:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDocModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddDoc} disabled={!docForm.nome && !docForm.nomeArquivo}>
                <i className="fas fa-plus"/>Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal: Selecionar empresa existente para adicionar ao organograma ──
function SocPickEmpresaModal({ empresas, socNodes, defaultParentId, onAdd, onCancel, onFreeNode }) {
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null); // empresa object
  const [parentId, setParentId]   = useState(defaultParentId || '');
  const [percentual, setPercentual] = useState(100);
  const searchRef = useRef(null);

  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 60); }, []);

  // IDs já presentes no organograma (via empresaId ou via id prefixado)
  const usedEmpresaIds = new Set(
    socNodes
      .filter(n => n.empresaId != null)
      .map(n => String(n.empresaId))
  );
  // também considera nós cujo id começa com 'emp-'
  socNodes.forEach(n => {
    if (n.id.startsWith('emp-')) usedEmpresaIds.add(String(n.id.replace('emp-', '')));
  });

  const filtered = (empresas || [])
    .filter(e => {
      const q = search.toLowerCase();
      return (
        (e.nome || '').toLowerCase().includes(q) ||
        (e.cnpj || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

  // Todos os nós do organograma disponíveis como pais
  const parentOptions = socNodes;

  function handleConfirm() {
    if (!selected || !parentId) return;
    onAdd({ empresa: selected, parentId, percentual });
  }

  // Map legalType → tipo label legível
  const tipoLabel = (emp) => emp.legalType || emp.tipo || '—';

  // Cor do badge por tipo
  const tipoCor = (tipo) => (SOC_TIPO_COLORS[tipo] || SOC_TIPO_COLORS['Outros']).badge;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth:580, display:'flex', flexDirection:'column', maxHeight:'85vh' }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink:0 }}>
          <div className="modal-title">
            <i className="fas fa-building-circle-arrow-right" style={{ marginRight:8, color:'var(--brand)' }}/>
            Adicionar Empresa ao Organograma
          </div>
          <button className="modal-close" onClick={onCancel}><i className="fas fa-xmark"/></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Busca */}
          <div style={{ position:'relative' }}>
            <i className="fas fa-magnifying-glass" style={{
              position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
              color:'var(--text-muted)', fontSize:13, pointerEvents:'none',
            }}/>
            <input
              ref={searchRef}
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              style={{ paddingLeft:36 }}
            />
          </div>

          {/* Lista de empresas */}
          <div style={{
            flex:1, overflowY:'auto',
            border:'1px solid var(--surface-border)',
            borderRadius:10, minHeight:180, maxHeight:280,
          }}>
            {filtered.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <i className="fas fa-building" style={{ fontSize:28, display:'block', marginBottom:10, opacity:.2 }}/>
                {search ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}
              </div>
            )}
            {filtered.map((emp, i) => {
              const already = usedEmpresaIds.has(String(emp.id));
              const isSelected = selected?.id === emp.id;
              const tipo = tipoLabel(emp);
              const cor = tipoCor(tipo);
              return (
                <div
                  key={emp.id}
                  onClick={() => { if (!already) setSelected(emp); }}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--surface-border)' : 'none',
                    background: isSelected
                      ? 'var(--brand-dim)'
                      : already ? 'transparent' : 'transparent',
                    cursor: already ? 'default' : 'pointer',
                    opacity: already ? 0.5 : 1,
                    transition:'background .1s',
                  }}
                  onMouseEnter={e => { if (!already && !isSelected) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Seleção indicador */}
                  <div style={{
                    width:18, height:18, borderRadius:'50%', flexShrink:0,
                    border: isSelected ? '2px solid var(--brand)' : '2px solid var(--surface-border)',
                    background: isSelected ? 'var(--brand)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {isSelected && <i className="fas fa-check" style={{ fontSize:9, color:'#fff' }}/>}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width:34, height:34, borderRadius:8, flexShrink:0,
                    background: cor + '22', border:`1.5px solid ${cor}55`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:800, color: cor,
                  }}>
                    {fmt.initials(emp.nome)}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      fontSize:13, fontWeight:700, color:'var(--text-primary)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    }}>
                      {emp.nome}
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:3, alignItems:'center' }}>
                      {emp.cnpj && (
                        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>
                          {emp.cnpj}
                        </span>
                      )}
                      <span style={{
                        fontSize:9, fontWeight:700, color:cor,
                        background: cor + '22', borderRadius:4, padding:'1px 6px',
                      }}>
                        {tipo}
                      </span>
                      {emp.pais && (
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                          {emp.pais === 'US' ? '🇺🇸' : '🇧🇷'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge já adicionada */}
                  {already && (
                    <span style={{
                      fontSize:9, fontWeight:700, color:'var(--text-muted)',
                      background:'var(--surface-hover)', border:'1px solid var(--surface-border)',
                      borderRadius:5, padding:'2px 8px', whiteSpace:'nowrap', flexShrink:0,
                    }}>
                      Já adicionada
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Configuração da relação — só aparece quando empresa está selecionada */}
          {selected && (
            <div style={{
              background:'var(--surface)',
              border:`1px solid var(--brand)44`,
              borderRadius:10, padding:'14px 16px',
              display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
            }}>
              <div style={{ gridColumn:'1/-1', fontSize:12, fontWeight:700,
                color:'var(--brand)', marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-circle-check" style={{ fontSize:11 }}/>
                {selected.nome} — configurar relação
              </div>

              <div className="form-group">
                <label className="form-label">Nó pai no organograma</label>
                <select className="form-select" value={parentId}
                  onChange={e => setParentId(e.target.value)}>
                  <option value="">— selecionar —</option>
                  {parentOptions.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nome}{n.isRoot ? ' (controladora)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Participação (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="0.01"
                  value={percentual}
                  onChange={e => setPercentual(e.target.value)}/>
              </div>
            </div>
          )}

          {/* Estado vazio — sem empresa selecionada */}
          {!selected && filtered.length > 0 && (
            <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>
              <i className="fas fa-hand-pointer" style={{ marginRight:6, fontSize:11 }}/>
              Clique em uma empresa para selecioná-la
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-secondary" onClick={onFreeNode} title="Criar bloco sem empresa vinculada">
            <i className="fas fa-square-plus"/>Bloco livre
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selected || !parentId}
          >
            <i className="fas fa-diagram-project"/>Adicionar ao Organograma
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OrgChartPage ─────────────────────────────────────────────
function OrgChartPage() {
  const { t, toast, navigate } = useApp();
  const [activeTab, setActiveTab] = useState('societario'); // 'societario' | 'empresa'
  // Inner view: 'chart' | 'empresa-detail'
  const [socView, setSocView] = useState('chart');
  const [socDetailId, setSocDetailId] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  function openSocDetail(nodeId) {
    setSocDetailId(nodeId);
    setSocView('empresa-detail');
    setDetailVisible(false);
    setTimeout(() => setDetailVisible(true), 20);
  }
  function closeSocDetail() {
    setDetailVisible(false);
    setTimeout(() => { setSocView('chart'); setSocDetailId(null); }, 220);
  }

  // ── Aba: Organograma Societário ──────────────────────────────
  const [socNodes, setSocNodes]   = useState([]);
  const [socCustomPos, setSocCustomPos] = useState({});
  const [socZoom, setSocZoom]     = useState(0.9);
  const [socPan, setSocPan]       = useState({ x: 60, y: 60 });
  const [socSelId, setSocSelId]   = useState(null);
  const [socHovId, setSocHovId]   = useState(null);
  const [socModal, setSocModal]       = useState(null); // edição de nó existente
  const [socPickModal, setSocPickModal] = useState(null); // { parentId } — seleção de empresa
  const [socConfirm, setSocConfirm]   = useState(null);
  const socRef = useRef(null);
  const socIsPanning = useRef(false);
  const socPanStart  = useRef({});
  const SOC_POS_KEY  = 'soc_custom_pos';
  const SOC_ANNOT_KEY = 'soc_annots';
  const [socAnnots, setSocAnnots] = useState([]);
  const [socAnnotSelId, setSocAnnotSelId] = useState(null);
  const [socActiveTool, setSocActiveTool] = useState(null);
  const [socIconPicker, setSocIconPicker] = useState(null);

  // Load soc nodes + empresas cadastradas no sistema
  useEffect(() => {
    db.config.get(SOC_DB_KEY).then(rec => setSocNodes(rec?.value || SOC_DEFAULT_NODES));
    db.config.get(SOC_POS_KEY).then(rec => setSocCustomPos(rec?.value || {}));
    db.config.get(SOC_ANNOT_KEY).then(rec => setSocAnnots(rec?.value || []));
    db.empresas.toArray().then(list => setEmpresas(list));
  }, []);

  async function saveSocNodes(list) {
    await db.config.put({ chave: SOC_DB_KEY, value: list });
    setSocNodes(list);
  }
  async function saveSocPos(pos) {
    await db.config.put({ chave: SOC_POS_KEY, value: pos });
    setSocCustomPos(pos);
  }

  // Compute layout, merge with custom positions
  const autoLayout = computeSocLayout(socNodes);
  const socPositions = {};
  let freeIndex = 0;
  socNodes.forEach(n => {
    const custom = socCustomPos[n.id];
    if (n.isFree) {
      // Blocos livres só usam posição customizada; fallback espalhado se ainda não foram posicionados
      socPositions[n.id] = custom || { x: 60 + (freeIndex % 4) * 240, y: 500 + Math.floor(freeIndex / 4) * 160 };
      freeIndex++;
    } else {
      const base = autoLayout[n.id] || { x: 200, y: 200 };
      socPositions[n.id] = custom || base;
    }
  });

  // Canvas size
  const socPosVals = Object.entries(socPositions);
  const socMaxX = socPosVals.length ? Math.max(...socPosVals.map(([id,p]) => {
    const n = socNodes.find(x=>x.id===id);
    return p.x + (n?.isRoot ? SOC_ROOT_W : SOC_NODE_W);
  })) : 800;
  const socMaxY = socPosVals.length ? Math.max(...socPosVals.map(([id,p]) => {
    const n = socNodes.find(x=>x.id===id);
    return p.y + (n?.isRoot ? SOC_ROOT_H : SOC_NODE_H);
  })) : 600;
  const socCanvasW = socMaxX + 120;
  const socCanvasH = socMaxY + 120;

  // Build edge list for bezier curves
  const socEdges = socNodes.filter(n => !n.isFree && n.parentId && socPositions[n.id] && socPositions[n.parentId]).map(n => {
    const parent = socNodes.find(p => p.id === n.parentId);
    const pp = socPositions[n.parentId];
    const cp = socPositions[n.id];
    const pw = parent?.isRoot ? SOC_ROOT_W : SOC_NODE_W;
    const ph = parent?.isRoot ? SOC_ROOT_H : SOC_NODE_H;
    const typeStyle = SOC_TIPO_COLORS[n.tipo] || SOC_TIPO_COLORS['Outros'];
    return {
      id: `${n.parentId}-${n.id}`,
      x1: pp.x + pw/2,   y1: pp.y + ph,
      x2: cp.x + SOC_NODE_W/2, y2: cp.y,
      percentual: n.percentual,
      color: n.corBorda || typeStyle.border,
      midX: (pp.x + pw/2 + cp.x + SOC_NODE_W/2) / 2,
      midY: (pp.y + ph + cp.y) / 2,
    };
  });

  // Drag soc node
  function startDragSocNode(e, nodeId, baseX, baseY) {
    e.stopPropagation();
    let dragging = false;
    const ref = { sx: e.clientX, sy: e.clientY, ox: baseX, oy: baseY };
    function onMove(ev) {
      const dx = ev.clientX - ref.sx, dy = ev.clientY - ref.sy;
      if (!dragging && Math.sqrt(dx*dx+dy*dy) < 4) return;
      dragging = true;
      setSocCustomPos(prev => ({ ...prev, [nodeId]: { x: ref.ox + dx/socZoom, y: ref.oy + dy/socZoom } }));
    }
    function onUp() {
      if (dragging) {
        setSocCustomPos(prev => {
          db.config.put({ chave: SOC_POS_KEY, value: prev });
          return prev;
        });
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function socHandleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setSocZoom(z => Math.min(2.5, Math.max(0.2, z + delta)));
  }
  function socHandleMouseDown(e) {
    if (e.target.closest('.soc-node')) return;
    socIsPanning.current = true;
    socPanStart.current = { x: e.clientX - socPan.x, y: e.clientY - socPan.y };
    e.currentTarget.style.cursor = 'grabbing';
  }
  function socHandleMouseMove(e) {
    if (!socIsPanning.current) return;
    setSocPan({ x: e.clientX - socPanStart.current.x, y: e.clientY - socPanStart.current.y });
  }
  function socHandleMouseUp(e) {
    socIsPanning.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
  }

  function handleSocSave(form) {
    const ts = SOC_TIPO_COLORS[form.tipo] || SOC_TIPO_COLORS['Outros'];
    if (form._isNew) {
      const newId = 'n' + Date.now();
      // Place new node near parent
      const parentPos = socPositions[form.parentId];
      const siblings = socNodes.filter(n => n.parentId === form.parentId);
      const offsetX = parentPos ? parentPos.x + siblings.length * (SOC_NODE_W + SOC_SIBLING_GAP_X) : 200;
      const offsetY = parentPos ? parentPos.y + SOC_LEVEL_GAP_Y : 200;
      const newNode = { id: newId, parentId: form.parentId, isRoot: false,
        nome: form.nome, tipo: form.tipo, cnpj: form.cnpj,
        percentual: Number(form.percentual) || 0,
        cor: form.cor || ts.bg, corBorda: form.corBorda || ts.border };
      const newPos = { ...socCustomPos, [newId]: { x: offsetX, y: offsetY } };
      saveSocNodes([...socNodes, newNode]);
      saveSocPos(newPos);
    } else {
      const updated = socNodes.map(n => n.id === form.id ? {
        ...n, nome: form.nome, tipo: form.tipo, cnpj: form.cnpj,
        percentual: Number(form.percentual) || 0,
        cor: form.cor || ts.bg, corBorda: form.corBorda || ts.border,
        parentId: form.isRoot ? null : (form.parentId || null),
        isFree: !form.isRoot && !form.parentId ? true : false,
      } : n);
      saveSocNodes(updated);
    }
    setSocModal(null);
    toast('Salvo!', 'success');
  }

  function handleSocDelete(node) {
    // Collect all descendants
    function collectDesc(id) {
      const kids = socNodes.filter(n => n.parentId === id);
      return kids.reduce((acc, k) => [...acc, k.id, ...collectDesc(k.id)], []);
    }
    const toDelete = [node.id, ...collectDesc(node.id)];
    setSocConfirm({
      msg: toDelete.length > 1
        ? `Excluir "${node.nome}" e todas as suas ${toDelete.length - 1} subsidiária(s)?`
        : `Excluir "${node.nome}"?`,
      onConfirm: async () => {
        const remaining = socNodes.filter(n => !toDelete.includes(n.id));
        const newPos = { ...socCustomPos };
        toDelete.forEach(id => delete newPos[id]);
        await saveSocNodes(remaining);
        await saveSocPos(newPos);
        setSocConfirm(null);
        setSocSelId(null);
        toast('Excluído!', 'success');
      }
    });
  }

  function handleSocAddChild(parent) {
    setSocPickModal({ parentId: parent.id });
  }

  async function handleUpdateSocNode(updated) {
    const list = socNodes.map(n => n.id === updated.id ? updated : n);
    await saveSocNodes(list);
  }

  async function handleSocAddFromPick({ empresa, parentId, percentual }) {
    const ts = SOC_TIPO_COLORS[empresa.legalType] || SOC_TIPO_COLORS['Ltda'];
    const newId = 'emp-' + empresa.id;
    const parentPos = socPositions[parentId];
    const siblings = socNodes.filter(n => n.parentId === parentId);
    const offsetX = parentPos ? parentPos.x + siblings.length * (SOC_NODE_W + SOC_SIBLING_GAP_X) : 200;
    const offsetY = parentPos ? parentPos.y + SOC_LEVEL_GAP_Y : 200;
    const newNode = {
      id: newId,
      empresaId: empresa.id,
      parentId,
      isRoot: false,
      nome: empresa.nome,
      tipo: empresa.legalType || 'Ltda',
      cnpj: empresa.cnpj || '',
      percentual: Number(percentual) || 0,
      cor: ts.bg,
      corBorda: ts.border,
    };
    const newPos = { ...socCustomPos, [newId]: { x: offsetX, y: offsetY } };
    await saveSocNodes([...socNodes, newNode]);
    await saveSocPos(newPos);
    setSocPickModal(null);
    toast('Empresa adicionada ao organograma!', 'success');
  }

  function handleResetSocLayout() {
    setSocCustomPos({});
    db.config.put({ chave: SOC_POS_KEY, value: {} });
    setSocZoom(0.9);
    setSocPan({ x: 60, y: 60 });
  }

  async function addSocAnnot(item) {
    const newItem = { ...item, id: Date.now() };
    const list = [...socAnnots, newItem];
    await db.config.put({ chave: SOC_ANNOT_KEY, value: list });
    setSocAnnots(list);
    setSocAnnotSelId(newItem.id);
  }
  async function updateSocAnnot(updated) {
    const list = socAnnots.map(a => a.id===updated.id ? updated : a);
    await db.config.put({ chave: SOC_ANNOT_KEY, value: list });
    setSocAnnots(list);
  }
  async function deleteSocAnnot(id) {
    const list = socAnnots.filter(a => a.id!==id);
    await db.config.put({ chave: SOC_ANNOT_KEY, value: list });
    setSocAnnots(list);
    setSocAnnotSelId(null);
  }
  function handleSocCanvasClick(e) {
    if (!socActiveTool) return;
    if (e.target.closest('.soc-node')) return;
    const rect = socRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - socPan.x) / socZoom;
    const y = (e.clientY - rect.top  - socPan.y) / socZoom;
    if (socActiveTool === 'texto') {
      addSocAnnot({ tipo:'texto', x, y, texto:'Texto', fontSize:14, cor:'#e2e8f0', bold:false });
    } else if (socActiveTool === 'icone') {
      setSocIconPicker({ x, y });
    } else if (socActiveTool === 'seta') {
      addSocAnnot({ tipo:'seta', x1:x, y1:y, x2:x+120, y2:y, cor:'#6470f1', espessura:2, tracejado:false });
    } else if (socActiveTool === 'borda') {
      addSocAnnot({ tipo:'borda', x, y, w:200, h:120, cor:'#6470f1', estilo:'solida', espessura:2, raio:10, fundo:false, label:'' });
    }
  }

  function handleSocAddFreeNode() {
    const newId = 'free-' + Date.now();
    const newNode = {
      id: newId, parentId: null, isRoot: false, isFree: true,
      nome: 'Novo Bloco', tipo: 'Outros', cnpj: '', percentual: 0,
      cor: '#2a2a2a', corBorda: '#6b7280',
    };
    const offset = Object.keys(socCustomPos).length;
    const newPos = { ...socCustomPos, [newId]: { x: 80 + (offset % 5) * 220, y: 200 + Math.floor(offset / 5) * 160 } };
    saveSocNodes([...socNodes, newNode]);
    saveSocPos(newPos);
    setSocModal({ ...newNode });
  }

  function handleSocAddRoot() {
    const newId = 'root-' + Date.now();
    const existingRoots = socNodes.filter(n => n.isRoot);
    const offsetX = existingRoots.length * (SOC_ROOT_W + 120);
    const newNode = {
      id: newId, parentId: null, isRoot: true,
      nome: 'Nova Controladora', tipo: 'Holding', cnpj: '', percentual: 100,
      cor: '#1a1a3b', corBorda: '#6470f1',
    };
    const newPos = { ...socCustomPos, [newId]: { x: offsetX + 40, y: 40 } };
    saveSocNodes([...socNodes, newNode]);
    saveSocPos(newPos);
    setSocModal({ ...newNode });
  }

  // ── Aba: Organograma por Empresa ────────────────────────────
  const [nodes, setNodes]         = useState([]);
  const [texts, setTexts]         = useState([]);
  const [empresas, setEmpresas]   = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedId, setSelectedId]   = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [editNode, setEditNode]   = useState(null);
  const [confirm, setConfirm]     = useState(null);
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x: 40, y: 40 });
  const ORG_POS_KEY = 'org_node_positions';
  const [orgCustomPos, setOrgCustomPos] = useState({});
  const [activeTool, setActiveTool] = useState(null);
  const [iconPicker, setIconPicker]   = useState(null);
  const [annots, setAnnots] = useState([]);
  const [annotSelId, setAnnotSelId] = useState(null);
  const containerRef = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef({});

  const load = useCallback(async () => {
    const [n, e, tx] = await Promise.all([db.orgNodes.toArray(), db.empresas.toArray(), db.orgTexts.toArray()]);
    setNodes(n); setEmpresas(e); setTexts(tx);
    setAnnots(tx.filter(t => t.tipo));
    if (e.length > 0 && !selectedEmp) setSelectedEmp(String(e[0].id));
    db.config.get(ORG_POS_KEY).then(rec => setOrgCustomPos(rec?.value || {}));
  }, []);

  useEffect(() => { if (activeTab === 'empresa') load(); }, [activeTab]);

  const empId    = Number(selectedEmp);
  const empNodes = nodes.filter(n => n.empresaId === empId);
  const layoutPositions = computeLayout(empNodes);
  const positions = {};
  empNodes.forEach(n => {
    positions[n.id] = orgCustomPos[n.id] || layoutPositions[n.id];
  });
  const posVals = Object.values(positions).filter(Boolean);
  const allX = posVals.map(p => p.x + NODE_W);
  const allY = posVals.map(p => p.y + NODE_H);
  const canvasW = (allX.length ? Math.max(...allX) : 600) + 80;
  const canvasH = (allY.length ? Math.max(...allY) : 400) + 80;
  const edges = empNodes.filter(n => n.parentId && positions[n.id] && positions[n.parentId]).map(n => {
    const cp = positions[n.parentId];
    const cc = positions[n.id];
    return { id:`${n.parentId}-${n.id}`, x1:cp.x+NODE_W/2, y1:cp.y+NODE_H, x2:cc.x+NODE_W/2, y2:cc.y };
  });
  const empTexts = texts.filter(tx => tx.empresaId === empId);

  async function addAnnot(item) {
    const id = await db.orgTexts.add({ ...item, empresaId: empId });
    setAnnots(prev => [...prev, { ...item, id, empresaId: empId }]);
    setAnnotSelId(id);
  }
  async function updateAnnot(updated) {
    await db.orgTexts.update(updated.id, updated);
    setAnnots(prev => prev.map(a => a.id===updated.id ? updated : a));
  }
  async function deleteAnnot(id) {
    await db.orgTexts.delete(id);
    setAnnots(prev => prev.filter(a => a.id!==id));
    setAnnotSelId(null);
  }

  function startDragOrgNode(e, nodeId, baseX, baseY) {
    e.stopPropagation();
    let dragging = false;
    const ref = { sx: e.clientX, sy: e.clientY, ox: baseX, oy: baseY };
    function onMove(ev) {
      const dx = ev.clientX - ref.sx, dy = ev.clientY - ref.sy;
      if (!dragging && Math.sqrt(dx*dx+dy*dy) < 5) return;
      dragging = true;
      setOrgCustomPos(prev => ({ ...prev, [nodeId]: { x: ref.ox + dx/zoom, y: ref.oy + dy/zoom } }));
    }
    function onUp() {
      if (dragging) setOrgCustomPos(prev => { db.config.put({ chave: ORG_POS_KEY, value: prev }); return prev; });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function handleCanvasDoubleClick(e) {
    if (activeTool !== 'texto') return;
    if (e.target.closest('.org-node-card') || e.target.closest('.org-text-label')) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top  - pan.y) / zoom;
    const id = await db.orgTexts.add({ empresaId: empId, x, y, texto: 'Texto livre', fontSize: 14, cor: '#e2e8f0', bold: false });
    setTexts(prev => [...prev, { id, empresaId: empId, x, y, texto: 'Texto livre', fontSize: 14, cor: '#e2e8f0', bold: false }]);
    setSelectedTextId(id);
  }
  async function handleUpdateText(updated) {
    await db.orgTexts.update(updated.id, updated);
    setTexts(prev => prev.map(tx => tx.id === updated.id ? updated : tx));
  }
  async function handleDeleteText(id) {
    await db.orgTexts.delete(id);
    setTexts(prev => prev.filter(tx => tx.id !== id));
    setSelectedTextId(null);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
  }
  function handleMouseDown(e) {
    if (e.target.closest('.org-node-card') || e.target.closest('.org-text-label')) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.style.cursor = 'grabbing';
  }
  function handleMouseMove(e) {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }
  function handleMouseUp(e) {
    isPanning.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = activeTool ? 'crosshair' : 'grab';
  }

  async function handleSaveNode(form) {
    try {
      if (form.id && !form._isNew) {
        const { _isNew, ...data } = form;
        await db.orgNodes.update(form.id, data);
      } else {
        const { id, _isNew, ...data } = form;
        await db.orgNodes.add(data);
      }
      await db.auditLog.add({ acao: `Bloco organograma ${form.id?'atualizado':'criado'}: ${form.nome}`, modulo: 'Organograma', timestamp: new Date().toISOString() });
      toast('Salvo!', 'success');
      setEditNode(null); setSelectedId(null); load();
    } catch(err) { toast('Erro ao salvar.', 'error'); }
  }
  function handleAddChild(parent) {
    setEditNode({ _isNew:true, empresaId:empId, parentId:parent.id, nome:'', cargo:'', texto:'', cor:'#1e2535', corBorda:'#6470f1' });
  }
  function handleAddRoot() {
    setEditNode({ _isNew:true, empresaId:empId, parentId:null, nome:'', cargo:'', texto:'', cor:'#3730a3', corBorda:'#6470f1' });
  }
  function handleDeleteNode(node) {
    const hasChildren = empNodes.some(n => n.parentId === node.id);
    setConfirm({
      msg: hasChildren
        ? `"${node.nome}" tem subordinados. Excluir vai deixá-los sem pai. Continuar?`
        : `Excluir "${node.nome}" do organograma?`,
      onConfirm: async () => {
        await db.orgNodes.delete(node.id);
        await db.auditLog.add({ acao:`Bloco excluído: ${node.nome}`, modulo:'Organograma', timestamp:new Date().toISOString() });
        toast('Excluído!', 'success');
        setConfirm(null); setSelectedId(null); load();
      }
    });
  }
  function handleCanvasClick(e, ref, currentPan, currentZoom) {
    if (!activeTool) return;
    if (e.target.closest('.org-node-card,.org-text-label')) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - currentPan.x) / currentZoom;
    const y = (e.clientY - rect.top  - currentPan.y) / currentZoom;
    if (activeTool === 'texto') {
      addAnnot({ tipo:'texto', x, y, texto:'Texto', fontSize:14, cor:'#e2e8f0', bold:false });
    } else if (activeTool === 'icone') {
      setIconPicker({ x, y });
    } else if (activeTool === 'seta') {
      addAnnot({ tipo:'seta', x1:x, y1:y, x2:x+120, y2:y, cor:'#6470f1', espessura:2, tracejado:false });
    } else if (activeTool === 'borda') {
      addAnnot({ tipo:'borda', x, y, w:200, h:120, cor:'#6470f1', estilo:'solida', espessura:2, raio:10, fundo:false, label:'' });
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.orgchart}</div>
        </div>
      </div>

      {/* Tab bar — hidden when inside company detail */}
      <div style={{ display: socView === 'empresa-detail' ? 'none' : 'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--surface-border)', paddingBottom:0 }}>
        {[
          { key:'societario', icon:'fa-diagram-project', label:'Organograma Societário' },
          { key:'empresa',    icon:'fa-sitemap',          label:'Por Empresa' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
              background:'transparent', border:'none',
              borderBottom: activeTab===tab.key ? '2px solid var(--brand)' : '2px solid transparent',
              color: activeTab===tab.key ? 'var(--brand)' : 'var(--text-muted)',
              marginBottom:-1, transition:'color .15s, border-color .15s',
              display:'flex', alignItems:'center', gap:7,
            }}>
            <i className={`fas ${tab.icon}`} style={{fontSize:12}}/>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA: ORGANOGRAMA SOCIETÁRIO ── */}
      {activeTab === 'societario' && socView === 'empresa-detail' && (
        <div style={{
          opacity: detailVisible ? 1 : 0,
          transform: detailVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity .25s ease, transform .25s ease',
        }}>
          <SocEmpresaPage
            nodeId={socDetailId}
            allNodes={socNodes}
            onBack={closeSocDetail}
            onUpdateNode={handleUpdateSocNode}
            onNavigateTo={openSocDetail}
          />
        </div>
      )}
      {activeTab === 'societario' && socView === 'chart' && (
        <div style={{ position:'relative' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSocZoom(z=>Math.max(.2,z-.1))}>
              <i className="fas fa-minus"/>
            </button>
            <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:40, textAlign:'center' }}>{Math.round(socZoom*100)}%</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSocZoom(z=>Math.min(2.5,z+.1))}>
              <i className="fas fa-plus"/>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleResetSocLayout} title="Resetar layout e zoom">
              <i className="fas fa-expand"/>Reset
            </button>
            <div style={{width:1,height:24,background:'var(--surface-border)',margin:'0 4px'}}/>
            <button className="btn btn-ghost btn-sm" onClick={handleSocAddRoot} style={{fontSize:12}}>
              <i className="fas fa-crown" style={{color:'#f59e0b',marginRight:5,fontSize:11}}/>
              + Controladora
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleSocAddFreeNode} style={{fontSize:12}}>
              <i className="fas fa-square-plus" style={{marginRight:5,fontSize:11}}/>
              + Bloco livre
            </button>
            <div style={{width:1,height:24,background:'var(--surface-border)',margin:'0 4px'}}/>
            <OrgAnnotationToolbar activeTool={socActiveTool} onSetTool={setSocActiveTool}/>
            <div style={{flex:1}}/>
            {socActiveTool && <span style={{ fontSize:11, color:'var(--brand)' }}><i className="fas fa-circle-info" style={{ marginRight:4 }}/>Ferramenta ativa: <strong>{socActiveTool}</strong> — clique no canvas para adicionar</span>}
          </div>

          {/* Canvas */}
          <div
            ref={socRef}
            style={{
              width:'100%', height:620, overflow:'hidden',
              background:'var(--surface)',
              border:'1px solid var(--surface-border)',
              borderRadius:16, cursor: socActiveTool ? 'crosshair' : 'grab', position:'relative',
              userSelect:'none',
            }}
            onWheel={socHandleWheel}
            onMouseDown={socHandleMouseDown}
            onMouseMove={socHandleMouseMove}
            onMouseUp={socHandleMouseUp}
            onMouseLeave={socHandleMouseUp}
            onClick={e=>{
              handleSocCanvasClick(e);
              if(!e.target.closest('.soc-node')) { setSocSelId(null); setSocAnnotSelId(null); }
            }}
          >
            {/* Grid background */}
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
              <defs>
                <pattern id="socgrid" width="40" height="40" patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${socPan.x%40},${socPan.y%40}) scale(${socZoom})`}>
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#socgrid)"/>
            </svg>

            {/* Pan/zoom layer */}
            <div style={{ transform:`translate(${socPan.x}px,${socPan.y}px) scale(${socZoom})`, transformOrigin:'0 0', position:'absolute', width:socCanvasW, height:socCanvasH }}>

              {/* SVG edges */}
              <svg style={{ position:'absolute', inset:0, width:socCanvasW, height:socCanvasH, overflow:'visible', pointerEvents:'none' }}>
                <defs>
                  {socEdges.map(edge => (
                    <marker key={`m-${edge.id}`} id={`arr-${edge.id}`}
                      viewBox="0 0 10 10" refX="8" refY="5"
                      markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={edge.color} opacity=".7"/>
                    </marker>
                  ))}
                </defs>
                {socEdges.map(edge => (
                  <g key={edge.id}>
                    {/* Glow line */}
                    <path
                      d={socEdgePath(edge.x1,edge.y1,edge.x2,edge.y2)}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={3}
                      opacity={0.12}
                    />
                    {/* Main line */}
                    <path
                      d={socEdgePath(edge.x1,edge.y1,edge.x2,edge.y2)}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={1.8}
                      opacity={0.55}
                      markerEnd={`url(#arr-${edge.id})`}
                    />
                    {/* Percentual badge on the line */}
                    <foreignObject
                      x={edge.midX - 20} y={edge.midY - 10}
                      width={40} height={20}
                      style={{overflow:'visible'}}>
                      <div style={{
                        background:'var(--surface-card)',
                        border:`1px solid ${edge.color}55`,
                        borderRadius:6, fontSize:10, fontWeight:800,
                        color:edge.color, textAlign:'center',
                        padding:'1px 4px', lineHeight:'18px',
                        whiteSpace:'nowrap',
                        boxShadow:`0 2px 8px ${edge.color}22`,
                      }}>
                        {edge.percentual}%
                      </div>
                    </foreignObject>
                  </g>
                ))}
              </svg>

              {/* Nodes */}
              {socNodes.map(node => {
                const pos = socPositions[node.id];
                if (!pos) return null;
                return (
                  <div key={node.id} className="soc-node">
                    <SocNode
                      node={node}
                      pos={pos}
                      isSelected={socSelId===node.id}
                      isHovered={socHovId===node.id}
                      onSelect={id=>setSocSelId(prev=>prev===id?null:id)}
                      onHover={setSocHovId}
                      onEdit={n=>setSocModal({...n})}
                      onDelete={handleSocDelete}
                      onAddChild={handleSocAddChild}
                      onDragStart={startDragSocNode}
                      onNavigate={openSocDetail}
                      zoom={socZoom}
                    />
                  </div>
                );
              })}

              {/* Annotation layer */}
              <OrgAnnotationLayer
                items={socAnnots}
                selectedId={socAnnotSelId}
                onSelect={id=>{setSocAnnotSelId(id);setSocSelId(null);}}
                onUpdate={updateSocAnnot}
                onDelete={deleteSocAnnot}
                zoom={socZoom}
                canvasW={socCanvasW}
                canvasH={socCanvasH}
                snapTargets={[
                  ...socNodes.map(node => {
                    const pos = socPositions[node.id];
                    if (!pos) return null;
                    const w = node.isRoot ? SOC_ROOT_W : SOC_NODE_W;
                    const h = node.isRoot ? SOC_ROOT_H : SOC_NODE_H;
                    return { id: node.id, label: node.nome, cx: pos.x + w/2, cy: pos.y + h/2 };
                  }).filter(Boolean),
                  ...socAnnots.filter(a => a.tipo === 'seta').flatMap(a => [
                    { id: `${a.id}-t`, label: 'Seta (início)', cx: a.x1 || 0, cy: a.y1 || 0 },
                    { id: `${a.id}-m`, label: 'Seta (meio)', cx: ((a.x1||0)+(a.x2||0))/2, cy: ((a.y1||0)+(a.y2||0))/2 },
                    { id: `${a.id}-h`, label: 'Seta (fim)', cx: a.x2 || 0, cy: a.y2 || 0 },
                  ]),
                ]}
              />

              {/* Empty state */}
              {socNodes.length === 0 && (
                <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'var(--text-muted)' }}>
                  <i className="fas fa-diagram-project" style={{ fontSize:48, display:'block', marginBottom:16, opacity:.2 }}/>
                  <p style={{ fontSize:14 }}>Nenhum nó. Use o botão abaixo para adicionar.</p>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:'var(--text-muted)', flexWrap:'wrap', alignItems:'center' }}>
            {Object.entries(SOC_TIPO_COLORS).slice(0,5).map(([tipo, s]) => (
              <span key={tipo}>
                <i className="fas fa-circle" style={{color:s.badge,fontSize:8,marginRight:4}}/>
                {tipo}
              </span>
            ))}
            <span style={{marginLeft:'auto'}}>
              <i className="fas fa-percent" style={{marginRight:4}}/>% = participação exibida na conexão
            </span>
          </div>

          {/* FAB — Add company */}
          <button
            onClick={() => {
              const root = socNodes.find(n=>n.isRoot);
              setSocPickModal({ parentId: root?.id || '' });
            }}
            style={{
              position:'fixed', bottom:32, right:32, zIndex:1000,
              width:52, height:52, borderRadius:'50%',
              background:'var(--brand)', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 20px rgba(100,112,241,.6)',
              color:'#fff', fontSize:20,
              transition:'transform .15s, box-shadow .15s',
            }}
            title="Adicionar Empresa"
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1)';e.currentTarget.style.boxShadow='0 6px 28px rgba(100,112,241,.8)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 4px 20px rgba(100,112,241,.6)';}}
          >
            <i className="fas fa-plus"/>
          </button>
        </div>
      )}

      {/* ── ABA: POR EMPRESA ── */}
      {activeTab === 'empresa' && (
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <select className="form-select" style={{ maxWidth:220 }} value={selectedEmp} onChange={e=>{setSelectedEmp(e.target.value);setSelectedId(null);}}>
              {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            {selectedEmp && (
              <button className="btn btn-ghost btn-sm" title="Ver página da empresa" onClick={()=>navigate('companies', { openEmpresaId: Number(selectedEmp) })}
                style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                <i className="fas fa-arrow-up-right-from-square" style={{fontSize:11}}/>Ver empresa
              </button>
            )}
            <button className="btn btn-primary" onClick={handleAddRoot}><i className="fas fa-plus"/>Novo bloco</button>
            <button className="btn btn-ghost" onClick={()=>{setZoom(1);setPan({x:40,y:40});}}><i className="fas fa-expand"/>Reset</button>
            <button className="btn btn-ghost" title="Auto-layout" onClick={()=>{ setOrgCustomPos(prev=>{ const n={...prev}; empNodes.forEach(nd=>delete n[nd.id]); db.config.put({chave:ORG_POS_KEY,value:n}); return n; }); }}><i className="fas fa-sitemap"/>Auto</button>
            <div style={{width:1,height:24,background:'var(--surface-border)',margin:'0 4px'}}/>
            <OrgAnnotationToolbar activeTool={activeTool} onSetTool={setActiveTool}/>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setZoom(z=>Math.max(.3,z-.1))}><i className="fas fa-minus"/></button>
            <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:40, textAlign:'center' }}>{Math.round(zoom*100)}%</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setZoom(z=>Math.min(2,z+.1))}><i className="fas fa-plus"/></button>
            {activeTool && <span style={{ fontSize:11, color:'var(--brand)', marginLeft:8 }}><i className="fas fa-circle-info" style={{ marginRight:4 }}/>Ferramenta ativa: <strong>{activeTool}</strong> — clique no canvas para adicionar</span>}
          </div>

          <div
            ref={containerRef}
            className="org-canvas-wrap"
            style={{ width:'100%', height:560, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--surface-border)', borderRadius:16, cursor: activeTool?'crosshair':'grab', position:'relative' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleCanvasDoubleClick}
            onClick={e=>{ handleCanvasClick(e, containerRef, pan, zoom); if(e.target===containerRef.current||e.target.tagName==='svg'||e.target.tagName==='path'){setSelectedId(null);setSelectedTextId(null);setAnnotSelId(null);}}}
          >
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x%32},${pan.y%32}) scale(${zoom})`}>
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>
            <div style={{ transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:'0 0', position:'absolute', width:canvasW, height:canvasH }}>
              <svg style={{ position:'absolute', inset:0, width:canvasW, height:canvasH, overflow:'visible', pointerEvents:'none' }}>
                {edges.map(e => (
                  <path key={e.id} d={edgePath(e.x1,e.y1,e.x2,e.y2)} fill="none" stroke="rgba(100,112,241,0.35)" strokeWidth="2"/>
                ))}
              </svg>
              {empNodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;
                return (
                  <div key={node.id} className="org-node-card">
                    <OrgNodeCard node={node} pos={pos} isSelected={selectedId===node.id}
                      onSelect={id=>setSelectedId(prev=>prev===id?null:id)}
                      onEdit={n=>setEditNode({...n})} onDelete={handleDeleteNode} onAddChild={handleAddChild}
                      onDragStart={startDragOrgNode}/>
                  </div>
                );
              })}
              {empTexts.map(label => (
                <div key={label.id} className="org-text-label">
                  <OrgTextLabel label={label} isSelected={selectedTextId===label.id}
                    onSelect={id=>{setSelectedTextId(id);setSelectedId(null);}}
                    onUpdate={handleUpdateText} onDelete={handleDeleteText} zoom={zoom}/>
                </div>
              ))}
              <OrgAnnotationLayer
                items={annots.filter(a=>a.empresaId===empId)}
                selectedId={annotSelId}
                onSelect={id=>{setAnnotSelId(id);setSelectedId(null);setSelectedTextId(null);}}
                onUpdate={updateAnnot}
                onDelete={deleteAnnot}
                zoom={zoom}
                canvasW={canvasW}
                canvasH={canvasH}
                snapTargets={[
                  ...empNodes.map(node => {
                    const pos = positions[node.id];
                    if (!pos) return null;
                    return { id:String(node.id), label:node.titulo||node.cargo||'Bloco', cx:pos.x+NODE_W/2, cy:pos.y+NODE_H/2 };
                  }).filter(Boolean),
                  ...annots.filter(a => a.empresaId === empId && a.tipo === 'seta').flatMap(a => [
                    { id: `${a.id}-t`, label: 'Seta (início)', cx: a.x1 || 0, cy: a.y1 || 0 },
                    { id: `${a.id}-m`, label: 'Seta (meio)', cx: ((a.x1||0)+(a.x2||0))/2, cy: ((a.y1||0)+(a.y2||0))/2 },
                    { id: `${a.id}-h`, label: 'Seta (fim)', cx: a.x2 || 0, cy: a.y2 || 0 },
                  ]),
                ]}
              />
              {empNodes.length === 0 && (
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'var(--text-muted)' }}>
                  <i className="fas fa-sitemap" style={{ fontSize:40, display:'block', marginBottom:12, opacity:.3 }}/>
                  <p style={{ fontSize:14 }}>Nenhum bloco. Clique em <strong>+ Novo bloco</strong> para começar.</p>
                </div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:'var(--text-muted)' }}>
            <span><i className="fas fa-crown" style={{ color:'#f59e0b', marginRight:4 }}/>Raiz da hierarquia</span>
            <span><i className="fas fa-hand-pointer" style={{ marginRight:4 }}/>Clique para ver ações</span>
            <span><i className="fas fa-search-plus" style={{ marginRight:4 }}/>Scroll = zoom</span>
          </div>
        </div>
      )}

      {/* ── Modais societários ── */}
      {socPickModal && (
        <SocPickEmpresaModal
          empresas={empresas}
          socNodes={socNodes}
          defaultParentId={socPickModal.parentId}
          onAdd={handleSocAddFromPick}
          onCancel={()=>setSocPickModal(null)}
          onFreeNode={()=>{ setSocPickModal(null); handleSocAddFreeNode(); }}
        />
      )}
      {socModal && (
        <SocNodeModal
          node={socModal}
          allNodes={socNodes}
          onSave={handleSocSave}
          onCancel={()=>setSocModal(null)}
        />
      )}
      {socConfirm && (
        <ConfirmDialog
          msg={socConfirm.msg}
          onConfirm={socConfirm.onConfirm}
          onCancel={()=>setSocConfirm(null)}
          t={t}
        />
      )}
      {socIconPicker && (
        <OrgIconPicker
          onPick={iconName => {
            addSocAnnot({ tipo:'icone', x:socIconPicker.x, y:socIconPicker.y, icon:iconName, cor:'#6470f1', size:36 });
            setSocIconPicker(null);
          }}
          onClose={()=>setSocIconPicker(null)}
        />
      )}

      {/* ── Modais por empresa ── */}
      {editNode && (
        <OrgEditModal node={editNode} empresas={empresas} allNodes={empNodes}
          onSave={handleSaveNode} onCancel={()=>setEditNode(null)}/>
      )}
      {iconPicker && (
        <OrgIconPicker
          onPick={iconName => {
            addAnnot({ tipo:'icone', x:iconPicker.x, y:iconPicker.y, icon:iconName, cor:'#6470f1', size:36 });
            setIconPicker(null);
          }}
          onClose={()=>setIconPicker(null)}
        />
      )}
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} t={t}/>}
    </div>
  );
}
