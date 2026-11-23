const baseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string[]>
  readonly field?: string

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    const names: Record<string, string> = {
      nombre: 'firstName',
      apellido_paterno: 'paternalLastName',
      apellido_materno: 'maternalLastName',
      nombre_completo: 'firstName',
      telefono: 'phone',
      correo_contacto: 'email',
      preferencias: 'preferences',
      motivo: 'reason',
      fecha: 'date',
      fecha_inicio: 'startTime',
    }
    const first = Object.keys(fields)[0]
    this.field = names[first] ?? first
  }
}

interface Envelope<T> {
  datos: T
  meta?: { pagina: number; total: number; ultima_pagina?: number }
}

function csrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : undefined
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const writing = method !== 'GET'
  if (writing && !csrfToken()) await request('/acceso/cookie-csrf')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (writing && csrfToken()) headers['X-XSRF-TOKEN'] = csrfToken()!
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal: AbortSignal.timeout(30_000),
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(
        0,
        'El servidor tardó demasiado. Actualiza la información para comprobar el resultado de la operación.',
      )
    }
    throw new ApiError(
      0,
      'No se pudo conectar con el estudio. Comprueba tu conexión e intenta nuevamente.',
    )
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('milibrows:unauthorized'))
    if (response.status === 419) await request('/acceso/cookie-csrf')
    const fields = data?.errores ?? {}
    const details = Object.values(fields).flat().join(' ')
    throw new ApiError(
      response.status,
      details || data?.mensaje || 'No se pudo completar la operación.',
      fields,
    )
  }
  if (data === null) throw new ApiError(502, 'La API devolvió una respuesta inválida.')
  return data as T
}

export async function resource<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return (await request<Envelope<T>>(path, method, body)).datos
}

export function apiAssetUrl(path: string): string {
  return new URL(path, new URL(baseUrl, window.location.origin).origin).toString()
}

export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let page = 1
  while (true) {
    const response = await request<Envelope<T[]>>(
      `${path}${path.includes('?') ? '&' : '?'}pagina=${page}`,
    )
    items.push(...response.datos)
    if (!response.meta || items.length >= response.meta.total || response.datos.length === 0)
      return items
    page++
  }
}
