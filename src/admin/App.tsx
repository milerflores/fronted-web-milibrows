import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../shared/api/useApi'
import type { AppointmentDto } from '../shared/api/types'
import { mapAppointment } from '../shared/agenda/agendaService'
import { restoreSession, signOut } from '../shared/agenda/authService'
import type { Session } from '../shared/agenda/authService'
import { useAuth } from '../shared/agenda/useAuth'
import { addDays, dateFromKey, dateKey, todayKey } from '../shared/agenda/dates'
import type {
  AgendaData,
  Appointment,
  Client,
  CreatedAppointment,
  Actor,
} from '../shared/agenda/types'
import { appUrl } from '../shared/appUrls'
import { Feedback, Field } from '../shared/components/Forms'
import { SignInForm } from '../shared/components/SignInForm'
import { MfaPanel } from '../shared/components/MfaPanel'
import { PasswordRecovery } from '../shared/components/PasswordRecovery'
import { AppointmentDialog } from './components/AppointmentDialog'
import { AttendanceActionDialog } from './components/AttendanceActionDialog'
import type { AttendanceAction } from './components/AttendanceActionDialog'
import { CancelAppointmentDialog } from './components/CancelAppointmentDialog'
import { RescheduleDialog } from '../shared/components/RescheduleDialog'
import { NewAppointmentDialog } from './components/NewAppointmentDialog'
import { ClientsPage } from './components/ClientsPage'
import { ClientEditorDialog } from './components/ClientEditorDialog'
import { ClientProfileDialog } from './components/ClientProfileDialog'
import { CatalogPage } from './components/CatalogPage'
import { PersonnelAccountsSection } from './components/PersonnelAccountsSection'
import { SettingsPage } from './components/SettingsPage'
import { LoyaltyPage } from './components/LoyaltyPage'
import { PaymentsPage } from './components/PaymentsPage'
import { InventoryPage } from './components/InventoryPage'
import { StatusBadge } from './components/StatusBadge'
import logo from '../assets/images/logo/logo.png'

function readRoute() {
  if (window.location.pathname.includes('restablecer-contrasena')) return 'recuperar'
  return window.location.hash.slice(1) || 'agenda'
}

function SecurityPage({ session }: { session: Session }) {
  const [configuring, setConfiguring] = useState(false)
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <h1 className="mb-7 font-display text-3xl">Seguridad de mi cuenta</h1>
      {configuring ? (
        <MfaPanel session={session} onDone={() => setConfiguring(false)} />
      ) : (
        <section className="api-panel">
          <h2 className="font-display text-2xl">Segundo factor</h2>
          <p className="mt-4 text-sm text-stone">
            {session.mfaConfigured
              ? 'Tu cuenta utiliza una aplicación de autenticación para verificar cada inicio de sesión.'
              : 'Puedes añadir una aplicación de autenticación para proteger tu acceso.'}
          </p>
          {!session.mfaConfigured && (
            <button className="api-primary mt-6" onClick={() => setConfiguring(true)}>
              Activar segundo factor
            </button>
          )}
        </section>
      )}
    </main>
  )
}

interface Summary {
  citas: number
  servicios_realizados: number
  visitas: number
}
type Action = { kind: 'reschedule' | 'cancel' | AttendanceAction; appointment: Appointment }

function Workspace({
  session,
  route,
  onLogout,
  loggingOut,
}: {
  session: Session
  route: string
  onLogout: () => void
  loggingOut: boolean
}) {
  const [from, setFrom] = useState(todayKey)
  const [until, setUntil] = useState(() => dateKey(addDays(dateFromKey(todayKey()), 6)))
  const [status, setStatus] = useState('')
  const [stylist, setStylist] = useState('')
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookingClient, setBookingClient] = useState<Client | undefined>()
  const [editingClient, setEditingClient] = useState<Client | 'new' | null>(null)
  const [profileClient, setProfileClient] = useState<{ id: string; appointmentId?: string } | null>(
    null,
  )
  const [notice, setNotice] = useState('')
  const datesValid = !!from && !!until && until >= from
  const params = new URLSearchParams({ fecha_desde: from, fecha_hasta: until })
  if (status) params.set('estado', status)
  const query = useApi<AppointmentDto[]>(datesValid ? `/citas?${params}` : null, true)
  const summary = useApi<Summary>(
    session.role === 'administrador' && datesValid && route === 'agenda'
      ? `/administracion/resumen?fecha_desde=${from}&fecha_hasta=${until}`
      : null,
  )
  const actor = useMemo<Actor>(
    () =>
      session.role === 'estilista'
        ? { role: 'estilista', stylistId: session.stylistId ?? '' }
        : { role: session.role === 'administrador' ? 'administrador' : 'recepcionista' },
    [session.role, session.stylistId],
  )
  const data = useMemo<AgendaData>(() => {
    const appointments = (query.data ?? []).map(mapAppointment)
    const references = selected ? [...appointments, selected] : appointments
    return {
      appointments,
      clients: [
        ...new Map(
          references.filter((item) => item.client).map((item) => [item.clientId, item.client!]),
        ).values(),
      ],
      stylists: [
        ...new Map(
          references
            .flatMap((item) => item.services)
            .map((svc) => [
              svc.stylistId,
              { id: svc.stylistId, name: svc.stylistName, active: true, serviceIds: [] },
            ]),
        ).values(),
      ],
    }
  }, [query.data, selected])
  const items = data.appointments.filter((item) => !stylist || item.stylistIds.includes(stylist))
  const days = [...new Set(items.map((item) => item.date))].sort()
  const tabs = [
    { id: 'agenda', label: 'Agenda', allowed: true },
    { id: 'clientes', label: 'Clientes', allowed: session.role !== 'estilista' },
    { id: 'cobros', label: 'Cobros', allowed: session.role !== 'estilista' },
    {
      id: 'inventario',
      label: session.role === 'estilista' ? 'Mis insumos' : 'Inventario',
      allowed: session.role === 'administrador' || session.role === 'estilista',
    },
    { id: 'servicios', label: 'Servicios', allowed: session.role === 'administrador' },
    { id: 'personal', label: 'Personal', allowed: session.role === 'administrador' },
    { id: 'fidelizacion', label: 'Fidelización', allowed: session.role === 'administrador' },
    { id: 'configuracion', label: 'Estudio', allowed: session.role === 'administrador' },
    { id: 'seguridad', label: 'Seguridad', allowed: true },
  ].filter((item) => item.allowed)
  const view = tabs.some((item) => item.id === route) ? route : 'agenda'

  function updated(result: CreatedAppointment, message = 'Cita guardada correctamente.') {
    setAction(null)
    setBooking(false)
    setSelected(result.appointment)
    query.reload()
    summary.reload()
    setNotice(message)
  }
  function startAction(kind: Action['kind'], appointment: Appointment) {
    setSelected(null)
    setAction({ kind, appointment })
    setNotice('')
  }

  return (
    <div className="min-h-screen bg-ivory font-sans text-graphite">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <a href="#agenda">
            <img src={logo} alt="MiliBrows Studio" className="w-[155px]" />
          </a>
          <div className="flex flex-wrap items-center gap-5">
            <span className="text-sm font-semibold">{session.name}</span>
            <button className="api-secondary" disabled={loggingOut} onClick={onLogout}>
              {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
        <nav
          aria-label="Panel interno"
          className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-5 pb-5 sm:px-8"
        >
          {tabs.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={view === item.id ? 'page' : undefined}
              className={`whitespace-nowrap ${view === item.id ? 'api-primary' : 'api-secondary'}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      {view === 'agenda' && (
        <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="font-display text-3xl">
                {session.role === 'estilista' ? 'Mi agenda' : 'Agenda del estudio'}
              </h1>
              <p className="mt-2 text-sm text-stone">Horarios de atención en Lima.</p>
            </div>
            <div className="flex gap-3">
              <button
                className="api-secondary"
                onClick={() => {
                  query.reload()
                  summary.reload()
                }}
              >
                Actualizar
              </button>
              {session.role !== 'estilista' && (
                <button
                  className="api-primary"
                  onClick={() => {
                    setBookingClient(undefined)
                    setBooking(true)
                  }}
                >
                  Nueva cita
                </button>
              )}
            </div>
          </div>
          <section className="api-panel grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Desde"
              type="date"
              required
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Field
              label="Hasta"
              type="date"
              required
              min={from}
              value={until}
              onChange={(event) => setUntil(event.target.value)}
            />
            <label className="text-sm font-semibold">
              Estado
              <select
                className="api-input mt-2"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="confirmada">Confirmada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_asistio">No asistió</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Estilista
              <select
                className="api-input mt-2"
                value={stylist}
                onChange={(event) => setStylist(event.target.value)}
              >
                <option value="">Todas</option>
                {data.stylists.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <Feedback
            loading={query.loading}
            error={!datesValid ? 'Elige un rango de fechas válido.' : query.error}
            onRetry={query.reload}
            notice={notice}
          />
          {!query.loading && !query.error && datesValid && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Citas en el período', summary.data?.citas ?? data.appointments.length],
                  [
                    'Confirmadas en la vista',
                    items.filter((item) => item.status === 'confirmada').length,
                  ],
                  [
                    'Servicios realizados',
                    summary.data?.servicios_realizados ??
                      items
                        .flatMap((item) => item.services)
                        .filter((item) => item.result === 'realizado').length,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="api-panel">
                    <p className="text-sm text-stone">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              {summary.error && <Feedback error={summary.error} onRetry={summary.reload} />}
              {days.map((day) => (
                <section key={day}>
                  <h2 className="mb-4 font-display text-xl capitalize">
                    {new Intl.DateTimeFormat('es-PE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }).format(dateFromKey(day))}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items
                      .filter((item) => item.date === day)
                      .map((item) => (
                        <button
                          key={item.id}
                          className="api-panel text-left transition hover:border-gold focus-visible:outline-2 focus-visible:outline-gold"
                          onClick={() => {
                            setSelected(item)
                            setNotice('')
                          }}
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <strong>{item.startTime}</strong>
                            <StatusBadge status={item.status} />
                          </div>
                          <h3 className="mt-4 font-semibold">
                            {item.client?.name ?? `Cliente ${item.clientId}`}
                          </h3>
                          <p className="mt-2 text-sm text-stone">{item.stylistName}</p>
                          <p className="mt-4 text-sm">
                            {item.services.map((service) => service.serviceName).join(' · ')}
                          </p>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
              {!items.length && (
                <p className="api-panel text-sm text-stone">
                  No hay citas en el período y filtros seleccionados.
                </p>
              )}
            </>
          )}
        </main>
      )}
      {view === 'clientes' && (
        <ClientsPage
          actor={actor}
          data={data}
          notice={notice}
          onOpen={(client) => setProfileClient({ id: client.id })}
          onEdit={setEditingClient}
          onNew={() => setEditingClient('new')}
        />
      )}
      {view === 'cobros' && <PaymentsPage isAdmin={session.role === 'administrador'} />}
      {view === 'inventario' && <InventoryPage isAdmin={session.role === 'administrador'} />}
      {view === 'servicios' && <CatalogPage />}
      {view === 'personal' && <PersonnelAccountsSection />}
      {view === 'fidelizacion' && <LoyaltyPage />}
      {view === 'configuracion' && <SettingsPage />}
      {view === 'seguridad' && <SecurityPage session={session} />}
      {selected && (
        <AppointmentDialog
          appointment={selected}
          data={data}
          actor={actor}
          notice={notice}
          onClose={() => setSelected(null)}
          onReschedule={(item) => startAction('reschedule', item)}
          onCancel={(item) => startAction('cancel', item)}
          onComplete={(item) => startAction('complete', item)}
          onNoShow={(item) => startAction('noShow', item)}
          onOpenClient={(item) => {
            setSelected(null)
            setProfileClient({ id: item.clientId, appointmentId: item.id })
          }}
          onUpdated={updated}
        />
      )}
      {action?.kind === 'reschedule' && (
        <RescheduleDialog
          appointment={action.appointment}
          onClose={() => setAction(null)}
          onRescheduled={updated}
        />
      )}
      {action?.kind === 'cancel' && (
        <CancelAppointmentDialog
          appointment={action.appointment}
          data={data}
          actor={actor}
          onClose={() => setAction(null)}
          onCancelled={updated}
        />
      )}
      {action && (action.kind === 'complete' || action.kind === 'noShow') && (
        <AttendanceActionDialog
          appointment={action.appointment}
          action={action.kind}
          onClose={() => setAction(null)}
          onUpdated={updated}
        />
      )}
      {booking && (
        <NewAppointmentDialog
          allowInternal={session.role === 'administrador'}
          preferredClient={bookingClient}
          onClose={() => setBooking(false)}
          onCreated={updated}
        />
      )}
      {editingClient && (
        <ClientEditorDialog
          client={editingClient === 'new' ? null : editingClient}
          actor={actor}
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null)
            query.reload()
            setNotice('Ficha de cliente guardada correctamente.')
          }}
        />
      )}
      {profileClient && (
        <ClientProfileDialog
          clientId={profileClient.id}
          sourceAppointmentId={profileClient.appointmentId}
          actor={actor}
          data={data}
          onClose={() => setProfileClient(null)}
          onEdit={(client) => {
            setProfileClient(null)
            setEditingClient(client)
          }}
          onBook={(client) => {
            setProfileClient(null)
            setBookingClient(client)
            setBooking(true)
          }}
          onOpenAppointment={(item) => {
            setProfileClient(null)
            setSelected(item)
          }}
        />
      )}
    </div>
  )
}

function App() {
  const { session, loading, error } = useAuth()
  const [route, setRoute] = useState(readRoute)
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await signOut()
      window.location.hash = 'login'
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : 'No se pudo cerrar sesión.')
    } finally {
      setLoggingOut(false)
    }
  }
  if (route.startsWith('recuperar'))
    return (
      <div className="min-h-screen bg-ivory px-5 py-10 font-sans">
        <PasswordRecovery />
      </div>
    )
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-ivory font-sans">
        <Feedback loading />
      </main>
    )
  if (session?.mfaRequired)
    return (
      <main className="grid min-h-screen place-items-center bg-ivory px-5 py-10 font-sans">
        <MfaPanel session={session} />
      </main>
    )
  if (session && session.role !== 'cliente')
    return (
      <>
        <Feedback error={logoutError} />
        <Workspace
          key={`${session.id}/${session.role}`}
          session={session}
          route={route === 'estilistas' ? 'personal' : route}
          onLogout={() => {
            void logout()
          }}
          loggingOut={loggingOut}
        />
      </>
    )
  return (
    <main className="admin-access-page grid min-h-screen place-items-center bg-white px-5 py-12 font-sans text-graphite">
      <section className="w-full max-w-[480px]">
        <img src={logo} alt="MiliBrows Studio" className="mx-auto w-[180px]" />
        <h1 className="mt-8 text-center font-display text-3xl sm:text-4xl">
          {session ? 'Tu cuenta es de cliente' : 'Ingresa a tu cuenta'}
        </h1>
        <Feedback
          error={error || logoutError}
          onRetry={() => {
            void restoreSession()
          }}
        />
        {session ? (
          <div className="mt-8 flex flex-wrap gap-4">
            <a className="api-primary" href={appUrl('client', '#mi-perfil')}>
              Ir a mi portal
            </a>
            <button
              className="api-secondary"
              disabled={loggingOut}
              onClick={() => {
                void logout()
              }}
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <SignInForm
              area="admin"
              onSignedIn={() => {
                window.location.hash = 'agenda'
              }}
            />
          </div>
        )}
        <a
          href={appUrl('client', '#inicio')}
          className="mt-7 block text-center text-sm font-semibold underline"
        >
          Volver al sitio público
        </a>
      </section>
    </main>
  )
}
export default App
