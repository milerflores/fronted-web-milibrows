import { useEffect, useState } from 'react'
import { getClientList } from '../../shared/agenda/mockAgendaService'
import type { AgendaData, Client, DemoActor } from '../../shared/agenda/types'
import { Icon } from './Icon'

interface ClientsPageProps {
  actor: DemoActor
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
    getClientList(actor)
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
      (digits.length > 0 && client.phone.replace(/\D/g, '').includes(digits)),
  )

  return (
    <main id="clientes" className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8 xl:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] leading-tight sm:text-[32px]">Clientes</h2>
          <p className="mt-1 text-sm text-stone">
            Contacto e historial de atenciones en un solo lugar.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-graphite shadow-card hover:bg-[#D7B65F] focus-visible:outline-2 focus-visible:outline-gold"
          onClick={onNew}
        >
          + Nuevo cliente
        </button>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-card border border-[#CFD5C6] bg-[#F0F3EA] px-4 py-3 text-sm font-semibold text-sage-dark"
        >
          {notice}
        </p>
      )}
      <section
        aria-label="Listado de clientes"
        className="overflow-hidden rounded-card border border-line bg-white shadow-card"
      >
        <div className="border-b border-line px-4 py-4 sm:px-6">
          <label className="form-label" htmlFor="clients-search">
            Buscar por nombre o teléfono
          </label>
          <input
            id="clients-search"
            className="form-input mt-1 max-w-lg"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o teléfono"
          />
        </div>
        {loading ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            Cargando clientes…
          </p>
        ) : error ? (
          <div role="alert" className="px-6 py-12 text-center">
            <p className="text-sm text-caramel-dark">{error}</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-gold px-4 py-2 text-sm font-semibold"
              onClick={() => {
                setLoading(true)
                setRetryCount((count) => count + 1)
              }}
            >
              Reintentar
            </button>
          </div>
        ) : !clients.length ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            Todavía no hay clientes registrados.
          </p>
        ) : !visible.length ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            No hay clientes con esa búsqueda.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-stone">
                    {client.phone}
                    {client.email && (
                      <span className="block break-all sm:inline sm:before:content-['·'] sm:before:mx-2">
                        {client.email}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-ivory focus-visible:outline-2 focus-visible:outline-gold"
                    onClick={() => onOpen(client)}
                  >
                    Ver ficha
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-ivory focus-visible:outline-2 focus-visible:outline-gold"
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
        <p className="mt-3 flex items-center gap-2 text-xs text-stone">
          <Icon name="user" className="size-4" />
          {visible.length} {visible.length === 1 ? 'cliente visible' : 'clientes visibles'}
        </p>
      )}
    </main>
  )
}
