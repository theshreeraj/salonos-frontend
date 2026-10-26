// Fetch wrapper for the SalonOS API. Staff and customer sessions are kept separately because one browser
// can hold both (a salon owner booking their own haircut); every request carries whichever exist.
const BASE = import.meta.env.VITE_API_URL || '/api'

const TOKEN_KEYS = { staff: 'salonos:portal-token', customer: 'salonos:customer-token' }

export const tokens = {
  get(kind) {
    try {
      return localStorage.getItem(TOKEN_KEYS[kind])
    } catch {
      return null
    }
  },
  set(kind, value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEYS[kind], value)
      else localStorage.removeItem(TOKEN_KEYS[kind])
    } catch {
      // storage unavailable (private mode); the session lasts until the tab closes
    }
    window.dispatchEvent(new Event('salonos:auth'))
  },
}

export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const staff = tokens.get('staff')
  const customer = tokens.get('customer')
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(staff && { Authorization: `Bearer ${staff}` }),
        ...(customer && { 'X-Customer-Token': customer }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Can’t reach SalonOS right now. Check your connection and try again.', 0)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data ?? {})
  return data
}

export const get = (path) => api(path)
export const post = (path, body = {}) => api(path, { method: 'POST', body })
export const put = (path, body = {}) => api(path, { method: 'PUT', body })
export const patch = (path, body = {}) => api(path, { method: 'PATCH', body })

// Failures from actions nobody awaits are shown by <ErrorToast>
export function reportError(err) {
  window.dispatchEvent(new CustomEvent('salonos:error', { detail: err?.message ?? String(err) }))
}

// Runs an action; on failure reports it and resolves to `fallback` instead of throwing
export async function attempt(promise, fallback = null) {
  try {
    return await promise
  } catch (err) {
    reportError(err)
    return fallback
  }
}
