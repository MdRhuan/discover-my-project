'use client'

import { useApp } from '@/context/AppContext'

export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={t.type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'} />
          {t.msg}
        </div>
      ))}
    </div>
  )
}
