import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  NodeResizer,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeChange,
  type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { OrgNode, OrgEdge, OrgTextCanvas, OrgShape, OrgIcon, OrgImage, Empresa } from '@/types'

type PageKey = Parameters<ReturnType<typeof useApp>['setPage']>[0]

const ICON_MAP: Record<string, string> = {
  empresa: 'fa-building',
  holding: 'fa-sitemap',
  pessoa: 'fa-user',
  fundo: 'fa-landmark',
  trust: 'fa-shield-halved',
  offshore: 'fa-globe',
}

// ============ Company / Free Block Node ============
interface CompanyNodeData {
  label: string
  cargo?: string
  cnpj?: string
  ein?: string
  pais?: string
  empresaId?: number | null
  livre?: boolean
  icon?: string
  corBorda?: string
  corFundo?: string
  espessuraBorda?: number
  estiloBorda?: string
  onOpenEmpresa?: (id: number) => void
  onEdit?: (id: string) => void
}

function CompanyNode({ id, data, selected }: NodeProps<CompanyNodeData>) {
  const borda = data.corBorda || '#3b82f6'
  const fundo = data.corFundo || '#ffffff'
  const espessura = data.espessuraBorda || 2
  const estilo = data.estiloBorda || 'solid'
  return (
    <div
      style={{
        background: fundo,
        border: `${espessura}px ${estilo} ${borda}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 200,
        boxShadow: selected ? '0 0 0 2px hsl(var(--ring))' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: borda }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <i className={`fas ${ICON_MAP[data.icon || 'empresa'] || 'fa-building'}`} style={{ color: borda, fontSize: 18 }} />
        {data.empresaId ? (
          <button
            onClick={(e) => { e.stopPropagation(); data.onOpenEmpresa?.(data.empresaId!) }}
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontWeight: 700, fontSize: 14, color: '#0f172a', textAlign: 'left', flex: 1,
              textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = borda)}
            onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
            title="Abrir detalhes da empresa"
          >{data.label}</button>
        ) : (
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', flex: 1 }}>{data.label}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          title="Editar bloco"
        ><i className="fas fa-pen" style={{ fontSize: 11 }} /></button>
      </div>
      {data.cargo && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{data.cargo}</div>}
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#64748b' }}>
        {data.pais && <span><i className="fas fa-flag" style={{ marginRight: 4 }} />{data.pais}</span>}
        {data.cnpj && <span>CNPJ: {data.cnpj}</span>}
        {data.ein && <span>EIN: {data.ein}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: borda }} />
    </div>
  )
}

// ============ Text Node (texto solto) ============
interface TextNodeData {
  conteudo: string
  fonte?: string
  tamanho?: number
  cor?: string
  alinhamento?: 'left' | 'center' | 'right'
  negrito?: boolean
  italico?: boolean
  largura?: number
  onEdit?: (id: string) => void
}
function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
      style={{
        padding: '6px 8px',
        minWidth: 60,
        width: data.largura || undefined,
        fontFamily: data.fonte || 'inherit',
        fontSize: data.tamanho || 14,
        color: data.cor || '#0f172a',
        textAlign: data.alinhamento || 'left',
        fontWeight: data.negrito ? 700 : 400,
        fontStyle: data.italico ? 'italic' : 'normal',
        background: selected ? 'rgba(59,130,246,0.06)' : 'transparent',
        outline: selected ? '1px dashed #3b82f6' : 'none',
        borderRadius: 4,
        cursor: 'move',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      title="Duplo clique para editar"
    >
      {data.conteudo || 'Texto'}
    </div>
  )
}

// ============ Shape Node (caixa/borda) ============
interface ShapeNodeData {
  rotulo?: string
  corBorda?: string
  corFundo?: string
  espessuraBorda?: number
  estiloBorda?: string
  raio?: number
  opacidade?: number
  onEdit?: (id: string) => void
  onResize?: (id: string, w: number, h: number) => void
}
function ShapeNode({ id, data, selected }: NodeProps<ShapeNodeData>) {
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        onResizeEnd={(_, params) => data.onResize?.(id, params.width, params.height)}
        lineStyle={{ borderColor: '#3b82f6' }}
        handleStyle={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <div
        onDoubleClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
        style={{
          width: '100%',
          height: '100%',
          background: data.corFundo === 'transparent' ? 'transparent' : (data.corFundo || 'transparent'),
          border: `${data.espessuraBorda || 2}px ${data.estiloBorda || 'dashed'} ${data.corBorda || '#94a3b8'}`,
          borderRadius: data.raio ?? 12,
          opacity: data.opacidade ?? 1,
          padding: 8,
          color: '#475569',
          fontSize: 12,
          fontWeight: 500,
          boxSizing: 'border-box',
        }}
        title="Duplo clique para editar"
      >
        {data.rotulo}
      </div>
    </>
  )
}

// ============ Icon Node (SVG inline) ============
interface IconNodeData {
  svgContent: string
  cor?: string
  rotacao?: number
  nome?: string
  onEdit?: (id: string) => void
  onResize?: (id: string, w: number, h: number) => void
}
function IconNode({ id, data, selected }: NodeProps<IconNodeData>) {
  // Inject fill/stroke override via wrapper: tint by setting CSS color and using currentColor only when SVG uses it.
  // Strategy: render raw SVG, then apply css filter? Better: inject a <style> override targeting fill on path/g.
  const svg = useMemo(() => {
    if (!data.svgContent) return ''
    let s = data.svgContent
    // Ensure svg fills container
    s = s.replace(/<svg([^>]*)>/i, (_m, attrs) => {
      const cleaned = String(attrs)
        .replace(/\swidth="[^"]*"/i, '')
        .replace(/\sheight="[^"]*"/i, '')
      return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
    })
    return s
  }, [data.svgContent])
  const tint = data.cor || '#0f172a'
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={24}
        minHeight={24}
        keepAspectRatio
        onResizeEnd={(_, params) => data.onResize?.(id, params.width, params.height)}
        lineStyle={{ borderColor: '#3b82f6' }}
        handleStyle={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <div
        onDoubleClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
        style={{
          width: '100%',
          height: '100%',
          color: tint,
          transform: `rotate(${data.rotacao || 0}deg)`,
          outline: selected ? '1px dashed #3b82f6' : 'none',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          cursor: 'move',
        }}
        title={data.nome ? `${data.nome} · duplo clique p/ editar` : 'Duplo clique p/ editar'}
      >
        <style>{`.org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg, .org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg path, .org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg g, .org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg circle, .org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg rect, .org-icon-tint-${id.replace(/[^\w-]/g, '_')} svg polygon { fill: ${tint}; stroke: ${tint}; }`}</style>
        <div className={`org-icon-tint-${id.replace(/[^\w-]/g, '_')}`} style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </>
  )
}

// ============ Image Node (PNG / JPG / WEBP / GIF) ============
interface ImageNodeData {
  url: string
  nome?: string
  rotacao?: number
  opacidade?: number
  raio?: number
  onEdit?: (id: string) => void
  onResize?: (id: string, w: number, h: number) => void
}
function ImageNode({ id, data, selected }: NodeProps<ImageNodeData>) {
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={32}
        minHeight={32}
        keepAspectRatio
        onResizeEnd={(_, params) => data.onResize?.(id, params.width, params.height)}
        lineStyle={{ borderColor: '#3b82f6' }}
        handleStyle={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <div
        onDoubleClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
        style={{
          width: '100%',
          height: '100%',
          transform: `rotate(${data.rotacao || 0}deg)`,
          opacity: data.opacidade ?? 1,
          borderRadius: data.raio ?? 0,
          overflow: 'hidden',
          outline: selected ? '1px dashed #3b82f6' : 'none',
          background: data.url ? 'transparent' : 'hsl(var(--muted))',
          cursor: 'move',
          boxSizing: 'border-box',
        }}
        title={data.nome ? `${data.nome} · duplo clique p/ editar` : 'Duplo clique p/ editar'}
      >
        {data.url ? (
          <img
            src={data.url}
            alt={data.nome || 'imagem'}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            <i className="fas fa-image" style={{ marginRight: 6 }} /> Carregando...
          </div>
        )}
      </div>
    </>
  )
}

const nodeTypes = { company: CompanyNode, freetext: TextNode, shape: ShapeNode, icon: IconNode, image: ImageNode }

// ============ Editor ============
function OrgChartEditor() {
  const { toast, setPage } = useApp() as ReturnType<typeof useApp> & { setPage: (p: PageKey) => void }
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [addEmpresaModal, setAddEmpresaModal] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null)
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; kind: string } | null>(null)
  const dirtyRef = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const signedUrlCache = useRef<Map<string, { url: string; exp: number }>>(new Map())
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow()

  // Identifies node kinds via prefix in id
  // company:<dbId>  text:<dbId>  shape:<dbId>
  const parseId = (id: string) => {
    const [kind, dbId] = id.split(':')
    return { kind, dbId: Number(dbId) }
  }

  // Signed URL helper for org-images bucket (cached, refreshes before expiry)
  const getSignedUrl = useCallback(async (path: string): Promise<string> => {
    const cached = signedUrlCache.current.get(path)
    const now = Date.now()
    if (cached && cached.exp > now + 30_000) return cached.url
    const { data, error } = await supabase.storage.from('org-images').createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) { console.error('signedUrl', error); return '' }
    signedUrlCache.current.set(path, { url: data.signedUrl, exp: now + 3600 * 1000 })
    return data.signedUrl
  }, [])

  // ============ Load ============
  const loadAll = useCallback(async () => {
    setLoading(true)
    const [emps, n, e, txs, shs, ics, imgs] = await Promise.all([
      db.empresas.toArray(),
      db.orgNodes.toArray(),
      db.orgEdges.toArray(),
      db.orgTextsCanvas.toArray(),
      db.orgShapes.toArray(),
      db.orgIcons.toArray(),
      db.orgImages.toArray(),
    ])
    setEmpresas(emps)

    const empMap = new Map(emps.map(x => [x.id!, x]))

    const companyNodes: Node[] = n.map(node => {
      const emp = node.empresaId ? empMap.get(node.empresaId) : undefined
      return {
        id: `company:${node.id}`,
        type: 'company',
        position: { x: Number(node.posX) || 0, y: Number(node.posY) || 0 },
        zIndex: node.zIndex || 0,
        data: {
          label: emp?.nome || node.nome || 'Bloco livre',
          cargo: node.cargo,
          cnpj: emp?.cnpj,
          ein: emp?.ein,
          pais: emp?.pais,
          empresaId: node.empresaId ?? null,
          livre: !!node.livre,
          icon: node.icon || 'empresa',
          corBorda: node.corBorda,
          corFundo: node.corFundo,
          espessuraBorda: node.espessuraBorda,
          estiloBorda: node.estiloBorda,
        },
      }
    })

    const textNodes: Node[] = txs.map(t => ({
      id: `text:${t.id}`,
      type: 'freetext',
      position: { x: Number(t.posX) || 0, y: Number(t.posY) || 0 },
      zIndex: t.zIndex || 0,
      data: {
        conteudo: t.conteudo,
        fonte: t.fonte,
        tamanho: t.tamanho,
        cor: t.cor,
        alinhamento: (t.alinhamento || 'left') as 'left' | 'center' | 'right',
        negrito: t.negrito,
        italico: t.italico,
        largura: t.largura,
      },
    }))

    const shapeNodes: Node[] = shs.map(s => ({
      id: `shape:${s.id}`,
      type: 'shape',
      position: { x: Number(s.posX) || 0, y: Number(s.posY) || 0 },
      style: { width: Number(s.largura) || 300, height: Number(s.altura) || 200 },
      zIndex: s.zIndex ?? -1,
      data: {
        rotulo: s.rotulo,
        corBorda: s.corBorda,
        corFundo: s.corFundo,
        espessuraBorda: s.espessuraBorda,
        estiloBorda: s.estiloBorda,
        raio: s.raio,
        opacidade: s.opacidade,
      },
    }))

    const iconNodes: Node[] = ics.map(ic => ({
      id: `icon:${ic.id}`,
      type: 'icon',
      position: { x: Number(ic.posX) || 0, y: Number(ic.posY) || 0 },
      style: { width: Number(ic.largura) || 64, height: Number(ic.altura) || 64 },
      zIndex: ic.zIndex || 1,
      data: {
        svgContent: ic.svgContent,
        cor: ic.cor || '#0f172a',
        rotacao: Number(ic.rotacao) || 0,
        nome: ic.nome,
      },
    }))

    // Resolve signed URLs for images in parallel
    const imageNodes: Node[] = await Promise.all(imgs.map(async (im) => {
      const url = im.arquivoPath ? await getSignedUrl(im.arquivoPath) : ''
      return {
        id: `image:${im.id}`,
        type: 'image',
        position: { x: Number(im.posX) || 0, y: Number(im.posY) || 0 },
        style: { width: Number(im.largura) || 160, height: Number(im.altura) || 160 },
        zIndex: im.zIndex || 1,
        data: {
          url,
          nome: im.nome,
          rotacao: Number(im.rotacao) || 0,
          opacidade: im.opacidade ?? 1,
          raio: im.raio ?? 0,
        },
      } as Node
    }))

    const flowEdges: Edge[] = e.map(ed => ({
      id: `edge:${ed.id}`,
      source: `company:${ed.sourceId}`,
      target: `company:${ed.targetId}`,
      label: ed.label,
      style: {
        stroke: ed.cor || '#94a3b8',
        strokeWidth: ed.espessura || 2,
        strokeDasharray: ed.estilo === 'dashed' ? '6 4' : ed.estilo === 'dotted' ? '2 3' : undefined,
      },
      data: { cor: ed.cor || '#94a3b8', espessura: ed.espessura || 2, estilo: ed.estilo || 'solid' },
    }))

    setNodes([...shapeNodes, ...companyNodes, ...imageNodes, ...iconNodes, ...textNodes])
    setEdges(flowEdges)
    setLoading(false)
  }, [setNodes, setEdges, getSignedUrl])

  useEffect(() => { loadAll() }, [loadAll])

  // ============ Wire callbacks ============
  const handleOpenEmpresa = useCallback((empresaId: number) => {
    try { localStorage.setItem('open-empresa-id', String(empresaId)) } catch { /* noop */ }
    setPage('companies' as PageKey)
  }, [setPage])

  const handleShapeResize = useCallback((id: string, w: number, h: number) => {
    const { dbId } = parseId(id)
    db.orgShapes.update(dbId, { largura: w, altura: h }).catch(console.error)
  }, [])

  const handleIconResize = useCallback((id: string, w: number, h: number) => {
    const { dbId } = parseId(id)
    db.orgIcons.update(dbId, { largura: w, altura: h }).catch(console.error)
  }, [])

  const handleImageResize = useCallback((id: string, w: number, h: number) => {
    const { dbId } = parseId(id)
    db.orgImages.update(dbId, { largura: w, altura: h }).catch(console.error)
  }, [])

  useEffect(() => {
    setNodes(curr => curr.map(n => {
      if (n.type === 'company') {
        return { ...n, data: { ...n.data, onOpenEmpresa: handleOpenEmpresa, onEdit: (nid: string) => setEditNodeId(nid) } }
      }
      if (n.type === 'freetext') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid) } }
      if (n.type === 'shape') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleShapeResize } }
      if (n.type === 'icon') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleIconResize } }
      if (n.type === 'image') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleImageResize } }
      return n
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleOpenEmpresa, handleShapeResize, handleIconResize, handleImageResize])

  // ============ Auto-save positions ============
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      try {
        await Promise.all(nodes.map(n => {
          const { kind, dbId } = parseId(n.id)
          if (kind === 'company') return db.orgNodes.update(dbId, { posX: n.position.x, posY: n.position.y })
          if (kind === 'text') return db.orgTextsCanvas.update(dbId, { posX: n.position.x, posY: n.position.y })
          if (kind === 'shape') return db.orgShapes.update(dbId, { posX: n.position.x, posY: n.position.y })
          if (kind === 'icon') return db.orgIcons.update(dbId, { posX: n.position.x, posY: n.position.y })
          if (kind === 'image') return db.orgImages.update(dbId, { posX: n.position.x, posY: n.position.y })
          return Promise.resolve()
        }))
      } catch (err) { console.error('autosave', err) }
    }, 600)
  }, [nodes])

  const wrappedNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    if (changes.some(c => (c.type === 'position' && !c.dragging) || c.type === 'dimensions')) {
      scheduleSave()
    }
  }, [onNodesChange, scheduleSave])

  const wrappedEdgesChange = useCallback((changes: EdgeChange[]) => { onEdgesChange(changes) }, [onEdgesChange])

  // ============ Add elements ============
  async function handleAddEmpresa() {
    if (!selectedEmpresaId) { toast('Selecione uma empresa', 'error'); return }
    const emp = empresas.find(e => e.id === selectedEmpresaId)
    if (!emp) return
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    try {
      const id = await db.orgNodes.add({
        empresaId: selectedEmpresaId, nome: emp.nome, cargo: '',
        posX: pos.x, posY: pos.y,
        icon: 'empresa', corBorda: '#3b82f6', corFundo: '#ffffff',
        espessuraBorda: 2, estiloBorda: 'solid', livre: false,
      } as OrgNode)
      setNodes(curr => [...curr, {
        id: `company:${id}`, type: 'company', position: pos,
        data: {
          label: emp.nome, cnpj: emp.cnpj, ein: emp.ein, pais: emp.pais,
          empresaId: emp.id!, icon: 'empresa', corBorda: '#3b82f6', corFundo: '#ffffff',
          espessuraBorda: 2, estiloBorda: 'solid',
          onOpenEmpresa: handleOpenEmpresa, onEdit: (nid: string) => setEditNodeId(nid),
        },
      }])
      setAddEmpresaModal(false); setSelectedEmpresaId(null)
      toast('Bloco adicionado', 'success')
    } catch (err) { console.error(err); toast('Erro ao adicionar', 'error') }
  }

  async function handleAddFreeBlock() {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    try {
      const id = await db.orgNodes.add({
        empresaId: null, nome: 'Bloco livre', cargo: '',
        posX: pos.x, posY: pos.y, icon: 'empresa',
        corBorda: '#64748b', corFundo: '#ffffff',
        espessuraBorda: 2, estiloBorda: 'solid', livre: true,
      } as OrgNode)
      setNodes(curr => [...curr, {
        id: `company:${id}`, type: 'company', position: pos,
        data: {
          label: 'Bloco livre', empresaId: null, livre: true, icon: 'empresa',
          corBorda: '#64748b', corFundo: '#ffffff', espessuraBorda: 2, estiloBorda: 'solid',
          onOpenEmpresa: handleOpenEmpresa, onEdit: (nid: string) => setEditNodeId(nid),
        },
      }])
      toast('Bloco livre adicionado', 'success')
    } catch (err) { console.error(err); toast('Erro ao adicionar', 'error') }
  }

  async function handleAddText() {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    try {
      const id = await db.orgTextsCanvas.add({
        conteudo: 'Novo texto', posX: pos.x, posY: pos.y,
        tamanho: 14, cor: '#0f172a', alinhamento: 'left', negrito: false, italico: false,
      } as OrgTextCanvas)
      setNodes(curr => [...curr, {
        id: `text:${id}`, type: 'freetext', position: pos,
        data: {
          conteudo: 'Novo texto', tamanho: 14, cor: '#0f172a', alinhamento: 'left',
          negrito: false, italico: false,
          onEdit: (nid: string) => setEditNodeId(nid),
        },
      }])
      toast('Texto adicionado · duplo clique para editar', 'success')
    } catch (err) { console.error(err); toast('Erro ao adicionar texto', 'error') }
  }

  async function handleAddShape() {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    try {
      const id = await db.orgShapes.add({
        posX: pos.x, posY: pos.y, largura: 320, altura: 200,
        corBorda: '#94a3b8', corFundo: 'transparent',
        espessuraBorda: 2, estiloBorda: 'dashed', raio: 12, opacidade: 1, zIndex: -1,
        rotulo: 'Grupo',
      } as OrgShape)
      setNodes(curr => [{
        id: `shape:${id}`, type: 'shape', position: pos,
        style: { width: 320, height: 200 }, zIndex: -1,
        data: {
          rotulo: 'Grupo', corBorda: '#94a3b8', corFundo: 'transparent',
          espessuraBorda: 2, estiloBorda: 'dashed', raio: 12, opacidade: 1,
          onEdit: (nid: string) => setEditNodeId(nid), onResize: handleShapeResize,
        },
      }, ...curr])
      toast('Caixa adicionada · duplo clique para editar', 'success')
    } catch (err) { console.error(err); toast('Erro ao adicionar caixa', 'error') }
  }

  async function handleAddIconFromFile(file: File) {
    const text = await file.text()
    if (!text.trim().toLowerCase().includes('<svg')) {
      toast('Arquivo inválido: selecione um SVG', 'error'); return
    }
    if (text.length > 200000) {
      toast('SVG muito grande (>200KB)', 'error'); return
    }
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    try {
      const id = await db.orgIcons.add({
        nome: file.name.replace(/\.svg$/i, ''), svgContent: text,
        posX: pos.x, posY: pos.y, largura: 80, altura: 80,
        cor: '#0f172a', rotacao: 0, zIndex: 1,
      } as OrgIcon)
      setNodes(curr => [...curr, {
        id: `icon:${id}`, type: 'icon', position: pos,
        style: { width: 80, height: 80 }, zIndex: 1,
        data: {
          svgContent: text, cor: '#0f172a', rotacao: 0, nome: file.name,
          onEdit: (nid: string) => setEditNodeId(nid), onResize: handleIconResize,
        },
      }])
      toast('Ícone adicionado · duplo clique para editar', 'success')
    } catch (err) { console.error(err); toast('Erro ao adicionar ícone', 'error') }
  }

  async function handleAddImageFromFile(file: File) {
    const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!ALLOWED.includes(file.type)) {
      toast('Formato inválido (PNG, JPG, WEBP ou GIF)', 'error'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Imagem muito grande (máx 5MB)', 'error'); return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('Sessão expirada', 'error'); return }
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const up = await supabase.storage.from('org-images').upload(path, file, {
        contentType: file.type, upsert: false,
      })
      if (up.error) throw up.error

      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image()
        const objUrl = URL.createObjectURL(file)
        img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(objUrl) }
        img.onerror = () => { resolve({ w: 200, h: 200 }); URL.revokeObjectURL(objUrl) }
        img.src = objUrl
      })
      const maxSide = 220
      const ratio = dims.w / dims.h
      const w = ratio >= 1 ? maxSide : Math.round(maxSide * ratio)
      const h = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide

      const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      const id = await db.orgImages.add({
        nome: file.name, arquivoPath: path,
        posX: pos.x, posY: pos.y, largura: w, altura: h,
        rotacao: 0, opacidade: 1, raio: 0, zIndex: 1,
      } as OrgImage)
      const signedUrl = await getSignedUrl(path)
      setNodes(curr => [...curr, {
        id: `image:${id}`, type: 'image', position: pos,
        style: { width: w, height: h }, zIndex: 1,
        data: {
          url: signedUrl, nome: file.name, rotacao: 0, opacidade: 1, raio: 0,
          onEdit: (nid: string) => setEditNodeId(nid), onResize: handleImageResize,
        },
      }])
      toast('Imagem adicionada · duplo clique para editar', 'success')
    } catch (err) { console.error(err); toast('Erro ao enviar imagem', 'error') }
  }

  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return
    const src = parseId(conn.source); const tgt = parseId(conn.target)
    if (src.kind !== 'company' || tgt.kind !== 'company') {
      toast('Conexões só entre blocos de empresa/livre', 'info'); return
    }
    try {
      const id = await db.orgEdges.add({
        sourceId: src.dbId, targetId: tgt.dbId, cor: '#94a3b8', espessura: 2, estilo: 'solid',
      } as OrgEdge)
      setEdges(curr => addEdge({
        ...conn, id: `edge:${id}`,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        data: { cor: '#94a3b8', espessura: 2, estilo: 'solid' },
      }, curr))
    } catch (err) { console.error(err); toast('Erro ao conectar', 'error') }
  }, [setEdges, toast])

  // ============ Delete / duplicate / layer ============
  const deleteByNode = async (n: Node) => {
    const { kind, dbId } = parseId(n.id)
    if (kind === 'company') await db.orgNodes.delete(dbId)
    else if (kind === 'text') await db.orgTextsCanvas.delete(dbId)
    else if (kind === 'shape') await db.orgShapes.delete(dbId)
    else if (kind === 'icon') await db.orgIcons.delete(dbId)
    else if (kind === 'image') {
      const rec = await db.orgImages.get(dbId)
      if (rec?.arquivoPath) {
        await supabase.storage.from('org-images').remove([rec.arquivoPath]).catch(console.error)
      }
      await db.orgImages.delete(dbId)
    }
  }

  const deleteSelection = useCallback(async () => {
    const selN = nodes.filter(n => n.selected)
    const selE = edges.filter(e => e.selected)
    if (selN.length === 0 && selE.length === 0) { toast('Selecione algo para excluir', 'info'); return }
    try {
      for (const n of selN) await deleteByNode(n)
      for (const ed of selE) await db.orgEdges.delete(parseId(ed.id).dbId)
      setNodes(c => c.filter(n => !n.selected))
      setEdges(c => c.filter(e => !e.selected))
      toast(`${selN.length + selE.length} item(ns) removido(s)`, 'success')
    } catch (err) { console.error(err); toast('Erro ao excluir', 'error') }
  }, [nodes, edges, setNodes, setEdges, toast])

  const duplicateSelection = useCallback(async () => {
    const selN = nodes.filter(n => n.selected)
    if (selN.length === 0) { toast('Selecione um bloco para duplicar', 'info'); return }
    try {
      for (const n of selN) {
        const { kind } = parseId(n.id)
        const newPos = { x: n.position.x + 40, y: n.position.y + 40 }
        if (kind === 'company') {
          const d = n.data as CompanyNodeData
          const id = await db.orgNodes.add({
            empresaId: d.empresaId ?? null, nome: d.label, cargo: d.cargo || '',
            posX: newPos.x, posY: newPos.y, icon: d.icon,
            corBorda: d.corBorda, corFundo: d.corFundo,
            espessuraBorda: d.espessuraBorda, estiloBorda: d.estiloBorda, livre: !d.empresaId,
          } as OrgNode)
          setNodes(c => [...c, { ...n, id: `company:${id}`, position: newPos, selected: false, data: { ...d } }])
        } else if (kind === 'text') {
          const d = n.data as TextNodeData
          const id = await db.orgTextsCanvas.add({
            conteudo: d.conteudo, posX: newPos.x, posY: newPos.y,
            fonte: d.fonte, tamanho: d.tamanho, cor: d.cor, alinhamento: d.alinhamento,
            negrito: d.negrito, italico: d.italico, largura: d.largura,
          } as OrgTextCanvas)
          setNodes(c => [...c, { ...n, id: `text:${id}`, position: newPos, selected: false, data: { ...d } }])
        } else if (kind === 'shape') {
          const d = n.data as ShapeNodeData
          const w = (n.style?.width as number) || 320; const h = (n.style?.height as number) || 200
          const id = await db.orgShapes.add({
            posX: newPos.x, posY: newPos.y, largura: w, altura: h,
            corBorda: d.corBorda, corFundo: d.corFundo, espessuraBorda: d.espessuraBorda,
            estiloBorda: d.estiloBorda, raio: d.raio, opacidade: d.opacidade, rotulo: d.rotulo,
          } as OrgShape)
          setNodes(c => [...c, { ...n, id: `shape:${id}`, position: newPos, selected: false, style: { width: w, height: h }, data: { ...d } }])
        } else if (kind === 'icon') {
          const d = n.data as IconNodeData
          const w = (n.style?.width as number) || 80; const h = (n.style?.height as number) || 80
          const id = await db.orgIcons.add({
            posX: newPos.x, posY: newPos.y, largura: w, altura: h,
            svgContent: d.svgContent, cor: d.cor, rotacao: d.rotacao, nome: d.nome,
          } as OrgIcon)
          setNodes(c => [...c, { ...n, id: `icon:${id}`, position: newPos, selected: false, style: { width: w, height: h }, data: { ...d } }])
        }
      }
      toast(`${selN.length} duplicado(s)`, 'success')
    } catch (err) { console.error(err); toast('Erro ao duplicar', 'error') }
  }, [nodes, setNodes, toast])

  const changeLayer = useCallback((dir: 'front' | 'back') => {
    const sel = nodes.filter(n => n.selected)
    if (sel.length === 0) { toast('Selecione um elemento', 'info'); return }
    const allZ = nodes.map(n => n.zIndex || 0)
    const target = dir === 'front' ? Math.max(...allZ, 0) + 1 : Math.min(...allZ, 0) - 1
    setNodes(curr => curr.map(n => n.selected ? { ...n, zIndex: target } : n))
    sel.forEach(n => {
      const { kind, dbId } = parseId(n.id)
      const tbl = kind === 'company' ? db.orgNodes
        : kind === 'text' ? db.orgTextsCanvas
        : kind === 'icon' ? db.orgIcons
        : db.orgShapes
      tbl.update(dbId, { zIndex: target } as never).catch(console.error)
    })
  }, [nodes, setNodes, toast])

  // ============ Keyboard shortcuts ============
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (nodes.some(n => n.selected) || edges.some(ed => ed.selected)) { e.preventDefault(); deleteSelection() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (nodes.some(n => n.selected)) { e.preventDefault(); duplicateSelection() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nodes, edges, deleteSelection, duplicateSelection])

  // ============ Edit modal ============
  const editNode = useMemo(() => nodes.find(n => n.id === editNodeId), [nodes, editNodeId])

  async function saveCompanyEdit(patch: Partial<CompanyNodeData> & { label?: string }) {
    if (!editNodeId) return
    const { dbId } = parseId(editNodeId)
    try {
      await db.orgNodes.update(dbId, {
        nome: patch.label, cargo: patch.cargo, icon: patch.icon,
        corBorda: patch.corBorda, corFundo: patch.corFundo,
        espessuraBorda: patch.espessuraBorda, estiloBorda: patch.estiloBorda,
      } as Partial<OrgNode>)
      setNodes(c => c.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null); toast('Bloco atualizado', 'success')
    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
  }

  async function saveTextEdit(patch: Partial<TextNodeData>) {
    if (!editNodeId) return
    const { dbId } = parseId(editNodeId)
    try {
      await db.orgTextsCanvas.update(dbId, patch as Partial<OrgTextCanvas>)
      setNodes(c => c.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null); toast('Texto atualizado', 'success')
    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
  }

  async function saveShapeEdit(patch: Partial<ShapeNodeData>) {
    if (!editNodeId) return
    const { dbId } = parseId(editNodeId)
    try {
      await db.orgShapes.update(dbId, patch as Partial<OrgShape>)
      setNodes(c => c.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null); toast('Caixa atualizada', 'success')
    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
  }

  async function saveIconEdit(patch: Partial<IconNodeData>) {
    if (!editNodeId) return
    const { dbId } = parseId(editNodeId)
    try {
      await db.orgIcons.update(dbId, patch as Partial<OrgIcon>)
      setNodes(c => c.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null); toast('Ícone atualizado', 'success')
    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Organograma Societário</div>
          <div className="page-header-sub">Arraste · Conecte das bordas · Delete remove · Ctrl+D duplica · Duplo clique edita textos/caixas</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setAddEmpresaModal(true)} title="Adicionar bloco de empresa cadastrada">
            <i className="fas fa-plus" /> Empresa
          </button>
          <button className="btn btn-secondary" onClick={handleAddFreeBlock} title="Adicionar bloco sem vínculo (livre)">
            <i className="fas fa-square" /> Bloco livre
          </button>
          <button className="btn btn-secondary" onClick={handleAddText} title="Adicionar texto solto no canvas">
            <i className="fas fa-font" /> Texto
          </button>
          <button className="btn btn-secondary" onClick={handleAddShape} title="Adicionar caixa/borda para agrupar">
            <i className="fas fa-vector-square" /> Caixa
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Adicionar ícone SVG (upload)">
            <i className="fas fa-icons" /> Ícone SVG
          </button>
          <input
            ref={fileInputRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }}
            onChange={async (ev) => {
              const f = ev.target.files?.[0]; if (f) await handleAddIconFromFile(f)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          />
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button className="btn btn-secondary" onClick={() => { const sel = nodes.find(n => n.selected); if (!sel) { toast('Selecione um elemento', 'info'); return } setEditNodeId(sel.id) }} title="Editar elemento selecionado">
            <i className="fas fa-pen" /> Editar
          </button>
          <button className="btn btn-secondary" onClick={duplicateSelection} title="Duplicar (Ctrl+D)">
            <i className="fas fa-clone" /> Duplicar
          </button>
          <button className="btn btn-danger" onClick={deleteSelection} title="Excluir (Delete)">
            <i className="fas fa-trash" /> Excluir
          </button>
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button className="btn btn-secondary" onClick={() => changeLayer('front')} title="Trazer para frente">
            <i className="fas fa-arrow-up" />
          </button>
          <button className="btn btn-secondary" onClick={() => changeLayer('back')} title="Enviar para trás">
            <i className="fas fa-arrow-down" />
          </button>
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button className="btn btn-secondary" onClick={() => zoomIn({ duration: 200 })} title="Zoom in"><i className="fas fa-magnifying-glass-plus" /></button>
          <button className="btn btn-secondary" onClick={() => zoomOut({ duration: 200 })} title="Zoom out"><i className="fas fa-magnifying-glass-minus" /></button>
          <button className="btn btn-secondary" onClick={() => fitView({ padding: 0.2, duration: 300 })} title="Ajustar"><i className="fas fa-expand" /></button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 500 }}>
        {loading ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <i className="fas fa-spinner fa-spin" />
            <p>Carregando organograma...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={wrappedNodesChange} onEdgesChange={wrappedEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes} fitView snapToGrid snapGrid={[10, 10]}
            multiSelectionKeyCode={['Meta', 'Shift']} deleteKeyCode={null}
          >
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {addEmpresaModal && (
        <Modal onClose={() => setAddEmpresaModal(false)} title="Adicionar empresa ao organograma">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Empresa cadastrada *</label>
              <select className="form-select" value={selectedEmpresaId || ''} onChange={e => setSelectedEmpresaId(Number(e.target.value) || null)}>
                <option value="">— Selecione —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome} {e.cnpj ? `· ${e.cnpj}` : e.ein ? `· ${e.ein}` : ''}</option>
                ))}
              </select>
              {empresas.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  Nenhuma empresa cadastrada. Cadastre uma em <strong>Empresas</strong> primeiro, ou use <strong>Bloco livre</strong>.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setAddEmpresaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddEmpresa} disabled={!selectedEmpresaId}>Adicionar</button>
            </div>
          </div>
        </Modal>
      )}

      {editNode && editNode.type === 'company' && (
        <EditCompanyModal node={editNode as Node<CompanyNodeData>} onClose={() => setEditNodeId(null)} onSave={saveCompanyEdit}
          onDelete={() => setConfirmDelete({ id: editNode.id, kind: 'company' })} />
      )}
      {editNode && editNode.type === 'freetext' && (
        <EditTextModal node={editNode as Node<TextNodeData>} onClose={() => setEditNodeId(null)} onSave={saveTextEdit}
          onDelete={() => setConfirmDelete({ id: editNode.id, kind: 'text' })} />
      )}
      {editNode && editNode.type === 'shape' && (
        <EditShapeModal node={editNode as Node<ShapeNodeData>} onClose={() => setEditNodeId(null)} onSave={saveShapeEdit}
          onDelete={() => setConfirmDelete({ id: editNode.id, kind: 'shape' })} />
      )}
      {editNode && editNode.type === 'icon' && (
        <EditIconModal node={editNode as Node<IconNodeData>} onClose={() => setEditNodeId(null)} onSave={saveIconEdit}
          onDelete={() => setConfirmDelete({ id: editNode.id, kind: 'icon' })} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          msg="Esta ação removerá o elemento e suas conexões."
          onConfirm={async () => {
            if (!confirmDelete) return
            try {
              const n = nodes.find(x => x.id === confirmDelete.id)
              if (n) await deleteByNode(n)
              setNodes(c => c.filter(n => n.id !== confirmDelete.id))
              setEdges(c => c.filter(e => e.source !== confirmDelete.id && e.target !== confirmDelete.id))
              setEditNodeId(null); toast('Elemento removido', 'success')
            } catch (err) { console.error(err); toast('Erro ao remover', 'error') }
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ============ Edit Modals ============
function EditCompanyModal({ node, onClose, onSave, onDelete }: {
  node: Node<CompanyNodeData>
  onClose: () => void
  onSave: (patch: Partial<CompanyNodeData> & { label?: string }) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(node.data.label || '')
  const [cargo, setCargo] = useState(node.data.cargo || '')
  const [icon, setIcon] = useState(node.data.icon || 'empresa')
  const [corBorda, setCorBorda] = useState(node.data.corBorda || '#3b82f6')
  const [corFundo, setCorFundo] = useState(node.data.corFundo || '#ffffff')
  const [espessura, setEspessura] = useState(node.data.espessuraBorda || 2)
  const [estilo, setEstilo] = useState(node.data.estiloBorda || 'solid')
  const isLivre = !node.data.empresaId

  return (
    <Modal onClose={onClose} title={`Editar ${isLivre ? 'bloco livre' : 'empresa'} · ${node.data.label}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLivre && (
          <div>
            <label className="form-label">Nome do bloco</label>
            <input className="form-input" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        )}
        <div>
          <label className="form-label">Descrição / Cargo</label>
          <input className="form-input" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Holding, 60% de participação..." />
        </div>
        <div>
          <label className="form-label">Ícone</label>
          <select className="form-select" value={icon} onChange={e => setIcon(e.target.value)}>
            <option value="empresa">Empresa</option><option value="holding">Holding</option>
            <option value="pessoa">Pessoa física</option><option value="fundo">Fundo</option>
            <option value="trust">Trust</option><option value="offshore">Offshore</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Cor da borda</label><input type="color" className="form-input" value={corBorda} onChange={e => setCorBorda(e.target.value)} style={{ height: 40 }} /></div>
          <div><label className="form-label">Cor de fundo</label><input type="color" className="form-input" value={corFundo} onChange={e => setCorFundo(e.target.value)} style={{ height: 40 }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Espessura: {espessura}px</label><input type="range" min={1} max={6} value={espessura} onChange={e => setEspessura(Number(e.target.value))} style={{ width: '100%' }} /></div>
          <div><label className="form-label">Estilo</label>
            <select className="form-select" value={estilo} onChange={e => setEstilo(e.target.value)}>
              <option value="solid">Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}><i className="fas fa-trash" /> Remover</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ label: isLivre ? label : undefined, cargo, icon, corBorda, corFundo, espessuraBorda: espessura, estiloBorda: estilo })}>Salvar</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditTextModal({ node, onClose, onSave, onDelete }: {
  node: Node<TextNodeData>
  onClose: () => void
  onSave: (patch: Partial<TextNodeData>) => void
  onDelete: () => void
}) {
  const [conteudo, setConteudo] = useState(node.data.conteudo || '')
  const [tamanho, setTamanho] = useState(node.data.tamanho || 14)
  const [cor, setCor] = useState(node.data.cor || '#0f172a')
  const [alinhamento, setAlinhamento] = useState<'left' | 'center' | 'right'>(node.data.alinhamento || 'left')
  const [negrito, setNegrito] = useState(!!node.data.negrito)
  const [italico, setItalico] = useState(!!node.data.italico)
  const [fonte, setFonte] = useState(node.data.fonte || 'inherit')
  const [largura, setLargura] = useState(node.data.largura || 200)

  return (
    <Modal onClose={onClose} title="Editar texto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="form-label">Conteúdo</label>
          <textarea className="form-input" value={conteudo} onChange={e => setConteudo(e.target.value)} rows={4} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Fonte</label>
            <select className="form-select" value={fonte} onChange={e => setFonte(e.target.value)}>
              <option value="inherit">Padrão</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier</option>
              <option value="'Times New Roman', serif">Times</option>
            </select>
          </div>
          <div><label className="form-label">Tamanho: {tamanho}px</label><input type="range" min={10} max={48} value={tamanho} onChange={e => setTamanho(Number(e.target.value))} style={{ width: '100%' }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Cor</label><input type="color" className="form-input" value={cor} onChange={e => setCor(e.target.value)} style={{ height: 40 }} /></div>
          <div><label className="form-label">Largura: {largura}px</label><input type="range" min={80} max={600} value={largura} onChange={e => setLargura(Number(e.target.value))} style={{ width: '100%' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${alinhamento === 'left' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAlinhamento('left')}><i className="fas fa-align-left" /></button>
          <button className={`btn ${alinhamento === 'center' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAlinhamento('center')}><i className="fas fa-align-center" /></button>
          <button className={`btn ${alinhamento === 'right' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAlinhamento('right')}><i className="fas fa-align-right" /></button>
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button className={`btn ${negrito ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setNegrito(!negrito)}><i className="fas fa-bold" /></button>
          <button className={`btn ${italico ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setItalico(!italico)}><i className="fas fa-italic" /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}><i className="fas fa-trash" /> Remover</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ conteudo, tamanho, cor, alinhamento, negrito, italico, fonte, largura })}>Salvar</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditShapeModal({ node, onClose, onSave, onDelete }: {
  node: Node<ShapeNodeData>
  onClose: () => void
  onSave: (patch: Partial<ShapeNodeData>) => void
  onDelete: () => void
}) {
  const [rotulo, setRotulo] = useState(node.data.rotulo || '')
  const [corBorda, setCorBorda] = useState(node.data.corBorda || '#94a3b8')
  const [fundoTransparente, setFundoTransparente] = useState((node.data.corFundo || 'transparent') === 'transparent')
  const [corFundo, setCorFundo] = useState(node.data.corFundo === 'transparent' ? '#f1f5f9' : (node.data.corFundo || '#f1f5f9'))
  const [espessura, setEspessura] = useState(node.data.espessuraBorda || 2)
  const [estilo, setEstilo] = useState(node.data.estiloBorda || 'dashed')
  const [raio, setRaio] = useState(node.data.raio ?? 12)
  const [opacidade, setOpacidade] = useState(node.data.opacidade ?? 1)

  return (
    <Modal onClose={onClose} title="Editar caixa">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="form-label">Rótulo (opcional)</label>
          <input className="form-input" value={rotulo} onChange={e => setRotulo(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Cor da borda</label><input type="color" className="form-input" value={corBorda} onChange={e => setCorBorda(e.target.value)} style={{ height: 40 }} /></div>
          <div>
            <label className="form-label">Cor de fundo</label>
            <input type="color" className="form-input" value={corFundo} onChange={e => setCorFundo(e.target.value)} disabled={fundoTransparente} style={{ height: 40 }} />
            <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
              <input type="checkbox" checked={fundoTransparente} onChange={e => setFundoTransparente(e.target.checked)} />
              Transparente
            </label>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Espessura: {espessura}px</label><input type="range" min={1} max={8} value={espessura} onChange={e => setEspessura(Number(e.target.value))} style={{ width: '100%' }} /></div>
          <div><label className="form-label">Estilo</label>
            <select className="form-select" value={estilo} onChange={e => setEstilo(e.target.value)}>
              <option value="solid">Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Raio: {raio}px</label><input type="range" min={0} max={40} value={raio} onChange={e => setRaio(Number(e.target.value))} style={{ width: '100%' }} /></div>
          <div><label className="form-label">Opacidade: {Math.round(opacidade * 100)}%</label><input type="range" min={10} max={100} value={Math.round(opacidade * 100)} onChange={e => setOpacidade(Number(e.target.value) / 100)} style={{ width: '100%' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}><i className="fas fa-trash" /> Remover</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ rotulo, corBorda, corFundo: fundoTransparente ? 'transparent' : corFundo, espessuraBorda: espessura, estiloBorda: estilo, raio, opacidade })}>Salvar</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditIconModal({ node, onClose, onSave, onDelete }: {
  node: Node<IconNodeData>
  onClose: () => void
  onSave: (patch: Partial<IconNodeData>) => void
  onDelete: () => void
}) {
  const [cor, setCor] = useState(node.data.cor || '#0f172a')
  const [rotacao, setRotacao] = useState(node.data.rotacao || 0)
  const [nome, setNome] = useState(node.data.nome || '')
  const previewSvg = (node.data.svgContent || '').replace(/<svg([^>]*)>/i, (_m, a) => `<svg${String(a).replace(/\swidth="[^"]*"/i,'').replace(/\sheight="[^"]*"/i,'')} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`)
  return (
    <Modal onClose={onClose} title="Editar ícone SVG">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12, background: 'hsl(var(--muted))', borderRadius: 8 }}>
          <div style={{ width: 80, height: 80, color: cor, transform: `rotate(${rotacao}deg)` }}>
            <style>{`.org-icon-preview svg, .org-icon-preview svg path, .org-icon-preview svg g, .org-icon-preview svg circle, .org-icon-preview svg rect, .org-icon-preview svg polygon { fill: ${cor}; stroke: ${cor}; }`}</style>
            <div className="org-icon-preview" style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
          </div>
        </div>
        <div>
          <label className="form-label">Nome</label>
          <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Cor</label>
            <input type="color" className="form-input" value={cor} onChange={e => setCor(e.target.value)} style={{ height: 40 }} />
          </div>
          <div>
            <label className="form-label">Rotação: {rotacao}°</label>
            <input type="range" min={0} max={360} value={rotacao} onChange={e => setRotacao(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Dica: arraste os cantos do ícone no canvas para redimensionar (mantém proporção).
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}><i className="fas fa-trash" /> Remover</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ cor, rotacao, nome })}>Salvar</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChartEditor />
    </ReactFlowProvider>
  )
}
