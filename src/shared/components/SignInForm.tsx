import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { signIn } from '../agenda/mockAuthService'
import type { Session } from '../agenda/mockAuthService'

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
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo de acceso válido.')
      return
    }
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
    <form noValidate onSubmit={submit} className="space-y-5" aria-busy={saving}>
      <div>
        <label htmlFor={`${area}-access-email`} className="text-sm font-semibold">
          Correo de acceso
        </label>
        <input
          id={`${area}-access-email`}
          type="email"
          autoComplete="username"
          className="mt-2 block min-h-12 w-full rounded-[10px] border border-line bg-white px-4 text-graphite focus-visible:outline-2 focus-visible:outline-gold"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError('')
          }}
          required
        />
      </div>
      <div>
        <label htmlFor={`${area}-access-password`} className="text-sm font-semibold">
          Contraseña
        </label>
        <div
          className={
            area === 'admin'
              ? 'admin-access-password-field mt-2 flex border-line'
              : 'mt-2 flex rounded-[10px] border border-line bg-white focus-within:outline-2 focus-within:outline-gold'
          }
        >
          <input
            id={`${area}-access-password`}
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            className={
              area === 'admin'
                ? 'min-h-12 min-w-0 flex-1 outline-none'
                : 'min-h-12 min-w-0 flex-1 rounded-[10px] px-4 text-graphite outline-none'
            }
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
            required
          />
          <button
            type="button"
            className={
              area === 'admin'
                ? 'admin-access-visibility'
                : 'px-4 text-sm font-semibold text-stone hover:text-graphite'
            }
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-[#F7EBE5] p-3 text-sm text-caramel-dark">
          {error}
        </p>
      )}
      <div className={area === 'client' ? 'pt-4' : undefined}>
        <button
          type="submit"
          disabled={saving}
          className={`min-h-12 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-graphite hover:bg-champagne focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60${area === 'client' ? ' client-sign-in-submit' : ''}`}
        >
          {saving ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </div>
    </form>
  )
}
