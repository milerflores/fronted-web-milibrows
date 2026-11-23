import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { resource } from '../../shared/api/http'
import type { AppointmentDto } from '../../shared/api/types'
import { mapAppointment } from '../../shared/agenda/agendaService'
import type { Appointment, CreatedAppointment } from '../../shared/agenda/types'
import { Feedback, Modal } from '../../shared/components/Forms'

export type AttendanceAction = 'complete' | 'noShow'

export function AttendanceActionDialog({
  appointment,
  action,
  onClose,
  onUpdated,
}: {
  appointment: Appointment
  action: AttendanceAction
  onClose: () => void
  onUpdated: (result: CreatedAppointment, action: AttendanceAction) => void
}) {
  const [results, setResults] = useState(
    appointment.services.map((service) => ({
      id_servicio_cita: Number(service.id),
      estado_servicio: 'realizado',
      motivo_estado_servicio: '',
    })),
  )
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (action === 'complete') {
      if (!results.some((item) => item.estado_servicio === 'realizado')) {
        setError('Para completar la cita debe realizarse al menos un servicio.')
        return
      }
      if (
        results.some(
          (item) => item.estado_servicio !== 'realizado' && !item.motivo_estado_servicio.trim(),
        )
      ) {
        setError('Indica el motivo de cada servicio cancelado o no realizado.')
        return
      }
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const response = await resource<AppointmentDto>(
        `/citas/${appointment.id}/${action === 'complete' ? 'completar' : 'marcar-inasistencia'}`,
        'POST',
        action === 'complete'
          ? {
              servicios: results.map((item) => ({
                id_servicio_cita: item.id_servicio_cita,
                estado_servicio: item.estado_servicio,
                motivo_estado_servicio:
                  item.estado_servicio === 'realizado' ? null : item.motivo_estado_servicio.trim(),
              })),
              nota: { descripcion_tratamiento: description || null, observaciones: notes || null },
            }
          : undefined,
      )
      onUpdated({ appointment: mapAppointment(response) }, action)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la atención.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      title={action === 'complete' ? 'Completar atención' : 'Registrar inasistencia'}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-6">
        <p className="text-sm text-stone">
          Cita {appointment.id} · {appointment.date} · {appointment.startTime}
        </p>
        {action === 'complete' ? (
          <>
            {appointment.services.map((service, index) => (
              <section key={service.id} className="rounded-card border border-line p-4">
                <h3 className="mb-3 font-semibold">
                  {service.serviceName} · {service.stylistName}
                </h3>
                <label className="block text-sm">
                  Resultado
                  <select
                    className="api-input mt-2"
                    value={results[index].estado_servicio}
                    onChange={(event) =>
                      setResults((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, estado_servicio: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="no_realizado">No realizado</option>
                  </select>
                </label>
                {results[index].estado_servicio !== 'realizado' && (
                  <label className="mt-4 block text-sm">
                    Motivo
                    <textarea
                      className="api-input mt-2"
                      maxLength={2000}
                      required
                      value={results[index].motivo_estado_servicio}
                      onChange={(event) =>
                        setResults((current) =>
                          current.map((item, position) =>
                            position === index
                              ? { ...item, motivo_estado_servicio: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                )}
              </section>
            ))}
            <label className="block text-sm font-semibold">
              Descripción del tratamiento
              <textarea
                className="api-input mt-2 min-h-24"
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Observaciones internas
              <textarea
                className="api-input mt-2 min-h-24"
                maxLength={5000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </>
        ) : (
          <p className="rounded-card bg-sand p-5 text-sm">
            Confirma que la cliente no asistió. Se registrará el resultado de los servicios de esta
            cita.
          </p>
        )}
        <Feedback error={error} />
        <button disabled={busy} className="api-primary">
          {busy ? 'Guardando…' : 'Confirmar cierre'}
        </button>
      </form>
    </Modal>
  )
}
