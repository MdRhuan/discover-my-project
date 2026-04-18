'use client'

import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'

interface ManagedUser {
  id: string
  email: string | null
  created_at: string
  role: 'admin' | 'user' | null
}

export function UsersPage() {
  const { isAdmin, user, toast } = useApp()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setUsers(data?.users ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)' }}>
        <i className="fas fa-lock" style={{ marginRight: 8 }} />
        Acesso restrito a administradores.
      </div>
    )
  }

  async function changeRole(u: ManagedUser, newRole: 'admin' | 'user') {
    if (u.role === newRole) return
    if (u.id === user?.id && newRole !== 'admin') {
      toast('Você não pode remover seu próprio acesso de admin', 'error')
      return
    }
    setSavingId(u.id)
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'set_role', user_id: u.id, role: newRole },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, role: newRole } : p))
      toast(`Papel atualizado para ${newRole}`, 'success')
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao salvar', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Usuários</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Gerencie os papéis de acesso dos usuários do sistema.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={load}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12, borderRadius: 8, background: 'var(--red-bg, #fee)',
          color: 'var(--red, #c00)', marginBottom: 16, fontSize: 13,
        }}>
          <i className="fas fa-triangle-exclamation" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--surface-border)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2, #f7f7f8)', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>E-mail</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Criado em</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Papel</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, width: 220 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Carregando…
              </td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhum usuário encontrado.
              </td></tr>
            )}
            {!loading && users.map(u => {
              const isMe = u.id === user?.id
              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    {u.email ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {isMe && <span style={{
                      marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--brand-bg, #eef)', color: 'var(--brand)',
                    }}>você</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.role === 'admin' ? (
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 500 }}>
                        Admin
                      </span>
                    ) : u.role === 'user' ? (
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 500 }}>
                        User
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>sem papel</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <select
                      value={u.role ?? 'user'}
                      disabled={savingId === u.id || (isMe && u.role === 'admin')}
                      onChange={(e) => changeRole(u, e.target.value as 'admin' | 'user')}
                      style={{
                        padding: '6px 10px', borderRadius: 6, border: '1px solid var(--surface-border)',
                        background: 'var(--surface)', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    {savingId === u.id && (
                      <i className="fas fa-spinner fa-spin" style={{ marginLeft: 8, color: 'var(--text-muted)' }} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
        <i className="fas fa-circle-info" style={{ marginRight: 6 }} />
        Para criar novos usuários, use o painel do Lovable Cloud → Users. Eles entram como
        <strong> User</strong> por padrão.
      </p>
    </div>
  )
}
