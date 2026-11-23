import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type {
  AppointmentDto,
  DiscountReasonDto,
  PaymentMethodDto,
} from '../../shared/api/types'
import {
  canCancelAppointment,
  canCompleteAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
  mapAppointment,
} from '../../shared/agenda/agendaService'
import type {
  Actor,
  AgendaData,
  Appointment,
  AppointmentService,
  CreatedAppointment,
} from '../../shared/agenda/types'
import { endTime } from '../../shared/agenda/dates'
import { Feedback, Field, Modal, ServiceResults } from '../../shared/components/Forms'
import { RegisterPaymentModal } from './PaymentsPage'
import { StatusBadge } from './StatusBadge'

interface Props {
  appointment: Appointment
  data: AgendaData | null
  actor: Actor
  notice: string | null
  onClose: () => void
  onReschedule: (appointment: Appointment) => void
  onCancel: (appointment: Appointment) => void
  onComplete: (appointment: Appointment) => void
  onNoShow: (appointment: Appointment) => void
  onOpenClient: (appointment: Appointment) => void
  onUpdated: (result: CreatedAppointment, msg?: string) => void
}

function ManualDiscountModal({
  appointmentId,
  service,
  reasons,
  onClose,
  onSaved,
}: {
  appointmentId: string
  service: AppointmentService
  reasons: DiscountReasonDto[]
  onClose: () => void
  onSaved: (updated: Appointment) => void
}) {
  const maxDiscount = Math.max(0, Number((service.listPrice - service.automaticDiscount).toFixed(2)))
  const [amount, setAmount] = useState(
    service.manualDiscount ? service.manualDiscount.amount.toFixed(2) : '',
  )
  const [reasonId, setReasonId] = useState('')
  const [note, setNote] = useState(service.manualDiscount?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (!reasonId && !note.trim()) {
      setError('Selecciona un motivo o escribe una observación.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const dto = await resource<AppointmentDto>(
        `/citas/${appointmentId}/servicios/${service.id}/descuento-manual`,
        'PUT',
        {
          monto: amount,
          id_motivo_descuento: reasonId ? Number(reasonId) : null,
          nota: note.trim() || null,
        },
      )
      onSaved(mapAppointment(dto))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aplicar el descuento.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function removeDiscount() {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const dto = await resource<AppointmentDto>(
        `/citas/${appointmentId}/servicios/${service.id}/descuento-manual`,
        'DELETE',
      )
      onSaved(mapAppointment(dto))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo quitar el descuento.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title={`Descuento manual · ${service.serviceName}`} busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="rounded-card bg-sand p-4 text-sm">
          Precio lista: S/ {service.listPrice.toFixed(2)} · Descuento automático: S/{' '}
          {service.automaticDiscount.toFixed(2)} · Máximo descuento manual: S/{' '}
          {maxDiscount.toFixed(2)}
        </p>
        <Field
          label="Monto del descuento manual (S/)"
          type="number"
          min="0"
          max={String(maxDiscount)}
          step="0.01"
          required
          disabled={busy}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <label className="block text-sm font-semibold">
          Motivo (opcional si escribes nota)
          <select
            className="api-input mt-2"
            disabled={busy}
            value={reasonId}
            onChange={(event) => setReasonId(event.target.value)}
          >
            <option value="">Sin motivo predefinido</option>
            {reasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Observación
          <textarea
            className="api-input mt-2 min-h-24"
            maxLength={2000}
            disabled={busy}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <Feedback error={error} />
        <div className="flex flex-wrap gap-3">
          <button className="api-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Aplicar descuento'}
          </button>
          {service.manualDiscount && (
            <button
              type="button"
              className="api-secondary"
              disabled={busy}
              onClick={() => void removeDiscount()}
            >
              Quitar descuento
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
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
  onUpdated,
}: Props) {
  const [, setTick] = useState(0)
  const [discountTarget, setDiscountTarget] = useState<AppointmentService | null>(null)
  const [paying, setPaying] = useState(false)
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const canManagePayments = actor.role === 'administrador' || actor.role === 'recepcionista'
  const canEditDiscounts = canManagePayments && appointment.totalPaid === 0
  const reasons = useApi<DiscountReasonDto[]>(
    canEditDiscounts ? '/fidelizacion/motivos-descuento?solo_activos=1' : null,
  )
  const methods = useApi<PaymentMethodDto[]>(
    canManagePayments && appointment.status === 'completada' && appointment.pendingBalance > 0
      ? '/caja/metodos-pago'
      : null,
  )

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function startService(service: AppointmentService) {
    setActionError('')
    setBusyServiceId(service.id)
    try {
      const dto = await resource<AppointmentDto>(
        `/citas/${appointment.id}/servicios/${service.id}`,
        'PATCH',
        { estado_servicio: 'en_proceso' },
      )
      onUpdated({ appointment: mapAppointment(dto) }, 'Servicio iniciado (en proceso).')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo iniciar el servicio.')
    } finally {
      setBusyServiceId(null)
    }
  }

  async function reloadAfterPayment(msg: string) {
    setPaying(false)
    try {
      const dto = await resource<AppointmentDto>(`/citas/${appointment.id}`)
      onUpdated({ appointment: mapAppointment(dto) }, msg)
    } catch {
      onUpdated({ appointment }, msg)
    }
  }

  const client =
    appointment.client ?? data?.clients.find((item) => item.id === appointment.clientId)
  const duration = appointment.services.reduce((total, item) => total + item.agreedDuration, 0)
  const total = appointment.services.reduce((sum, item) => sum + item.agreedPrice, 0)

  if (discountTarget) {
    return (
      <ManualDiscountModal
        appointmentId={appointment.id}
        service={discountTarget}
        reasons={reasons.data ?? []}
        onClose={() => setDiscountTarget(null)}
        onSaved={(updated) => {
          setDiscountTarget(null)
          onUpdated({ appointment: updated }, 'Descuento manual actualizado.')
        }}
      />
    )
  }

  if (paying && methods.data) {
    return (
      <RegisterPaymentModal
        fixedAppointment={{
          id: appointment.id,
          pendingBalance: appointment.pendingBalance,
          label: `Cita #${appointment.id} · ${client?.name ?? `Cliente ${appointment.clientId}`}`,
        }}
        methods={methods.data}
        onClose={() => setPaying(false)}
        onSaved={(msg) => void reloadAfterPayment(msg)}
      />
    )
  }

  return (
    <Modal title={client?.name ?? `Cita ${appointment.id}`} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={appointment.status} />
        <p className="text-sm text-stone">Cita {appointment.id}</p>
      </div>
      <Feedback notice={notice ?? ''} error={actionError} />
      <dl className="my-6 grid gap-5 rounded-card bg-sand p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-stone">Fecha y horario</dt>
          <dd className="mt-2 font-semibold">
            {appointment.date} · {appointment.startTime}–{endTime(appointment.startTime, duration)}
          </dd>
        </div>
        <div>
          <dt className="text-stone">Estilista</dt>
          <dd className="mt-2 font-semibold">{appointment.stylistName}</dd>
        </div>
        <div>
          <dt className="text-stone">DNI</dt>
          <dd className="mt-2">{client?.dni || 'Sin registrar'}</dd>
        </div>
        <div>
          <dt className="text-stone">Contacto</dt>
          <dd className="mt-2 break-all">{client?.phone || client?.email || 'Sin registrar'}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="text-sm font-semibold text-caramel-dark underline"
        onClick={() => onOpenClient(appointment)}
      >
        Ver ficha e historial permitido
      </button>
      <h3 className="mt-7 font-display text-xl">Servicios acordados</h3>
      <ServiceResults services={appointment.services} />
      {(canEditDiscounts || appointment.status === 'confirmada') && (
        <div className="mt-3 space-y-2">
          {appointment.services.map((svc) => {
            const canStart =
              appointment.status === 'confirmada' &&
              svc.result === 'pendiente' &&
              (actor.role !== 'estilista' || actor.stylistId === svc.stylistId)
            if (!canEditDiscounts && !canStart) return null
            return (
              <div
                key={svc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line px-4 py-2 text-xs"
              >
                <span className="font-semibold">
                  {svc.serviceName}
                  {svc.manualDiscount
                    ? ` · Desc. manual S/ ${svc.manualDiscount.amount.toFixed(2)}`
                    : ''}
                </span>
                <div className="flex flex-wrap gap-2">
                  {canStart && (
                    <button
                      type="button"
                      className="api-secondary"
                      disabled={busyServiceId === svc.id}
                      onClick={() => void startService(svc)}
                    >
                      {busyServiceId === svc.id ? 'Iniciando…' : 'Iniciar'}
                    </button>
                  )}
                  {canEditDiscounts && (
                    <button
                      type="button"
                      className="api-secondary"
                      onClick={() => setDiscountTarget(svc)}
                    >
                      {svc.manualDiscount ? 'Editar descuento' : 'Descuento manual'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-right font-semibold">Total acordado S/ {total.toFixed(2)}</p>
      {(appointment.payments.length > 0 || appointment.status === 'completada') && (
        <div className="mt-5 rounded-card bg-sand p-4 text-sm">
          <p className="font-semibold">
            Realizado: S/ {appointment.totalRealized.toFixed(2)} · Pagado: S/{' '}
            {appointment.totalPaid.toFixed(2)} · Saldo pendiente: S/{' '}
            {appointment.pendingBalance.toFixed(2)}
          </p>
        </div>
      )}
      {appointment.cancellationReason && (
        <div className="mt-5 rounded-card bg-sand p-4 text-sm">
          <h3 className="font-semibold">Motivo de cancelación</h3>
          <p className="mt-2 whitespace-pre-wrap">{appointment.cancellationReason}</p>
        </div>
      )}
      {appointment.completionNotes && (
        <div className="mt-5 rounded-card bg-sand p-4 text-sm">
          <h3 className="font-semibold">Notas internas de atención</h3>
          <p className="mt-2 whitespace-pre-wrap">{appointment.completionNotes}</p>
        </div>
      )}
      {!!appointment.events?.length && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer font-semibold">Actividad de la cita</summary>
          <ul className="mt-3 divide-y divide-line">
            {appointment.events.map((event, index) => (
              <li key={index} className="py-3">
                <p className="capitalize">{event.type.replaceAll('-', ' ')}</p>
                <p className="mt-1 text-stone">
                  {new Intl.DateTimeFormat('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'America/Lima',
                  }).format(new Date(event.date))}
                </p>
                {event.reason && <p className="mt-1">{event.reason}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-5">
        {canManagePayments &&
          appointment.status === 'completada' &&
          appointment.pendingBalance > 0 && (
            <button
              className="api-primary"
              disabled={!methods.data?.length}
              onClick={() => setPaying(true)}
            >
              Registrar cobro
            </button>
          )}
        {canRescheduleAppointment(appointment, actor) && (
          <button className="api-primary" onClick={() => onReschedule(appointment)}>
            Reprogramar
          </button>
        )}
        {canCompleteAppointment(appointment, actor) && (
          <button className="api-primary" onClick={() => onComplete(appointment)}>
            Completar atención
          </button>
        )}
        {canMarkNoShow(appointment, actor) && (
          <button className="api-secondary" onClick={() => onNoShow(appointment)}>
            Registrar inasistencia
          </button>
        )}
        {canCancelAppointment(appointment, actor) && (
          <button className="api-secondary text-caramel-dark" onClick={() => onCancel(appointment)}>
            Cancelar cita
          </button>
        )}
      </div>
    </Modal>
  )
}
