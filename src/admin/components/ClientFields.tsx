import type { Client, ClientInput } from '../../shared/agenda/types'

interface Props {
  value: ClientInput
  onChange: (field: keyof ClientInput, value: string) => void
  errors?: Partial<Record<keyof ClientInput, string>>
  onUseExisting?: (client: Client) => void
  excludeClientId?: string
  showPreferences?: boolean
  idPrefix: string
}

export function ClientFields({ value, onChange, errors = {}, showPreferences, idPrefix }: Props) {
  const fields: {
    key: 'firstName' | 'paternalLastName' | 'maternalLastName' | 'dni' | 'phone' | 'email'
    label: string
    type: string
    max: number
    required?: boolean
  }[] = [
    { key: 'firstName', label: 'Nombre', type: 'text', max: 100, required: true },
    { key: 'paternalLastName', label: 'Apellido paterno', type: 'text', max: 100, required: true },
    { key: 'maternalLastName', label: 'Apellido materno (opcional)', type: 'text', max: 100 },
    { key: 'dni', label: 'DNI (opcional)', type: 'text', max: 8 },
    { key: 'phone', label: 'Teléfono (opcional)', type: 'tel', max: 30 },
    { key: 'email', label: 'Correo de contacto (opcional)', type: 'email', max: 255 },
  ]
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="form-label" htmlFor={`${idPrefix}-${field.key}`}>
            {field.label}
          </label>
          <input
            id={`${idPrefix}-${field.key}`}
            className="api-input mt-2"
            type={field.type}
            maxLength={field.max}
            required={field.required}
            pattern={field.key === 'dni' ? '[0-9]{8}' : undefined}
            inputMode={field.key === 'dni' ? 'numeric' : undefined}
            value={value[field.key] ?? ''}
            aria-invalid={!!errors[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
          {errors[field.key] && (
            <p role="alert" className="mt-1 text-sm text-caramel-dark">
              {errors[field.key]}
            </p>
          )}
        </div>
      ))}
      {showPreferences && (
        <label className="block text-sm font-semibold">
          Preferencias para la atención
          <textarea
            className="api-input mt-2 min-h-28"
            maxLength={2000}
            value={value.preferences ?? ''}
            onChange={(event) => onChange('preferences', event.target.value)}
          />
        </label>
      )}
    </div>
  )
}
