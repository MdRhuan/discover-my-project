'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { db } from '@/lib/db'
import type { OrgNode, Empresa } from '@/types'

export function OrgChartPage() {
  const { toast } = useApp()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [nodes, setNodes] = useState<OrgNode[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [e, n] = await Promise.all([db.empresas.toArray(), db.orgNodes.toArray()])
    setEmpresas(e)
    if (e.length > 0) setSelectedEmpresa(e[0].id!)
    setNodes(n)
  }

  const filteredNodes = nodes.filter(n => n.empresaId === selectedEmpresa)

  useEffect(() => {
    if (!filteredNodes.length || !svgRef.current) return
    renderChart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNodes])

  function renderChart() {
    if (typeof window === 'undefined') return
    import('d3').then((d3) => {
      const svg = d3.select(svgRef.current!)
      svg.selectAll('*').remove()

      const W = svgRef.current!.clientWidth || 700
      const H = svgRef.current!.clientHeight || 460

      const g = svg.append('g')

      // Build tree from flat list
      const root = d3.stratify<OrgNode>()
        .id(d => String(d.id))
        .parentId(d => d.parentId ? String(d.parentId) : null)(filteredNodes)

      const treeLayout = d3.tree<OrgNode>().size([W - 80, H - 120])
      const treeData = treeLayout(root as d3.HierarchyNode<OrgNode>)

      const offset = d3.zoomIdentity.translate(40, 40)

      const link = g.selectAll('.link')
        .data(treeData.links())
        .enter().append('path')
        .attr('fill', 'none')
        .attr('stroke', 'var(--surface-border)')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkVertical<d3.HierarchyPointLink<OrgNode>, d3.HierarchyPointNode<OrgNode>>()
          .x(d => d.x)
          .y(d => d.y))

      const node = g.selectAll('.node')
        .data(treeData.descendants())
        .enter().append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)

      node.append('rect')
        .attr('x', -70).attr('y', -22)
        .attr('width', 140).attr('height', 44)
        .attr('rx', 10)
        .attr('fill', 'var(--surface-card)')
        .attr('stroke', d => d.depth === 0 ? 'var(--brand)' : 'var(--surface-border)')
        .attr('stroke-width', d => d.depth === 0 ? 2 : 1.5)

      node.append('text')
        .attr('dy', -6).attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-primary)')
        .attr('font-size', 12).attr('font-weight', 600)
        .attr('font-family', 'Lexend, sans-serif')
        .text(d => d.data.nome)

      node.append('text')
        .attr('dy', 12).attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', 10)
        .attr('font-family', 'Lexend, sans-serif')
        .text(d => d.data.cargo)

      // Center
      const bounds = (g.node() as SVGGElement).getBBox()
      svg.attr('viewBox', `${bounds.x - 20} ${bounds.y - 20} ${bounds.width + 40} ${bounds.height + 40}`)
    }).catch(() => {
      toast('D3 não disponível. Instale d3 via npm.', 'error')
    })
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <div className="page-header-title">Organograma</div>
          <div className="page-header-sub">Estrutura organizacional das empresas</div>
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 220 }}
          value={selectedEmpresa || ''}
          onChange={e => setSelectedEmpresa(Number(e.target.value))}
        >
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredNodes.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <i className="fas fa-sitemap" />
            <p>Nenhum nó do organograma encontrado para esta empresa.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 460, overflow: 'hidden' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
          </div>
        )}
      </div>

      {/* Node list */}
      {filteredNodes.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title"><i className="fas fa-list" style={{ marginRight: 8 }} />Membros</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {filteredNodes.map(n => (
              <div key={n.id} style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', borderRadius: 10, padding: '10px 14px', minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 2 }}>{n.cargo}</div>
                {n.parentId && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    Reporta: {filteredNodes.find(x => x.id === n.parentId)?.nome || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
