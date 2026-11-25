import { useState } from 'react'
import type { PublicService, PublicStylist } from '../../shared/agenda/types'
import eva from '../../assets/images/estilistas/eva.png'
import scarlet from '../../assets/images/estilistas/scarlet.png'
import kimberly from '../../assets/images/estilistas/kimberly.png'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const stylistImages: Record<string, string | undefined> = {
  eva,
  scarlet,
  kimberly,
}

function stylistPhotoFor(name: string): string | undefined {
  const first = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
  return first ? stylistImages[first] : undefined
}

export function ServiceCard({
  service,
  index = 0,
  onBook,
}: {
  service: PublicService
  index?: number
  onBook: (id: string) => void
}) {
  const [imageError, setImageError] = useState(false)
  const image = !imageError ? service.imageUrl : undefined
  const artVariant = index % 5
  const numberLabel = String(index + 1).padStart(2, '0')

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[18px] bg-ivory text-graphite shadow-card transition duration-200 hover:-translate-y-1">
      <button
        type="button"
        className="flex h-full w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-gold"
        onClick={() => onBook(service.id)}
        aria-label={`Reservar ${service.name}`}
      >
        <div className="aspect-[16/10] w-full shrink-0 overflow-hidden bg-sand">
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={`service-art h-full ${artVariant > 0 ? `service-art--${artVariant}` : ''}`}
              aria-hidden="true"
            >
              <span className="service-art__shape" />
              <span className="service-art__ring" />
              <span className="service-art__number">{numberLabel}</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="font-display text-xl font-medium leading-snug sm:text-2xl">
            {service.name}
          </h3>
          {service.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone">
              {service.description}
            </p>
          )}
          <div className="mt-auto pt-5">
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-sm">
              <span className="text-stone">{service.duration} min</span>
              <strong className="text-base font-semibold text-graphite">
                {money.format(service.price)}
              </strong>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-caramel-dark transition group-hover:text-graphite">
              Reservar este servicio
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        </div>
      </button>
    </article>
  )
}

function StylistCard({
  stylist,
  services,
  index,
}: {
  stylist: PublicStylist
  services: PublicService[]
  index: number
}) {
  const [imageError, setImageError] = useState(false)
  const enabled = services.filter((service) => stylist.serviceIds.includes(service.id))
  const image = !imageError ? (stylist.imageUrl ?? stylistPhotoFor(stylist.name)) : undefined
  const artVariant = index % 3

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] bg-white text-graphite shadow-card">
      <div className="aspect-[3/2] w-full shrink-0 overflow-hidden bg-sand">
        {image ? (
          <img
            src={image}
            alt={stylist.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div
            className={`stylist-art h-full ${artVariant > 0 ? `stylist-art--${artVariant}` : ''}`}
            aria-hidden="true"
          >
            <span className="stylist-art__arch" />
            <span className="stylist-art__initial">{stylist.name.charAt(0).toUpperCase()}</span>
            <span className="stylist-art__line" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium leading-snug text-graphite sm:text-2xl">
          {stylist.name}
        </h3>
        {stylist.specialty && <p className="mt-1 text-sm text-stone">{stylist.specialty}</p>}
        <p className="mt-5 text-xs font-semibold tracking-[.12em] text-caramel-dark uppercase">
          Servicios
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {enabled.length ? (
            enabled.map((service) => (
              <span
                key={service.id}
                className="rounded-full bg-ivory px-3 py-1.5 text-xs font-medium text-graphite"
              >
                {service.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-stone">Por definir</span>
          )}
        </div>
      </div>
    </article>
  )
}

export function StudioTeam({
  stylists,
  services,
}: {
  stylists: PublicStylist[]
  services: PublicService[]
}) {
  return (
    <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stylists.map((stylist, index) => (
        <StylistCard key={stylist.id} stylist={stylist} services={services} index={index} />
      ))}
    </div>
  )
}
