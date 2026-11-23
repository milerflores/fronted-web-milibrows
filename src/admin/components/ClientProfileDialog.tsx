import { useEffect, useRef, useState } from 'react'
import { dateFromKey, endTime } from '../../shared/agenda/dates'
import { getClientProfile } from '../../shared/agenda/agendaService'
import type {
  AgendaData,
  Appointment,
  Client,
  ClientProfile,
  Actor,
} from '../../shared/agenda/types'
import { Icon } from './Icon'

const dateLabel = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

interface ClientProfileDialogProps {
  clientId: string
  sourceAppointmentId?: string
  actor: Actor
  data: AgendaData
  onClose: () => void
  onEdit: (client: Client) => void
  onBook: (client: Client) => void
  onOpenAppointment: (appointment: Appointment) => void
}

function durationOf(appointment: Appointment): number {
  return appointment.services.reduce((sum, service) => sum + service.agreedDuration, 0)
}

export function ClientProfileDialog({
  clientId,
  sourceAppointmentId,
  actor,
  data,
  onClose,
  onEdit,
  onBook,
  onOpenAppointment,
}: ClientProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])
  useEffect(() => {
    let active = true
    getClientProfile(clientId, actor)
      .then((result) => {
        if (active) {
          setProfile(result)
          setError('')
          setLoading(false)
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ficha.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [clientId, sourceAppointmentId, actor, data, retryCount])

  const client = profile?.client
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="client-profile-title"
      className="booking-dialog bg-white text-graphite"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      <div className="admin-dialog-scroll">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Ficha de cliente
            </p>
            <h2 id="client-profile-title" className="mt-1 font-display text-3xl">
              {client?.name ?? 'Cliente'}
            </h2>
            <p className="mt-1 text-sm text-stone">
              {actor.role === 'estilista'
                ? 'Información de tus atenciones con esta cliente'
                : 'Contacto, próximas citas e historial'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar ficha"
            className="icon-button"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {loading ? (
          <p role="status" className="px-6 py-14 text-center text-sm text-stone">
            Cargando ficha…
          </p>
        ) : error ? (
          <div role="alert" className="px-6 py-14 text-center">
            <p className="text-sm text-caramel-dark">{error}</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-gold px-4 py-2 text-sm font-semibold"
              onClick={() => {
                setLoading(true)
                setRetryCount((count) => count + 1)
              }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          profile &&
          client && (
            <div className="space-y-7 px-5 py-6 sm:px-8">
              <section className="rounded-card border border-line bg-ivory p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Contacto y atención</h3>
                    <p className="mt-2 text-sm">
                      <a
                        href={`tel:${client.phone.replace(/\s/g, '')}`}
                        className="hover:underline"
                      >
                        {client.phone}
                      </a>
                      {client.email && (
                        <>
                          <br />
                          <a
                            href={`mailto:${client.email}`}
                            className="break-all text-stone hover:underline"
                          >
                            {client.email}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="rounded-card bg-white px-4 py-3 text-center shadow-card">
                    <p className="text-2xl font-bold">{profile.completed.length}</p>
                    <p className="text-xs text-stone">
                      {actor.role === 'estilista' ? 'Atenciones contigo' : 'Visitas completadas'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="detail-label">Preferencias para la atención</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone">
                    {client.preferences || 'Sin preferencias registradas.'}
                  </p>
                </div>
              </section>
              {actor.role !== 'estilista' && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold hover:bg-[#D7B65F]"
                    onClick={() => onBook(client)}
                  >
                    + Nueva cita
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-ivory"
                    onClick={() => onEdit(client)}
                  >
                    Editar datos
                  </button>
                </div>
              )}
              <section aria-labelledby="client-upcoming-title">
                <h3 id="client-upcoming-title" className="font-display text-2xl">
                  Próximas citas confirmadas
                </h3>
                {profile.upcoming.length ? (
                  <div className="mt-3 space-y-2">
                    {profile.upcoming.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {dateLabel.format(dateFromKey(appointment.date))} ·{' '}
                            {appointment.startTime}–
                            {endTime(appointment.startTime, durationOf(appointment))}
                          </p>
                          <p className="mt-1 text-xs text-stone">
                            {data.stylists.find((item) => item.id === appointment.stylistId)?.name}{' '}
                            ·{' '}
                            {appointment.services.map((service) => service.serviceName).join(', ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-semibold text-caramel-dark underline underline-offset-2"
                          onClick={() => onOpenAppointment(appointment)}
                        >
                          Ver cita
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-card bg-ivory p-4 text-sm text-stone">
                    No hay próximas citas confirmadas.
                  </p>
                )}
              </section>
              <section aria-labelledby="client-history-title">
                <h3 id="client-history-title" className="font-display text-2xl">
                  Historial de atenciones
                </h3>
                {profile.completed.length ? (
                  <div className="mt-3 space-y-3">
                    {profile.completed.map((appointment) => (
                      <article
                        key={appointment.id}
                        className="rounded-card border border-line p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold">
                              {dateLabel.format(dateFromKey(appointment.date))}
                            </h4>
                            <p className="mt-1 text-xs text-stone">
                              {
                                data.stylists.find((item) => item.id === appointment.stylistId)
                                  ?.name
                              }
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-sm font-semibold text-caramel-dark underline underline-offset-2"
                            onClick={() => onOpenAppointment(appointment)}
                          >
                            Ver cita
                          </button>
                        </div>
                        <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
                          {appointment.services
                            .filter((service) => service.result === 'realizado')
                            .map((service) => (
                              <li
                                key={service.serviceId}
                                className="flex justify-between gap-3 py-2"
                              >
                                <span>
                                  {service.serviceName}
                                  <span className="block text-xs text-stone">
                                    {service.agreedDuration} min
                                  </span>
                                </span>
                                <span className="whitespace-nowrap">
                                  {money.format(service.agreedPrice)}
                                </span>
                              </li>
                            ))}
                        </ul>
                        <div className="mt-3 flex justify-between gap-3 text-sm">
                          <span className="text-stone">
                            {appointment.services
                              .filter((service) => service.result === 'realizado')
                              .reduce((sum, service) => sum + service.agreedDuration, 0)}{' '}
                            min · Precio total acordado
                          </span>
                          <strong>
                            {money.format(
                              appointment.services
                                .filter((service) => service.result === 'realizado')
                                .reduce((sum, service) => sum + service.agreedPrice, 0),
                            )}
                          </strong>
                        </div>
                        {appointment.completionNotes && (
                          <div className="mt-3 rounded-lg bg-ivory p-3 text-sm">
                            <p className="font-semibold">Observación de atención</p>
                            <p className="mt-1 whitespace-pre-wrap text-stone">
                              {appointment.completionNotes}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-card bg-ivory p-4 text-sm text-stone">
                    No hay atenciones completadas en este historial.
                  </p>
                )}
              </section>
            </div>
          )
        )}
      </div>
    </dialog>
  )
}
