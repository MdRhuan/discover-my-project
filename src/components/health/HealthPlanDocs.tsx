'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useApp } from '@/context/AppContext'
import { fmt } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/Modal'

interface PlanDoc {
  id: number
  nome: string
  categoria: string | null
  arquivo_path: string
  tipo: string | null
  tamanho: string | null
  data_upload: string | null
}

const CATEGORIAS = ['Apólice', 'Boleto', 'Comprovante de pagamento', 'Carteirinha', 'Reembolso', 'Renovação', 'Outros']

function formatBytes(b: number) {
  if (b > 1048576) return (b / 1048576).toFixed(1) + ' MB'
  return (b / 1024).toFixed(0) + ' KB'
}

interface Props {
  healthPlanId: number
  planLabel: string
}

export function HealthPlanDocs({ healthPlanId, planLabel }: Props) {
  const { lang, toast } = useApp()
  const [docs, setDocs] = useState<PlanDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [categoria, setCategoria] = useState('Apólice')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('insurance_docs')
      .select('id, nome, categoria, arquivo_path, tipo, tamanho, data_upload')
      .eq('health_plan_id', healthPlanId)
      .order('created_at', { ascending: false })
    if (error) { toast(error.message, 'error'); setDocs([]) }
    else setDocs((data as PlanDoc[]) || [])
    setLoading(false)
  }, [healthPlanId, toast])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const path = `health/${healthPlanId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('insurance-documents').upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) throw upErr
        const { error: insErr } = await supabase.from('insurance_docs').insert({
          insurance_type: 'health',
          health_plan_id: healthPlanId,
          apolice_label: planLabel,
          nome: file.name,
          categoria,
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
      toast(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function download(d: PlanDoc) {
    try {
      const { data, error } = await supabase.storage.from('insurance-documents').createSignedUrl(d.arquivo_path, 3600)
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl; a.download = d.nome; a.target = '_blank'
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar.', 'error')
    }
  }

  async function preview(d: PlanDoc) {
    try {
      const { data, error } = await supabase.storage.from('insurance-documents').createSignedUrl(d.arquivo_path, 3600)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao visualizar.', 'error')
    }
  }

  async function remove(id: number) {
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

  const isImage = (t?: string | null) => !!t && ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(t.toUpperCase())
  const isPdf = (t?: string | null) => t?.toUpperCase() === 'PDF'

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--surface-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          <i className="fas fa-paperclip" style={{ marginRight: 4 }} />Documentos ({docs.length})
        </span>
        <select className="form-select" style={{ height: 28, fontSize: 11, padding: '2px 8px', maxWidth: 160 }}
          value={categoria} onChange={e => setCategoria(e.target.value)}>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={handleUpload} />
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} disabled={uploading} onClick={() => fileRef.current?.click()}>
          <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
          {uploading ? 'Enviando…' : 'Anexar'}
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 4 }} />Carregando…
        </div>
      ) : docs.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8, fontStyle: 'italic' }}>
          Nenhum documento anexado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface-card)', borderRadius: 6, border: '1px solid var(--surface-border)' }}>
              <i className={`fas ${isPdf(d.tipo) ? 'fa-file-pdf' : isImage(d.tipo) ? 'fa-file-image' : 'fa-file'}`}
                style={{ fontSize: 14, color: isPdf(d.tipo) ? '#ef4444' : isImage(d.tipo) ? '#3b82f6' : 'var(--text-muted)', width: 16, textAlign: 'center', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {d.categoria && <span><i className="fas fa-tag" style={{ marginRight: 2 }} />{d.categoria}</span>}
                  {d.tipo && <span>{d.tipo}</span>}
                  {d.tamanho && <span>{d.tamanho}</span>}
                  {d.data_upload && <span>{fmt.date(d.data_upload, lang)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                {(isImage(d.tipo) || isPdf(d.tipo)) && (
                  <button className="btn-icon" title="Visualizar" onClick={() => preview(d)}><i className="fas fa-eye" /></button>
                )}
                <button className="btn-icon" title="Baixar" onClick={() => download(d)}><i className="fas fa-download" /></button>
                <button className="btn-icon danger" title="Excluir" onClick={() => setConfirmId(d.id)}><i className="fas fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId !== null && (
        <ConfirmDialog msg="Excluir este documento permanentemente?" onConfirm={() => remove(confirmId)} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}
