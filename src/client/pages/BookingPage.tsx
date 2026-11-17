import { useRef, useState } from "react";
import { addDays, dateFromKey, dateKey, endTime } from "../../shared/agenda/dates";
import {
  AgendaOperationError,
  createClientAppointment,
  getAvailableStartTimes,
  getEligibleStylists,
} from "../../shared/agenda/mockAgendaService";
import type {
  AppointmentService,
  ClientBookingResult,
  DemoClientIdentity,
  PublicCatalog,
} from "../../shared/agenda/types";
import { CatalogState } from "../components/CatalogState";

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const longDate = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const steps = ["Servicios", "Estilista", "Fecha y horario", "Revisión"];

function suggestedDate(): string {
  const today = new Date();
  const day = today.getDay() === 0 ? addDays(today, 1) : today;
  return dateKey(day);
}

function BookingSummary({
  client,
  services,
  stylistName,
  date,
  startTime,
  notes,
}: {
  client?: DemoClientIdentity;
  services: AppointmentService[];
  stylistName: string;
  date: string;
  startTime: string;
  notes: string;
}) {
  const duration = services.reduce((sum, service) => sum + service.agreedDuration, 0);
  const price = services.reduce((sum, service) => sum + service.agreedPrice, 0);
  return (
    <div className="space-y-6 rounded-[20px] bg-sand p-6 sm:p-8">
      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="client-eyebrow">Cliente</dt>
          <dd className="mt-2 font-semibold">{client?.name ?? "Identifícate para confirmar"}</dd>
          {client && (
            <dd className="mt-1 text-base text-stone">
              {client.phone}
              {client.email && <span className="block break-all">{client.email}</span>}
            </dd>
          )}
        </div>
        <div>
          <dt className="client-eyebrow">Estilista</dt>
          <dd className="mt-2 font-semibold">{stylistName}</dd>
        </div>
        <div>
          <dt className="client-eyebrow">Fecha</dt>
          <dd className="mt-2 font-semibold">{longDate.format(dateFromKey(date))}</dd>
        </div>
        <div>
          <dt className="client-eyebrow">Horario</dt>
          <dd className="mt-2 font-semibold">
            {startTime} – {endTime(startTime, duration)}
          </dd>
        </div>
      </dl>
      <div>
        <h3 className="font-display text-2xl">Servicios </h3>
        <ul className="mt-4 space-y-2 rounded-[14px] bg-white p-4">
          {services.map((service) => (
            <li
              key={service.serviceId}
              className="flex items-start justify-between gap-4 py-3 text-base"
            >
              <span>
                <strong className="font-semibold">{service.serviceName}</strong>
                <span className="mt-1 block text-stone">{service.agreedDuration} min</span>
              </span>
              <span className="whitespace-nowrap font-semibold">
                {money.format(service.agreedPrice)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap justify-between gap-3 text-base">
          <span className="text-stone">Duración total</span>
          <strong>{duration} min</strong>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-3">
          <span className="font-semibold">Precio total </span>
          <strong className="text-lg">{money.format(price)}</strong>
        </div>
      </div>
      {notes.trim() && (
        <div className="rounded-[12px] bg-ivory p-4 text-base">
          <p className="font-semibold">Observaciones de la reserva</p>
          <p className="mt-1 whitespace-pre-wrap text-stone">{notes.trim()}</p>
        </div>
      )}
    </div>
  );
}

interface BookingPageProps {
  catalog: PublicCatalog | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  initialServiceId?: string;
  accounts: DemoClientIdentity[];
  accountsLoading: boolean;
  accountsError: string;
  accountId: string;
  onRetryAccounts: () => void;
  onRequireAuth: (mode: "login" | "registro") => void;
}

export function BookingPage({
  catalog,
  loading,
  error,
  onRetry,
  initialServiceId,
  accounts,
  accountsLoading,
  accountsError,
  accountId,
  onRetryAccounts,
  onRequireAuth,
}: BookingPageProps) {
  const savingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>(() =>
    initialServiceId ? [initialServiceId] : [],
  );
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(suggestedDate);
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [stepError, setStepError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ClientBookingResult | null>(null);

  const activeServices = catalog?.services ?? [];
  const validServiceIds = serviceIds.filter((id) =>
    activeServices.some((service) => service.id === id),
  );
  const selectedServices = validServiceIds.map(
    (id) => activeServices.find((service) => service.id === id)!,
  );
  const eligibleIds = new Set(getEligibleStylists(validServiceIds).map((stylist) => stylist.id));
  const eligibleStylists = (catalog?.stylists ?? []).filter((stylist) =>
    eligibleIds.has(stylist.id),
  );
  const stylist = eligibleStylists.find((item) => item.id === stylistId);
  const duration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const price = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const availableTimes =
    validServiceIds.length && stylistId
      ? getAvailableStartTimes(date, stylistId, validServiceIds)
      : [];
  const validStartTime = availableTimes.includes(startTime) ? startTime : "";
  const client = accounts.find((item) => item.id === accountId);
  const reviewServices: AppointmentService[] = selectedServices.map((service) => ({
    serviceId: service.id,
    serviceName: service.name,
    agreedPrice: service.price,
    agreedDuration: service.duration,
  }));

  function toggleService(id: string) {
    const next = validServiceIds.includes(id)
      ? validServiceIds.filter((item) => item !== id)
      : [...validServiceIds, id];
    setServiceIds(next);
    setStepError("");
    const nextEligible = getEligibleStylists(next);
    if (stylistId && !nextEligible.some((item) => item.id === stylistId)) {
      setStylistId("");
      setStartTime("");
      setNotice("La estilista elegida no realiza todos estos servicios. Selecciona otra.");
    } else if (startTime && !getAvailableStartTimes(date, stylistId, next).includes(startTime)) {
      setStartTime("");
      setNotice("La duración cambió y la hora elegida ya no está disponible. Selecciona otra.");
    } else setNotice("");
  }

  function chooseStylist(id: string) {
    setStylistId(id);
    setStepError("");
    if (startTime && !getAvailableStartTimes(date, id, validServiceIds).includes(startTime)) {
      setStartTime("");
      setNotice("La hora elegida no está disponible con esta estilista. Selecciona otra.");
    } else setNotice("");
  }

  function chooseDate(next: string) {
    setDate(next);
    setStepError("");
    if (
      startTime &&
      !getAvailableStartTimes(next, stylistId, validServiceIds).includes(startTime)
    ) {
      setStartTime("");
      setNotice("La hora elegida no está disponible en esta fecha. Selecciona otra.");
    } else setNotice("");
  }

  function nextStep() {
    setStepError("");
    if (step === 0 && !validServiceIds.length) {
      setStepError("Selecciona al menos un servicio activo.");
      return;
    }
    if (step === 0 && !eligibleStylists.length) {
      setStepError(
        "No hay una estilista habilitada para todos estos servicios. Ajusta la selección.",
      );
      return;
    }
    if (step === 1 && !stylist) {
      setStepError("Selecciona una estilista para todos los servicios.");
      return;
    }
    if (step === 2 && (!date || dateFromKey(date).getDay() === 0 || !validStartTime)) {
      setStepError("Selecciona una fecha y hora disponibles de lunes a sábado.");
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  }

  async function confirm() {
    if (savingRef.current) return;
    setStepError("");
    if (!accountId) {
      onRequireAuth("login");
      return;
    }
    if (!client) {
      setStepError("Cargando los datos de tu cuenta. Intenta de nuevo en un momento.");
      return;
    }
    if (!validServiceIds.length || validServiceIds.length !== serviceIds.length) {
      setStep(0);
      setStepError("Revisa los servicios activos seleccionados.");
      return;
    }
    if (!stylist) {
      setStep(1);
      setStepError("La estilista seleccionada ya no está habilitada. Elige otra.");
      return;
    }
    if (!validStartTime) {
      setStep(2);
      setStepError("El horario ya no está disponible. Selecciona otra hora.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await createClientAppointment(
        {
          serviceIds: validServiceIds,
          stylistId,
          date,
          startTime: validStartTime,
          notes,
        },
        client.id,
      );
      setResult(saved);
    } catch (cause) {
      if (cause instanceof AgendaOperationError && cause.field === "startTime") {
        setStep(2);
        setStartTime("");
      } else if (cause instanceof AgendaOperationError && cause.field === "stylistId") {
        setStep(1);
        setStylistId("");
        setStartTime("");
      } else if (cause instanceof AgendaOperationError && cause.field === "serviceIds") setStep(0);
      setStepError(
        cause instanceof Error
          ? cause.message
          : "No se pudo confirmar la reserva. Intenta de nuevo.",
      );
      savingRef.current = false;
      setSaving(false);
    }
  }

  function startAnother() {
    setResult(null);
    setServiceIds([]);
    setStylistId("");
    setDate(suggestedDate());
    setStartTime("");
    setNotes("");
    setNotice("");
    setStepError("");
    setSaving(false);
    savingRef.current = false;
    setStep(0);
  }

  const savedStylist = result
    ? (catalog?.stylists.find((item) => item.id === result.appointment.stylistId)?.name ??
      "Estilista")
    : "";
  return (
    <main
      id="contenido"
      className="client-simple-page client-container max-w-[1120px] py-12 sm:py-18"
    >
      <div className="mb-10 rounded-[24px] bg-black p-8 text-white sm:p-12">
        <h1 className="font-display text-4xl sm:text-5xl">Reserva tu cita</h1>
        <p className="mt-4 max-w-[55ch] text-white/85">
          Elige servicios, estilista y horario. Para confirmar, inicia sesión o crea una cuenta.
        </p>
      </div>
      <CatalogState loading={loading} error={error} onRetry={onRetry} />
      {accountId && accountsLoading && (
        <p role="status" className="rounded-[16px] bg-white p-6 text-base text-stone">
          Cargando tu cuenta…
        </p>
      )}
      {accountsError && (
        <div role="alert" className="rounded-[16px] bg-white p-6 text-base">
          <p className="text-caramel-dark">{accountsError}</p>
          <button type="button" className="client-text-link mt-3" onClick={onRetryAccounts}>
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && !accountsLoading && !accountsError && (
        <>
          {!result && (
            <div className="mb-8 rounded-[18px] bg-champagne/60 p-6">
              {client ? (
                <p>
                  Reservarás a nombre de <strong>{client.name}</strong>.
                </p>
              ) : (
                <p>
                  Explora horarios sin sesión. Antes de confirmar podrás{" "}
                  <button
                    type="button"
                    className="client-text-link"
                    onClick={() => onRequireAuth("login")}
                  >
                    iniciar sesión
                  </button>{" "}
                  o{" "}
                  <button
                    type="button"
                    className="client-text-link"
                    onClick={() => onRequireAuth("registro")}
                  >
                    registrarte
                  </button>
                  .
                </p>
              )}
            </div>
          )}
          {result ? (
            <section aria-labelledby="booking-success-title" className="mx-auto max-w-[900px]">
              <div role="status" className="mb-7 rounded-[20px] bg-sage/20 p-6 sm:p-8">
                <p className="client-eyebrow text-sage-dark">Cita confirmada</p>
                <h2 id="booking-success-title" className="mt-3 font-display text-4xl">
                  Tu reserva está registrada.
                </h2>
              </div>
              <BookingSummary
                client={result.client}
                services={result.appointment.services}
                stylistName={savedStylist}
                date={result.appointment.date}
                startTime={result.appointment.startTime}
                notes={result.appointment.notes ?? ""}
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <a className="client-primary" href={`#mis-citas/${result.appointment.id}`}>
                  Ver en Mis citas
                </a>
                <button type="button" className="client-secondary" onClick={startAnother}>
                  Comenzar otra reserva
                </button>
              </div>
            </section>
          ) : (
            <section aria-label="Pasos de reserva" className="mx-auto max-w-[1000px]">
              <ol className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {steps.map((label, index) => (
                  <li
                    key={label}
                    className={`rounded-[14px] px-4 py-4 text-base font-semibold ${step === index ? "bg-black text-white" : index < step ? "bg-champagne text-graphite" : "bg-sand text-stone"}`}
                    aria-current={step === index ? "step" : undefined}
                  >
                    <span className="mr-2 font-display text-lg">0{index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              <div className="rounded-[24px] bg-white p-6 shadow-card sm:p-10">
                {notice && (
                  <p
                    role="status"
                    className="mb-5 rounded-[12px] bg-champagne/40 p-3 text-base text-graphite"
                  >
                    {notice}
                  </p>
                )}
                {step === 0 && (
                  <section aria-labelledby="booking-services-title">
                    <h2 id="booking-services-title" className="font-display text-3xl">
                      Elige tus servicios
                    </h2>
                    <p className="mt-2 text-base text-stone">
                      Puedes combinar varios servicios en una sola cita con la misma estilista.
                    </p>
                    {initialServiceId &&
                      !activeServices.some((service) => service.id === initialServiceId) && (
                        <p role="status" className="mt-4 text-base text-caramel-dark">
                          El servicio del enlace ya no está activo. Elige otro del catálogo.
                        </p>
                      )}
                    {activeServices.length ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {activeServices.map((service) => (
                          <label
                            key={service.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-[16px] p-5 transition hover:bg-champagne/40 ${validServiceIds.includes(service.id) ? "bg-champagne" : "bg-ivory"}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 size-5 accent-[#C9A24B]"
                              checked={validServiceIds.includes(service.id)}
                              onChange={() => toggleService(service.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block font-display text-xl font-normal">
                                {service.name}
                              </strong>
                              <span className="mt-1 block text-base text-stone">
                                {service.description}
                              </span>
                              <span className="mt-3 block text-base font-semibold">
                                {service.duration} min · {money.format(service.price)}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p role="status" className="mt-6 text-base text-stone">
                        No hay servicios activos disponibles para reservar.
                      </p>
                    )}
                    {validServiceIds.length > 0 && !eligibleStylists.length && (
                      <p
                        role="status"
                        className="mt-4 rounded-[12px] bg-[#FAF0EA] p-3 text-base text-caramel-dark"
                      >
                        No hay una estilista habilitada para todos los servicios elegidos. Ajusta tu
                        selección.
                      </p>
                    )}
                  </section>
                )}
                {step === 1 && (
                  <section aria-labelledby="booking-stylist-title">
                    <h2 id="booking-stylist-title" className="font-display text-3xl">
                      Elige una estilista
                    </h2>
                    <p className="mt-2 text-base text-stone">
                      Solo aparecen estilistas activas habilitadas para todos los servicios.
                    </p>
                    {eligibleStylists.length ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {eligibleStylists.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={stylistId === item.id}
                            className={`rounded-[16px] p-5 text-left transition hover:bg-champagne/40 focus-visible:outline-2 focus-visible:outline-gold ${stylistId === item.id ? "bg-champagne" : "bg-ivory"}`}
                            onClick={() => chooseStylist(item.id)}
                          >
                            <span className="block font-display text-2xl">{item.name}</span>
                            {item.specialty && (
                              <span className="mt-2 block text-base text-stone">
                                {item.specialty}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p
                        role="status"
                        className="mt-6 rounded-[12px] bg-[#FAF0EA] p-4 text-base text-caramel-dark"
                      >
                        No hay estilistas compatibles. Vuelve a servicios y ajusta la selección.
                      </p>
                    )}
                  </section>
                )}
                {step === 2 && (
                  <section aria-labelledby="booking-time-title">
                    <h2 id="booking-time-title" className="font-display text-3xl">
                      Fecha y horario
                    </h2>
                    <p className="mt-2 text-base text-stone">
                      Lunes a sábado, de 10:00 a 22:00. La atención completa debe caber en el
                      horario.
                    </p>
                    <div className="mt-6 max-w-[330px]">
                      <label htmlFor="booking-date" className="text-base font-semibold">
                        Fecha *
                      </label>
                      <input
                        id="booking-date"
                        className="client-search mt-2"
                        type="date"
                        min={dateKey(new Date())}
                        value={date}
                        onChange={(event) => chooseDate(event.target.value)}
                      />
                    </div>
                    {date && dateFromKey(date).getDay() === 0 && (
                      <p role="status" className="mt-3 text-base text-caramel-dark">
                        El estudio no atiende los domingos. Elige de lunes a sábado.
                      </p>
                    )}
                    {date && stylistId && !availableTimes.length && (
                      <p
                        role="status"
                        className="mt-6 rounded-[12px] bg-[#FAF0EA] p-4 text-base text-caramel-dark"
                      >
                        No hay horarios disponibles para esta fecha y duración. Prueba otro día o
                        estilista.
                      </p>
                    )}
                    {availableTimes.length > 0 && (
                      <fieldset className="mt-7">
                        <legend className="text-base font-semibold">
                          Horas disponibles · {duration} min de atención
                        </legend>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {availableTimes.map((time) => (
                            <button
                              key={time}
                              type="button"
                              aria-pressed={validStartTime === time}
                              className={`rounded-[14px] px-4 py-3 text-left text-base transition hover:bg-champagne/40 focus-visible:outline-2 focus-visible:outline-gold ${validStartTime === time ? "bg-champagne" : "bg-ivory"}`}
                              onClick={() => {
                                setStartTime(time);
                                setStepError("");
                                setNotice("");
                              }}
                            >
                              <strong className="block">{time}</strong>
                              <span className="text-base text-stone">
                                hasta {endTime(time, duration)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </section>
                )}
                {step === 3 && stylist && validStartTime && (
                  <section aria-labelledby="booking-review-title">
                    <h2 id="booking-review-title" className="font-display text-3xl">
                      Revisa tu reserva
                    </h2>
                    <p className="mt-2 text-base text-stone">
                      Comprueba los datos antes de confirmar.
                    </p>
                    <div className="mt-6">
                      <BookingSummary
                        client={client}
                        services={reviewServices}
                        stylistName={stylist.name}
                        date={date}
                        startTime={validStartTime}
                        notes={notes}
                      />
                    </div>
                    <div className="mt-6">
                      <label htmlFor="booking-notes" className="text-base font-semibold">
                        Observaciones (opcional)
                      </label>
                      <textarea
                        id="booking-notes"
                        className="client-search mt-2 min-h-28 resize-y"
                        value={notes}
                        maxLength={500}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Indicaciones para la atención"
                      />
                    </div>
                  </section>
                )}
                {step === 3 && (!stylist || !validStartTime) && (
                  <p role="alert" className="text-base text-caramel-dark">
                    Falta información de la reserva. Vuelve al paso correspondiente para
                    completarla.
                  </p>
                )}
                {stepError && (
                  <p
                    role="alert"
                    className="mt-6 rounded-[12px] bg-[#FAF0EA] p-3 text-base text-caramel-dark"
                  >
                    {stepError}
                  </p>
                )}
                <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="rounded-full bg-sand px-6 py-3 text-base font-semibold hover:bg-champagne disabled:opacity-40"
                    disabled={step === 0 || saving}
                    onClick={() => {
                      setStep((current) => current - 1);
                      setStepError("");
                    }}
                  >
                    Volver
                  </button>
                  {step < 3 ? (
                    <button type="button" className="client-primary" onClick={nextStep}>
                      Continuar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="client-primary disabled:cursor-wait disabled:opacity-60"
                      disabled={saving}
                      onClick={confirm}
                    >
                      {saving
                        ? "Confirmando…"
                        : client
                          ? "Confirmar cita"
                          : "Iniciar sesión para confirmar"}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-5 rounded-[16px] bg-sand px-5 py-4 text-base text-stone">
                <strong className="text-graphite">Tu selección:</strong> {validServiceIds.length}{" "}
                {validServiceIds.length === 1 ? "servicio" : "servicios"} · {duration} min ·{" "}
                {money.format(price)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
