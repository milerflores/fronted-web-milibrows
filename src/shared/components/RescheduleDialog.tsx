import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/http'
import { useApi } from '../api/useApi'
import type { AvailabilityDto } from '../api/types'
import { rescheduleAppointment } from '../agenda/agendaService'
import { availableStartTimes } from '../agenda/availability'
import { endTime, todayKey } from '../agenda/dates'
import type { Appointment, CreatedAppointment } from '../agenda/types'
import { Feedback, Field, Modal } from './Forms'

export function RescheduleDialog({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: Appointment
  onClose: () => void
  onRescheduled: (result: CreatedAppointment) => void
}) {
  const [date, setDate] = useState(appointment.date < todayKey() ? todayKey() : appointment.date)
  const [employeeId, setEmployeeId] = useState(appointment.stylistId)
  const [time, setTime] = useState(appointment.startTime)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  const availability = useApi<AvailabilityDto[]>(
    date ? `/citas/${appointment.id}/disponibilidad?fecha=${encodeURIComponent(date)}` : null,
  )
  const employee = availability.data?.find(
    (item) => String(item.id_empleado) === employeeId && item.intervalos.length > 0,
  )
  const times = availableStartTimes(employee, appointment.startsAt)
  const validTime = times.includes(time) ? time : ''
  const pendingServices = appointment.services.filter(
    (service) => service.result === 'pendiente' || service.result === 'en_proceso',
  )
  const duration = pendingServices.reduce((sum, service) => sum + service.agreedDuration, 0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    setError('')
    if (!employee || !validTime || availability.loading || availability.error) {
      setError('Selecciona una estilista y un horario disponibles.')
      return
    }
    saving.current = true
    setBusy(true)
    try {
      let cursor = validTime
      const services = pendingServices.map((service) => {
        const line = {
          appointmentServiceId: service.id,
          stylistId: employeeId,
          startTime: cursor,
        }
        cursor = endTime(cursor, service.agreedDuration)
        return line
      })
      onRescheduled(
        await rescheduleAppointment({
          appointmentId: appointment.id,
          date,
          services,
        }),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo reprogramar la cita.')
      if (cause instanceof ApiError && (cause.status === 409 || cause.status === 422)) {
        setTime('')
        availability.reload()
      }
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Reprogramar cita" busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <p className="rounded-card bg-sand p-4 text-sm">
          Cita actual · {appointment.date} · {appointment.startTime} · {appointment.stylistName}
        </p>
        <p className="text-sm text-stone">
          Selecciona el nuevo horario. Se conservarán los servicios, los precios y los {duration}{' '}
          minutos acordados.
        </p>
        <Field
          label="Nueva fecha"
          type="date"
          required
          min={todayKey()}
          value={date}
          disabled={busy}
          onChange={(event) => {
            setDate(event.target.value)
            setTime('')
            setError('')
          }}
        />
        <Feedback
          loading={availability.loading}
          error={availability.error}
          onRetry={availability.reload}
        />
        <label className="block text-sm font-semibold">
          Estilista
          <select
            className="api-input mt-2"
            required
            disabled={busy || availability.loading || !!availability.error}
            value={employee ? employeeId : ''}
            onChange={(event) => {
              setEmployeeId(event.target.value)
              setTime('')
            }}
          >
            <option value="">Seleccionar estilista</option>
            {availability.data
              ?.filter((item) => item.intervalos.length > 0)
              .map((item) => (
                <option key={item.id_empleado} value={item.id_empleado}>
                  {item.nombre_completo}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Hora disponible
          <select
            className="api-input mt-2"
            required
            disabled={busy || availability.loading || !times.length}
            value={validTime}
            onChange={(event) => setTime(event.target.value)}
          >
            <option value="">Seleccionar hora</option>
            {times.map((start) => (
              <option key={start} value={start}>
                {start} – {endTime(start, duration)}
              </option>
            ))}
          </select>
        </label>
        {availability.data && !availability.data.some((item) => item.intervalos.length > 0) && (
          <p role="status" className="rounded-card bg-sand p-4 text-sm">
            No hay horarios disponibles para esta cita en la fecha elegida. Prueba otro día.
          </p>
        )}
        <Feedback error={error} />
        <div className="flex flex-wrap gap-3">
          <button
            className="api-primary"
            disabled={busy || availability.loading || !!availability.error || !validTime}
          >
            {busy ? 'Guardando…' : 'Guardar nuevo horario'}
          </button>
          <button type="button" className="api-secondary" disabled={busy} onClick={onClose}>
            Volver
          </button>
        </div>
      </form>
    </Modal>
  )
}
