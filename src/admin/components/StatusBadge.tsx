import type { AppointmentStatus } from '../../shared/agenda/types'

const statusClasses: Record<AppointmentStatus, string> = {
  confirmada: 'bg-[#F8EFD3] text-[#705917]',
  completada: 'bg-[#E7EBDD] text-sage-dark',
  cancelada: 'bg-[#F5E8E2] text-caramel-dark',
  'no asistió': 'bg-sand text-stone',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-base font-semibold whitespace-nowrap ${statusClasses[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
