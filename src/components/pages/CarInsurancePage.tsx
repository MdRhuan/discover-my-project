'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { fmt } from '@/lib/utils'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { InsuranceDocsManager } from '@/components/insurance/InsuranceDocsManager'

const CI_KEY = 'carInsurance_data'

interface Doc { nome: string; tipo: string; tamanho: string; conteudo: string }
interface Seguro {
  id: number
  seguradora: string
  produto?: string
  veiculo?: string
  placa?: string
  chassi?: string
  ano_fab?: number
  ano_modelo?: number
  cor?: string
  segurado?: string
  apolice?: string
  cobertura_tipo?: string
  status: string
  moeda: string
  franquia?: string
  premio_mensal?: string
  premio_anual?: string
  inicio?: string
  vencimento?: string
  seguradora_contato?: string
  cobertura_roubo?: boolean
  cobertura_incendio?: boolean
  cobertura_terceiros?: boolean
  carro_reserva?: boolean
  assistencia_24h?: boolean
  rastreador?: boolean
  renovacao_auto?: boolean
  obs?: string
  docs?: Doc[]
}

const STATUS_MAP: Record<string, { badge: string; label: string }> = {
  ativo:     { badge: 'green',  label: 'Ativo'     },
  vencido:   { badge: 'red',    label: 'Vencido'   },
  cancelado: { badge: 'muted',  label: 'Cancelado' },
  suspenso:  { badge: 'yellow', label: 'Suspenso'  },
}

const COBERTURAS = ['Compreensiva', 'Colisão', 'Básica (RCF)', 'Contra Terceiros', 'Roubo/Furto']

const EMPTY: Partial<Seguro> = {
  id: undefined, status: 'ativo', moeda: 'BRL', cobertura_tipo: 'Compreensiva',
  cobertura_terceiros: true, cobertura_roubo: true, cobertura_incendio: true,
  carro_reserva: false, assistencia_24h: true, rastreador: false,
  renovacao_auto: false, docs: [],
}

export function CarInsurancePage() {
  const { t, lang, toast } = useApp()
  const [seguros, setSeguros] = useState<Seguro[]>([])
  const [modal, setModal] = useState<'form' | null>(null)
  const [form, setForm] = useState<Partial<Seguro>>({})
  const [confirm, setConfirm] = useState<null | { msg: string; onConfirm: () => void }>(null)
  const [detail, setDetail] = useState<Seguro | null>(null)
  const [centralOpen, setCentralOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    db.config.get(CI_KEY).then(rec => setSeguros((rec?.value as Seguro[]) || []))
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.seguradora?.trim()) { toast('Seguradora obrigatória.', 'error'); return }
    try {
      const all = ((await db.config.get(CI_KEY))?.value as Seguro[]) || []
      const entry = { ...form, id: form.id || Date.now() } as Seguro
      const updated = all.find(s => s.id === entry.id)
        ? all.map(s => s.id === entry.id ? entry : s)
        : [...all, entry]
      await db.config.put({ chave: CI_KEY, value: updated })
      setSeguros(updated); setModal(null)
      toast(t.saved, 'success')
    } catch { toast(t.errorSave, 'error') }
  }

  function del(id: number) {
    setConfirm({ msg: t.deleteConfirm, onConfirm: async () => {
      const all = ((await db.config.get(CI_KEY))?.value as Seguro[]) || []
      const updated = all.filter(s => s.id !== id)
      await db.config.put({ chave: CI_KEY, value: updated })
      setSeguros(updated); setConfirm(null); setDetail(null)
      toast(t.deleted, 'success')
    }})
  }

  function openForm(seg: Seguro | null) {
    setForm(seg ? { ...seg } : { ...EMPTY })
    setModal('form')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const doc: Doc = { nome: file.name, tipo: file.name.split('.').pop()!.toUpperCase(), tamanho: file.size > 1048576 ? (file.size/1048576).toFixed(1)+' MB' : (file.size/1024).toFixed(0)+' KB', conteudo: ev.target!.result as string }
      setForm(f => ({ ...f, docs: [...(f.docs||[]), doc] }))
    }
    reader.readAsDataURL(file)
  }

  function downloadDoc(doc: Doc) {
    if (!doc.conteudo) return
    const a = document.createElement('a'); a.href = doc.conteudo; a.download = doc.nome; a.click()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#3b82f640,#6470f1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="fas fa-car" style={{ color:'#3b82f6', fontSize:18 }} />
          </div>
          <div className="page-header-info">
            <div className="page-header-title">Seguro do Carro</div>
            <div className="page-header-sub">{seguros.filter(s=>s.status==='ativo').length} apólices ativas · {seguros.length} veículos cadastrados</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <i className="fas fa-plus" />Nova Apólice
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label: 'Apólices ativas', value: seguros.filter(s=>s.status==='ativo').length, icon:'fa-file-shield', color:'var(--green)' },
          { label: 'Veículos BR', value: seguros.filter(s=>s.moeda==='BRL').length, icon:'fa-flag', color:'var(--brand)' },
          { label: 'Veículos US', value: seguros.filter(s=>s.moeda==='USD').length, icon:'fa-flag-usa', color:'#f59e0b' },
          { label: 'Com rastreador', value: seguros.filter(s=>s.rastreador).length, icon:'fa-location-dot', color:'var(--text-muted)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <i className={`fas ${c.icon}`} style={{ fontSize:20, color:c.color, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{c.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {seguros.length === 0 ? (
        <div className="empty-state card"><i className="fas fa-car" /><p>Nenhuma apólice cadastrada.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:14 }}>
          {seguros.map(seg => {
            const st = STATUS_MAP[seg.status] || STATUS_MAP.ativo
            return (
              <div key={seg.id} className="card" style={{ padding:'18px 20px', cursor:'pointer' }} onClick={() => setDetail(seg)}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:2 }}>{seg.veiculo}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{seg.seguradora} · {seg.produto}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span className={`badge badge-${st.badge}`}>{st.label}</span>
                      <span className="badge badge-muted" style={{ fontSize:10 }}>{seg.cobertura_tipo}</span>
                      <span className="badge badge-muted" style={{ fontSize:10 }}>{seg.moeda==='USD'?'🇺🇸 USD':'🇧🇷 BRL'}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openForm(seg)}><i className="fas fa-pen" /></button>
                    <button className="btn-icon danger" onClick={() => del(seg.id)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>
                  {seg.placa && <div><i className="fas fa-id-badge" style={{ width:16, color:'var(--brand)' }} /> {seg.placa} · {seg.ano_fab}/{seg.ano_modelo}</div>}
                  <div><i className="fas fa-hand-holding-dollar" style={{ width:16, color:'var(--green)' }} /> Prêmio: {seg.moeda==='USD'?'US$':'R$'} {seg.premio_mensal}/mês</div>
                  <div><i className="fas fa-triangle-exclamation" style={{ width:16, color:'var(--yellow)' }} /> Franquia: {seg.moeda==='USD'?'US$':'R$'} {seg.franquia}</div>
                  <div><i className="fas fa-calendar" style={{ width:16, color:'var(--brand)' }} /> {seg.inicio?fmt.date(seg.inicio,lang):'—'} → {seg.vencimento?fmt.date(seg.vencimento,lang):'—'}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {seg.cobertura_roubo    && <span className="badge badge-green"  style={{ fontSize:10 }}>Roubo/Furto</span>}
                  {seg.cobertura_incendio && <span className="badge badge-blue"   style={{ fontSize:10 }}>Incêndio</span>}
                  {seg.carro_reserva      && <span className="badge badge-yellow" style={{ fontSize:10 }}>Carro reserva</span>}
                  {seg.rastreador         && <span className="badge badge-muted"  style={{ fontSize:10 }}>Rastreador</span>}
                  {seg.assistencia_24h    && <span className="badge badge-muted"  style={{ fontSize:10 }}>Assistência 24h</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth:580 }}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-car" style={{ marginRight:8, color:'#3b82f6' }} />{detail.veiculo}</div>
              <button className="modal-close" onClick={() => setDetail(null)}><i className="fas fa-xmark" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', fontSize:13 }}>
                {([
                  ['Seguradora', detail.seguradora],
                  ['Produto', detail.produto],
                  ['Nº Apólice', detail.apolice],
                  ['Veículo', detail.veiculo],
                  ['Placa', detail.placa],
                  ['Chassi', detail.chassi],
                  ['Ano fab./modelo', detail.ano_fab ? `${detail.ano_fab}/${detail.ano_modelo}` : undefined],
                  ['Cor', detail.cor],
                  ['Segurado', detail.segurado],
                  ['Tipo cobertura', detail.cobertura_tipo],
                  ['Franquia', `${detail.moeda==='USD'?'US$':'R$'} ${detail.franquia}`],
                  ['Prêmio mensal', `${detail.moeda==='USD'?'US$':'R$'} ${detail.premio_mensal}`],
                  ['Prêmio anual', `${detail.moeda==='USD'?'US$':'R$'} ${detail.premio_anual}`],
                  ['Início', detail.inicio ? fmt.date(detail.inicio, lang) : '—'],
                  ['Vencimento', detail.vencimento ? fmt.date(detail.vencimento, lang) : '—'],
                  ['Contato seguradora', detail.seguradora_contato],
                ] as [string, string | undefined][]).map(([lbl, val]) => val ? (
                  <div key={lbl}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'.05em' }}>{lbl}</div>
                    <div style={{ fontWeight:500 }}>{val}</div>
                  </div>
                ) : null)}
              </div>
              {detail.obs && (
                <div style={{ marginTop:14, background:'var(--surface-hover)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>
                  <i className="fas fa-note-sticky" style={{ marginRight:6, color:'var(--brand)' }} />{detail.obs}
                </div>
              )}
              {(detail.docs||[]).length > 0 && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em' }}>Documentos</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {detail.docs!.map((d, i) => (
                      <button key={i} onClick={() => { const a=document.createElement('a');a.href=d.conteudo;a.download=d.nome;a.click() }} style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface-hover)', border:'1px solid var(--surface-border)', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--text-secondary)' }}>
                        <i className="fas fa-file-pdf" style={{ color:'var(--brand)', fontSize:11 }} />{d.nome.length>24?d.nome.slice(0,24)+'…':d.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>{t.close}</button>
              <button className="btn btn-primary" onClick={() => { openForm(detail); setDetail(null) }}><i className="fas fa-pen" />{t.edit}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'form' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth:620 }}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? 'Editar Apólice' : 'Nova Apólice — Seguro do Carro'}</div>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-xmark" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Seguradora <span style={{ color:'var(--red)' }}>*</span></label>
                  <input className="form-input" value={form.seguradora||''} onChange={e=>setForm(f=>({...f,seguradora:e.target.value}))} placeholder="Ex: Porto Seguro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Produto</label>
                  <input className="form-input" value={form.produto||''} onChange={e=>setForm(f=>({...f,produto:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Veículo</label>
                  <input className="form-input" value={form.veiculo||''} onChange={e=>setForm(f=>({...f,veiculo:e.target.value}))} placeholder="Ex: Mercedes-Benz GLE 450" />
                </div>
                <div className="form-group">
                  <label className="form-label">Placa</label>
                  <input className="form-input" value={form.placa||''} onChange={e=>setForm(f=>({...f,placa:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Chassi</label>
                  <input className="form-input" value={form.chassi||''} onChange={e=>setForm(f=>({...f,chassi:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ano fabricação</label>
                  <input className="form-input" type="number" value={form.ano_fab||''} onChange={e=>setForm(f=>({...f,ano_fab:Number(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ano modelo</label>
                  <input className="form-input" type="number" value={form.ano_modelo||''} onChange={e=>setForm(f=>({...f,ano_modelo:Number(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <input className="form-input" value={form.cor||''} onChange={e=>setForm(f=>({...f,cor:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Segurado</label>
                  <input className="form-input" value={form.segurado||''} onChange={e=>setForm(f=>({...f,segurado:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº Apólice</label>
                  <input className="form-input" value={form.apolice||''} onChange={e=>setForm(f=>({...f,apolice:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de cobertura</label>
                  <select className="form-select" value={form.cobertura_tipo||'Compreensiva'} onChange={e=>setForm(f=>({...f,cobertura_tipo:e.target.value}))}>
                    {COBERTURAS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status||'ativo'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Franquia</label>
                  <input className="form-input" value={form.franquia||''} onChange={e=>setForm(f=>({...f,franquia:e.target.value}))} placeholder="3.500" />
                </div>
                <div className="form-group">
                  <label className="form-label">Moeda</label>
                  <select className="form-select" value={form.moeda||'BRL'} onChange={e=>setForm(f=>({...f,moeda:e.target.value}))}>
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Prêmio mensal</label>
                  <input className="form-input" value={form.premio_mensal||''} onChange={e=>setForm(f=>({...f,premio_mensal:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prêmio anual</label>
                  <input className="form-input" value={form.premio_anual||''} onChange={e=>setForm(f=>({...f,premio_anual:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Início vigência</label>
                  <input className="form-input" type="date" value={form.inicio||''} onChange={e=>setForm(f=>({...f,inicio:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fim vigência</label>
                  <input className="form-input" type="date" value={form.vencimento||''} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Contato seguradora</label>
                  <input className="form-input" value={form.seguradora_contato||''} onChange={e=>setForm(f=>({...f,seguradora_contato:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1', display:'flex', gap:20, flexWrap:'wrap' }}>
                  {([
                    ['cobertura_roubo','fa-user-ninja','Roubo/Furto'],
                    ['cobertura_incendio','fa-fire','Incêndio'],
                    ['cobertura_terceiros','fa-car-burst','Terceiros'],
                    ['carro_reserva','fa-car-side','Carro reserva'],
                    ['assistencia_24h','fa-headset','Assistência 24h'],
                    ['rastreador','fa-location-dot','Rastreador'],
                    ['renovacao_auto','fa-rotate','Renovação auto'],
                  ] as [keyof Seguro, string, string][]).map(([key, icon, lbl]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{ width:14, height:14 }} />
                      <i className={`fas ${icon}`} style={{ color:'var(--brand)', fontSize:12 }} /> {lbl}
                    </label>
                  ))}
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Observações</label>
                  <textarea className="form-textarea" rows={2} value={form.obs||''} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Documentos</label>
                  <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile} />
                  <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><i className="fas fa-paperclip" />Anexar</button>
                  {(form.docs||[]).length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                      {form.docs!.map((d, i) => (
                        <span key={i} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--surface-hover)', borderRadius:6, padding:'3px 9px', fontSize:11 }}>
                          <i className="fas fa-file" style={{ color:'var(--brand)', fontSize:10 }} />{d.nome.length>22?d.nome.slice(0,22)+'…':d.nome}
                          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', padding:0, marginLeft:2, fontSize:11 }} onClick={() => setForm(f=>({...f,docs:f.docs!.filter((_,j)=>j!==i)}))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={save}><i className="fas fa-floppy-disk" />{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
