export function CatalogState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean
  error: string
  onRetry: () => void
}) {
  if (loading)
    return (
      <div
        role="status"
        className="rounded-[18px] bg-white px-8 py-16 text-center text-stone"
      >
        Cargando catálogo…
      </div>
    )
  if (error)
    return (
      <div
        role="alert"
        className="rounded-[18px] bg-white px-8 py-16 text-center"
      >
        <p className="text-graphite">No pudimos cargar el catálogo.</p>
        <p className="mt-2 text-sm text-stone">{error}</p>
        <button type="button" className="client-primary mt-5" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    )
  return null
}
