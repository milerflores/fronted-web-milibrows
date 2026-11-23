import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiAssetUrl, resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type { ServiceDto } from '../../shared/api/types'
import { Feedback, Field, Modal } from '../../shared/components/Forms'

function ServiceEditor({
  record,
  onClose,
  onSaved,
}: {
  record: ServiceDto | null
  onClose: () => void
  onSaved: () => void
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
          <button className="api-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar servicio'}
          </button>
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
              className="flex flex-wrap items-center justify-between gap-4 py-5"
            >
              <div>
                <h2 className="font-semibold">{item.nombre}</h2>
                {item.imagen_url && (
                  <img
                    src={apiAssetUrl(item.imagen_url)}
                    alt=""
                    loading="lazy"
                    className="mt-3 h-24 w-40 rounded-card object-cover"
                  />
                )}
                {item.descripcion && (
                  <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-stone">
                    {item.descripcion}
                  </p>
                )}
                <p className="mt-2 text-sm text-stone">
                  {item.duracion_minutos} min · S/ {item.precio}
                </p>
                <p className="mt-1 text-xs text-stone">
                  {item.activo ? 'Activo' : 'Inactivo'} ·{' '}
                  {item.visible_al_publico ? 'Público' : 'Uso interno'}
                </p>
              </div>
              <button className="api-secondary" onClick={() => setServiceEditor(item)}>
                Editar
              </button>
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
        />
      )}
    </main>
  )
}
