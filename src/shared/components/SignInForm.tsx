import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { signIn } from '../agenda/authService'
import type { Session } from '../agenda/authService'
import { Feedback, Field } from './Forms'

export function SignInForm({
  area,
  onSignedIn,
}: {
  area: 'client' | 'admin'
  onSignedIn: (session: Session) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      onSignedIn(await signIn(email, password, area))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={saving}>
      <Field
        label="Correo de acceso"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Field
        label="Contraseña"
        type={visible ? 'text' : 'password'}
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <button type="button" className="font-semibold" onClick={() => setVisible(!visible)}>
          {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        </button>
        <a href="#recuperar" className="underline underline-offset-4">
          Olvidé mi contraseña
        </a>
      </div>
      <Feedback error={error} />
      <button type="submit" disabled={saving} className="api-primary w-full">
        {saving ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
