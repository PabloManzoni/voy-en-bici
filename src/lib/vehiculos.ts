import type { VehiculoId } from '../types'

// Los 5 vehículos y sus sensibilidades (definidas por Pablo).
// OJO: por ahora todos usan los umbrales de bici urbana — la matriz de
// ajustes vehículo × conductor está en camino (ver docs/LOGICA-CLIMA.md).
export interface Vehiculo {
  id: VehiculoId
  nombre: string
  emoji: string
  descripcion: string
}

export const VEHICULOS: Record<VehiculoId, Vehiculo> = {
  bici: {
    id: 'bici',
    nombre: 'Bici urbana',
    emoji: '🚲',
    descripcion: 'Le importan viento, lluvia y temperatura.',
  },
  deportivo: {
    id: 'deportivo',
    nombre: 'Ciclismo deportivo',
    emoji: '🚴',
    descripcion: 'Mucho más sensible al viento sostenido, las ráfagas y su dirección.',
  },
  ebike: {
    id: 'ebike',
    nombre: 'E-bike',
    emoji: '⚡',
    descripcion: 'El viento pesa menos en el esfuerzo, pero sí en estabilidad y autonomía.',
  },
  monopatin: {
    id: 'monopatin',
    nombre: 'Monopatín / scooter',
    emoji: '🛴',
    descripcion: 'Muy sensible a las ráfagas y al piso mojado.',
  },
  moto: {
    id: 'moto',
    nombre: 'Moto / ciclomotor',
    emoji: '🛵',
    descripcion: 'Aguanta más, pero el viento lateral fuerte importa.',
  },
}
