import { useAuthStore } from '@/stores/auth'
import router from '@/router'

/** Typed error thrown by `apiFetch` when the server returns `{ status: "error" }`. */
export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * Core fetch wrapper that:
 * - Unwraps the `{ status, data }` envelope, returning `data` directly.
 * - Injects a `Bearer` token for any path under `/admin`.
 * - On a 401 from an admin endpoint, clears auth state and redirects to login.
 * - Returns `undefined` (cast to T) for 204 / empty-body responses.
 * - Throws `ApiError` on `{ status: "error" }` responses.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  if (path.startsWith('/admin')) {
    const token = useAuthStore().token
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  // 204 No Content and other empty responses (e.g. DELETE) have no body to parse.
  const text = await res.text()
  if (!text) return undefined as T

  const body = JSON.parse(text)

  if (body.status === 'error') {
    if (res.status === 401 && path.startsWith('/admin')) {
      useAuthStore().clear()
      router.push('/admin/login')
    }
    throw new ApiError(body.code, body.message)
  }

  return body.data as T
}

/**
 * Paginated variant of `apiFetch`. Serialises `params` as a query string,
 * then unwraps the inner `{ data, nextCursor, hasMore }` envelope so callers
 * receive `{ items, nextCursor, hasMore }` — a shape `usePagination` expects.
 */
export async function apiFetchPaginated<T>(
  path: string,
  params: object,
  init: RequestInit = {},
): Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }> {
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) qs.set(key, String(val))
  }
  const query = qs.toString()
  const pathWithQuery = query ? `${path}?${query}` : path

  const res = await apiFetch<{ data: T[]; nextCursor: string | null; hasMore: boolean }>(
    pathWithQuery,
    init,
  )

  return { items: res.data, nextCursor: res.nextCursor, hasMore: res.hasMore }
}
