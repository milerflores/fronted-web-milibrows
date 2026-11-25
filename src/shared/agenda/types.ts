export type AppointmentStatus = 'confirmada' | 'completada' | 'cancelada' | 'no asistió'

export type Actor =
  | { role: 'administrador' | 'recepcionista' }
  | { role: 'estilista'; stylistId: string }

export interface Client {
  id: string
  dni?: string
  name: string
  firstName: string
  paternalLastName: string
  maternalLastName?: string
  phone: string
  email: string
  preferences?: string
  active?: boolean
}

export interface ClientInput {
  dni?: string
  firstName: string
  paternalLastName: string
  maternalLastName?: string
  phone: string
  email: string
  preferences?: string
  active?: boolean
}

export interface ClientRecordResult {
  client: Client
}
export interface ClientProfile {
  client: Client
  upcoming: Appointment[]
  completed: Appointment[]
}

export interface Stylist {
  id: string
  name: string
  active: boolean
  serviceIds: string[]
}

export interface PublicStylist {
  id: string
  name: string
  specialty?: string
  imageUrl?: string
  serviceIds: string[]
}

export interface Service {
  id: string
  description?: string
  imageUrl?: string
  visible?: boolean
  name: string
  price: number
  duration: number
  active: boolean
}
export type PublicService = Service

export interface AppointmentService {
  id: string
  serviceId: string
  stylistId: string
  stylistName: string
  startTime: string
  serviceName: string
  listPrice: number
  automaticDiscount: number
  agreedPrice: number
  agreedDuration: number
  result: 'pendiente' | 'en_proceso' | 'realizado' | 'cancelado' | 'no_realizado'
  resultReason?: string
  manualDiscount?: {
    amount: number
    reason?: string
    note?: string
  }
}

export interface AppointmentPayment {
  id: string
  methodName: string
  amount: number
  paidAt: string
  reference?: string
  status: 'registrado' | 'anulado'
}

export interface Appointment {
  id: string
  clientId: string
  stylistId: string
  stylistIds: string[]
  stylistName: string
  date: string
  startTime: string
  startsAt: string
  status: AppointmentStatus
  services: AppointmentService[]
  payments: AppointmentPayment[]
  totalRealized: number
  totalPaid: number
  pendingBalance: number
  client?: Client
  cancellationReason?: string
  completedAt?: string
  completionNotes?: string
  events?: { type: string; date: string; reason?: string }[]
}

export interface CreatedAppointment {
  appointment: Appointment
}
export interface AgendaData {
  clients: Client[]
  stylists: Stylist[]
  appointments: Appointment[]
}
