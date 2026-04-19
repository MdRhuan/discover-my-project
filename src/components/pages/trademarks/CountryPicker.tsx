'use client'

import { Modal } from '@/components/ui/Modal'

interface Props {
  onPick: (pais: 'BR' | 'US') => void
  onClose: () => void
}

export function CountryPicker({ onPick, onClose }: Props) {
  return (
    <Modal title="Adicionar Marca" onClose={onClose}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Selecione o tipo de marca que deseja cadastrar:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => onPick('BR')}
          style={{
            padding: '24px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--surface-hover)', border: '1px solid var(--surface-border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ fontSize: 36 }}>🇧🇷</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Marca Brasileira</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>INPI · Brasil</div>
        </button>
        <button
          onClick={() => onPick('US')}
          style={{
            padding: '24px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--surface-hover)', border: '1px solid var(--surface-border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ fontSize: 36 }}>🇺🇸</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Marca EUA</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>USPTO · United States</div>
        </button>
      </div>
    </Modal>
  )
}
