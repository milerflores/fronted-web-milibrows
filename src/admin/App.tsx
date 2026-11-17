import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  dateFromKey,
  dateKey,
  endTime,
  startOfWeek,
  timeToMinutes,
} from "../shared/agenda/dates";
import { getAgendaData } from "../shared/agenda/mockAgendaService";
import { getSession, signOut } from "../shared/agenda/mockAuthService";
import type { Session } from "../shared/agenda/mockAuthService";
import { appUrl } from "../shared/appUrls";
import { SignInForm } from "../shared/components/SignInForm";
import type {
  AgendaData,
  Appointment,
  AppointmentStatus,
  Client,
  ClientRecordResult,
  CreatedAppointment,
  DemoActor,
} from "../shared/agenda/types";
import { AppointmentDialog } from "./components/AppointmentDialog";
import { AttendanceActionDialog } from "./components/AttendanceActionDialog";
import type { AttendanceAction } from "./components/AttendanceActionDialog";
import { CancelAppointmentDialog } from "./components/CancelAppointmentDialog";
import { CatalogPage } from "./components/CatalogPage";
import { ClientEditorDialog } from "./components/ClientEditorDialog";
import { ClientProfileDialog } from "./components/ClientProfileDialog";
import { ClientsPage } from "./components/ClientsPage";
import { Icon } from "./components/Icon";
import { NewAppointmentDialog } from "./components/NewAppointmentDialog";
import { RescheduleDialog } from "./components/RescheduleDialog";
import { StatusBadge } from "./components/StatusBadge";
import logo from "../assets/images/logo/logo.png";

type DemoRole = "administrador" | "recepcionista" | "estilista";
type StatusFilter = AppointmentStatus | "todas";
type PanelView = "agenda" | "clientes" | "servicios" | "estilistas";

function readAdminRoute(): PanelView | "login" | "no-encontrada" {
  const route = window.location.hash.replace(/^#/, "");
  if (!route || route === "entrada") return "login";
  if (
    route === "login" ||
    route === "agenda" ||
    route === "clientes" ||
    route === "servicios" ||
    route === "estilistas"
  )
    return route;
  return "no-encontrada";
}

function canOpen(route: string, session: Session): boolean {
  if (session.role === "cliente") return false;
  return (
    route === "agenda" ||
    (route === "clientes" && session.role !== "estilista") ||
    ((route === "servicios" || route === "estilistas") &&
      session.role === "administrador")
  );
}

function isPanelRoute(
  route: ReturnType<typeof readAdminRoute>,
): route is PanelView {
  return (
    route === "agenda" ||
    route === "clientes" ||
    route === "servicios" ||
    route === "estilistas"
  );
}

function navigatePanel(next: PanelView) {
  window.location.hash = next;
}

const navigation: {
  view: PanelView;
  label: string;
  icon: "calendar" | "user" | "sparkle";
}[] = [
  { view: "agenda", label: "Agenda", icon: "calendar" },
  { view: "clientes", label: "Clientes", icon: "user" },
  { view: "servicios", label: "Servicios", icon: "sparkle" },
  { view: "estilistas", label: "Estilistas", icon: "user" },
];

const mobileDateLabel = new Intl.DateTimeFormat("es-PE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const monthLabel = new Intl.DateTimeFormat("es-PE", { month: "short" });
const weekdayLabel = new Intl.DateTimeFormat("es-PE", { weekday: "short" });
const hours = Array.from({ length: 13 }, (_, index) => index + 10);
const dayHeight = 12 * 64 + 16;

const cardClasses: Record<AppointmentStatus, string> = {
  confirmada: "appointment-card--confirmed",
  completada: "appointment-card--completed",
  cancelada: "appointment-card--cancelled",
  "no asistió": "appointment-card--missed",
};

function durationOf(appointment: Appointment): number {
  return appointment.services.reduce(
    (total, service) => total + service.agreedDuration,
    0,
  );
}

function layoutDayAppointments(items: Appointment[]) {
  const groups: Appointment[][] = [];
  let groupEnd = 0;
  for (const item of items) {
    const start = timeToMinutes(item.startTime);
    if (!groups.length || start >= groupEnd) {
      groups.push([item]);
      groupEnd = start + durationOf(item);
    } else {
      groups[groups.length - 1].push(item);
      groupEnd = Math.max(groupEnd, start + durationOf(item));
    }
  }
  return groups.flatMap((group) => {
    const columnEnds: number[] = [];
    const placements = group.map((appointment) => {
      const start = timeToMinutes(appointment.startTime);
      let column = columnEnds.findIndex((end) => end <= start);
      if (column < 0) {
        column = columnEnds.length;
        columnEnds.push(0);
      }
      columnEnds[column] = start + durationOf(appointment);
      return { appointment, column };
    });
    return placements.map(({ appointment, column }) => ({
      appointment,
      left: (column * 100) / columnEnds.length,
      width: 100 / columnEnds.length,
    }));
  });
}

function weekLabel(start: Date): string {
  const end = addDays(start, 5);
  return `${start.getDate()} ${monthLabel.format(start)} – ${end.getDate()} ${monthLabel.format(end)} ${end.getFullYear()}`;
}

interface AppointmentCardProps {
  appointment: Appointment;
  data: AgendaData;
  onSelect: (appointment: Appointment) => void;
  compact?: boolean;
  left?: number;
  width?: number;
}

function AppointmentCard({
  appointment,
  data,
  onSelect,
  compact = false,
  left = 0,
  width = 100,
}: AppointmentCardProps) {
  const client = data.clients.find((item) => item.id === appointment.clientId);
  const stylist = data.stylists.find(
    (item) => item.id === appointment.stylistId,
  );
  const firstService = appointment.services[0];
  const duration = durationOf(appointment);

  if (compact) {
    return (
      <button
        type="button"
        className={`appointment-card absolute overflow-hidden text-left ${cardClasses[appointment.status]}`}
        style={{
          top: ((timeToMinutes(appointment.startTime) - 600) / 60) * 64 + 3,
          height: (duration / 60) * 64 - 6,
          left: `calc(${left}% + 5px)`,
          width: `calc(${width}% - 10px)`,
        }}
        onClick={() => onSelect(appointment)}
        aria-label={`${appointment.startTime}, ${client?.name}, ${appointment.status}, ${duration} minutos`}
        title={`${client?.name} · ${firstService?.serviceName} · ${stylist?.name}`}
      >
        <span className="block truncate text-base font-semibold leading-tight">
          {appointment.startTime} · {client?.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full items-start justify-between gap-4 rounded-card border border-line bg-white p-4 text-left shadow-card transition hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      onClick={() => onSelect(appointment)}
    >
      <div className="flex min-w-0 gap-3">
        <div className="shrink-0 border-r border-line pr-3 text-sm font-semibold text-graphite">
          {appointment.startTime}
          <span className="mt-1 block text-xs font-normal text-stone">
            {endTime(appointment.startTime, duration)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{client?.name}</p>
          <p className="mt-1 text-sm text-stone">
            {firstService?.serviceName}
            {appointment.services.length > 1
              ? ` y ${appointment.services.length - 1} más`
              : ""}{" "}
            · {duration} min
          </p>
          <p className="mt-1 text-xs text-stone">{stylist?.name}</p>
        </div>
      </div>
      <StatusBadge status={appointment.status} />
    </button>
  );
}

function AdminWorkspace({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const role = session.role as DemoRole;
  const representedStylist = session.stylistId ?? "";
  const [view, setView] = useState<PanelView>(
    () => readAdminRoute() as PanelView,
  );
  const [stylistFilter, setStylistFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState(() =>
    Math.min((new Date().getDay() + 6) % 7, 5),
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [createdAppointment, setCreatedAppointment] =
    useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] =
    useState<Appointment | null>(null);
  const [attendanceAction, setAttendanceAction] = useState<{
    appointment: Appointment;
    action: AttendanceAction;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [clientNotice, setClientNotice] = useState<string | null>(null);
  const [clientProfileRequest, setClientProfileRequest] = useState<{
    clientId: string;
    sourceAppointmentId?: string;
  } | null>(null);
  const [editingClient, setEditingClient] = useState<Client | "new" | null>(
    null,
  );
  const [bookingClientId, setBookingClientId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAgendaData()
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const next = readAdminRoute();
      if (
        next === "agenda" ||
        (next === "clientes" && role !== "estilista") ||
        ((next === "servicios" || next === "estilistas") &&
          role === "administrador")
      ) {
        setView(next);
        setSelectedAppointment(null);
        setClientProfileRequest(null);
        setEditingClient(null);
        setNewAppointmentOpen(false);
      } else if (next !== "login" && next !== "no-encontrada")
        window.location.hash = "agenda";
    };
    window.addEventListener("hashchange", update);
    update();
    return () => window.removeEventListener("hashchange", update);
  }, [role]);

  function retry() {
    setError(false);
    setLoading(true);
    getAgendaData()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }

  function moveDay(direction: number) {
    const nextDay = activeDay + direction;
    if (nextDay < 0) {
      setWeekStart(addDays(weekStart, -7));
      setActiveDay(5);
    } else if (nextDay > 5) {
      setWeekStart(addDays(weekStart, 7));
      setActiveDay(0);
    } else setActiveDay(nextDay);
  }

  function goToday() {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setActiveDay(Math.min((now.getDay() + 6) % 7, 5));
  }

  function handleCreated(result: CreatedAppointment) {
    const savedDate = dateFromKey(result.appointment.date);
    setData(result.data);
    setWeekStart(startOfWeek(savedDate));
    setActiveDay((savedDate.getDay() + 6) % 7);
    setStylistFilter("todas");
    setStatusFilter("todas");
    setCreatedAppointment(result.appointment);
    setNewAppointmentOpen(false);
    if (bookingClientId) {
      setBookingClientId(null);
      navigatePanel("clientes");
      setClientProfileRequest({ clientId: result.appointment.clientId });
      setClientNotice("Cita confirmada para esta cliente.");
      return;
    }
    requestAnimationFrame(() =>
      document
        .getElementById("agenda")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function handleRescheduled(result: CreatedAppointment) {
    const savedDate = dateFromKey(result.appointment.date);
    setData(result.data);
    setWeekStart(startOfWeek(savedDate));
    setActiveDay((savedDate.getDay() + 6) % 7);
    setStylistFilter((current) =>
      current === "todas" ? current : result.appointment.stylistId,
    );
    setEditingAppointment(null);
    setCreatedAppointment(null);
    setActionNotice("Cita reprogramada correctamente.");
    setSelectedAppointment(result.appointment);
  }

  function handleCancelled(result: CreatedAppointment) {
    setData(result.data);
    setCancellingAppointment(null);
    setCreatedAppointment(null);
    setActionNotice("Cita cancelada. El horario quedó disponible.");
    setSelectedAppointment(result.appointment);
  }

  function handleAttendanceUpdated(
    result: CreatedAppointment,
    action: AttendanceAction,
  ) {
    setData(result.data);
    setAttendanceAction(null);
    setCreatedAppointment(null);
    setActionNotice(
      action === "complete"
        ? "Atención completada correctamente."
        : "Inasistencia registrada correctamente.",
    );
    setSelectedAppointment(result.appointment);
  }

  function handleClientSaved(result: ClientRecordResult) {
    setData(result.data);
    setEditingClient(null);
    setClientNotice(`Datos de ${result.client.name} guardados correctamente.`);
    setClientProfileRequest({ clientId: result.client.id });
    navigatePanel("clientes");
  }

  function handleCatalogData(nextData: AgendaData) {
    setData(nextData);
  }

  function openClientFromAppointment(appointment: Appointment) {
    setSelectedAppointment(null);
    setActionNotice(null);
    setClientProfileRequest({
      clientId: appointment.clientId,
      sourceAppointmentId: appointment.id,
    });
  }

  const days = Array.from({ length: 6 }, (_, index) =>
    addDays(weekStart, index),
  );
  const weekStartKey = dateKey(weekStart);
  const weekEndKey = dateKey(days[5]);
  const appointments = (data?.appointments ?? [])
    .filter(
      (item) =>
        item.date >= weekStartKey &&
        item.date <= weekEndKey &&
        (role !== "estilista"
          ? stylistFilter === "todas" || item.stylistId === stylistFilter
          : item.stylistId === representedStylist) &&
        (statusFilter === "todas" || item.status === statusFilter),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  const profileName = session.name;
  const actor = useMemo<DemoActor>(
    () =>
      role === "estilista" ? { role, stylistId: representedStylist } : { role },
    [role, representedStylist],
  );
  const visibleNavigation = navigation.filter(
    (item) =>
      item.view === "agenda" ||
      (role !== "estilista" &&
        (item.view === "clientes" || role === "administrador")),
  );
  const todayKey = dateKey(new Date());
  const todayCount = (data?.appointments ?? []).filter(
    (item) =>
      item.date === todayKey &&
      item.status !== "cancelada" &&
      (role !== "estilista" || item.stylistId === representedStylist),
  ).length;

  return (
    <div className="admin-workspace min-h-screen bg-white font-sans text-black">
      <header className="admin-main-header bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 xl:px-10">
          <button
            type="button"
            aria-label="Ir a la agenda"
            onClick={() => navigatePanel("agenda")}
            className="inline-flex shrink-0 items-center rounded-[12px] focus-visible:outline-2 focus-visible:outline-gold"
          >
            <img src={logo} alt="" className="h-auto w-[110px] sm:w-[150px]" />
          </button>
          <nav
            aria-label="Secciones del panel"
            className="order-3 w-full overflow-x-auto lg:order-2 lg:w-auto lg:min-w-0 lg:flex-1"
          >
            <div className="mx-auto flex w-max items-center gap-2">
              {visibleNavigation.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  aria-current={view === item.view ? "page" : undefined}
                  onClick={() => navigatePanel(item.view)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition ${view === item.view ? "bg-black text-white" : "bg-sand text-black hover:bg-champagne"}`}
                >
                  <Icon
                    name={item.icon}
                    className={`size-[18px] ${view === item.view ? "text-champagne" : "text-caramel-dark"}`}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="order-2 flex shrink-0 flex-wrap items-center gap-4 lg:order-3">
            <div className="hidden text-base sm:block">
              <strong className="block">{profileName}</strong>
              <span className="text-base text-stone">
                {role === "administrador"
                  ? "Administrador"
                  : role === "recepcionista"
                    ? "Recepcionista"
                    : "Estilista"}
              </span>
            </div>
            <button
              type="button"
              className="admin-logout rounded-full bg-white px-4 py-2.5 text-base font-semibold text-black hover:bg-sand sm:px-5"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {view === "agenda" ? (
        <main
          id="agenda"
          className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 xl:px-10"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-[28px] leading-tight sm:text-[32px]">
                Agenda de esta semana
              </h2>
            </div>
            {data && (
              <div className="summary-card admin-today-stat">
                <span className="summary-icon bg-black text-white">
                  <Icon name="calendar" className="size-5" />
                </span>
                <div className="flex gap-4 items-center">
                  <p className="summary-label">Citas de hoy</p>
                  <p className="summary-value">{todayCount}</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-stone">
                {role === "estilista"
                  ? `Agenda de ${profileName}`
                  : "Todas las estilistas"}
              </div>
              {role !== "estilista" && data && (
                <button
                  type="button"
                  className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-graphite shadow-card transition hover:bg-[#D7B65F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  onClick={() => {
                    setCreatedAppointment(null);
                    setBookingClientId(null);
                    setNewAppointmentOpen(true);
                  }}
                >
                  + Nueva cita
                </button>
              )}
            </div>
          </div>

          {createdAppointment && (
            <div
              role="status"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#CFD5C6] bg-[#F0F3EA] px-4 py-3 text-sm text-sage-dark"
            >
              <span>
                <strong>Cita confirmada.</strong> Ya aparece en la agenda de la
                semana seleccionada.
              </span>
              <button
                type="button"
                className="font-semibold underline underline-offset-2 hover:text-graphite"
                onClick={() => setSelectedAppointment(createdAppointment)}
              >
                Ver detalle
              </button>
            </div>
          )}

          <section
            aria-label="Calendario de citas"
            className="admin-agenda-calendar overflow-hidden rounded-[24px] bg-sand shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Semana anterior"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                >
                  <Icon name="chevron-left" />
                </button>
                <h3 className="min-w-[140px] text-center text-xs font-semibold sm:min-w-[215px] sm:text-base">
                  {weekLabel(weekStart)}
                </h3>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Semana siguiente"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
                  <Icon name="chevron-right" />
                </button>
                <button
                  type="button"
                  className="ml-1 rounded-lg border border-line px-3 py-2 text-xs font-semibold transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-gold"
                  onClick={goToday}
                >
                  Hoy
                </button>
              </div>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                {role !== "estilista" && (
                  <label className="control-label">
                    Estilista
                    <select
                      className="control-select min-w-[160px]"
                      value={stylistFilter}
                      onChange={(event) => setStylistFilter(event.target.value)}
                    >
                      <option value="todas">Todas</option>
                      {data?.stylists.map((stylist) => (
                        <option key={stylist.id} value={stylist.id}>
                          {stylist.name}
                          {!stylist.active ? " · Inactiva" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="control-label">
                  Estado
                  <select
                    className="control-select min-w-[145px]"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                  >
                    <option value="todas">Todos</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="no asistió">No asistió</option>
                  </select>
                </label>
              </div>
            </div>

            {loading && (
              <div
                role="status"
                className="grid min-h-[350px] place-items-center p-8 text-center"
              >
                <div>
                  <div className="mx-auto mb-4 size-8 animate-pulse rounded-full bg-gold/70" />
                  <p className="text-sm text-stone">Cargando agenda…</p>
                </div>
              </div>
            )}
            {!loading && error && (
              <div
                role="alert"
                className="grid min-h-[350px] place-items-center p-8 text-center"
              >
                <div>
                  <p className="font-semibold">No pudimos cargar la agenda.</p>
                  <p className="mt-2 text-sm text-stone">Intenta de nuevo.</p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-graphite"
                    onClick={retry}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
            {!loading && !error && data && (
              <>
                {appointments.length === 0 && (
                  <div
                    role="status"
                    className="border-b border-line bg-ivory px-6 py-4 text-sm text-stone"
                  >
                    No hay citas para esta semana con los filtros seleccionados.
                  </div>
                )}
                <div className="hidden overflow-x-auto lg:block">
                  <div className="min-w-[1080px]">
                    <div className="calendar-columns grid border-b border-line bg-[#FCFBF9]">
                      <div className="border-r border-line px-3 py-4 text-xs font-medium text-stone">
                        Hora
                      </div>
                      {days.map((day) => (
                        <div
                          key={dateKey(day)}
                          className="border-r border-line px-3 py-3 text-center last:border-r-0"
                        >
                          <span className="block text-[11px] font-semibold tracking-[.1em] text-stone uppercase">
                            {weekdayLabel.format(day).replace(".", "")}
                          </span>
                          <span
                            className={`mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${dateKey(day) === todayKey ? "bg-champagne text-graphite" : ""}`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="calendar-columns grid">
                      <div
                        className="relative border-r border-line"
                        style={{ height: dayHeight }}
                      >
                        {hours.map((hour) => (
                          <span
                            key={hour}
                            className="absolute right-3 -translate-y-1/2 text-[11px] text-stone"
                            style={{ top: (hour - 10) * 64 }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </span>
                        ))}
                      </div>
                      {days.map((day) => (
                        <div
                          key={dateKey(day)}
                          className={`day-lane relative border-r border-line last:border-r-0 ${dateKey(day) === todayKey ? "day-lane--today" : ""}`}
                          style={{ height: dayHeight }}
                        >
                          {layoutDayAppointments(
                            appointments.filter(
                              (item) => item.date === dateKey(day),
                            ),
                          ).map(({ appointment, left, width }) => (
                            <AppointmentCard
                              key={appointment.id}
                              compact
                              appointment={appointment}
                              data={data}
                              left={left}
                              width={width}
                              onSelect={setSelectedAppointment}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:hidden">
                  <div className="flex items-center justify-between border-b border-line bg-[#FCFBF9] px-4 py-3">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Día anterior"
                      onClick={() => moveDay(-1)}
                    >
                      <Icon name="chevron-left" />
                    </button>
                    <p className="text-sm font-semibold">
                      {mobileDateLabel.format(days[activeDay])}
                    </p>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Día siguiente"
                      onClick={() => moveDay(1)}
                    >
                      <Icon name="chevron-right" />
                    </button>
                  </div>
                  <div className="min-h-[180px] space-y-3 bg-ivory/60 p-4">
                    {appointments
                      .filter((item) => item.date === dateKey(days[activeDay]))
                      .map((item) => (
                        <AppointmentCard
                          key={item.id}
                          appointment={item}
                          data={data}
                          onSelect={setSelectedAppointment}
                        />
                      ))}
                    {appointments.every(
                      (item) => item.date !== dateKey(days[activeDay]),
                    ) && (
                      <div className="rounded-card border border-dashed border-line bg-white px-5 py-10 text-center text-sm text-stone">
                        No hay citas para este día.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      ) : view === "clientes" && role !== "estilista" ? (
        <ClientsPage
          actor={actor}
          data={data}
          notice={clientNotice}
          onOpen={(client) => {
            setClientNotice(null);
            setClientProfileRequest({ clientId: client.id });
          }}
          onEdit={(client) => {
            setClientNotice(null);
            setEditingClient(client);
          }}
          onNew={() => {
            setClientNotice(null);
            setEditingClient("new");
          }}
        />
      ) : role === "administrador" &&
        (view === "servicios" || view === "estilistas") ? (
        <CatalogPage
          key={view}
          kind={view === "servicios" ? "service" : "stylist"}
          actor={actor}
          data={data}
          onData={handleCatalogData}
        />
      ) : null}
      <AppointmentDialog
        appointment={selectedAppointment}
        data={data}
        actor={actor}
        notice={actionNotice}
        onClose={() => {
          setSelectedAppointment(null);
          setActionNotice(null);
        }}
        onReschedule={(appointment) => {
          setSelectedAppointment(null);
          setActionNotice(null);
          setEditingAppointment(appointment);
        }}
        onCancel={(appointment) => {
          setSelectedAppointment(null);
          setActionNotice(null);
          setCancellingAppointment(appointment);
        }}
        onComplete={(appointment) => {
          setSelectedAppointment(null);
          setActionNotice(null);
          setAttendanceAction({ appointment, action: "complete" });
        }}
        onNoShow={(appointment) => {
          setSelectedAppointment(null);
          setActionNotice(null);
          setAttendanceAction({ appointment, action: "noShow" });
        }}
        onOpenClient={openClientFromAppointment}
      />
      {newAppointmentOpen && data && (
        <NewAppointmentDialog
          data={data}
          preferredDate={dateKey(days[activeDay])}
          preferredClientId={bookingClientId ?? undefined}
          actor={actor}
          onClose={() => {
            setNewAppointmentOpen(false);
            setBookingClientId(null);
          }}
          onCreated={handleCreated}
        />
      )}
      {editingAppointment && data && (
        <RescheduleDialog
          appointment={editingAppointment}
          data={data}
          actor={actor}
          onClose={() => setEditingAppointment(null)}
          onUpdated={handleRescheduled}
        />
      )}
      {cancellingAppointment && data && (
        <CancelAppointmentDialog
          appointment={cancellingAppointment}
          data={data}
          actor={actor}
          onClose={() => setCancellingAppointment(null)}
          onCancelled={handleCancelled}
        />
      )}
      {attendanceAction && data && (
        <AttendanceActionDialog
          appointment={attendanceAction.appointment}
          data={data}
          actor={actor}
          action={attendanceAction.action}
          onClose={() => setAttendanceAction(null)}
          onUpdated={handleAttendanceUpdated}
        />
      )}
      {clientProfileRequest && data && (
        <ClientProfileDialog
          clientId={clientProfileRequest.clientId}
          sourceAppointmentId={clientProfileRequest.sourceAppointmentId}
          actor={actor}
          data={data}
          onClose={() => setClientProfileRequest(null)}
          onEdit={(client) => {
            setClientProfileRequest(null);
            setEditingClient(client);
          }}
          onBook={(client) => {
            setClientProfileRequest(null);
            setBookingClientId(client.id);
            setNewAppointmentOpen(true);
          }}
          onOpenAppointment={(appointment) => {
            setClientProfileRequest(null);
            setSelectedAppointment(appointment);
            setActionNotice(null);
          }}
        />
      )}
      {editingClient && (
        <ClientEditorDialog
          client={editingClient === "new" ? null : editingClient}
          actor={actor}
          onClose={() => setEditingClient(null)}
          onSaved={handleClientSaved}
        />
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [route, setRoute] = useState(readAdminRoute);
  const [returnTo, setReturnTo] = useState<PanelView | null>(() => {
    const initial = readAdminRoute();
    return !getSession() && isPanelRoute(initial) ? initial : null;
  });

  useEffect(() => {
    const update = () => {
      const next = readAdminRoute();
      if (!getSession() && isPanelRoute(next)) setReturnTo(next);
      setRoute(next);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    if (!session && isPanelRoute(route)) window.location.hash = "login";
    else if (session && route === "login" && readAdminRoute() === route)
      window.location.hash = "agenda";
    else if (session && isPanelRoute(route) && !canOpen(route, session))
      window.location.hash = "agenda";
  }, [route, session]);

  function signedIn(next: Session) {
    setSession(next);
    const destination =
      returnTo && canOpen(returnTo, next) ? returnTo : "agenda";
    setReturnTo(null);
    window.location.hash = destination;
  }

  function logout() {
    signOut();
    setSession(null);
    setReturnTo(null);
    window.location.hash = "login";
  }

  if (session && route !== "no-encontrada" && canOpen(route, session))
    return (
      <AdminWorkspace key={session.id} session={session} onLogout={logout} />
    );
  return (
    <main className="admin-access-page grid min-h-screen place-items-center bg-white px-5 py-12 font-sans text-black sm:px-8">
      <section className="w-full max-w-[480px]">
        <img
          src={logo}
          alt="MiliBrows Studio"
          className="mx-auto h-auto w-[180px] max-w-full"
        />
        {route === "no-encontrada" ? (
          <>
            <h1 className="mt-8 text-center font-display text-3xl leading-tight sm:text-4xl">
              Página no encontrada
            </h1>
            <div className="mt-8 text-center">
              <a
                href={session ? "#agenda" : "#login"}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gold px-7 py-3 text-base font-semibold text-graphite hover:bg-champagne"
              >
                Volver
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-center font-display text-3xl leading-tight sm:text-4xl">
              Ingresa a tu cuenta
            </h1>
            <p className="mt-4 text-center text-base leading-relaxed text-black">
              Ingresa con tu cuenta de administración, recepción o estilista.
            </p>
            <div className="mt-8">
              <SignInForm area="admin" onSignedIn={signedIn} />
            </div>
          </>
        )}
        <div className="mt-7 text-center">
          <a
            href={appUrl("client", "#inicio")}
            className="text-base font-semibold text-black underline underline-offset-4 hover:text-caramel-dark"
          >
            Volver al sitio público
          </a>
        </div>
      </section>
    </main>
  );
}

export default App;
