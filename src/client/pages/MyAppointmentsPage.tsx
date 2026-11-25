import { useRef, useState } from 'react'
import { useApi } from '../../shared/api/useApi'
import type { AppointmentDto } from '../../shared/api/types'
import { cancelAppointment, mapAppointment } from '../../shared/agenda/agendaService'
import { Feedback, Modal, ServiceResults } from '../../shared/components/Forms'
import { RescheduleDialog } from '../../shared/components/RescheduleDialog'
import type { Appointment, AppointmentStatus } from '../../shared/agenda/types'

const statusStyles: Record<AppointmentStatus, string> = {
  confirmada: 'bg-[#F8EFD3] text-[#705917]',
  completada: 'bg-[#E7EBDD] text-sage-dark',
  cancelada: 'bg-[#F5E8E2] text-caramel-dark',
  'no asistió': 'bg-sand text-stone',
}

export function MyAppointmentsPage({ initialAppointmentId }: { initialAppointmentId?: string }) {
  const query = useApi<AppointmentDto[]>('/citas', true)
  const [selectedId, setSelectedId] = useState<string | null>(initialAppointmentId ?? null)
  const [updatedSelection, setUpdatedSelection] = useState<Appointment | null>(null)
  const [mode, setMode] = useState<'detail' | 'reschedule' | 'cancel'>('detail')
  const [showAll, setShowAll] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const appointments = (query.data ?? []).map(mapAppointment)
  const selected =
    updatedSelection?.id === selectedId
      ? updatedSelection
      : (appointments.find((item) => item.id === selectedId) ?? null)
  function setSelected(item: Appointment | null) {
    setSelectedId(item?.id ?? null)
    setUpdatedSelection(item)
  }
  const visible = appointments.filter(
    (item) => showAll || (item.status === 'confirmada' && new Date(item.startsAt) > new Date()),
  )

  async function save() {
    if (!selected || saving.current) return
    setError('')
    saving.current = true
    setBusy(true)
    try {
      const result = await cancelAppointment(selected.id, reason)
      setSelected(result.appointment)
      setMode('detail')
      setNotice('Tu cita se canceló correctamente.')
      query.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cita.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <main id="contenido" className="client-container py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <h1 className="font-display text-4xl sm:text-5xl">Mis citas</h1>
        <a href="#reservar" className="api-primary">
          Nueva reserva
        </a>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          className={showAll ? 'api-secondary' : 'api-primary'}
          onClick={() => setShowAll(false)}
        >
          Próximas
        </button>
        <button
          className={showAll ? 'api-primary' : 'api-secondary'}
          onClick={() => setShowAll(true)}
        >
          Todas mis citas
        </button>
      </div>
      <Feedback
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        notice={notice}
      />
      <div className="grid auto-rows-fr gap-5 md:grid-cols-2">
        {visible.map((item) => (
          <article className="api-panel flex h-full flex-col" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${statusStyles[item.status]}`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
              <span className="text-xs text-stone">Cita #{item.id}</span>
            </div>
            <h2 className="mt-3 font-display text-2xl">
              {item.date} · {item.startTime}
            </h2>
            <p className="mt-2 text-sm text-stone">{item.stylistName}</p>
            <p className="mt-4 text-sm leading-relaxed">
              {item.services.map((service) => service.serviceName).join(' · ')}
            </p>
            <div className="mt-auto pt-5">
              <button
                className="api-secondary"
                onClick={() => {
                  setSelected(item)
                  setMode('detail')
                  setError('')
                }}
              >
                Ver detalle
              </button>
            </div>
          </article>
        ))}
      </div>
      {!query.loading && !query.error && !visible.length && (
        <p className="api-panel text-stone">No hay citas para mostrar en esta vista.</p>
      )}
      {selected && mode !== 'reschedule' && (
        <Modal
          title={`Cita ${selected.id}`}
          busy={busy}
          onClose={() => {
            if (!saving.current) setSelected(null)
          }}
        >
          <p className="text-sm text-stone">
            {selected.date} · {selected.startTime} · {selected.stylistName} · {selected.status}
          </p>
          <ServiceResults services={selected.services} />
          {selected.payments.length > 0 && (
            <div className="my-4 rounded-card bg-sand p-4 text-sm">
              <p className="font-semibold">
                Pagado: S/ {selected.totalPaid.toFixed(2)} · Saldo pendiente: S/{' '}
                {selected.pendingBalance.toFixed(2)}
              </p>
            </div>
          )}
          {selected.cancellationReason && (
            <p className="my-4 rounded-card bg-sand p-4 text-sm">{selected.cancellationReason}</p>
          )}
          {mode === 'cancel' && (
            <label className="my-6 block text-sm font-semibold">
              Motivo (opcional)
              <textarea
                className="api-input mt-2"
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <Feedback error={error} />
          {selected.status === 'confirmada' && new Date(selected.startsAt) > new Date() && (
            <div className="mt-6 flex flex-wrap gap-3">
              {mode === 'detail' ? (
                <>
                  <button
                    className="api-primary"
                    onClick={() => {
                      setMode('reschedule')
                      setError('')
                    }}
                  >
                    Reprogramar
                  </button>
                  <button
                    className="api-secondary"
                    onClick={() => {
                      setMode('cancel')
                      setReason('')
                      setError('')
                    }}
                  >
                    Cancelar cita
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="api-primary"
                    disabled={busy}
                    onClick={() => {
                      void save()
                    }}
                  >
                    {busy ? 'Guardando…' : 'Confirmar cambio'}
                  </button>
                  <button
                    className="api-secondary"
                    disabled={busy}
                    onClick={() => {
                      setMode('detail')
                      setError('')
                    }}
                  >
                    Volver
                  </button>
                </>
              )}
            </div>
          )}
        </Modal>
      )}
      {selected && mode === 'reschedule' && (
        <RescheduleDialog
          appointment={selected}
          onClose={() => setMode('detail')}
          onRescheduled={(result) => {
            setSelected(result.appointment)
            setMode('detail')
            setNotice('Tu cita se reprogramó correctamente.')
            query.reload()
          }}
        />
      )}
    </main>
  )
}
