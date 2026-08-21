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

// Un lugar elegido para un recorrido: nombre + coordenadas.
// Puede venir de la lista local o del geocoder online.
export interface Lugar {
  nombre: string
  detalle?: string // "Montevideo" / "Canelones" / "Buenos Aires, Argentina"
  lat: number
  lon: number
}

export interface Recorrido {
  id: string
  nombre: string
  origen: Lugar
  destino: Lugar
  franjaIda: FranjaId
  franjaVuelta: FranjaId
}

export type PresetId = 'flojo' | 'promedio' | 'extremo'

export type VehiculoId = 'bici' | 'deportivo' | 'ebike' | 'monopatin' | 'moto'
