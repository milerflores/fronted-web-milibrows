import { useEffect, useState } from "react";
import { getClientSelfProfile } from "../shared/agenda/mockAgendaService";
import { getSession, signOut } from "../shared/agenda/mockAuthService";
import type { Session } from "../shared/agenda/mockAuthService";
import { getPublicCatalog } from "../shared/agenda/mockCatalogStore";
import { appUrl } from "../shared/appUrls";
import type { Client, DemoClientIdentity, PublicCatalog } from "../shared/agenda/types";
import { BookingPage } from "./pages/BookingPage";
import { ClientAccessPage } from "./pages/ClientAccessPage";
import { MyAppointmentsPage } from "./pages/MyAppointmentsPage";
import { MyProfilePage } from "./pages/MyProfilePage";
import { HomePage } from "./pages/HomePage";
import logo from "../assets/images/logo/logo.png";

type Page =
  | "inicio"
  | "reservar"
  | "mis-citas"
  | "mi-perfil"
  | "login"
  | "registro"
  | "no-encontrada";
type HomeSection = "inicio" | "servicios" | "estilistas";
type Route = {
  page: Page;
  serviceId?: string;
  section?: Exclude<HomeSection, "inicio">;
};
const navigation: { page: HomeSection; label: string }[] = [
  { page: "inicio", label: "Inicio" },
  { page: "servicios", label: "Servicios" },
  { page: "estilistas", label: "Estilistas" },
];

function readRoute(): Route {
  const [page, serviceId] = window.location.hash.replace(/^#/, "").split("/");
  if (!page || page === "inicio") return { page: "inicio" };
  if (page === "servicios" || page === "estilistas") return { page: "inicio", section: page };
  if (page === "reservar" || page === "mis-citas") return { page, serviceId };
  if (page === "mi-perfil" || page === "login" || page === "registro") return { page };
  return { page: "no-encontrada" };
}

function isPrivateRoute(route: Route): boolean {
  return route.page === "mis-citas" || route.page === "mi-perfil";
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [session, setSession] = useState<Session | null>(getSession);
  const [accounts, setAccounts] = useState<DemoClientIdentity[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(Boolean(getSession()));
  const [accountsError, setAccountsError] = useState("");
  const [accountRequest, setAccountRequest] = useState(0);
  const [returnTo, setReturnTo] = useState<string | null>(() =>
    !getSession() && isPrivateRoute(readRoute()) ? window.location.hash : null,
  );
  const [bookingHold, setBookingHold] = useState<Route | null>(null);
  const [bookingVersion, setBookingVersion] = useState(0);

  useEffect(() => {
    const updateRoute = () => {
      const next = readRoute();
      if (!getSession() && isPrivateRoute(next)) setReturnTo(window.location.hash);
      setRoute(next);
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    if (route.page === "inicio" && route.section) {
      document.getElementById(route.section)?.scrollIntoView({ behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [route]);

  useEffect(() => {
    let active = true;
    getPublicCatalog()
      .then((result) => {
        if (active) {
          setCatalog(result);
          setLoading(false);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Intenta de nuevo.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [requestVersion]);

  useEffect(() => {
    if (!session || session.role !== "cliente") return;
    let active = true;
    getClientSelfProfile(session.id)
      .then((result) => {
        if (active) {
          setAccounts([
            {
              id: session.id,
              role: "cliente",
              clientId: result.client.id,
              name: result.client.name,
              phone: result.client.phone,
              email: result.client.email,
            },
          ]);
          setAccountsLoading(false);
          setAccountsError("");
        }
      })
      .catch((cause) => {
        if (active) {
          setAccountsError(cause instanceof Error ? cause.message : "No se pudo cargar tu cuenta.");
          setAccountsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session, accountRequest]);

  useEffect(() => {
    if (!session && isPrivateRoute(route) && readRoute().page === route.page)
      window.location.hash = "login";
    else if (
      session &&
      (route.page === "login" || route.page === "registro") &&
      readRoute().page === route.page
    )
      window.location.hash = "inicio";
  }, [route, session]);

  const accountId = session?.role === "cliente" ? session.id : "";
  const demoClient = {
    accounts,
    accountsLoading,
    accountsError,
    accountId,
    onRetryAccounts: () => {
      setAccountsLoading(true);
      setAccountsError("");
      setAccountRequest((current) => current + 1);
    },
  };
  const bookingRoute =
    route.page === "reservar"
      ? route
      : route.page === "login" || route.page === "registro"
        ? bookingHold
        : null;
  const isHome = route.page === "inicio";

  function retry() {
    setLoading(true);
    setError("");
    setRequestVersion((version) => version + 1);
  }
  function openBooking(serviceId: string) {
    window.location.hash = `reservar/${serviceId}`;
  }
  function goAccess(mode: "login" | "registro") {
    if (route.page === "reservar") {
      setBookingHold(route);
      setReturnTo(window.location.hash);
    } else {
      setBookingHold(null);
      setReturnTo(null);
    }
    window.location.hash = mode;
  }
  function signedIn(next: Session) {
    setSession(next);
    setAccounts([]);
    setAccountsLoading(true);
    const destination = returnTo ?? "#mi-perfil";
    setReturnTo(null);
    window.location.hash = destination;
  }
  function registered(client: DemoClientIdentity) {
    const current = getSession();
    if (!current) return;
    setSession(current);
    setAccounts([client]);
    setAccountsLoading(false);
    const destination = returnTo ?? "#mi-perfil";
    setReturnTo(null);
    window.location.hash = destination;
  }
  function logout() {
    signOut();
    setSession(null);
    setAccounts([]);
    setAccountsLoading(false);
    setAccountsError("");
    setReturnTo(null);
    setBookingHold(null);
    setBookingVersion((current) => current + 1);
    window.location.hash = "inicio";
  }
  function profileSaved(updated: Client) {
    setAccounts((current) =>
      current.map((account) =>
        account.clientId === updated.id
          ? {
              ...account,
              name: updated.name,
              phone: updated.phone,
              email: updated.email,
            }
          : account,
      ),
    );
    setSession((current) => (current ? { ...current, name: updated.name } : null));
  }

  return (
    <div
      className={`client-shell min-h-screen bg-ivory font-sans text-graphite ${isHome ? "client-shell--home" : ""}`}
    >
      <a
        href="#contenido"
        className="client-skip"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("contenido");
          main?.setAttribute("tabindex", "-1");
          main?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header
        className={`client-header ${isHome ? "client-header--home absolute inset-x-0 top-0 z-20" : "relative z-20 border-b border-line bg-ivory"}`}
      >
        <div className="client-container grid min-h-[88px] grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 lg:min-h-[106px]">
          <nav aria-label="Navegación principal" className="hidden items-center gap-7 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.page}
                href={`#${item.page}`}
                aria-current={(route.section ?? route.page) === item.page ? "page" : undefined}
                className="client-nav-link"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#inicio"
            className="client-nav-logo col-start-2 justify-self-center focus-visible:outline-2 focus-visible:outline-gold"
            aria-label="MiliBrows Studio, ir al inicio"
          >
            <img src={logo} className="block w-[80] sm:w-[180px]" alt="" />
          </a>
          <div className="col-start-3 hidden items-center justify-end gap-5 lg:flex">
            {session ? (
              <details className="relative">
                <summary className="client-header-action cursor-pointer list-none text-sm font-semibold focus-visible:outline-2 focus-visible:outline-gold">
                  {session.name}
                </summary>
                <div className="absolute right-0 z-30 mt-3 min-w-44 rounded-[12px] border border-line bg-white p-2 text-graphite shadow-card">
                  <a href="#mis-citas" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                    Mis citas
                  </a>
                  <a href="#mi-perfil" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                    Mi perfil
                  </a>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand"
                    onClick={logout}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </details>
            ) : (
              <>
                <button
                  type="button"
                  className="client-header-action text-[18px] font-semibold"
                  onClick={() => goAccess("login")}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className="client-header-action text-[18px] font-semibold"
                  onClick={() => goAccess("registro")}
                >
                  Registrarse
                </button>
              </>
            )}
            <a href="#reservar" className="client-header-book ">
              Reservar cita
            </a>
          </div>
          {/* <button
            type="button"
            className="client-menu-button col-start-3 justify-self-end lg:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="client-menu-line" />
            <span className="client-menu-line" />
            <span className="client-menu-line" />
          </button> */}
        </div>
        <nav
          id="mobile-menu"
          aria-label="Navegación móvil"
          className={`${menuOpen ? "block" : "hidden"} border-t border-line bg-ivory px-6 py-4 text-graphite shadow-card lg:hidden`}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col">
            {navigation.map((item) => (
              <a
                key={item.page}
                href={`#${item.page}`}
                aria-current={(route.section ?? route.page) === item.page ? "page" : undefined}
                className="border-b border-line py-3 text-sm font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#reservar"
              className="border-b border-line py-3 text-sm font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              Reservar cita
            </a>
            {session ? (
              <>
                <span className="pt-4 text-xs text-stone">{session.name}</span>
                <a
                  href="#mis-citas"
                  className="border-b border-line py-3 text-sm font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  Mis citas
                </a>
                <a
                  href="#mi-perfil"
                  className="border-b border-line py-3 text-sm font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  Mi perfil
                </a>
                <button
                  type="button"
                  className="py-3 text-left text-sm font-semibold"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="border-b border-line py-3 text-left text-sm font-semibold"
                  onClick={() => goAccess("login")}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className="py-3 text-left text-sm font-semibold"
                  onClick={() => goAccess("registro")}
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {route.page === "inicio" && (
        <HomePage
          services={catalog?.services ?? null}
          stylists={catalog?.stylists ?? null}
          loading={loading}
          error={error}
          onRetry={retry}
          onBookService={openBooking}
        />
      )}
      {bookingRoute && (
        <div hidden={route.page !== "reservar"}>
          <BookingPage
            key={`${bookingVersion}/${bookingRoute.serviceId ?? ""}`}
            catalog={catalog}
            loading={loading}
            error={error}
            onRetry={retry}
            initialServiceId={bookingRoute.serviceId}
            onRequireAuth={goAccess}
            {...demoClient}
          />
        </div>
      )}
      {(route.page === "login" || route.page === "registro") && !session && (
        <ClientAccessPage mode={route.page} onSignedIn={signedIn} onRegistered={registered} />
      )}
      {route.page === "mis-citas" && session && (
        <MyAppointmentsPage
          key={accountId}
          initialAppointmentId={route.serviceId}
          {...demoClient}
        />
      )}
      {route.page === "mi-perfil" && session && (
        <MyProfilePage key={accountId} {...demoClient} onProfileSaved={profileSaved} />
      )}
      {route.page === "no-encontrada" && (
        <main id="contenido" className="client-container py-20 text-center">
          <h1 className="font-display text-4xl">Página no encontrada.</h1>
          <a href="#inicio" className="client-primary mt-7">
            Volver al inicio
          </a>
        </main>
      )}

      <footer className="bg-black text-white">
        <div className="client-container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:py-18">
          <div>
            <p className="font-display text-3xl">
              MiliBrows <span className="italic">Studio</span>
            </p>
            <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-white/80">
              Servicios y estilistas de MiliBrows Studio.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-[.16em] text-champagne uppercase">
              Explorar
            </h2>
            <nav
              aria-label="Navegación del pie"
              className="mt-4 flex flex-col items-start gap-2 text-sm"
            >
              {navigation.map((item) => (
                <a
                  key={item.page}
                  href={`#${item.page}`}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-champagne"
                >
                  {item.label}
                </a>
              ))}
              <a href="#reservar" className="hover:underline">
                Reservar cita
              </a>
              <a href={appUrl("admin", "#login")} className="hover:underline">
                Acceso del personal
              </a>
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-[.16em] text-champagne uppercase">
              Visítanos
            </h2>
            <p className="mt-4 text-sm text-white/85">Lunes a sábado · 10:00 a 22:00</p>
            <p className="mt-3 text-sm text-white/75">Jirón Alberto Montellanos 289, Lima 15018</p>
          </div>
        </div>
        <div className="border-t border-white/20">
          <div className="client-container py-5 text-xs text-white/70">
            © {new Date().getFullYear()} MiliBrows Studio
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
