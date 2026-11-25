import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAssetUrl, request, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type { AppointmentDto, EmployeeDto, ServiceDto } from '../../shared/api/types'
import { mapAppointment } from '../../shared/agenda/agendaService'
import { restoreSession } from '../../shared/agenda/authService'
import { Feedback, Field, Modal, ServiceResults } from '../../shared/components/Forms'
import { ScheduleEditor } from './ScheduleEditor'

function EmployeeCreator({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    dni: '',
    telefono: '',
    correo: '',
    contrasena: '',
    rol: 'estilista',
    cargo: 'Estilista',
    admite_reservas: true,
  })
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
      await resource('/empleados', 'POST', {
        ...value,
        nombre: value.nombre.trim(),
        apellido_paterno: value.apellido_paterno.trim(),
        apellido_materno: value.apellido_materno.trim() || null,
        dni: value.dni || null,
        telefono: value.telefono || null,
        admite_reservas: value.rol === 'estilista' && value.admite_reservas,
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <Modal title="Agregar personal" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Nombre"
          required
          maxLength={100}
          value={value.nombre}
          onChange={(event) => setValue({ ...value, nombre: event.target.value })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Apellido paterno"
            required
            maxLength={100}
            value={value.apellido_paterno}
            onChange={(event) => setValue({ ...value, apellido_paterno: event.target.value })}
          />
          <Field
            label="Apellido materno (opcional)"
            maxLength={100}
            value={value.apellido_materno}
            onChange={(event) => setValue({ ...value, apellido_materno: event.target.value })}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="DNI (opcional)"
            pattern="[0-9]{8}"
            inputMode="numeric"
            maxLength={8}
            value={value.dni}
            onChange={(event) => setValue({ ...value, dni: event.target.value })}
          />
          <Field
            label="Teléfono"
            type="tel"
            maxLength={30}
            value={value.telefono}
            onChange={(event) => setValue({ ...value, telefono: event.target.value })}
          />
        </div>
        <Field
          label="Correo de acceso"
          type="email"
          required
          maxLength={255}
          value={value.correo}
          onChange={(event) => setValue({ ...value, correo: event.target.value })}
        />
        <Field
          label="Contraseña inicial"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={value.contrasena}
          onChange={(event) => setValue({ ...value, contrasena: event.target.value })}
        />
        <p className="text-sm text-stone">
          Usa mayúsculas, minúsculas y números. Comunica las credenciales iniciales a la persona.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Rol
            <select
              className="api-input mt-2"
              value={value.rol}
              onChange={(event) => setValue({ ...value, rol: event.target.value })}
            >
              <option value="administracion">Administración</option>
              <option value="recepcion">Recepción</option>
              <option value="estilista">Estilista</option>
            </select>
          </label>
          <Field
            label="Cargo"
            required
            maxLength={255}
            value={value.cargo}
            onChange={(event) => setValue({ ...value, cargo: event.target.value })}
          />
        </div>
        {value.rol === 'estilista' && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value.admite_reservas}
              onChange={(event) => setValue({ ...value, admite_reservas: event.target.checked })}
            />
            Admite reservas
          </label>
        )}
        <p className="text-sm text-stone">
          Después de crear la cuenta, configura sus servicios y jornada para habilitar sus horarios.
        </p>
        <Feedback error={error} />
        <button disabled={busy} className="api-primary">
          {busy ? 'Creando…' : 'Crear cuenta y perfil'}
        </button>
      </form>
    </Modal>
  )
}

function EmployeeEditor({
  initial,
  services,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: EmployeeDto
  services: ServiceDto[]
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [tab, setTab] = useState('perfil')
  const [schedule, setSchedule] = useState(initial.jornada)
  const [profile, setProfile] = useState({
    nombre: initial.cuenta.persona?.nombre ?? '',
    apellido_paterno: initial.cuenta.persona?.apellido_paterno ?? '',
    apellido_materno: initial.cuenta.persona?.apellido_materno ?? '',
    telefono: initial.cuenta.persona?.telefono ?? '',
    correo_contacto: initial.cuenta.persona?.correo_contacto ?? '',
    cargo: initial.cargo,
    activo: initial.activo,
    admite_reservas: initial.admite_reservas,
  })
  const [account, setAccount] = useState({
    correo: initial.cuenta.correo,
    rol: initial.cuenta.roles[0],
    activo: initial.cuenta.activo,
  })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [serviceIds, setServiceIds] = useState(
    initial.servicios.filter((item) => item.pivot?.activo ?? true).map((item) => item.id),
  )
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initial.imagen_url ?? null)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const saving = useRef(false)
  const history = useApi<AppointmentDto[]>(
    tab === 'atenciones' ? `/empleados/${initial.id}/atenciones` : null,
    true,
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (tab === 'contrasena' && password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const path = `/empleados/${initial.id}`
      if (tab === 'perfil') {
        const data = new FormData()
        data.set('_method', 'PATCH')
        data.set('nombre', profile.nombre.trim())
        data.set('apellido_paterno', profile.apellido_paterno.trim())
        data.set('apellido_materno', profile.apellido_materno.trim())
        data.set('telefono', profile.telefono.trim())
        data.set('correo_contacto', profile.correo_contacto.trim())
        data.set('cargo', profile.cargo.trim())
        data.set('activo', profile.activo ? '1' : '0')
        data.set('admite_reservas', profile.admite_reservas ? '1' : '0')
        if (image) data.set('imagen', image)
        if (removeImage) data.set('eliminar_imagen', '1')
        const updated = await resource<EmployeeDto>(path, 'POST', data)
        setCurrentImageUrl(updated.imagen_url ?? null)
        setImage(null)
        setPreview('')
        setRemoveImage(false)
        if (imageInput.current) imageInput.current.value = ''
      }
      if (tab === 'cuenta') {
        await resource(`${path}/cuenta`, 'PATCH', account)
        if (account.rol !== 'estilista')
          setProfile((current) => ({ ...current, admite_reservas: false }))
      }
      if (tab === 'contrasena')
        await request(`${path}/cuenta/contrasena`, 'PUT', { contrasena: password })
      if (tab === 'servicios')
        await resource(`${path}/servicios`, 'PUT', { ids_servicios: serviceIds })
      setPassword('')
      setConfirmation('')
      setNotice('Cambios guardados correctamente.')
      onSaved()
      if (tab === 'cuenta' || tab === 'contrasena') void restoreSession()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los cambios.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function deleteEmployee() {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setDeleting(true)
    setError('')
    setNotice('')
    try {
      await request(`/empleados/${initial.id}`, 'DELETE')
      onDeleted()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el registro.')
      setConfirmDelete(false)
    } finally {
      saving.current = false
      setBusy(false)
      setDeleting(false)
    }
  }

  const tabs = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'cuenta', label: 'Acceso' },
    { id: 'contrasena', label: 'Contraseña' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'jornada', label: 'Jornada' },
    { id: 'atenciones', label: 'Atenciones' },
  ]
  return (
    <Modal
      title={initial.cuenta.persona?.nombre_completo ?? initial.cargo}
      busy={busy}
      onClose={onClose}
    >
      <nav aria-label="Configuración del empleado" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={busy}
            className={tab === item.id ? 'api-primary' : 'api-secondary'}
            onClick={() => {
              setTab(item.id)
              setError('')
              setNotice('')
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === 'jornada' ? (
        <ScheduleEditor
          initial={schedule}
          onSave={async (rows) => {
            setSchedule(
              await resource(`/empleados/${initial.id}/jornada`, 'PUT', { jornada: rows }),
            )
            onSaved()
          }}
        />
      ) : tab === 'atenciones' ? (
        <>
          <Feedback loading={history.loading} error={history.error} onRetry={history.reload} />
          {history.data?.map(mapAppointment).map((item) => (
            <article className="mb-4 rounded-card border border-line p-4" key={item.id}>
              <h3 className="font-semibold">
                {item.date} · {item.client?.name}
              </h3>
              <ServiceResults services={item.services} />
            </article>
          ))}
          {history.data?.length === 0 && (
            <p className="text-sm text-stone">Aún no hay atenciones completadas.</p>
          )}
        </>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            {tab === 'perfil' && (
              <>
                <Field
                  label="Nombre"
                  required
                  maxLength={100}
                  value={profile.nombre}
                  onChange={(event) => setProfile({ ...profile, nombre: event.target.value })}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Apellido paterno"
                    required
                    maxLength={100}
                    value={profile.apellido_paterno}
                    onChange={(event) =>
                      setProfile({ ...profile, apellido_paterno: event.target.value })
                    }
                  />
                  <Field
                    label="Apellido materno (opcional)"
                    maxLength={100}
                    value={profile.apellido_materno}
                    onChange={(event) =>
                      setProfile({ ...profile, apellido_materno: event.target.value })
                    }
                  />
                </div>
                <Field
                  label="Cargo"
                  required
                  maxLength={255}
                  value={profile.cargo}
                  onChange={(event) => setProfile({ ...profile, cargo: event.target.value })}
                />
                <Field
                  label="Teléfono"
                  type="tel"
                  maxLength={30}
                  value={profile.telefono}
                  onChange={(event) => setProfile({ ...profile, telefono: event.target.value })}
                />
                <Field
                  label="Correo de contacto"
                  type="email"
                  maxLength={255}
                  value={profile.correo_contacto}
                  onChange={(event) =>
                    setProfile({ ...profile, correo_contacto: event.target.value })
                  }
                />
                <section className="space-y-4 rounded-card border border-line p-4">
                  <label className="block text-sm font-semibold">
                    Fotografía (se muestra en Nuestro equipo si es estilista)
                    <input
                      ref={imageInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      className="api-input mt-2"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        if (
                          file &&
                          (file.size > 2 * 1024 * 1024 ||
                            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                        ) {
                          setError('Selecciona una imagen JPG, PNG o WebP de hasta 2 MB.')
                          setImage(null)
                          setPreview('')
                          setRemoveImage(false)
                          event.target.value = ''
                          return
                        }
                        setImage(file)
                        setPreview(file ? URL.createObjectURL(file) : '')
                        setRemoveImage(false)
                        setError('')
                      }}
                    />
                  </label>
                  <p className="text-sm text-stone">JPG, PNG o WebP. Máximo 2 MB.</p>
                  {(image
                    ? preview
                    : !removeImage && currentImageUrl
                      ? apiAssetUrl(currentImageUrl)
                      : '') && (
                    <img
                      src={image ? preview : apiAssetUrl(currentImageUrl!)}
                      alt="Vista previa de la fotografía"
                      className="aspect-[3/2] w-full max-w-sm rounded-card object-cover object-top"
                    />
                  )}
                  {(image || currentImageUrl) && (
                    <button
                      type="button"
                      disabled={busy}
                      className="api-secondary"
                      onClick={() => {
                        setImage(null)
                        setPreview('')
                        setRemoveImage(!removeImage)
                        if (imageInput.current) imageInput.current.value = ''
                      }}
                    >
                      {removeImage ? 'Conservar imagen actual' : 'Quitar imagen'}
                    </button>
                  )}
                </section>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.activo}
                    onChange={(event) => setProfile({ ...profile, activo: event.target.checked })}
                  />
                  Perfil activo
                </label>
                {account.rol === 'estilista' && (
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={profile.admite_reservas}
                      onChange={(event) =>
                        setProfile({ ...profile, admite_reservas: event.target.checked })
                      }
                    />
                    Admite reservas
                  </label>
                )}
              </>
            )}
            {tab === 'cuenta' && (
              <>
                <Field
                  label="Correo de acceso"
                  type="email"
                  required
                  maxLength={255}
                  value={account.correo}
                  onChange={(event) => setAccount({ ...account, correo: event.target.value })}
                />
                <label className="block text-sm font-semibold">
                  Rol
                  <select
                    className="api-input mt-2"
                    value={account.rol}
                    onChange={(event) =>
                      setAccount({ ...account, rol: event.target.value as typeof account.rol })
                    }
                  >
                    <option value="administracion">Administración</option>
                    <option value="recepcion">Recepción</option>
                    <option value="estilista">Estilista</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={account.activo}
                    onChange={(event) => setAccount({ ...account, activo: event.target.checked })}
                  />
                  Acceso activo
                </label>
                <p className="text-sm text-stone">
                  Guardar cambios de acceso cerrará las sesiones anteriores de esta persona.
                </p>
              </>
            )}
            {tab === 'contrasena' && (
              <>
                <Field
                  label="Nueva contraseña"
                  type="password"
                  minLength={10}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Field
                  label="Confirmar contraseña"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
                <p className="text-sm text-stone">
                  Usa mayúsculas, minúsculas y números. Las sesiones anteriores se cerrarán.
                </p>
              </>
            )}
            {tab === 'servicios' && (
              <div className="space-y-4">
                {services.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(item.id)}
                      onChange={() =>
                        setServiceIds((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id],
                        )
                      }
                    />
                    {item.nombre}
                    {!item.activo && ' (inactivo)'}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <Feedback error={error} notice={notice} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button disabled={busy} className="api-primary">
              {busy && !deleting ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {tab === 'perfil' && !confirmDelete && (
              <button
                type="button"
                disabled={busy}
                className="api-secondary text-caramel-dark"
                onClick={() => {
                  setConfirmDelete(true)
                  setError('')
                }}
              >
                Eliminar personal
              </button>
            )}
          </div>
          {tab === 'perfil' && confirmDelete && (
            <div className="rounded-card border border-[#E8CFC0] bg-[#FAF0EA] p-4 text-sm">
              <p className="font-semibold text-caramel-dark">
                ¿Eliminar a «{initial.cuenta.persona?.nombre_completo ?? initial.cargo}»? Esta
                acción no se puede deshacer.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteEmployee()}
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
      )}
    </Modal>
  )
}

export function PersonnelAccountsSection() {
  const employees = useApi<EmployeeDto[]>('/empleados', true)
  const services = useApi<ServiceDto[]>('/administracion/servicios', true)
  const [editing, setEditing] = useState<EmployeeDto | 'new' | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const visible = (employees.data ?? []).filter((item) =>
    `${item.cuenta.persona?.nombre_completo} ${item.cuenta.correo} ${item.cargo}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  return (
    <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Personal</h1>
          <p className="mt-2 text-sm text-stone">
            Cuentas, servicios habilitados y jornadas del equipo.
          </p>
        </div>
        <button className="api-primary" onClick={() => setEditing('new')}>
          Agregar personal
        </button>
      </div>
      <Feedback
        loading={employees.loading}
        error={employees.error || services.error}
        notice={notice}
        onRetry={() => {
          employees.reload()
          services.reload()
        }}
      />
      <section className="api-panel">
        <Field
          label="Buscar por nombre, correo o cargo"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="mt-6 divide-y divide-line">
          {visible.map((item) => (
            <article
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 py-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-sand text-sm font-semibold text-stone">
                  {item.imagen_url ? (
                    <img
                      src={apiAssetUrl(item.imagen_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    (item.cuenta.persona?.nombre_completo ?? item.cargo).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{item.cuenta.persona?.nombre_completo}</h2>
                  <p className="mt-1 text-sm text-stone">
                    {item.cargo} · {item.cuenta.correo}
                  </p>
                  <p className="mt-1 text-xs text-stone">
                    {item.activo && item.cuenta.activo ? 'Acceso activo' : 'Acceso inactivo'} ·{' '}
                    {item.admite_reservas ? 'Admite reservas' : 'Sin reservas asignables'}
                  </p>
                </div>
              </div>
              <button
                className="api-secondary shrink-0"
                disabled={!services.data}
                onClick={() => setEditing(item)}
              >
                Gestionar
              </button>
            </article>
          ))}
        </div>
        {!employees.loading && !visible.length && (
          <p className="mt-6 text-sm text-stone">No hay personal para mostrar.</p>
        )}
      </section>
      {editing === 'new' && (
        <EmployeeCreator
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            employees.reload()
            setNotice('Cuenta creada. Configura sus servicios y jornada desde Gestionar.')
          }}
        />
      )}
      {editing && editing !== 'new' && (
        <EmployeeEditor
          initial={editing}
          services={services.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={employees.reload}
          onDeleted={() => {
            setEditing(null)
            employees.reload()
            setNotice('Registro de personal eliminado correctamente.')
          }}
        />
      )}
    </main>
  )
}
