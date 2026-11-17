import type { PublicService, PublicStylist } from "../../shared/agenda/types";

import { ServiceCard, StudioTeam } from "../components/CatalogCards";
import { CatalogState } from "../components/CatalogState";
import hero from "../../assets/images/home/hero.jpg";
import instalacion from "../../assets/images/home/instalacion.jpg";
import invitacion from "../../assets/images/home/invitacion.jpg";

export function HomePage({
  services,
  stylists,
  loading,
  error,
  onRetry,
  onBookService,
}: {
  services: PublicService[] | null;
  stylists: PublicStylist[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onBookService: (id: string) => void;
}) {
  const availableServices = services ?? [];

  return (
    <main id="contenido" className="client-home-page">
      <section
        id="inicio"
        className="client-home-hero relative isolate flex items-center justify-center overflow-hidden text-center text-white"
        aria-labelledby="hero-title"
      >
        <img
          src={hero}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[54%_center]"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-graphite/60 via-graphite/40 to-graphite/55"
          aria-hidden="true"
        />
        <div className="client-container relative z-10 flex flex-col items-center pb-20 pt-44 sm:pt-48">
          <h1
            id="hero-title"
            className="max-w-[15ch] font-display text-[clamp(3.4rem,8vw,8rem)] leading-[1.02] tracking-[-.055em] text-balance"
          >
            La belleza está <span className="italic">en cada detalle.</span>
          </h1>
          <p className="mt-8 max-w-[48ch] text-base leading-relaxed text-white/95 sm:text-lg">
            Conoce los servicios de MiliBrows Studio
          </p>
          <a href="#servicios" className="client-hero-action mt-12">
            <span>Servicios</span>
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-ivory text-xl text-graphite"
              aria-hidden="true"
            >
              →
            </span>
          </a>
        </div>
      </section>
      <section
        id="servicios"
        className="bg-black py-20 text-white sm:py-28"
        aria-labelledby="services-title"
      >
        <div className="client-container">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-8 pb-9">
            <div className="max-w-[720px]">
              <h2 id="services-title" className="client-section-heading mt-6">
                Nuestros servicios
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-white/80">
                Explora todos los servicios disponibles, sus tiempos y precios.
                Elige el cuidado que mejor va contigo.
              </p>
            </div>
            <a href="#reservar" className="client-secondary shrink-0">
              Reservar cita <span aria-hidden="true"></span>
            </a>
          </div>
          <CatalogState loading={loading} error={error} onRetry={onRetry} />
          {!loading &&
            !error &&
            (availableServices.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {availableServices.map((service, index) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    index={index}
                    onBook={onBookService}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-[18px] bg-white p-8 text-stone">
                No hay servicios activos para mostrar.
              </p>
            ))}
        </div>
      </section>
      <section
        className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-graphite py-24 text-white sm:py-32"
        aria-labelledby="studio-title"
      >
        <img
          src={instalacion}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0 -z-10 bg-graphite/60"
          aria-hidden="true"
        />
        <div className="client-container">
          <div className="max-w-[680px]">
            <h2
              id="studio-title"
              className="mt-5 max-w-[13ch] font-display text-[clamp(2.8rem,5.5vw,5.6rem)] leading-[1.05] tracking-[-.04em]"
            >
              Un espacio para elegir con calma.
            </h2>
            <p className="mt-7 max-w-[47ch] text-lg leading-relaxed text-white/90">
              Un lugar preparado para disfrutar cada atención con calma. Conoce
              nuestros servicios y a las estilistas que te acompañarán.
            </p>
            <a
              href="#estilistas"
              className="mt-9 inline-block pb-1 text-base font-semibold text-champagne transition hover:text-white"
            >
              Conocer a las estilistas
            </a>
          </div>
        </div>
      </section>
      <section
        id="estilistas"
        className="bg-sage-dark py-20 text-white sm:py-28"
        aria-labelledby="team-title"
      >
        <div className="client-container">
          <div className="mb-12 max-w-[720px]">
            <h2 id="team-title" className="client-section-heading mt-4">
              Nuestro equipo
            </h2>
            <p className="mt-5 text-lg text-white/85">
              Nuestro equipo te acompaña en cada atención.
            </p>
          </div>
          <CatalogState loading={loading} error={error} onRetry={onRetry} />
          {!loading &&
            !error &&
            (stylists?.length ? (
              <StudioTeam stylists={stylists} services={services ?? []} />
            ) : (
              <p className="rounded-[18px] bg-white/10 p-8 text-white">
                No hay estilistas activas para mostrar.
              </p>
            ))}
        </div>
      </section>
      <section
        className="relative isolate flex min-h-[470px] items-center overflow-hidden bg-black py-20 text-white sm:min-h-[520px] sm:py-28"
        aria-labelledby="invitation-title"
      >
        <img
          src={invitacion}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/25"
          aria-hidden="true"
        />
        <div className="client-container">
          <div className="max-w-[620px]">
            <h2
              id="invitation-title"
              className="max-w-[15ch] font-display text-4xl leading-tight tracking-[-.04em] text-balance sm:text-5xl lg:text-6xl"
            >
              ¿Lista para tu próxima visita?
            </h2>
            <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-white/90">
              Elige el momento y los servicios que mejor van contigo.
            </p>
            <a href="#reservar" className="client-primary mt-8 shadow-lg">
              Reservar cita
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
