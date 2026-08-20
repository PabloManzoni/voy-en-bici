export type FranjaId = 'madrugada' | 'manana' | 'mediodia' | 'mediatarde' | 'tarde' | 'noche'

export interface Franja {
  id: FranjaId
  label: string
  horas: string // "8–11", para mostrar
  desde: number // hora inclusive
  hasta: number // hora exclusive
}

export interface Barrio {
  id: string
  nombre: string
  depto: 'Montevideo' | 'Canelones' | 'San José'
  lat: number
  lon: number
}

export interface Recorrido {
  id: string
  nombre: string
  origenId: string
  destinoId: string
  franjaIda: FranjaId
  franjaVuelta: FranjaId
}

export type PresetId = 'flojo' | 'promedio' | 'extremo'
