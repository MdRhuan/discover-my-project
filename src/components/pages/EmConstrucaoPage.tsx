'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { ConstructionFolder, ConstructionDocument, ConstructionFile, Empresa } from '@/types'

const BUCKET = 'construction-documents'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fileIconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: 'var(--red)' }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { icon: 'fa-file-image', color: 'var(--blue)' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: 'var(--green)' }
  if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#2b6cb0' }
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: 'fa-file-zipper', color: 'var(--yellow)' }
  return { icon: 'fa-file', color: 'var(--brand)' }
}

export function EmConstrucaoPage() {
  const { toast } = useApp()

  const [folders, setFolders] = useState<ConstructionFolder[]>([])
  const [documents, setDocuments] = useState<ConstructionDocument[]>([])
  const [files, setFiles] = useState<ConstructionFile[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // modals
  const [folderModal, setFolderModal] = useState(false)
  const [folderForm, setFolderForm] = useState<Partial<ConstructionFolder>>({})
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)

  const [docModal, setDocModal] = useState(false)
  const [docForm, setDocForm] = useState<Partial<ConstructionDocument>>({})
  const [editingDocId, setEditingDocId] = useState<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [savingDoc, setSavingDoc] = useState(false)

  const [moveDocId, setMoveDocId] = useState<number | null>(null)
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<number | null>(null)

  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<number | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<number | null>(null)

  const [viewDocId, setViewDocId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [f, d, fi, e] = await Promise.all([
      db.constructionFolders.toArray(),
      db.constructionDocuments.toArray(),
      db.constructionFiles.toArray(),
      db.empresas.toArray(),
    ])
    setFolders(f)
    setDocuments(d)
    setFiles(fi)
    setEmpresas(e)
  }, [])

  useEffect(() => { load() }, [load])

  // Breadcrumb path
  const breadcrumbs = useMemo(() => {
    const path: ConstructionFolder[] = []
    let id = currentFolderId
    while (id) {
      const f = folders.find(x => x.id === id)
      if (!f) break
      path.unshift(f)
      id = f.parentId ?? null
    }
    return path
  }, [currentFolderId, folders])

  const subfolders = useMemo(
    () => folders
      .filter(f => (f.parentId ?? null) === currentFolderId)
      .filter(f => !search || f.nome.toLowerCase().includes(search.toLowerCase())),
    [folders, currentFolderId, search]
  )

  const docsHere = useMemo(
    () => documents
      .filter(d => (d.folderId ?? null) === currentFolderId)
      .filter(d => !search ||
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        (d.empresaNome || '').toLowerCase().includes(search.toLowerCase())
      ),
    [documents, currentFolderId, search]
  )

  const filesByDoc = useMemo(() => {
    const map: Record<number, ConstructionFile[]> = {}
    files.forEach(f => {
      if (f.documentId) {
        if (!map[f.documentId]) map[f.documentId] = []
        map[f.documentId].push(f)
      }
    })
    return map
  }, [files])

  // -------- Folder actions --------
  function openNewFolder() {
    setFolderForm({ parentId: currentFolderId, nome: '', empresaNome: '', descricao: '' })
    setEditingFolderId(null)
    setFolderModal(true)
  }

  function openEditFolder(f: ConstructionFolder) {
    setFolderForm({ ...f })
    setEditingFolderId(f.id!)
    setFolderModal(true)
  }

  async function saveFolder() {
    if (!folderForm.nome?.trim()) { toast('Informe o nome da pasta.', 'error'); return }
    try {
      if (editingFolderId) {
        await db.constructionFolders.update(editingFolderId, folderForm)
      } else {
        await db.constructionFolders.add({
          ...folderForm,
          parentId: folderForm.parentId ?? currentFolderId ?? null,
        } as ConstructionFolder)
      }
      toast('Pasta salva!', 'success')
      setFolderModal(false)
      setFolderForm({})
      setEditingFolderId(null)
      load()
    } catch (err) {
      console.error(err)
      toast('Erro ao salvar pasta.', 'error')
    }
  }

  async function deleteFolder(id: number) {
    try {
      // Cascata via FK em construction_folders.parent_id removerá subpastas;
      // documentos terão folder_id setado para NULL (ON DELETE SET NULL).
      // Mas precisamos remover arquivos órfãos manualmente se quisermos manter o storage limpo.
      // Aqui mantemos os documentos (vão para a raiz) — comportamento mais seguro.
      await db.constructionFolders.delete(id)
      toast('Pasta excluída.', 'success')
      setConfirmDeleteFolder(null)
      load()
    } catch (err) {
      console.error(err)
      toast('Erro ao excluir pasta. Apenas administradores podem excluir.', 'error')
    }
  }

  // -------- Document actions --------
  function openNewDoc() {
    setDocForm({
      folderId: currentFolderId,
      nome: '',
      empresaNome: '',
      descricao: '',
      data: new Date().toISOString().slice(0, 10),
    })
    setPendingFiles([])
    setEditingDocId(null)
    setDocModal(true)
  }

  function openEditDoc(d: ConstructionDocument) {
    setDocForm({ ...d })
    setPendingFiles([])
    setEditingDocId(d.id!)
    setDocModal(true)
  }

  async function uploadFilesForDoc(documentId: number, list: File[]) {
    for (const file of list) {
      const path = `${documentId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      await db.constructionFiles.add({
        documentId,
        nome: file.name,
        arquivoPath: path,
        tipo: file.type,
        tamanho: formatSize(file.size),
        dataUpload: new Date().toISOString(),
      })
    }
  }

  async function saveDoc() {
    if (!docForm.nome?.trim()) { toast('Informe o nome do documento.', 'error'); return }
    if (!docForm.empresaNome?.trim()) { toast('Informe a empresa relacionada.', 'error'); return }
    setSavingDoc(true)
    try {
      let id = editingDocId
      if (id) {
        await db.constructionDocuments.update(id, docForm)
      } else {
        id = await db.constructionDocuments.add(docForm as ConstructionDocument)
      }
      if (id && pendingFiles.length > 0) {
        await uploadFilesForDoc(id, pendingFiles)
      }
      toast('Documento salvo!', 'success')
      setDocModal(false)
      setDocForm({})
      setPendingFiles([])
      setEditingDocId(null)
      load()
    } catch (err) {
      console.error(err)
      toast('Erro ao salvar documento.', 'error')
    } finally {
      setSavingDoc(false)
    }
  }

  async function deleteDoc(id: number) {
    try {
      // remove arquivos do storage
      const docFiles = files.filter(f => f.documentId === id)
      if (docFiles.length > 0) {
        await supabase.storage.from(BUCKET).remove(docFiles.map(f => f.arquivoPath))
      }
      await db.constructionDocuments.delete(id)
      toast('Documento excluído.', 'success')
      setConfirmDeleteDoc(null)
      load()
    } catch (err) {
      console.error(err)
      toast('Erro ao excluir documento.', 'error')
    }
  }

  async function moveDoc() {
    if (!moveDocId) return
    try {
      await db.constructionDocuments.update(moveDocId, { folderId: moveTargetFolderId })
      toast('Documento movido.', 'success')
      setMoveDocId(null)
      setMoveTargetFolderId(null)
      load()
    } catch {
      toast('Erro ao mover documento.', 'error')
    }
  }

  async function downloadFile(f: ConstructionFile) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.arquivoPath, 60)
    if (error || !data) { toast('Erro ao baixar.', 'error'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function deleteFile(f: ConstructionFile) {
    try {
      await supabase.storage.from(BUCKET).remove([f.arquivoPath])
      if (f.id) await db.constructionFiles.delete(f.id)
      toast('Arquivo removido.', 'success')
      load()
    } catch {
      toast('Erro ao remover arquivo.', 'error')
    }
  }

  // helpers
  const folderOptionsFlat = useMemo(() => {
    // build a flat list with indented labels
    const result: { id: number | null; label: string }[] = [{ id: null, label: '/ (raiz)' }]
    function walk(parentId: number | null, depth: number) {
      folders
        .filter(f => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .forEach(f => {
          result.push({ id: f.id!, label: `${'— '.repeat(depth)}${f.nome}` })
          walk(f.id!, depth + 1)
        })
    }
    walk(null, 0)
    return result
  }, [folders])

  const viewingDoc = viewDocId ? documents.find(d => d.id === viewDocId) : null
  const viewingDocFiles = viewDocId ? (filesByDoc[viewDocId] || []) : []

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">
            <i className="fas fa-helmet-safety" style={{ marginRight: 8, color: 'var(--yellow)' }} />
            Em Construção
          </div>
          <div className="page-header-sub">
            Documentos de empresas que ainda não estão finalizadas — {documents.length} documentos em {folders.length} pastas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={openNewFolder}>
            <i className="fas fa-folder-plus" /> Nova Pasta
          </button>
          <button className="btn btn-primary" onClick={openNewDoc}>
            <i className="fas fa-plus" /> Adicionar Documento
          </button>
        </div>
      </div>

      {/* Breadcrumb + search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 280,
          padding: '10px 14px', borderRadius: 10,
          background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          fontSize: 13,
        }}>
          <button
            onClick={() => setCurrentFolderId(null)}
            style={{
              background: 'transparent', border: 0, color: currentFolderId === null ? 'var(--brand)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 13,
            }}
          >
            <i className="fas fa-house" /> Início
          </button>
          {breadcrumbs.map((f, i) => (
            <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-chevron-right" style={{ fontSize: 9, color: 'var(--text-muted)' }} />
              <button
                onClick={() => setCurrentFolderId(f.id!)}
                style={{
                  background: 'transparent', border: 0,
                  color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 13,
                }}
              >
                {f.nome}
              </button>
            </span>
          ))}
        </div>
        <div className="search-bar" style={{ maxWidth: 280 }}>
          <i className="fas fa-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pasta ou documento..." />
        </div>
      </div>

      {/* Subfolders grid */}
      {subfolders.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Pastas
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12, marginBottom: 24,
          }}>
            {subfolders.map(f => {
              const childCount = documents.filter(d => d.folderId === f.id).length
              const subCount = folders.filter(x => x.parentId === f.id).length
              return (
                <div key={f.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setCurrentFolderId(f.id!)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 14px 8px', background: 'transparent', border: 0,
                      cursor: 'pointer', textAlign: 'left', color: 'inherit',
                    }}
                  >
                    <i className="fas fa-folder" style={{ fontSize: 28, color: 'var(--yellow)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.nome}
                      </div>
                      {f.empresaNome && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.empresaNome}</div>}
                    </div>
                  </button>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 14px 12px', fontSize: 11, color: 'var(--text-muted)',
                  }}>
                    <span>{childCount} docs · {subCount} pastas</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => openEditFolder(f)} title="Editar"><i className="fas fa-pen" /></button>
                      <button className="btn-icon danger" onClick={() => setConfirmDeleteFolder(f.id!)} title="Excluir"><i className="fas fa-trash" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Documents table */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
        Documentos
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Empresa</th>
                <th>Data</th>
                <th>Arquivos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {docsHere.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <i className="fas fa-folder-open" />
                      <p>Nenhum documento nesta pasta.</p>
                    </div>
                  </td>
                </tr>
              )}
              {docsHere.map(d => {
                const docFiles = filesByDoc[d.id!] || []
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fas fa-file-lines" style={{ color: 'var(--brand)', fontSize: 16, flexShrink: 0 }} />
                        <div>
                          <button
                            onClick={() => setViewDocId(d.id!)}
                            style={{
                              background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                              fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left', fontSize: 13,
                            }}
                          >
                            {d.nome}
                          </button>
                          {d.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.descricao}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{d.empresaNome || '—'}</td>
                    <td style={{ fontSize: 12 }}>{d.data || '—'}</td>
                    <td>
                      <span className="badge badge-brand" style={{ fontSize: 10 }}>
                        <i className="fas fa-paperclip" style={{ marginRight: 4 }} />
                        {docFiles.length}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => setViewDocId(d.id!)} title="Visualizar"><i className="fas fa-eye" /></button>
                        <button className="btn-icon" onClick={() => openEditDoc(d)} title="Editar"><i className="fas fa-pen" /></button>
                        <button className="btn-icon" onClick={() => { setMoveDocId(d.id!); setMoveTargetFolderId(d.folderId ?? null) }} title="Mover"><i className="fas fa-folder-tree" /></button>
                        <button className="btn-icon danger" onClick={() => setConfirmDeleteDoc(d.id!)} title="Excluir"><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Folder modal */}
      {folderModal && (
        <Modal
          title={editingFolderId ? 'Editar Pasta' : 'Nova Pasta'}
          onClose={() => { setFolderModal(false); setFolderForm({}); setEditingFolderId(null) }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setFolderModal(false); setFolderForm({}); setEditingFolderId(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveFolder}><i className="fas fa-save" /> Salvar</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome da pasta *</label>
              <input
                className="form-input"
                value={folderForm.nome || ''}
                onChange={e => setFolderForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Empresa XYZ - Documentos Iniciais"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pasta-mãe</label>
              <select
                className="form-select"
                value={folderForm.parentId ?? ''}
                onChange={e => setFolderForm(p => ({ ...p, parentId: e.target.value ? Number(e.target.value) : null }))}
              >
                {folderOptionsFlat
                  .filter(o => o.id !== editingFolderId) // não pode ser pai de si mesmo
                  .map(o => <option key={o.id ?? 'root'} value={o.id ?? ''}>{o.label}</option>)
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Empresa relacionada (opcional)</label>
              <input
                className="form-input"
                list="empresas-list"
                value={folderForm.empresaNome || ''}
                onChange={e => setFolderForm(p => ({ ...p, empresaNome: e.target.value }))}
                placeholder="Nome da empresa em construção"
              />
              <datalist id="empresas-list">
                {empresas.map(e => <option key={e.id} value={e.nome} />)}
              </datalist>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea"
                value={folderForm.descricao || ''}
                onChange={e => setFolderForm(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Document modal */}
      {docModal && (
        <Modal
          title={editingDocId ? 'Editar Documento' : 'Adicionar Documento'}
          large
          onClose={() => { setDocModal(false); setDocForm({}); setPendingFiles([]); setEditingDocId(null) }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setDocModal(false); setDocForm({}); setPendingFiles([]); setEditingDocId(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={savingDoc} onClick={saveDoc}>
                <i className={`fas ${savingDoc ? 'fa-spinner fa-spin' : 'fa-save'}`} /> {savingDoc ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome do documento *</label>
              <input
                className="form-input"
                value={docForm.nome || ''}
                onChange={e => setDocForm(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa relacionada *</label>
              <input
                className="form-input"
                list="empresas-list-doc"
                value={docForm.empresaNome || ''}
                onChange={e => setDocForm(p => ({ ...p, empresaNome: e.target.value }))}
                placeholder="Nome da empresa"
              />
              <datalist id="empresas-list-doc">
                {empresas.map(e => <option key={e.id} value={e.nome} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input
                className="form-input"
                type="date"
                value={docForm.data || ''}
                onChange={e => setDocForm(p => ({ ...p, data: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Pasta</label>
              <select
                className="form-select"
                value={docForm.folderId ?? ''}
                onChange={e => setDocForm(p => ({ ...p, folderId: e.target.value ? Number(e.target.value) : null }))}
              >
                {folderOptionsFlat.map(o => <option key={o.id ?? 'root'} value={o.id ?? ''}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descrição (opcional)</label>
              <textarea
                className="form-textarea"
                value={docForm.descricao || ''}
                onChange={e => setDocForm(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Arquivos {editingDocId ? '(adicionar mais)' : ''}</label>
              <label
                htmlFor="construction-file-input"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: 14, borderRadius: 10, cursor: 'pointer',
                  background: 'var(--surface-hover)', border: '1px dashed var(--brand)',
                  fontSize: 13, color: 'var(--brand)', fontWeight: 600,
                }}
              >
                <i className="fas fa-cloud-arrow-up" />
                Selecionar arquivos (múltiplos permitidos)
              </label>
              <input
                id="construction-file-input"
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)])
                  e.target.value = ''
                }}
              />
              {pendingFiles.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingFiles.map((f, i) => {
                    const ic = fileIconFor(f.name)
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
                      }}>
                        <i className={`fas ${ic.icon}`} style={{ color: ic.color, fontSize: 16 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatSize(f.size)}</div>
                        </div>
                        <button className="btn-icon danger" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Visualizar documento */}
      {viewingDoc && (
        <Modal
          title={viewingDoc.nome}
          large
          onClose={() => setViewDocId(null)}
          footer={<button className="btn btn-ghost" onClick={() => setViewDocId(null)}>Fechar</button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Empresa</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{viewingDoc.empresaNome || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Data</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{viewingDoc.data || '—'}</div>
              </div>
              {viewingDoc.descricao && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Descrição</div>
                  <div style={{ fontSize: 13 }}>{viewingDoc.descricao}</div>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                Arquivos ({viewingDocFiles.length})
              </div>
              {viewingDocFiles.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum arquivo anexado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewingDocFiles.map(f => {
                    const ic = fileIconFor(f.nome)
                    return (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
                      }}>
                        <i className={`fas ${ic.icon}`} style={{ color: ic.color, fontSize: 16 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.tamanho}</div>
                        </div>
                        <button className="btn-icon" onClick={() => downloadFile(f)} title="Baixar"><i className="fas fa-download" /></button>
                        <button className="btn-icon danger" onClick={() => deleteFile(f)} title="Excluir"><i className="fas fa-trash" /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Move document */}
      {moveDocId && (
        <Modal
          title="Mover documento"
          onClose={() => { setMoveDocId(null); setMoveTargetFolderId(null) }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setMoveDocId(null); setMoveTargetFolderId(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={moveDoc}><i className="fas fa-folder-tree" /> Mover</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Pasta de destino</label>
            <select
              className="form-select"
              value={moveTargetFolderId ?? ''}
              onChange={e => setMoveTargetFolderId(e.target.value ? Number(e.target.value) : null)}
            >
              {folderOptionsFlat.map(o => <option key={o.id ?? 'root'} value={o.id ?? ''}>{o.label}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {confirmDeleteFolder && (
        <ConfirmDialog
          msg="Excluir esta pasta? Os documentos dentro dela serão movidos para a raiz."
          onConfirm={() => deleteFolder(confirmDeleteFolder)}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
      {confirmDeleteDoc && (
        <ConfirmDialog
          msg="Excluir este documento e todos os seus arquivos?"
          onConfirm={() => deleteDoc(confirmDeleteDoc)}
          onCancel={() => setConfirmDeleteDoc(null)}
        />
      )}
    </div>
  )
}
