import type { Franja, FranjaId } from '../types'

export const FRANJAS: Franja[] = [
  { id: 'madrugada', label: 'Madrugada', horas: '5–8', desde: 5, hasta: 8 },
  { id: 'manana', label: 'Mañana', horas: '8–11', desde: 8, hasta: 11 },
  { id: 'mediodia', label: 'Mediodía', horas: '11–14', desde: 11, hasta: 14 },
  { id: 'mediatarde', label: 'Media tarde', horas: '14–17', desde: 14, hasta: 17 },
  { id: 'tarde', label: 'Tarde', horas: '17–20', desde: 17, hasta: 20 },
  { id: 'noche', label: 'Noche', horas: '20–23', desde: 20, hasta: 23 },
]

export function franjaById(id: FranjaId): Franja {
  return FRANJAS.find((f) => f.id === id)!
}
