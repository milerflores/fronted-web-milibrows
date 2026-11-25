import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useApi } from '../api/useApi'
import type { AvailabilityDto, EmployeeDto, ServiceDto } from '../api/types'
import { ApiError, resource } from '../api/http'
import { mapService } from '../agenda/agendaService'
import { appointmentIso, endTime, todayKey } from '../agenda/dates'
import { availableStartTimes } from '../agenda/availability'
import { Feedback, Field } from './Forms'

export interface BookingSelection {
  date: string
  services: { serviceId: string; stylistId: string; startTime: string }[]
}

export function BookingForm({
  initialServiceId,
  onSave,
  signedIn = true,
  onRequireAuth,
  internal = false,
}: {
  initialServiceId?: string
  onSave: (input: BookingSelection) => Promise<void>
  signedIn?: boolean
  onRequireAuth?: () => void
  internal?: boolean
}) {
  const catalog = useApi<ServiceDto[]>(
    internal ? '/administracion/servicios' : '/servicios',
    internal,
  )
  const employees = useApi<EmployeeDto[]>(internal ? '/empleados' : null, true)
  const [serviceIds, setServiceIds] = useState<string[]>(initialServiceId ? [initialServiceId] : [])
  const [date, setDate] = useState(todayKey)
  const [stylistId, setStylistId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [perService, setPerService] = useState(false)
  const [serviceAssignments, setServiceAssignments] = useState<
    Record<string, { stylistId: string; startTime: string }>
  >({})
  const [perServiceAvailability, setPerServiceAvailability] = useState<{
    key: string
    data: Record<string, AvailabilityDto[]>
  }>({ key: '', data: {} })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const services = (catalog.data ?? []).filter((service) => service.activo).map(mapService)
  const selected = services.filter((service) => serviceIds.includes(service.id))
  const validIds = selected.map((service) => service.id)
  const multiMode = perService && selected.length > 1

  const params = new URLSearchParams({ fecha: date })
  validIds.forEach((id) => params.append('ids_servicios[]', id))
  const availability = useApi<AvailabilityDto[]>(
    !internal && !multiMode && date && selected.length ? `/disponibilidad?${params}` : null,
  )

  const validIdsKey = validIds.join(',')
  const perServiceKey = !internal && multiMode && date && validIdsKey ? `${date}|${validIdsKey}` : ''
  const loadingPerService = !!perServiceKey && perServiceAvailability.key !== perServiceKey
  useEffect(() => {
    if (!perServiceKey) return
    let active = true
    const ids = validIdsKey.split(',')
    Promise.all(
      ids.map(async (id) => {
        const q = new URLSearchParams({ fecha: date })
        q.append('ids_servicios[]', id)
        const data = await resource<AvailabilityDto[]>(`/disponibilidad?${q}`)
        return [id, data] as const
      }),
    )
      .then((entries) => {
        if (active) setPerServiceAvailability({ key: perServiceKey, data: Object.fromEntries(entries) })
      })
      .catch(() => {
        if (active) setPerServiceAvailability({ key: perServiceKey, data: {} })
      })
    return () => {
      active = false
    }
  }, [perServiceKey, date, validIdsKey])

  const employee = availability.data?.find((item) => String(item.id_empleado) === stylistId)
  const times = availableStartTimes(employee)
  const eligibleEmployeesFor = (ids: string[]) =>
    (employees.data ?? []).filter(
      (item) =>
        item.activo &&
        item.cuenta.activo &&
        item.cuenta.roles.includes('estilista') &&
        item.admite_reservas &&
        ids.every((id) =>
          item.servicios.some(
            (service) => String(service.id) === id && (service.pivot?.activo ?? true),
          ),
        ),
    )
  const eligibleEmployees = eligibleEmployeesFor(validIds)
  const internalEmployee = eligibleEmployees.find((item) => String(item.id) === stylistId)
  const selectedEmployee = internal ? internalEmployee : employee
  const employeeName = internal
    ? internalEmployee?.cuenta.persona?.nombre_completo
    : employee?.nombre_completo
  const duration = selected.reduce((total, service) => total + service.duration, 0)
  const total = selected.reduce((sum, service) => sum + service.price, 0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    setError('')
    if (!signedIn) {
      onRequireAuth?.()
      return
    }

    let lines: { serviceId: string; stylistId: string; startTime: string }[] = []
    if (multiMode) {
      for (const svc of selected) {
        const assign = serviceAssignments[svc.id]
        const empId = assign?.stylistId ?? ''
        const time = assign?.startTime ?? ''
        const okTime = internal
          ? !!time && new Date(appointmentIso(date, time)) > new Date()
          : availableStartTimes(
              perServiceAvailability.data[svc.id]?.find((e) => String(e.id_empleado) === empId),
            ).includes(time)
        if (!empId || !okTime) {
          setError('Selecciona una estilista y un horario disponible para cada servicio.')
          return
        }
        lines.push({ serviceId: svc.id, stylistId: empId, startTime: time })
      }
    } else {
      const validTime = internal
        ? !!startTime && new Date(appointmentIso(date, startTime)) > new Date()
        : times.includes(startTime)
      if (!selected.length || selected.length > 20 || !selectedEmployee || !validTime) {
        setError('Selecciona los servicios, una estilista y un horario disponible.')
        return
      }
      let cursor = startTime
      lines = selected.map((svc) => {
        const item = { serviceId: svc.id, stylistId, startTime: cursor }
        cursor = endTime(cursor, svc.duration)
        return item
      })
    }

    savingRef.current = true
    setSaving(true)
    try {
      await onSave({ date, services: lines })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo confirmar la cita.')
      if (cause instanceof ApiError && (cause.status === 409 || cause.status === 422)) {
        setStartTime('')
        availability.reload()
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} aria-busy={saving} className="space-y-8">
      <section>
        <h2 className="font-display text-2xl">Elige tus servicios</h2>
        <Feedback loading={catalog.loading} error={catalog.error} onRetry={catalog.reload} />
        {!catalog.loading && !catalog.error && !services.length && (
          <p className="mt-4 text-stone">Aún no hay servicios disponibles para reservar.</p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <label
              key={service.id}
              className={`flex h-full cursor-pointer items-start gap-3 rounded-card border p-4 text-sm transition ${serviceIds.includes(service.id) ? 'border-gold bg-champagne/30' : 'border-line bg-white hover:border-gold/60'}`}
            >
              <input
                type="checkbox"
                className="mt-1 accent-[#C9A24B]"
                checked={serviceIds.includes(service.id)}
                disabled={saving}
                onChange={() => {
                  setServiceIds((current) =>
                    current.includes(service.id)
                      ? current.filter((id) => id !== service.id)
                      : [...current, service.id],
                  )
                  setStartTime('')
                }}
              />
              <span>
                <strong className="block">{service.name}</strong>
                <span className="mt-1 block text-stone">
                  {service.duration} min · S/ {service.price.toFixed(2)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-5">
        <h2 className="font-display text-2xl">Encuentra tu horario</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Fecha"
            type="date"
            min={todayKey()}
            required
            value={date}
            disabled={saving}
            onChange={(event) => {
              setDate(event.target.value)
              setStartTime('')
              setServiceAssignments({})
            }}
          />
          {!multiMode && (
            <label className="block text-sm font-semibold">
              Estilista
              <select
                className="api-input mt-2"
                value={selectedEmployee ? stylistId : ''}
                required
                disabled={saving || availability.loading || employees.loading}
                onChange={(event) => {
                  setStylistId(event.target.value)
                  setStartTime('')
                }}
              >
                <option value="">Seleccionar estilista</option>
                {internal &&
                  selected.length > 0 &&
                  eligibleEmployees.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.cuenta.persona?.nombre_completo}
                    </option>
                  ))}
                {(availability.data ?? [])
                  .filter((item) => item.intervalos.length > 0)
                  .map((item) => (
                    <option key={item.id_empleado} value={item.id_empleado}>
                      {item.nombre_completo}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
        {selected.length > 1 && (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-[#C9A24B]"
              checked={perService}
              disabled={saving}
              onChange={(event) => setPerService(event.target.checked)}
            />
            Elegir estilista y horario distinto por servicio
          </label>
        )}
        <Feedback
          loading={availability.loading || loadingPerService}
          error={availability.error}
          onRetry={availability.reload}
        />
        <Feedback loading={employees.loading} error={employees.error} onRetry={employees.reload} />
        {!multiMode &&
          selected.length > 0 &&
          availability.data &&
          !availability.data.some((item) => item.intervalos.length) && (
            <p role="status" className="rounded-card bg-sand p-4 text-sm">
              No hay disponibilidad para estos servicios en esta fecha. Puedes elegir otro día o
              asignar una estilista distinta por servicio.
            </p>
          )}
        {multiMode ? (
          <div className="space-y-4">
            {selected.map((svc) => {
              const assign = serviceAssignments[svc.id] ?? { stylistId: '', startTime: '' }
              const availList = perServiceAvailability.data[svc.id] ?? []
              const empAvail = availList.find((item) => String(item.id_empleado) === assign.stylistId)
              const slotTimes = availableStartTimes(empAvail)
              const intEmps = eligibleEmployeesFor([svc.id])
              return (
                <div key={svc.id} className="rounded-card border border-line p-4 space-y-4">
                  <p className="text-sm font-semibold">
                    {svc.name} · {svc.duration} min
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      Estilista
                      <select
                        className="api-input mt-2"
                        required
                        disabled={saving || loadingPerService || employees.loading}
                        value={assign.stylistId}
                        onChange={(event) =>
                          setServiceAssignments((current) => ({
                            ...current,
                            [svc.id]: { stylistId: event.target.value, startTime: '' },
                          }))
                        }
                      >
                        <option value="">Seleccionar estilista</option>
                        {internal
                          ? intEmps.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.cuenta.persona?.nombre_completo}
                              </option>
                            ))
                          : availList
                              .filter((item) => item.intervalos.length > 0)
                              .map((item) => (
                                <option key={item.id_empleado} value={item.id_empleado}>
                                  {item.nombre_completo}
                                </option>
                              ))}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold">
                      Hora de inicio
                      {internal ? (
                        <input
                          type="time"
                          className="api-input mt-2"
                          required
                          disabled={saving}
                          value={assign.startTime}
                          onChange={(event) =>
                            setServiceAssignments((current) => ({
                              ...current,
                              [svc.id]: { ...assign, startTime: event.target.value },
                            }))
                          }
                        />
                      ) : (
                        <select
                          className="api-input mt-2"
                          required
                          disabled={!empAvail || saving || loadingPerService}
                          value={slotTimes.includes(assign.startTime) ? assign.startTime : ''}
                          onChange={(event) =>
                            setServiceAssignments((current) => ({
                              ...current,
                              [svc.id]: { ...assign, startTime: event.target.value },
                            }))
                          }
                        >
                          <option value="">Seleccionar hora</option>
                          {slotTimes.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <label className="block text-sm font-semibold">
            Hora de inicio
            {internal ? (
              <input
                type="time"
                className="api-input mt-2"
                required
                value={startTime}
                disabled={saving}
                onChange={(event) => setStartTime(event.target.value)}
              />
            ) : (
              <select
                className="api-input mt-2"
                required
                disabled={!employee || saving || availability.loading}
                value={times.includes(startTime) ? startTime : ''}
                onChange={(event) => setStartTime(event.target.value)}
              >
                <option value="">Seleccionar hora</option>
                {times.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        {internal && (
          <p className="text-sm text-stone">
            El estudio validará la jornada y la disponibilidad al confirmar esta reserva interna.
          </p>
        )}
      </section>
      <div className="rounded-[18px] bg-sand p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm">
            {selected.length} {selected.length === 1 ? 'servicio' : 'servicios'} · {duration} min
          </span>
          <strong className="whitespace-nowrap">S/ {total.toFixed(2)}</strong>
        </div>
        {!multiMode && selectedEmployee && startTime && (
          <p className="mt-3 text-sm text-stone">
            {employeeName} · {date} · {startTime}
          </p>
        )}
      </div>
      <Feedback error={error} />
      <button
        disabled={
          saving ||
          catalog.loading ||
          !!catalog.error ||
          availability.loading ||
          loadingPerService ||
          employees.loading ||
          !!employees.error ||
          !services.length
        }
        className="api-primary w-full sm:w-auto"
      >
        {saving ? 'Confirmando…' : signedIn ? 'Confirmar cita' : 'Iniciar sesión para confirmar'}
      </button>
    </form>
  )
}
