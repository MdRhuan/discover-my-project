// ── Web Crypto: PBKDF2 com salt (resistente a brute force) ───
// Gera salt aleatório de 16 bytes
function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

// Deriva hash da senha usando PBKDF2 (310.000 iterações, SHA-256)
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 310000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Verifica senha comparando em tempo constante
async function verifyPassword(password, storedHash, storedSalt) {
  const computed = await hashPassword(password, storedSalt);
  // Comparação em tempo constante para evitar timing attacks
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

// Mantido para compatibilidade com hashes antigos (SHA-256 simples)
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Formatters ───────────────────────────────────────────────
const fmt = {
  currency(val, moeda = 'BRL', lang = 'pt-BR') {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: moeda, maximumFractionDigits: 0 }).format(val);
  },
  date(str, lang = 'pt-BR') {
    if (!str) return '—';
    return new Date(str + 'T12:00:00').toLocaleDateString(lang);
  },
  number(val) {
    return new Intl.NumberFormat('pt-BR').format(val);
  },
  initials(nome) {
    return (nome || '').split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
  },
  avatarColor(nome) {
    const colors = ['#6470f1','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];
    let h = 0;
    for (let c of (nome||'')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }
};

// ── Context ──────────────────────────────────────────────────
const AppContext = createContext(null);
function useApp() { return useContext(AppContext); }

// ── Toast component ──────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={t.type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel, t: tProp }) {
  const ctx = useApp();
  const t = tProp || ctx?.t || { cancel: 'Cancelar', confirm: 'Confirmar' };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title" style={{fontSize:16}}><i className="fas fa-exclamation-triangle" style={{color:'var(--yellow)',marginRight:8}}/>Confirmar</div>
        <p style={{color:'var(--text-secondary)',marginBottom:20,fontSize:14}}>{msg}</p>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>{t.cancel}</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
