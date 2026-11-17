import { useEffect, useRef, useState } from 'react'
import {
  getCatalogFutureImpact,
  getServiceCatalog,
  getStylistCatalog,
  setServiceActive,
  setStylistActive,
} from '../../shared/agenda/mockAgendaService'
import type { AgendaData, DemoActor, Service, Stylist } from '../../shared/agenda/types'
import { CatalogEditorDialog } from './CatalogEditorDialog'
import { Icon } from './Icon'
import { PersonnelAccountsSection } from './PersonnelAccountsSection'

type Kind = 'service' | 'stylist'
type RecordItem = Service | Stylist
type StatusFilter = 'all' | 'active' | 'inactive'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

interface CatalogPageProps {
  kind: Kind
  actor: DemoActor
  data: AgendaData | null
  onData: (data: AgendaData) => void
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function ToggleDialog({
  kind,
  target,
  actor,
  onClose,
  onSaved,
}: {
  kind: Kind
  target: RecordItem
  actor: DemoActor
  onClose: () => void
  onSaved: (data: AgendaData, name: string, active: boolean) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nextActive = !target.active
  const impact = nextActive ? 0 : getCatalogFutureImpact(kind, target.id, actor)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function confirm() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const result =
        kind === 'service'
          ? await setServiceActive(target.id, nextActive, actor)
          : await setStylistActive(target.id, nextActive, actor)
      onSaved(result.data, result.record.name, nextActive)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo cambiar el estado. Intenta de nuevo.',
      )
      savingRef.current = false
      setSaving(false)
    }
  }

  const action = nextActive ? 'Activar' : 'Desactivar'
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="catalog-toggle-title"
      className="appointment-dialog bg-white text-graphite"
      onClose={onClose}
      onCancel={(event) => {
        if (savingRef.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !savingRef.current) dialogRef.current?.close()
      }}
    >
      <div className="admin-dialog-scroll">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Catálogos · Administración
            </p>
            <h2 id="catalog-toggle-title" className="mt-1 font-display text-3xl">
              {action} {kind === 'service' ? 'servicio' : 'estilista'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar confirmación"
            className="icon-button"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-6 text-sm sm:px-7">
          <p>
            Confirma que deseas {action.toLowerCase()} <strong>{target.name}</strong>.
          </p>
          {!nextActive && (
            <div className="rounded-card border border-[#E7D6A5] bg-[#FFFBED] p-4">
              <p className="font-semibold">
                {impact}{' '}
                {impact === 1
                  ? 'cita confirmada futura afectada'
                  : 'citas confirmadas futuras afectadas'}
              </p>
              <p className="mt-1 text-stone">
                {kind === 'service'
                  ? 'Este servicio dejará de ofrecerse en reservas nuevas.'
                  : 'Esta estilista dejará de estar disponible para reservas nuevas.'}{' '}
                Las citas existentes seguirán visibles y no cambiarán automáticamente.
              </p>
            </div>
          )}
          {nextActive && (
            <p className="text-stone">
              Volverá a estar disponible para nuevas reservas según sus servicios habilitados.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-[#FAF0EA] px-3 py-2 text-caramel-dark">
              {error}
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
            Volver
          </button>
          <button
            type="button"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${nextActive ? 'bg-gold text-graphite hover:bg-[#D7B65F]' : 'bg-caramel-dark text-white hover:bg-caramel'}`}
            disabled={saving}
            onClick={confirm}
          >
            {saving ? 'Guardando…' : `Confirmar ${action.toLowerCase()}`}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export function CatalogPage({ kind, actor, data, onData }: CatalogPageProps) {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)
  const [toggleTarget, setToggleTarget] = useState<RecordItem | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const request = kind === 'service' ? getServiceCatalog(actor) : getStylistCatalog(actor)
    request
      .then((result) => {
        if (active) {
          setRecords(result)
          setError('')
          setLoading(false)
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [kind, actor, data, retryCount])

  const search = normalized(query)
  const visible = records.filter((item) => {
    if (status === 'active' && !item.active) return false
    if (status === 'inactive' && item.active) return false
    if (!search) return true
    return (
      normalized(item.name).includes(search) ||
      (kind === 'service'
        ? normalized((item as Service).description ?? '').includes(search)
        : normalized(`${(item as Stylist).phone ?? ''} ${(item as Stylist).email ?? ''}`).includes(
            search,
          ))
    )
  })

  function saved(nextData: AgendaData, name: string) {
    onData(nextData)
    setEditorOpen(false)
    setNotice(`${kind === 'service' ? 'Servicio' : 'Estilista'} ${name} guardado correctamente.`)
    setLoading(true)
  }

  function toggled(nextData: AgendaData, name: string, active: boolean) {
    onData(nextData)
    setToggleTarget(null)
    setNotice(`${name} ${active ? 'activado' : 'desactivado'} correctamente.`)
    setLoading(true)
  }

  const title = kind === 'service' ? 'Servicios' : 'Estilistas'
  return (
    <main
      id={kind === 'service' ? 'servicios' : 'estilistas'}
      className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8 xl:px-10"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] leading-tight sm:text-[32px]">{title}</h2>
          <p className="mt-1 text-sm text-stone">
            {kind === 'service'
              ? 'Oferta y condiciones para nuevas reservas.'
              : 'Equipo y servicios habilitados para cada estilista.'}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-graphite shadow-card hover:bg-[#D7B65F] focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!data || loading || !!error}
          onClick={() => {
            setEditingRecord(null)
            setEditorOpen(true)
            setNotice('')
          }}
        >
          + {kind === 'service' ? 'Nuevo servicio' : 'Nueva estilista'}
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
        aria-label={`Listado de ${title.toLowerCase()}`}
        className="overflow-hidden rounded-card border border-line bg-white shadow-card"
      >
        <div className="flex flex-wrap gap-4 border-b border-line px-4 py-4 sm:px-6">
          <div className="min-w-[210px] flex-1">
            <label className="form-label" htmlFor="catalog-search">
              Buscar {kind === 'service' ? 'servicio' : 'estilista'}
            </label>
            <input
              id="catalog-search"
              className="form-input mt-1"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === 'service' ? 'Nombre o descripción' : 'Nombre o contacto'}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="catalog-status">
              Estado
            </label>
            <select
              id="catalog-status"
              className="form-input mt-1 min-w-[145px]"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            Cargando {title.toLowerCase()}…
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
        ) : !records.length ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            Todavía no hay {title.toLowerCase()} registrados.
          </p>
        ) : !visible.length ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-stone">
            No hay resultados con esta búsqueda y estado.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.active ? 'bg-[#E7EBDD] text-sage-dark' : 'bg-sand text-stone'}`}
                    >
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {kind === 'service' ? (
                    <>
                      {(item as Service).description && (
                        <p className="mt-1 text-sm text-stone">{(item as Service).description}</p>
                      )}
                      <p className="mt-1 text-xs font-semibold">
                        {money.format((item as Service).price)} · {(item as Service).duration} min
                      </p>
                    </>
                  ) : (
                    <>
                      {((item as Stylist).phone || (item as Stylist).email) && (
                        <p className="mt-1 text-sm text-stone">
                          {[(item as Stylist).phone, (item as Stylist).email]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {(item as Stylist).specialty && (
                        <p className="mt-1 text-xs text-stone">{(item as Stylist).specialty}</p>
                      )}
                      {(item as Stylist).serviceIds.length > 0 && (
                        <p className="mt-1 text-xs text-stone">
                          Servicios:{' '}
                          {(item as Stylist).serviceIds
                            .map(
                              (id) =>
                                data?.services.find((service) => service.id === id)?.name ?? id,
                            )
                            .join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-ivory focus-visible:outline-2 focus-visible:outline-gold"
                    onClick={() => {
                      setEditingRecord(item)
                      setEditorOpen(true)
                      setNotice('')
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-gold ${item.active ? 'border-caramel-dark text-caramel-dark hover:bg-[#FAF0EA]' : 'border-line hover:bg-ivory'}`}
                    onClick={() => {
                      setToggleTarget(item)
                      setNotice('')
                    }}
                  >
                    {item.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {kind === 'stylist' && data && (
        <PersonnelAccountsSection actor={actor} data={data} onData={onData} />
      )}
      {editorOpen && data && (
        <CatalogEditorDialog
          key={`${kind}-${editingRecord?.id ?? 'new'}`}
          kind={kind}
          record={editingRecord}
          data={data}
          actor={actor}
          onClose={() => setEditorOpen(false)}
          onSaved={saved}
        />
      )}
      {toggleTarget && (
        <ToggleDialog
          key={`${kind}-${toggleTarget.id}`}
          kind={kind}
          target={toggleTarget}
          actor={actor}
          onClose={() => setToggleTarget(null)}
          onSaved={toggled}
        />
      )}
    </main>
  )
}
