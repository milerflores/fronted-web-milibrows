import { findPossibleDuplicates } from '../../shared/agenda/mockAgendaService'
import type { Client, ClientInput } from '../../shared/agenda/types'

type ClientField = keyof ClientInput

interface ClientFieldsProps {
  value: ClientInput
  onChange: (field: ClientField, value: string) => void
  errors?: Partial<Record<ClientField, string>>
  onUseExisting?: (client: Client) => void
  excludeClientId?: string
  showPreferences?: boolean
  idPrefix: string
}

export function ClientFields({
  value,
  onChange,
  errors = {},
  onUseExisting,
  excludeClientId,
  showPreferences = false,
  idPrefix,
}: ClientFieldsProps) {
  const matches = findPossibleDuplicates(value.name, value.phone).filter(
    (client) => client.id !== excludeClientId,
  )
  const fields: {
    key: 'name' | 'phone' | 'email'
    label: string
    type: string
    autocomplete: string
    maxLength: number
  }[] = [
    { key: 'name', label: 'Nombre completo *', type: 'text', autocomplete: 'name', maxLength: 100 },
    { key: 'phone', label: 'Teléfono *', type: 'tel', autocomplete: 'tel', maxLength: 20 },
    {
      key: 'email',
      label: 'Correo (opcional)',
      type: 'email',
      autocomplete: 'email',
      maxLength: 120,
    },
  ]

  return (
    <div className="space-y-3">
      {fields.map(({ key, label, type, autocomplete, maxLength }) => (
        <div key={key}>
          <label className="form-label" htmlFor={`${idPrefix}-${key}`}>
            {label}
          </label>
          <input
            id={`${idPrefix}-${key}`}
            className="form-input mt-1"
            type={type}
            value={value[key]}
            onChange={(event) => onChange(key, event.target.value)}
            maxLength={maxLength}
            autoComplete={autocomplete}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${idPrefix}-${key}-error` : undefined}
          />
          {errors[key] && (
            <p id={`${idPrefix}-${key}-error`} role="alert" className="field-error">
              {errors[key]}
            </p>
          )}
        </div>
      ))}
      {showPreferences && (
        <div>
          <label className="form-label" htmlFor={`${idPrefix}-preferences`}>
            Preferencias para la atención (opcional)
          </label>
          <textarea
            id={`${idPrefix}-preferences`}
            className="form-input mt-1 min-h-28 resize-y"
            value={value.preferences ?? ''}
            onChange={(event) => onChange('preferences', event.target.value)}
            maxLength={500}
            aria-invalid={!!errors.preferences}
            aria-describedby={errors.preferences ? `${idPrefix}-preferences-error` : undefined}
            placeholder="Indicaciones relevantes para atender a la cliente"
          />
          {errors.preferences && (
            <p id={`${idPrefix}-preferences-error`} role="alert" className="field-error">
              {errors.preferences}
            </p>
          )}
        </div>
      )}
      {matches.length > 0 && (
        <div className="rounded-card border border-[#E7D6A5] bg-[#FFFBED] p-3 text-sm">
          <p className="font-semibold">Posibles coincidencias</p>
          <p className="mt-1 text-xs text-stone">
            Revisa antes de guardar. Compartir teléfono no vincula clientes automáticamente.
          </p>
          <div className="mt-2 space-y-1">
            {matches.map((client) =>
              onUseExisting ? (
                <button
                  key={client.id}
                  type="button"
                  className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-champagne/60"
                  onClick={() => onUseExisting(client)}
                >
                  Usar {client.name} · {client.phone}
                </button>
              ) : (
                <p key={client.id} className="px-2 py-1 text-xs">
                  {client.name} · {client.phone}
                </p>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
