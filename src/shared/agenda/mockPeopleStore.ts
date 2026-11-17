import type { Client } from './types'

// Personas compartidas por la agenda y las cuentas simuladas dentro de cada aplicación.
export const clients: Client[] = [
  { id: 'c1', name: 'Valeria Rojas', phone: '987 214 603', email: 'valeria.rojas@correo.pe' },
  { id: 'c2', name: 'Camila Paredes', phone: '964 582 117', email: 'camila.paredes@correo.pe' },
  { id: 'c3', name: 'Lucía Herrera', phone: '953 104 862', email: 'lucia.herrera@correo.pe' },
  { id: 'c4', name: 'Andrea Salazar', phone: '979 335 248', email: 'andrea.salazar@correo.pe' },
  { id: 'c5', name: 'Mariana Flores', phone: '942 711 590', email: 'mariana.flores@correo.pe' },
  { id: 'c6', name: 'Daniela Vega', phone: '986 408 133', email: 'daniela.vega@correo.pe' },
  { id: 'c7', name: 'Sofía Castillo', phone: '951 672 409', email: 'sofia.castillo@correo.pe' },
  { id: 'c8', name: 'Paola Núñez', phone: '970 119 384', email: 'paola.nunez@correo.pe' },
]

export interface StaffPerson {
  id: string
  name: string
  phone: string
  contactEmail: string
}

export const staffPeople: StaffPerson[] = [
  {
    id: 'p-admin',
    name: 'Administración MiliBrows',
    phone: '987 000 100',
    contactEmail: 'admin@milibrows.com',
  },
  {
    id: 'p-recepcion',
    name: 'Recepción MiliBrows',
    phone: '987 000 104',
    contactEmail: 'recepcion@milibrows.com',
  },
]
