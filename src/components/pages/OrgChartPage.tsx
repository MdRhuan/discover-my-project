import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
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
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import type { OrgNode, OrgEdge, Empresa } from '@/types'

// ============ Custom Node ============
interface NodeData {
  label: string
  cargo?: string
  cnpj?: string
  ein?: string
  pais?: string
  empresaId: number
  icon?: string
  corBorda?: string
  corFundo?: string
  espessuraBorda?: number
  estiloBorda?: string
  onOpenEmpresa?: (id: number) => void
  onEdit?: (id: string) => void
}

const ICON_MAP: Record<string, string> = {
  empresa: 'fa-building',
  holding: 'fa-sitemap',
  pessoa: 'fa-user',
  fundo: 'fa-landmark',
  trust: 'fa-shield-halved',
  offshore: 'fa-globe',
}

function CompanyNode({ id, data, selected }: NodeProps<NodeData>) {
  const borda = data.corBorda || 'hsl(var(--primary))'
  const fundo = data.corFundo || 'hsl(var(--card))'
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
        fontFamily: 'inherit',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: borda }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <i
          className={`fas ${ICON_MAP[data.icon || 'empresa'] || 'fa-building'}`}
          style={{ color: borda, fontSize: 18 }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); data.onOpenEmpresa?.(data.empresaId) }}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground))',
            textAlign: 'left', flex: 1, textDecoration: 'underline',
            textDecorationColor: 'transparent', transition: 'text-decoration-color .15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = borda)}
          onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
          title="Abrir detalhes da empresa"
        >
          {data.label}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); data.onEdit?.(id) }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))', padding: 4,
          }}
          title="Editar bloco"
        >
          <i className="fas fa-pen" style={{ fontSize: 11 }} />
        </button>
      </div>
      {data.cargo && (
        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
          {data.cargo}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>
        {data.pais && <span><i className="fas fa-flag" style={{ marginRight: 4 }} />{data.pais}</span>}
        {data.cnpj && <span>CNPJ: {data.cnpj}</span>}
        {data.ein && <span>EIN: {data.ein}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: borda }} />
    </div>
  )
}

const nodeTypes = { company: CompanyNode }

// ============ Inner Editor ============
function OrgChartEditor() {
  const { toast, setPage } = useApp() as ReturnType<typeof useApp> & { setPage: (p: string) => void }
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [addModal, setAddModal] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null)
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'node' | 'edge'; id: string } | null>(null)
  const dirtyRef = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // ============ Load ============
  const loadAll = useCallback(async () => {
    setLoading(true)
    const [emps, n, e] = await Promise.all([
      db.empresas.toArray(),
      db.orgNodes.toArray(),
      db.orgEdges.toArray(),
    ])
    setEmpresas(emps)

    const empMap = new Map(emps.map(x => [x.id!, x]))
    const flowNodes: Node<NodeData>[] = n.map(node => {
      const emp = empMap.get(node.empresaId)
      return {
        id: String(node.id),
        type: 'company',
        position: { x: Number(node.posX) || 0, y: Number(node.posY) || 0 },
        data: {
          label: emp?.nome || node.nome || '(empresa removida)',
          cargo: node.cargo,
          cnpj: emp?.cnpj,
          ein: emp?.ein,
          pais: emp?.pais,
          empresaId: node.empresaId,
          icon: node.icon || 'empresa',
          corBorda: node.corBorda,
          corFundo: node.corFundo,
          espessuraBorda: node.espessuraBorda,
          estiloBorda: node.estiloBorda,
        },
      }
    })

    const flowEdges: Edge[] = e.map(ed => ({
      id: String(ed.id),
      source: String(ed.sourceId),
      target: String(ed.targetId),
      label: ed.label,
      style: {
        stroke: ed.cor || '#94a3b8',
        strokeWidth: ed.espessura || 2,
        strokeDasharray: ed.estilo === 'dashed' ? '6 4' : ed.estilo === 'dotted' ? '2 3' : undefined,
      },
      data: {
        cor: ed.cor || '#94a3b8',
        espessura: ed.espessura || 2,
        estilo: ed.estilo || 'solid',
      },
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
    setLoading(false)
  }, [setNodes, setEdges])

  useEffect(() => { loadAll() }, [loadAll])

  // ============ Wire callbacks into nodes ============
  const handleOpenEmpresa = useCallback((empresaId: number) => {
    try {
      localStorage.setItem('open-empresa-id', String(empresaId))
    } catch { /* ignore */ }
    setPage('companies' as PageKey)
  }, [setPage])

  useEffect(() => {
    setNodes(curr => curr.map(n => ({
      ...n,
      data: {
        ...n.data,
        onOpenEmpresa: handleOpenEmpresa,
        onEdit: (id: string) => setEditNodeId(id),
      },
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleOpenEmpresa])

  // ============ Auto save (debounced) ============
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      // Save node positions
      try {
        await Promise.all(nodes.map(n =>
          db.orgNodes.update(Number(n.id), {
            posX: n.position.x,
            posY: n.position.y,
          })
        ))
      } catch (err) { console.error('autosave nodes', err) }
    }, 800)
  }, [nodes])

  const wrappedNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    if (changes.some(c => c.type === 'position' && !c.dragging)) {
      scheduleSave()
    }
  }, [onNodesChange, scheduleSave])

  const wrappedEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes)
  }, [onEdgesChange])

  // ============ Add node ============
  async function handleAddNode() {
    if (!selectedEmpresaId) { toast('Selecione uma empresa', 'error'); return }
    const emp = empresas.find(e => e.id === selectedEmpresaId)
    if (!emp) return
    try {
      const id = await db.orgNodes.add({
        empresaId: selectedEmpresaId,
        nome: emp.nome,
        cargo: '',
        posX: 100 + Math.random() * 200,
        posY: 100 + Math.random() * 100,
        icon: 'empresa',
        corBorda: '#3b82f6',
        corFundo: '#ffffff',
        espessuraBorda: 2,
        estiloBorda: 'solid',
      } as OrgNode)
      const newNode: Node<NodeData> = {
        id: String(id),
        type: 'company',
        position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
        data: {
          label: emp.nome,
          cnpj: emp.cnpj,
          ein: emp.ein,
          pais: emp.pais,
          empresaId: emp.id!,
          icon: 'empresa',
          corBorda: '#3b82f6',
          corFundo: '#ffffff',
          espessuraBorda: 2,
          estiloBorda: 'solid',
          onOpenEmpresa: handleOpenEmpresa,
          onEdit: (nid: string) => setEditNodeId(nid),
        },
      }
      setNodes(curr => [...curr, newNode])
      setAddModal(false)
      setSelectedEmpresaId(null)
      toast('Bloco adicionado', 'success')
    } catch (e) {
      console.error(e)
      toast('Erro ao adicionar bloco', 'error')
    }
  }

  // ============ Connect ============
  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target) return
    try {
      const id = await db.orgEdges.add({
        sourceId: Number(conn.source),
        targetId: Number(conn.target),
        cor: '#94a3b8',
        espessura: 2,
        estilo: 'solid',
      } as OrgEdge)
      setEdges(curr => addEdge({
        ...conn,
        id: String(id),
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        data: { cor: '#94a3b8', espessura: 2, estilo: 'solid' },
      }, curr))
    } catch (e) {
      console.error(e)
      toast('Erro ao criar conexão', 'error')
    }
  }, [setEdges, toast])

  // ============ Delete selection ============
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        const selN = nodes.filter(n => n.selected)
        const selE = edges.filter(e => e.selected)
        if (selN.length === 0 && selE.length === 0) return
        e.preventDefault()
        ;(async () => {
          try {
            for (const n of selN) await db.orgNodes.delete(Number(n.id))
            for (const ed of selE) await db.orgEdges.delete(Number(ed.id))
            setNodes(c => c.filter(n => !n.selected))
            setEdges(c => c.filter(e => !e.selected))
          } catch (err) {
            console.error(err); toast('Erro ao excluir', 'error')
          }
        })()
      }
      // Duplicate Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const selN = nodes.filter(n => n.selected)
        if (selN.length === 0) return
        e.preventDefault()
        ;(async () => {
          for (const n of selN) {
            const data = n.data
            const id = await db.orgNodes.add({
              empresaId: data.empresaId,
              nome: data.label,
              cargo: data.cargo || '',
              posX: n.position.x + 40,
              posY: n.position.y + 40,
              icon: data.icon,
              corBorda: data.corBorda,
              corFundo: data.corFundo,
              espessuraBorda: data.espessuraBorda,
              estiloBorda: data.estiloBorda,
            } as OrgNode)
            setNodes(curr => [...curr, {
              ...n,
              id: String(id),
              position: { x: n.position.x + 40, y: n.position.y + 40 },
              selected: false,
              data: { ...data },
            }])
          }
        })()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nodes, edges, setNodes, setEdges, toast])

  // ============ Edit node modal ============
  const editNode = useMemo(() => nodes.find(n => n.id === editNodeId), [nodes, editNodeId])

  async function saveEdit(patch: Partial<NodeData>) {
    if (!editNodeId) return
    const numId = Number(editNodeId)
    try {
      await db.orgNodes.update(numId, {
        cargo: patch.cargo,
        icon: patch.icon,
        corBorda: patch.corBorda,
        corFundo: patch.corFundo,
        espessuraBorda: patch.espessuraBorda,
        estiloBorda: patch.estiloBorda,
      } as Partial<OrgNode>)
      setNodes(curr => curr.map(n => n.id === editNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      setEditNodeId(null)
      toast('Bloco atualizado', 'success')
    } catch (e) {
      console.error(e); toast('Erro ao salvar', 'error')
    }
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Organograma Societário</div>
          <div className="page-header-sub">
            Arraste para mover · Conecte arrastando das bordas · Delete/Backspace remove · Ctrl+D duplica
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => fitView({ padding: 0.2, duration: 300 })}>
            <i className="fas fa-expand" /> Centralizar
          </button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>
            <i className="fas fa-plus" /> Adicionar empresa
          </button>
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
            nodes={nodes}
            edges={edges}
            onNodesChange={wrappedNodesChange}
            onEdgesChange={wrappedEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[10, 10]}
            multiSelectionKeyCode={['Meta', 'Shift']}
            deleteKeyCode={null}
          >
            <Background gap={20} size={1} color="hsl(var(--border))" />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {/* Add modal */}
      {addModal && (
        <Modal onClose={() => setAddModal(false)} title="Adicionar bloco ao organograma">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Empresa cadastrada *</label>
              <select
                className="form-select"
                value={selectedEmpresaId || ''}
                onChange={e => setSelectedEmpresaId(Number(e.target.value) || null)}
              >
                <option value="">— Selecione —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nome} {e.cnpj ? `· ${e.cnpj}` : e.ein ? `· ${e.ein}` : ''}
                  </option>
                ))}
              </select>
              {empresas.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  Nenhuma empresa cadastrada. Cadastre uma em <strong>Empresas</strong> primeiro.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddNode} disabled={!selectedEmpresaId}>
                Adicionar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editNode && (
        <EditNodeModal
          node={editNode}
          onClose={() => setEditNodeId(null)}
          onSave={saveEdit}
          onDelete={() => setConfirmDelete({ type: 'node', id: editNode.id })}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          msg="Esta ação removerá o bloco e suas conexões."
          onConfirm={async () => {
            if (!confirmDelete) return
            try {
              await db.orgNodes.delete(Number(confirmDelete.id))
              setNodes(c => c.filter(n => n.id !== confirmDelete.id))
              setEdges(c => c.filter(e => e.source !== confirmDelete.id && e.target !== confirmDelete.id))
              setEditNodeId(null)
              toast('Bloco removido', 'success')
            } catch (e) { console.error(e); toast('Erro ao remover', 'error') }
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

type PageKey = Parameters<ReturnType<typeof useApp>['setPage']>[0]

// ============ Edit Node Modal ============
function EditNodeModal({
  node, onClose, onSave, onDelete,
}: {
  node: Node<NodeData>
  onClose: () => void
  onSave: (patch: Partial<NodeData>) => void
  onDelete: () => void
}) {
  const [cargo, setCargo] = useState(node.data.cargo || '')
  const [icon, setIcon] = useState(node.data.icon || 'empresa')
  const [corBorda, setCorBorda] = useState(node.data.corBorda || '#3b82f6')
  const [corFundo, setCorFundo] = useState(node.data.corFundo || '#ffffff')
  const [espessura, setEspessura] = useState(node.data.espessuraBorda || 2)
  const [estilo, setEstilo] = useState(node.data.estiloBorda || 'solid')

  return (
    <Modal onClose={onClose} title={`Editar bloco · ${node.data.label}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="form-label">Descrição / Cargo</label>
          <input className="form-input" value={cargo} onChange={e => setCargo(e.target.value)}
                 placeholder="Ex: Holding controladora, 60% participação..." />
        </div>
        <div>
          <label className="form-label">Ícone</label>
          <select className="form-select" value={icon} onChange={e => setIcon(e.target.value)}>
            <option value="empresa">Empresa</option>
            <option value="holding">Holding</option>
            <option value="pessoa">Pessoa física</option>
            <option value="fundo">Fundo</option>
            <option value="trust">Trust</option>
            <option value="offshore">Offshore</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Cor da borda</label>
            <input type="color" className="form-input" value={corBorda} onChange={e => setCorBorda(e.target.value)} style={{ height: 40 }} />
          </div>
          <div>
            <label className="form-label">Cor de fundo</label>
            <input type="color" className="form-input" value={corFundo} onChange={e => setCorFundo(e.target.value)} style={{ height: 40 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Espessura da borda: {espessura}px</label>
            <input type="range" min={1} max={6} value={espessura} onChange={e => setEspessura(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="form-label">Estilo da borda</label>
            <select className="form-select" value={estilo} onChange={e => setEstilo(e.target.value)}>
              <option value="solid">Sólida</option>
              <option value="dashed">Tracejada</option>
              <option value="dotted">Pontilhada</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-danger" onClick={onDelete}>
            <i className="fas fa-trash" /> Remover
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ cargo, icon, corBorda, corFundo, espessuraBorda: espessura, estiloBorda: estilo })}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============ Wrapper with Provider ============
export function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChartEditor />
    </ReactFlowProvider>
  )
}
