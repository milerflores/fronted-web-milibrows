import type { PublicCatalog, Service, Stylist } from './types'

// Fuente compartida por las consultas públicas y las operaciones simuladas del panel.
export const stylists: Stylist[] = [
  {
    id: 'eva',
    name: 'Eva Torres',
    specialty: 'Diseño y laminado de cejas',
    active: true,
    serviceIds: ['diseno', 'laminado', 'lifting', 'tinte', 'perfilado', 'micropigmentacion-labios'],
  },
  {
    id: 'scarlet',
    name: 'Scarlet Acosta',
    specialty: 'Lifting y perfilado',
    active: true,
    serviceIds: ['diseno', 'lifting', 'tinte', 'perfilado'],
  },
  {
    id: 'kimberly',
    name: 'Kimberly Mendoza',
    specialty: 'Laminado y diseño de cejas',
    active: true,
    serviceIds: ['diseno', 'laminado', 'lifting', 'tinte'],
  },
]

export const services: Service[] = [
  {
    id: 'diseno',
    name: 'Diseño de cejas',
    description: 'Diseño personalizado según el rostro.',
    price: 55,
    duration: 45,
    active: true,
  },
  {
    id: 'laminado',
    name: 'Laminado de cejas',
    description: 'Definición y peinado de cejas.',
    price: 120,
    duration: 75,
    active: true,
  },
  {
    id: 'lifting',
    name: 'Lifting de pestañas',
    description: 'Elevación y definición de pestañas.',
    price: 110,
    duration: 75,
    active: true,
  },
  {
    id: 'tinte',
    name: 'Tinte de cejas',
    description: 'Coloración de cejas.',
    price: 45,
    duration: 30,
    active: true,
  },
  {
    id: 'perfilado',
    name: 'Perfilado de cejas',
    description: 'Perfilado y limpieza de cejas.',
    price: 40,
    duration: 30,
    active: true,
  },
  {
    id: 'micropigmentacion-labios',
    name: 'Micropigmentación de labios',
    description: 'Definición y color semipermanente para realzar los labios.',
    price: 250,
    duration: 120,
    active: true,
  },
]

export async function getPublicCatalog(): Promise<PublicCatalog> {
  await new Promise((resolve) => setTimeout(resolve, 180))
  const activeServices = services.filter((service) => service.active)
  const activeIds = new Set(activeServices.map((service) => service.id))
  return {
    services: activeServices.map(({ id, name, description, price, duration }) => ({
      id,
      name,
      description,
      price,
      duration,
    })),
    stylists: stylists
      .filter((stylist) => stylist.active)
      .map(({ id, name, specialty, serviceIds }) => ({
        id,
        name,
        specialty,
        serviceIds: serviceIds.filter((serviceId) => activeIds.has(serviceId)),
      })),
  }
}
