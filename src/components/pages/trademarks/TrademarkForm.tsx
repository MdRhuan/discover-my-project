'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import type { Trademark, Empresa } from '@/types'
import { TIPO_MARCA_OPTIONS } from './types'
import { TrademarkFiles } from './TrademarkFiles'

interface Props {
  initial: Partial<Trademark>
  empresas: Empresa[]
  onClose: () => void
  onSaved: () => void
}

const BR_STATUS = ['Depositada', 'Em análise', 'Publicada para oposição', 'Concedida', 'Indeferida', 'Renovada', 'Caducada', 'Cancelada', 'Pendente']
const US_STATUS = ['Pending', 'Published', 'Registered', 'Abandoned', 'Cancelled']

export function TrademarkForm({ initial, empresas, onClose, onSaved }: Props) {
  const { toast } = useApp()
  const [form, setForm] = useState<Partial<Trademark>>(initial)
  const [savedId, setSavedId] = useState<number | null>(initial.id ?? null)
  const [saving, setSaving] = useState(false)

  const isUS = form.pais === 'US'
  const statusList = isUS ? US_STATUS : BR_STATUS
  const flag = isUS ? '🇺🇸' : '🇧🇷'
  const titleKind = isUS ? 'Marca EUA' : 'Marca Brasileira'
  const editing = !!initial.id

  function update<K extends keyof Trademark>(k: K, v: Trademark[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast('Nome da marca é obrigatório.', 'error'); return }
    if (!form.owner?.trim()) { toast('OWNER é obrigatório.', 'error'); return }
    if (!form.classe?.trim()) { toast('CLASS é obrigatório.', 'error'); return }
    if (!/^\d+$/.test(form.classe.trim())) { toast('CLASS deve conter apenas números.', 'error'); return }
    if (!form.status) { toast('STATUS é obrigatório.', 'error'); return }
    if (!isUS && !form.tipoMarca) { toast('TIPO DE MARCA é obrigatório.', 'error'); return }

    setSaving(true)
    try {
      let id = savedId
      if (id) {
        await db.trademarks.update(id, form)
      } else {
        id = await db.trademarks.add(form as Trademark)
        setSavedId(id)
      }
      await db.auditLog.add({
        acao: `Marca ${editing ? 'atualizada' : 'cadastrada'}: ${form.nome} (${form.pais})`,
        modulo: 'Trademarks',
        timestamp: new Date().toISOString(),
      })
      toast(editing ? 'Atualizado com sucesso!' : 'Salvo com sucesso! Você já pode anexar arquivos.', 'success')
      onSaved()
    } catch (e) {
      console.error(e)
      toast('Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`${flag} ${editing ? 'Editar' : 'Cadastrar'} ${titleKind}`}
      onClose={onClose}
      large
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {/* Nome */}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">{isUS ? 'TRADEMARK *' : 'NOME DA MARCA *'}</label>
          <input className="form-input" value={form.nome || ''} onChange={e => update('nome', e.target.value)} placeholder={isUS ? 'Brand name' : 'Ex: MERIDIAN'} />
        </div>

        {/* Owner */}
        <div className="form-group">
          <label className="form-label">OWNER *</label>
          <input className="form-input" value={form.owner || ''} onChange={e => update('owner', e.target.value)} placeholder="Titular" />
        </div>

        {/* Empresa relacionada */}
        <div className="form-group">
          <label className="form-label">EMPRESA</label>
          <select className="form-select" value={form.empresaId || ''} onChange={e => update('empresaId', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Nenhuma</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
          </select>
        </div>

        {/* Class */}
        <div className="form-group">
          <label className="form-label">CLASS *</label>
          <input
            className="form-input"
            value={form.classe || ''}
            onChange={e => update('classe', e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 35"
            inputMode="numeric"
          />
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="form-label">STATUS *</label>
          <select className="form-select" value={form.status || ''} onChange={e => update('status', e.target.value)}>
            {statusList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Campos específicos BR */}
        {!isUS && (
          <>
            <div className="form-group">
              <label className="form-label">TIPO DE MARCA *</label>
              <select className="form-select" value={form.tipoMarca || ''} onChange={e => update('tipoMarca', e.target.value)}>
                {TIPO_MARCA_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nº PROCESSO</label>
              <input className="form-input" value={form.numProcesso || ''} onChange={e => update('numProcesso', e.target.value)} placeholder="Ex: 921234567" />
            </div>
            <div className="form-group">
              <label className="form-label">Nº REGISTRO</label>
              <input className="form-input" value={form.numRegistro || ''} onChange={e => update('numRegistro', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">VALOR (R$)</label>
              <input
                className="form-input" type="number" step="0.01"
                value={form.valor ?? ''}
                onChange={e => update('valor', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0,00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">DATA DE DEPÓSITO</label>
              <input className="form-input" type="date" value={form.dataDeposito || ''} onChange={e => update('dataDeposito', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">DATA DE CONCESSÃO / VENCIMENTO</label>
              <input className="form-input" type="date" value={form.dataConcessao || ''} onChange={e => update('dataConcessao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">VENCIMENTO</label>
              <input className="form-input" type="date" value={form.dataVencimento || ''} onChange={e => update('dataVencimento', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">NEXT DEADLINE</label>
              <input className="form-input" type="date" value={form.nextDeadline || ''} onChange={e => update('nextDeadline', e.target.value)} />
            </div>
          </>
        )}

        {/* Campos específicos US */}
        {isUS && (
          <>
            <div className="form-group">
              <label className="form-label">US SERIAL NUMBER</label>
              <input className="form-input" value={form.usSerialNumber || ''} onChange={e => update('usSerialNumber', e.target.value)} placeholder="Ex: 90123456" />
            </div>
            <div className="form-group">
              <label className="form-label">REGISTRATION</label>
              <input className="form-input" value={form.usRegistration || ''} onChange={e => update('usRegistration', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">FILING DATE</label>
              <input className="form-input" type="date" value={form.filingDate || ''} onChange={e => update('filingDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">DUE DATE</label>
              <input className="form-input" type="date" value={form.dueDate || ''} onChange={e => update('dueDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">NEXT DEADLINE</label>
              <input className="form-input" type="date" value={form.nextDeadline || ''} onChange={e => update('nextDeadline', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">PROPOSED GOODS / SERVICES</label>
              <textarea className="form-textarea" rows={3} value={form.proposedGoods || ''} onChange={e => update('proposedGoods', e.target.value)} />
            </div>
          </>
        )}

        {/* Notes */}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">NOTES / OBSERVAÇÕES</label>
          <textarea className="form-textarea" rows={2} value={form.notas || ''} onChange={e => update('notas', e.target.value)} />
        </div>

        {/* Files */}
        <div style={{ gridColumn: '1/-1' }}>
          <TrademarkFiles trademarkId={savedId} />
        </div>
      </div>
    </Modal>
  )
}
