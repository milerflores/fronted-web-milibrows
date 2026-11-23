import { useState } from 'react'
import { saveAppointment } from '../../shared/agenda/agendaService'
import { useAuth } from '../../shared/agenda/useAuth'
import type { Appointment } from '../../shared/agenda/types'
import { BookingForm } from '../../shared/components/BookingForm'
import { ServiceResults } from '../../shared/components/Forms'

export function BookingPage({
  initialServiceId,
  onRequireAuth,
}: {
  initialServiceId?: string
  onRequireAuth: () => void
}) {
  const { session } = useAuth()
  const [confirmation, setConfirmation] = useState<{
    appointment: Appointment
    accountId: string
  } | null>(null)
  const created =
    confirmation && confirmation.accountId === session?.id ? confirmation.appointment : null
  return (
    <main id="booking-content" className="client-container py-12 sm:py-18">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-4xl sm:text-5xl">
          {created ? 'Tu cita está confirmada' : 'Reserva tu próxima visita'}
        </h1>
        <div className="api-panel mt-8">
          {created ? (
            <>
              <p className="text-stone">
                Cita {created.id} · {created.date} · {created.startTime} · {created.stylistName}
              </p>
              <ServiceResults services={created.services} />
              <a className="api-primary mt-6" href={`#mis-citas/${created.id}`}>
                Ver mi cita
              </a>
              <button
                type="button"
                className="api-secondary ml-3 mt-6"
                onClick={() => setConfirmation(null)}
              >
                Reservar otra cita
              </button>
            </>
          ) : (
            <BookingForm
              initialServiceId={initialServiceId}
              signedIn={session?.role === 'cliente'}
              onRequireAuth={onRequireAuth}
              onSave={async (input) => {
                setConfirmation({
                  appointment: (await saveAppointment(input)).appointment,
                  accountId: session?.id ?? '',
                })
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}
