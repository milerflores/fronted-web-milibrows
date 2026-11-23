import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { ScheduleDto } from '../../shared/api/types'
import { Feedback } from '../../shared/components/Forms'

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function ScheduleEditor({
  initial,
  onSave,
}: {
  initial: ScheduleDto[]
  onSave: (rows: ScheduleDto[]) => Promise<void>
}) {
  const [rows, setRows] = useState(
    initial.map((row) => ({
      dia_semana: row.dia_semana,
      hora_inicio: row.hora_inicio.slice(0, 5),
      hora_fin: row.hora_fin.slice(0, 5),
    })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const saving = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (rows.some((row) => row.hora_fin <= row.hora_inicio)) {
      setError('Cada tramo debe terminar después de su inicio.')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await onSave(rows)
      setNotice('Horario guardado correctamente.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el horario.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  function change(index: number, field: keyof ScheduleDto, value: string | number) {
    setRows((current) =>
      current.map((row, position) => (position === index ? { ...row, [field]: value } : row)),
    )
    setNotice('')
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-stone">
        Agrega los tramos de atención de cada día. Puedes registrar dos tramos para incluir una
        pausa. Los días sin tramos quedarán cerrados. Horas del estudio en Lima.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-card border border-line p-4 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
          >
            <label className="text-sm">
              Día
              <select
                className="api-input mt-2"
                value={row.dia_semana}
                onChange={(event) => change(index, 'dia_semana', Number(event.target.value))}
              >
                {days.map((day, value) => (
                  <option value={value + 1} key={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Desde
              <input
                className="api-input mt-2"
                type="time"
                required
                value={row.hora_inicio}
                onChange={(event) => change(index, 'hora_inicio', event.target.value)}
              />
            </label>
            <label className="text-sm">
              Hasta
              <input
                className="api-input mt-2"
                type="time"
                required
                value={row.hora_fin}
                onChange={(event) => change(index, 'hora_fin', event.target.value)}
              />
            </label>
            <button
              type="button"
              className="api-secondary self-end"
              onClick={() =>
                setRows((current) => current.filter((_, position) => position !== index))
              }
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={rows.length >= 42}
          className="api-secondary"
          onClick={() =>
            setRows([...rows, { dia_semana: 1, hora_inicio: '10:00', hora_fin: '22:00' }])
          }
        >
          Agregar tramo
        </button>
      </fieldset>
      <Feedback error={error} notice={notice} />
      <button className="api-primary" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar horario'}
      </button>
    </form>
  )
}
