import type { Lang } from '@/types'

export const fmt = {
  currency(val: number, moeda: string = 'BRL', lang: Lang = 'pt-BR') {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: moeda,
      maximumFractionDigits: 0,
    }).format(val)
  },
  date(str: string | null | undefined, lang: Lang = 'pt-BR') {
    if (!str) return '—'
    return new Date(str + 'T12:00:00').toLocaleDateString(lang)
  },
  number(val: number) {
    return new Intl.NumberFormat('pt-BR').format(val)
  },
  initials(nome: string) {
    return (nome || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
  },
  avatarColor(nome: string) {
    const colors = ['#6470f1', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6']
    let h = 0
    for (const c of nome || '') h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
    return colors[Math.abs(h) % colors.length]
  },
}

export function convertVal(val: number, moeda: string, targetCurrency: string): number {
  if (moeda === targetCurrency) return val
  if (moeda === 'BRL') return val * (1 / 5.2)
  return val * 5.2
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function addDays(date: Date, n: number): string {
  const r = new Date(date)
  r.setDate(r.getDate() + n)
  return r.toISOString().slice(0, 10)
}

export function timeAgo(timestamp: string): string {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}
