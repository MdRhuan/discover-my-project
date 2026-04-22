'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

interface BemMovel {
  id: number
  descricao: string
  categoria: string
  proprietario?: string
  pais?: 'BR' | 'US'
  moeda?: 'BRL' | 'USD'
  valor_aquisicao?: number
  data_aquisicao?: string
  valor_mercado?: number
  localizacao?: string
  notas?: string
}

const CATEGORIAS = ['Veículo', 'Obra de Arte', 'Joia', 'Equipamento', 'Mobiliário', 'Eletrônico', 'Outros']

const EMPTY: Partial<BemMovel> = {
  descricao: '', categoria: 'Veículo', proprietario: '', pais: 'BR', moeda: 'BRL',
  valor_aquisicao: 0, valor_mercado: 0, data_aquisicao: '', localizacao: '', notas: '',
}

export function BensMoveisPage() {
  const { toast } = useApp()
  const [items, setItems] = useState<BemMovel[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<BemMovel>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<null | { msg: string; onConfirm: () => void }>(null)

  const load = useCallback(async () => {
    try {
      const cfg = await db.config.get('bensMoveis')
      const data = (cfg?.value as BemMovel[]) || []
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function persist(next: BemMovel[]) {
    setItems(next)
    await db.config.put({ chave: 'bensMoveis', value: next })
  }

  function openNew() {
    setEditId(null); setForm(EMPTY); setModal(true)
  }
  function openEdit(it: BemMovel) {
    setEditId(it.id); setForm(it); setModal(true)
  }

  async function save() {
    if (!form.descricao?.trim()) { toast('Informe a descrição', 'error'); return }
    if (editId != null) {
      const next = items.map(i => i.id === editId ? { ...(i), ...(form as BemMovel), id: editId } : i)
      await persist(next); toast('Atualizado', 'success')
    } else {
      const id = Date.now()
      const next = [...items, { ...(EMPTY as BemMovel), ...(form as BemMovel), id }]
      await persist(next); toast('Adicionado', 'success')
    }
    setModal(false)
  }

  async function remove(id: number) {
    setConfirm({
      msg: 'Excluir este bem?',
      onConfirm: async () => { await persist(items.filter(i => i.id !== id)); toast('Excluído', 'success'); setConfirm(null) },
    })
  }

  const totalAquisicao = items.reduce((s, i) => s + (Number(i.valor_aquisicao) || 0), 0)
  const totalMercado = items.reduce((s, i) => s + (Number(i.valor_mercado) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><i className="fas fa-couch" /> Bens Móveis</h1>
          <p className="page-subtitle">Cadastro de bens móveis (veículos, obras, joias, equipamentos)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fas fa-plus" /> Novo Bem
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total de Bens</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Valor de Aquisição</div>
          <div className="stat-value">{fmt.currency(totalAquisicao, "BRL")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Valor de Mercado</div>
          <div className="stat-value">{fmt.currency(totalMercado, "BRL")}</div>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-couch" style={{ fontSize: 32, marginBottom: 12, opacity: .5 }} />
            <div>Nenhum bem cadastrado.</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openNew}>
              <i className="fas fa-plus" /> Adicionar primeiro bem
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Proprietário</th>
                  <th>País</th>
                  <th>Aquisição</th>
                  <th>Valor Mercado</th>
                  <th style={{ width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    <td>{it.descricao}</td>
                    <td><span className="badge">{it.categoria}</span></td>
                    <td>{it.proprietario || '—'}</td>
                    <td>{it.pais || '—'}</td>
                    <td>{it.valor_aquisicao ? fmt.currency(it.valor_aquisicao, (it.moeda || 'BRL') as 'BRL'|'USD') : '—'}</td>
                    <td>{it.valor_mercado ? fmt.currency(it.valor_mercado, (it.moeda || 'BRL') as 'BRL'|'USD') : '—'}</td>
                    <td>
                      <button className="icon-btn" title="Editar" onClick={() => openEdit(it)}>
                        <i className="fas fa-pen" />
                      </button>
                      <button className="icon-btn" title="Excluir" onClick={() => remove(it.id)} style={{ color: 'var(--red)' }}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editId != null ? 'Editar Bem' : 'Novo Bem'} onClose={() => setModal(false)}>
          <div className="form-grid">
            <div className="form-row">
              <label>Descrição *</label>
              <input value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Categoria</label>
              <select value={form.categoria || 'Veículo'} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Proprietário</label>
              <input value={form.proprietario || ''} onChange={e => setForm({ ...form, proprietario: e.target.value })} />
            </div>
            <div className="form-row">
              <label>País</label>
              <select value={form.pais || 'BR'} onChange={e => setForm({ ...form, pais: e.target.value as 'BR'|'US' })}>
                <option value="BR">Brasil</option>
                <option value="US">Estados Unidos</option>
              </select>
            </div>
            <div className="form-row">
              <label>Moeda</label>
              <select value={form.moeda || 'BRL'} onChange={e => setForm({ ...form, moeda: e.target.value as 'BRL'|'USD' })}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="form-row">
              <label>Data de Aquisição</label>
              <input type="date" value={form.data_aquisicao || ''} onChange={e => setForm({ ...form, data_aquisicao: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Valor de Aquisição</label>
              <input type="number" value={form.valor_aquisicao ?? ''} onChange={e => setForm({ ...form, valor_aquisicao: Number(e.target.value) })} />
            </div>
            <div className="form-row">
              <label>Valor de Mercado</label>
              <input type="number" value={form.valor_mercado ?? ''} onChange={e => setForm({ ...form, valor_mercado: Number(e.target.value) })} />
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Localização</label>
              <input value={form.localizacao || ''} onChange={e => setForm({ ...form, localizacao: e.target.value })} />
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Notas</label>
              <textarea rows={3} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}

      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
