'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { db } from '@/lib/db'
import { useApp } from '@/context/AppContext'
import type { TrademarkFile } from '@/types'

interface Props {
  trademarkId: number | null // null = ainda não salvo
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg'
const BUCKET = 'trademark-documents'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function TrademarkFiles({ trademarkId }: Props) {
  const { toast } = useApp()
  const [files, setFiles] = useState<TrademarkFile[]>([])
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!trademarkId) { setFiles([]); return }
    const all = await db.trademarkFiles.where('trademarkId').equals(trademarkId).toArray()
    setFiles(all)
  }, [trademarkId])

  useEffect(() => { load() }, [load])

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!trademarkId) return
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
          toast(`Formato não suportado: ${file.name}`, 'error')
          continue
        }
        const path = `${trademarkId}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
        if (upErr) throw upErr
        await db.trademarkFiles.add({
          trademarkId,
          nome: file.name,
          arquivoPath: path,
          tipo: file.type,
          tamanho: formatSize(file.size),
          dataUpload: new Date().toISOString(),
        })
      }
      toast('Arquivo(s) enviado(s)!', 'success')
      load()
    } catch (err) {
      console.error(err)
      toast('Erro ao enviar arquivo.', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDownload(f: TrademarkFile) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.arquivoPath, 60)
    if (error || !data) { toast('Erro ao baixar.', 'error'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(f: TrademarkFile) {
    try {
      await supabase.storage.from(BUCKET).remove([f.arquivoPath])
      if (f.id) await db.trademarkFiles.delete(f.id)
      toast('Arquivo removido.', 'success')
      load()
    } catch {
      toast('Erro ao remover.', 'error')
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="fas fa-paperclip" /> Files
      </div>

      {!trademarkId ? (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'var(--surface-hover)', border: '1px dashed var(--surface-border)',
          fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fas fa-circle-info" />
          Upload de arquivos disponível após salvar (PDF, PNG, JPG)
        </div>
      ) : (
        <>
          <label
            htmlFor="tm-file-input"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: 10, cursor: uploading ? 'wait' : 'pointer',
              background: 'var(--surface-hover)', border: '1px dashed var(--brand)',
              fontSize: 13, color: 'var(--brand)', fontWeight: 600,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`} />
            {uploading ? 'Enviando…' : 'Adicionar arquivo (PDF, PNG, JPG)'}
          </label>
          <input
            id="tm-file-input"
            type="file"
            accept={ACCEPT}
            multiple
            onChange={onUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />

          {files.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map(f => {
                const ext = f.nome.split('.').pop()?.toLowerCase() || ''
                const icon = ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-image'
                const color = ext === 'pdf' ? 'var(--red)' : 'var(--blue)'
                return (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
                  }}>
                    <i className={`fas ${icon}`} style={{ color, fontSize: 16 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.tamanho}</div>
                    </div>
                    <button className="btn-icon" onClick={() => handleDownload(f)} title="Baixar"><i className="fas fa-download" /></button>
                    <button className="btn-icon danger" onClick={() => handleDelete(f)} title="Excluir"><i className="fas fa-trash" /></button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
