import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  NodeResizer,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeChange,
  type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import DOMPurify from 'dompurify'
import { useApp } from '@/context/AppContext'

// Sanitize SVG content to prevent XSS via event handlers like onload, onclick, etc.
function sanitizeSvg(raw: string): string {
  if (!raw) return ''
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
  })
}
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
  onResize?: (id: string, w: number, h: number) => void
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
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: selected ? '0 0 0 2px hsl(var(--ring))' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={70}
        onResizeEnd={(_, params) => data.onResize?.(id, params.width, params.height)}
        lineStyle={{ borderColor: borda }}
        handleStyle={{ background: borda, width: 8, height: 8 }}
      />
      {/* Handles em todos os lados — cada um funciona como source E target */}
      {(['top','bottom','left','right'] as const).map(side => {
        const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right
        return (
          <div key={side}>
            <Handle id={`${side}-s`} type="source" position={pos} style={{ background: borda, width: 10, height: 10 }} />
            <Handle id={`${side}-t`} type="target" position={pos} style={{ background: borda, width: 10, height: 10, opacity: 0 }} />
          </div>
        )
      })}
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
    <>
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
      {(['top','bottom','left','right'] as const).map(side => {
        const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right
        return (
          <div key={side}>
            <Handle id={`${side}-s`} type="source" position={pos} style={{ background: '#3b82f6', width: 8, height: 8 }} />
            <Handle id={`${side}-t`} type="target" position={pos} style={{ background: '#3b82f6', width: 8, height: 8, opacity: 0 }} />
          </div>
        )
      })}
    </>
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
      {/* Handles em todos os lados — permite conectar linhas à caixa */}
      {(['top','bottom','left','right'] as const).map(side => {
        const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right
        const borda = data.corBorda || '#94a3b8'
        return (
          <div key={side}>
            <Handle id={`${side}-s`} type="source" position={pos} style={{ background: borda, width: 10, height: 10 }} />
            <Handle id={`${side}-t`} type="target" position={pos} style={{ background: borda, width: 10, height: 10, opacity: 0 }} />
          </div>
        )
      })}
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
    return sanitizeSvg(s)
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
      {(['top','bottom','left','right'] as const).map(side => {
        const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right
        return (
          <div key={side}>
            <Handle id={`${side}-s`} type="source" position={pos} style={{ background: tint, width: 8, height: 8 }} />
            <Handle id={`${side}-t`} type="target" position={pos} style={{ background: tint, width: 8, height: 8, opacity: 0 }} />
          </div>
        )
      })}
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
      {(['top','bottom','left','right'] as const).map(side => {
        const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right
        return (
          <div key={side}>
            <Handle id={`${side}-s`} type="source" position={pos} style={{ background: '#3b82f6', width: 8, height: 8 }} />
            <Handle id={`${side}-t`} type="target" position={pos} style={{ background: '#3b82f6', width: 8, height: 8, opacity: 0 }} />
          </div>
        )
      })}
    </>
  )
}

const nodeTypes = { company: CompanyNode, freetext: TextNode, shape: ShapeNode, icon: IconNode, image: ImageNode }

// Build a ReactFlow Edge from a DB OrgEdge (or partial spec)
function buildEdgeFromDb(ed: {
  id?: number; sourceId?: number; targetId?: number;
  cor?: string; espessura?: number; estilo?: string; label?: string; tipoPonta?: string;
  source?: string; target?: string;
}): Edge {
  const cor = ed.cor || '#94a3b8'
  const espessura = Number(ed.espessura) || 2
  const estilo = ed.estilo || 'solid'
  const tipoPonta = (ed.tipoPonta as 'one' | 'both' | 'none') || 'one'
  const dash = estilo === 'dashed' ? '6 4' : estilo === 'dotted' ? '2 3' : undefined
  const arrow = { type: MarkerType.ArrowClosed, color: cor, width: 18, height: 18 }
  return {
    id: `edge:${ed.id}`,
    source: ed.source || `company:${ed.sourceId}`,
    target: ed.target || `company:${ed.targetId}`,
    type: 'smoothstep',
    label: ed.label,
    labelShowBg: true,
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
    labelBgStyle: { fill: '#ffffff', stroke: cor, strokeWidth: 1, fillOpacity: 0.95 },
    labelStyle: { fill: '#0f172a', fontWeight: 600, fontSize: 12 },
    style: { stroke: cor, strokeWidth: espessura, strokeDasharray: dash },
    markerEnd: tipoPonta === 'none' ? undefined : arrow,
    markerStart: tipoPonta === 'both' ? arrow : undefined,
    data: { cor, espessura, estilo, tipoPonta, label: ed.label },
  }
}

// ============ Alignment guides overlay (rendered inside ReactFlow) ============
function AlignmentGuides({ guides }: { guides: { v: number[]; h: number[] } }) {
  const { x, y, zoom } = useViewport()
  if (!guides.v.length && !guides.h.length) return null
  return (
    <svg
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 4,
      }}
    >
      {guides.v.map((vx, i) => {
        const sx = vx * zoom + x
        return <line key={`v-${i}`} x1={sx} y1={0} x2={sx} y2="100%" stroke="#ec4899" strokeWidth={1} strokeDasharray="4 3" />
      })}
      {guides.h.map((hy, i) => {
        const sy = hy * zoom + y
        return <line key={`h-${i}`} x1={0} y1={sy} x2="100%" y2={sy} stroke="#ec4899" strokeWidth={1} strokeDasharray="4 3" />
      })}
    </svg>
  )
}

// ============ Editor ============
function OrgChartEditor() {
  const { toast, setPage } = useApp() as ReturnType<typeof useApp> & { setPage: (p: PageKey) => void }
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ id: number; label: string; estilo: string; cor: string; espessura: number; tipoPonta: 'one' | 'both' | 'none' } | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
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
  // UX state
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [showMiniMap, setShowMiniMap] = useState(true)
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] })
  const clipboardRef = useRef<Node[]>([])

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
      const w = Number(node.largura) || undefined
      const h = Number(node.altura) || undefined
      return {
        id: `company:${node.id}`,
        type: 'company',
        position: { x: Number(node.posX) || 0, y: Number(node.posY) || 0 },
        zIndex: node.zIndex || 0,
        ...(w && h ? { style: { width: w, height: h } } : {}),
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

    const flowEdges: Edge[] = e.map(ed => buildEdgeFromDb(ed))

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

  const handleCompanyResize = useCallback((id: string, w: number, h: number) => {
    const { dbId } = parseId(id)
    db.orgNodes.update(dbId, { largura: w, altura: h } as Partial<OrgNode>).catch(console.error)
    setNodes(curr => curr.map(n => n.id === id ? { ...n, style: { ...(n.style || {}), width: w, height: h } } : n))
  }, [setNodes])

  useEffect(() => {
    setNodes(curr => curr.map(n => {
      if (n.type === 'company') {
        return { ...n, data: { ...n.data, onOpenEmpresa: handleOpenEmpresa, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleCompanyResize } }
      }
      if (n.type === 'freetext') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid) } }
      if (n.type === 'shape') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleShapeResize } }
      if (n.type === 'icon') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleIconResize } }
      if (n.type === 'image') return { ...n, data: { ...n.data, onEdit: (nid: string) => setEditNodeId(nid), onResize: handleImageResize } }
      return n
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleOpenEmpresa, handleShapeResize, handleIconResize, handleImageResize, handleCompanyResize])

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
    // Smart alignment: while dragging, snap to nearby nodes' edges/centers
    const SNAP_THRESHOLD = 6
    const dragChanges = changes.filter(c => c.type === 'position' && c.dragging) as Array<NodeChange & { id: string; position?: { x: number; y: number } }>
    if (dragChanges.length > 0) {
      const draggingIds = new Set(dragChanges.map(c => c.id))
      const others = nodes.filter(n => !draggingIds.has(n.id))
      const vGuides: number[] = []
      const hGuides: number[] = []
      const adjusted = dragChanges.map(c => {
        if (!c.position) return c
        const cur = nodes.find(n => n.id === c.id); if (!cur) return c
        const w = (cur.width ?? (cur.style?.width as number) ?? 200)
        const h = (cur.height ?? (cur.style?.height as number) ?? 80)
        let x = c.position.x; let y = c.position.y
        const myEdgesX = [x, x + w / 2, x + w]
        const myEdgesY = [y, y + h / 2, y + h]
        let bestDx = Infinity; let bestX = x; let bestGuideX: number | null = null
        let bestDy = Infinity; let bestY = y; let bestGuideY: number | null = null
        for (const o of others) {
          const ow = (o.width ?? (o.style?.width as number) ?? 200)
          const oh = (o.height ?? (o.style?.height as number) ?? 80)
          const oxs = [o.position.x, o.position.x + ow / 2, o.position.x + ow]
          const oys = [o.position.y, o.position.y + oh / 2, o.position.y + oh]
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const dx = oxs[j] - myEdgesX[i]
              if (Math.abs(dx) < bestDx && Math.abs(dx) < SNAP_THRESHOLD) {
                bestDx = Math.abs(dx); bestX = x + dx; bestGuideX = oxs[j]
              }
              const dy = oys[j] - myEdgesY[i]
              if (Math.abs(dy) < bestDy && Math.abs(dy) < SNAP_THRESHOLD) {
                bestDy = Math.abs(dy); bestY = y + dy; bestGuideY = oys[j]
              }
            }
          }
        }
        if (bestGuideX !== null) vGuides.push(bestGuideX)
        if (bestGuideY !== null) hGuides.push(bestGuideY)
        return { ...c, position: { x: bestX, y: bestY } }
      })
      const otherChanges = changes.filter(c => !(c.type === 'position' && c.dragging))
      onNodesChange([...adjusted, ...otherChanges])
      setGuides({ v: vGuides, h: hGuides })
    } else {
      if (guides.v.length || guides.h.length) setGuides({ v: [], h: [] })
      onNodesChange(changes)
    }
    if (changes.some(c => (c.type === 'position' && !c.dragging) || c.type === 'dimensions')) {
      scheduleSave()
    }
  }, [onNodesChange, scheduleSave, nodes, guides.v.length, guides.h.length])

  const wrappedEdgesChange = useCallback((changes: EdgeChange[]) => { onEdgesChange(changes) }, [onEdgesChange])

  // Edges com destaque ao passar o mouse + roteamento dinâmico (handles mais próximos)
  const displayedEdges = useMemo<Edge[]>(() => {
    const HOVER_COLOR = '#2563eb'
    const nodeMap = new Map<string, Node>()
    nodes.forEach(n => nodeMap.set(n.id, n))

    function pickHandles(srcId: string, tgtId: string): { sourceHandle: string; targetHandle: string } {
      const s = nodeMap.get(srcId); const t = nodeMap.get(tgtId)
      if (!s || !t) return { sourceHandle: 'bottom-s', targetHandle: 'top-t' }
      const sw = (s.width ?? 200); const sh = (s.height ?? 80)
      const tw = (t.width ?? 200); const th = (t.height ?? 80)
      const scx = s.position.x + sw / 2; const scy = s.position.y + sh / 2
      const tcx = t.position.x + tw / 2; const tcy = t.position.y + th / 2
      const dx = tcx - scx; const dy = tcy - scy
      let srcSide: 'top' | 'bottom' | 'left' | 'right'
      let tgtSide: 'top' | 'bottom' | 'left' | 'right'
      if (Math.abs(dx) > Math.abs(dy)) {
        srcSide = dx > 0 ? 'right' : 'left'
        tgtSide = dx > 0 ? 'left' : 'right'
      } else {
        srcSide = dy > 0 ? 'bottom' : 'top'
        tgtSide = dy > 0 ? 'top' : 'bottom'
      }
      return { sourceHandle: `${srcSide}-s`, targetHandle: `${tgtSide}-t` }
    }

    return edges.map(ed => {
      const { sourceHandle, targetHandle } = pickHandles(ed.source, ed.target)
      const routed: Edge = { ...ed, sourceHandle, targetHandle }
      if (routed.id !== hoveredEdgeId) return routed
      const baseStroke = (routed.style?.strokeWidth as number) || 2
      return {
        ...routed,
        zIndex: 10,
        style: { ...routed.style, stroke: HOVER_COLOR, strokeWidth: baseStroke + 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: HOVER_COLOR, width: 20, height: 20 },
        labelBgStyle: { ...(routed.labelBgStyle || {}), stroke: HOVER_COLOR },
        labelStyle: { ...(routed.labelStyle || {}), fill: HOVER_COLOR },
      }
    })
  }, [edges, hoveredEdgeId, nodes])

  // Realça nó de origem no modo Conectar
  const displayedNodes = useMemo<Node[]>(() => {
    if (!connectMode || !connectSourceId) return nodes
    return nodes.map(n => n.id === connectSourceId
      ? { ...n, style: { ...(n.style || {}), outline: '3px solid #2563eb', outlineOffset: 2, borderRadius: 8 } }
      : n)
  }, [nodes, connectMode, connectSourceId])

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
    const rawText = await file.text()
    if (!rawText.trim().toLowerCase().includes('<svg')) {
      toast('Arquivo inválido: selecione um SVG', 'error'); return
    }
    if (rawText.length > 200000) {
      toast('SVG muito grande (>200KB)', 'error'); return
    }
    const text = sanitizeSvg(rawText)
    if (!text.trim().toLowerCase().includes('<svg')) {
      toast('SVG inválido após sanitização', 'error'); return
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
    if (src.dbId === tgt.dbId) { toast('Origem e destino iguais', 'info'); return }
    try {
      const id = await db.orgEdges.add({
        sourceId: src.dbId, targetId: tgt.dbId,
        cor: '#94a3b8', espessura: 2, estilo: 'solid', tipoPonta: 'one',
      } as OrgEdge)
      const newEdge = buildEdgeFromDb({
        id, source: conn.source, target: conn.target,
        cor: '#94a3b8', espessura: 2, estilo: 'solid', tipoPonta: 'one',
      })
      setEdges(curr => [...curr, newEdge])
      // Abre o painel de personalização imediatamente
      setEditingEdge({ id, label: '', estilo: 'solid', cor: '#94a3b8', espessura: 2, tipoPonta: 'one' })
      toast('Conexão criada · personalize abaixo', 'success')
    } catch (err) { console.error(err); toast('Erro ao conectar', 'error') }
  }, [setEdges, toast])

  // ============ Connect mode (manual) ============
  const exitConnectMode = useCallback(() => {
    setConnectMode(false)
    setConnectSourceId(null)
    setNodes(curr => curr.map(n => n.selected ? { ...n, selected: false } : n))
  }, [setNodes])

  const createEdgeBetween = useCallback(async (sourceNodeId: string, targetNodeId: string) => {
    const src = parseId(sourceNodeId); const tgt = parseId(targetNodeId)
    if (src.kind !== 'company' || tgt.kind !== 'company') {
      toast('Conexões só entre blocos de empresa/livre', 'info'); return
    }
    if (src.dbId === tgt.dbId) { toast('Origem e destino iguais', 'info'); return }
    const pct = window.prompt('Percentual de participação (ex: 51%)', '')
    if (pct === null) return
    const label = pct.trim()
    try {
      const id = await db.orgEdges.add({
        sourceId: src.dbId, targetId: tgt.dbId,
        cor: '#94a3b8', espessura: 2, estilo: 'solid', label: label || undefined,
      } as OrgEdge)
      setEdges(curr => [...curr, {
        id: `edge:${id}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'smoothstep',
        label: label || undefined,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 18, height: 18 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        labelBgStyle: { fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, fillOpacity: 0.95 },
        labelStyle: { fill: '#0f172a', fontWeight: 600, fontSize: 12 },
        data: { cor: '#94a3b8', espessura: 2, estilo: 'solid' },
      }])
      toast('Conexão criada', 'success')
    } catch (err) { console.error(err); toast('Erro ao conectar', 'error') }
  }, [setEdges, toast])

  const handleNodeClickConnect = useCallback((_: React.MouseEvent, node: Node) => {
    if (!connectMode) return
    const { kind } = parseId(node.id)
    if (kind !== 'company') { toast('Selecione um bloco de empresa/livre', 'info'); return }
    if (!connectSourceId) {
      setConnectSourceId(node.id)
      toast('Origem selecionada · clique no destino', 'info')
      return
    }
    if (connectSourceId === node.id) { toast('Selecione um nó diferente', 'info'); return }
    const src = connectSourceId
    setConnectSourceId(null)
    setConnectMode(false)
    createEdgeBetween(src, node.id)
  }, [connectMode, connectSourceId, createEdgeBetween, toast])

  const deleteEdgeById = useCallback(async (edgeId: string) => {
    try {
      await db.orgEdges.delete(parseId(edgeId).dbId)
      setEdges(curr => curr.filter(e => e.id !== edgeId))
      toast('Conexão removida', 'success')
    } catch (err) { console.error(err); toast('Erro ao remover', 'error') }
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
        } else if (kind === 'image') {
          const d = n.data as ImageNodeData
          const w = (n.style?.width as number) || 160; const h = (n.style?.height as number) || 160
          const orig = await db.orgImages.get(parseId(n.id).dbId)
          if (!orig?.arquivoPath) continue
          const id = await db.orgImages.add({
            posX: newPos.x, posY: newPos.y, largura: w, altura: h,
            arquivoPath: orig.arquivoPath, nome: d.nome,
            rotacao: d.rotacao, opacidade: d.opacidade, raio: d.raio,
          } as OrgImage)
          setNodes(c => [...c, { ...n, id: `image:${id}`, position: newPos, selected: false, style: { width: w, height: h }, data: { ...d } }])
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
        : kind === 'image' ? db.orgImages
        : db.orgShapes
      tbl.update(dbId, { zIndex: target } as never).catch(console.error)
    })
  }, [nodes, setNodes, toast])

  // ============ Align / Distribute ============
  const persistPositions = useCallback((updated: Node[]) => {
    updated.forEach(n => {
      const { kind, dbId } = parseId(n.id)
      const tbl = kind === 'company' ? db.orgNodes
        : kind === 'text' ? db.orgTextsCanvas
        : kind === 'icon' ? db.orgIcons
        : kind === 'image' ? db.orgImages
        : db.orgShapes
      tbl.update(dbId, { posX: n.position.x, posY: n.position.y } as never).catch(console.error)
    })
  }, [])

  const alignSelection = useCallback((mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
    const sel = nodes.filter(n => n.selected)
    if (sel.length < 2) { toast('Selecione 2+ elementos', 'info'); return }
    const dims = sel.map(n => ({
      n,
      w: (n.width ?? (n.style?.width as number) ?? 200),
      h: (n.height ?? (n.style?.height as number) ?? 80),
    }))
    let target = 0
    if (mode === 'left') target = Math.min(...dims.map(d => d.n.position.x))
    if (mode === 'right') target = Math.max(...dims.map(d => d.n.position.x + d.w))
    if (mode === 'centerX') {
      const xs = dims.map(d => d.n.position.x + d.w / 2)
      target = (Math.min(...xs) + Math.max(...xs)) / 2
    }
    if (mode === 'top') target = Math.min(...dims.map(d => d.n.position.y))
    if (mode === 'bottom') target = Math.max(...dims.map(d => d.n.position.y + d.h))
    if (mode === 'centerY') {
      const ys = dims.map(d => d.n.position.y + d.h / 2)
      target = (Math.min(...ys) + Math.max(...ys)) / 2
    }
    const updated: Node[] = []
    setNodes(curr => curr.map(n => {
      if (!n.selected) return n
      const dim = dims.find(d => d.n.id === n.id)!
      let x = n.position.x, y = n.position.y
      if (mode === 'left') x = target
      if (mode === 'right') x = target - dim.w
      if (mode === 'centerX') x = target - dim.w / 2
      if (mode === 'top') y = target
      if (mode === 'bottom') y = target - dim.h
      if (mode === 'centerY') y = target - dim.h / 2
      const nn = { ...n, position: { x, y } }
      updated.push(nn)
      return nn
    }))
    persistPositions(updated)
    toast('Alinhado', 'success')
  }, [nodes, setNodes, toast, persistPositions])

  const distributeSelection = useCallback((axis: 'h' | 'v') => {
    const sel = nodes.filter(n => n.selected)
    if (sel.length < 3) { toast('Selecione 3+ elementos', 'info'); return }
    const dims = sel.map(n => ({
      n,
      w: (n.width ?? (n.style?.width as number) ?? 200),
      h: (n.height ?? (n.style?.height as number) ?? 80),
    }))
    const sorted = axis === 'h'
      ? [...dims].sort((a, b) => a.n.position.x - b.n.position.x)
      : [...dims].sort((a, b) => a.n.position.y - b.n.position.y)
    const first = sorted[0]; const last = sorted[sorted.length - 1]
    const startCenter = axis === 'h' ? first.n.position.x + first.w / 2 : first.n.position.y + first.h / 2
    const endCenter = axis === 'h' ? last.n.position.x + last.w / 2 : last.n.position.y + last.h / 2
    const step = (endCenter - startCenter) / (sorted.length - 1)
    const newPos = new Map<string, { x: number; y: number }>()
    sorted.forEach((d, i) => {
      const center = startCenter + step * i
      if (axis === 'h') newPos.set(d.n.id, { x: center - d.w / 2, y: d.n.position.y })
      else newPos.set(d.n.id, { x: d.n.position.x, y: center - d.h / 2 })
    })
    const updated: Node[] = []
    setNodes(curr => curr.map(n => {
      const p = newPos.get(n.id); if (!p) return n
      const nn = { ...n, position: p }; updated.push(nn); return nn
    }))
    persistPositions(updated)
    toast('Distribuído', 'success')
  }, [nodes, setNodes, toast, persistPositions])

  // ============ Copy / Paste / Nudge ============
  const copySelection = useCallback(() => {
    const sel = nodes.filter(n => n.selected)
    if (sel.length === 0) return
    clipboardRef.current = sel.map(n => ({ ...n }))
    toast(`${sel.length} copiado(s)`, 'info')
  }, [nodes, toast])

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current.length) return
    const ids = new Set(clipboardRef.current.map(i => i.id))
    setNodes(curr => curr.map(n => ({ ...n, selected: ids.has(n.id) })))
    setTimeout(() => duplicateSelection(), 0)
  }, [setNodes, duplicateSelection])

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    const updated: Node[] = []
    setNodes(curr => curr.map(n => {
      if (!n.selected) return n
      const nn = { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
      updated.push(nn); return nn
    }))
    if (updated.length) persistPositions(updated)
  }, [setNodes, persistPositions])

  // ============ Keyboard shortcuts ============
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'Escape') {
        if (connectMode) { e.preventDefault(); exitConnectMode(); return }
        if (nodes.some(n => n.selected) || edges.some(ed => ed.selected)) {
          e.preventDefault()
          setNodes(c => c.map(n => n.selected ? { ...n, selected: false } : n))
          setEdges(c => c.map(ed => ed.selected ? { ...ed, selected: false } : ed))
          return
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (nodes.some(n => n.selected) || edges.some(ed => ed.selected)) { e.preventDefault(); deleteSelection() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (nodes.some(n => n.selected)) { e.preventDefault(); duplicateSelection() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault(); setNodes(c => c.map(n => ({ ...n, selected: true })))
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (nodes.some(n => n.selected)) { e.preventDefault(); copySelection() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current.length) { e.preventDefault(); pasteClipboard() }
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (!nodes.some(n => n.selected)) return
        e.preventDefault()
        const step = e.shiftKey ? 20 : 2
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        nudgeSelection(dx, dy)
      }
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); fitView({ padding: 0.2, duration: 300 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nodes, edges, deleteSelection, duplicateSelection, connectMode, exitConnectMode, setNodes, setEdges, copySelection, pasteClipboard, nudgeSelection, fitView])

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

  async function saveImageEdit(patch: Partial<ImageNodeData>) {
    if (!editNodeId) return
    const { dbId } = parseId(editNodeId)
    try {
      await db.orgImages.update(dbId, {
        nome: patch.nome, rotacao: patch.rotacao, opacidade: patch.opacidade, raio: patch.raio,
      } as Partial<OrgImage>)
      setNodes(c => c.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null); toast('Imagem atualizada', 'success')
    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Organograma Societário</div>
          <div className="page-header-sub">
            {connectMode
              ? (connectSourceId ? '🔗 Modo Conectar · clique no nó de DESTINO (ESC para cancelar)' : '🔗 Modo Conectar · clique no nó de ORIGEM (ESC para cancelar)')
              : 'Arraste das bordas para conectar · Shift = caixa de seleção · Setas = mover · Ctrl+D duplicar · Ctrl+C/V copiar/colar · Ctrl+0 ajustar'}
          </div>
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
          {connectMode ? (
            <button className="btn btn-danger" onClick={exitConnectMode} title="Cancelar modo conectar (ESC)">
              <i className="fas fa-times" /> Cancelar
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setConnectMode(true); setConnectSourceId(null); toast('Clique no nó de origem', 'info') }} title="Desenhar uma seta entre dois nós">
              <i className="fas fa-link" /> Conectar
            </button>
          )}
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
          <button className="btn btn-secondary" onClick={() => imageInputRef.current?.click()} title="Adicionar imagem (PNG, JPG, WEBP, GIF)">
            <i className="fas fa-image" /> Imagem
          </button>
          <input
            ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }}
            onChange={async (ev) => {
              const f = ev.target.files?.[0]; if (f) await handleAddImageFromFile(f)
              if (imageInputRef.current) imageInputRef.current.value = ''
            }}
          />
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button className="btn btn-secondary" onClick={() => {
            const selEdge = edges.find(e => e.selected)
            if (selEdge) {
              const dbId = parseId(selEdge.id).dbId
              const d = selEdge.data || {}
              setEditingEdge({
                id: dbId,
                label: (selEdge.label as string) || (d.label as string) || '',
                estilo: (d.estilo as string) || 'solid',
                cor: (d.cor as string) || '#94a3b8',
                espessura: (d.espessura as number) || 2,
                tipoPonta: (d.tipoPonta as 'one' | 'both' | 'none') || 'one',
              })
              return
            }
            const sel = nodes.find(n => n.selected); if (!sel) { toast('Selecione um elemento ou seta', 'info'); return } setEditNodeId(sel.id)
          }} title="Editar elemento ou seta selecionada">
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
          {/* Alinhamento (visíveis quando 2+ selecionados) */}
          <button className="btn btn-secondary" onClick={() => alignSelection('left')} title="Alinhar à esquerda"><i className="fas fa-align-left" /></button>
          <button className="btn btn-secondary" onClick={() => alignSelection('centerX')} title="Centralizar horizontalmente"><i className="fas fa-align-center" /></button>
          <button className="btn btn-secondary" onClick={() => alignSelection('right')} title="Alinhar à direita"><i className="fas fa-align-right" /></button>
          <button className="btn btn-secondary" onClick={() => alignSelection('top')} title="Alinhar ao topo"><i className="fas fa-arrows-up-to-line" /></button>
          <button className="btn btn-secondary" onClick={() => alignSelection('centerY')} title="Centralizar verticalmente"><i className="fas fa-grip-lines" /></button>
          <button className="btn btn-secondary" onClick={() => alignSelection('bottom')} title="Alinhar à base"><i className="fas fa-arrows-down-to-line" /></button>
          <button className="btn btn-secondary" onClick={() => distributeSelection('h')} title="Distribuir horizontalmente"><i className="fas fa-arrows-left-right" /></button>
          <button className="btn btn-secondary" onClick={() => distributeSelection('v')} title="Distribuir verticalmente"><i className="fas fa-arrows-up-down" /></button>
          <div style={{ width: 1, background: 'hsl(var(--border))', margin: '0 4px' }} />
          <button
            className={snapEnabled ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSnapEnabled(s => !s)}
            title={snapEnabled ? 'Snap à grade ativado (clique para desativar)' : 'Snap à grade desativado'}
          ><i className="fas fa-table-cells" /> Snap</button>
          <button
            className={showMiniMap ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setShowMiniMap(s => !s)}
            title="Mostrar/ocultar minimapa"
          ><i className="fas fa-map" /></button>
          <button className="btn btn-secondary" onClick={() => zoomIn({ duration: 200 })} title="Zoom in"><i className="fas fa-magnifying-glass-plus" /></button>
          <button className="btn btn-secondary" onClick={() => zoomOut({ duration: 200 })} title="Zoom out"><i className="fas fa-magnifying-glass-minus" /></button>
          <button className="btn btn-secondary" onClick={() => fitView({ padding: 0.2, duration: 300 })} title="Ajustar (Ctrl+0)"><i className="fas fa-expand" /></button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 500, position: 'relative' }}>
        {loading ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <i className="fas fa-spinner fa-spin" />
            <p>Carregando organograma...</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', cursor: connectMode ? 'crosshair' : undefined, position: 'relative' }}>
          <ReactFlow
            nodes={displayedNodes} edges={displayedEdges}
            onNodesChange={wrappedNodesChange} onEdgesChange={wrappedEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes} fitView
            snapToGrid={snapEnabled} snapGrid={[10, 10]}
            minZoom={0.1} maxZoom={3}
            multiSelectionKeyCode={['Meta', 'Shift', 'Control']} deleteKeyCode={null}
            selectionOnDrag={!connectMode}
            panOnDrag={connectMode ? true : [1, 2]}
            panOnScroll={false} zoomOnScroll selectionKeyCode="Shift"
            nodesDraggable={!connectMode} nodesConnectable={!connectMode} elementsSelectable={!connectMode}
            onNodeClick={handleNodeClickConnect}
            onEdgeMouseEnter={(_, ed) => setHoveredEdgeId(ed.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            onEdgeClick={(_, ed) => {
              if (connectMode) return
              setEdges(curr => curr.map(x => ({ ...x, selected: x.id === ed.id })))
            }}
            onPaneClick={() => setEdges(curr => curr.some(x => x.selected) ? curr.map(x => ({ ...x, selected: false })) : curr)}
            onEdgeDoubleClick={(_, ed) => {
              const dbId = parseId(ed.id).dbId
              const d = ed.data || {}
              setEditingEdge({
                id: dbId,
                label: (ed.label as string) || (d.label as string) || '',
                estilo: (d.estilo as string) || 'solid',
                cor: (d.cor as string) || '#94a3b8',
                espessura: (d.espessura as number) || 2,
                tipoPonta: (d.tipoPonta as 'one' | 'both' | 'none') || 'one',
              })
            }}
          >
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            {showMiniMap && (
              <MiniMap
                pannable zoomable
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                nodeColor={(n) => (n.data?.corBorda as string) || '#3b82f6'}
                nodeStrokeWidth={2}
                maskColor="rgba(15,23,42,0.05)"
              />
            )}
            {/* Alignment guides overlay */}
            <AlignmentGuides guides={guides} />
          </ReactFlow>
          </div>
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
      {editNode && editNode.type === 'image' && (
        <EditImageModal node={editNode as Node<ImageNodeData>} onClose={() => setEditNodeId(null)} onSave={saveImageEdit}
          onDelete={() => setConfirmDelete({ id: editNode.id, kind: 'image' })} />
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

      {editingEdge && (
        <Modal onClose={() => setEditingEdge(null)} title="Personalizar conexão">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label"><i className="fas fa-tag" /> Texto / Percentual (ex: 51%)</label>
              <input
                className="form-input"
                value={editingEdge.label}
                onChange={e => setEditingEdge(s => s ? { ...s, label: e.target.value } : s)}
                placeholder="51%"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label"><i className="fas fa-grip-lines" /> Estilo da linha</label>
                <select
                  className="form-input"
                  value={editingEdge.estilo}
                  onChange={e => setEditingEdge(s => s ? { ...s, estilo: e.target.value } : s)}
                >
                  <option value="solid">Sólida (controle direto)</option>
                  <option value="dashed">Tracejada (controle indireto)</option>
                  <option value="dotted">Pontilhada</option>
                </select>
              </div>
              <div style={{ width: 110 }}>
                <label className="form-label"><i className="fas fa-palette" /> Cor</label>
                <input
                  type="color"
                  className="form-input"
                  style={{ height: 38, padding: 2 }}
                  value={editingEdge.cor}
                  onChange={e => setEditingEdge(s => s ? { ...s, cor: e.target.value } : s)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label"><i className="fas fa-text-width" /> Espessura</label>
                <select
                  className="form-input"
                  value={editingEdge.espessura}
                  onChange={e => setEditingEdge(s => s ? { ...s, espessura: Number(e.target.value) } : s)}
                >
                  <option value={1}>Fina (1px)</option>
                  <option value={2}>Média (2px)</option>
                  <option value={4}>Grossa (4px)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label"><i className="fas fa-arrows-alt-h" /> Tipo de ponta</label>
                <select
                  className="form-input"
                  value={editingEdge.tipoPonta}
                  onChange={e => setEditingEdge(s => s ? { ...s, tipoPonta: e.target.value as 'one' | 'both' | 'none' } : s)}
                >
                  <option value="one">Simples (►)</option>
                  <option value="both">Dupla (◄►)</option>
                  <option value="none">Sem ponta (—)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (!editingEdge) return
                  try {
                    await db.orgEdges.delete(editingEdge.id)
                    setEdges(c => c.filter(ed => ed.id !== `edge:${editingEdge.id}`))
                    setEditingEdge(null)
                    toast('Conexão removida', 'success')
                  } catch (err) { console.error(err); toast('Erro ao remover conexão', 'error') }
                }}
              ><i className="fas fa-trash" /> Excluir</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setEditingEdge(null)}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!editingEdge) return
                    try {
                      await db.orgEdges.update(editingEdge.id, {
                        label: editingEdge.label || undefined,
                        estilo: editingEdge.estilo,
                        cor: editingEdge.cor,
                        espessura: editingEdge.espessura,
                        tipoPonta: editingEdge.tipoPonta,
                      })
                      setEdges(curr => curr.map(ed => {
                        if (ed.id !== `edge:${editingEdge.id}`) return ed
                        return buildEdgeFromDb({
                          id: editingEdge.id,
                          source: ed.source,
                          target: ed.target,
                          label: editingEdge.label || undefined,
                          cor: editingEdge.cor,
                          estilo: editingEdge.estilo,
                          espessura: editingEdge.espessura,
                          tipoPonta: editingEdge.tipoPonta,
                        })
                      }))
                      setEditingEdge(null)
                      toast('Conexão atualizada', 'success')
                    } catch (err) { console.error(err); toast('Erro ao salvar', 'error') }
                  }}
                ><i className="fas fa-save" /> Salvar</button>
              </div>
            </div>
          </div>
        </Modal>
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
  const previewSvg = sanitizeSvg((node.data.svgContent || '').replace(/<svg([^>]*)>/i, (_m, a) => `<svg${String(a).replace(/\swidth="[^"]*"/i,'').replace(/\sheight="[^"]*"/i,'')} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`))
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

function EditImageModal({ node, onClose, onSave, onDelete }: {
  node: Node<ImageNodeData>
  onClose: () => void
  onSave: (patch: Partial<ImageNodeData>) => void
  onDelete: () => void
}) {
  const [nome, setNome] = useState(node.data.nome || '')
  const [rotacao, setRotacao] = useState(node.data.rotacao || 0)
  const [opacidade, setOpacidade] = useState(node.data.opacidade ?? 1)
  const [raio, setRaio] = useState(node.data.raio ?? 0)
  return (
    <Modal onClose={onClose} title="Editar imagem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12, background: 'hsl(var(--muted))', borderRadius: 8 }}>
          {node.data.url ? (
            <img src={node.data.url} alt={nome} style={{ maxWidth: 220, maxHeight: 160, objectFit: 'contain', borderRadius: raio, opacity: opacidade, transform: `rotate(${rotacao}deg)` }} />
          ) : <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Sem prévia</div>}
        </div>
        <div>
          <label className="form-label">Nome</label>
          <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Rotação: {rotacao}°</label>
            <input type="range" min={0} max={360} value={rotacao} onChange={e => setRotacao(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="form-label">Opacidade: {Math.round(opacidade * 100)}%</label>
            <input type="range" min={10} max={100} value={Math.round(opacidade * 100)} onChange={e => setOpacidade(Number(e.target.value) / 100)} style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <label className="form-label">Cantos arredondados: {raio}px</label>
          <input type="range" min={0} max={80} value={raio} onChange={e => setRaio(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          Dica: arraste os cantos da imagem no canvas para redimensionar (mantém proporção).
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}><i className="fas fa-trash" /> Remover</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ nome, rotacao, opacidade, raio })}>Salvar</button>
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
