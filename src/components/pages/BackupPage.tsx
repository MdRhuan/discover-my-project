'use client'

import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'

export function BackupPage() {
  const { toast } = useApp()
  const [importing, setImporting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function exportJSON() {
    const [empresas, funcionarios, documentos, transacoes, orgNodes, auditLog] = await Promise.all([
      db.empresas.toArray(), db.funcionarios.toArray(), db.documentos.toArray(),
      db.transacoes.toArray(), db.orgNodes.toArray(), db.auditLog.toArray(),
    ])
    const payload = { exportedAt: new Date().toISOString(), version: 1, empresas, funcionarios, documentos, transacoes, orgNodes, auditLog }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hub_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    await db.auditLog.add({ acao: 'Backup JSON exportado', modulo: 'Backup', timestamp: new Date().toISOString() })
    toast('Backup exportado com sucesso!', 'success')
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await db.empresas.clear();     if (data.empresas?.length)    await db.empresas.bulkAdd(data.empresas)
      await db.funcionarios.clear(); if (data.funcionarios?.length) await db.funcionarios.bulkAdd(data.funcionarios)
      await db.documentos.clear();   if (data.documentos?.length)   await db.documentos.bulkAdd(data.documentos)
      await db.transacoes.clear();   if (data.transacoes?.length)   await db.transacoes.bulkAdd(data.transacoes)
      await db.orgNodes.clear();     if (data.orgNodes?.length)     await db.orgNodes.bulkAdd(data.orgNodes)
      await db.auditLog.add({ acao: `Backup importado: ${file.name}`, modulo: 'Backup', timestamp: new Date().toISOString() })
      toast('Backup importado com sucesso!', 'success')
    } catch { toast('Erro ao importar backup.', 'error') }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function resetAllData() {
    setResetting(true)
    try {
      await Promise.all([
        db.empresas.clear(), db.funcionarios.clear(), db.documentos.clear(),
        db.transacoes.clear(), db.orgNodes.clear(), db.orgTexts.clear(),
        db.tasks.clear(), db.alertas.clear(), db.docsPessoais.clear(),
        db.fiscalDocs.clear(), db.trademarks.clear(), db.config.clear(),
        db.auditLog.clear(),
      ])
      toast('Todos os dados foram apagados.', 'success')
      setConfirmReset(false)
      setTimeout(() => window.location.reload(), 800)
    } catch { toast('Erro ao apagar dados.', 'error') }
    setResetting(false)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title"><i className="fas fa-database" style={{ marginRight:10, color:'var(--brand)' }} />Backup & Exportação</div>
          <div className="page-header-sub">Exportação e importação de todos os dados</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:700 }}>
        <div className="card" style={{ textAlign:'center', padding:36 }}>
          <i className="fas fa-cloud-arrow-down" style={{ fontSize:40, color:'var(--brand)', marginBottom:16, display:'block' }} />
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Exportar Backup</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>Exporta todos os dados em um arquivo JSON. Use para backup manual ou migração.</p>
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={exportJSON}>
            <i className="fas fa-download" />Exportar Backup
          </button>
        </div>
        <div className="card" style={{ textAlign:'center', padding:36 }}>
          <i className="fas fa-cloud-arrow-up" style={{ fontSize:40, color:'var(--yellow)', marginBottom:16, display:'block' }} />
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Importar Backup</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>Restaura dados a partir de um backup JSON. <strong style={{ color:'var(--red)' }}>Atenção: substitui todos os dados atuais.</strong></p>
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', borderColor:'var(--yellow)', color:'var(--yellow)' }} onClick={() => fileRef.current?.click()} disabled={importing}>
            <i className={`fas ${importing ? 'fa-spinner fa-spin' : 'fa-upload'}`} />{importing ? 'Importando...' : 'Importar Backup'}
          </button>
          <input type="file" ref={fileRef} accept=".json" style={{ display:'none' }} onChange={importJSON} />
        </div>
      </div>

      <div className="card" style={{ maxWidth:700, marginTop:24, border:'1px solid var(--red)', padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <i className="fas fa-skull-crossbones" style={{ color:'var(--red)', fontSize:20 }} />
          <span style={{ fontWeight:700, fontSize:15, color:'var(--red)' }}>Zona de Perigo</span>
        </div>
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:16 }}>
          Apaga <strong>permanentemente</strong> todos os dados do programa — empresas, documentos, tarefas, finanças e configurações. Esta ação não pode ser desfeita.
        </p>
        <button className="btn" style={{ background:'var(--red)', color:'#fff', border:'none', gap:8 }} onClick={() => setConfirmReset(true)}>
          <i className="fas fa-trash-can" />Apagar Todos os Dados
        </button>
      </div>

      <div className="alert alert-warning" style={{ marginTop:20, maxWidth:700 }}>
        <i className="fas fa-triangle-exclamation" />
        <div><strong>Dados armazenados na nuvem via Supabase.</strong> Faça backups regulares em JSON para ter uma cópia local de segurança.</div>
      </div>

      {confirmReset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width:420, padding:32, textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.4)' }}>
            <i className="fas fa-triangle-exclamation" style={{ fontSize:48, color:'var(--red)', marginBottom:16, display:'block' }} />
            <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Tem certeza absoluta?</div>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24 }}>
              Todos os dados serão apagados permanentemente. Exporte um backup antes de continuar.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button className="btn btn-ghost" style={{ minWidth:120 }} onClick={() => setConfirmReset(false)} disabled={resetting}>Cancelar</button>
              <button className="btn" style={{ background:'var(--red)', color:'#fff', border:'none', minWidth:160 }} onClick={resetAllData} disabled={resetting}>
                <i className={`fas ${resetting ? 'fa-spinner fa-spin' : 'fa-trash-can'}`} />{resetting ? 'Apagando...' : 'Sim, apagar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
