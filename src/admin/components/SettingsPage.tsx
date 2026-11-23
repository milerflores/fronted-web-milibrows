import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { resource } from '../../shared/api/http'
import { useApi } from '../../shared/api/useApi'
import type { ScheduleDto, StudioConfigDto } from '../../shared/api/types'
import { Feedback, Field } from '../../shared/components/Forms'
import { ScheduleEditor } from './ScheduleEditor'

function StudioEditor({ initial }: { initial: StudioConfigDto }) {
  const [name, setName] = useState(initial.nombre_estudio)
  const [rate, setRate] = useState(initial.monto_por_punto)
  const [channel, setChannel] = useState(initial.canal_notificacion ?? '')
  const [minutes, setMinutes] = useState(String(initial.anticipacion_recordatorio_min))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await resource('/configuracion/estudio', 'PUT', {
        nombre_estudio: name.trim(),
        monto_por_punto: rate,
        canal_notificacion: channel || null,
        anticipacion_recordatorio_min: Number(minutes),
      })
      setNotice('Configuración del estudio guardada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la configuración.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nombre del estudio"
          maxLength={255}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          label="Soles por punto de fidelización"
          type="number"
          min="0.01"
          max="9999999999.99"
          step="0.01"
          required
          value={rate}
          onChange={(event) => setRate(event.target.value)}
        />
      </div>
      <label className="block text-sm font-semibold">
        Canal de avisos
        <select
          className="api-input mt-2"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
        >
          <option value="">Avisos desactivados</option>
          <option value="correo">Correo electrónico</option>
        </select>
      </label>
      <Field
        label="Anticipación del recordatorio en minutos"
        type="number"
        min="1"
        max="10080"
        step="1"
        required
        value={minutes}
        onChange={(event) => setMinutes(event.target.value)}
      />
      <Feedback error={error} notice={notice} />
      <button className="api-primary" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  )
}

export function SettingsPage() {
  const schedule = useApi<ScheduleDto[]>('/configuracion/horario-estudio')
  const config = useApi<StudioConfigDto>('/configuracion/estudio')
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8">
      <h1 className="font-display text-3xl">Configuración del estudio</h1>
      <section className="api-panel">
        <h2 className="mb-6 font-display text-2xl">Horario de atención</h2>
        <Feedback loading={schedule.loading} error={schedule.error} onRetry={schedule.reload} />
        {schedule.data && (
          <ScheduleEditor
            initial={schedule.data}
            onSave={async (rows) => {
              await resource('/configuracion/horario-estudio', 'PUT', { horario: rows })
            }}
          />
        )}
      </section>
      <section className="api-panel">
        <h2 className="font-display text-2xl">Estudio, puntos y recordatorios</h2>
        <Feedback loading={config.loading} error={config.error} onRetry={config.reload} />
        {config.data && <StudioEditor initial={config.data} />}
      </section>
    </main>
  )
}
