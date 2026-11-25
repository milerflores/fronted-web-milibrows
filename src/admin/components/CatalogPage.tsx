import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAssetUrl, request, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type { ServiceDto } from '../../shared/api/types'
import { Feedback, Field, Modal } from '../../shared/components/Forms'

function ServiceEditor({
  record,
  onClose,
  onSaved,
  onDeleted,
}: {
  record: ServiceDto | null
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}) {
  const [name, setName] = useState(record?.nombre ?? '')
  const [description, setDescription] = useState(record?.descripcion ?? '')
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const [price, setPrice] = useState(record?.precio ?? '')
  const [duration, setDuration] = useState(String(record?.duracion_minutos ?? 30))
  const [active, setActive] = useState(record?.activo ?? true)
  const [visible, setVisible] = useState(record?.visible_al_publico ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const data = new FormData()
      data.set('nombre', name.trim())
      data.set('descripcion', description.trim())
      data.set('precio', price)
      data.set('duracion_minutos', duration)
      data.set('activo', active ? '1' : '0')
      data.set('visible_al_publico', visible ? '1' : '0')
      if (image) data.set('imagen', image)
      if (removeImage) data.set('eliminar_imagen', '1')
      if (record) data.set('_method', 'PATCH')
      await resource(`/administracion/servicios${record ? `/${record.id}` : ''}`, 'POST', data)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el servicio.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  async function deleteService() {
    if (!record || saving.current) return
    saving.current = true
    setBusy(true)
    setDeleting(true)
    setError('')
    try {
      await request(`/administracion/servicios/${record.id}`, 'DELETE')
      onDeleted?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el servicio.')
      setConfirmDelete(false)
    } finally {
      saving.current = false
      setBusy(false)
      setDeleting(false)
    }
  }
  return (
    <Modal title={record ? 'Editar servicio' : 'Nuevo servicio'} busy={busy} onClose={onClose}>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="space-y-5">
          <Field
            label="Nombre"
            maxLength={255}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="block text-sm font-semibold">
            Descripción
            <textarea
              className="api-input mt-2 min-h-28"
              maxLength={5000}
              value={description}
              disabled={busy}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <section className="space-y-4 rounded-card border border-line p-4">
            <label className="block text-sm font-semibold">
              Imagen del servicio
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
              : !removeImage && record?.imagen_url
                ? apiAssetUrl(record.imagen_url)
                : '') && (
              <img
                src={image ? preview : apiAssetUrl(record!.imagen_url!)}
                alt="Vista previa del servicio"
                className="aspect-video w-full rounded-card object-cover"
              />
            )}
            {(image || record?.imagen_url) && (
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Precio en soles"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <Field
              label="Duración en minutos"
              type="number"
              min="1"
              max="720"
              step="1"
              required
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Servicio activo
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            Visible en el portal de clientes
          </label>
          <Feedback error={error} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button className="api-primary" disabled={busy}>
              {busy && !deleting ? 'Guardando…' : 'Guardar servicio'}
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
                Eliminar servicio
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
                  onClick={() => void deleteService()}
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
        </fieldset>
      </form>
    </Modal>
  )
}

export function CatalogPage() {
  const services = useApi<ServiceDto[]>('/administracion/servicios', true)
  const [query, setQuery] = useState('')
  const [serviceEditor, setServiceEditor] = useState<ServiceDto | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  const visible = (services.data ?? []).filter((item) =>
    item.nombre.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="font-display text-3xl">Servicios</h1>
          <p className="mt-2 text-sm text-stone">Catálogo y condiciones para nuevas reservas.</p>
        </div>
        <button className="api-primary" onClick={() => setServiceEditor('new')}>
          Nuevo servicio
        </button>
      </div>
      <Feedback
        loading={services.loading}
        error={services.error}
        onRetry={services.reload}
        notice={notice}
      />
      <section className="api-panel">
        <Field
          label="Buscar servicio"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-6 divide-y divide-line">
          {visible.map((item) => (
            <article
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-5 py-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-card bg-sand">
                  {item.imagen_url ? (
                    <img
                      src={apiAssetUrl(item.imagen_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-medium text-stone">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{item.nombre}</h2>
                  {item.descripcion && (
                    <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-stone">
                      {item.descripcion}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-stone">
                    {item.duracion_minutos} min · S/ {item.precio}
                  </p>
                  <p className="mt-1 text-xs text-stone">
                    {item.visible_al_publico ? 'Visible al público' : 'Solo uso interno'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    item.activo
                      ? 'bg-status-active-bg text-status-active-text'
                      : 'bg-status-inactive-bg text-status-inactive-text'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${item.activo ? 'bg-status-active-dot' : 'bg-status-inactive-dot'}`}
                  />
                  {item.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button className="api-secondary shrink-0" onClick={() => setServiceEditor(item)}>
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
        {!services.loading && !visible.length && (
          <p className="mt-6 text-sm text-stone">No hay servicios para mostrar.</p>
        )}
      </section>
      {serviceEditor && (
        <ServiceEditor
          record={serviceEditor === 'new' ? null : serviceEditor}
          onClose={() => setServiceEditor(null)}
          onSaved={() => {
            setServiceEditor(null)
            services.reload()
            setNotice('Servicio guardado correctamente.')
          }}
          onDeleted={() => {
            setServiceEditor(null)
            services.reload()
            setNotice('Servicio eliminado correctamente.')
          }}
        />
      )}
    </main>
  )
}
