import { ApiError, request, resource } from '../api/http'
import type { ProfileDto } from '../api/types'

export type AccountRole = 'cliente' | 'administrador' | 'recepcionista' | 'estilista'
export interface Session {
  id: string
  role: AccountRole
  personId: string
  name: string
  accessEmail: string
  clientId?: string
  stylistId?: string
  mfaRequired: boolean
  mfaConfigured: boolean
}

const roles = {
  administracion: 'administrador',
  recepcion: 'recepcionista',
  estilista: 'estilista',
  cliente: 'cliente',
} as const
let snapshot: { session: Session | null; loading: boolean; error: string } = {
  session: null,
  loading: true,
  error: '',
}
let restoring: Promise<void> | undefined
let changingSession = false
let sessionRevision = 0
const listeners = new Set<() => void>()
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('milibrows-access')

export function mapSession(profile: ProfileDto, mfaRequired = false): Session {
  const role = profile.roles.find((value) => value !== 'cliente') ?? profile.roles[0]
  if (!role) throw new Error('Esta cuenta no tiene un rol autorizado.')
  return {
    id: String(profile.id),
    role: roles[role],
    personId: String(profile.persona?.id ?? ''),
    name: profile.persona?.nombre_completo ?? profile.correo,
    accessEmail: profile.correo,
    clientId: profile.id_cliente === null ? undefined : String(profile.id_cliente),
    stylistId: profile.id_empleado === null ? undefined : String(profile.id_empleado),
    mfaRequired,
    mfaConfigured: profile.segundo_factor_configurado,
  }
}

function publish(session: Session | null, error = '') {
  snapshot = { session, loading: false, error }
  listeners.forEach((listener) => listener())
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getAuthSnapshot() {
  return snapshot
}
export function restoreSession(force = false): Promise<void> {
  if (changingSession) return Promise.resolve()
  if (snapshot.session?.mfaRequired && !force) return Promise.resolve()
  if (restoring) return restoring
  const revision = sessionRevision
  restoring = resource<ProfileDto>('/mi-perfil')
    .then((profile) => {
      if (revision !== sessionRevision) return
      publish(mapSession(profile))
    })
    .catch((error: unknown) => {
      if (revision !== sessionRevision) return
      if (error instanceof ApiError && error.status === 401) publish(null)
      else if (error instanceof ApiError && error.status === 403)
        publish(null, 'Inicia sesión para verificar tu acceso y segundo factor.')
      else
        publish(
          snapshot.session,
          error instanceof Error ? error.message : 'No se pudo recuperar la sesión.',
        )
    })
    .finally(() => {
      restoring = undefined
    })
  return restoring
}

export async function signIn(
  email: string,
  password: string,
  area: 'client' | 'admin',
): Promise<Session> {
  await restoring
  changingSession = true
  sessionRevision++
  try {
    const result = await request<{ datos: ProfileDto; requiere_segundo_factor: boolean }>(
      '/acceso/iniciar-sesion',
      'POST',
      {
        correo: email.trim(),
        contrasena: password,
      },
    )
    const session = mapSession(result.datos, result.requiere_segundo_factor)
    publish(session)
    channel?.postMessage('changed')
    if (area === 'client' && session.role !== 'cliente')
      throw new Error('Tu sesión corresponde al personal. Accede desde el panel interno.')
    if (area === 'admin' && session.role === 'cliente')
      throw new Error('Tu sesión corresponde al portal de clientes.')
    return session
  } finally {
    changingSession = false
  }
}

export async function signOut(): Promise<void> {
  await restoring
  changingSession = true
  sessionRevision++
  try {
    await request('/acceso/cerrar-sesion', 'POST')
    publish(null)
    channel?.postMessage('changed')
  } finally {
    changingSession = false
  }
}

export async function finishMfa() {
  await restoreSession(true)
  if (!snapshot.session || snapshot.session.mfaRequired || snapshot.error) {
    throw new Error(snapshot.error || 'Vuelve a iniciar sesión para verificar tu acceso.')
  }
  channel?.postMessage('changed')
}

window.addEventListener('milibrows:unauthorized', () => {
  sessionRevision++
  publish(null)
})
channel?.addEventListener('message', () => {
  void restoreSession()
})
