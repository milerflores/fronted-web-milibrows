import { addDays, dateFromKey, dateKey, startOfWeek, timeToMinutes } from './dates'
import { services, stylists } from './mockCatalogStore'
import { clients, staffPeople } from './mockPeopleStore'
import {
  getSession,
  getAccount,
  createClientAccount,
  createStaffAccount,
  getStaffAccounts,
  hasStylistAccount,
  setStaffAccountActive,
  validateNewAccount,
} from './mockAuthService'
import type { AccountSummary } from './mockAuthService'
import type {
  AgendaData,
  Appointment,
  AppointmentService,
  AppointmentStatus,
  CatalogResult,
  Client,
  ClientAppointment,
  ClientBookingInput,
  ClientBookingResult,
  ClientInput,
  ClientProfile,
  ClientRecordResult,
  ClientSelfProfile,
  CreatedAppointment,
  DemoActor,
  DemoClientAccount,
  DemoClientIdentity,
  NewAppointmentInput,
  RescheduleInput,
  Service,
  ServiceInput,
  Stylist,
  StylistInput,
} from './types'

const monday = startOfWeek(new Date())

function appointment(
  id: string,
  week: number,
  day: number,
  startTime: string,
  clientId: string,
  stylistId: string,
  status: AppointmentStatus,
  includedServices: Omit<AppointmentService, 'serviceName'>[],
  cancellationReason?: string,
): Appointment {
  return {
    id,
    date: dateKey(addDays(monday, week * 7 + day)),
    startTime,
    clientId,
    stylistId,
    status,
    services: includedServices.map((item) => ({
      ...item,
      serviceName: services.find((service) => service.id === item.serviceId)?.name ?? '',
    })),
    cancellationReason,
  }
}

const appointments: Appointment[] = [
  appointment('a01', -1, 0, '10:30', 'c1', 'eva', 'completada', [
    { serviceId: 'diseno', agreedPrice: 55, agreedDuration: 45 },
  ]),
  appointment('a02', -1, 1, '12:00', 'c2', 'scarlet', 'no asistió', [
    { serviceId: 'lifting', agreedPrice: 110, agreedDuration: 75 },
  ]),
  appointment('a03', -1, 2, '15:00', 'c3', 'kimberly', 'completada', [
    { serviceId: 'laminado', agreedPrice: 120, agreedDuration: 75 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment(
    'a04',
    -1,
    4,
    '11:00',
    'c4',
    'eva',
    'cancelada',
    [{ serviceId: 'perfilado', agreedPrice: 40, agreedDuration: 30 }],
    'La cliente solicitó reprogramar su visita.',
  ),
  appointment('a05', 0, 0, '10:30', 'c1', 'eva', 'confirmada', [
    { serviceId: 'diseno', agreedPrice: 55, agreedDuration: 45 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment('a06', 0, 0, '14:00', 'c5', 'scarlet', 'confirmada', [
    { serviceId: 'lifting', agreedPrice: 110, agreedDuration: 75 },
  ]),
  appointment('a07', 0, 1, '11:00', 'c2', 'kimberly', 'confirmada', [
    { serviceId: 'laminado', agreedPrice: 120, agreedDuration: 75 },
  ]),
  appointment('a08', 0, 1, '16:00', 'c6', 'eva', 'confirmada', [
    { serviceId: 'perfilado', agreedPrice: 40, agreedDuration: 30 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment('a09', 0, 2, '10:00', 'c3', 'scarlet', 'confirmada', [
    { serviceId: 'diseno', agreedPrice: 55, agreedDuration: 45 },
  ]),
  appointment('a10', 0, 2, '13:30', 'c7', 'eva', 'confirmada', [
    { serviceId: 'lifting', agreedPrice: 110, agreedDuration: 75 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment('a11', 0, 3, '11:30', 'c4', 'kimberly', 'confirmada', [
    { serviceId: 'diseno', agreedPrice: 55, agreedDuration: 45 },
    { serviceId: 'laminado', agreedPrice: 120, agreedDuration: 75 },
  ]),
  appointment(
    'a12',
    0,
    3,
    '17:00',
    'c8',
    'scarlet',
    'cancelada',
    [{ serviceId: 'perfilado', agreedPrice: 40, agreedDuration: 30 }],
    'La estilista no estará disponible en ese horario.',
  ),
  appointment('a13', 0, 4, '12:00', 'c5', 'eva', 'confirmada', [
    { serviceId: 'laminado', agreedPrice: 120, agreedDuration: 75 },
  ]),
  appointment('a14', 0, 4, '16:30', 'c6', 'kimberly', 'confirmada', [
    { serviceId: 'lifting', agreedPrice: 110, agreedDuration: 75 },
  ]),
  appointment('a15', 0, 5, '10:30', 'c7', 'scarlet', 'confirmada', [
    { serviceId: 'diseno', agreedPrice: 55, agreedDuration: 45 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment('a16', 1, 0, '11:00', 'c8', 'eva', 'confirmada', [
    { serviceId: 'perfilado', agreedPrice: 40, agreedDuration: 30 },
  ]),
  appointment('a17', 1, 2, '15:00', 'c2', 'kimberly', 'confirmada', [
    { serviceId: 'laminado', agreedPrice: 120, agreedDuration: 75 },
    { serviceId: 'tinte', agreedPrice: 45, agreedDuration: 30 },
  ]),
  appointment('a18', 1, 4, '13:00', 'c4', 'scarlet', 'confirmada', [
    { serviceId: 'lifting', agreedPrice: 110, agreedDuration: 75 },
  ]),
]

// Contrato asíncrono para sustituir esta fuente por la API sin cambiar la vista.
function snapshot(): AgendaData {
  return {
    clients: [...clients],
    stylists: [...stylists],
    services: [...services],
    appointments: [...appointments],
  }
}

function staffSnapshot(): AgendaData {
  const session = getSession()
  if (!session || session.role === 'cliente')
    throw new AgendaOperationError('Inicia sesión como personal para consultar la agenda.')
  const data = snapshot()
  if (session.role !== 'estilista') return data
  const visible = data.appointments.filter((item) => item.stylistId === session.stylistId)
  return {
    ...data,
    appointments: visible,
    clients: data.clients.filter((client) => visible.some((item) => item.clientId === client.id)),
    stylists: data.stylists.filter((item) => item.id === session.stylistId),
  }
}

export async function getAgendaData(): Promise<AgendaData> {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return staffSnapshot()
}

function staffMatches(actor: DemoActor): boolean {
  const session = getSession()
  return (
    !!session &&
    session.role === actor.role &&
    (actor.role !== 'estilista' || session.stylistId === actor.stylistId)
  )
}

function requireAdministrator(actor: DemoActor): void {
  if (actor.role !== 'administrador' || !staffMatches(actor))
    throw new AgendaOperationError('Solo el administrador puede gestionar este catálogo.')
}

export async function getServiceCatalog(actor: DemoActor): Promise<Service[]> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  requireAdministrator(actor)
  return [...services]
}

export async function getStylistCatalog(actor: DemoActor): Promise<Stylist[]> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  requireAdministrator(actor)
  return [...stylists]
}

function futureConfirmed(appointment: Appointment): boolean {
  if (appointment.status !== 'confirmada') return false
  const day = dateFromKey(appointment.date)
  const start = timeToMinutes(appointment.startTime)
  return (
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(start / 60), start % 60) >
    new Date()
  )
}

export function getCatalogFutureImpact(
  kind: 'service' | 'stylist',
  id: string,
  actor: DemoActor,
): number {
  requireAdministrator(actor)
  return appointments.filter(
    (item) =>
      futureConfirmed(item) &&
      (kind === 'stylist'
        ? item.stylistId === id
        : item.services.some((service) => service.serviceId === id)),
  ).length
}

export function getStylistAssignmentImpact(
  stylistId: string,
  removedServiceIds: string[],
  actor: DemoActor,
): number {
  requireAdministrator(actor)
  if (!removedServiceIds.length) return 0
  return appointments.filter(
    (item) =>
      futureConfirmed(item) &&
      item.stylistId === stylistId &&
      item.services.some((service) => removedServiceIds.includes(service.serviceId)),
  ).length
}

function validatedService(input: ServiceInput): Omit<Service, 'id' | 'active'> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const description = input.description.trim()
  if (!name) throw new AgendaOperationError('Ingresa el nombre del servicio.', 'name')
  if (name.length > 100)
    throw new AgendaOperationError('El nombre no puede superar 100 caracteres.', 'name')
  if (description.length > 500)
    throw new AgendaOperationError('La descripción no puede superar 500 caracteres.', 'description')
  if (!Number.isFinite(input.price) || input.price < 0)
    throw new AgendaOperationError('Ingresa un precio no negativo.', 'price')
  if (!Number.isSafeInteger(input.duration) || input.duration <= 0)
    throw new AgendaOperationError('Ingresa una duración positiva en minutos enteros.', 'duration')
  return { name, description, price: input.price, duration: input.duration }
}

let nextServiceId = 6
let nextStylistId = 4
let nextReceptionId = 1

export interface PersonnelAccountInput {
  role: 'recepcionista' | 'estilista'
  existingStylistId?: string
  name: string
  phone: string
  contactEmail: string
  specialty: string
  serviceIds: string[]
  accessEmail: string
  password: string
  confirmation: string
  active: boolean
}

export async function listPersonnelAccounts(actor: DemoActor): Promise<AccountSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  requireAdministrator(actor)
  return getStaffAccounts()
}

export async function addPersonnelAccount(
  input: PersonnelAccountInput,
  actor: DemoActor,
): Promise<{ account: AccountSummary; data: AgendaData }> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  requireAdministrator(actor)
  validateNewAccount(input.accessEmail, input.password, input.confirmation)
  if (input.role === 'estilista') {
    const existing = input.existingStylistId
      ? stylists.find((item) => item.id === input.existingStylistId)
      : null
    if (input.existingStylistId && !existing)
      throw new AgendaOperationError('Selecciona una estilista existente válida.')
    if (existing && hasStylistAccount(existing.id))
      throw new AgendaOperationError('Esta estilista ya tiene acceso.')
    const values = existing
      ? null
      : validatedStylist({
          name: input.name,
          phone: input.phone,
          email: input.contactEmail,
          specialty: input.specialty,
          serviceIds: input.serviceIds,
        })
    const stylistId = existing?.id ?? `stylist${nextStylistId}`
    const account = createStaffAccount(
      'estilista',
      stylistId,
      input.accessEmail,
      input.password,
      input.confirmation,
      input.active,
    )
    if (values) {
      stylists.push({ id: stylistId, active: input.active, ...values })
      nextStylistId += 1
    }
    return { account: getAccount(account.id)!, data: snapshot() }
  }
  const values = validatedClient({
    name: input.name,
    phone: input.phone,
    email: input.contactEmail,
  })
  const personId = `p-recepcion-${nextReceptionId}`
  const account = createStaffAccount(
    'recepcionista',
    personId,
    input.accessEmail,
    input.password,
    input.confirmation,
    input.active,
  )
  staffPeople.push({
    id: personId,
    name: values.name,
    phone: values.phone,
    contactEmail: values.email,
  })
  nextReceptionId += 1
  return { account: getAccount(account.id)!, data: snapshot() }
}

export async function changePersonnelAccountActive(
  id: string,
  active: boolean,
  actor: DemoActor,
): Promise<AccountSummary> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  requireAdministrator(actor)
  return setStaffAccountActive(id, active)
}

export async function saveService(
  input: ServiceInput,
  actor: DemoActor,
  serviceId?: string,
): Promise<CatalogResult<Service>> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  requireAdministrator(actor)
  const values = validatedService(input)
  const index = serviceId ? services.findIndex((item) => item.id === serviceId) : -1
  if (serviceId && index < 0) throw new AgendaOperationError('No se encontró el servicio.')
  const record: Service = {
    id: serviceId ?? `s${nextServiceId}`,
    active: index >= 0 ? services[index].active : true,
    ...values,
  }
  if (index >= 0) services[index] = record
  else {
    services.push(record)
    nextServiceId += 1
  }
  return { record, data: snapshot() }
}

function validatedStylist(input: StylistInput): Omit<Stylist, 'id' | 'active'> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = input.phone.trim()
  const email = input.email.trim()
  const specialty = input.specialty.trim()
  if (!name) throw new AgendaOperationError('Ingresa el nombre de la estilista.', 'name')
  if (name.length > 100)
    throw new AgendaOperationError('El nombre no puede superar 100 caracteres.', 'name')
  if (!phone && !email)
    throw new AgendaOperationError('Ingresa al menos un teléfono o correo de contacto.', 'phone')
  if (
    phone &&
    (!/^[+\d\s()-]+$/.test(phone) ||
      phone.replace(/\D/g, '').length < 7 ||
      phone.replace(/\D/g, '').length > 15)
  )
    throw new AgendaOperationError('Ingresa un teléfono válido de 7 a 15 dígitos.', 'phone')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AgendaOperationError('Ingresa un correo válido.', 'email')
  if (specialty.length > 200)
    throw new AgendaOperationError('La especialidad no puede superar 200 caracteres.', 'specialty')
  if (
    new Set(input.serviceIds).size !== input.serviceIds.length ||
    input.serviceIds.some((id) => !services.some((service) => service.id === id))
  )
    throw new AgendaOperationError('Selecciona servicios válidos.', 'serviceIds')
  return { name, phone, email, specialty, serviceIds: [...input.serviceIds] }
}

export async function saveStylist(
  input: StylistInput,
  actor: DemoActor,
  stylistId?: string,
): Promise<CatalogResult<Stylist>> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  requireAdministrator(actor)
  const values = validatedStylist(input)
  const index = stylistId ? stylists.findIndex((item) => item.id === stylistId) : -1
  if (stylistId && index < 0) throw new AgendaOperationError('No se encontró la estilista.')
  const record: Stylist = {
    id: stylistId ?? `stylist${nextStylistId}`,
    active: index >= 0 ? stylists[index].active : true,
    ...values,
  }
  if (index >= 0) stylists[index] = record
  else {
    stylists.push(record)
    nextStylistId += 1
  }
  return { record, data: snapshot() }
}

export async function setServiceActive(
  serviceId: string,
  active: boolean,
  actor: DemoActor,
): Promise<CatalogResult<Service>> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  requireAdministrator(actor)
  const index = services.findIndex((item) => item.id === serviceId)
  if (index < 0) throw new AgendaOperationError('No se encontró el servicio.')
  if (services[index].active === active)
    throw new AgendaOperationError('El servicio ya tiene ese estado.')
  const record = { ...services[index], active }
  services[index] = record
  return { record, data: snapshot() }
}

export async function setStylistActive(
  stylistId: string,
  active: boolean,
  actor: DemoActor,
): Promise<CatalogResult<Stylist>> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  requireAdministrator(actor)
  const index = stylists.findIndex((item) => item.id === stylistId)
  if (index < 0) throw new AgendaOperationError('No se encontró la estilista.')
  if (stylists[index].active === active)
    throw new AgendaOperationError('La estilista ya tiene ese estado.')
  const record = { ...stylists[index], active }
  stylists[index] = record
  return { record, data: snapshot() }
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

export function findClients(query: string): Client[] {
  if (getSession()?.role !== 'administrador' && getSession()?.role !== 'recepcionista') return []
  const nameQuery = normalized(query)
  const phoneQuery = digits(query)
  if (!nameQuery) return clients.slice(0, 8)
  return clients
    .filter(
      (client) =>
        normalized(client.name).includes(nameQuery) ||
        (phoneQuery.length >= 3 && digits(client.phone).includes(phoneQuery)),
    )
    .slice(0, 8)
}

export function findPossibleDuplicates(name: string, phone: string): Client[] {
  if (getSession()?.role !== 'administrador' && getSession()?.role !== 'recepcionista') return []
  const nameQuery = normalized(name)
  const phoneQuery = digits(phone)
  if (nameQuery.length < 3 && phoneQuery.length < 7) return []
  return clients
    .filter(
      (client) =>
        (nameQuery.length >= 3 && normalized(client.name).includes(nameQuery)) ||
        (phoneQuery.length >= 7 && digits(client.phone) === phoneQuery),
    )
    .slice(0, 5)
}

function canManageClients(actor: DemoActor): boolean {
  return staffMatches(actor) && (actor.role === 'administrador' || actor.role === 'recepcionista')
}

function validatedClient(input: ClientInput): Omit<Client, 'id'> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = input.phone.trim()
  const email = input.email.trim()
  const preferences = input.preferences?.trim() || undefined
  if (!name) throw new AgendaOperationError('Ingresa el nombre del cliente.', 'name')
  if (!phone) throw new AgendaOperationError('Ingresa el teléfono del cliente.', 'phone')
  if (!/^[+\d\s()-]+$/.test(phone) || digits(phone).length < 7 || digits(phone).length > 15)
    throw new AgendaOperationError('Ingresa un teléfono válido de 7 a 15 dígitos.', 'phone')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AgendaOperationError('Ingresa un correo válido o déjalo vacío.', 'email')
  if (name.length > 100)
    throw new AgendaOperationError('El nombre no puede superar 100 caracteres.', 'name')
  if (email.length > 120)
    throw new AgendaOperationError('El correo no puede superar 120 caracteres.', 'email')
  if (preferences && preferences.length > 500)
    throw new AgendaOperationError(
      'Las preferencias no pueden superar 500 caracteres.',
      'preferences',
    )
  return { name, phone, email, preferences }
}

export async function getClientList(actor: DemoActor): Promise<Client[]> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  if (!canManageClients(actor))
    throw new AgendaOperationError('Este perfil no puede consultar el listado de clientes.')
  return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function getClientProfile(
  clientId: string,
  actor: DemoActor,
  sourceAppointmentId?: string,
): Promise<ClientProfile> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  if (!staffMatches(actor))
    throw new AgendaOperationError('Inicia sesión con un perfil autorizado.')
  const client = clients.find((item) => item.id === clientId)
  if (!client) throw new AgendaOperationError('No se encontró el cliente.')
  if (
    actor.role === 'estilista' &&
    !appointments.some(
      (item) =>
        item.id === sourceAppointmentId &&
        item.clientId === clientId &&
        item.stylistId === actor.stylistId,
    )
  ) {
    throw new AgendaOperationError('Solo puedes consultar clientes desde una cita asignada a ti.')
  }
  const visible = appointments.filter(
    (item) =>
      item.clientId === clientId &&
      (actor.role !== 'estilista' || item.stylistId === actor.stylistId),
  )
  const now = new Date()
  const startsInFuture = (item: Appointment) => {
    const day = dateFromKey(item.date)
    const start = timeToMinutes(item.startTime)
    return (
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        Math.floor(start / 60),
        start % 60,
      ) > now
    )
  }
  const newestFirst = (a: Appointment, b: Appointment) =>
    b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
  return {
    client: { ...client },
    upcoming: visible
      .filter((item) => item.status === 'confirmada' && startsInFuture(item))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    completed: visible.filter((item) => item.status === 'completada').sort(newestFirst),
  }
}

export async function createClient(
  input: ClientInput,
  actor: DemoActor,
): Promise<ClientRecordResult> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  if (!canManageClients(actor))
    throw new AgendaOperationError('Este perfil no puede registrar clientes.')
  const client: Client = { id: `c${nextClientId}`, ...validatedClient(input) }
  clients.push(client)
  nextClientId += 1
  return { client, data: snapshot() }
}

export async function updateClient(
  clientId: string,
  input: ClientInput,
  actor: DemoActor,
): Promise<ClientRecordResult> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  if (!canManageClients(actor))
    throw new AgendaOperationError('Este perfil no puede editar clientes.')
  const index = clients.findIndex((item) => item.id === clientId)
  if (index < 0) throw new AgendaOperationError('No se encontró el cliente.')
  const client: Client = { id: clientId, ...validatedClient(input) }
  clients[index] = client
  return { client, data: snapshot() }
}

function selectedActiveServices(serviceIds: string[]): Service[] {
  if (!serviceIds.length || new Set(serviceIds).size !== serviceIds.length) return []
  const selected = serviceIds.map((id) =>
    services.find((service) => service.id === id && service.active),
  )
  return selected.every((service) => service !== undefined) ? (selected as Service[]) : []
}

export function getEligibleStylists(
  serviceIds: string[],
  allowInactiveServices = false,
): Stylist[] {
  if (
    !serviceIds.length ||
    (allowInactiveServices
      ? serviceIds.some((id) => !services.some((service) => service.id === id))
      : selectedActiveServices(serviceIds).length !== serviceIds.length)
  )
    return []
  return stylists.filter(
    (stylist) => stylist.active && serviceIds.every((id) => stylist.serviceIds.includes(id)),
  )
}

function availableStartTimes(
  date: string,
  stylistId: string,
  duration: number,
  excludeAppointmentId?: string,
): string[] {
  const day = dateFromKey(date)
  if (!date || dateKey(day) !== date || day.getDay() === 0 || duration <= 0 || duration > 720)
    return []

  const now = new Date()
  const slots: string[] = []
  for (let start = 600; start + duration <= 1320; start += 30) {
    const slotDate = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Math.floor(start / 60),
      start % 60,
    )
    if (slotDate <= now) continue
    const conflicts = appointments.some((item) => {
      if (
        item.id === excludeAppointmentId ||
        item.date !== date ||
        item.stylistId !== stylistId ||
        item.status === 'cancelada'
      )
        return false
      const occupiedStart = timeToMinutes(item.startTime)
      const occupiedEnd =
        occupiedStart + item.services.reduce((sum, service) => sum + service.agreedDuration, 0)
      return start < occupiedEnd && occupiedStart < start + duration
    })
    if (!conflicts)
      slots.push(
        `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      )
  }
  return slots
}

export function getAvailableStartTimes(
  date: string,
  stylistId: string,
  serviceIds: string[],
): string[] {
  const selected = selectedActiveServices(serviceIds)
  if (
    !selected.length ||
    selected.length !== serviceIds.length ||
    !getEligibleStylists(serviceIds).some((stylist) => stylist.id === stylistId)
  )
    return []
  return availableStartTimes(
    date,
    stylistId,
    selected.reduce((total, service) => total + service.duration, 0),
  )
}

export function canRescheduleAppointment(appointment: Appointment, actor: DemoActor): boolean {
  return (
    staffMatches(actor) &&
    appointment.status === 'confirmada' &&
    (actor.role === 'administrador' || actor.role === 'recepcionista')
  )
}

export function canCancelAppointment(appointment: Appointment, actor: DemoActor): boolean {
  return (
    staffMatches(actor) &&
    appointment.status === 'confirmada' &&
    (actor.role === 'administrador' ||
      actor.role === 'recepcionista' ||
      (actor.role === 'estilista' && actor.stylistId === appointment.stylistId))
  )
}

function hasStarted(appointment: Appointment): boolean {
  const day = dateFromKey(appointment.date)
  const start = timeToMinutes(appointment.startTime)
  return (
    new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Math.floor(start / 60),
      start % 60,
    ) <= new Date()
  )
}

export function canCompleteAppointment(appointment: Appointment, actor: DemoActor): boolean {
  return (
    staffMatches(actor) &&
    appointment.status === 'confirmada' &&
    hasStarted(appointment) &&
    actor.role === 'estilista' &&
    actor.stylistId === appointment.stylistId
  )
}

export function canMarkNoShow(appointment: Appointment, actor: DemoActor): boolean {
  return (
    staffMatches(actor) &&
    appointment.status === 'confirmada' &&
    hasStarted(appointment) &&
    (actor.role === 'administrador' ||
      actor.role === 'recepcionista' ||
      (actor.role === 'estilista' && actor.stylistId === appointment.stylistId))
  )
}

export function getRescheduleStartTimes(
  appointmentId: string,
  date: string,
  stylistId: string,
): string[] {
  if (getSession()?.role !== 'administrador' && getSession()?.role !== 'recepcionista') return []
  const appointment = appointments.find((item) => item.id === appointmentId)
  if (!appointment || appointment.status !== 'confirmada') return []
  const serviceIds = appointment.services.map((service) => service.serviceId)
  if (!getEligibleStylists(serviceIds, true).some((stylist) => stylist.id === stylistId)) return []
  const duration = appointment.services.reduce(
    (total, service) => total + service.agreedDuration,
    0,
  )
  return availableStartTimes(date, stylistId, duration, appointmentId)
}

export type AgendaField =
  | 'date'
  | 'startTime'
  | 'stylistId'
  | 'reason'
  | 'attendanceNotes'
  | 'name'
  | 'phone'
  | 'email'
  | 'preferences'
  | 'description'
  | 'price'
  | 'duration'
  | 'specialty'
  | 'serviceIds'

export class AgendaOperationError extends Error {
  field?: AgendaField

  constructor(message: string, field?: AgendaField) {
    super(message)
    this.field = field
  }
}

let nextClientId = 9
let nextAppointmentId = 19

async function createAppointmentRecord(
  input: NewAppointmentInput,
  origin: 'panel' | 'web',
  clientAccountId?: string,
  staffActor?: DemoActor,
): Promise<Appointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  if (origin === 'web') {
    const account = requireClientAccount(clientAccountId ?? '')
    if (input.client.kind !== 'existing' || input.client.clientId !== account.clientId)
      throw new AgendaOperationError('La reserva debe pertenecer a la cuenta que inició sesión.')
  }
  if (origin === 'panel' && (!staffActor || !canManageClients(staffActor)))
    throw new AgendaOperationError('Inicia sesión como administración o recepción para reservar.')

  const selected = selectedActiveServices(input.serviceIds)
  if (!selected.length || selected.length !== input.serviceIds.length)
    throw new AgendaOperationError('Selecciona al menos un servicio activo.', 'serviceIds')
  if (!getEligibleStylists(input.serviceIds).some((stylist) => stylist.id === input.stylistId))
    throw new AgendaOperationError(
      'Elige una estilista habilitada para todos los servicios.',
      'stylistId',
    )
  if (input.notes.trim().length > 500)
    throw new AgendaOperationError('Las observaciones no pueden superar 500 caracteres.')

  let clientId: string
  let newClient: Client | null = null
  if (input.client.kind === 'existing') {
    const existingClientId = input.client.clientId
    if (!clients.some((client) => client.id === existingClientId))
      throw new AgendaOperationError('Selecciona un cliente existente válido.')
    clientId = existingClientId
  } else {
    const validated = validatedClient(input.client)
    clientId = `c${nextClientId}`
    newClient = { id: clientId, ...validated }
  }

  if (
    !getAvailableStartTimes(input.date, input.stylistId, input.serviceIds).includes(input.startTime)
  ) {
    throw new AgendaOperationError(
      'El horario elegido ya no está disponible. Selecciona otra hora.',
      'startTime',
    )
  }

  const appointment: Appointment = {
    id: `a${nextAppointmentId}`,
    clientId,
    stylistId: input.stylistId,
    date: input.date,
    startTime: input.startTime,
    status: 'confirmada',
    origin,
    createdByClientAccountId: clientAccountId,
    services: selected.map((service) => ({
      serviceId: service.id,
      serviceName: service.name,
      agreedPrice: service.price,
      agreedDuration: service.duration,
    })),
    notes: input.notes.trim(),
  }
  if (newClient) {
    clients.push(newClient)
    nextClientId += 1
  }
  appointments.push(appointment)
  nextAppointmentId += 1
  return appointment
}

export async function createAppointment(
  input: NewAppointmentInput,
  actor: DemoActor,
): Promise<CreatedAppointment> {
  if (!canManageClients(actor))
    throw new AgendaOperationError('Este perfil no puede reservar para clientes.')
  const appointment = await createAppointmentRecord(input, 'panel', undefined, actor)
  return { appointment, data: snapshot() }
}

export async function createClientAppointment(
  input: ClientBookingInput,
  accountId: string,
): Promise<ClientBookingResult> {
  const account = requireClientAccount(accountId)
  const client = clients.find((item) => item.id === account.clientId)!
  const identity: DemoClientIdentity = {
    ...account,
    name: client.name,
    phone: client.phone,
    email: client.email,
  }
  const appointment = await createAppointmentRecord(
    { ...input, client: { kind: 'existing', clientId: account.clientId } },
    'web',
    account.id,
  )
  return { appointment, client: identity }
}

export async function registerPublicClient(
  input: ClientInput,
  accessEmail: string,
  password: string,
  confirmation: string,
): Promise<DemoClientIdentity> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  if (getSession()) throw new AgendaOperationError('Ya hay una sesión iniciada.')
  const values = validatedClient(input)
  validateNewAccount(accessEmail, password, confirmation)
  const client: Client = { id: `c${nextClientId}`, ...values }
  clients.push(client)
  nextClientId += 1
  const account = createClientAccount(client.id, accessEmail, password, confirmation)
  return {
    id: account.id,
    role: 'cliente',
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
  }
}

function requireClientAccount(accountId: string): DemoClientAccount {
  const session = getSession()
  const account = getAccount(accountId)
  if (
    !session ||
    session.role !== 'cliente' ||
    session.id !== accountId ||
    account?.role !== 'cliente' ||
    !account.active ||
    !account.clientId ||
    !clients.some((client) => client.id === account.clientId)
  )
    throw new AgendaOperationError('Inicia sesión como titular de esta cuenta.')
  return { id: account.id, role: 'cliente', clientId: account.clientId }
}

function publicAppointment(appointment: Appointment): ClientAppointment {
  return {
    id: appointment.id,
    clientId: appointment.clientId,
    stylistId: appointment.stylistId,
    stylistName: stylists.find((item) => item.id === appointment.stylistId)?.name ?? 'Estilista',
    date: appointment.date,
    startTime: appointment.startTime,
    status: appointment.status,
    services: appointment.services.map((service) => ({ ...service })),
    notes: appointment.notes,
    cancellationReason: appointment.cancellationReason,
  }
}

export async function getClientSelfProfile(accountId: string): Promise<ClientSelfProfile> {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const account = requireClientAccount(accountId)
  const client = clients.find((item) => item.id === account.clientId)!
  const completed = appointments
    .filter((item) => item.clientId === account.clientId && item.status === 'completada')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
    .map(publicAppointment)
  return {
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      preferences: client.preferences,
    },
    completed,
  }
}

export async function updateClientSelfProfile(
  input: ClientInput,
  accountId: string,
): Promise<Client> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const account = requireClientAccount(accountId)
  const validated = validatedClient(input)
  const index = clients.findIndex((item) => item.id === account.clientId)
  const updated: Client = { id: account.clientId, ...validated }
  clients[index] = updated
  return { ...updated }
}

export async function getClientAppointments(accountId: string): Promise<ClientAppointment[]> {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const account = requireClientAccount(accountId)
  return appointments.filter((item) => item.clientId === account.clientId).map(publicAppointment)
}

function ownFutureAppointment(
  appointmentId: string,
  accountId: string,
): { appointment: Appointment; account: DemoClientAccount; index: number } {
  const account = requireClientAccount(accountId)
  const index = appointments.findIndex((item) => item.id === appointmentId)
  const appointment = appointments[index]
  if (!appointment || appointment.clientId !== account.clientId)
    throw new AgendaOperationError('Esta cita no pertenece al cliente seleccionado.')
  if (appointment.status !== 'confirmada' || hasStarted(appointment))
    throw new AgendaOperationError(
      'Solo puedes modificar citas confirmadas cuyo inicio aún no haya llegado.',
    )
  return { appointment, account, index }
}

export function getClientRescheduleIssue(appointmentId: string, accountId: string): string | null {
  let appointment: Appointment
  try {
    appointment = ownFutureAppointment(appointmentId, accountId).appointment
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'No se puede reprogramar esta cita.'
  }
  const serviceIds = appointment.services.map((service) => service.serviceId)
  if (selectedActiveServices(serviceIds).length !== serviceIds.length)
    return 'Uno de los servicios de esta cita ya no está activo. Contacta al estudio para resolverla.'
  if (!getEligibleStylists(serviceIds).some((item) => item.id === appointment.stylistId))
    return 'La estilista ya no está activa o habilitada para todos estos servicios. Contacta al estudio.'
  return null
}

export function getClientRescheduleStartTimes(
  appointmentId: string,
  date: string,
  accountId: string,
): string[] {
  if (getClientRescheduleIssue(appointmentId, accountId)) return []
  const appointment = appointments.find((item) => item.id === appointmentId)!
  const duration = appointment.services.reduce(
    (total, service) => total + service.agreedDuration,
    0,
  )
  return availableStartTimes(date, appointment.stylistId, duration, appointmentId)
}

export async function rescheduleClientAppointment(
  appointmentId: string,
  date: string,
  startTime: string,
  accountId: string,
): Promise<ClientAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const { appointment, account, index } = ownFutureAppointment(appointmentId, accountId)
  const issue = getClientRescheduleIssue(appointmentId, accountId)
  if (issue) throw new AgendaOperationError(issue)
  if (appointment.date === date && appointment.startTime === startTime)
    throw new AgendaOperationError('No hay cambios que guardar.', 'startTime')
  const day = dateFromKey(date)
  if (!date || dateKey(day) !== date || day.getDay() === 0 || date < dateKey(new Date()))
    throw new AgendaOperationError('Elige una fecha futura de lunes a sábado.', 'date')
  if (!getClientRescheduleStartTimes(appointmentId, date, accountId).includes(startTime))
    throw new AgendaOperationError(
      'Ese horario ya no está disponible. Elige otra hora.',
      'startTime',
    )
  const updated: Appointment = {
    ...appointment,
    date,
    startTime,
    rescheduledAt: new Date().toISOString(),
    rescheduledBy: { ...account },
  }
  appointments[index] = updated
  return publicAppointment(updated)
}

export async function cancelClientAppointment(
  appointmentId: string,
  reason: string,
  accountId: string,
): Promise<ClientAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const { appointment, account, index } = ownFutureAppointment(appointmentId, accountId)
  const trimmedReason = reason.trim()
  if (trimmedReason.length > 500)
    throw new AgendaOperationError('El motivo no puede superar 500 caracteres.', 'reason')
  const updated: Appointment = {
    ...appointment,
    status: 'cancelada',
    cancellationReason: trimmedReason || undefined,
    cancelledAt: new Date().toISOString(),
    cancelledBy: { ...account },
  }
  appointments[index] = updated
  return publicAppointment(updated)
}

export async function rescheduleAppointment(
  input: RescheduleInput,
  actor: DemoActor,
): Promise<CreatedAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const index = appointments.findIndex((item) => item.id === input.appointmentId)
  const current = appointments[index]
  if (!current || !canRescheduleAppointment(current, actor))
    throw new AgendaOperationError('Este perfil no puede reprogramar la cita.')
  if (
    current.date === input.date &&
    current.startTime === input.startTime &&
    current.stylistId === input.stylistId
  )
    throw new AgendaOperationError('No hay cambios que guardar.')

  const serviceIds = current.services.map((service) => service.serviceId)
  if (!getEligibleStylists(serviceIds, true).some((stylist) => stylist.id === input.stylistId)) {
    throw new AgendaOperationError(
      'Elige una estilista habilitada para todos los servicios.',
      'stylistId',
    )
  }
  const day = dateFromKey(input.date)
  if (
    !input.date ||
    dateKey(day) !== input.date ||
    day.getDay() === 0 ||
    input.date < dateKey(new Date())
  ) {
    throw new AgendaOperationError(
      'Elige una fecha de lunes a sábado que no esté en el pasado.',
      'date',
    )
  }
  if (!getRescheduleStartTimes(current.id, input.date, input.stylistId).includes(input.startTime)) {
    throw new AgendaOperationError(
      'Ese horario ya no está disponible. Elige otra hora.',
      'startTime',
    )
  }

  const updated: Appointment = {
    ...current,
    date: input.date,
    startTime: input.startTime,
    stylistId: input.stylistId,
    rescheduledAt: new Date().toISOString(),
    rescheduledBy: { ...actor },
  }
  appointments[index] = updated
  return { appointment: updated, data: snapshot() }
}

export async function cancelAppointment(
  appointmentId: string,
  reason: string,
  actor: DemoActor,
): Promise<CreatedAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const index = appointments.findIndex((item) => item.id === appointmentId)
  const current = appointments[index]
  if (!current || !canCancelAppointment(current, actor))
    throw new AgendaOperationError('Este perfil no puede cancelar la cita.')
  const trimmedReason = reason.trim()
  if (!trimmedReason) throw new AgendaOperationError('Escribe el motivo de cancelación.', 'reason')

  const updated: Appointment = {
    ...current,
    status: 'cancelada',
    cancellationReason: trimmedReason,
    cancelledAt: new Date().toISOString(),
    cancelledBy: { ...actor },
  }
  appointments[index] = updated
  return { appointment: updated, data: staffSnapshot() }
}

export async function completeAppointment(
  appointmentId: string,
  notes: string,
  actor: DemoActor,
): Promise<CreatedAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const index = appointments.findIndex((item) => item.id === appointmentId)
  const current = appointments[index]
  if (!current || !canCompleteAppointment(current, actor)) {
    throw new AgendaOperationError(
      'Solo la estilista asignada puede completar una cita confirmada cuyo horario ya inició.',
    )
  }
  const trimmedNotes = notes.trim()
  if (trimmedNotes.length > 500)
    throw new AgendaOperationError(
      'La observación no puede superar 500 caracteres.',
      'attendanceNotes',
    )

  const updated: Appointment = {
    ...current,
    status: 'completada',
    completedAt: new Date().toISOString(),
    completedBy: { ...actor },
    completionNotes: trimmedNotes || undefined,
  }
  appointments[index] = updated
  return { appointment: updated, data: staffSnapshot() }
}

export async function markNoShow(
  appointmentId: string,
  notes: string,
  actor: DemoActor,
): Promise<CreatedAppointment> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const index = appointments.findIndex((item) => item.id === appointmentId)
  const current = appointments[index]
  if (!current || !canMarkNoShow(current, actor)) {
    throw new AgendaOperationError(
      'Este perfil no puede registrar inasistencia en una cita confirmada cuyo horario aún no inició.',
    )
  }
  const trimmedNotes = notes.trim()
  if (trimmedNotes.length > 500)
    throw new AgendaOperationError(
      'La observación no puede superar 500 caracteres.',
      'attendanceNotes',
    )

  const updated: Appointment = {
    ...current,
    status: 'no asistió',
    noShowAt: new Date().toISOString(),
    noShowBy: { ...actor },
    noShowNotes: trimmedNotes || undefined,
  }
  appointments[index] = updated
  return { appointment: updated, data: staffSnapshot() }
}
