import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../api/http'
import { Feedback, Field } from './Forms'

export function PasswordRecovery() {
  const returnPath = window.location.pathname.replace(/restablecer-contrasena\/?$/, '') || '/'
  const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1])
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState(params.get('correo') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (token && password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const result = await request<{ mensaje: string }>(
        token ? '/acceso/restablecer-contrasena' : '/acceso/solicitar-restablecimiento',
        'POST',
        {
          correo: email,
          ...(token ? { token, contrasena: password, contrasena_confirmacion: confirmation } : {}),
        },
      )
      setNotice(result.mensaje)
      setPassword('')
      setConfirmation('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la solicitud.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <section className="api-panel mx-auto my-12 w-full max-w-xl">
      <h1 className="font-display text-3xl">
        {token ? 'Elige tu nueva contraseña' : 'Recupera tu acceso'}
      </h1>
      <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={busy}>
        <Field
          label="Correo de acceso"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {token && (
          <>
            <p className="text-sm text-stone">
              Usa al menos 10 caracteres, con mayúsculas, minúsculas y números.
            </p>
            <Field
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Field
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </>
        )}
        <Feedback error={error} notice={notice} />
        <button disabled={busy} className="api-primary">
          {busy ? 'Enviando…' : token ? 'Guardar contraseña' : 'Enviar enlace'}
        </button>
      </form>
      <a href={`${returnPath}#login`} className="mt-6 inline-block text-sm font-semibold underline">
        Volver al inicio de sesión
      </a>
    </section>
  )
}
