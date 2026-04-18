'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useApp } from '@/context/AppContext'
import { fmt } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

export type InsuranceType = 'life' | 'apt' | 'car'

export interface InsuranceDoc {
  id: number
  insurance_type: InsuranceType
  apolice_id: number | null
  apolice_label: string | null
  nome: string
  categoria: string | null
  observacoes: string | null
  arquivo_path: string
  tipo: string | null
  tamanho: string | null
  data_upload: string | null
}

export const DOC_CATEGORIAS = ['Apólice', 'Comprovante de pagamento', 'Boleto', 'Sinistro', 'Renovação', 'Vistoria', 'Endosso', 'Outros']

const ICON_BY_EXT: Record<string, string> = {
  PDF: 'fa-file-pdf', JPG: 'fa-file-image', JPEG: 'fa-file-image', PNG: 'fa-file-image', WEBP: 'fa-file-image',
  DOC: 'fa-file-word', DOCX: 'fa-file-word', XLS: 'fa-file-excel', XLSX: 'fa-file-excel',
  ZIP: 'fa-file-zipper', TXT: 'fa-file-lines',
}

function formatBytes(b: number) {
  if (b > 1048576) return (b / 1048576).toFixed(1) + ' MB'
  return (b / 1024).toFixed(0) + ' KB'
}

interface Props {
  insuranceType: InsuranceType
  apoliceId?: number | null
  apoliceLabel?: string | null
  /** Quando true exibe central com TODAS as apólices daquele tipo (ignora apoliceId) */
  global?: boolean
}

export function InsuranceDocsManager({ insuranceType, apoliceId = null, apoliceLabel = null, global = false }: Props) {
  const { lang, toast } = useApp()
  const [docs, setDocs] = useState<InsuranceDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<InsuranceDoc | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<{ url: string; doc: InsuranceDoc } | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('insurance_docs').select('*').eq('insurance_type', insuranceType).order('created_at', { ascending: false })
    if (!global && apoliceId != null) q = q.eq('apolice_id', apoliceId)
    const { data, error } = await q
    if (error) { toast(error.message, 'error'); setDocs([]) }
    else setDocs((data as InsuranceDoc[]) || [])
    setLoading(false)
  }, [insuranceType, apoliceId, global, toast])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const path = `${insuranceType}/${apoliceId || 'global'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('insurance-documents').upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) throw upErr
        const { error: insErr } = await supabase.from('insurance_docs').insert({
          insurance_type: insuranceType,
          apolice_id: apoliceId,
          apolice_label: apoliceLabel,
          nome: file.name,
          categoria: 'Outros',
          arquivo_path: path,
          tipo: ext.toUpperCase(),
          tamanho: formatBytes(file.size),
          data_upload: new Date().toISOString().slice(0, 10),
        })
        if (insErr) throw insErr
      }
      toast(`${files.length} arquivo(s) enviado(s).`, 'success')
      load()
    } catch (err) {
      console.error('[InsuranceDocs] upload error:', err)
      toast(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function getSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from('insurance-documents').createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  }

  async function download(d: InsuranceDoc) {
    try {
      const url = await getSignedUrl(d.arquivo_path)
      const a = document.createElement('a')
      a.href = url; a.download = d.nome; a.target = '_blank'
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar.', 'error')
    }
  }

  async function preview(d: InsuranceDoc) {
    try {
      const url = await getSignedUrl(d.arquivo_path)
      setPreviewUrl({ url, doc: d })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao visualizar.', 'error')
    }
  }

  async function saveEdit() {
    if (!editing) return
    if (!editing.nome.trim()) { toast('Nome obrigatório.', 'error'); return }
    const { error } = await supabase.from('insurance_docs').update({
      nome: editing.nome,
      categoria: editing.categoria,
      observacoes: editing.observacoes,
    }).eq('id', editing.id)
    if (error) { toast(error.message, 'error'); return }
    toast('Atualizado.', 'success'); setEditing(null); load()
  }

  async function deleteDoc(id: number) {
    const doc = docs.find(d => d.id === id)
    if (!doc) return
    try {
      await supabase.storage.from('insurance-documents').remove([doc.arquivo_path])
      const { error } = await supabase.from('insurance_docs').delete().eq('id', id)
      if (error) throw error
      toast('Excluído.', 'success'); setConfirmId(null); load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'error')
    }
  }

  const cats = [...new Set(docs.map(d => d.categoria).filter(Boolean))] as string[]
  const filtered = docs.filter(d =>
    (!filterCat || d.categoria === filterCat) &&
    (!search || d.nome.toLowerCase().includes(search.toLowerCase()) || (d.apolice_label || '').toLowerCase().includes(search.toLowerCase()))
  )

  const isImage = (t?: string | null) => !!t && ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(t.toUpperCase())
  const isPdf = (t?: string | null) => t?.toUpperCase() === 'PDF'

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={handleUpload} />
        <button className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
          {uploading ? 'Enviando…' : 'Enviar documento(s)'}
        </button>
        {global && (
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <i className="fas fa-search" />
            <input placeholder="Buscar por nome ou apólice..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        {cats.length > 0 && (
          <select className="form-select" style={{ maxWidth: 200 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} de {docs.length}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', background: 'var(--surface-hover)', borderRadius: 8, border: '1px dashed var(--surface-border)' }}>
          <i className="fas fa-folder-open" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
          <p style={{ fontSize: 13 }}>{docs.length === 0 ? 'Nenhum documento enviado ainda.' : 'Nenhum documento corresponde aos filtros.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => {
            const icon = ICON_BY_EXT[d.tipo?.toUpperCase() || ''] || 'fa-file'
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                <i className={`fas ${icon}`} style={{ fontSize: 20, color: isPdf(d.tipo) ? '#ef4444' : isImage(d.tipo) ? '#3b82f6' : 'var(--brand)', flexShrink: 0, width: 24, textAlign: 'center' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                    {d.categoria && <span><i className="fas fa-tag" style={{ marginRight: 3 }} />{d.categoria}</span>}
                    {d.tipo && <span>{d.tipo}</span>}
                    {d.tamanho && <span>{d.tamanho}</span>}
                    {d.data_upload && <span><i className="fas fa-calendar" style={{ marginRight: 3 }} />{fmt.date(d.data_upload, lang)}</span>}
                    {global && d.apolice_label && <span><i className="fas fa-shield" style={{ marginRight: 3, color: 'var(--brand)' }} />{d.apolice_label}</span>}
                  </div>
                  {d.observacoes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic' }}>{d.observacoes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {(isImage(d.tipo) || isPdf(d.tipo)) && (
                    <button className="btn-icon" title="Visualizar" onClick={() => preview(d)}><i className="fas fa-eye" /></button>
                  )}
                  <button className="btn-icon" title="Baixar" onClick={() => download(d)}><i className="fas fa-download" /></button>
                  <button className="btn-icon" title="Editar" onClick={() => setEditing({ ...d })}><i className="fas fa-pen" /></button>
                  <button className="btn-icon danger" title="Excluir" onClick={() => setConfirmId(d.id)}><i className="fas fa-trash" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de edição */}
      {editing && (
        <Modal title="Editar documento" onClose={() => setEditing(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveEdit}><i className="fas fa-save" />Salvar</button>
          </>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome do documento *</label>
              <input className="form-input" value={editing.nome}
                onChange={e => setEditing(d => d && { ...d, nome: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Categoria</label>
              <select className="form-select" value={editing.categoria || 'Outros'}
                onChange={e => setEditing(d => d && { ...d, categoria: e.target.value })}>
                {DOC_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={3} value={editing.observacoes || ''}
                onChange={e => setEditing(d => d && { ...d, observacoes: e.target.value })}
                placeholder="Detalhes adicionais sobre este documento..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', fontSize: 11, color: 'var(--text-muted)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
              {editing.tipo} · {editing.tamanho} · enviado em {editing.data_upload ? fmt.date(editing.data_upload, lang) : '—'}
            </div>
          </div>
        </Modal>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewUrl(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '90vw' }}>
            <div className="modal-header">
              <div className="modal-title">{previewUrl.doc.nome}</div>
              <button className="modal-close" onClick={() => setPreviewUrl(null)}><i className="fas fa-xmark" /></button>
            </div>
            <div className="modal-body" style={{ padding: 0, height: '70vh', overflow: 'hidden' }}>
              {isImage(previewUrl.doc.tipo) ? (
                <img src={previewUrl.url} alt={previewUrl.doc.nome} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
              ) : (
                <iframe src={previewUrl.url} title={previewUrl.doc.nome} style={{ width: '100%', height: '100%', border: 0 }} />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPreviewUrl(null)}>Fechar</button>
              <button className="btn btn-primary" onClick={() => download(previewUrl.doc)}><i className="fas fa-download" />Baixar</button>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && (
        <ConfirmDialog msg="Excluir este documento permanentemente?" onConfirm={() => deleteDoc(confirmId)} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}
