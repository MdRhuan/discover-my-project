'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  icon?: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  width?: number
}

export function MultiSelect({ label, icon, options, selected, onChange, placeholder = 'Todos', width = 220 }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter(s => s !== v))
    else onChange([...selected, v])
  }

  const filtered = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()))
  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1 ? selected[0] : `${selected.length} selecionados`

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          color: selected.length ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
        }}
      >
        {icon && <i className={`fas ${icon}`} style={{ fontSize: 11, color: 'var(--text-muted)' }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{label}:</span>
          <span style={{ fontWeight: selected.length ? 600 : 400 }}>{summary}</span>
        </span>
        {selected.length > 0 && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange([]) }}
            style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6,
              background: 'var(--surface-hover)', color: 'var(--text-muted)',
            }}
            title="Limpar"
          >
            ✕
          </span>
        )}
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.18)', overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--surface-border)' }}>
            <input
              autoFocus
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6,
                background: 'var(--surface-hover)', border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhuma opção
              </div>
            )}
            {filtered.map(opt => {
              const checked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                    background: checked ? 'var(--brand-dim)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--surface-hover)' }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                  <span style={{ flex: 1 }}>{opt}</span>
                </label>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: 6, borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{ fontSize: 11, padding: '4px 8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ fontSize: 11, padding: '4px 10px', background: 'var(--brand)', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
