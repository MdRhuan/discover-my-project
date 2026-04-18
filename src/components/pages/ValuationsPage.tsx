'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Empresa } from '@/types'

interface HistoricoItem { data: string; valor: string }
interface DocAnexo { nome: string; tamanho?: string; tipo?: string; conteudo?: string }

interface Valuation {
  id: number
  empresaId: string
  data: string
  metodo: string
  valor: string
  proposito: string
  responsavel: string
  notas: string
  historico: HistoricoItem[]
  docs: DocAnexo[]
}

const EMPTY_FORM: Valuation = {
  id: 0, empresaId: '', data: '', metodo: 'DCF', valor: '',
  proposito: 'Gestão', responsavel: '', notas: '', historico: [], docs: [],
}

export function ValuationsPage() {
  const { lang, toast } = useApp()
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Valuation>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [emps, cfg] = await Promise.all([db.empresas.toArray(), db.config.get('valuations')])
    setEmpresas(emps)
    setValuations((cfg?.value as Valuation[]) || [])
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setForm({ ...EMPTY_FORM, id: Date.now() }); setModal(true) }
  function openEdit(v: Valuation) { setForm({ ...v }); setModal(true) }

  function download(d: DocAnexo) {
    if (!d.conteudo) { toast('Arquivo não disponível.', 'error'); return }
    const a = document.createElement('a'); a.href = d.conteudo; a.download = d.nome || 'doc'; a.click()
  }

  function attachFile() {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const doc: DocAnexo = {
          nome: file.name,
          tamanho: file.size / 1024 > 1024 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB',
          tipo: file.name.split('.').pop()?.toUpperCase(),
          conteudo: ev.target?.result as string,
        }
        setForm(f => ({ ...f, docs: [...f.docs, doc] }))
      }
      reader.readAsDataURL(file)
    }
    inp.click()
  }

  async function handleSave() {
    try {
      const updated = valuations.find(v => v.id === form.id)
        ? valuations.map(v => v.id === form.id ? form : v)
        : [...valuations, form]
      await db.config.put({ chave: 'valuations', value: updated })
      toast('Salvo com sucesso!', 'success'); setModal(false); load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast('Erro ao salvar: ' + msg, 'error')
    }
  }

  async function handleDelete(id: number) {
    try {
      const updated = valuations.filter(v => v.id !== id)
      await db.config.put({ chave: 'valuations', value: updated })
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  const parseValor = (s: string) => {
    const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Valuations</div>
          <div className="page-header-sub">{valuations.length} valuation{valuations.length !== 1 ? 's' : ''} registrado{valuations.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus" />Novo Valuation</button>
      </div>

      {valuations.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-chart-line" /><p>Nenhum valuation cadastrado.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {valuations.map(v => {
            const emp = empresas.find(e => String(e.id) === String(v.empresaId))
            const valor = v.valor ? parseValor(v.valor) : null
            return (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{emp?.nome || 'Entidade não vinculada'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.metodo} · {fmt.date(v.data, lang)} · {v.proposito}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                      {valor !== null ? fmt.currency(valor, 'BRL', lang) : v.valor || '—'}
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => openEdit(v)}><i className="fas fa-pen" />Editar</button>
                    <button className="btn-icon danger" onClick={() => setConfirmId(v.id)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '6px 20px', fontSize: 12 }}>
                  {[
                    { label: 'Método', val: v.metodo },
                    { label: 'Data', val: fmt.date(v.data, lang) },
                    { label: 'Propósito', val: v.proposito },
                    { label: 'Responsável', val: v.responsavel || '—' },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontWeight: 500, marginTop: 1 }}>{val || '—'}</div>
                    </div>
                  ))}
                </div>
                {v.notas && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--surface-hover)', borderRadius: 8, padding: '8px 12px' }}>{v.notas}</div>}
                {v.historico?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Histórico</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {v.historico.map((h, i) => (
                        <div key={i} style={{ background: 'var(--surface-hover)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }}>
                          <div style={{ color: 'var(--text-muted)' }}>{fmt.date(h.data, lang)}</div>
                          <div style={{ fontWeight: 600 }}>{h.valor}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {v.docs?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Documentos</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {v.docs.map((d, i) => (
                        <button key={i} onClick={() => download(d)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
                          <i className="fas fa-file-pdf" style={{ color: 'var(--brand)', fontSize: 10 }} />{d.nome.length > 28 ? d.nome.slice(0, 28) + '…' : d.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title={valuations.find(v => v.id === form.id) ? 'Editar Valuation' : 'Novo Valuation'} onClose={() => setModal(false)} large
          footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save" />Salvar</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Entidade</label>
              <select className="form-select" value={form.empresaId} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={String(e.id)}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data do Valuation</label>
              <input className="form-input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Método</label>
              <select className="form-select" value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}>
                {['DCF', 'Múltiplos de Mercado', 'Patrimônio Líquido', 'Book Value', 'Transações Comparáveis', 'Outro'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor (R$ ou US$)</label>
              <input className="form-input" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="Ex: 5.000.000" />
            </div>
            <div className="form-group">
              <label className="form-label">Propósito</label>
              <select className="form-select" value={form.proposito} onChange={e => setForm(f => ({ ...f, proposito: e.target.value }))}>
                {['Gestão', 'Transação', 'Fiscal', 'Planejamento Sucessório', 'Outro'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assessor Responsável</label>
              <input className="form-input" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Ex: Deloitte" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Documentos (Laudo, Metodologia)
                <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={attachFile}>
                  <i className="fas fa-paperclip" />Anexar
                </button>
              </label>
              {form.docs.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Nenhum documento anexado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {form.docs.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-hover)', borderRadius: 7, padding: '7px 12px' }}>
                      <i className="fas fa-file-pdf" style={{ color: 'var(--brand)', fontSize: 13, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{d.tamanho}</span>
                      {d.conteudo && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 3 }} onClick={() => download(d)}><i className="fas fa-download" style={{ fontSize: 11 }} /></button>}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 3 }} onClick={() => setForm(f => ({ ...f, docs: f.docs.filter((_, j) => j !== i) }))}><i className="fas fa-xmark" style={{ fontSize: 11 }} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir este valuation?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
