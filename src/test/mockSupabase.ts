import { vi } from 'vitest'

/**
 * Build a chainable Supabase query mock that resolves to { data: [], error: null }.
 * Supports the chained method calls used throughout the codebase (select, eq, in,
 * order, limit, maybeSingle, single, range, etc.) and direct awaiting.
 */
function makeQuery(result: any = { data: [], error: null }) {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: any) => any) => Promise.resolve(result).then(resolve)
      }
      if (prop === 'catch') {
        return (reject: (v: any) => any) => Promise.resolve(result).catch(reject)
      }
      // Special terminators that resolve to a single record
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => Promise.resolve({ data: null, error: null })
      }
      // Any other method returns the same chainable proxy
      return () => proxy
    },
  }
  const proxy: any = new Proxy(function () {}, handler)
  return proxy
}

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
      },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: () => {} } },
    })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
  },
  from: vi.fn(() => makeQuery({ data: [], error: null })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://mock' },
        error: null,
      }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock' } })),
    })),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: () => {} }),
  })),
  removeChannel: vi.fn(),
}
