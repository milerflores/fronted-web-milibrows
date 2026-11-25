import { allPages, ApiError, apiAssetUrl, resource } from '../api/http'
import type {
  AppointmentDto,
  ClientDto,
  ProfileDto,
  PublicStylistDto,
  ServiceDto,
} from '../api/types'
import { appointmentIso, studioDateTime } from './dates'
import type {
  Appointment,
  Client,
  ClientInput,
  ClientProfile,
  CreatedAppointment,
  Actor,
  PublicStylist,
  Service,
} from './types'

export { ApiError as AgendaOperationError } from '../api/http'

export function mapService(service: ServiceDto): Service {
  return {
    id: String(service.id),
    description: service.descripcion ?? undefined,
    imageUrl: service.imagen_url ? apiAssetUrl(service.imagen_url) : undefined,
    name: service.nombre,
    price: Number(service.precio),
    duration: service.duracion_minutos,
    active: service.activo,
    visible: service.visible_al_publico,
  }
}

export function mapPublicStylist(stylist: PublicStylistDto): PublicStylist {
  return {
    id: String(stylist.id),
    name: stylist.nombre_completo,
    specialty: stylist.cargo || undefined,
    imageUrl: stylist.imagen_url ? apiAssetUrl(stylist.imagen_url) : undefined,
    serviceIds: stylist.ids_servicios.map(String),
  }
}

export function mapClient(client: ClientDto): Client {
  return {
    id: String(client.id),
    dni: client.persona.dni ?? '',
    name: client.persona.nombre_completo,
    firstName: client.persona.nombre,
    paternalLastName: client.persona.apellido_paterno,
    maternalLastName: client.persona.apellido_materno ?? '',
    phone: client.persona.telefono ?? '',
    email: client.persona.correo_contacto ?? '',
    preferences: client.preferencias ?? '',
    active: client.activo,
  }
}

export function profileClient(profile: ProfileDto): Client {
  return {
    id: String(profile.id_cliente ?? ''),
    dni: profile.persona?.dni ?? '',
    name: profile.persona?.nombre_completo ?? '',
    firstName: profile.persona?.nombre ?? '',
    paternalLastName: profile.persona?.apellido_paterno ?? '',
    maternalLastName: profile.persona?.apellido_materno ?? '',
    phone: profile.persona?.telefono ?? '',
    email: profile.persona?.correo_contacto ?? '',
    preferences: profile.persona?.cliente?.preferencias ?? '',
    active: profile.persona?.cliente?.activo ?? true,
  }
}

export function mapAppointment(cita: AppointmentDto): Appointment {
  const firstStart = cita.servicios[0]?.hora_inicio?.slice(0, 5) ?? '00:00'
  const startsAt = cita.fecha_inicio ?? appointmentIso(cita.fecha, firstStart)
  const starts = studioDateTime(startsAt)
  const services = cita.servicios.map((service) => ({
    id: String(service.id),
    serviceId: String(service.id_servicio),
    stylistId: String(service.id_empleado),
    stylistName: service.estilista ?? `Estilista ${service.id_empleado}`,
    startTime: service.hora_inicio.slice(0, 5),
    serviceName: service.nombre_servicio_acordado,
    listPrice: Number(service.precio_lista),
    automaticDiscount: Number(service.monto_descuento_automatico),
    agreedPrice: Number(service.precio_acordado),
    agreedDuration: service.duracion_minutos,
    result: service.estado_servicio,
    resultReason: service.motivo_estado_servicio ?? undefined,
    manualDiscount: service.descuento_manual
      ? {
          amount: Number(service.descuento_manual.monto),
          reason: service.descuento_manual.motivo ?? undefined,
          note: service.descuento_manual.nota ?? undefined,
        }
      : undefined,
  }))
  const stylistIds = [...new Set(services.map((s) => s.stylistId))]
  const stylistNames = [...new Set(services.map((s) => s.stylistName))]

  return {
    id: String(cita.id),
    clientId: String(cita.id_cliente),
    stylistId: stylistIds[0] ?? '',
    stylistIds,
    stylistName: stylistNames.join(' · ') || 'Sin asignar',
    date: cita.fecha || starts.date,
    startTime: starts.time,
    startsAt,
    status: cita.estado === 'no_asistio' ? 'no asistió' : cita.estado,
    cancellationReason: cita.motivo_cancelacion ?? undefined,
    completedAt: cita.fecha_finalizacion ?? undefined,
    completionNotes:
      [cita.nota?.descripcion_tratamiento, cita.nota?.observaciones].filter(Boolean).join('\n') ||
      undefined,
    events: cita.historial?.map((event) => ({
      type: event.tipo_cambio,
      date: event.fecha_creacion,
      reason: event.motivo ?? undefined,
    })),
    client: cita.cliente
      ? {
          id: String(cita.id_cliente),
          dni: cita.cliente.dni ?? '',
          name: cita.cliente.nombre_completo,
          firstName: cita.cliente.nombre,
          paternalLastName: cita.cliente.apellido_paterno,
          maternalLastName: cita.cliente.apellido_materno ?? '',
          phone: cita.cliente.telefono ?? '',
          email: cita.cliente.correo_contacto ?? '',
        }
      : undefined,
    services,
    payments: (cita.cobros ?? []).map((payment) => ({
      id: String(payment.id),
      methodName: payment.metodo ?? `Método ${payment.id_metodo_pago}`,
      amount: Number(payment.importe),
      paidAt: payment.fecha_cobro,
      reference: payment.referencia_pago ?? undefined,
      status: payment.estado,
    })),
    totalRealized: Number(cita.total_realizado ?? 0),
    totalPaid: Number(cita.total_pagado ?? 0),
    pendingBalance: Number(cita.saldo_pendiente ?? 0),
  }
}

export async function getClientList(): Promise<Client[]> {
  return (await allPages<ClientDto>('/clientes')).map(mapClient)
}

function clientPayload(input: ClientInput) {
  return {
    nombre: input.firstName.trim(),
    apellido_paterno: input.paternalLastName.trim(),
    apellido_materno: input.maternalLastName?.trim() || null,
    telefono: input.phone.trim() || null,
    correo_contacto: input.email.trim() || null,
    preferencias: input.preferences?.trim() || null,
    ...(input.dni !== undefined ? { dni: input.dni.trim() || null } : {}),
    ...(input.active !== undefined ? { activo: input.active } : {}),
  }
}

export async function createClient(input: ClientInput) {
  return { client: mapClient(await resource<ClientDto>('/clientes', 'POST', clientPayload(input))) }
}

export async function updateClient(id: string, input: ClientInput) {
  return {
    client: mapClient(await resource<ClientDto>(`/clientes/${id}`, 'PATCH', clientPayload(input))),
  }
}

function historyProfile(client: Client, appointments: Appointment[]): ClientProfile {
  return {
    client,
    upcoming: appointments.filter(
      (item) => item.status === 'confirmada' && new Date(item.startsAt) > new Date(),
    ),
    completed: appointments
      .filter(
        (item) =>
          item.status === 'completada' &&
          item.services.some((service) => service.result === 'realizado'),
      )
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  }
}

export async function getClientProfile(id: string, actor: Actor): Promise<ClientProfile> {
  const appointments = (await allPages<AppointmentDto>(`/citas?id_cliente=${id}`)).map(
    mapAppointment,
  )
  if (actor.role === 'estilista') {
    const client = appointments.find((item) => item.client)?.client
    if (!client) throw new ApiError(403, 'No hay atenciones asignadas para esta cliente.')
    return historyProfile(client, appointments)
  }
  return historyProfile(mapClient(await resource<ClientDto>(`/clientes/${id}`)), appointments)
}

export async function updateClientSelfProfile(input: ClientInput): Promise<Client> {
  const payload = clientPayload(input)
  return profileClient(
    await resource<ProfileDto>('/mi-perfil', 'PATCH', {
      nombre: payload.nombre,
      apellido_paterno: payload.apellido_paterno,
      apellido_materno: payload.apellido_materno,
      telefono: payload.telefono,
      correo_contacto: payload.correo_contacto,
      preferencias: payload.preferencias,
    }),
  )
}

export async function saveAppointment(input: {
  date: string
  services: { serviceId: string; stylistId: string; startTime: string }[]
  clientId?: string
}): Promise<CreatedAppointment> {
  const appointment = mapAppointment(
    await resource<AppointmentDto>('/citas', 'POST', {
      fecha: input.date,
      servicios: input.services.map((item) => ({
        id_servicio: Number(item.serviceId),
        id_empleado: Number(item.stylistId),
        hora_inicio: item.startTime,
      })),
      ...(input.clientId ? { id_cliente: Number(input.clientId) } : {}),
    }),
  )
  return { appointment }
}

export async function rescheduleAppointment(input: {
  appointmentId: string
  date: string
  services?: { appointmentServiceId: string; stylistId?: string; startTime?: string }[]
  reason?: string
}): Promise<CreatedAppointment> {
  return {
    appointment: mapAppointment(
      await resource<AppointmentDto>(`/citas/${input.appointmentId}/reprogramar`, 'POST', {
        fecha: input.date,
        ...(input.services?.length
          ? {
              servicios: input.services.map((item) => ({
                id_servicio_cita: Number(item.appointmentServiceId),
                ...(item.stylistId ? { id_empleado: Number(item.stylistId) } : {}),
                ...(item.startTime ? { hora_inicio: item.startTime } : {}),
              })),
            }
          : {}),
        ...(input.reason?.trim() ? { motivo: input.reason.trim() } : {}),
      }),
    ),
  }
}

export async function cancelAppointment(id: string, reason: string): Promise<CreatedAppointment> {
  return {
    appointment: mapAppointment(
      await resource<AppointmentDto>(`/citas/${id}/cancelar`, 'POST', {
        motivo: reason.trim() || null,
      }),
    ),
  }
}

export function canRescheduleAppointment(item: Appointment, actor: Actor) {
  return item.status === 'confirmada' && actor.role !== 'estilista'
}
export function canCancelAppointment(item: Appointment, actor: Actor) {
  return (
    item.status === 'confirmada' &&
    (actor.role !== 'estilista' || item.stylistIds.includes(actor.stylistId))
  )
}
export function canCompleteAppointment(item: Appointment, actor: Actor) {
  return canCancelAppointment(item, actor) && new Date(item.startsAt) <= new Date()
}
export const canMarkNoShow = canCompleteAppointment
