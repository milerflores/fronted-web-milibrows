import { useEffect, useId, useRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}
      <input {...props} id={id} className="api-input border-line mt-2" />
    </label>
  )
}
export function Feedback({
  error,
  notice,
  loading,
  onRetry,
}: {
  error?: string
  notice?: string
  loading?: boolean
  onRetry?: () => void
}) {
  return (
    <>
      {loading && (
        <p role="status" className="py-6 text-sm text-stone">
          Cargando…
        </p>
      )}
      {error && (
        <div role="alert" className="my-4 rounded-card bg-[#FAF0EA] p-4 text-sm text-caramel-dark">
          {error}
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-3 font-semibold underline">
              Reintentar
            </button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="my-4 rounded-card bg-[#E9EEE3] p-4 text-sm text-sage-dark">
          {notice}
        </p>
      )}
    </>
  )
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="api-modal"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line p-6 sm:px-8">
        <h2 id={titleId} className="font-display text-2xl sm:text-3xl">
          {title}
        </h2>
        <button
          type="button"
          className="api-secondary"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </dialog>
  )
}
export function ServiceResults({
  services,
}: {
  services: {
    id: string
    serviceName: string
    stylistName?: string
    startTime?: string
    agreedPrice: number
    agreedDuration: number
    result: string
    resultReason?: string
  }[]
}) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
    no_realizado: 'No realizado',
  }
  return (
    <ul className="divide-y divide-line">
      {services.map((service) => (
        <li key={service.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm">
          <div>
            <p className="font-semibold">{service.serviceName}</p>
            <p className="mt-1 text-stone">
              {service.startTime ? `${service.startTime} · ` : ''}
              {service.stylistName ? `${service.stylistName} · ` : ''}
              {service.agreedDuration} min · {labels[service.result] ?? service.result}
            </p>
            {service.resultReason && <p className="mt-1 text-stone">{service.resultReason}</p>}
          </div>
          <strong>
            {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
              service.agreedPrice,
            )}
          </strong>
        </li>
      ))}
    </ul>
  )
}
