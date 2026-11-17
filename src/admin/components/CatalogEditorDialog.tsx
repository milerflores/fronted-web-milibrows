import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AgendaOperationError,
  getStylistAssignmentImpact,
  saveService,
  saveStylist,
} from '../../shared/agenda/mockAgendaService'
import type {
  AgendaData,
  DemoActor,
  Service,
  ServiceInput,
  Stylist,
  StylistInput,
} from '../../shared/agenda/types'
import { Icon } from './Icon'

interface CatalogEditorDialogProps {
  kind: 'service' | 'stylist'
  record: Service | Stylist | null
  data: AgendaData
  actor: DemoActor
  onClose: () => void
  onSaved: (data: AgendaData, name: string) => void
}

export function CatalogEditorDialog({
  kind,
  record,
  data,
  actor,
  onClose,
  onSaved,
}: CatalogEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const service = kind === 'service' && record ? (record as Service) : null
  const stylist = kind === 'stylist' && record ? (record as Stylist) : null
  const [serviceValue, setServiceValue] = useState({
    name: service?.name ?? '',
    description: service?.description ?? '',
    price: service?.price.toString() ?? '',
    duration: service?.duration.toString() ?? '',
  })
  const [stylistValue, setStylistValue] = useState<StylistInput>({
    name: stylist?.name ?? '',
    phone: stylist?.phone ?? '',
    email: stylist?.email ?? '',
    specialty: stylist?.specialty ?? '',
    serviceIds: stylist?.serviceIds ?? [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const removedServiceIds =
    stylist?.serviceIds.filter((id) => !stylistValue.serviceIds.includes(id)) ?? []
  const assignmentImpact = stylist
    ? getStylistAssignmentImpact(stylist.id, removedServiceIds, actor)
    : 0

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function changeService(field: keyof typeof serviceValue, value: string) {
    setServiceValue((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function changeStylist(field: keyof StylistInput, value: string | string[]) {
    setStylistValue((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setErrors({})
    savingRef.current = true
    setSaving(true)
    try {
      if (kind === 'service') {
        const input: ServiceInput = {
          name: serviceValue.name,
          description: serviceValue.description,
          price: serviceValue.price.trim() === '' ? Number.NaN : Number(serviceValue.price),
          duration:
            serviceValue.duration.trim() === '' ? Number.NaN : Number(serviceValue.duration),
        }
        const result = await saveService(input, actor, service?.id)
        onSaved(result.data, result.record.name)
      } else {
        const result = await saveStylist(stylistValue, actor, stylist?.id)
        onSaved(result.data, result.record.name)
      }
    } catch (cause) {
      if (cause instanceof AgendaOperationError && cause.field)
        setErrors({ [cause.field]: cause.message })
      else
        setErrors({
          general: cause instanceof Error ? cause.message : 'No se pudo guardar. Intenta de nuevo.',
        })
      savingRef.current = false
      setSaving(false)
    }
  }

  const title =
    kind === 'service'
      ? service
        ? 'Editar servicio'
        : 'Nuevo servicio'
      : stylist
        ? 'Editar estilista'
        : 'Nueva estilista'
  const textInput = (
    field: 'name' | 'phone' | 'email' | 'specialty',
    label: string,
    value: string,
    maxLength: number,
    type = 'text',
  ) => (
    <div>
      <label className="form-label" htmlFor={`catalog-${field}`}>
        {label}
      </label>
      <input
        id={`catalog-${field}`}
        type={type}
        className="form-input mt-1"
        value={value}
        maxLength={maxLength}
        aria-invalid={!!errors[field]}
        aria-describedby={errors[field] ? `catalog-${field}-error` : undefined}
        onChange={(event) => changeStylist(field, event.target.value)}
      />
      {errors[field] && (
        <p id={`catalog-${field}-error`} role="alert" className="field-error">
          {errors[field]}
        </p>
      )}
    </div>
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="catalog-editor-title"
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
              Catálogos · Administración
            </p>
            <h2 id="catalog-editor-title" className="mt-1 font-display text-3xl">
              {title}
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
        <div className="space-y-4 px-5 py-6 sm:px-7">
          {kind === 'service' ? (
            <>
              <div>
                <label className="form-label" htmlFor="catalog-service-name">
                  Nombre *
                </label>
                <input
                  id="catalog-service-name"
                  className="form-input mt-1"
                  value={serviceValue.name}
                  maxLength={100}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'catalog-name-error' : undefined}
                  onChange={(event) => changeService('name', event.target.value)}
                />
                {errors.name && (
                  <p id="catalog-name-error" role="alert" className="field-error">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="catalog-description">
                  Descripción
                </label>
                <textarea
                  id="catalog-description"
                  className="form-input mt-1 min-h-24 resize-y"
                  value={serviceValue.description}
                  maxLength={500}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'catalog-description-error' : undefined}
                  onChange={(event) => changeService('description', event.target.value)}
                />
                {errors.description && (
                  <p id="catalog-description-error" role="alert" className="field-error">
                    {errors.description}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="catalog-price">
                    Precio en soles *
                  </label>
                  <input
                    id="catalog-price"
                    className="form-input mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={serviceValue.price}
                    aria-invalid={!!errors.price}
                    aria-describedby={errors.price ? 'catalog-price-error' : undefined}
                    onChange={(event) => changeService('price', event.target.value)}
                  />
                  {errors.price && (
                    <p id="catalog-price-error" role="alert" className="field-error">
                      {errors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label" htmlFor="catalog-duration">
                    Duración en minutos *
                  </label>
                  <input
                    id="catalog-duration"
                    className="form-input mt-1"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={serviceValue.duration}
                    aria-invalid={!!errors.duration}
                    aria-describedby={errors.duration ? 'catalog-duration-error' : undefined}
                    onChange={(event) => changeService('duration', event.target.value)}
                  />
                  {errors.duration && (
                    <p id="catalog-duration-error" role="alert" className="field-error">
                      {errors.duration}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone">
                Los cambios se aplicarán a reservas nuevas. Las citas existentes conservan sus
                precios y duraciones acordados.
              </p>
            </>
          ) : (
            <>
              {textInput('name', 'Nombre completo *', stylistValue.name, 100)}
              <div className="grid gap-4 sm:grid-cols-2">
                {textInput('phone', 'Teléfono', stylistValue.phone, 20, 'tel')}
                {textInput('email', 'Correo', stylistValue.email, 120, 'email')}
              </div>
              <p className="text-xs text-stone">
                Ingresa al menos un teléfono o correo de contacto.
              </p>
              {textInput(
                'specialty',
                'Especialidad o descripción breve',
                stylistValue.specialty,
                200,
              )}
              <fieldset>
                <legend className="form-label">Servicios habilitados</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {data.services.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-3 text-sm hover:bg-ivory"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-[#C9A24B]"
                        checked={stylistValue.serviceIds.includes(item.id)}
                        onChange={() =>
                          changeStylist(
                            'serviceIds',
                            stylistValue.serviceIds.includes(item.id)
                              ? stylistValue.serviceIds.filter((id) => id !== item.id)
                              : [...stylistValue.serviceIds, item.id],
                          )
                        }
                      />
                      <span>
                        {item.name}
                        {!item.active && <span className="block text-xs text-stone">Inactivo</span>}
                      </span>
                    </label>
                  ))}
                </div>
                {!data.services.length && (
                  <p className="mt-2 text-sm text-stone">No hay servicios registrados.</p>
                )}
                {errors.serviceIds && (
                  <p role="alert" className="field-error">
                    {errors.serviceIds}
                  </p>
                )}
              </fieldset>
              {assignmentImpact > 0 && (
                <p
                  role="status"
                  className="rounded-card border border-[#E7D6A5] bg-[#FFFBED] p-3 text-sm text-stone"
                >
                  <strong className="text-graphite">
                    {assignmentImpact}{' '}
                    {assignmentImpact === 1
                      ? 'cita confirmada futura afectada'
                      : 'citas confirmadas futuras afectadas'}
                    .
                  </strong>{' '}
                  Al retirar estas habilitaciones, las citas existentes permanecerán visibles y no
                  cambiarán automáticamente.
                </p>
              )}
            </>
          )}
          {errors.general && (
            <p role="alert" className="rounded-lg bg-[#FAF0EA] px-3 py-2 text-sm text-caramel-dark">
              {errors.general}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4 sm:px-7">
          <button
            type="button"
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:bg-ivory disabled:opacity-50"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-[#D7B65F] disabled:cursor-wait disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
