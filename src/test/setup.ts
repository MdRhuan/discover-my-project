import '@testing-library/jest-dom'
import { vi } from 'vitest'

// matchMedia stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// ResizeObserver stub (used by reactflow / charts)
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = RO

// IntersectionObserver stub
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
;(globalThis as any).IntersectionObserver = IO

// scrollIntoView stub
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// URL.createObjectURL stub
if (!('createObjectURL' in URL)) {
  ;(URL as any).createObjectURL = () => 'blob:mock'
}

// Global fetch stub — prevents real network calls (e.g. currency API in
// FixedExpensesPage) from hanging the test environment.
;(globalThis as any).fetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
  headers: new Headers(),
})) as unknown as typeof fetch

// Keep console.error visible so test failures show real stack traces.
// Silence only React's noisy "not wrapped in act" / lifecycle warnings.
const _origWarn = console.warn
vi.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
  const msg = String(args[0] ?? '')
  if (msg.includes('not wrapped in act') || msg.includes('componentWillMount')) return
  _origWarn(...args)
})
