import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request, resource } from '../api/http'
import { finishMfa, signOut } from '../agenda/authService'
import type { Session } from '../agenda/authService'
import { Feedback, Field } from './Forms'

export function MfaPanel({ session, onDone }: { session: Session; onDone?: () => void }) {
  const [svg, setSvg] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState(false)
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
      if (!session.mfaConfigured && !svg) {
        await request('/acceso/segundo-factor/activar', 'POST', { contrasena: password })
        setSvg((await resource<{ svg: string }>('/acceso/segundo-factor/qr')).svg)
        setPassword('')
      } else if (!session.mfaConfigured) {
        setCodes(
          (
            await resource<{ codigos_recuperacion: string[] }>(
              '/acceso/segundo-factor/confirmar',
              'POST',
              { codigo: code },
            )
          ).codigos_recuperacion,
        )
        setSvg('')
        setCode('')
      } else {
        await request(
          '/acceso/segundo-factor/verificar',
          'POST',
          recovery ? { codigo_recuperacion: code } : { codigo: code },
        )
        await finishMfa()
        onDone?.()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo verificar el segundo factor.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <section className="api-panel mx-auto w-full max-w-xl">
      <h1 className="font-display text-3xl">Protege tu acceso</h1>
      {codes.length ? (
        <>
          <p className="mt-4 text-sm text-stone">
            Guarda estos códigos de recuperación en un lugar privado. Cada uno sirve una sola vez.
          </p>
          <ul className="my-6 grid grid-cols-2 gap-3 rounded-card bg-sand p-4 font-mono text-sm">
            {codes.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
          <Feedback error={error} />
          <button
            className="api-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await finishMfa()
                onDone?.()
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'No se pudo recuperar la sesión.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Ya guardé mis códigos
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-5" aria-busy={busy}>
          <p className="text-sm text-stone">
            {session.mfaConfigured
              ? 'Verifica tu segundo factor para continuar.'
              : 'Configura una aplicación de autenticación para verificar tus próximos accesos.'}
          </p>
          {svg && (
            <img
              className="mx-auto size-56 max-w-full"
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              alt="QR para configurar la aplicación de autenticación"
            />
          )}
          {!session.mfaConfigured && !svg ? (
            <Field
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : (
            <Field
              label={recovery ? 'Código de recuperación' : 'Código de 6 dígitos'}
              autoComplete="one-time-code"
              inputMode={recovery ? 'text' : 'numeric'}
              pattern={recovery ? undefined : '[0-9]{6}'}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          )}
          {session.mfaConfigured && (
            <button
              type="button"
              className="text-sm font-semibold underline"
              onClick={() => {
                setRecovery(!recovery)
                setCode('')
              }}
            >
              {recovery ? 'Usar aplicación de autenticación' : 'Usar código de recuperación'}
            </button>
          )}
          <Feedback error={error} />
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="api-primary">
              {busy
                ? 'Verificando…'
                : !session.mfaConfigured && !svg
                  ? 'Configurar segundo factor'
                  : 'Verificar'}
            </button>
            <button
              type="button"
              disabled={busy}
              className="api-secondary"
              onClick={() => {
                void signOut().catch((cause: Error) => setError(cause.message))
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
