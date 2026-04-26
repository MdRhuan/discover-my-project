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

// Silence noisy logs in CI
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})
