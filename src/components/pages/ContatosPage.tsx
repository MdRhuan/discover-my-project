'use client'

import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/db'
import { useApp } from '@/context/AppContext'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { Contato, ContatoTag, ContatoTagLink, Empresa } from '@/types'

// ---------- helpers de validação/máscara ----------

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '')
}

function maskCpfCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function maskCep(v: string): string {
  return onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

function validateCpf(cpf: string): boolean {
  const d = onlyDigits(cpf)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10) r = 0
  if (r !== parseInt(d[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10) r = 0
  return r === parseInt(d[10])
}

function validateCnpj(cnpj: string): boolean {
  const d = onlyDigits(cnpj)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(base[i]) * w, 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, ...w1]
  return calc(d.slice(0, 12), w1) === parseInt(d[12]) && calc(d.slice(0, 13), w2) === parseInt(d[13])
}

function validateDocumento(doc: string): { valid: boolean; tipo?: 'cpf' | 'cnpj' } {
  const d = onlyDigits(doc)
  if (!d) return { valid: true }
  if (d.length === 11) return { valid: validateCpf(d), tipo: 'cpf' }
  if (d.length === 14) return { valid: validateCnpj(d), tipo: 'cnpj' }
  return { valid: false }
}

// ---------- constantes ----------

const TIPOS: Array<{ key: Contato['tipo']; label: string }> = [
  { key: 'cliente',    label: 'Cliente' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'parceiro',   label: 'Parceiro' },
  { key: 'funcionario',label: 'Funcionário' },
  { key: 'consultor',  label: 'Consultor' },
  { key: 'prestador',  label: 'Prestador de Serviço' },
  { key: 'pessoal',    label: 'Contato Pessoal' },
  { key: 'outro',      label: 'Outro' },
]

const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map(t => [t.key, t.label]))

const CORES_TAG = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

const PAGE_SIZE = 20

// ---------- componente principal ----------

export function ContatosPage() {
  const { toast } = useApp()

  const [contatos, setContatos] = useState<Contato[]>([])
  const [tags, setTags] = useState<ContatoTag[]>([])
  const [links, setLinks] = useState<ContatoTagLink[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  // filtros
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroTags, setFiltroTags] = useState<number[]>([])
  const [orderBy, setOrderBy] = useState<'nome' | 'recente'>('nome')
  const [page, setPage] = useState(1)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  // modais
  const [modalContato, setModalContato] = useState<Contato | null>(null)
  const [modalTags, setModalTags] = useState(false)
  const [modalDetalhes, setModalDetalhes] = useState<Contato | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ ids: number[]; msg: string } | null>(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [c, t, l, e] = await Promise.all([
        db.contatos.toArray(),
        db.contatoTags.toArray(),
        db.contatoTagLinks.toArray(),
        db.empresas.toArray(),
      ])
      setContatos(c as Contato[])
      setTags(t as ContatoTag[])
      setLinks(l as ContatoTagLink[])
      setEmpresas(e as Empresa[])
    } catch (err) {
      console.error(err)
      toast('Erro ao carregar contatos', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const tagsByContato = useMemo(() => {
    const m = new Map<number, ContatoTag[]>()
    links.forEach(l => {
      const tg = tags.find(t => t.id === l.tagId)
      if (!tg) return
      const arr = m.get(l.contatoId) || []
      arr.push(tg)
      m.set(l.contatoId, arr)
    })
    return m
  }, [links, tags])

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = contatos.filter(c => {
      if (filtroTipo && c.tipo !== filtroTipo) return false
      if (filtroTags.length > 0) {
        const tagIds = (tagsByContato.get(c.id!) || []).map(t => t.id)
        if (!filtroTags.every(tid => tagIds.includes(tid))) return false
      }
      if (q) {
        const blob = [c.nome, c.emailPrincipal, c.emailSecundario, c.telefonePrincipal, c.telefoneSecundario, c.empresaVinculada]
          .filter(Boolean).join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
    if (orderBy === 'nome') {
      arr = arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    } else {
      arr = arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    }
    return arr
  }, [contatos, search, filtroTipo, filtroTags, orderBy, tagsByContato])

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageItems = filtrados.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, filtroTipo, filtroTags, orderBy])

  function toggleSelectAll() {
    if (selecionados.size === pageItems.length && pageItems.length > 0) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(pageItems.map(c => c.id!).filter(Boolean)))
    }
  }

  function toggleSelect(id: number) {
    const s = new Set(selecionados)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelecionados(s)
  }

  async function handleDelete(ids: number[]) {
    try {
      for (const id of ids) {
        await db.contatos.delete(id)
      }
      toast(ids.length === 1 ? 'Contato excluído' : `${ids.length} contatos excluídos`, 'success')
      setSelecionados(new Set())
      await loadAll()
    } catch {
      toast('Erro ao excluir', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><i className="fas fa-address-book" /> Contatos</h1>
          <p className="page-subtitle">Cadastro centralizado de pessoas e empresas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setModalTags(true)}>
            <i className="fas fa-tags" /> Gerenciar tags
          </button>
          <button className="btn btn-primary" onClick={() => setModalContato({ nome: '', tipo: 'cliente' } as Contato)}>
            <i className="fas fa-plus" /> Novo contato
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Nome, e-mail, telefone, empresa…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select className="form-input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Ordenar</label>
            <select className="form-input" value={orderBy} onChange={e => setOrderBy(e.target.value as 'nome' | 'recente')}>
              <option value="nome">Nome (A-Z)</option>
              <option value="recente">Mais recentes</option>
            </select>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filtrados.length} resultado(s)
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Filtrar por tags:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const active = filtroTags.includes(tag.id!)
                return (
                  <button key={tag.id} type="button"
                    onClick={() => setFiltroTags(active ? filtroTags.filter(i => i !== tag.id) : [...filtroTags, tag.id!])}
                    style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${tag.cor}`,
                      background: active ? tag.cor : 'transparent',
                      color: active ? '#fff' : tag.cor, cursor: 'pointer',
                    }}>
                    {tag.nome}
                  </button>
                )
              })}
              {filtroTags.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFiltroTags([])}>Limpar</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ações em lote */}
      {selecionados.size > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13 }}>{selecionados.size} contato(s) selecionado(s)</div>
          <button className="btn btn-danger btn-sm"
            onClick={() => setConfirmDel({ ids: Array.from(selecionados), msg: `Excluir ${selecionados.size} contato(s)?` })}>
            <i className="fas fa-trash" /> Excluir selecionados
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" /> Carregando…
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-address-book" style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }} />
            <div>Nenhum contato encontrado</div>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox"
                      checked={selecionados.size === pageItems.length && pageItems.length > 0}
                      onChange={toggleSelectAll} />
                  </th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Tags</th>
                  <th style={{ width: 110 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(c => {
                  const cTags = tagsByContato.get(c.id!) || []
                  return (
                    <tr key={c.id}>
                      <td>
                        <input type="checkbox"
                          checked={selecionados.has(c.id!)}
                          onChange={() => toggleSelect(c.id!)} />
                      </td>
                      <td>
                        <button onClick={() => setModalDetalhes(c)}
                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', fontWeight: 600 }}>
                          {c.nome}
                        </button>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: 'var(--surface-alt)' }}>
                          {c.tipo === 'outro' && c.tipoCustomizado ? c.tipoCustomizado : TIPO_LABEL[c.tipo]}
                        </span>
                      </td>
                      <td>{c.empresaVinculada || '—'}</td>
                      <td>{c.telefonePrincipal || '—'}</td>
                      <td>{c.emailPrincipal || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {cTags.map(t => (
                            <span key={t.id} style={{
                              padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                              background: t.cor, color: '#fff',
                            }}>{t.nome}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" title="Editar"
                          onClick={() => setModalContato(c)}><i className="fas fa-pen" /></button>
                        <button className="btn btn-ghost btn-sm" title="Excluir"
                          onClick={() => setConfirmDel({ ids: [c.id!], msg: 'Tem certeza que deseja excluir?' })}>
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, borderTop: '1px solid var(--surface-border)' }}>
                <button className="btn btn-ghost btn-sm" disabled={pageSafe <= 1} onClick={() => setPage(p => p - 1)}>
                  <i className="fas fa-chevron-left" /> Anterior
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Página {pageSafe} de {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={pageSafe >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima <i className="fas fa-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      {modalContato && (
        <ContatoFormModal
          contato={modalContato}
          contatos={contatos}
          tags={tags}
          links={links}
          empresas={empresas}
          onClose={() => setModalContato(null)}
          onSaved={async () => { setModalContato(null); await loadAll() }}
        />
      )}

      {modalTags && (
        <TagsManagerModal
          tags={tags}
          onClose={() => setModalTags(false)}
          onChanged={async () => { await loadAll() }}
        />
      )}

      {modalDetalhes && (
        <DetalhesModal
          contato={modalDetalhes}
          tags={tagsByContato.get(modalDetalhes.id!) || []}
          onClose={() => setModalDetalhes(null)}
          onEdit={() => { setModalContato(modalDetalhes); setModalDetalhes(null) }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          msg={confirmDel.msg}
          onCancel={() => setConfirmDel(null)}
          onConfirm={async () => { const ids = confirmDel.ids; setConfirmDel(null); await handleDelete(ids) }}
        />
      )}
    </div>
  )
}

// ---------- Modal: formulário de contato ----------

function ContatoFormModal({ contato, contatos, tags, links, empresas, onClose, onSaved }: {
  contato: Contato
  contatos: Contato[]
  tags: ContatoTag[]
  links: ContatoTagLink[]
  empresas: Empresa[]
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { toast } = useApp()
  const isEdit = !!contato.id
  const [form, setForm] = useState<Contato>({ ...contato })
  const [docError, setDocError] = useState<string>('')
  const [cepLoading, setCepLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialTagIds = useMemo(
    () => links.filter(l => l.contatoId === contato.id).map(l => l.tagId),
    [links, contato.id]
  )
  const [selectedTags, setSelectedTags] = useState<number[]>(initialTagIds)

  function set<K extends keyof Contato>(k: K, v: Contato[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function buscarCep() {
    const cep = onlyDigits(form.cep || '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await r.json()
      if (data.erro) {
        toast('CEP não encontrado', 'error')
        return
      }
      setForm(prev => ({
        ...prev,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }))
    } catch {
      toast('Erro ao buscar CEP', 'error')
    } finally {
      setCepLoading(false)
    }
  }

  function handleDocChange(v: string) {
    set('documento', maskCpfCnpj(v))
    const r = validateDocumento(v)
    if (!r.valid) setDocError('CPF/CNPJ inválido')
    else setDocError('')
  }

  async function handleSave() {
    // validações
    if (!form.nome?.trim()) { toast('Nome é obrigatório', 'error'); return }
    if (!form.tipo) { toast('Tipo é obrigatório', 'error'); return }
    if (!form.telefonePrincipal?.trim() && !form.emailPrincipal?.trim()) {
      toast('Informe ao menos um telefone ou e-mail', 'error'); return
    }
    if (form.documento) {
      const r = validateDocumento(form.documento)
      if (!r.valid) { toast('CPF/CNPJ inválido', 'error'); return }
      // duplicidade
      const docDigits = onlyDigits(form.documento)
      const dup = contatos.find(c => c.id !== form.id && onlyDigits(c.documento || '') === docDigits)
      if (dup) { toast(`Já existe um contato com este CPF/CNPJ: ${dup.nome}`, 'error'); return }
      form.documentoTipo = r.tipo
    }

    setSaving(true)
    try {
      let id = form.id
      const payload: Partial<Contato> = {
        ...form,
        documento: form.documento ? maskCpfCnpj(form.documento) : undefined,
      }
      delete (payload as { id?: number }).id

      if (isEdit && id) {
        await db.contatos.update(id, payload)
      } else {
        id = await db.contatos.add(payload)
      }

      // sincronizar tags
      const current = links.filter(l => l.contatoId === id).map(l => ({ id: l.id!, tagId: l.tagId }))
      const toAdd = selectedTags.filter(tid => !current.some(c => c.tagId === tid))
      const toRemove = current.filter(c => !selectedTags.includes(c.tagId))
      for (const tid of toAdd) {
        await db.contatoTagLinks.add({ contatoId: id, tagId: tid })
      }
      for (const c of toRemove) {
        await db.contatoTagLinks.delete(c.id)
      }

      toast(isEdit ? 'Contato atualizado' : 'Contato criado', 'success')
      await onSaved()
    } catch (err) {
      console.error(err)
      toast('Erro ao salvar contato', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Editar contato' : 'Novo contato'} onClose={onClose} large
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Salvando…</> : 'Salvar'}
          </button>
        </div>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Nome completo *</label>
          <input className="form-input" value={form.nome || ''} onChange={e => set('nome', e.target.value)} />
        </div>

        <div>
          <label className="form-label">CPF / CNPJ</label>
          <input className="form-input" value={form.documento || ''}
            onChange={e => handleDocChange(e.target.value)} placeholder="000.000.000-00" />
          {docError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{docError}</div>}
        </div>

        <div>
          <label className="form-label">Tipo de contato *</label>
          <select className="form-input" value={form.tipo} onChange={e => set('tipo', e.target.value as Contato['tipo'])}>
            {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {form.tipo === 'outro' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Especifique o tipo</label>
            <input className="form-input" value={form.tipoCustomizado || ''}
              onChange={e => set('tipoCustomizado', e.target.value)} />
          </div>
        )}

        <div>
          <label className="form-label">Empresa vinculada</label>
          <input className="form-input" list="empresas-list" value={form.empresaVinculada || ''}
            onChange={e => set('empresaVinculada', e.target.value)} placeholder="Digite ou escolha…" />
          <datalist id="empresas-list">
            {empresas.map(e => <option key={e.id} value={e.nome} />)}
          </datalist>
        </div>

        <div>
          <label className="form-label">Cargo / Função</label>
          <input className="form-input" value={form.cargo || ''} onChange={e => set('cargo', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Telefone principal</label>
          <input className="form-input" value={form.telefonePrincipal || ''}
            onChange={e => set('telefonePrincipal', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>

        <div>
          <label className="form-label">Telefone secundário</label>
          <input className="form-input" value={form.telefoneSecundario || ''}
            onChange={e => set('telefoneSecundario', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>

        <div>
          <label className="form-label">E-mail principal</label>
          <input type="email" className="form-input" value={form.emailPrincipal || ''}
            onChange={e => set('emailPrincipal', e.target.value)} />
        </div>

        <div>
          <label className="form-label">E-mail secundário</label>
          <input type="email" className="form-input" value={form.emailSecundario || ''}
            onChange={e => set('emailSecundario', e.target.value)} />
        </div>

        {/* Endereço */}
        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--surface-border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Endereço</div>
        </div>

        <div>
          <label className="form-label">CEP</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-input" value={form.cep || ''}
              onChange={e => set('cep', maskCep(e.target.value))}
              onBlur={buscarCep} placeholder="00000-000" />
            <button type="button" className="btn btn-ghost" onClick={buscarCep} disabled={cepLoading}>
              {cepLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-search" />}
            </button>
          </div>
        </div>

        <div>
          <label className="form-label">Rua / Logradouro</label>
          <input className="form-input" value={form.rua || ''} onChange={e => set('rua', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Número</label>
          <input className="form-input" value={form.numero || ''} onChange={e => set('numero', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Complemento</label>
          <input className="form-input" value={form.complemento || ''} onChange={e => set('complemento', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Bairro</label>
          <input className="form-input" value={form.bairro || ''} onChange={e => set('bairro', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Cidade</label>
          <input className="form-input" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Estado</label>
          <input className="form-input" value={form.estado || ''} onChange={e => set('estado', e.target.value)} maxLength={2} />
        </div>

        {/* Tags */}
        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--surface-border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Tags</div>
          {tags.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Nenhuma tag criada. Use "Gerenciar tags" para criar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const active = selectedTags.includes(tag.id!)
                return (
                  <button key={tag.id} type="button"
                    onClick={() => setSelectedTags(active ? selectedTags.filter(i => i !== tag.id) : [...selectedTags, tag.id!])}
                    style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${tag.cor}`,
                      background: active ? tag.cor : 'transparent',
                      color: active ? '#fff' : tag.cor, cursor: 'pointer',
                    }}>
                    {tag.nome}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Observações</label>
          <textarea className="form-input" rows={3} value={form.observacoes || ''}
            onChange={e => set('observacoes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ---------- Modal: gerenciador de tags ----------

function TagsManagerModal({ tags, onClose, onChanged }: {
  tags: ContatoTag[]
  onClose: () => void
  onChanged: () => void | Promise<void>
}) {
  const { toast } = useApp()
  const [list, setList] = useState<ContatoTag[]>(tags)
  const [novoNome, setNovoNome] = useState('')
  const [novaCor, setNovaCor] = useState(CORES_TAG[0])

  useEffect(() => { setList(tags) }, [tags])

  async function reload() {
    const t = await db.contatoTags.toArray()
    setList(t as ContatoTag[])
    await onChanged()
  }

  async function handleAdd() {
    const nome = novoNome.trim()
    if (!nome) { toast('Informe o nome', 'error'); return }
    if (list.some(t => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast('Tag já existe', 'error'); return
    }
    try {
      await db.contatoTags.add({ nome, cor: novaCor })
      setNovoNome(''); setNovaCor(CORES_TAG[0])
      await reload()
      toast('Tag criada', 'success')
    } catch { toast('Erro ao criar tag', 'error') }
  }

  async function handleUpdate(t: ContatoTag, patch: Partial<ContatoTag>) {
    try {
      await db.contatoTags.update(t.id!, patch)
      await reload()
    } catch { toast('Erro ao atualizar', 'error') }
  }

  async function handleDelete(t: ContatoTag) {
    if (!confirm(`Excluir tag "${t.nome}"? Os contatos perderão essa tag.`)) return
    try {
      await db.contatoTags.delete(t.id!)
      await reload()
      toast('Tag excluída', 'success')
    } catch { toast('Erro ao excluir', 'error') }
  }

  return (
    <Modal title="Gerenciar tags" onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Fechar</button>}>
      <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface-alt)', borderRadius: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Nova tag</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="form-input" placeholder="Nome (ex: VIP, Inadimplente)" value={novoNome}
            onChange={e => setNovoNome(e.target.value)} style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {CORES_TAG.map(c => (
              <button key={c} type="button" onClick={() => setNovaCor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 12, background: c,
                  border: novaCor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                }} />
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
            <i className="fas fa-plus" /> Criar
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
          Nenhuma tag cadastrada
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map(t => (
            <div key={t.id} style={{
              display: 'flex', gap: 8, alignItems: 'center', padding: 8,
              border: '1px solid var(--surface-border)', borderRadius: 6,
            }}>
              <input className="form-input" defaultValue={t.nome}
                onBlur={e => e.target.value !== t.nome && handleUpdate(t, { nome: e.target.value })}
                style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {CORES_TAG.map(c => (
                  <button key={c} type="button" onClick={() => handleUpdate(t, { cor: c })}
                    style={{
                      width: 22, height: 22, borderRadius: 11, background: c,
                      border: t.cor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
              </div>
              <span style={{
                padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: t.cor, color: '#fff', minWidth: 60, textAlign: 'center',
              }}>{t.nome}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t)}>
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ---------- Modal: detalhes ----------

function DetalhesModal({ contato, tags, onClose, onEdit }: {
  contato: Contato
  tags: ContatoTag[]
  onClose: () => void
  onEdit: () => void
}) {
  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, marginTop: 2 }}>{value || '—'}</div>
    </div>
  )

  const endereco = [contato.rua, contato.numero, contato.complemento, contato.bairro, contato.cidade, contato.estado, contato.cep]
    .filter(Boolean).join(', ')

  return (
    <Modal title={contato.nome} onClose={onClose} large
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={onEdit}><i className="fas fa-pen" /> Editar</button>
        </div>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Tipo" value={contato.tipo === 'outro' && contato.tipoCustomizado ? contato.tipoCustomizado : TIPO_LABEL[contato.tipo]} />
        <Field label="CPF/CNPJ" value={contato.documento} />
        <Field label="Empresa" value={contato.empresaVinculada} />
        <Field label="Cargo" value={contato.cargo} />
        <Field label="Telefone principal" value={contato.telefonePrincipal} />
        <Field label="Telefone secundário" value={contato.telefoneSecundario} />
        <Field label="E-mail principal" value={contato.emailPrincipal} />
        <Field label="E-mail secundário" value={contato.emailSecundario} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Endereço" value={endereco} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {tags.length === 0 && <span style={{ fontSize: 14 }}>—</span>}
            {tags.map(t => (
              <span key={t.id} style={{
                padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: t.cor, color: '#fff',
              }}>{t.nome}</span>
            ))}
          </div>
        </div>
        {contato.observacoes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Observações" value={contato.observacoes} />
          </div>
        )}
      </div>
    </Modal>
  )
}
