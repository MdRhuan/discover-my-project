'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Lang, Currency, Toast, PageKey } from '@/types'
import { TRANSLATIONS, type Translations } from '@/lib/i18n'
import { db, supabaseSignOut } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AppContextValue {
  t: Translations
  lang: Lang
  setLang: (l: Lang) => void
  currency: Currency
  setCurrency: (c: Currency) => void
  toast: (msg: string, type?: Toast['type']) => void
  user: User | null
  setUser: (u: User | null) => void
  page: PageKey
  setPage: (p: PageKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  theme: string
  toggleTheme: () => void
  toasts: Toast[]
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [lang, setLang] = useState<Lang>('pt-BR')
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('hub-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = saved || (prefersDark ? 'dark' : 'light')
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    db.config.get('prefs').then(rec => {
      if (rec?.value && typeof rec.value === 'object') {
        const prefs = rec.value as { lang?: Lang; currency?: Currency }
        if (prefs.lang) setLang(prefs.lang)
        if (prefs.currency) setCurrency(prefs.currency)
      }
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    db.config.put({ chave: 'prefs', value: { lang, currency } }).catch(() => {})
  }, [lang, currency, user])

  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('hub-theme', next)
    setTheme(next)
  }, [theme])

  const t = TRANSLATIONS[lang]

  return (
    <AppContext.Provider value={{
      t, lang, setLang, currency, setCurrency, toast,
      user, setUser, page, setPage,
      sidebarOpen, setSidebarOpen, theme, toggleTheme, toasts,
    }}>
      {children}
    </AppContext.Provider>
  )
}
