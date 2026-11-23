import type { AvailabilityDto } from '../api/types'
import { studioDateTime } from './dates'

export function availableStartTimes(
  employee: AvailabilityDto | undefined,
  preferredStart?: string,
): string[] {
  if (!employee) return []
  const slots = new Set<string>()
  const duration = employee.duracion_minutos * 60_000
  const preferred = preferredStart ? new Date(preferredStart).getTime() : NaN
  for (const interval of employee.intervalos) {
    const from = new Date(interval.fecha_inicio).getTime()
    const until = new Date(interval.fecha_fin).getTime()
    const firstMinute = Math.ceil(from / 60_000) * 60_000
    for (let start = firstMinute; start + duration <= until; start += 30 * 60_000) {
      slots.add(studioDateTime(new Date(start)).time)
    }
    if (preferred >= from && preferred + duration <= until) {
      slots.add(studioDateTime(new Date(preferred)).time)
    }
  }
  return [...slots].sort()
}
