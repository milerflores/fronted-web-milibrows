import type { PublicService, PublicStylist } from "../../shared/agenda/types";
import disenoCejas from "../../assets/images/servicios/diseno-cejas.png";
import laminadoCejas from "../../assets/images/servicios/laminado-cejas.png";
import liftingPestanas from "../../assets/images/servicios/lifting-pestanas.png";
import tinteCejas from "../../assets/images/servicios/tinte-cejas.png";
import perfiladoCejas from "../../assets/images/servicios/perfilado-cejas.png";
import micropigmentacionLabios from "../../assets/images/servicios/micropigmentacion-labios.png";
import eva from "../../assets/images/estilistas/eva.png";
import scarlet from "../../assets/images/estilistas/scarlet.png";
import kimberly from "../../assets/images/estilistas/kimberly.png";

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const serviceImages: Record<string, string | undefined> = {
  diseno: disenoCejas,
  laminado: laminadoCejas,
  lifting: liftingPestanas,
  tinte: tinteCejas,
  perfilado: perfiladoCejas,
  "micropigmentacion-labios": micropigmentacionLabios,
};
const stylistImages: Record<string, string | undefined> = {
  eva,
  scarlet,
  kimberly,
};

export function ServiceCard({
  service,
  index,
  onBook,
}: {
  service: PublicService;
  index: number;
  onBook: (id: string) => void;
}) {
  const image = serviceImages[service.id];

  return (
    <article className="group overflow-hidden rounded-[18px] bg-ivory shadow-card transition hover:-translate-y-1 hover:shadow-lg">
      <button
        type="button"
        className="block w-full text-left focus:outline-none"
        onClick={() => onBook(service.id)}
        aria-label={`Reservar ${service.name}`}
      >
        {image ? (
          <div className="relative aspect-video overflow-hidden bg-sand" aria-hidden="true">
            <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className={`service-art service-art--${index % 5}`} aria-hidden="true">
            <span className="service-art__shape" />
            <span className="service-art__ring" />
            <span className="service-art__number">0{index + 1}</span>
          </div>
        )}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-2xl leading-tight text-graphite">{service.name}</h3>
          </div>
          <p className="mt-3 min-h-12 text-sm leading-relaxed text-stone">
            {service.description || "Descripción por confirmar."}
          </p>
          <div className="mt-5 flex items-center justify-between pt-4 text-sm">
            <span className="text-stone">{service.duration} min</span>
            <strong className="text-graphite">{money.format(service.price)}</strong>
          </div>
          <span className="mt-4 inline-block text-sm font-semibold text-caramel-dark">
            Reservar este servicio
          </span>
        </div>
      </button>
    </article>
  );
}

function StylistCard({
  stylist,
  services,
  index,
}: {
  stylist: PublicStylist;
  services: PublicService[];
  index: number;
}) {
  const enabled = services.filter((service) => stylist.serviceIds.includes(service.id));
  const image = stylistImages[stylist.id];
  return (
    <article className="overflow-hidden rounded-[18px] bg-white shadow-card">
      {image ? (
        <img src={image} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
      ) : (
        <div className={`stylist-art stylist-art--${index % 3}`} aria-hidden="true">
          <span className="stylist-art__arch" />
          <span className="stylist-art__initial">{stylist.name.charAt(0)}</span>
          <span className="stylist-art__line" />
        </div>
      )}
      <div className="p-5 sm:p-6">
        <h3 className="font-display text-2xl text-graphite">{stylist.name}</h3>
        {stylist.specialty && <p className="mt-1 text-sm text-stone">{stylist.specialty}</p>}
        <p className="mt-5 text-xs font-semibold tracking-[.12em] text-caramel-dark uppercase">
          Servicios
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {enabled.length ? (
            enabled.map((service) => (
              <span
                key={service.id}
                className="rounded-full bg-ivory px-3 py-1.5 text-xs text-graphite"
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
  );
}

export function StudioTeam({
  stylists,
  services,
}: {
  stylists: PublicStylist[];
  services: PublicService[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stylists.map((stylist, index) => (
        <StylistCard key={stylist.id} stylist={stylist} services={services} index={index} />
      ))}
    </div>
  );
}
