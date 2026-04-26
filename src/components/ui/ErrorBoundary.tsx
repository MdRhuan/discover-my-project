'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  resetKey?: string | number
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
    this.setState({ info })
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, info: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <div className="card" style={{ borderColor: 'var(--red)', background: 'rgba(239,68,68,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <i className="fas fa-triangle-exclamation" style={{ fontSize: 22, color: 'var(--red)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Erro ao renderizar a página</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Recarregue a página ou navegue para outra seção.
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', background: 'var(--surface-card)', padding: 10, borderRadius: 6, marginBottom: 8, color: 'var(--red)' }}>
              {this.state.error.name}: {this.state.error.message}
            </div>
            {this.state.info?.componentStack && (
              <details style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <summary style={{ cursor: 'pointer', marginBottom: 6 }}>Stack do componente</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 10, maxHeight: 240, overflow: 'auto' }}>
                  {this.state.info.componentStack}
                </pre>
              </details>
            )}
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => this.setState({ error: null, info: null })}
            >
              <i className="fas fa-rotate" />Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
