import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type {
  EmployeeDto,
  InventoryCategoryDto,
  InventoryMovementDto,
  SupplyAssignmentDto,
  SupplyDto,
} from '../../shared/api/types'
import { Feedback, Field, Modal } from '../../shared/components/Forms'

function SupplyEditorModal({
  record,
  categories,
  onClose,
  onSaved,
  onDeleted,
}: {
  record: SupplyDto | null
  categories: InventoryCategoryDto[]
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}) {
  const [name, setName] = useState(record?.nombre ?? '')
  const [categoryId, setCategoryId] = useState(
    String(record?.id_categoria ?? categories[0]?.id ?? ''),
  )
  const [minStock, setMinStock] = useState(String(record?.existencias_minimas ?? 0))
  const [active, setActive] = useState(record?.activo ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
        `/inventario/insumos${record ? `/${record.id}` : ''}`,
        record ? 'PATCH' : 'POST',
        {
          nombre: name.trim(),
          id_categoria: Number(categoryId),
          existencias_minimas: Number(minStock),
          activo: active,
        },
      )
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el insumo.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function deleteSupply() {
    if (!record || saving.current) return
    saving.current = true
    setBusy(true)
    setDeleting(true)
    setError('')
    try {
      await request(`/inventario/insumos/${record.id}`, 'DELETE')
      onDeleted?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el insumo.')
      setConfirmDelete(false)
    } finally {
      saving.current = false
      setBusy(false)
      setDeleting(false)
    }
  }

  return (
    <Modal title={record ? 'Editar insumo' : 'Nuevo insumo'} busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Nombre"
          required
          maxLength={255}
          disabled={busy}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="block text-sm font-semibold">
          Categoría
          <select
            className="api-input mt-2"
            required
            disabled={busy}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Existencias mínimas (unidades enteras)"
          type="number"
          min="0"
          step="1"
          required
          disabled={busy}
          value={minStock}
          onChange={(event) => setMinStock(event.target.value)}
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={active}
            disabled={busy}
            onChange={(event) => setActive(event.target.checked)}
          />
          Insumo activo
        </label>
        <Feedback error={error} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button className="api-primary" disabled={busy}>
            {busy && !deleting ? 'Guardando…' : 'Guardar insumo'}
          </button>
          {record && !confirmDelete && (
            <button
              type="button"
              className="api-secondary text-caramel-dark"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(true)
                setError('')
              }}
            >
              Eliminar insumo
            </button>
          )}
        </div>
        {record && confirmDelete && (
          <div className="rounded-card border border-[#E8CFC0] bg-[#FAF0EA] p-4 text-sm">
            <p className="font-semibold text-caramel-dark">
              ¿Eliminar «{record.nombre}»? Esta acción no se puede deshacer.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteSupply()}
                className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full bg-caramel-dark px-5 py-2 text-sm font-semibold text-white transition hover:bg-caramel disabled:cursor-wait disabled:opacity-60"
              >
                {deleting ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
              <button
                type="button"
                disabled={busy}
                className="api-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

function MovementModal({
  supplies,
  onClose,
  onSaved,
}: {
  supplies: SupplyDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const [supplyId, setSupplyId] = useState(String(supplies[0]?.id ?? ''))
  const [type, setType] = useState<'entrada' | 'salida' | 'devolucion' | 'ajuste'>('entrada')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const qty = Number(quantity)
    const signed = type === 'salida' ? -Math.abs(qty) : qty
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await resource('/inventario/movimientos', 'POST', {
        id_insumo: Number(supplyId),
        tipo_movimiento: type,
        variacion_cantidad: signed,
        motivo: reason.trim(),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el movimiento.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Registrar movimiento de stock" busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-semibold">
          Insumo
          <select
            className="api-input mt-2"
            required
            disabled={busy}
            value={supplyId}
            onChange={(event) => setSupplyId(event.target.value)}
          >
            <option value="">Seleccionar insumo</option>
            {supplies
              .filter((item) => item.activo)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} (stock: {item.existencias_actuales})
                </option>
              ))}
          </select>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Tipo de movimiento
            <select
              className="api-input mt-2"
              value={type}
              disabled={busy}
              onChange={(event) =>
                setType(event.target.value as 'entrada' | 'salida' | 'devolucion' | 'ajuste')
              }
            >
              <option value="entrada">Entrada (+)</option>
              <option value="salida">Salida (-)</option>
              <option value="devolucion">Devolución (+)</option>
              <option value="ajuste">Ajuste (+/-)</option>
            </select>
          </label>
          <Field
            label={type === 'ajuste' ? 'Variación (+/- unidades)' : 'Cantidad (unidades)'}
            type="number"
            min={type === 'ajuste' ? undefined : '1'}
            step="1"
            required
            disabled={busy}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <label className="block text-sm font-semibold">
          Motivo
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
          {busy ? 'Guardando…' : 'Registrar movimiento'}
        </button>
      </form>
    </Modal>
  )
}

function AssignSupplyModal({
  supplies,
  stylists,
  onClose,
  onSaved,
}: {
  supplies: SupplyDto[]
  stylists: EmployeeDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const [supplyId, setSupplyId] = useState(String(supplies[0]?.id ?? ''))
  const [employeeId, setEmployeeId] = useState(String(stylists[0]?.id ?? ''))
  const [quantity, setQuantity] = useState('1')
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
      await resource('/inventario/asignaciones', 'POST', {
        id_insumo: Number(supplyId),
        id_empleado: Number(employeeId),
        cantidad_entregada: Number(quantity),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la entrega.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title="Entregar insumo a estilista" busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-semibold">
          Insumo
          <select
            className="api-input mt-2"
            required
            disabled={busy}
            value={supplyId}
            onChange={(event) => setSupplyId(event.target.value)}
          >
            <option value="">Seleccionar insumo</option>
            {supplies
              .filter((item) => item.activo && item.existencias_actuales > 0)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} (disponible: {item.existencias_actuales})
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Estilista
          <select
            className="api-input mt-2"
            required
            disabled={busy}
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value="">Seleccionar estilista</option>
            {stylists.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.cuenta.persona?.nombre_completo}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Cantidad a entregar (unidades)"
          type="number"
          min="1"
          step="1"
          required
          disabled={busy}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <Feedback error={error} />
        <button className="api-primary" disabled={busy}>
          {busy ? 'Entregando…' : 'Registrar entrega'}
        </button>
      </form>
    </Modal>
  )
}

export function InventoryPage({ isAdmin }: { isAdmin: boolean }) {
  const [subtab, setSubtab] = useState<'insumos' | 'movimientos' | 'asignaciones'>(
    isAdmin ? 'insumos' : 'asignaciones',
  )
  const [onlyLow, setOnlyLow] = useState(false)
  const [supplyEditor, setSupplyEditor] = useState<SupplyDto | 'new' | null>(null)
  const [moving, setMoving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [categories, setCategories] = useState<InventoryCategoryDto[]>([])
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const supplies = useApi<SupplyDto[]>(
    isAdmin ? `/inventario/insumos${onlyLow ? '?requiere_reposicion=1' : ''}` : null,
    true,
  )
  const movements = useApi<InventoryMovementDto[]>(
    isAdmin && subtab === 'movimientos' ? '/inventario/movimientos' : null,
    true,
  )
  const assignments = useApi<SupplyAssignmentDto[]>(
    !isAdmin || subtab === 'asignaciones' ? '/inventario/asignaciones' : null,
    true,
  )
  const employees = useApi<EmployeeDto[]>(isAdmin ? '/empleados' : null, true)
  const stylists = (employees.data ?? []).filter(
    (item) => item.activo && item.cuenta.activo && item.cuenta.roles.includes('estilista'),
  )

  async function openSupplyModal(record: SupplyDto | 'new') {
    setActionError('')
    if (!categories.length) {
      try {
        const res = await request<{ datos: SupplyDto[]; categorias: InventoryCategoryDto[] }>(
          '/inventario/insumos',
        )
        setCategories(res.categorias ?? [])
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : 'No se pudieron cargar categorías.')
        return
      }
    }
    setSupplyEditor(record)
  }

  async function markExhausted(id: number) {
    setActionError('')
    try {
      await resource(`/inventario/asignaciones/${id}/agotar`, 'POST')
      setNotice('Asignación marcada como agotada.')
      assignments.reload()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar la asignación.')
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">
            {isAdmin ? 'Inventario' : 'Mis insumos asignados'}
          </h1>
          <p className="mt-2 text-sm text-stone">
            {isAdmin
              ? 'Control de insumos en unidades enteras, movimientos de stock y entregas.'
              : 'Insumos entregados a tu cargo. Marca como agotado cuando necesites reposición.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <button
              className="api-secondary"
              disabled={!supplies.data?.length}
              onClick={() => setMoving(true)}
            >
              Registrar movimiento
            </button>
            <button
              className="api-secondary"
              disabled={!supplies.data?.length || !stylists.length}
              onClick={() => setAssigning(true)}
            >
              Entregar insumo
            </button>
            <button className="api-primary" onClick={() => void openSupplyModal('new')}>
              Nuevo insumo
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <nav aria-label="Secciones de inventario" className="flex flex-wrap gap-2">
          {(
            [
              ['insumos', 'Insumos'],
              ['movimientos', 'Movimientos'],
              ['asignaciones', 'Asignaciones'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={subtab === id ? 'api-primary' : 'api-secondary'}
              onClick={() => {
                setSubtab(id)
                setNotice('')
                setActionError('')
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      <Feedback notice={notice} error={actionError} />

      {isAdmin && subtab === 'insumos' && (
        <section className="api-panel space-y-5">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(event) => setOnlyLow(event.target.checked)}
            />
            Mostrar solo insumos que requieren reposición
          </label>
          <Feedback loading={supplies.loading} error={supplies.error} onRetry={supplies.reload} />
          <div className="divide-y divide-line">
            {(supplies.data ?? []).map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold">{item.nombre}</p>
                  <p className="mt-1 text-stone">
                    {item.categoria?.nombre} · Stock: <strong>{item.existencias_actuales}</strong> ·
                    Mínimo: {item.existencias_minimas} · {item.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
                <button className="api-secondary" onClick={() => void openSupplyModal(item)}>
                  Editar
                </button>
              </article>
            ))}
          </div>
          {!supplies.loading && (supplies.data?.length ?? 0) === 0 && (
            <p className="text-sm text-stone">No hay insumos para mostrar.</p>
          )}
        </section>
      )}

      {isAdmin && subtab === 'movimientos' && (
        <section className="api-panel">
          <Feedback
            loading={movements.loading}
            error={movements.error}
            onRetry={movements.reload}
          />
          <div className="divide-y divide-line">
            {(movements.data ?? []).map((mov) => (
              <article
                key={mov.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {mov.insumo?.nombre ?? `Insumo #${mov.id_insumo}`} ·{' '}
                    <span className="capitalize">{mov.tipo_movimiento}</span>
                  </p>
                  <p className="mt-1 text-stone">
                    {mov.motivo} · Saldo: {mov.existencias_antes} → {mov.existencias_despues}
                  </p>
                </div>
                <strong>
                  {mov.variacion_cantidad > 0 ? `+${mov.variacion_cantidad}` : mov.variacion_cantidad}{' '}
                  u
                </strong>
              </article>
            ))}
          </div>
          {!movements.loading && (movements.data?.length ?? 0) === 0 && (
            <p className="text-sm text-stone">No hay movimientos registrados.</p>
          )}
        </section>
      )}

      {(!isAdmin || subtab === 'asignaciones') && (
        <section className="api-panel">
          <Feedback
            loading={assignments.loading}
            error={assignments.error}
            onRetry={assignments.reload}
          />
          <div className="divide-y divide-line">
            {(assignments.data ?? []).map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {item.insumo?.nombre ?? `Insumo #${item.id_insumo}`} · {item.cantidad_entregada}{' '}
                    u
                  </p>
                  <p className="mt-1 text-stone">
                    {item.empleado?.nombre_completo ? `${item.empleado.nombre_completo} · ` : ''}
                    {item.estado === 'en_uso' ? 'En uso' : 'Agotado'}
                  </p>
                </div>
                {item.estado === 'en_uso' && (
                  <button
                    className="api-secondary"
                    onClick={() => void markExhausted(item.id)}
                  >
                    Marcar agotado
                  </button>
                )}
              </article>
            ))}
          </div>
          {!assignments.loading && (assignments.data?.length ?? 0) === 0 && (
            <p className="text-sm text-stone">No hay asignaciones registradas.</p>
          )}
        </section>
      )}

      {supplyEditor && (
        <SupplyEditorModal
          record={supplyEditor === 'new' ? null : supplyEditor}
          categories={categories}
          onClose={() => setSupplyEditor(null)}
          onSaved={() => {
            setSupplyEditor(null)
            setNotice('Insumo guardado correctamente.')
            supplies.reload()
          }}
          onDeleted={() => {
            setSupplyEditor(null)
            setNotice('Insumo eliminado correctamente.')
            supplies.reload()
          }}
        />
      )}
      {moving && supplies.data && (
        <MovementModal
          supplies={supplies.data}
          onClose={() => setMoving(false)}
          onSaved={() => {
            setMoving(false)
            setNotice('Movimiento registrado correctamente.')
            supplies.reload()
            movements.reload()
          }}
        />
      )}
      {assigning && supplies.data && (
        <AssignSupplyModal
          supplies={supplies.data}
          stylists={stylists}
          onClose={() => setAssigning(false)}
          onSaved={() => {
            setAssigning(false)
            setNotice('Entrega registrada correctamente.')
            supplies.reload()
            assignments.reload()
            movements.reload()
          }}
        />
      )}
    </main>
  )
}
