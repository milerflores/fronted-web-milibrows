import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays, dateFromKey, dateKey, endTime } from '../../shared/agenda/dates'
import {
  createAppointment,
  findClients,
  getAvailableStartTimes,
  getEligibleStylists,
} from '../../shared/agenda/mockAgendaService'
import type { AgendaData, CreatedAppointment, DemoActor } from '../../shared/agenda/types'
import { Icon } from './Icon'
import { ClientFields } from './ClientFields'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const longDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

interface NewAppointmentDialogProps {
  data: AgendaData
  preferredDate: string
  preferredClientId?: string
  actor: DemoActor
  onClose: () => void
  onCreated: (result: CreatedAppointment) => void
}

function suggestedDate(preferredDate: string): string {
  const today = dateFromKey(dateKey(new Date()))
  const preferred = dateFromKey(preferredDate)
  const date = preferred > today ? preferred : today
  return dateKey(date.getDay() === 0 ? addDays(date, 1) : date)
}

export function NewAppointmentDialog({
  data,
  preferredDate,
  preferredClientId,
  actor,
  onClose,
  onCreated,
}: NewAppointmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const submittingRef = useRef(false)
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [clientQuery, setClientQuery] = useState(
    () => data.clients.find((client) => client.id === preferredClientId)?.name ?? '',
  )
  const [clientId, setClientId] = useState(preferredClientId ?? '')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [stylistId, setStylistId] = useState('')
  const [date, setDate] = useState(() => suggestedDate(preferredDate))
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')
  const [stylistNotice, setStylistNotice] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const selectedClient = data.clients.find((client) => client.id === clientId)
  const clientMatches = findClients(clientQuery)
  const selectedServices = serviceIds
    .map((id) => data.services.find((service) => service.id === id))
    .filter((service) => service !== undefined)
  const eligibleStylists = getEligibleStylists(serviceIds)
  const selectedStylist = data.stylists.find((stylist) => stylist.id === stylistId)
  const duration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
  const price = selectedServices.reduce((sum, service) => sum + service.price, 0)
  const availableTimes = getAvailableStartTimes(date, stylistId, serviceIds)
  const validStartTime = availableTimes.includes(startTime) ? startTime : ''
  const finishTime = validStartTime ? endTime(validStartTime, duration) : ''

  function toggleService(serviceId: string) {
    const next = serviceIds.includes(serviceId)
      ? serviceIds.filter((id) => id !== serviceId)
      : [...serviceIds, serviceId]
    setServiceIds(next)
    setStartTime('')
    setError('')
    if (stylistId && !getEligibleStylists(next).some((stylist) => stylist.id === stylistId)) {
      setStylistId('')
      setStylistNotice('La estilista seleccionada no realiza todos estos servicios. Elige otra.')
    } else {
      setStylistNotice('')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError('')

    if (clientMode === 'existing' && !clientId) {
      setError('Selecciona un cliente existente.')
      return
    }
    if (clientMode === 'new' && (!newName.trim() || !newPhone.trim())) {
      setError('Completa el nombre y teléfono del cliente.')
      return
    }
    if (!serviceIds.length) {
      setError('Selecciona al menos un servicio.')
      return
    }
    if (!stylistId) {
      setError('Selecciona una estilista habilitada.')
      return
    }
    if (!date || !validStartTime) {
      setError('Selecciona una fecha y hora disponibles.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const result = await createAppointment(
        {
          client:
            clientMode === 'existing'
              ? { kind: 'existing', clientId }
              : { kind: 'new', name: newName, phone: newPhone, email: newEmail },
          serviceIds,
          stylistId,
          date,
          startTime: validStartTime,
          notes,
        },
        actor,
      )
      onCreated(result)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo guardar la cita. Intenta de nuevo.',
      )
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-appointment-title"
      className="booking-dialog bg-white text-graphite"
      onClose={onClose}
      onCancel={(event) => {
        if (submittingRef.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !submittingRef.current) dialogRef.current?.close()
      }}
    >
      <form noValidate onSubmit={submit} aria-busy={submitting}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Agenda · Registro
            </p>
            <h2 id="new-appointment-title" className="mt-1 font-display text-3xl">
              Nueva cita
            </h2>
            <p className="mt-1 text-sm text-stone">Completa los datos para reservar un horario.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="icon-button"
            disabled={submitting}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="grid gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-8">
            <section aria-labelledby="booking-client-title">
              <h3 id="booking-client-title" className="form-section-title">
                <span className="form-section-number">1</span>Cliente
              </h3>
              <div
                className="mt-4 flex rounded-lg border border-line bg-ivory p-1"
                role="group"
                aria-label="Tipo de cliente"
              >
                <button
                  type="button"
                  className={`form-tab ${clientMode === 'existing' ? 'form-tab--active' : ''}`}
                  aria-pressed={clientMode === 'existing'}
                  onClick={() => {
                    setClientMode('existing')
                    setError('')
                  }}
                >
                  Cliente existente
                </button>
                <button
                  type="button"
                  className={`form-tab ${clientMode === 'new' ? 'form-tab--active' : ''}`}
                  aria-pressed={clientMode === 'new'}
                  onClick={() => {
                    setClientMode('new')
                    setError('')
                  }}
                >
                  Cliente nuevo
                </button>
              </div>

              {clientMode === 'existing' ? (
                <div className="mt-4">
                  <label className="form-label" htmlFor="client-search">
                    Buscar por nombre o teléfono
                  </label>
                  <input
                    id="client-search"
                    className="form-input mt-1"
                    type="search"
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value)
                      setClientId('')
                    }}
                    placeholder="Nombre o teléfono"
                    autoComplete="off"
                  />
                  <div
                    className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line"
                    role="group"
                    aria-label="Resultados de clientes"
                  >
                    {clientMatches.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className={`flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-ivory ${clientId === client.id ? 'bg-champagne/60' : ''}`}
                        aria-pressed={clientId === client.id}
                        onClick={() => {
                          setClientId(client.id)
                          setError('')
                        }}
                      >
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-stone">{client.phone}</span>
                      </button>
                    ))}
                    {!clientMatches.length && (
                      <p className="px-3 py-4 text-sm text-stone">
                        No hay clientes con esa búsqueda. Puedes registrar uno nuevo.
                      </p>
                    )}
                  </div>
                  {selectedClient && (
                    <p className="mt-2 text-xs font-semibold text-sage-dark">
                      Seleccionado: {selectedClient.name} · {selectedClient.phone}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <ClientFields
                    idPrefix="booking-new-client"
                    value={{ name: newName, phone: newPhone, email: newEmail }}
                    onChange={(field, value) => {
                      if (field === 'name') setNewName(value)
                      if (field === 'phone') setNewPhone(value)
                      if (field === 'email') setNewEmail(value)
                    }}
                    onUseExisting={(client) => {
                      setClientMode('existing')
                      setClientId(client.id)
                      setClientQuery(client.name)
                      setError('')
                    }}
                  />
                  <p className="text-xs text-stone">
                    Se guardará junto con la cita, sin crear una cuenta.
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="booking-services-title">
              <h3 id="booking-services-title" className="form-section-title">
                <span className="form-section-number">2</span>Servicios
              </h3>
              <p className="mt-2 text-xs text-stone">
                Puedes combinar varios servicios en una misma cita.
              </p>
              <div className="mt-4 space-y-2">
                {data.services
                  .filter((service) => service.active)
                  .map((service) => (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 transition ${serviceIds.includes(service.id) ? 'border-gold bg-[#FFFBED]' : 'border-line hover:bg-ivory'}`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-[#C9A24B]"
                        checked={serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                      <span className="min-w-0 flex-1 text-sm font-medium">{service.name}</span>
                      <span className="text-right text-xs text-stone">
                        {service.duration} min
                        <br />
                        <strong className="text-graphite">{money.format(service.price)}</strong>
                      </span>
                    </label>
                  ))}
              </div>
            </section>

            <section aria-labelledby="booking-schedule-title">
              <h3 id="booking-schedule-title" className="form-section-title">
                <span className="form-section-number">3</span>Estilista y horario
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="booking-stylist">
                    Estilista *
                  </label>
                  <select
                    id="booking-stylist"
                    className="form-input mt-1"
                    value={stylistId}
                    disabled={!serviceIds.length || !eligibleStylists.length}
                    onChange={(event) => {
                      setStylistId(event.target.value)
                      setStartTime('')
                      setStylistNotice('')
                      setError('')
                    }}
                  >
                    <option value="">Seleccionar estilista</option>
                    {eligibleStylists.map((stylist) => (
                      <option key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="booking-date">
                    Fecha *
                  </label>
                  <input
                    id="booking-date"
                    className="form-input mt-1"
                    type="date"
                    min={dateKey(new Date())}
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value)
                      setStartTime('')
                      setError('')
                    }}
                  />
                </div>
              </div>
              {stylistNotice && (
                <p role="status" className="mt-2 text-xs text-caramel-dark">
                  {stylistNotice}
                </p>
              )}
              {!!serviceIds.length && !eligibleStylists.length && (
                <p className="mt-2 text-xs text-caramel-dark">
                  No hay estilistas habilitadas para esa combinación de servicios.
                </p>
              )}
              <div className="mt-4">
                <label className="form-label" htmlFor="booking-time">
                  Hora de inicio *
                </label>
                <select
                  id="booking-time"
                  className="form-input mt-1"
                  value={validStartTime}
                  disabled={!availableTimes.length}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    setError('')
                  }}
                >
                  <option value="">Seleccionar hora</option>
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time} – {endTime(time, duration)}
                    </option>
                  ))}
                </select>
              </div>
              {date && dateFromKey(date).getDay() === 0 && (
                <p role="status" className="mt-2 text-xs text-caramel-dark">
                  El estudio atiende de lunes a sábado.
                </p>
              )}
              {date && stylistId && serviceIds.length > 0 && !availableTimes.length && (
                <p role="status" className="mt-2 text-xs text-caramel-dark">
                  No hay horarios disponibles para esta fecha y duración. Prueba otro día o
                  estilista.
                </p>
              )}
              <p className="mt-2 text-xs text-stone">
                Atención de 10:00 a 22:00. Solo se muestran horas que permiten completar todos los
                servicios.
              </p>
            </section>

            <div>
              <label className="form-label" htmlFor="booking-notes">
                Observaciones (opcional)
              </label>
              <textarea
                id="booking-notes"
                className="form-input mt-1 min-h-24 resize-y"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                placeholder="Indicaciones para la atención"
              />
            </div>
          </div>

          <aside
            aria-labelledby="booking-summary-title"
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="rounded-card border border-line bg-ivory p-5">
              <p className="text-[11px] font-semibold tracking-[.14em] text-caramel-dark uppercase">
                Antes de guardar
              </p>
              <h3 id="booking-summary-title" className="mt-1 font-display text-2xl">
                Resumen de cita
              </h3>
              <dl className="mt-5 space-y-4 text-sm">
                {(clientMode === 'existing' ? selectedClient : newName.trim()) && (
                  <div>
                    <dt className="detail-label">Cliente</dt>
                    <dd className="mt-1 font-medium">
                      {clientMode === 'existing' ? selectedClient?.name : newName.trim()}
                      {clientMode === 'new' && newPhone.trim() && (
                        <span className="block text-xs font-normal text-stone">
                          {newPhone.trim()}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {selectedServices.length > 0 && (
                  <div>
                    <dt className="detail-label">Servicios</dt>
                    <dd className="mt-1">
                      <ul className="space-y-1">
                        {selectedServices.map((service) => (
                          <li key={service.id} className="flex justify-between gap-2">
                            <span>{service.name}</span>
                            <span className="whitespace-nowrap">{money.format(service.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {selectedStylist && (
                  <div>
                    <dt className="detail-label">Estilista</dt>
                    <dd className="mt-1 font-medium">{selectedStylist.name}</dd>
                  </div>
                )}
                {date && (
                  <div>
                    <dt className="detail-label">Fecha y horario</dt>
                    <dd className="mt-1 font-medium">
                      {longDate.format(dateFromKey(date))}
                      {validStartTime && (
                        <span className="block">
                          {validStartTime} – {finishTime}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
              {selectedServices.length > 0 && (
                <>
                  <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone">Duración total</span>
                      <strong>{duration} min</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Precio acordado</span>
                      <strong>{money.format(price)}</strong>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-stone">
                    El precio es informativo. Registrar la cita no registra un cobro.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-line bg-white px-5 py-4 sm:px-8">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-[#FAF0EA] px-3 py-2 text-sm text-caramel-dark"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:bg-ivory disabled:opacity-50"
              disabled={submitting}
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] disabled:cursor-wait disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Guardando…' : 'Confirmar cita'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
