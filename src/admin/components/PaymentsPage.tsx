import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type {
  AppointmentDto,
  ClientPaymentDto,
  IncomeSummaryDto,
  PaymentMethodDto,
} from '../../shared/api/types'
import { addDays, dateFromKey, dateKey, todayKey } from '../../shared/agenda/dates'
import { Feedback, Field, Modal } from '../../shared/components/Forms'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export function RegisterPaymentModal({
  fixedAppointment,
  methods,
  onClose,
  onSaved,
}: {
  fixedAppointment?: { id: string; pendingBalance: number; label: string }
  methods: PaymentMethodDto[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const completed = useApi<AppointmentDto[]>(
    fixedAppointment ? null : '/citas?estado=completada',
    true,
  )
  const pendingAppointments = (completed.data ?? []).filter(
    (item) => Number(item.saldo_pendiente ?? 0) > 0,
  )
  const [appointmentId, setAppointmentId] = useState(fixedAppointment?.id ?? '')
  const [methodId, setMethodId] = useState(String(methods[0]?.id ?? ''))
  const [amount, setAmount] = useState(
    fixedAppointment ? fixedAppointment.pendingBalance.toFixed(2) : '',
  )
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  const selectedApt = pendingAppointments.find((item) => String(item.id) === appointmentId)
  const maxBalance = fixedAppointment
    ? fixedAppointment.pendingBalance
    : Number(selectedApt?.saldo_pendiente ?? 0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (!appointmentId || !methodId) {
      setError('Selecciona la cita y el método de pago.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const res = await request<{ datos: ClientPaymentDto; puntos_otorgados: number }>(
        '/caja/cobros',
        'POST',
        {
          id_cita: Number(appointmentId),
          id_metodo_pago: Number(methodId),
          importe: amount,
          referencia_pago: reference.trim() || null,
        },
      )
      onSaved(
        `Cobro registrado correctamente. Puntos otorgados: ${res.puntos_otorgados}.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el cobro.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar cobro" busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        {fixedAppointment ? (
          <p className="rounded-card bg-sand p-4 text-sm">
            {fixedAppointment.label} · Saldo pendiente:{' '}
            <strong>{money.format(fixedAppointment.pendingBalance)}</strong>
          </p>
        ) : (
          <>
            <Feedback
              loading={completed.loading}
              error={completed.error}
              onRetry={completed.reload}
            />
            <label className="block text-sm font-semibold">
              Cita completada con saldo pendiente
              <select
                className="api-input mt-2"
                required
                disabled={busy || completed.loading}
                value={appointmentId}
                onChange={(event) => {
                  const id = event.target.value
                  setAppointmentId(id)
                  const found = pendingAppointments.find((item) => String(item.id) === id)
                  if (found) setAmount(String(found.saldo_pendiente ?? ''))
                }}
              >
                <option value="">Seleccionar cita</option>
                {pendingAppointments.map((item) => (
                  <option key={item.id} value={item.id}>
                    Cita #{item.id} · {item.fecha} ·{' '}
                    {item.cliente?.nombre_completo ?? `Cliente ${item.id_cliente}`} · Saldo S/{' '}
                    {item.saldo_pendiente}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Método de pago
            <select
              className="api-input mt-2"
              required
              disabled={busy}
              value={methodId}
              onChange={(event) => setMethodId(event.target.value)}
            >
              <option value="">Seleccionar método</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.nombre}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Importe en soles (total o parcial)"
            type="number"
            min="0.01"
            max={maxBalance > 0 ? String(maxBalance) : '9999999999.99'}
            step="0.01"
            required
            disabled={busy}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <Field
          label="Referencia de pago (opcional)"
          maxLength={255}
          placeholder="N.º de operación Yape/Plin, voucher, etc."
          disabled={busy}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <Feedback error={error} />
        <button className="api-primary" disabled={busy || !methods.length}>
          {busy ? 'Registrando…' : 'Confirmar cobro'}
        </button>
      </form>
    </Modal>
  )
}

function VoidPaymentModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: ClientPaymentDto
  onClose: () => void
  onSaved: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (!reason.trim()) {
      setError('Indica el motivo de la anulación.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await resource(`/caja/cobros/${payment.id}/anular`, 'POST', { motivo: reason.trim() })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo anular el cobro.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <Modal title={`Anular cobro #${payment.id}`} busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="rounded-card bg-sand p-4 text-sm">
          Cita #{payment.id_cita} · {payment.metodo?.nombre} · S/ {payment.importe}. Se revertirán
          los puntos asociados a este pago.
        </p>
        <label className="block text-sm font-semibold">
          Motivo de anulación
          <textarea
            className="api-input mt-2 min-h-24"
            maxLength={2000}
            required
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <Feedback error={error} />
        <button className="api-primary" disabled={busy}>
          {busy ? 'Anulando…' : 'Confirmar anulación'}
        </button>
      </form>
    </Modal>
  )
}

export function PaymentsPage({ isAdmin }: { isAdmin: boolean }) {
  const [from, setFrom] = useState(() => dateKey(addDays(dateFromKey(todayKey()), -30)))
  const [until, setUntil] = useState(todayKey)
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [voiding, setVoiding] = useState<ClientPaymentDto | null>(null)
  const [notice, setNotice] = useState('')

  const validDates = !!from && !!until && until >= from
  const params = new URLSearchParams({ fecha_desde: from, fecha_hasta: until })
  if (methodFilter) params.set('id_metodo_pago', methodFilter)
  if (statusFilter) params.set('estado', statusFilter)

  const methods = useApi<PaymentMethodDto[]>('/caja/metodos-pago')
  const payments = useApi<ClientPaymentDto[]>(validDates ? `/caja/cobros?${params}` : null, true)
  const income = useApi<IncomeSummaryDto>(
    isAdmin && validDates ? `/caja/ingresos?${params}` : null,
  )

  const methodMap = new Map((methods.data ?? []).map((item) => [item.id, item.nombre]))

  function reloadAll() {
    payments.reload()
    if (isAdmin) income.reload()
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Cobros e ingresos</h1>
          <p className="mt-2 text-sm text-stone">
            Registro de pagos totales o parciales por cita, anulaciones y resumen de ingresos.
          </p>
        </div>
        <button
          className="api-primary"
          disabled={!methods.data?.length}
          onClick={() => setCreating(true)}
        >
          Registrar cobro
        </button>
      </div>
      <section className="api-panel grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Desde"
          type="date"
          required
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Field
          label="Hasta"
          type="date"
          required
          min={from}
          value={until}
          onChange={(event) => setUntil(event.target.value)}
        />
        <label className="text-sm font-semibold">
          Método de pago
          <select
            className="api-input mt-2"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {(methods.data ?? []).map((method) => (
              <option key={method.id} value={method.id}>
                {method.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Estado
          <select
            className="api-input mt-2"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="registrado">Registrado</option>
            <option value="anulado">Anulado</option>
          </select>
        </label>
      </section>
      <Feedback
        loading={payments.loading || methods.loading}
        error={!validDates ? 'Elige un rango de fechas válido.' : payments.error || methods.error}
        notice={notice}
        onRetry={reloadAll}
      />
      {isAdmin && income.data && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="api-panel">
            <p className="text-sm text-stone">Ingresos registrados</p>
            <p className="mt-3 text-3xl font-semibold">
              {money.format(Number(income.data.total))}
            </p>
          </div>
          <div className="api-panel">
            <p className="text-sm text-stone">Cobros válidos</p>
            <p className="mt-3 text-3xl font-semibold">{income.data.cantidad}</p>
          </div>
          <div className="api-panel">
            <p className="text-sm text-stone">Por método de pago</p>
            <ul className="mt-2 space-y-1 text-sm">
              {income.data.por_metodo.length === 0 && (
                <li className="text-stone">Sin cobros en el período.</li>
              )}
              {income.data.por_metodo.map((row) => (
                <li key={row.id_metodo_pago} className="flex justify-between gap-3">
                  <span>{methodMap.get(row.id_metodo_pago) ?? `Método ${row.id_metodo_pago}`}</span>
                  <strong>{money.format(Number(row.total))}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section className="api-panel">
        <h2 className="font-display text-2xl">Listado de cobros</h2>
        <div className="mt-5 divide-y divide-line">
          {(payments.data ?? []).map((payment) => (
            <article
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
            >
              <div>
                <p className="font-semibold">
                  Cobro #{payment.id} · Cita #{payment.id_cita} ·{' '}
                  {payment.metodo?.nombre ?? `Método ${payment.id_metodo_pago}`}
                </p>
                <p className="mt-1 text-stone">
                  {new Intl.DateTimeFormat('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'America/Lima',
                  }).format(new Date(payment.fecha_cobro))}{' '}
                  · {payment.estado}
                  {payment.referencia_pago ? ` · Ref. ${payment.referencia_pago}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <strong>{money.format(Number(payment.importe))}</strong>
                {payment.estado === 'registrado' && (
                  <button className="api-secondary" onClick={() => setVoiding(payment)}>
                    Anular
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!payments.loading && (payments.data?.length ?? 0) === 0 && (
          <p className="mt-5 text-sm text-stone">No hay cobros para mostrar en este período.</p>
        )}
      </section>
      {creating && methods.data && (
        <RegisterPaymentModal
          methods={methods.data}
          onClose={() => setCreating(false)}
          onSaved={(msg) => {
            setCreating(false)
            setNotice(msg)
            reloadAll()
          }}
        />
      )}
      {voiding && (
        <VoidPaymentModal
          payment={voiding}
          onClose={() => setVoiding(null)}
          onSaved={() => {
            setVoiding(null)
            setNotice('Cobro anulado y puntos actualizados correctamente.')
            reloadAll()
          }}
        />
      )}
    </main>
  )
}
