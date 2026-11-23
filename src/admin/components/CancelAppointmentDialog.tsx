import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { dateFromKey, endTime } from '../../shared/agenda/dates'
import { AgendaOperationError, cancelAppointment } from '../../shared/agenda/agendaService'
import type { AgendaData, Appointment, CreatedAppointment, Actor } from '../../shared/agenda/types'
import { Icon } from './Icon'

const fullDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

interface CancelAppointmentDialogProps {
  appointment: Appointment
  data: AgendaData
  actor: Actor
  onClose: () => void
  onCancelled: (result: CreatedAppointment) => void
}

export function CancelAppointmentDialog({
  appointment,
  data,
  onClose,
  onCancelled,
}: CancelAppointmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const client = data.clients.find((item) => item.id === appointment.clientId)
  const stylist = data.stylists.find((item) => item.id === appointment.stylistId)
  const duration = appointment.services.reduce((sum, service) => sum + service.agreedDuration, 0)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setReasonError('')
    setGeneralError('')
    if (!reason.trim()) {
      setReasonError('Escribe el motivo de cancelación.')
      return
    }

    savingRef.current = true
    setSaving(true)
    try {
      const result = await cancelAppointment(appointment.id, reason)
      onCancelled(result)
    } catch (cause) {
      if (cause instanceof AgendaOperationError && cause.field === 'reason')
        setReasonError(cause.message)
      else
        setGeneralError(
          cause instanceof Error ? cause.message : 'No se pudo cancelar la cita. Intenta de nuevo.',
        )
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cancel-appointment-title"
      className="appointment-dialog bg-white text-graphite"
      onClose={onClose}
      onCancel={(event) => {
        if (savingRef.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !savingRef.current) dialogRef.current?.close()
      }}
    >
      <form noValidate onSubmit={submit} aria-busy={saving}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Agenda · Cita {appointment.id.toUpperCase()}
            </p>
            <h2 id="cancel-appointment-title" className="mt-1 font-display text-3xl">
              Cancelar cita
            </h2>
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

        <div className="px-5 py-6 sm:px-7">
          <p className="text-sm text-stone">
            Confirma que deseas cancelar esta cita. La reserva quedará visible con su motivo.
          </p>
          <div className="mt-5 rounded-card border border-line bg-ivory p-4 text-sm">
            <p className="font-semibold">{client?.name}</p>
            <p className="mt-1 text-stone">{fullDate.format(dateFromKey(appointment.date))}</p>
            <p className="mt-1 text-stone">
              {appointment.startTime} – {endTime(appointment.startTime, duration)} · {stylist?.name}
            </p>
            <ul className="mt-3 list-inside list-disc border-t border-line pt-3 text-stone">
              {appointment.services.map((service) => (
                <li key={service.serviceId}>
                  {service.serviceName} · {service.agreedDuration} min
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <label className="form-label" htmlFor="cancellation-reason">
              Motivo de cancelación *
            </label>
            <textarea
              id="cancellation-reason"
              className="form-input mt-1 min-h-28 resize-y"
              value={reason}
              maxLength={500}
              aria-invalid={!!reasonError}
              aria-describedby={reasonError ? 'cancellation-reason-error' : undefined}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
              placeholder="Explica brevemente el motivo"
            />
            {reasonError && (
              <p id="cancellation-reason-error" role="alert" className="field-error">
                {reasonError}
              </p>
            )}
          </div>
          {generalError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-[#FAF0EA] px-3 py-2 text-sm text-caramel-dark"
            >
              {generalError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-7">
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
            className="rounded-lg bg-caramel-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-caramel disabled:cursor-wait disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
