export interface Despesa {
  id: number
  categoria: string
  descricao: string
  pais: 'BR' | 'US'
  moeda: 'BRL' | 'USD'
  valor: number
  ativo: boolean
  notas?: string
}

export interface CategoriaInfo {
  key: string
  icon: string
  colorVar: string
  bg: string
  hex: string
}

export const CATEGORIAS: CategoriaInfo[] = [
  { key: 'Moradia',        icon: 'fa-house',          colorVar: 'var(--brand)',      bg: 'var(--brand-dim)',         hex: '#6470f1' },
  { key: 'Funcionários',   icon: 'fa-user-tie',       colorVar: 'var(--blue)',       bg: 'rgba(59,130,246,.12)',     hex: '#3b82f6' },
  { key: 'Transporte',     icon: 'fa-car',            colorVar: 'var(--yellow)',     bg: 'rgba(245,158,11,.12)',     hex: '#f59e0b' },
  { key: 'Seguros',        icon: 'fa-shield-halved',  colorVar: 'var(--green)',      bg: 'rgba(34,197,94,.12)',      hex: '#22c55e' },
  { key: 'Assinaturas',    icon: 'fa-credit-card',    colorVar: 'var(--orange)',     bg: 'rgba(249,115,22,.12)',     hex: '#f97316' },
  { key: 'Contabilidade',  icon: 'fa-calculator',     colorVar: '#a78bfa',           bg: 'rgba(167,139,250,.12)',    hex: '#a78bfa' },
  { key: 'Educação',       icon: 'fa-graduation-cap', colorVar: 'var(--brand)',      bg: 'var(--brand-dim)',         hex: '#8b5cf6' },
  { key: 'Saúde',          icon: 'fa-heart-pulse',    colorVar: 'var(--red)',        bg: 'rgba(239,68,68,.12)',      hex: '#ef4444' },
  { key: 'Outros',         icon: 'fa-ellipsis',       colorVar: 'var(--text-muted)', bg: 'var(--surface-hover)',     hex: '#94a3b8' },
]

export const EMPTY: Partial<Despesa> = {
  categoria: 'Moradia', descricao: '', pais: 'BR', moeda: 'BRL', valor: 0, ativo: true, notas: '',
}

export const catInfo = (key: string) =>
  CATEGORIAS.find(c => c.key === key) || CATEGORIAS[CATEGORIAS.length - 1]
