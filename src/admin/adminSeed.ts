import { stylists } from '../shared/agenda/mockCatalogStore'

// Contactos iniciales del personal.
const contacts: Record<string, { phone: string; email: string }> = {
  eva: { phone: '987 000 101', email: 'eva@milibrows.com' },
  scarlet: { phone: '987 000 102', email: 'scarlet@milibrows.pe' },
  kimberly: { phone: '987 000 103', email: 'kimberly@milibrows.pe' },
}

for (const stylist of stylists) {
  const contact = contacts[stylist.id]
  if (contact) Object.assign(stylist, contact)
}
