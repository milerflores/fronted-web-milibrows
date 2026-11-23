import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useApi } from '../../shared/api/useApi'
import type {
  AppointmentDto,
  ClientPaymentDto,
  LoyaltyDto,
  ProfileDto,
} from '../../shared/api/types'
import {
  mapAppointment,
  profileClient,
  updateClientSelfProfile,
} from '../../shared/agenda/agendaService'
import { restoreSession } from '../../shared/agenda/authService'
import { Feedback, Field, Modal, ServiceResults } from '../../shared/components/Forms'
import type { ClientInput } from '../../shared/agenda/types'

const pointLabels: Record<string, string> = {
  ganado: 'Puntos ganados',
  reversion: 'Reversión',
  ajuste: 'Ajuste',
}

function ProfileEditor({
  initial,
  onSaved,
  onClose,
}: {
  initial: ClientInput
  onSaved: () => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await updateClientSelfProfile(value)
      onSaved()
      void restoreSession()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <Modal title="Mis datos de contacto" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Nombre"
          required
          maxLength={100}
          value={value.firstName}
          onChange={(event) => setValue({ ...value, firstName: event.target.value })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Apellido paterno"
            required
            maxLength={100}
            value={value.paternalLastName}
            onChange={(event) => setValue({ ...value, paternalLastName: event.target.value })}
          />
          <Field
            label="Apellido materno (opcional)"
            maxLength={100}
            value={value.maternalLastName ?? ''}
            onChange={(event) => setValue({ ...value, maternalLastName: event.target.value })}
          />
        </div>
        <Field
          label="Teléfono"
          type="tel"
          maxLength={30}
          value={value.phone}
          onChange={(event) => setValue({ ...value, phone: event.target.value })}
        />
        <Field
          label="Correo de contacto"
          type="email"
          maxLength={255}
          value={value.email}
          onChange={(event) => setValue({ ...value, email: event.target.value })}
        />
        <label className="block text-sm font-semibold">
          Preferencias para la atención
          <textarea
            className="api-input mt-2 min-h-28"
            maxLength={2000}
            value={value.preferences ?? ''}
            onChange={(event) => setValue({ ...value, preferences: event.target.value })}
          />
        </label>
        <Feedback error={error} />
        <button disabled={busy} className="api-primary">
          {busy ? 'Guardando…' : 'Guardar datos'}
        </button>
      </form>
    </Modal>
  )
}

export function MyProfilePage() {
  const profile = useApi<ProfileDto>('/mi-perfil')
  const loyalty = useApi<LoyaltyDto>('/mi-perfil/fidelizacion')
  const payments = useApi<ClientPaymentDto[]>('/mi-perfil/pagos', true)
  const history = useApi<AppointmentDto[]>('/citas?estado=completada', true)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const client = profile.data ? profileClient(profile.data) : null
  const visits = (history.data ?? [])
    .map(mapAppointment)
    .filter((item) => item.services.some((service) => service.result === 'realizado'))
    .reverse()

  return (
    <main id="contenido" className="client-container py-12 sm:py-18">
      <h1 className="mb-8 font-display text-4xl sm:text-5xl">Mi perfil y beneficios</h1>
      <Feedback
        loading={profile.loading}
        error={profile.error}
        onRetry={profile.reload}
        notice={notice}
      />
      {client && (
        <section className="api-panel">
          <div className="flex flex-wrap justify-between gap-5">
            <h2 className="font-display text-2xl">{client.name}</h2>
            <button className="api-secondary" onClick={() => setEditing(true)}>
              Editar mis datos
            </button>
          </div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone">DNI</dt>
              <dd className="mt-1">{client.dni || 'Sin registrar'}</dd>
            </div>
            <div>
              <dt className="text-stone">Correo de acceso</dt>
              <dd className="mt-1 break-all">{profile.data?.correo}</dd>
            </div>
            <div>
              <dt className="text-stone">Teléfono</dt>
              <dd className="mt-1">{client.phone || 'Sin registrar'}</dd>
            </div>
            <div>
              <dt className="text-stone">Correo de contacto</dt>
              <dd className="mt-1 break-all">{client.email || 'Sin registrar'}</dd>
            </div>
          </dl>
          {client.preferences && (
            <p className="mt-5 whitespace-pre-wrap rounded-card bg-sand p-4 text-sm">
              {client.preferences}
            </p>
          )}
        </section>
      )}
      <section className="mt-10">
        <h2 className="font-display text-3xl">Tus beneficios</h2>
        <Feedback loading={loyalty.loading} error={loyalty.error} onRetry={loyalty.reload} />
        {loyalty.data && (
          <>
            <div className="api-panel mt-6 bg-sand">
              <p className="font-display text-2xl">
                Nivel {loyalty.data.nivel.nombre} · {loyalty.data.nivel.porcentaje_descuento}% de
                descuento
              </p>
              <p className="mt-3 text-sm text-stone">
                {loyalty.data.puntos} puntos acumulados · {loyalty.data.visitas} visitas ·{' '}
                {loyalty.data.servicios_realizados} servicios recibidos · S/{' '}
                {loyalty.data.monto_pagado} pagados
              </p>
              {loyalty.data.siguiente_nivel && (
                <div className="mt-4">
                  <p className="text-sm">
                    Te faltan {loyalty.data.siguiente_nivel.puntos_faltantes} puntos para alcanzar{' '}
                    <strong>{loyalty.data.siguiente_nivel.nombre}</strong> (
                    {loyalty.data.siguiente_nivel.porcentaje_descuento}% de descuento).
                  </p>
                  <progress
                    className="mt-3 h-3 w-full accent-[#C9A24B]"
                    max={loyalty.data.siguiente_nivel.puntos_minimos}
                    value={Math.max(0, loyalty.data.puntos)}
                  />
                </div>
              )}
            </div>
            {loyalty.data.movimientos.length > 0 && (
              <div className="api-panel mt-5">
                <h3 className="font-display text-2xl">Movimientos de puntos</h3>
                <ul className="mt-4 divide-y divide-line">
                  {loyalty.data.movimientos.map((mov) => (
                    <li
                      key={mov.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{pointLabels[mov.tipo] ?? mov.tipo}</p>
                        {mov.motivo && <p className="mt-1 text-stone">{mov.motivo}</p>}
                      </div>
                      <strong>
                        {mov.puntos > 0 ? `+${mov.puntos}` : mov.puntos} pts
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
      <section className="mt-12">
        <h2 className="font-display text-3xl">Mis pagos registrados</h2>
        <Feedback loading={payments.loading} error={payments.error} onRetry={payments.reload} />
        {!payments.loading && !payments.error && !(payments.data?.length ?? 0) && (
          <p className="api-panel mt-5 text-sm text-stone">Aún no tienes pagos registrados.</p>
        )}
        {(payments.data?.length ?? 0) > 0 && (
          <div className="api-panel mt-5">
            <ul className="divide-y divide-line">
              {payments.data!.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      Cita #{payment.id_cita} · {payment.metodo?.nombre ?? 'Pago'}
                    </p>
                    <p className="mt-1 text-stone">
                      {payment.cita?.fecha ?? ''} · {payment.estado}
                      {payment.referencia_pago ? ` · Ref. ${payment.referencia_pago}` : ''}
                    </p>
                  </div>
                  <strong>S/ {payment.importe}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="mt-12">
        <h2 className="font-display text-3xl">Historial de atenciones</h2>
        <Feedback loading={history.loading} error={history.error} onRetry={history.reload} />
        {!history.loading && !history.error && !visits.length && (
          <p className="api-panel mt-5 text-sm text-stone">
            Aquí aparecerán los servicios recibidos cuando completes tu primera atención.
          </p>
        )}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {visits.map((item) => (
            <article key={item.id} className="api-panel">
              <h3 className="font-display text-xl">
                {item.date} · {item.stylistName}
              </h3>
              <ServiceResults
                services={item.services.filter((service) => service.result === 'realizado')}
              />
              <a href={`#mis-citas/${item.id}`} className="text-sm font-semibold underline">
                Ver cita completa
              </a>
            </article>
          ))}
        </div>
      </section>
      {editing && client && (
        <ProfileEditor
          initial={client}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            profile.reload()
            setNotice('Tus datos se guardaron correctamente.')
          }}
        />
      )}
    </main>
  )
}
