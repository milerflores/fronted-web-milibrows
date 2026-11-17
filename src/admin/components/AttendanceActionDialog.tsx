import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { dateFromKey, endTime } from '../../shared/agenda/dates'
import {
  AgendaOperationError,
  completeAppointment,
  markNoShow,
} from '../../shared/agenda/mockAgendaService'
import type {
  AgendaData,
  Appointment,
  CreatedAppointment,
  DemoActor,
} from '../../shared/agenda/types'
import { Icon } from './Icon'

export type AttendanceAction = 'complete' | 'noShow'

const fullDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

interface AttendanceActionDialogProps {
  appointment: Appointment
  data: AgendaData
  actor: DemoActor
  action: AttendanceAction
  onClose: () => void
  onUpdated: (result: CreatedAppointment, action: AttendanceAction) => void
}

export function AttendanceActionDialog({
  appointment,
  data,
  actor,
  action,
  onClose,
  onUpdated,
}: AttendanceActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const [notes, setNotes] = useState('')
  const [notesError, setNotesError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)
  const isCompletion = action === 'complete'

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const client = data.clients.find((item) => item.id === appointment.clientId)
  const stylist = data.stylists.find((item) => item.id === appointment.stylistId)
  const duration = appointment.services.reduce(
    (total, service) => total + service.agreedDuration,
    0,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setNotesError('')
    setGeneralError('')
    savingRef.current = true
    setSaving(true)
    try {
      const result = isCompletion
        ? await completeAppointment(appointment.id, notes, actor)
        : await markNoShow(appointment.id, notes, actor)
      onUpdated(result, action)
    } catch (cause) {
      if (cause instanceof AgendaOperationError && cause.field === 'attendanceNotes')
        setNotesError(cause.message)
      else
        setGeneralError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo actualizar la cita. Intenta de nuevo.',
        )
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="attendance-action-title"
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
            <h2 id="attendance-action-title" className="mt-1 font-display text-3xl">
              {isCompletion ? 'Completar atención' : 'Registrar inasistencia'}
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
            {isCompletion
              ? 'Confirma que la atención ha terminado.'
              : 'Confirma que la cliente no asistió a esta cita.'}
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
            <label className="form-label" htmlFor="attendance-notes">
              {isCompletion ? 'Observación de la atención' : 'Observación de la inasistencia'}{' '}
              (opcional)
            </label>
            <textarea
              id="attendance-notes"
              className="form-input mt-1 min-h-28 resize-y"
              value={notes}
              maxLength={500}
              aria-invalid={!!notesError}
              aria-describedby={notesError ? 'attendance-notes-error' : undefined}
              onChange={(event) => {
                setNotes(event.target.value)
                setNotesError('')
              }}
              placeholder="Agrega una observación si corresponde"
            />
            {notesError && (
              <p id="attendance-notes-error" role="alert" className="field-error">
                {notesError}
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
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] disabled:cursor-wait disabled:opacity-60"
            disabled={saving}
          >
            {saving
              ? 'Guardando…'
              : isCompletion
                ? 'Confirmar atención terminada'
                : 'Confirmar inasistencia'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
