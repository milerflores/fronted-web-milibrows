export type AppointmentStatus = 'confirmada' | 'completada' | 'cancelada' | 'no asistió'

export type DemoActor =
  | { role: 'administrador' | 'recepcionista' }
  | { role: 'estilista'; stylistId: string }

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  preferences?: string
}

export interface DemoClientAccount {
  id: string
  role: 'cliente'
  clientId: string
}

export interface DemoClientIdentity extends DemoClientAccount {
  name: string
  phone: string
  email: string
}

export type ClientAppointment = Pick<
  Appointment,
  | 'id'
  | 'clientId'
  | 'stylistId'
  | 'date'
  | 'startTime'
  | 'status'
  | 'services'
  | 'notes'
  | 'cancellationReason'
> & { stylistName: string }

export interface ClientSelfProfile {
  client: Client
  completed: ClientAppointment[]
}

export interface ClientInput {
  name: string
  phone: string
  email: string
  preferences?: string
}

export interface ClientRecordResult {
  client: Client
  data: AgendaData
}

export interface ClientProfile {
  client: Client
  upcoming: Appointment[]
  completed: Appointment[]
}

export interface Stylist {
  id: string
  name: string
  phone?: string
  email?: string
  specialty?: string
  active: boolean
  serviceIds: string[]
}

export interface StylistInput {
  name: string
  phone: string
  email: string
  specialty: string
  serviceIds: string[]
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  active: boolean
}

export type PublicService = Pick<Service, 'id' | 'name' | 'description' | 'price' | 'duration'>
export type PublicStylist = Pick<Stylist, 'id' | 'name' | 'specialty' | 'serviceIds'>

export interface PublicCatalog {
  services: PublicService[]
  stylists: PublicStylist[]
}

export interface ServiceInput {
  name: string
  description: string
  price: number
  duration: number
}

export interface CatalogResult<T extends Service | Stylist> {
  record: T
  data: AgendaData
}

export interface AppointmentService {
  serviceId: string
  serviceName: string
  agreedPrice: number
  agreedDuration: number
}

export interface Appointment {
  id: string
  clientId: string
  stylistId: string
  date: string
  startTime: string
  status: AppointmentStatus
  services: AppointmentService[]
  notes?: string
  origin?: 'panel' | 'web'
  createdByClientAccountId?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: DemoActor | DemoClientAccount
  rescheduledAt?: string
  rescheduledBy?: DemoActor | DemoClientAccount
  completedAt?: string
  completedBy?: DemoActor
  completionNotes?: string
  noShowAt?: string
  noShowBy?: DemoActor
  noShowNotes?: string
}

export type AppointmentClientInput =
  | { kind: 'existing'; clientId: string }
  | { kind: 'new'; name: string; phone: string; email: string }

export interface NewAppointmentInput {
  client: AppointmentClientInput
  serviceIds: string[]
  stylistId: string
  date: string
  startTime: string
  notes: string
}

export type ClientBookingInput = Omit<NewAppointmentInput, 'client'>

export interface ClientBookingResult {
  appointment: Appointment
  client: DemoClientIdentity
}

export interface CreatedAppointment {
  appointment: Appointment
  data: AgendaData
}

export interface RescheduleInput {
  appointmentId: string
  date: string
  startTime: string
  stylistId: string
}

export interface AgendaData {
  clients: Client[]
  stylists: Stylist[]
  services: Service[]
  appointments: Appointment[]
}
