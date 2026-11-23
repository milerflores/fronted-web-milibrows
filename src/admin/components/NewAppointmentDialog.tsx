import { useState } from 'react'
import { useApi } from '../../shared/api/useApi'
import type { ClientDto } from '../../shared/api/types'
import { createClient, mapClient, saveAppointment } from '../../shared/agenda/agendaService'
import type { Client, ClientInput, CreatedAppointment } from '../../shared/agenda/types'
import { BookingForm } from '../../shared/components/BookingForm'
import { Feedback, Modal } from '../../shared/components/Forms'
import { ClientFields } from './ClientFields'

export function NewAppointmentDialog({
  preferredClient,
  onClose,
  onCreated,
  allowInternal = false,
}: {
  preferredClient?: Client
  onClose: () => void
  onCreated: (result: CreatedAppointment) => void
  allowInternal?: boolean
}) {
  const clients = useApi<ClientDto[]>('/clientes', true)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [clientId, setClientId] = useState(preferredClient?.id ?? '')
  const [search, setSearch] = useState('')
  const [createdClient, setCreatedClient] = useState<Client | null>(null)
  const [busy, setBusy] = useState(false)
  const [internal, setInternal] = useState(false)
  const [value, setValue] = useState<ClientInput>({
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    dni: '',
    phone: '',
    email: '',
  })
  const records = new Map((clients.data ?? []).map(mapClient).map((client) => [client.id, client]))
  if (preferredClient) records.set(preferredClient.id, preferredClient)
  const matches = [...records.values()].filter((item) =>
    `${item.name} ${item.dni} ${item.phone}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Modal title="Nueva cita" busy={busy} onClose={onClose}>
      <fieldset disabled={busy} className="mb-8 space-y-5 border-b border-line pb-7">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={mode === 'existing' ? 'api-primary' : 'api-secondary'}
            onClick={() => setMode('existing')}
          >
            Cliente existente
          </button>
          <button
            type="button"
            className={mode === 'new' ? 'api-primary' : 'api-secondary'}
            onClick={() => setMode('new')}
          >
            Crear ficha
          </button>
        </div>
        {mode === 'existing' ? (
          <>
            <label className="block text-sm font-semibold">
              Buscar por nombre, DNI o teléfono
              <input
                className="api-input mt-2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <Feedback loading={clients.loading} error={clients.error} onRetry={clients.reload} />
            <label className="block text-sm font-semibold">
              Cliente
              <select
                className="api-input mt-2"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {matches.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name} {client.dni && `· ${client.dni}`}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : createdClient ? (
          <p className="rounded-card bg-sand p-4 text-sm">
            La ficha de {createdClient.name} está creada. Se utilizará al confirmar o reintentar
            esta reserva.
          </p>
        ) : (
          <ClientFields
            idPrefix="new-booking-client"
            value={value}
            onChange={(field, next) => setValue({ ...value, [field]: next })}
          />
        )}
      </fieldset>
      {allowInternal && (
        <label className="mb-6 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={internal}
            disabled={busy}
            onChange={(event) => setInternal(event.target.checked)}
          />
          Utilizar el catálogo interno y definir el horario
        </label>
      )}
      <BookingForm
        key={String(internal)}
        internal={internal}
        onSave={async (input) => {
          setBusy(true)
          try {
            let selectedClient = clientId
            if (mode === 'new') {
              const client = createdClient ?? (await createClient(value)).client
              setCreatedClient(client)
              selectedClient = client.id
            }
            if (!selectedClient) throw new Error('Selecciona una ficha de cliente para reservar.')
            onCreated(await saveAppointment({ ...input, clientId: selectedClient }))
          } finally {
            setBusy(false)
          }
        }}
      />
    </Modal>
  )
}
