'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

export function AuthScreen() {
  const { lang, setLang, t } = useApp()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (!session) {
        setChecking(false)
        mountTimer = setTimeout(() => setMounted(true), 30)
      }
    })
    return () => {
      cancelled = true
      if (mountTimer) clearTimeout(mountTimer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!email.trim()) { setErr('Informe o e-mail.'); return }
    if (!pw) { setErr('Informe a senha.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setLoading(false)

    if (error) {
      if (error.message === 'Invalid login credentials') setErr('E-mail ou senha incorretos.')
      else if (error.message.includes('Email not confirmed')) setErr('Confirme seu e-mail antes de entrar.')
      else setErr(error.message)
      setPw('')
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: '-1px' }}>
            Hub<span style={{ color: 'var(--brand)' }}>.</span>
          </div>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    )
  }

  const features = [
    { icon: 'fa-building', text: 'Gestão completa de empresas e sócios' },
    { icon: 'fa-chart-line', text: 'Financeiro, fiscal e jurídico integrados' },
    { icon: 'fa-shield-halved', text: 'Dados seguros com acesso controlado' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {/* Left Panel */}
      <div
        className="auth-left-panel"
        style={{
          width: '42%', minHeight: '100vh',
          background: 'linear-gradient(160deg, #0f1117 0%, #111827 50%, #1a2338 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 52px', position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}
      >
        <div style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, background: 'radial-gradient(circle, rgba(74,108,247,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(74,108,247,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div>
          <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1px', color: '#fff', lineHeight: 1 }}>
            Hub<span style={{ color: 'var(--brand)' }}>.</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
            Empresarial
          </div>
        </div>

        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 16 }}>
            Tudo que sua empresa precisa,<br />
            <span style={{ color: 'var(--brand)', opacity: 0.9 }}>em um só lugar.</span>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 44 }}>
            Gestão integrada para grupos empresariais modernos.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(74,108,247,0.15)', border: '1px solid rgba(74,108,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fas ${f.icon}`} style={{ color: 'var(--brand)', fontSize: 15 }} />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} Hub Empresarial · Acesso restrito
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 6 }}>
          <button className={`topbar-pill ${lang === 'pt-BR' ? 'active' : ''}`} onClick={() => setLang('pt-BR')}>PT</button>
          <button className={`topbar-pill ${lang === 'en-US' ? 'active' : ''}`} onClick={() => setLang('en-US')}>EN</button>
        </div>

        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.45s ease both' }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 10 }}>
              Bem-vindo de volta
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2, margin: 0 }}>
              Acesse sua conta
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Entre com suas credenciais para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <i className="fas fa-envelope" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                E-mail
              </label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <i className="fas fa-lock" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                {t.password}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                >
                  <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            {err && (
              <div className="alert alert-error" style={{ padding: '10px 14px', fontSize: 13, margin: 0 }}>
                <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />{err}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14, marginTop: 4, borderRadius: 12 }}
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Entrando...</>
                : <><i className="fas fa-arrow-right-to-bracket" style={{ marginRight: 8 }} />{t.login}</>
              }
            </button>
          </form>

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 11, color: 'var(--text-muted)' }}>
            <i className="fas fa-lock" style={{ color: 'var(--brand)', fontSize: 10 }} />
            Acesso restrito · gerenciado pelo administrador
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) { .auth-left-panel { display: none !important; } }
      `}</style>
    </div>
  )
}
