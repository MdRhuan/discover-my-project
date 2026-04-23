'use client'

import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { PageKey, Lang } from '@/types'
import { db, supabaseSignOut } from '@/lib/db'

interface NavItemDef {
  key: string
  type?: 'section'
  icon?: string
  label: { pt: string; en: string }
  children?: NavItemDef[]
}

const NAV_STRUCTURE: NavItemDef[] = [
  { key: 'dashboard', icon: 'fa-gauge-high',  label: { pt: 'Dashboard',         en: 'Dashboard'         } },
  { key: 'tasks',     icon: 'fa-list-check',   label: { pt: 'Tasks & Deadlines', en: 'Tasks & Deadlines' } },
  {
    key: 'sec-empresas', type: 'section', label: { pt: 'Empresas', en: 'Companies' },
    children: [
      { key: 'companies',    icon: 'fa-building',       label: { pt: 'Empresas',      en: 'Companies'      } },
      { key: 'emConstrucao', icon: 'fa-helmet-safety',  label: { pt: 'Em Construção', en: 'Under Construction' } },
      { key: 'orgchart',   icon: 'fa-sitemap',     label: { pt: 'Organograma',  en: 'Org Chart'  } },
      { key: 'valuations', icon: 'fa-chart-line',  label: { pt: 'Valuations',   en: 'Valuations' } },
    ],
  },
  {
    key: 'sec-pessoal', type: 'section', label: { pt: 'Pessoal', en: 'Personal' },
    children: [
      {
        key: 'baseIdentidade', icon: 'fa-id-card', label: { pt: 'Base & Identidade', en: 'Base & Identity' },
        children: [
          { key: 'personalDocs', icon: 'fa-passport',      label: { pt: 'Documentos pessoais', en: 'Personal Documents' } },
        ],
      },
      {
        key: 'seguros', icon: 'fa-heart-pulse', label: { pt: 'Seguros', en: 'Insurance' },
        children: [
          { key: 'lifeInsurance', icon: 'fa-shield-heart', label: { pt: 'Seguro de vida',        en: 'Life Insurance' } },
          { key: 'carInsurance',  icon: 'fa-car',          label: { pt: 'Seguro do carro',       en: 'Car Insurance'  } },
          { key: 'aptInsurance',  icon: 'fa-building',     label: { pt: 'Seguro do apartamento', en: 'Apt Insurance'  } },
        ],
      },
      {
        key: 'financeiro', icon: 'fa-coins', label: { pt: 'Financeiro & Patrimônio', en: 'Finance & Assets' },
        children: [
          { key: 'investments',   icon: 'fa-chart-pie',    label: { pt: 'Investimentos',      en: 'Investments'    } },
          { key: 'realEstate',    icon: 'fa-house',        label: { pt: 'Imóveis & Mortgage', en: 'Real Estate'    } },
          { key: 'bensMoveis',    icon: 'fa-couch',        label: { pt: 'Bens Móveis',        en: 'Movable Assets' } },
        ],
      },
      {
        key: 'juridico-estrutura', icon: 'fa-scale-balanced', label: { pt: 'Jurídico & Legal', en: 'Legal Structure' },
        children: [
          { key: 'juridico',     icon: 'fa-gavel',     label: { pt: 'Jurídico',         en: 'Legal'          } },
          { key: 'acordoGaveta', icon: 'fa-handshake', label: { pt: 'Acordo de gaveta', en: 'Side Agreement' } },
          { key: 'trademarks',   icon: 'fa-trademark', label: { pt: 'Reg. de Marca',    en: 'Trademarks'     } },
        ],
      },
      {
        key: 'fiscalBRUS', icon: 'fa-receipt', label: { pt: 'Fiscal BR & US', en: 'Fiscal BR & US' },
        children: [
          { key: 'fiscalTax',   icon: 'fa-file-invoice-dollar', label: { pt: 'Tax Return | IRS & Receita Federal', en: 'Tax Return | IRS & Receita Federal' } },
          { key: 'taxPlanning', icon: 'fa-chess',               label: { pt: 'Tax Planning',     en: 'Tax Planning'    } },
          { key: 'checkBox',    icon: 'fa-square-check',        label: { pt: 'Check-the-box',    en: 'Check-the-box'   } },
        ],
      },
      { key: 'fixedExpenses', icon: 'fa-file-invoice', label: { pt: 'Despesas Fixas', en: 'Fixed Expenses' } },
      { key: 'fairsEvents',   icon: 'fa-ticket',       label: { pt: 'Feiras & Eventos', en: 'Fairs & Events' } },
    ],
  },
  {
    key: 'sec-tools', type: 'section', label: { pt: 'Ferramentas', en: 'Tools' },
    children: [
      { key: 'backup',   icon: 'fa-database',     label: { pt: 'Backup',    en: 'Backup'    } },
      { key: 'auditLog', icon: 'fa-shield-halved', label: { pt: 'Auditoria', en: 'Audit Log' } },
      { key: 'users',    icon: 'fa-users-gear',    label: { pt: 'Usuários',  en: 'Users'     } },
    ],
  },
]

function NavItemComponent({
  item, page, setPage, onClose, lang, depth = 0,
}: {
  item: NavItemDef
  page: PageKey
  setPage: (p: PageKey) => void
  onClose: () => void
  lang: Lang
  depth?: number
}) {
  const isActive = page === item.key ||
    (item.children?.some(c => c.key === page || c.children?.some(cc => cc.key === page)))
  const [open, setOpen] = useState(isActive ?? false)
  const label = lang === 'en-US' ? item.label.en : item.label.pt

  if (item.type === 'section') {
    return (
      <div>
        <div className="sidebar-section">{label}</div>
        {item.children?.map(child => (
          <NavItemComponent
            key={child.key} item={child} page={page}
            setPage={setPage} onClose={onClose} lang={lang} depth={0}
          />
        ))}
      </div>
    )
  }

  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div>
        <button
          className={`nav-item nav-item-parent ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 14 + depth * 12 }}
          onClick={() => setOpen(v => !v)}
        >
          {item.icon && (
            <i className={`fas ${item.icon}`} style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
          <i
            className={`fas fa-chevron-${open ? 'down' : 'right'}`}
            style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}
          />
        </button>
        {open && (
          <div className="nav-submenu">
            {item.children!.map(child => (
              <NavItemComponent
                key={child.key} item={child} page={page}
                setPage={setPage} onClose={onClose} lang={lang} depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className={`nav-item nav-item-leaf ${page === item.key ? 'active' : ''}`}
      style={{ paddingLeft: 14 + depth * 14 }}
      onClick={() => { setPage(item.key as PageKey); onClose() }}
    >
      {item.icon && (
        <i className={`fas ${item.icon}`} style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }} />
      )}
      <span>{label}</span>
    </button>
  )
}

function filterByRole(items: NavItemDef[], isAdmin: boolean): NavItemDef[] {
  return items
    .filter(it => isAdmin || (it.key !== 'fixedExpenses' && it.key !== 'users'))
    .map(it => it.children
      ? { ...it, children: filterByRole(it.children, isAdmin) }
      : it,
    )
}

export function Sidebar() {
  const { page, setPage, lang, sidebarOpen, setSidebarOpen, setUser, toast, isAdmin } = useApp()

  async function handleLogout() {
    try {
      await db.auditLog.add({ acao: 'Logout realizado', modulo: 'Auth', timestamp: new Date().toISOString() })
    } catch (_) {}
    await supabaseSignOut()
    setUser(null)
    toast('Logout realizado', 'success')
  }

  const navItems = filterByRole(NAV_STRUCTURE, isAdmin)

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <nav className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span>
            Hub<span style={{ color: 'var(--brand)' }}>.</span>
            <small>Eduardo Vanzak</small>
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navItems.map(item => (
            <NavItemComponent
              key={item.key} item={item} page={page}
              setPage={setPage} onClose={() => setSidebarOpen(false)} lang={lang}
            />
          ))}
        </div>
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--surface-border)' }}>
          <button
            className="nav-item"
            style={{ width: 'calc(100% - 0px)', color: 'var(--red)' }}
            onClick={handleLogout}
          >
            <i className="fas fa-arrow-right-from-bracket" style={{ fontSize: 13, width: 16, textAlign: 'center' }} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </>
  )
}
