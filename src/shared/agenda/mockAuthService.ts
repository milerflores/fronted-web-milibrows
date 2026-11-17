import { stylists } from './mockCatalogStore'
import { clients, staffPeople } from './mockPeopleStore'

export type AccountRole = 'cliente' | 'administrador' | 'recepcionista' | 'estilista'
export interface Session {
  id: string
  role: AccountRole
  personId: string
  name: string
  accessEmail: string
  clientId?: string
  stylistId?: string
}
export interface AccountSummary extends Session {
  active: boolean
}
interface AccountRecord {
  id: string
  role: AccountRole
  personId: string
  accessEmail: string
  password: string
  active: boolean
}

// Credenciales ficticias. Este módulo se reinicia con cada carga y nunca persiste contraseñas.
export const valeriaDemoCredentials = {
  email: 'valeria@milibrows.com',
  password: '12345678',
} as const

const accounts: AccountRecord[] = [
  {
    id: 'admin-inicial',
    role: 'administrador',
    personId: 'p-admin',
    accessEmail: 'admin@milibrows.com',
    password: '12345678',
    active: true,
  },
  {
    id: 'recepcion-inicial',
    role: 'recepcionista',
    personId: 'p-recepcion',
    accessEmail: 'recepcion@milibrows.com',
    password: '12345678',
    active: true,
  },
  {
    id: 'estilista-eva',
    role: 'estilista',
    personId: 'eva',
    accessEmail: 'eva@milibrows.com',
    password: '12345678',
    active: true,
  },
  {
    id: 'estilista-scarlet',
    role: 'estilista',
    personId: 'scarlet',
    accessEmail: 'scarlet@milibrows.pe',
    password: '12345678',
    active: true,
  },
  {
    id: 'estilista-kimberly',
    role: 'estilista',
    personId: 'kimberly',
    accessEmail: 'kimberly@milibrows.pe',
    password: '12345678',
    active: true,
  },
  {
    id: 'cuenta-valeria',
    role: 'cliente',
    personId: 'c1',
    accessEmail: valeriaDemoCredentials.email,
    password: valeriaDemoCredentials.password,
    active: true,
  },
  {
    id: 'cuenta-camila',
    role: 'cliente',
    personId: 'c2',
    accessEmail: 'camila@acceso.milibrows.pe',
    password: 'Demo2026!',
    active: true,
  },
  {
    id: 'cuenta-lucia',
    role: 'cliente',
    personId: 'c3',
    accessEmail: 'lucia@acceso.milibrows.pe',
    password: 'Demo2026!',
    active: true,
  },
]
let sessionId: string | null = null
let nextAccountId = 1

function identity(account: AccountRecord): AccountSummary {
  const person =
    account.role === 'cliente'
      ? clients.find((item) => item.id === account.personId)
      : account.role === 'estilista'
        ? stylists.find((item) => item.id === account.personId)
        : staffPeople.find((item) => item.id === account.personId)
  return {
    id: account.id,
    role: account.role,
    personId: account.personId,
    name: person?.name ?? 'Sin identificar',
    accessEmail: account.accessEmail,
    active: account.active,
    ...(account.role === 'cliente' ? { clientId: account.personId } : {}),
    ...(account.role === 'estilista' ? { stylistId: account.personId } : {}),
  }
}

export function getSession(): Session | null {
  const account = accounts.find((item) => item.id === sessionId && item.active)
  return account ? identity(account) : null
}

export function getAccount(id: string): AccountSummary | null {
  if (sessionId !== id && getSession()?.role !== 'administrador') return null
  const account = accounts.find((item) => item.id === id)
  return account ? identity(account) : null
}

export function signOut(): void {
  sessionId = null
}

export async function signIn(
  email: string,
  password: string,
  area: 'client' | 'admin',
): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const account = accounts.find(
    (item) =>
      item.accessEmail.toLowerCase() === email.trim().toLowerCase() && item.password === password,
  )
  if (
    !account ||
    !account.active ||
    (area === 'client' ? account.role !== 'cliente' : account.role === 'cliente')
  )
    throw new Error('Correo o contraseña incorrectos, o cuenta inactiva para este acceso.')
  sessionId = account.id
  return identity(account)
}

export function validateNewAccount(email: string, password: string, confirmation: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 120)
    throw new Error('Ingresa un correo de acceso válido.')
  if (accounts.some((item) => item.accessEmail === normalized))
    throw new Error('Este correo de acceso ya está registrado.')
  if (password.length < 8 || password.length > 100)
    throw new Error('La contraseña debe tener entre 8 y 100 caracteres.')
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
  return normalized
}

export function createClientAccount(
  clientId: string,
  email: string,
  password: string,
  confirmation: string,
): Session {
  const normalized = validateNewAccount(email, password, confirmation)
  const account: AccountRecord = {
    id: `cuenta-nueva-${nextAccountId++}`,
    role: 'cliente',
    personId: clientId,
    accessEmail: normalized,
    password,
    active: true,
  }
  accounts.push(account)
  sessionId = account.id
  return identity(account)
}

export function createStaffAccount(
  role: 'recepcionista' | 'estilista',
  personId: string,
  email: string,
  password: string,
  confirmation: string,
  active: boolean,
): AccountSummary {
  if (getSession()?.role !== 'administrador')
    throw new Error('Solo el administrador puede crear cuentas del personal.')
  if (accounts.some((item) => item.role === role && item.personId === personId))
    throw new Error('Esta persona ya tiene una cuenta de acceso.')
  const normalized = validateNewAccount(email, password, confirmation)
  const account: AccountRecord = {
    id: `personal-${nextAccountId++}`,
    role,
    personId,
    accessEmail: normalized,
    password,
    active,
  }
  accounts.push(account)
  return identity(account)
}

export function getStaffAccounts(): AccountSummary[] {
  if (getSession()?.role !== 'administrador')
    throw new Error('Solo el administrador puede consultar cuentas del personal.')
  return accounts.filter((item) => item.role !== 'cliente').map(identity)
}

export function setStaffAccountActive(id: string, active: boolean): AccountSummary {
  if (getSession()?.role !== 'administrador')
    throw new Error('Solo el administrador puede cambiar cuentas del personal.')
  const account = accounts.find((item) => item.id === id && item.role !== 'cliente')
  if (!account) throw new Error('No se encontró la cuenta.')
  if (account.id === sessionId && !active) throw new Error('No puedes desactivar tu propia sesión.')
  account.active = active
  return identity(account)
}

export function hasStylistAccount(stylistId: string): boolean {
  if (getSession()?.role !== 'administrador')
    throw new Error('Solo el administrador puede consultar cuentas del personal.')
  return accounts.some((item) => item.role === 'estilista' && item.personId === stylistId)
}
