import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  addPersonnelAccount,
  changePersonnelAccountActive,
  listPersonnelAccounts,
} from '../../shared/agenda/mockAgendaService'
import type { PersonnelAccountInput } from '../../shared/agenda/mockAgendaService'
import type { AccountSummary } from '../../shared/agenda/mockAuthService'
import { getSession } from '../../shared/agenda/mockAuthService'
import type { AgendaData, DemoActor } from '../../shared/agenda/types'

const empty: PersonnelAccountInput = {
  role: 'recepcionista',
  name: '',
  phone: '',
  contactEmail: '',
  specialty: '',
  serviceIds: [],
  accessEmail: '',
  password: '',
  confirmation: '',
  active: true,
}

export function PersonnelAccountsSection({
  actor,
  data,
  onData,
}: {
  actor: DemoActor
  data: AgendaData
  onData: (data: AgendaData) => void
}) {
  const [records, setRecords] = useState<AccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [request, setRequest] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [value, setValue] = useState<PersonnelAccountInput>(empty)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [toggle, setToggle] = useState<AccountSummary | null>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    let active = true
    listPersonnelAccounts(actor)
      .then((items) => {
        if (active) {
          setRecords(items)
          setLoading(false)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las cuentas.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [actor, request])

  function change<K extends keyof PersonnelAccountInput>(field: K, next: PersonnelAccountInput[K]) {
    setValue((current) => ({ ...current, [field]: next }))
    setFormError('')
  }
  function retry() {
    setLoading(true)
    setError('')
    setRequest((current) => current + 1)
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setFormError('')
    savingRef.current = true
    setSaving(true)
    try {
      const result = await addPersonnelAccount(value, actor)
      onData(result.data)
      setRecords((current) => [...current, result.account])
      setFormOpen(false)
      setValue(empty)
      setNotice(`Acceso de ${result.account.name} creado correctamente.`)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  async function confirmToggle() {
    if (!toggle || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setFormError('')
    try {
      const updated = await changePersonnelAccountActive(toggle.id, !toggle.active, actor)
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setNotice(`Cuenta de ${updated.name} ${updated.active ? 'activada' : 'desactivada'}.`)
      setToggle(null)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const input = (
    id: keyof PersonnelAccountInput,
    label: string,
    type: string,
    maxLength: number,
  ) => (
    <div>
      <label htmlFor={`personnel-${id}`} className="form-label">
        {label}
      </label>
      <input
        id={`personnel-${id}`}
        className="form-input mt-1"
        type={type}
        maxLength={maxLength}
        value={String(value[id] ?? '')}
        onChange={(event) => change(id, event.target.value as never)}
      />
    </div>
  )
  const withoutAccount = data.stylists.filter(
    (stylist) =>
      !records.some((account) => account.role === 'estilista' && account.stylistId === stylist.id),
  )
  return (
    <section
      aria-labelledby="personnel-access-title"
      className="mt-8 rounded-card border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-sage-dark uppercase">
            Equipo y acceso
          </p>
          <h2 id="personnel-access-title" className="mt-2 font-display text-2xl">
            Cuentas del personal
          </h2>
          <p className="mt-2 text-sm text-stone">
            Vincula el acceso con una estilista existente o crea un perfil nuevo de estilista o
            recepción.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold"
          onClick={() => {
            setFormOpen((current) => !current)
            setFormError('')
          }}
        >
          {formOpen ? 'Cerrar formulario' : '+ Nueva cuenta'}
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-5 rounded-lg bg-[#E9EEE3] p-3 text-sm text-sage-dark">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-6 text-sm text-stone">
          Cargando cuentas…
        </p>
      ) : error ? (
        <div role="alert" className="mt-6 text-sm text-caramel-dark">
          {error}
          <button type="button" className="ml-3 underline" onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {records.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
            >
              <div>
                <strong>{account.name}</strong>
                <p className="mt-1 text-stone">
                  {account.role === 'administrador'
                    ? 'Administrador'
                    : account.role === 'recepcionista'
                      ? 'Recepcionista'
                      : 'Estilista'}{' '}
                  · {account.accessEmail}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${account.active ? 'bg-[#E9EEE3] text-sage-dark' : 'bg-sand text-stone'}`}
                >
                  {account.active ? 'Activa' : 'Inactiva'}
                </span>
                {account.id === getSession()?.id ? (
                  <span className="text-xs text-stone">Tu cuenta</span>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-2 font-semibold hover:bg-ivory"
                    onClick={() => {
                      setToggle(account)
                      setFormError('')
                    }}
                  >
                    {account.active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {toggle && (
        <div
          role="group"
          aria-label="Confirmar estado de cuenta"
          className="mt-5 rounded-card border border-[#E7D6A5] bg-[#FFFBED] p-4 text-sm"
        >
          <p>
            ¿{toggle.active ? 'Desactivar' : 'Activar'} el acceso de <strong>{toggle.name}</strong>?
            Sus citas e historial se conservan.
          </p>
          {formError && (
            <p role="alert" className="mt-2 text-caramel-dark">
              {formError}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded-lg border border-line bg-white px-4 py-2"
              disabled={saving}
              onClick={() => setToggle(null)}
            >
              Volver
            </button>
            <button
              type="button"
              className="rounded-lg bg-gold px-4 py-2 font-semibold disabled:opacity-50"
              disabled={saving}
              onClick={confirmToggle}
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
      {formOpen && (
        <form
          noValidate
          onSubmit={create}
          className="mt-7 space-y-4 border-t border-line pt-6"
          aria-busy={saving}
        >
          <h3 className="font-display text-xl">Crear acceso</h3>
          <div>
            <label htmlFor="personnel-role" className="form-label">
              Rol *
            </label>
            <select
              id="personnel-role"
              className="form-input mt-1"
              value={value.role}
              onChange={(event) =>
                change('role', event.target.value as PersonnelAccountInput['role'])
              }
            >
              <option value="recepcionista">Recepcionista</option>
              <option value="estilista">Estilista</option>
            </select>
          </div>
          {value.role === 'estilista' && (
            <div>
              <label htmlFor="personnel-existing" className="form-label">
                Perfil de estilista
              </label>
              <select
                id="personnel-existing"
                className="form-input mt-1"
                value={value.existingStylistId ?? ''}
                onChange={(event) => change('existingStylistId', event.target.value)}
              >
                <option value="">Crear estilista nueva</option>
                {withoutAccount.map((stylist) => (
                  <option key={stylist.id} value={stylist.id}>
                    {stylist.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(value.role === 'recepcionista' || !value.existingStylistId) && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {input('name', 'Nombre completo *', 'text', 100)}
                {input(
                  'phone',
                  value.role === 'recepcionista' ? 'Teléfono *' : 'Teléfono',
                  'tel',
                  20,
                )}
              </div>
              {input('contactEmail', 'Correo de contacto (opcional)', 'email', 120)}
              {value.role === 'estilista' && (
                <>
                  {input('specialty', 'Especialidad', 'text', 200)}
                  <fieldset>
                    <legend className="form-label">Servicios habilitados</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {data.services.map((service) => (
                        <label
                          key={service.id}
                          className="rounded-lg border border-line p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mr-2 accent-[#C9A24B]"
                            checked={value.serviceIds.includes(service.id)}
                            onChange={() =>
                              change(
                                'serviceIds',
                                value.serviceIds.includes(service.id)
                                  ? value.serviceIds.filter((id) => id !== service.id)
                                  : [...value.serviceIds, service.id],
                              )
                            }
                          />
                          {service.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {input('accessEmail', 'Correo de acceso *', 'email', 120)}
            <label className="flex items-center gap-2 pt-5 text-sm">
              <input
                type="checkbox"
                className="accent-[#C9A24B]"
                checked={value.active}
                onChange={(event) => change('active', event.target.checked)}
              />
              Cuenta activa
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {input('password', 'Contraseña inicial *', visible ? 'text' : 'password', 100)}
            {input('confirmation', 'Confirmar contraseña *', visible ? 'text' : 'password', 100)}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-caramel-dark underline"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </button>
          {formError && (
            <p role="alert" className="rounded-lg bg-[#FAF0EA] p-3 text-sm text-caramel-dark">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-lg border border-line px-5 py-2.5 text-sm"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
