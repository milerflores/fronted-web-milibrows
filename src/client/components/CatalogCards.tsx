import type { PublicService } from '../../shared/agenda/types'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export function ServiceCard({
  service,
  onBook,
}: {
  service: PublicService
  index?: number
  onBook: (id: string) => void
}) {
  const image = service.imageUrl
  return (
    <article className="overflow-hidden rounded-[18px] bg-ivory text-graphite shadow-card transition hover:-translate-y-1">
      <button
        type="button"
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-gold"
        onClick={() => onBook(service.id)}
        aria-label={`Reservar ${service.name}`}
      >
        {image && (
          <img src={image} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        )}
        <div className="p-5 sm:p-6">
          <h3 className="font-display text-2xl leading-tight">{service.name}</h3>
          {service.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone">
              {service.description}
            </p>
          )}
          <div className="mt-5 flex justify-between gap-4 text-sm">
            <span className="text-stone">{service.duration} min</span>
            <strong>{money.format(service.price)}</strong>
          </div>
          <span className="mt-5 inline-block text-sm font-semibold text-caramel-dark">
            Reservar este servicio
          </span>
        </div>
      </button>
    </article>
  )
}
