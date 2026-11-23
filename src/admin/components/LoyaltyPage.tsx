import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type {
  ClientDto,
  DiscountReasonDto,
  LevelDto,
  PointMovementDto,
  StudioConfigDto,
} from '../../shared/api/types'
import { Feedback, Field, Modal } from '../../shared/components/Forms'

function PointAdjustmentModal({
  clients,
  onClose,
  onSaved,
}: {
  clients: ClientDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const [clientId, setClientId] = useState(String(clients[0]?.id ?? ''))
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await resource('/fidelizacion/puntos/ajustes', 'POST', {
        id_cliente: Number(clientId),
        puntos: Number(points),
        motivo: reason.trim(),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el ajuste.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Ajuste manual de puntos" busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-semibold">
          Cliente
          <select
            className="api-input mt-2"
            required
            disabled={busy}
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.persona.nombre_completo}
                {item.persona.dni ? ` · ${item.persona.dni}` : ''}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Puntos (+/- entero distinto de cero)"
          type="number"
          step="1"
          required
          disabled={busy}
          value={points}
          onChange={(event) => setPoints(event.target.value)}
        />
        <label className="block text-sm font-semibold">
          Motivo del ajuste
          <textarea
            className="api-input mt-2 min-h-24"
            maxLength={2000}
            required
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <Feedback error={error} />
        <button className="api-primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Registrar ajuste'}
        </button>
      </form>
    </Modal>
  )
}

function ReasonEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: DiscountReasonDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.nombre ?? '')
  const [active, setActive] = useState(initial?.activo ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await resource(
        `/fidelizacion/motivos-descuento${initial ? `/${initial.id}` : ''}`,
        initial ? 'PATCH' : 'POST',
        { nombre: name.trim(), activo: active },
      )
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el motivo.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      title={initial ? 'Editar motivo de descuento' : 'Nuevo motivo de descuento'}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Nombre del motivo"
          required
          maxLength={255}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="flex gap-3 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Motivo activo
        </label>
        <Feedback error={error} />
        <button disabled={busy} className="api-primary">
          {busy ? 'Guardando…' : 'Guardar motivo'}
        </button>
      </form>
    </Modal>
  )
}

function LevelEditor({
  initial,
  initialRate,
}: {
  initial: LevelDto[]
  initialRate: string
}) {
  const [levels, setLevels] = useState(initial)
  const [rate, setRate] = useState(initialRate)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  function change(index: number, value: Partial<LevelDto>) {
    setLevels((current) =>
      current.map((item, position) => (index === position ? { ...item, ...value } : item)),
    )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await request<{ datos: LevelDto[]; monto_por_punto: string }>(
        '/fidelizacion/niveles',
        'PUT',
        {
          monto_por_punto: rate,
          niveles: levels.map((level) => ({
            codigo: level.codigo,
            nombre: level.nombre.trim(),
            puntos_minimos: Number(level.puntos_minimos),
            porcentaje_descuento: level.porcentaje_descuento,
            activo: level.activo,
          })),
        },
      )
      setLevels(result.datos)
      setRate(result.monto_por_punto)
      setNotice('Niveles y tasa de puntos guardados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los niveles.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <p className="text-sm text-stone">
        Glow es el nivel inicial permanente (0 puntos). Configura el mínimo de puntos y activa
        Golden o VIP cuando desees habilitarlos.
      </p>
      <fieldset disabled={busy} className="space-y-5">
        <Field
          label="Monto en soles por cada punto ganado"
          type="number"
          min="0.01"
          max="9999999999.99"
          step="0.01"
          required
          value={rate}
          onChange={(event) => setRate(event.target.value)}
        />
        {levels.map((level, index) => (
          <section key={level.codigo} className="rounded-card border border-line p-5">
            <h3 className="mb-4 font-display text-xl">{level.nombre}</h3>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                label="Nombre visible"
                required
                maxLength={255}
                value={level.nombre}
                onChange={(event) => change(index, { nombre: event.target.value })}
              />
              <Field
                label="Puntos mínimos"
                type="number"
                min={level.codigo === 'glow' ? '0' : level.activo ? '1' : '0'}
                max="1000000000"
                step="1"
                disabled={level.codigo === 'glow'}
                required
                value={String(level.puntos_minimos)}
                onChange={(event) =>
                  change(index, { puntos_minimos: Number(event.target.value || 0) })
                }
              />
              <Field
                label="Descuento (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={level.porcentaje_descuento}
                onChange={(event) => change(index, { porcentaje_descuento: event.target.value })}
              />
            </div>
            <label className="mt-4 flex gap-3 text-sm">
              <input
                type="checkbox"
                disabled={level.codigo === 'glow'}
                checked={level.activo}
                onChange={(event) => change(index, { activo: event.target.checked })}
              />
              Nivel activo
            </label>
          </section>
        ))}
      </fieldset>
      <Feedback error={error} notice={notice} />
      <button className="api-primary" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar niveles'}
      </button>
    </form>
  )
}

export function LoyaltyPage() {
  const levels = useApi<LevelDto[]>('/fidelizacion/niveles')
  const config = useApi<StudioConfigDto>('/configuracion/estudio')
  const reasons = useApi<DiscountReasonDto[]>('/fidelizacion/motivos-descuento')
  const movements = useApi<PointMovementDto[]>('/fidelizacion/puntos', true)
  const clients = useApi<ClientDto[]>('/clientes', true)
  const [editing, setEditing] = useState<DiscountReasonDto | 'new' | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [notice, setNotice] = useState('')
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 className="font-display text-3xl">Fidelización</h1>
        <button
          className="api-primary"
          disabled={!clients.data?.length}
          onClick={() => setAdjusting(true)}
        >
          Ajustar puntos
        </button>
      </div>
      <section className="api-panel">
        <h2 className="font-display text-2xl">Puntos y niveles de descuento</h2>
        <Feedback
          loading={levels.loading || config.loading}
          error={levels.error || config.error}
          onRetry={() => {
            levels.reload()
            config.reload()
          }}
        />
        {levels.data && config.data && (
          <LevelEditor initial={levels.data} initialRate={config.data.monto_por_punto} />
        )}
      </section>
      <section className="api-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl">Motivos de descuento manual</h2>
          <button className="api-secondary" onClick={() => setEditing('new')}>
            Nuevo motivo
          </button>
        </div>
        <Feedback
          loading={reasons.loading}
          error={reasons.error}
          notice={notice}
          onRetry={reasons.reload}
        />
        <div className="mt-5 divide-y divide-line">
          {reasons.data?.map((reason) => (
            <div key={reason.id} className="flex items-center justify-between gap-4 py-4 text-sm">
              <span>
                {reason.nombre} · {reason.activo ? 'Activo' : 'Inactivo'}
              </span>
              <button className="api-secondary" onClick={() => setEditing(reason)}>
                Editar
              </button>
            </div>
          ))}
        </div>
        {reasons.data?.length === 0 && (
          <p className="mt-5 text-sm text-stone">
            Todavía no hay motivos de descuento configurados.
          </p>
        )}
      </section>
      <section className="api-panel">
        <h2 className="font-display text-2xl">Movimientos recientes de puntos</h2>
        <Feedback
          loading={movements.loading}
          error={movements.error}
          onRetry={movements.reload}
        />
        <div className="mt-5 divide-y divide-line">
          {(movements.data ?? []).slice(0, 30).map((mov) => (
            <div
              key={mov.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
            >
              <div>
                <p className="font-semibold capitalize">
                  Cliente #{mov.id_cliente} · {mov.tipo}
                </p>
                {mov.motivo && <p className="mt-1 text-stone">{mov.motivo}</p>}
              </div>
              <strong>{mov.puntos > 0 ? `+${mov.puntos}` : mov.puntos} pts</strong>
            </div>
          ))}
        </div>
        {!movements.loading && (movements.data?.length ?? 0) === 0 && (
          <p className="mt-5 text-sm text-stone">Aún no hay movimientos de puntos registrados.</p>
        )}
      </section>
      {editing && (
        <ReasonEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reasons.reload()
            setNotice('Motivo guardado correctamente.')
          }}
        />
      )}
      {adjusting && clients.data && (
        <PointAdjustmentModal
          clients={clients.data}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            setAdjusting(false)
            movements.reload()
            setNotice('Ajuste de puntos registrado correctamente.')
          }}
        />
      )}
    </main>
  )
}
