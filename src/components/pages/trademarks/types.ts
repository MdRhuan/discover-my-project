import type { Trademark } from '@/types'

export const STATUS_OPTIONS = [
  // BR
  'Depositada',
  'Em análise',
  'Publicada para oposição',
  'Concedida',
  'Indeferida',
  'Renovada',
  'Caducada',
  'Cancelada',
  'Pendente',
  // US
  'Pending',
  'Published',
  'Registered',
  'Abandoned',
  'Cancelled',
] as const

export const STATUS_INFO: Record<string, { color: string; bg: string; icon: string }> = {
  'Depositada':              { color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  icon: 'fa-file-import' },
  'Em análise':              { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: 'fa-magnifying-glass' },
  'Publicada para oposição': { color: '#06b6d4', bg: 'rgba(6,182,212,.12)',   icon: 'fa-bullhorn' },
  'Concedida':               { color: '#16a34a', bg: 'rgba(22,163,74,.12)',   icon: 'fa-shield-halved' },
  'Indeferida':              { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: 'fa-ban' },
  'Renovada':                { color: '#16a34a', bg: 'rgba(22,163,74,.12)',   icon: 'fa-rotate' },
  'Caducada':                { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: 'fa-hourglass-end' },
  'Cancelada':               { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: 'fa-circle-xmark' },
  'Pendente':                { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: 'fa-hourglass-half' },
  'Pending':                 { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: 'fa-hourglass-half' },
  'Published':               { color: '#06b6d4', bg: 'rgba(6,182,212,.12)',   icon: 'fa-bullhorn' },
  'Registered':              { color: '#16a34a', bg: 'rgba(22,163,74,.12)',   icon: 'fa-shield-halved' },
  'Abandoned':               { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: 'fa-archive' },
  'Cancelled':               { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: 'fa-ban' },
}

export const TIPO_MARCA_OPTIONS = [
  'Nominativa', 'Mista', 'Figurativa', 'Tridimensional', 'Posição',
] as const

export const EMPTY_BR: Partial<Trademark> = {
  pais: 'BR', jurisdicao: 'BR',
  nome: '', owner: '', classe: '', status: 'Depositada', tipoMarca: 'Nominativa',
  numProcesso: '', numRegistro: '', valor: undefined,
  dataDeposito: '', dataConcessao: '', dataVencimento: '', nextDeadline: '', notas: '',
}

export const EMPTY_US: Partial<Trademark> = {
  pais: 'US', jurisdicao: 'US',
  nome: '', owner: '', classe: '', status: 'Pending',
  usSerialNumber: '', usRegistration: '',
  filingDate: '', dueDate: '', nextDeadline: '', proposedGoods: '', notas: '',
}

export function statusInfo(s?: string) {
  return STATUS_INFO[s || ''] || { color: 'var(--text-muted)', bg: 'var(--surface-hover)', icon: 'fa-circle-question' }
}
