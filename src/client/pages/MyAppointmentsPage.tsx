import { useEffect, useRef, useState } from "react";
import { dateFromKey, dateKey, endTime } from "../../shared/agenda/dates";
import {
  AgendaOperationError,
  cancelClientAppointment,
  getClientAppointments,
  getClientRescheduleIssue,
  getClientRescheduleStartTimes,
  rescheduleClientAppointment,
} from "../../shared/agenda/mockAgendaService";
import type {
  AppointmentStatus,
  ClientAppointment,
  DemoClientIdentity,
} from "../../shared/agenda/types";

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const fullDate = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const statuses: AppointmentStatus[] = [
  "confirmada",
  "completada",
  "cancelada",
  "no asistió",
];
type View = "proximas" | "todas";
type ModalMode = "detalle" | "reprogramar" | "cancelar";

function durationOf(appointment: ClientAppointment): number {
  return appointment.services.reduce(
    (sum, service) => sum + service.agreedDuration,
    0,
  );
}

function priceOf(appointment: ClientAppointment): number {
  return appointment.services.reduce(
    (sum, service) => sum + service.agreedPrice,
    0,
  );
}

function isFuture(appointment: ClientAppointment): boolean {
  return (
    new Date(`${appointment.date}T${appointment.startTime}:00`) > new Date()
  );
}

function statusStyle(status: AppointmentStatus): string {
  if (status === "confirmada") return "bg-champagne/60 text-graphite";
  if (status === "completada") return "bg-[#E9EEE3] text-sage-dark";
  if (status === "cancelada") return "bg-[#F7EBE5] text-caramel-dark";
  return "bg-sand text-stone";
}

function Status({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${statusStyle(status)}`}
    >
      {status === "confirmada"
        ? "● "
        : status === "completada"
          ? "✓ "
          : status === "cancelada"
            ? "× "
            : "— "}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AppointmentFacts({
  appointment,
  showServices = true,
}: {
  appointment: ClientAppointment;
  showServices?: boolean;
}) {
  const duration = durationOf(appointment);
  return (
    <>
      <dl className="grid gap-4 text-base sm:grid-cols-2">
        <div>
          <dt className="client-eyebrow">Fecha</dt>
          <dd className="mt-1 font-semibold capitalize">
            {fullDate.format(dateFromKey(appointment.date))}
          </dd>
        </div>
        <div>
          <dt className="client-eyebrow">Horario</dt>
          <dd className="mt-1 font-semibold">
            {appointment.startTime} – {endTime(appointment.startTime, duration)}
          </dd>
        </div>
        <div>
          <dt className="client-eyebrow">Estilista</dt>
          <dd className="mt-1 font-semibold">{appointment.stylistName}</dd>
        </div>
        <div>
          <dt className="client-eyebrow">Referencia</dt>
          <dd className="mt-1 font-semibold">{appointment.id.toUpperCase()}</dd>
        </div>
      </dl>
      {showServices && (
        <div className="mt-6">
          <h3 className="font-display text-xl">Servicios acordados</h3>
          <ul className="mt-3">
            {appointment.services.map((service) => (
              <li
                key={service.serviceId}
                className="flex flex-wrap justify-between gap-2 py-3 text-base"
              >
                <span>
                  <strong className="font-semibold">
                    {service.serviceName}
                  </strong>
                  <span className="ml-2 text-stone">
                    {service.agreedDuration} min
                  </span>
                </span>
                <strong>{money.format(service.agreedPrice)}</strong>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between gap-3 text-base">
            <span>Duración total</span>
            <strong>{duration} min</strong>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Precio total acordado</span>
            <strong>{money.format(priceOf(appointment))}</strong>
          </div>
          <p className="mt-3 text-base text-stone">
            El importe acordado corresponde a la reserva; no indica un pago
            realizado.
          </p>
        </div>
      )}
    </>
  );
}

interface Props {
  accounts: DemoClientIdentity[];
  accountsLoading: boolean;
  accountsError: string;
  accountId: string;
  onRetryAccounts: () => void;
  initialAppointmentId?: string;
}

export function MyAppointmentsPage({
  accounts,
  accountsLoading,
  accountsError,
  accountId,
  onRetryAccounts,
  initialAppointmentId,
}: Props) {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(accountId));
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  const [view, setView] = useState<View>("proximas");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "todos">(
    "todos",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModalMode>("detalle");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    getClientAppointments(accountId)
      .then((items) => {
        if (!active) return;
        setAppointments(items);
        setLoading(false);
        setError("");
        if (
          initialAppointmentId &&
          items.some((item) => item.id === initialAppointmentId)
        )
          setSelectedId(initialAppointmentId);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar tus citas.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [accountId, request, initialAppointmentId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selectedId && dialog && !dialog.open) dialog.showModal();
    if (!selectedId && dialog?.open) dialog.close();
  }, [selectedId]);

  const selected = appointments.find((item) => item.id === selectedId);
  const client = accounts.find((item) => item.id === accountId);
  const shown = (
    view === "proximas"
      ? appointments.filter(
          (item) => item.status === "confirmada" && isFuture(item),
        )
      : appointments.filter(
          (item) => statusFilter === "todos" || item.status === statusFilter,
        )
  ).sort((a, b) =>
    view === "proximas"
      ? `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
      : `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
  );
  const issue =
    selected && mode === "reprogramar"
      ? getClientRescheduleIssue(selected.id, accountId)
      : null;
  const availableTimes =
    selected && mode === "reprogramar" && !issue
      ? getClientRescheduleStartTimes(selected.id, date, accountId)
      : [];
  const validStartTime = availableTimes.includes(startTime) ? startTime : "";

  function retry() {
    setAppointments([]);
    setLoading(true);
    setError("");
    setRequest((current) => current + 1);
  }
  function closeDialog() {
    if (savingRef.current) return;
    setSelectedId(null);
    setMode("detalle");
    setFormError("");
    setErrorField("");
  }
  function openDetail(appointment: ClientAppointment) {
    setSelectedId(appointment.id);
    setMode("detalle");
    setFormError("");
    setNotice("");
  }
  function openMode(next: ModalMode) {
    if (!selected) return;
    setDate(selected.date);
    setStartTime(selected.startTime);
    setReason("");
    setFormError("");
    setErrorField("");
    setMode(next);
  }

  async function submitReschedule() {
    if (!selected || savingRef.current) return;
    setFormError("");
    setErrorField("");
    if (issue) {
      setFormError(issue);
      return;
    }
    if (selected.date === date && selected.startTime === startTime) {
      setFormError("Elige un horario diferente antes de guardar.");
      setErrorField("startTime");
      return;
    }
    if (!validStartTime) {
      setFormError("Elige una hora disponible.");
      setErrorField("startTime");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await rescheduleClientAppointment(
        selected.id,
        date,
        validStartTime,
        accountId,
      );
      setAppointments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMode("detalle");
      setNotice("La cita se reprogramó correctamente.");
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : "No se pudo reprogramar la cita.",
      );
      setErrorField(
        cause instanceof AgendaOperationError ? (cause.field ?? "") : "",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function submitCancel() {
    if (!selected || savingRef.current) return;
    setFormError("");
    setErrorField("");
    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await cancelClientAppointment(
        selected.id,
        reason,
        accountId,
      );
      setAppointments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMode("detalle");
      setNotice("La cita se canceló correctamente.");
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "No se pudo cancelar la cita.",
      );
      setErrorField(
        cause instanceof AgendaOperationError ? (cause.field ?? "") : "",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <main
      id="contenido"
      className="client-simple-page client-container max-w-[1120px] py-12 sm:py-18"
    >
      <div className="mb-10 rounded-[24px] bg-black p-8 text-white sm:p-12">
        <h1 className="font-display text-4xl sm:text-5xl">Mis citas</h1>
        <p className="mt-4 max-w-[55ch] text-white/85">
          Consulta tus reservas y gestiona las citas confirmadas que aún no han
          comenzado.
        </p>
      </div>
      {accountsLoading && (
        <p
          role="status"
          className="rounded-[16px] bg-white p-6 text-base text-stone"
        >
          Cargando clientes de demostración…
        </p>
      )}
      {accountsError && (
        <div role="alert" className="rounded-[16px] bg-white p-6 text-base">
          <p className="text-caramel-dark">{accountsError}</p>
          <button
            type="button"
            className="client-text-link mt-3"
            onClick={onRetryAccounts}
          >
            Reintentar
          </button>
        </div>
      )}
      {!accountsLoading && !accountsError && !accounts.length && (
        <p
          role="status"
          className="rounded-[16px] bg-white p-6 text-base text-stone"
        >
          No hay clientes de demostración disponibles.
        </p>
      )}
      {!accountsLoading && !accountsError && accounts.length > 0 && (
        <>
          {!client ? (
            <p
              role="status"
              className="rounded-[16px] bg-white p-6 text-base text-stone"
            >
              Selecciona un cliente de demostración para consultar sus citas.
            </p>
          ) : (
            <>
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div
                  role="tablist"
                  aria-label="Vistas de citas"
                  className="flex rounded-full bg-sand p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={view === "proximas"}
                    className={`rounded-full px-5 py-2 text-base font-semibold ${view === "proximas" ? "bg-champagne text-graphite" : "text-stone hover:text-graphite"}`}
                    onClick={() => setView("proximas")}
                  >
                    Próximas
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={view === "todas"}
                    className={`rounded-full px-5 py-2 text-base font-semibold ${view === "todas" ? "bg-champagne text-graphite" : "text-stone hover:text-graphite"}`}
                    onClick={() => setView("todas")}
                  >
                    Todas
                  </button>
                </div>
                {view === "todas" && (
                  <label className="flex items-center gap-3 text-base font-semibold">
                    Estado{" "}
                    <select
                      className="client-search min-w-40"
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as AppointmentStatus | "todos",
                        )
                      }
                    >
                      <option value="todos">Todos</option>
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {loading && (
                <p
                  role="status"
                  className="rounded-[16px] bg-white p-6 text-base text-stone"
                >
                  Cargando tus citas…
                </p>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-[16px] bg-white p-6 text-base"
                >
                  <p className="text-caramel-dark">{error}</p>
                  <button
                    type="button"
                    className="client-text-link mt-3"
                    onClick={retry}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!loading && !error && !shown.length && (
                <div
                  role="status"
                  className="rounded-[16px] bg-white p-8 text-center"
                >
                  <p className="font-display text-2xl">
                    {view === "proximas"
                      ? "No tienes próximas citas."
                      : appointments.length
                        ? "No hay citas con este estado."
                        : "Aún no tienes citas."}
                  </p>
                  {view === "proximas" && (
                    <a href="#reservar" className="client-primary mt-5">
                      Reservar cita
                    </a>
                  )}
                </div>
              )}
              {!loading && !error && shown.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {shown.map((appointment) => (
                    <article
                      key={appointment.id}
                      className="rounded-[24px] bg-white p-6 shadow-card sm:p-8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="client-eyebrow">
                            {appointment.id.toUpperCase()}
                          </p>
                          <h2 className="mt-2 font-display text-2xl capitalize">
                            {fullDate.format(dateFromKey(appointment.date))}
                          </h2>
                        </div>
                        <Status status={appointment.status} />
                      </div>
                      <p className="mt-3 text-base font-semibold">
                        {appointment.startTime} –{" "}
                        {endTime(
                          appointment.startTime,
                          durationOf(appointment),
                        )}{" "}
                        · {appointment.stylistName}
                      </p>
                      <p className="mt-3 text-base text-stone">
                        {appointment.services
                          .map((service) => service.serviceName)
                          .join(" · ")}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4">
                        <span className="text-base">
                          Precio acordado{" "}
                          <strong>{money.format(priceOf(appointment))}</strong>
                        </span>
                        <button
                          type="button"
                          className="client-text-link"
                          onClick={() => openDetail(appointment)}
                        >
                          Ver detalle →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (savingRef.current) event.preventDefault();
          else closeDialog();
        }}
        onClose={closeDialog}
        className="m-auto max-h-[90vh] w-[min(100%-2rem,760px)] overflow-y-auto rounded-[18px] bg-white p-0 text-graphite shadow-2xl backdrop:bg-graphite/55"
      >
        {selected && (
          <div className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="client-eyebrow">
                  {mode === "detalle"
                    ? "Detalle de la cita"
                    : mode === "reprogramar"
                      ? "Cambiar horario"
                      : "Confirmar cancelación"}
                </p>
                <h2 className="mt-2 font-display text-3xl">
                  Cita {selected.id.toUpperCase()}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xl hover:bg-ivory"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeDialog}
              >
                ×
              </button>
            </div>
            {notice && mode === "detalle" && (
              <p
                role="status"
                className="mt-5 rounded-[12px] bg-[#E9EEE3] p-3 text-base text-sage-dark"
              >
                {notice}
              </p>
            )}
            <div className="mt-6">
              <Status status={selected.status} />
            </div>
            <div className="mt-6">
              <AppointmentFacts appointment={selected} />
            </div>
            {mode === "detalle" && (
              <>
                {selected.notes && (
                  <div className="mt-6 rounded-[12px] bg-ivory p-4 text-base">
                    <h3 className="font-semibold">
                      Observaciones de la reserva
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-stone">
                      {selected.notes}
                    </p>
                  </div>
                )}
                {selected.status === "cancelada" &&
                  selected.cancellationReason && (
                    <div className="mt-6 rounded-[12px] bg-[#F7EBE5] p-4 text-base">
                      <h3 className="font-semibold text-caramel-dark">
                        Motivo de cancelación
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap">
                        {selected.cancellationReason}
                      </p>
                    </div>
                  )}
                {selected.status === "confirmada" && isFuture(selected) && (
                  <div className="mt-7 flex flex-wrap gap-3 pt-6">
                    <button
                      type="button"
                      className="client-primary"
                      onClick={() => openMode("reprogramar")}
                    >
                      Reprogramar
                    </button>
                    <button
                      type="button"
                      className="client-secondary"
                      onClick={() => openMode("cancelar")}
                    >
                      Cancelar cita
                    </button>
                  </div>
                )}
              </>
            )}
            {mode === "reprogramar" && (
              <div className="mt-7 pt-6">
                <h3 className="font-display text-2xl">
                  Elige un nuevo horario
                </h3>
                <p className="mt-2 text-base text-stone">
                  Horario actual: {fullDate.format(dateFromKey(selected.date))},{" "}
                  {selected.startTime} –{" "}
                  {endTime(selected.startTime, durationOf(selected))}. Se
                  conservan la estilista y los servicios acordados.
                </p>
                {issue ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-[12px] bg-[#F7EBE5] p-4 text-base text-caramel-dark"
                  >
                    {issue}
                  </p>
                ) : (
                  <>
                    <label
                      htmlFor="client-reschedule-date"
                      className="mt-5 block text-base font-semibold"
                    >
                      Nueva fecha *
                    </label>
                    <input
                      id="client-reschedule-date"
                      type="date"
                      min={dateKey(new Date())}
                      className="client-search mt-2 max-w-[330px]"
                      value={date}
                      aria-invalid={errorField === "date"}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setStartTime("");
                        setFormError("");
                        setErrorField("");
                      }}
                    />
                    {date && dateFromKey(date).getDay() === 0 && (
                      <p className="mt-2 text-base text-caramel-dark">
                        El estudio no atiende los domingos.
                      </p>
                    )}
                    {!availableTimes.length && (
                      <p
                        role="status"
                        className="mt-5 rounded-[12px] bg-sand p-4 text-base text-stone"
                      >
                        No hay horarios disponibles para esta fecha. Prueba otro
                        día.
                      </p>
                    )}
                    {availableTimes.length > 0 && (
                      <fieldset className="mt-6">
                        <legend className="text-base font-semibold">
                          Horas disponibles · {durationOf(selected)} min
                        </legend>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {availableTimes.map((time) => (
                            <button
                              key={time}
                              type="button"
                              aria-pressed={startTime === time}
                              className={`rounded-[10px] px-3 py-3 text-left text-base transition hover:bg-champagne/60 focus-visible:outline-2 focus-visible:outline-gold ${startTime === time ? "bg-champagne" : "bg-ivory"}`}
                              onClick={() => {
                                setStartTime(time);
                                setFormError("");
                                setErrorField("");
                              }}
                            >
                              <strong className="block">{time}</strong>
                              <span className="text-base text-stone">
                                hasta {endTime(time, durationOf(selected))}
                              </span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {validStartTime && (
                      <p className="mt-5 rounded-[12px] bg-champagne/35 p-4 text-base">
                        <strong>Nuevo horario:</strong>{" "}
                        {fullDate.format(dateFromKey(date))}, {validStartTime} –{" "}
                        {endTime(validStartTime, durationOf(selected))}
                      </p>
                    )}
                  </>
                )}
                {formError && (
                  <p role="alert" className="mt-5 text-base text-caramel-dark">
                    {formError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="client-secondary"
                    disabled={saving}
                    onClick={() => setMode("detalle")}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="client-primary disabled:opacity-50"
                    disabled={
                      saving ||
                      !!issue ||
                      !validStartTime ||
                      (selected.date === date &&
                        selected.startTime === startTime)
                    }
                    onClick={submitReschedule}
                  >
                    {saving ? "Guardando…" : "Confirmar nuevo horario"}
                  </button>
                </div>
              </div>
            )}
            {mode === "cancelar" && (
              <div className="mt-7 pt-6">
                <h3 className="font-display text-2xl">¿Cancelar esta cita?</h3>
                <p className="mt-2 text-base text-stone">
                  Se cancelará la cita {selected.id.toUpperCase()} de{" "}
                  {client?.name}, con {selected.stylistName}, el{" "}
                  {fullDate.format(dateFromKey(selected.date))} de{" "}
                  {selected.startTime} a{" "}
                  {endTime(selected.startTime, durationOf(selected))}.
                  Servicios:{" "}
                  {selected.services
                    .map((service) => service.serviceName)
                    .join(", ")}
                  .
                </p>
                <label
                  htmlFor="client-cancel-reason"
                  className="mt-5 block text-base font-semibold"
                >
                  Motivo (opcional)
                </label>
                <textarea
                  id="client-cancel-reason"
                  className="client-search mt-2 min-h-24 resize-y"
                  maxLength={500}
                  value={reason}
                  aria-invalid={errorField === "reason"}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setFormError("");
                    setErrorField("");
                  }}
                />
                {formError && (
                  <p role="alert" className="mt-3 text-base text-caramel-dark">
                    {formError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="client-secondary"
                    disabled={saving}
                    onClick={() => setMode("detalle")}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="client-primary disabled:opacity-50"
                    disabled={saving}
                    onClick={submitCancel}
                  >
                    {saving ? "Cancelando…" : "Confirmar cancelación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </main>
  );
}
