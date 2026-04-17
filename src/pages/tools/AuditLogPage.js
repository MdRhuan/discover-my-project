// ── Audit Log ────────────────────────────────────────────────
function AuditLogPage() {
  const { t, lang } = useApp();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    db.auditLog.orderBy('id').reverse().limit(200).toArray().then(setRows);
  }, []);

  const moduloColor = { 'Auth':'brand', 'Empresas':'green', 'Funcionários':'blue', 'Documentos':'yellow', 'Faturamento':'green', 'Backup':'yellow', 'Sistema':'brand' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.auditLog}</div>
          <div className="page-header-sub">{rows.length} registros de auditoria</div>
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <div className="empty-state"><i className="fas fa-shield-halved"/><p>Nenhum registro de auditoria ainda.</p></div>
        ) : rows.map(r => (
          <div key={r.id} className="audit-row">
            <div className="audit-dot" style={{background:`var(--${moduloColor[r.modulo]||'brand'})`}}/>
            <div style={{flex:1}}>
              <div style={{color:'var(--text-primary)'}}>{r.acao}</div>
              <div style={{color:'var(--text-muted)',fontSize:11,marginTop:2}}>
                <span className={`badge badge-${moduloColor[r.modulo]||'brand'}`} style={{padding:'1px 6px',fontSize:10}}>{r.modulo}</span>
                <span style={{marginLeft:8}}>{r.timestamp ? new Date(r.timestamp).toLocaleString(lang) : '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
