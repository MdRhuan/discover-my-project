'use client'

import React from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  large?: boolean
}

export function Modal({ title, onClose, children, footer, large }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${large ? 'modal-lg' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  msg: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ msg, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ fontSize: 16 }}>
          <i className="fas fa-exclamation-triangle" style={{ color: 'var(--yellow)', marginRight: 8 }} />
          Confirmar
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px', fontSize: 14 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
