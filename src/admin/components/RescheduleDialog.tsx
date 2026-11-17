import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { dateFromKey, dateKey, endTime } from '../../shared/agenda/dates'
import {
  AgendaOperationError,
  getEligibleStylists,
  getRescheduleStartTimes,
  rescheduleAppointment,
} from '../../shared/agenda/mockAgendaService'
import type {
  AgendaData,
  Appointment,
  CreatedAppointment,
  DemoActor,
} from '../../shared/agenda/types'
import { Icon } from './Icon'

const fullDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

interface RescheduleDialogProps {
  appointment: Appointment
  data: AgendaData
  actor: DemoActor
  onClose: () => void
  onUpdated: (result: CreatedAppointment) => void
}

export function RescheduleDialog({
  appointment,
  data,
  actor,
  onClose,
  onUpdated,
}: RescheduleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const [date, setDate] = useState(appointment.date)
  const [stylistId, setStylistId] = useState(appointment.stylistId)
  const [startTime, setStartTime] = useState(appointment.startTime)
  const [errors, setErrors] = useState<{
    date?: string
    stylistId?: string
    startTime?: string
    general?: string
  }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const client = data.clients.find((item) => item.id === appointment.clientId)
  const serviceIds = appointment.services.map((service) => service.serviceId)
  const eligibleStylists = getEligibleStylists(serviceIds, true)
  const originalStylist = data.stylists.find((item) => item.id === appointment.stylistId)
  const selectedStylist = data.stylists.find((item) => item.id === stylistId)
  const duration = appointment.services.reduce((sum, service) => sum + service.agreedDuration, 0)
  const price = appointment.services.reduce((sum, service) => sum + service.agreedPrice, 0)
  const availableTimes = getRescheduleStartTimes(appointment.id, date, stylistId)
  const validStartTime = availableTimes.includes(startTime) ? startTime : ''
  const changed =
    date !== appointment.date ||
    stylistId !== appointment.stylistId ||
    startTime !== appointment.startTime

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    const nextErrors: typeof errors = {}
    if (!date || date < dateKey(new Date()) || dateFromKey(date).getDay() === 0)
      nextErrors.date = 'Elige una fecha futura de lunes a sábado.'
    if (!stylistId || !eligibleStylists.some((stylist) => stylist.id === stylistId))
      nextErrors.stylistId = 'Elige una estilista habilitada.'
    if (!validStartTime) nextErrors.startTime = 'Selecciona una hora disponible.'
    if (!changed) nextErrors.general = 'No hay cambios que guardar.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    savingRef.current = true
    setSaving(true)
    try {
      const result = await rescheduleAppointment(
        { appointmentId: appointment.id, date, startTime: validStartTime, stylistId },
        actor,
      )
      onUpdated(result)
    } catch (cause) {
      if (cause instanceof AgendaOperationError && cause.field)
        setErrors({ [cause.field]: cause.message })
      else
        setErrors({
          general:
            cause instanceof Error
              ? cause.message
              : 'No se pudo reprogramar la cita. Intenta de nuevo.',
        })
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reschedule-title"
      className="booking-dialog bg-white text-graphite"
      onClose={onClose}
      onCancel={(event) => {
        if (savingRef.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !savingRef.current) dialogRef.current?.close()
      }}
    >
      <form noValidate onSubmit={submit} aria-busy={saving}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Agenda · Cita {appointment.id.toUpperCase()}
            </p>
            <h2 id="reschedule-title" className="mt-1 font-display text-3xl">
              Reprogramar cita
            </h2>
            <p className="mt-1 text-sm text-stone">{client?.name}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="icon-button"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="grid gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <section
              className="rounded-card border border-line bg-ivory p-4"
              aria-label="Horario anterior"
            >
              <p className="detail-label">Horario anterior</p>
              <p className="mt-2 text-sm font-semibold">
                {fullDate.format(dateFromKey(appointment.date))}
              </p>
              <p className="mt-1 text-sm text-stone">
                {appointment.startTime} – {endTime(appointment.startTime, duration)} ·{' '}
                {originalStylist?.name}
              </p>
            </section>

            <section className="mt-7" aria-labelledby="new-schedule-title">
              <h3 id="new-schedule-title" className="form-section-title">
                <span className="form-section-number">1</span>Nuevo horario
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="reschedule-stylist">
                    Estilista *
                  </label>
                  <select
                    id="reschedule-stylist"
                    className="form-input mt-1"
                    value={stylistId}
                    aria-invalid={!!errors.stylistId}
                    aria-describedby={errors.stylistId ? 'reschedule-stylist-error' : undefined}
                    onChange={(event) => {
                      setStylistId(event.target.value)
                      setStartTime('')
                      setErrors({})
                    }}
                  >
                    <option value="">Seleccionar estilista</option>
                    {eligibleStylists.map((stylist) => (
                      <option key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </option>
                    ))}
                  </select>
                  {errors.stylistId && (
                    <p id="reschedule-stylist-error" className="field-error">
                      {errors.stylistId}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label" htmlFor="reschedule-date">
                    Fecha *
                  </label>
                  <input
                    id="reschedule-date"
                    className="form-input mt-1"
                    type="date"
                    min={dateKey(new Date())}
                    value={date}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? 'reschedule-date-error' : undefined}
                    onChange={(event) => {
                      setDate(event.target.value)
                      setStartTime('')
                      setErrors({})
                    }}
                  />
                  {errors.date && (
                    <p id="reschedule-date-error" className="field-error">
                      {errors.date}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="form-label" htmlFor="reschedule-time">
                  Hora de inicio *
                </label>
                <select
                  id="reschedule-time"
                  className="form-input mt-1"
                  value={validStartTime}
                  disabled={!availableTimes.length}
                  aria-invalid={!!errors.startTime}
                  aria-describedby={errors.startTime ? 'reschedule-time-error' : undefined}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    setErrors({})
                  }}
                >
                  <option value="">Seleccionar hora</option>
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time} – {endTime(time, duration)}
                    </option>
                  ))}
                </select>
                {errors.startTime && (
                  <p id="reschedule-time-error" className="field-error">
                    {errors.startTime}
                  </p>
                )}
              </div>
              {date && dateFromKey(date).getDay() === 0 && (
                <p className="mt-2 text-xs text-caramel-dark">
                  El estudio atiende de lunes a sábado.
                </p>
              )}
              {date && stylistId && !availableTimes.length && (
                <p className="mt-2 text-xs text-caramel-dark">
                  No hay horarios disponibles. Elige otra fecha o estilista.
                </p>
              )}
              <p className="mt-3 text-xs text-stone">
                Los servicios conservan sus duraciones y precios acordados. La atención debe
                terminar antes de las 22:00.
              </p>
            </section>
          </div>

          <aside
            className="lg:sticky lg:top-28 lg:self-start"
            aria-label="Resumen de reprogramación"
          >
            <div className="rounded-card border border-line bg-ivory p-5">
              <p className="text-[11px] font-semibold tracking-[.14em] text-caramel-dark uppercase">
                Antes de guardar
              </p>
              <h3 className="mt-1 font-display text-2xl">Resumen</h3>
              <p className="mt-4 text-sm font-semibold">{client?.name}</p>
              <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                {appointment.services.map((service) => (
                  <li key={service.serviceId} className="flex justify-between gap-3">
                    <span>
                      {service.serviceName}
                      <span className="block text-xs text-stone">{service.agreedDuration} min</span>
                    </span>
                    <span className="whitespace-nowrap">{money.format(service.agreedPrice)}</span>
                  </li>
                ))}
              </ul>
              {(date || validStartTime || selectedStylist) && (
                <div className="mt-4 border-t border-line pt-4 text-sm">
                  <p className="detail-label">Nuevo horario</p>
                  {date && (
                    <p className="mt-2 font-semibold">{fullDate.format(dateFromKey(date))}</p>
                  )}
                  {validStartTime && (
                    <p className="mt-1">
                      {validStartTime} – {endTime(validStartTime, duration)}
                    </p>
                  )}
                  {selectedStylist && <p className="mt-1">{selectedStylist.name}</p>}
                </div>
              )}
              <div className="mt-4 flex justify-between border-t border-line pt-4 text-sm">
                <span>Duración acordada</span>
                <strong>{duration} min</strong>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Precio acordado</span>
                <strong>{money.format(price)}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-line bg-white px-5 py-4 sm:px-8">
          {errors.general && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-[#FAF0EA] px-3 py-2 text-sm text-caramel-dark"
            >
              {errors.general}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:bg-ivory disabled:opacity-50"
              disabled={saving}
              onClick={() => dialogRef.current?.close()}
            >
              Volver
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !changed}
            >
              {saving ? 'Guardando…' : 'Confirmar cambio'}
            </button>
          </div>
          {!changed && (
            <p className="mt-2 text-right text-xs text-stone">
              Modifica fecha, hora o estilista para guardar.
            </p>
          )}
        </div>
      </form>
    </dialog>
  )
}
