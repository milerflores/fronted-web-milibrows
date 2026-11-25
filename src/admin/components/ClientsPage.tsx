import { useEffect, useState } from 'react'
import { getClientList } from '../../shared/agenda/agendaService'
import type { AgendaData, Client, Actor } from '../../shared/agenda/types'
import { Icon } from './Icon'

interface ClientsPageProps {
  actor: Actor
  data: AgendaData | null
  notice: string | null
  onOpen: (client: Client) => void
  onEdit: (client: Client) => void
  onNew: () => void
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function ClientsPage({ actor, data, notice, onOpen, onEdit, onNew }: ClientsPageProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    getClientList()
      .then((result) => {
        if (active) {
          setClients(result)
          setLoading(false)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el listado.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [actor, data, retryCount])

  const search = normalized(query)
  const digits = query.replace(/\D/g, '')
  const visible = clients.filter(
    (client) =>
      normalized(client.name).includes(search) ||
      ((client.dni ?? '').includes(query.trim()) && query.trim().length > 0) ||
      (digits.length > 0 && client.phone.replace(/\D/g, '').includes(digits)),
  )

  return (
    <main id="clientes" className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Clientes</h1>
          <p className="mt-2 text-sm text-stone">
            Contacto e historial de atenciones en un solo lugar.
          </p>
        </div>
        <button type="button" className="api-primary" onClick={onNew}>
          Nuevo cliente
        </button>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-card bg-[#E9EEE3] p-4 text-sm text-sage-dark"
        >
          {notice}
        </p>
      )}
      <section aria-label="Listado de clientes" className="api-panel">
        <div className="pb-5">
          <label className="block text-sm font-semibold" htmlFor="clients-search">
            Buscar por nombre, DNI o teléfono
            <input
              id="clients-search"
              className="api-input mt-2"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, DNI o teléfono"
            />
          </label>
        </div>
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-stone">
            Cargando clientes…
          </p>
        ) : error ? (
          <div role="alert" className="py-10 text-center">
            <p className="text-sm text-caramel-dark">{error}</p>
            <button
              type="button"
              className="api-primary mt-4"
              onClick={() => {
                setLoading(true)
                setRetryCount((count) => count + 1)
              }}
            >
              Reintentar
            </button>
          </div>
        ) : !clients.length ? (
          <p role="status" className="py-10 text-center text-sm text-stone">
            Todavía no hay clientes registrados.
          </p>
        ) : !visible.length ? (
          <p role="status" className="py-10 text-center text-sm text-stone">
            No hay clientes con esa búsqueda.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-stone">
                    {client.phone || 'Sin teléfono'}
                    {client.email && (
                      <span className="block break-all sm:inline sm:before:mx-2 sm:before:content-['·']">
                        {client.email}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="api-secondary"
                    onClick={() => onOpen(client)}
                  >
                    Ver ficha
                  </button>
                  <button
                    type="button"
                    className="api-secondary"
                    onClick={() => onEdit(client)}
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {!loading && !error && visible.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-stone">
          <Icon name="user" className="size-4" />
          {visible.length} {visible.length === 1 ? 'cliente visible' : 'clientes visibles'}
        </p>
      )}
    </main>
  )
}
