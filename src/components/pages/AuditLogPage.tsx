'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { timeAgo } from '@/lib/utils'
import type { AuditLog } from '@/types'

export function AuditLogPage() {
  const { t } = useApp()
  const [rows, setRows] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    db.auditLog.orderBy('timestamp').reverse().limit(200).toArray().then(setRows)
  }, [])

  const filtered = rows.filter(r => !search || r.acao.toLowerCase().includes(search.toLowerCase()) || (r.modulo || '').toLowerCase().includes(search.toLowerCase()))

  const iconFor = (acao = '') => {
    if (acao.includes('mpresa'))  return { icon: 'fa-building',   color: 'var(--brand)' }
    if (acao.includes('Task'))    return { icon: 'fa-list-check',  color: 'var(--yellow)' }
    if (acao.includes('ocumento'))return { icon: 'fa-file',        color: 'var(--green)' }
    if (acao.includes('uncion'))  return { icon: 'fa-user',        color: 'var(--blue)' }
    if (acao.includes('ackup'))   return { icon: 'fa-database',    color: 'var(--gray)' }
    if (acao.includes('ogin'))    return { icon: 'fa-key',         color: 'var(--orange)' }
    return { icon: 'fa-circle-dot', color: 'var(--text-muted)' }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title"><i className="fas fa-shield-halved" style={{ marginRight: 10, color: 'var(--brand)' }} />Auditoria</div>
          <div className="page-header-sub">{rows.length} registros de atividade</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="search-bar" style={{ maxWidth: 320 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-shield-halved" /><p>Nenhuma ação registrada.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((log, idx) => {
              const ic = iconFor(log.acao)
              const isLast = idx === filtered.length - 1
              return (
                <div key={log.id ?? idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--surface-border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${ic.icon}`} style={{ fontSize: 12, color: ic.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{log.acao}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                      {log.modulo && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{log.modulo}</span>}
                      <span>{timeAgo(log.timestamp)}</span>
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
