'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/Modal'
import type { Trademark, Empresa } from '@/types'
import { STATUS_OPTIONS, statusInfo, EMPTY_BR, EMPTY_US } from './trademarks/types'
import { CountryPicker } from './trademarks/CountryPicker'
import { TrademarkForm } from './trademarks/TrademarkForm'
import { MultiSelect } from './trademarks/MultiSelect'

const FILTERS_KEY = 'trademarks.filters.v1'

type PaisFilter = 'all' | 'BR' | 'US'
interface PersistedFilters {
  search: string
  pais: PaisFilter
  status: string[]
  classes: string[]
}

function loadFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        search: typeof p.search === 'string' ? p.search : '',
        pais: ['all', 'BR', 'US'].includes(p.pais) ? p.pais : 'all',
        status: Array.isArray(p.status) ? p.status : [],
        classes: Array.isArray(p.classes) ? p.classes : [],
      }
    }
  } catch { /* empty */ }
  return { search: '', pais: 'all', status: [], classes: [] }
}

export function TrademarksPage() {
  const { lang, toast } = useApp()
  const [rows, setRows] = useState<Trademark[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const initial = loadFilters()
  const [search, setSearch] = useState(initial.search)
  const [filterStatus, setFilterStatus] = useState<string[]>(initial.status)
  const [filterClasses, setFilterClasses] = useState<string[]>(initial.classes)
  const [filterPais, setFilterPais] = useState<PaisFilter>(initial.pais)
  const [picker, setPicker] = useState(false)
  const [editing, setEditing] = useState<Partial<Trademark> | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ search, pais: filterPais, status: filterStatus, classes: filterClasses }))
    } catch { /* empty */ }
  }, [search, filterPais, filterStatus, filterClasses])

  const load = useCallback(async () => {
    const [tm, emps] = await Promise.all([db.trademarks.toArray(), db.empresas.toArray()])
    setRows(tm); setEmpresas(emps)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  // Available classes derived from data (sorted)
  const classOptions = Array.from(new Set(rows.map(r => (r.classe || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))

  const filtered = rows.filter(r =>
    (filterPais === 'all' || (r.pais || 'BR') === filterPais) &&
    (filterStatus.length === 0 || (r.status && filterStatus.includes(r.status))) &&
    (filterClasses.length === 0 || (r.classe && filterClasses.includes(r.classe.trim()))) &&
    (!search ||
      r.nome?.toLowerCase().includes(search.toLowerCase()) ||
      r.numero?.toLowerCase().includes(search.toLowerCase()) ||
      r.numProcesso?.toLowerCase().includes(search.toLowerCase()) ||
      r.usSerialNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.classe?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleDelete(id: number) {
    try {
      await db.trademarks.delete(id)
      toast('Excluído com sucesso!', 'success'); setConfirmId(null); load()
    } catch { toast('Erro ao excluir.', 'error') }
  }

  function handlePickCountry(pais: 'BR' | 'US') {
    setPicker(false)
    setEditing(pais === 'BR' ? { ...EMPTY_BR } : { ...EMPTY_US })
  }

  const ativos = rows.filter(r => r.status === 'Concedida' || r.status === 'Renovada' || r.status === 'Registered').length
  const pendentes = rows.filter(r => ['Depositada', 'Em análise', 'Publicada para oposição', 'Pendente', 'Pending', 'Published'].includes(r.status || '')).length
  const vencendo = rows.filter(r => {
    const d = r.dataVencimento || r.nextDeadline || r.dueDate
    return d && d > today && d <= in90
  }).length

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Trademarks & Marcas</div>
          <div className="page-header-sub">{rows.length} marca{rows.length !== 1 ? 's' : ''} registrada{rows.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setPicker(true)}>
          <i className="fas fa-plus" />Adicionar Marca
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Registros ativos', val: ativos, color: 'var(--green)', bg: 'rgba(22,163,74,.12)', icon: 'fa-shield-halved' },
          { label: 'Em andamento', val: pendentes, color: 'var(--yellow)', bg: 'rgba(245,158,11,.12)', icon: 'fa-hourglass-half' },
          { label: 'Vencendo em 90d', val: vencendo, color: 'var(--orange)', bg: 'rgba(249,115,22,.12)', icon: 'fa-clock' },
          { label: 'Total', val: rows.length, color: 'var(--brand)', bg: 'var(--brand-dim)', icon: 'fa-registered' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fas ${k.icon}`} style={{ fontSize: 15, color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <i className="fas fa-search" />
            <input placeholder="Buscar marca, owner, número, classe..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="tabs">
            {[['all', 'Todos'], ['BR', '🇧🇷 Brasil'], ['US', '🇺🇸 EUA']].map(([v, l]) => (
              <button key={v} className={`tab ${filterPais === v ? 'active' : ''}`} onClick={() => setFilterPais(v as PaisFilter)}>{l}</button>
            ))}
          </div>
          <MultiSelect
            label="Status"
            icon="fa-flag"
            options={[...STATUS_OPTIONS]}
            selected={filterStatus}
            onChange={setFilterStatus}
            placeholder="Todos"
            width={220}
          />
          <MultiSelect
            label="Classe"
            icon="fa-tag"
            options={classOptions}
            selected={filterClasses}
            onChange={setFilterClasses}
            placeholder={classOptions.length ? 'Todas' : 'Sem classes'}
            width={200}
          />
          {(search || filterStatus.length > 0 || filterClasses.length > 0 || filterPais !== 'all') && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              onClick={() => { setSearch(''); setFilterStatus([]); setFilterClasses([]); setFilterPais('all') }}
            >
              <i className="fas fa-xmark" />Limpar filtros
            </button>
          )}
        </div>

        {/* Active filter chips + result count */}
        {(filterStatus.length > 0 || filterClasses.length > 0 || filterPais !== 'all' || search) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}:
            </span>
            {filterPais !== 'all' && (
              <FilterChip label={filterPais === 'BR' ? '🇧🇷 Brasil' : '🇺🇸 EUA'} onRemove={() => setFilterPais('all')} />
            )}
            {filterStatus.map(s => (
              <FilterChip key={`s-${s}`} label={s} onRemove={() => setFilterStatus(filterStatus.filter(x => x !== s))} />
            ))}
            {filterClasses.map(c => (
              <FilterChip key={`c-${c}`} label={`Classe ${c}`} onRemove={() => setFilterClasses(filterClasses.filter(x => x !== c))} />
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>País</th><th>Marca</th><th>Owner</th><th>Class</th>
                <th>Número</th><th>Status</th><th>Depósito</th><th>Próxima data</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state"><i className="fas fa-registered" /><p>Nenhuma marca encontrada.</p></div></td></tr>}
              {filtered.map(r => {
                const info = statusInfo(r.status)
                const isUS = r.pais === 'US'
                const numero = isUS ? (r.usSerialNumber || r.usRegistration) : (r.numProcesso || r.numRegistro || r.numero)
                const deposito = isUS ? r.filingDate : r.dataDeposito
                const proxima = r.nextDeadline || r.dueDate || r.dataVencimento
                const isExpiring = proxima && proxima > today && proxima <= in90
                const isExpired = proxima && proxima < today
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: 18 }}>{isUS ? '🇺🇸' : '🇧🇷'}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nome}</div>
                      {r.notas && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.notas.slice(0, 60)}{r.notas.length > 60 ? '…' : ''}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{r.owner || '—'}</td>
                    <td style={{ fontSize: 12 }}>{r.classe || '—'}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{numero || '—'}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: info.color, fontWeight: 600, background: info.bg, borderRadius: 6, padding: '3px 8px' }}>
                        <i className={`fas ${info.icon}`} style={{ fontSize: 10 }} />{r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deposito ? fmt.date(deposito, lang) : '—'}</td>
                    <td style={{ fontSize: 12, color: isExpired ? 'var(--red)' : isExpiring ? 'var(--yellow)' : 'var(--text-secondary)', fontWeight: (isExpired || isExpiring) ? 700 : 400 }}>
                      {proxima ? fmt.date(proxima, lang) : '—'}
                      {isExpired && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => setEditing({ ...r })}><i className="fas fa-pen" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmId(r.id!)}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {picker && <CountryPicker onPick={handlePickCountry} onClose={() => setPicker(false)} />}

      {editing && (
        <TrademarkForm
          initial={editing}
          empresas={empresas}
          onClose={() => setEditing(null)}
          onSaved={() => { load() }}
        />
      )}

      {confirmId !== null && <ConfirmDialog msg="Deseja realmente excluir esta marca?" onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
