// ── Globals: React hooks destructure + Theme ─────────────────
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ── Input sanitization ────────────────────────────────────────
// Remove HTML tags e caracteres de controle de strings de input
function sanitizeText(str, maxLength = 500) {
  if (str === null || str === undefined) return '';
  return String(str)
    .slice(0, maxLength)
    .replace(/[<>]/g, '')              // remove < > (XSS tags)
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, ''); // remove control chars
}

// Valida que um valor é número finito dentro de limites
function sanitizeNumber(val, min = -1e12, max = 1e12) {
  const n = parseFloat(val);
  if (!isFinite(n)) return 0;
  return Math.min(Math.max(n, min), max);
}

// ── Theme ─────────────────────────────────────────────────────
// Inicializa o tema antes do primeiro render para evitar flash
(function initTheme() {
  const saved = localStorage.getItem('hub-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function useTheme() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hub-theme', next);
    setTheme(next);
  };
  return { theme, toggle };
}
