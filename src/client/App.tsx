import { useEffect, useState } from "react";
import { useApi } from "../shared/api/useApi";
import type { PublicStylistDto, ServiceDto } from "../shared/api/types";
import { mapPublicStylist, mapService } from "../shared/agenda/agendaService";
import { signOut } from "../shared/agenda/authService";
import { useAuth } from "../shared/agenda/useAuth";
import { appUrl } from "../shared/appUrls";
import { Feedback } from "../shared/components/Forms";
import { PasswordRecovery } from "../shared/components/PasswordRecovery";
import { HomePage } from "./pages/HomePage";
import { BookingPage } from "./pages/BookingPage";
import { ClientAccessPage } from "./pages/ClientAccessPage";
import { MyAppointmentsPage } from "./pages/MyAppointmentsPage";
import { MyProfilePage } from "./pages/MyProfilePage";
import logo from "../assets/images/logo/logo.png";

function readRoute() {
  if (window.location.pathname.includes("restablecer-contrasena"))
    return "recuperar";
  return window.location.hash.slice(1) || "inicio";
}

function App() {
  const { session, loading, error: authError } = useAuth();
  const catalog = useApi<ServiceDto[]>("/servicios");
  const team = useApi<PublicStylistDto[]>("/estilistas");
  const [route, setRoute] = useState(readRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingService, setBookingService] = useState(
    () => readRoute().split("/")[1],
  );
  const [bookingKey, setBookingKey] = useState(0);
  const [returnTo, setReturnTo] = useState("mi-perfil");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const page = route.split("/")[0].split("?")[0];
  const home = ["inicio", "servicios", "estilistas"].includes(page);
  const client = session?.role === "cliente";

  useEffect(() => {
    const update = () => {
      const next = readRoute();
      setRoute(next);
      setMenuOpen(false);
      if (next.startsWith("reservar/")) setBookingService(next.split("/")[1]);
      if (["servicios", "estilistas"].includes(next))
        requestAnimationFrame(() =>
          document.getElementById(next)?.scrollIntoView(),
        );
      else window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await signOut();
      setBookingKey((key) => key + 1);
      window.location.hash = "inicio";
    } catch (cause) {
      setLogoutError(
        cause instanceof Error ? cause.message : "No se pudo cerrar sesión.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function requireAuth() {
    setReturnTo("reservar");
    window.location.hash = "login";
  }
  const navigation = [
    { href: "#inicio", label: "Inicio" },
    { href: "#servicios", label: "Servicios" },
    { href: "#reservar", label: "Reservar cita" },
  ];

  return (
    <div
      className={`client-shell flex min-h-screen flex-col bg-ivory font-sans text-graphite ${home ? "client-shell--home" : ""}`}
    >
      <header
        className={`client-header ${home ? "client-header--home absolute inset-x-0 top-0 z-20" : "relative z-20 border-b border-line bg-ivory"}`}
      >
        <div className="client-container flex min-h-[88px] items-center justify-between gap-5 py-4">
          <a
            href="#inicio"
            aria-label="MiliBrows Studio, inicio"
            className="inline-flex shrink-0 items-center"
          >
            <img
              src={logo}
              alt="MiliBrows Studio"
              className="w-[150px] sm:w-[175px]"
            />
          </a>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-7 lg:flex"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={page === item.href.slice(1) ? "page" : undefined}
                className="client-nav-link"
              >
                {item.label}
              </a>
            ))}
            {client && (
              <>
                <a
                  className="client-nav-link"
                  href="#mis-citas"
                  aria-current={page === "mis-citas" ? "page" : undefined}
                >
                  Mis citas
                </a>
                <a
                  className="client-nav-link"
                  href="#mi-perfil"
                  aria-current={page === "mi-perfil" ? "page" : undefined}
                >
                  Mi perfil y beneficios
                </a>
              </>
            )}
            {session && !client && (
              <a href={appUrl("admin", "#agenda")} className="client-nav-link">
                Panel del personal
              </a>
            )}
            {session ? (
              <button
                className="client-header-action"
                disabled={loggingOut}
                onClick={() => {
                  void logout();
                }}
              >
                {loggingOut ? "Cerrando…" : "Cerrar sesión"}
              </button>
            ) : (
              <a
                href="#login"
                className="client-header-action"
                onClick={() => setReturnTo("mi-perfil")}
              >
                Iniciar sesión
              </a>
            )}
          </nav>
          <button
            className="client-header-action rounded-full border border-current/30 px-4 py-2 lg:hidden"
            type="button"
            aria-controls="mobile-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "Cerrar" : "Menú"}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Navegación móvil"
            className="flex flex-col gap-4 border-t border-line bg-ivory p-6 text-base text-graphite shadow-card lg:hidden"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={page === item.href.slice(1) ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
            {client && (
              <>
                <a
                  href="#mis-citas"
                  aria-current={page === "mis-citas" ? "page" : undefined}
                >
                  Mis citas
                </a>
                <a
                  href="#mi-perfil"
                  aria-current={page === "mi-perfil" ? "page" : undefined}
                >
                  Mi perfil y beneficios
                </a>
              </>
            )}
            {session && !client && (
              <a href={appUrl("admin", "#agenda")}>Panel del personal</a>
            )}
            {session ? (
              <button
                type="button"
                disabled={loggingOut}
                className="text-left font-semibold"
                onClick={() => {
                  void logout();
                }}
              >
                Cerrar sesión
              </button>
            ) : (
              <a href="#login" className="font-semibold">
                Iniciar sesión
              </a>
            )}
          </nav>
        )}
      </header>
      <div className="flex flex-1 flex-col">
        <div
          className={
            home ? "absolute top-28 z-10 w-full px-5" : "client-container"
          }
        >
          <Feedback error={logoutError || (!home ? authError : "")} />
        </div>
        {home && (
          <HomePage
            services={catalog.data?.map(mapService) ?? null}
            stylists={team.data?.map(mapPublicStylist) ?? null}
            loading={catalog.loading}
            error={catalog.error}
            teamLoading={team.loading}
            teamError={team.error}
            onRetry={catalog.reload}
            onRetryTeam={team.reload}
            onBookService={(id) => {
              setBookingService(id);
              setBookingKey((key) => key + 1);
              window.location.hash = `reservar/${id}`;
            }}
          />
        )}
        <div hidden={page !== "reservar"}>
          <BookingPage
            key={`${bookingKey}/${bookingService ?? ""}`}
            initialServiceId={bookingService}
            onRequireAuth={requireAuth}
          />
        </div>
        {page === "recuperar" && (
          <main className="client-container py-12 sm:py-16">
            <PasswordRecovery />
          </main>
        )}
        {(page === "login" || page === "registro") && !loading && !session && (
          <ClientAccessPage
            key={page}
            mode={page}
            onSignedIn={() => {
              window.location.hash = returnTo;
            }}
          />
        )}
        {(page === "login" ||
          page === "registro" ||
          page === "mis-citas" ||
          page === "mi-perfil") &&
          loading && (
            <div className="client-container py-16">
              <Feedback loading />
            </div>
          )}
        {(page === "mis-citas" || page === "mi-perfil") &&
          !loading &&
          !session && (
            <main className="client-container py-16">
              <section className="api-panel mx-auto max-w-xl">
                <h1 className="font-display text-3xl">Ingresa a tu cuenta</h1>
                <p className="my-5 text-stone">
                  Consulta tus reservas, tu historial y tus beneficios.
                </p>
                <a
                  href="#login"
                  className="api-primary"
                  onClick={() => setReturnTo(route)}
                >
                  Iniciar sesión
                </a>
              </section>
            </main>
          )}
        {session && !client && !home && (
          <main className="client-container py-16">
            <section className="api-panel mx-auto max-w-xl">
              <h1 className="font-display text-3xl">
                Tu cuenta pertenece al personal
              </h1>
              <p className="mt-4 text-stone">
                Gestiona la agenda y las operaciones desde el panel interno.
              </p>
              <a href={appUrl("admin", "#agenda")} className="api-primary mt-6">
                Ir al panel
              </a>
            </section>
          </main>
        )}
        {(page === "login" || page === "registro") && client && (
          <main className="client-container py-16">
            <section className="api-panel mx-auto max-w-xl">
              <h1 className="font-display text-3xl">Ya iniciaste sesión</h1>
              <p className="mt-4 text-stone">
                Puedes consultar tus citas o revisar tus beneficios acumulados.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#mi-perfil" className="api-primary">
                  Ir a mi perfil
                </a>
                <a href="#mis-citas" className="api-secondary">
                  Ver mis citas
                </a>
              </div>
            </section>
          </main>
        )}
        {page === "mis-citas" && client && (
          <MyAppointmentsPage
            key={`${session.id}/${route.split("/")[1] ?? ""}`}
            initialAppointmentId={route.split("/")[1]}
          />
        )}
        {page === "mi-perfil" && client && <MyProfilePage key={session.id} />}
        {![
          "inicio",
          "servicios",
          "estilistas",
          "reservar",
          "login",
          "registro",
          "recuperar",
          "mis-citas",
          "mi-perfil",
        ].includes(page) && (
          <main className="client-container py-20">
            <section className="api-panel mx-auto max-w-xl">
              <h1 className="font-display text-3xl sm:text-4xl">
                Página no encontrada
              </h1>
              <p className="mt-4 text-stone">
                La ruta que buscas no existe o cambió de dirección.
              </p>
              <a href="#inicio" className="api-primary mt-6">
                Volver al inicio
              </a>
            </section>
          </main>
        )}
      </div>
      <footer className="bg-black text-white">
        <div className="client-container grid items-start gap-8 py-14 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl sm:text-3xl">
              MiliBrows Studio
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Un espacio para disfrutar cada atención.
            </p>
          </div>
          <nav
            aria-label="Pie de página"
            className="flex flex-col items-start gap-3 text-sm"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-white/85 transition hover:text-champagne"
              >
                {item.label}
              </a>
            ))}
            <a
              href={appUrl("admin", "#login")}
              className="text-white/85 transition hover:text-champagne"
            >
              Acceso del personal
            </a>
          </nav>
          <div className="text-sm leading-relaxed text-white/75">
            <p>Jirón Alberto Montellanos 289, Lima 15018</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
