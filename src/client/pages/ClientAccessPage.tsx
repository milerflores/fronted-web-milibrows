import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../../shared/api/http'
import { signIn } from '../../shared/agenda/authService'
import type { Session } from '../../shared/agenda/authService'
import { Feedback, Field } from '../../shared/components/Forms'
import { SignInForm } from '../../shared/components/SignInForm'

export function ClientAccessPage({
  mode,
  onSignedIn,
}: {
  mode: 'login' | 'registro'
  onSignedIn: (session: Session) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [paternalLastName, setPaternalLastName] = useState('')
  const [maternalLastName, setMaternalLastName] = useState('')
  const [dni, setDni] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  async function register(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      if (!created) {
        await request('/acceso/registro', 'POST', {
          nombre: firstName.trim(),
          apellido_paterno: paternalLastName.trim(),
          apellido_materno: maternalLastName.trim() || null,
          dni,
          telefono: phone.trim() || null,
          correo: email.trim(),
          contrasena: password,
          contrasena_confirmacion: confirmation,
        })
        setCreated(true)
      }
      onSignedIn(await signIn(email, password, 'client'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar tu cuenta.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  return (
    <main id="contenido" className="client-container py-12 sm:py-16">
      <section className="api-panel mx-auto max-w-xl">
        <h1 className="mb-8 text-center font-display text-3xl sm:text-4xl">
          {mode === 'login' ? 'Nos alegra que estés de vuelta' : 'Crea tu cuenta'}
        </h1>
        {mode === 'login' ? (
          <SignInForm area="client" onSignedIn={onSignedIn} />
        ) : (
          <form onSubmit={register} className="space-y-5" aria-busy={saving}>
            <fieldset disabled={saving || created} className="space-y-5">
              <Field
                label="Nombre"
                autoComplete="given-name"
                maxLength={100}
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Apellido paterno"
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  value={paternalLastName}
                  onChange={(event) => setPaternalLastName(event.target.value)}
                />
                <Field
                  label="Apellido materno (opcional)"
                  maxLength={100}
                  value={maternalLastName}
                  onChange={(event) => setMaternalLastName(event.target.value)}
                />
              </div>
              <Field
                label="DNI"
                inputMode="numeric"
                pattern="[0-9]{8}"
                minLength={8}
                maxLength={8}
                required
                value={dni}
                onChange={(event) => setDni(event.target.value)}
              />
              <p className="text-sm text-stone">
                Si ya tienes una ficha en el estudio, tu DNI permitirá conservar tu historial y
                beneficios.
              </p>
              <Field
                label="Teléfono (opcional)"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Field
                label="Correo de acceso"
                type="email"
                autoComplete="username"
                maxLength={255}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Field
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-sm text-stone">
                Usa al menos 10 caracteres con mayúsculas, minúsculas y números.
              </p>
              <Field
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </fieldset>
            <Feedback
              error={error}
              notice={
                created
                  ? 'Tu cuenta está creada. Puedes reintentar el ingreso o iniciar sesión con tus credenciales.'
                  : ''
              }
            />
            <button disabled={saving} className="api-primary w-full">
              {saving ? 'Ingresando…' : created ? 'Entrar a mi cuenta' : 'Crear cuenta'}
            </button>
          </form>
        )}
        <p className="mt-7 text-center text-sm text-stone">
          {mode === 'login' ? '¿Aún no tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <a
            className="font-semibold text-graphite underline"
            href={mode === 'login' ? '#registro' : '#login'}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </a>
        </p>
      </section>
    </main>
  )
}
