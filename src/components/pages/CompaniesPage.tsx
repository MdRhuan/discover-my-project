'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Empresa } from '@/types'

interface Socio { nome: string; documento: string; participacao: string; papel: string; email: string }

const EMPTY_EMPRESA: Partial<Empresa> = {
  nome: '', pais: 'BR', cnpj: '', ein: '', status: 'ativo',
  cidade: '', estado: '', website: '', legalType: '', taxRegime: '',
  fundacao: '', setor: '', notas: '', inscricaoEstadual: '',
  obrigacoesAcessorias: '', anoCalendario: '2024', dataEncerramento: '',
  ctbElection: '', cfcClass: 'nao-aplicavel',
}

interface ExtraData { socios: Socio[]; tags: string[]; email: string; telefone: string; observacoes: string }
const EMPTY_EXTRA: ExtraData = { socios: [], tags: [], email: '', telefone: '', observacoes: '' }

function parseNotas(notas?: string): { extra: ExtraData; legacy: string } {
  if (!notas) return { extra: EMPTY_EXTRA, legacy: '' }
  try {
    const obj = JSON.parse(notas)
    if (obj && typeof obj === 'object' && '__extra' in obj) {
      return { extra: { ...EMPTY_EXTRA, ...obj.__extra }, legacy: obj.legacy || '' }
    }
  } catch { /* not json */ }
  return { extra: EMPTY_EXTRA, legacy: notas }
}
function serializeNotas(extra: ExtraData): string {
  return JSON.stringify({ __extra: extra, legacy: extra.observacoes })
}

export function CompaniesPage() {
  const { t, lang, toast } = useApp()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [search, setSearch] = useState('')
  const [filterPais, setFilterPais] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Empresa>>(EMPTY_EMPRESA)
  const [extra, setExtra] = useState<ExtraData>(EMPTY_EXTRA)
  const [tab, setTab] = useState<'gerais' | 'socios' | 'fiscal' | 'tags'>('gerais')
  const [tagInput, setTagInput] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Empresa | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setEmpresas(await db.empresas.toArray())
  }

  async function save() {
    if (!form.nome?.trim()) { toast('Nome é obrigatório.', 'error'); return }
    try {
      const payload: Partial<Empresa> = { ...form, notas: serializeNotas(extra) }
      if (editing) {
        await db.empresas.update(editing, payload)
        await db.auditLog.add({ acao: `Empresa editada: ${form.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
        toast(t.saved)
      } else {
        await db.empresas.add(payload as Empresa)
        await db.auditLog.add({ acao: `Empresa criada: ${form.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
        toast(t.saved)
      }
      closeModal()
      load()
    } catch { toast(t.errorSave, 'error') }
  }

  function closeModal() {
    setModal(false); setForm(EMPTY_EMPRESA); setExtra(EMPTY_EXTRA); setEditing(null); setTab('gerais'); setTagInput('')
  }

  async function remove(id: number) {
    try {
      const e = empresas.find(x => x.id === id)
      await db.empresas.delete(id)
      await db.auditLog.add({ acao: `Empresa excluída: ${e?.nome}`, modulo: 'Empresas', timestamp: new Date().toISOString() })
      toast(t.deleted); setConfirmId(null); load()
    } catch { toast(t.errorSave, 'error') }
  }

  function openEdit(e: Empresa) {
    const { extra: ex } = parseNotas(e.notas)
    setForm({ ...e }); setExtra(ex); setEditing(e.id!); setTab('gerais'); setModal(true)
  }
  function openNew() {
    setForm(EMPTY_EMPRESA); setExtra(EMPTY_EXTRA); setEditing(null); setTab('gerais'); setModal(true)
  }

  const filtered = empresas.filter(e => {
    const matchPais = filterPais === 'all' || e.pais === filterPais
    const matchSearch = !search || e.nome.toLowerCase().includes(search.toLowerCase()) ||
      (e.cnpj || '').includes(search) || (e.ein || '').includes(search)
    return matchPais && matchSearch
  })

  const statusBadge = (s: string) => {
    const sl = s?.toLowerCase() || ''
    if (sl.includes('ativ') || sl === 'active') return 'badge-green'
    if (sl.includes('inativ') || sl === 'inactive') return 'badge-gray'
    return 'badge-brand'
  }

  const countryCounts = { BR: empresas.filter(e => e.pais === 'BR').length, US: empresas.filter(e => e.pais === 'US').length }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">{t.companies}</div>
          <div className="page-header-sub">{empresas.length} empresas no portfólio</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fas fa-plus" />{t.newCompany}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: empresas.length, icon: 'fa-building', color: 'var(--brand)' },
          { label: 'Ativas', value: empresas.filter(e => ['ativo','ativa'].includes((e.status||'').toLowerCase())).length, icon: 'fa-circle-check', color: 'var(--green)' },
          { label: 'Brasil', value: countryCounts.BR, icon: 'fa-flag', color: 'var(--brand)' },
          { label: 'EUA', value: countryCounts.US, icon: 'fa-flag', color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
            <i className="fas" style={{ position: 'absolute', top: 18, right: 18, fontSize: 22, color: s.color, opacity: .35 }}>{/* icon */}</i>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 300 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <div className="tabs">
          {[['all','Todas'],['BR','Brasil'],['US','EUA']].map(([v,l]) => (
            <button key={v} className={`tab ${filterPais === v ? 'active' : ''}`} onClick={() => setFilterPais(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th><th>País</th><th>CNPJ / EIN</th>
                <th>Tipo Jurídico</th><th>Setor</th><th>Status</th><th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-building" /><p>{t.noRecords}</p></div></td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: e.pais === 'US' ? 'rgba(59,130,246,.15)' : 'var(--brand-dim)', color: e.pais === 'US' ? 'var(--blue)' : 'var(--brand)', fontSize: 11 }}>
                        {e.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.cidade}{e.estado ? `, ${e.estado}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${e.pais === 'BR' ? 'badge-brand' : 'badge-blue'}`}>{e.pais === 'BR' ? '🇧🇷 BR' : '🇺🇸 US'}</span></td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.pais === 'BR' ? e.cnpj || '—' : e.ein || '—'}</td>
                  <td style={{ fontSize: 12 }}>{e.legalType || '—'}</td>
                  <td style={{ fontSize: 12 }}>{e.setor || '—'}</td>
                  <td><span className={`badge ${statusBadge(e.status)}`}>{e.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => setDetail(e)} title="Ver detalhes"><i className="fas fa-eye" /></button>
                      <button className="btn-icon" onClick={() => openEdit(e)} title={t.edit}><i className="fas fa-pen" /></button>
                      <button className="btn-icon danger" onClick={() => setConfirmId(e.id!)} title={t.delete}><i className="fas fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New Modal */}
      {modal && (
        <Modal
          title={editing ? 'Editar Empresa' : t.newCompany}
          onClose={closeModal}
          large
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-check" />{t.save}</button>
            </>
          }
        >
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 20, borderBottom: '1px solid var(--surface-border)' }}>
            {([
              ['gerais', 'fa-building', 'Dados Gerais'],
              ['socios', 'fa-users', 'Sócios'],
              ['fiscal', 'fa-file-invoice', 'Regime Fiscal'],
              ['tags', 'fa-tag', 'Tags & Notas'],
            ] as const).map(([k, icon, label]) => (
              <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                <i className={`fas ${icon}`} style={{ marginRight: 6 }} />{label}
              </button>
            ))}
          </div>

          {tab === 'gerais' && (
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nome Legal da Entidade *</label>
                <input className="form-input" value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Grupo Meridian Ltda" />
              </div>
              <div className="form-group">
                <label className="form-label">País / Jurisdição</label>
                <select className="form-select" value={form.pais || 'BR'} onChange={e => setForm(p => ({ ...p, pais: e.target.value as 'BR' | 'US' }))}>
                  <option value="BR">Brasil</option>
                  <option value="US">Estados Unidos</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Entidade</label>
                <select className="form-select" value={form.legalType || ''} onChange={e => setForm(p => ({ ...p, legalType: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {form.pais === 'BR'
                    ? ['Ltda','S.A.','MEI','EIRELI','SCP','Fundação'].map(s => <option key={s} value={s}>{s}</option>)
                    : ['LLC','Corporation','S-Corp','C-Corp','Partnership','Trust'].map(s => <option key={s} value={s}>{s}</option>)
                  }
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado / Unidade Federativa</label>
                <input className="form-input" value={form.estado || ''} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} placeholder="SP, RJ, MG..." />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input className="form-input" value={form.cidade || ''} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status || 'ativo'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {['ativa','inativa','em liquidação','holding'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data de Abertura</label>
                <input className="form-input" type="date" value={form.fundacao || ''} onChange={e => setForm(p => ({ ...p, fundacao: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Data de Encerramento</label>
                <input className="form-input" type="date" value={form.dataEncerramento || ''} onChange={e => setForm(p => ({ ...p, dataEncerramento: e.target.value }))} />
              </div>
              {form.pais === 'BR' ? (
                <div className="form-group">
                  <label className="form-label">CNPJ</label>
                  <input className="form-input" value={form.cnpj || ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">EIN</label>
                  <input className="form-input" value={form.ein || ''} onChange={e => setForm(p => ({ ...p, ein: e.target.value }))} placeholder="00-0000000" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Inscrição Estadual</label>
                <input className="form-input" value={form.inscricaoEstadual || ''} onChange={e => setForm(p => ({ ...p, inscricaoEstadual: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Setor de Atuação</label>
                <input className="form-input" value={form.setor || ''} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} placeholder="Ex: Tecnologia, Construção, Imóveis..." />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={extra.email} onChange={e => setExtra(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={extra.telefone} onChange={e => setExtra(p => ({ ...p, telefone: e.target.value }))} />
              </div>
            </div>
          )}

          {tab === 'socios' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sócios e participação societária</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setExtra(p => ({ ...p, socios: [...p.socios, { nome: '', documento: '', participacao: '', papel: '', email: '' }] }))}>
                  <i className="fas fa-plus" /> Adicionar Sócio
                </button>
              </div>
              {extra.socios.length === 0 ? (
                <div className="empty-state"><i className="fas fa-users" /><p>Nenhum sócio cadastrado</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {extra.socios.map((s, i) => (
                    <div key={i} className="card" style={{ padding: 12 }}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Nome</label>
                          <input className="form-input" value={s.nome} onChange={e => setExtra(p => ({ ...p, socios: p.socios.map((x, j) => j === i ? { ...x, nome: e.target.value } : x) }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">CPF / Documento</label>
                          <input className="form-input" value={s.documento} onChange={e => setExtra(p => ({ ...p, socios: p.socios.map((x, j) => j === i ? { ...x, documento: e.target.value } : x) }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Participação (%)</label>
                          <input className="form-input" value={s.participacao} onChange={e => setExtra(p => ({ ...p, socios: p.socios.map((x, j) => j === i ? { ...x, participacao: e.target.value } : x) }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Papel</label>
                          <input className="form-input" value={s.papel} onChange={e => setExtra(p => ({ ...p, socios: p.socios.map((x, j) => j === i ? { ...x, papel: e.target.value } : x) }))} placeholder="Sócio-administrador" />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">E-mail</label>
                          <input className="form-input" value={s.email} onChange={e => setExtra(p => ({ ...p, socios: p.socios.map((x, j) => j === i ? { ...x, email: e.target.value } : x) }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setExtra(p => ({ ...p, socios: p.socios.filter((_, j) => j !== i) }))}>
                          <i className="fas fa-trash" /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'fiscal' && (
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Regime Tributário</label>
                <select className="form-select" value={form.taxRegime || ''} onChange={e => setForm(p => ({ ...p, taxRegime: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {form.pais === 'BR'
                    ? ['Simples Nacional','Lucro Presumido','Lucro Real','MEI'].map(s => <option key={s} value={s}>{s}</option>)
                    : ['C-Corp','S-Corp','Pass-Through','Disregarded Entity'].map(s => <option key={s} value={s}>{s}</option>)
                  }
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ano-Calendário Vigente</label>
                <input className="form-input" value={form.anoCalendario || ''} onChange={e => setForm(p => ({ ...p, anoCalendario: e.target.value }))} placeholder="2024" />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Apuração</label>
                <select className="form-select" value={form.ctbElection || ''} onChange={e => setForm(p => ({ ...p, ctbElection: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {['Mensal','Trimestral','Anual'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Classificação CFC</label>
                <select className="form-select" value={form.cfcClass || 'nao-aplicavel'} onChange={e => setForm(p => ({ ...p, cfcClass: e.target.value }))}>
                  <option value="nao-aplicavel">Não aplicável</option>
                  <option value="cfc">CFC</option>
                  <option value="pfic">PFIC</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Obrigações Acessórias Relevantes</label>
                <textarea className="form-textarea" value={form.obrigacoesAcessorias || ''} onChange={e => setForm(p => ({ ...p, obrigacoesAcessorias: e.target.value }))} placeholder="Ex: ECF, SPED, FBAR, Form 5471, DIRPF..." />
              </div>
            </div>
          )}

          {tab === 'tags' && (
            <div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault()
                        setExtra(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }))
                        setTagInput('')
                      }
                    }}
                    placeholder="Digite uma tag e pressione Enter"
                  />
                  <button className="btn btn-ghost" onClick={() => {
                    if (tagInput.trim()) {
                      setExtra(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }))
                      setTagInput('')
                    }
                  }}><i className="fas fa-plus" /></button>
                </div>
                {extra.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {extra.tags.map((tg, i) => (
                      <span key={i} className="badge badge-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {tg}
                        <button onClick={() => setExtra(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}>
                          <i className="fas fa-times" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-textarea" rows={6} value={extra.observacoes} onChange={e => setExtra(p => ({ ...p, observacoes: e.target.value }))} />
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.nome} onClose={() => setDetail(null)} large>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['País', detail.pais === 'BR' ? '🇧🇷 Brasil' : '🇺🇸 EUA'],
              ['Status', detail.status],
              [detail.pais === 'BR' ? 'CNPJ' : 'EIN', detail.pais === 'BR' ? detail.cnpj || '—' : detail.ein || '—'],
              ['Tipo Jurídico', detail.legalType || '—'],
              ['Regime Tributário', detail.taxRegime || '—'],
              ['Setor', detail.setor || '—'],
              ['Cidade/Estado', `${detail.cidade || '—'}${detail.estado ? ', '+detail.estado : ''}`],
              ['Fundação', fmt.date(detail.fundacao, lang)],
              ['Website', detail.website || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
            {detail.notas && (
              <div style={{ gridColumn: '1/-1', padding: '8px 0' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Observações</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.notas}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmId && (
        <ConfirmDialog
          msg={t.deleteConfirm}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
