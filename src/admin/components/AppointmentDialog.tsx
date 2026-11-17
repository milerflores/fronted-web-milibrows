import { useEffect, useRef, useState } from 'react'
import { dateFromKey, endTime } from '../../shared/agenda/dates'
import {
  canCancelAppointment,
  canCompleteAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
} from '../../shared/agenda/mockAgendaService'
import type {
  AgendaData,
  Appointment,
  DemoActor,
  DemoClientAccount,
} from '../../shared/agenda/types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const fullDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const actionDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

function actorLabel(actor: DemoActor | DemoClientAccount, data: AgendaData | null): string {
  if (actor.role === 'cliente')
    return `Cliente · ${data?.clients.find((client) => client.id === actor.clientId)?.name ?? 'Sin identificar'}`
  if (actor.role !== 'estilista')
    return actor.role === 'administrador' ? 'Administrador' : 'Recepcionista'
  const stylistId = actor.stylistId
  return `Estilista · ${data?.stylists.find((stylist) => stylist.id === stylistId)?.name ?? 'Sin identificar'}`
}

interface AppointmentDialogProps {
  appointment: Appointment | null
  data: AgendaData | null
  actor: DemoActor
  notice: string | null
  onClose: () => void
  onReschedule: (appointment: Appointment) => void
  onCancel: (appointment: Appointment) => void
  onComplete: (appointment: Appointment) => void
  onNoShow: (appointment: Appointment) => void
  onOpenClient: (appointment: Appointment) => void
}

export function AppointmentDialog({
  appointment,
  data,
  actor,
  notice,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
  onNoShow,
  onOpenClient,
}: AppointmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [, setClockTick] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (appointment && !dialog?.open) dialog?.showModal()
    if (!appointment && dialog?.open) dialog.close()
  }, [appointment])

  useEffect(() => {
    if (!appointment || appointment.status !== 'confirmada') return
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [appointment])

  const client = data?.clients.find((item) => item.id === appointment?.clientId)
  const stylist = data?.stylists.find((item) => item.id === appointment?.stylistId)
  const duration = appointment?.services.reduce((sum, item) => sum + item.agreedDuration, 0) ?? 0
  const price = appointment?.services.reduce((sum, item) => sum + item.agreedPrice, 0) ?? 0

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="appointment-dialog-title"
      className="appointment-dialog rounded-card bg-white text-graphite"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      {appointment && (
        <div className="admin-dialog-scroll admin-appointment-detail p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[.18em] text-caramel-dark uppercase">
                Detalle de cita
              </p>
              <h2 id="appointment-dialog-title" className="font-display text-3xl leading-tight">
                {client?.name}
              </h2>
              <p className="mt-1 text-sm text-stone">Código {appointment.id.toUpperCase()}</p>
            </div>
            <button
              type="button"
              aria-label="Cerrar detalle"
              className="icon-button"
              onClick={() => dialogRef.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge status={appointment.status} />
            <span className="text-sm text-stone">{stylist?.name}</span>
          </div>
          {notice && (
            <p
              role="status"
              className="mt-5 rounded-card border border-[#CFD5C6] bg-[#F0F3EA] px-4 py-3 text-sm font-semibold text-sage-dark"
            >
              {notice}
            </p>
          )}

          <dl className="mt-6 grid gap-5 rounded-card bg-ivory p-5 sm:grid-cols-2">
            <div>
              <dt className="detail-label">Fecha</dt>
              <dd className="mt-1 text-sm font-medium">
                {fullDate.format(dateFromKey(appointment.date))}
              </dd>
            </div>
            <div>
              <dt className="detail-label">Horario</dt>
              <dd className="mt-1 text-sm font-medium">
                {appointment.startTime} – {endTime(appointment.startTime, duration)}
              </dd>
            </div>
            <div>
              <dt className="detail-label">Contacto</dt>
              <dd className="mt-1 text-sm font-medium">
                <a className="hover:underline" href={`tel:${client?.phone.replace(/\s/g, '')}`}>
                  {client?.phone}
                </a>
                {client?.email && (
                  <>
                    <br />
                    <a
                      className="break-all text-stone hover:underline"
                      href={`mailto:${client.email}`}
                    >
                      {client.email}
                    </a>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="detail-label">Estilista</dt>
              <dd className="mt-1 text-sm font-medium">{stylist?.name}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-caramel-dark underline underline-offset-2 hover:text-graphite focus-visible:outline-2 focus-visible:outline-gold"
            onClick={() => onOpenClient(appointment)}
          >
            {actor.role === 'estilista' ? 'Ver ficha de esta cliente' : 'Ver ficha de cliente'}
          </button>
          {appointment.rescheduledAt && appointment.rescheduledBy && (
            <p className="mt-3 text-xs text-stone">
              Última reprogramación: {actionDate.format(new Date(appointment.rescheduledAt))} ·{' '}
              {actorLabel(appointment.rescheduledBy, data)}
            </p>
          )}

          <div className="mt-7">
            <h3 className="text-sm font-semibold">Servicios acordados</h3>
            <div className="mt-3 divide-y divide-line border-y border-line">
              {appointment.services.map((item) => (
                <div
                  key={item.serviceId}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.serviceName}</p>
                    <p className="mt-0.5 text-xs text-stone">{item.agreedDuration} min</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    {money.format(item.agreedPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-stone">Duración total</span>
              <strong>{duration} min</strong>
            </div>
            <div className="mt-2 flex items-center justify-between text-base">
              <span className="font-semibold">Total acordado</span>
              <strong>{money.format(price)}</strong>
            </div>
          </div>

          {appointment.status === 'cancelada' && appointment.cancellationReason && (
            <div className="mt-6 rounded-card border border-[#EBD5C8] bg-[#FBF5F1] p-4 text-sm">
              <p className="font-semibold text-caramel-dark">Motivo de cancelación</p>
              <p className="mt-1 text-stone">{appointment.cancellationReason}</p>
              {appointment.cancelledAt && appointment.cancelledBy && (
                <p className="mt-3 text-xs text-caramel-dark">
                  {actionDate.format(new Date(appointment.cancelledAt))} ·{' '}
                  {actorLabel(appointment.cancelledBy, data)}
                </p>
              )}
            </div>
          )}
          {appointment.status === 'completada' &&
            (appointment.completedAt || appointment.completionNotes) && (
              <div className="mt-6 rounded-card border border-line bg-ivory p-4 text-sm">
                <p className="font-semibold">Atención completada</p>
                {appointment.completedAt && appointment.completedBy && (
                  <p className="mt-1 text-xs text-stone">
                    {actionDate.format(new Date(appointment.completedAt))} ·{' '}
                    {actorLabel(appointment.completedBy, data)}
                  </p>
                )}
                {appointment.completionNotes && (
                  <p className="mt-3 whitespace-pre-wrap text-stone">
                    {appointment.completionNotes}
                  </p>
                )}
              </div>
            )}
          {appointment.status === 'no asistió' &&
            (appointment.noShowAt || appointment.noShowNotes) && (
              <div className="mt-6 rounded-card border border-line bg-ivory p-4 text-sm">
                <p className="font-semibold">Inasistencia registrada</p>
                {appointment.noShowAt && appointment.noShowBy && (
                  <p className="mt-1 text-xs text-stone">
                    {actionDate.format(new Date(appointment.noShowAt))} ·{' '}
                    {actorLabel(appointment.noShowBy, data)}
                  </p>
                )}
                {appointment.noShowNotes && (
                  <p className="mt-3 whitespace-pre-wrap text-stone">{appointment.noShowNotes}</p>
                )}
              </div>
            )}
          {appointment.notes && (
            <div className="mt-6 rounded-card bg-ivory p-4 text-sm">
              <p className="font-semibold">Observaciones de la reserva</p>
              <p className="mt-1 whitespace-pre-wrap text-stone">{appointment.notes}</p>
            </div>
          )}
          {(canRescheduleAppointment(appointment, actor) ||
            canCancelAppointment(appointment, actor) ||
            canCompleteAppointment(appointment, actor) ||
            canMarkNoShow(appointment, actor)) && (
            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
              {canCancelAppointment(appointment, actor) && (
                <button
                  type="button"
                  className="rounded-lg border border-caramel-dark px-4 py-2.5 text-sm font-semibold text-caramel-dark hover:bg-[#FAF0EA] focus-visible:outline-2 focus-visible:outline-caramel-dark"
                  onClick={() => onCancel(appointment)}
                >
                  Cancelar cita
                </button>
              )}
              {canRescheduleAppointment(appointment, actor) && (
                <button
                  type="button"
                  className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] focus-visible:outline-2 focus-visible:outline-gold"
                  onClick={() => onReschedule(appointment)}
                >
                  Reprogramar
                </button>
              )}
              {canMarkNoShow(appointment, actor) && (
                <button
                  type="button"
                  className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-gold"
                  onClick={() => onNoShow(appointment)}
                >
                  Registrar inasistencia
                </button>
              )}
              {canCompleteAppointment(appointment, actor) && (
                <button
                  type="button"
                  className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] focus-visible:outline-2 focus-visible:outline-gold"
                  onClick={() => onComplete(appointment)}
                >
                  Completar atención
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
