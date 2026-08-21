import type { PresetId, VehiculoId } from '../types'
import {
  SIN_FACTORES,
  type ConfigEval,
  type FactoresDireccion,
  type Umbrales,
} from './verdict'

// Los 5 vehículos y sus sensibilidades (definidas por Pablo).
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

// ── MATRIZ vehículo × conductor ─────────────────────────────────────────────
// Números y reglas de docs/LOGICA-CLIMA-MATRIZ (investigación con fuentes:
// Beaufort, Cycling UK, ACSM, Bosch, Xiaomi/Segway, NHTSA/MSF). La jerarquía
// entre vehículos está respaldada por evidencia; los valores exactos son
// política de producto auditable. Bici urbana = baseline elegido por Pablo.
interface ConfigVehiculo {
  factores: FactoresDireccion
  comboAmarillo: number
  comboAmarilloCruzado?: number // si difiere del base (moto)
  pisoMojado: boolean
  umbrales: Record<PresetId, Umbrales>
}

const MATRIZ: Record<VehiculoId, ConfigVehiculo> = {
  bici: {
    factores: SIN_FACTORES,
    comboAmarillo: 0.75,
    pisoMojado: false,
    umbrales: {
      flojo: { vientoMax: 20, rafagaMax: 30, tempMin: 10, tempMax: 28, probLluviaFuerte: 30, probLluviaLeve: 30, probLlovizna: 30, lluviaDiaEntero: true },
      promedio: { vientoMax: 30, rafagaMax: 40, tempMin: 5, tempMax: 30, probLluviaFuerte: 40, probLluviaLeve: 40, probLlovizna: 60, lluviaDiaEntero: false },
      extremo: { vientoMax: 40, rafagaMax: 50, tempMin: 1, tempMax: 34, probLluviaFuerte: 40, probLluviaLeve: 999, probLlovizna: 999, lluviaDiaEntero: false },
    },
  },
  deportivo: {
    // el viento de frente arruina el entrenamiento; el cruzado desestabiliza
    factores: { frenteViento: 0.85, frenteRafaga: 1, cruzadoViento: 0.9, cruzadoRafaga: 0.85 },
    comboAmarillo: 0.7,
    pisoMojado: false,
    umbrales: {
      flojo: { vientoMax: 20, rafagaMax: 30, tempMin: 8, tempMax: 26, probLluviaFuerte: 25, probLluviaLeve: 25, probLlovizna: 40, lluviaDiaEntero: true },
      promedio: { vientoMax: 30, rafagaMax: 40, tempMin: 3, tempMax: 29, probLluviaFuerte: 35, probLluviaLeve: 40, probLlovizna: 60, lluviaDiaEntero: false },
      extremo: { vientoMax: 40, rafagaMax: 50, tempMin: -2, tempMax: 32, probLluviaFuerte: 40, probLluviaLeve: 999, probLlovizna: 999, lluviaDiaEntero: false },
    },
  },
  ebike: {
    // el motor banca más viento sostenido; la ráfaga desestabiliza igual
    factores: SIN_FACTORES,
    comboAmarillo: 0.75,
    pisoMojado: false,
    umbrales: {
      flojo: { vientoMax: 25, rafagaMax: 30, tempMin: 12, tempMax: 30, probLluviaFuerte: 30, probLluviaLeve: 30, probLlovizna: 30, lluviaDiaEntero: true },
      promedio: { vientoMax: 35, rafagaMax: 40, tempMin: 7, tempMax: 32, probLluviaFuerte: 40, probLluviaLeve: 40, probLlovizna: 60, lluviaDiaEntero: false },
      extremo: { vientoMax: 45, rafagaMax: 50, tempMin: 3, tempMax: 35, probLluviaFuerte: 40, probLluviaLeve: 999, probLlovizna: 999, lluviaDiaEntero: false },
    },
  },
  monopatin: {
    // ruedas chicas: ráfagas y cruzado más estrictos, piso mojado prohibido
    factores: { frenteViento: 1, frenteRafaga: 1, cruzadoViento: 0.85, cruzadoRafaga: 0.8 },
    comboAmarillo: 0.65,
    pisoMojado: true,
    umbrales: {
      flojo: { vientoMax: 20, rafagaMax: 25, tempMin: 12, tempMax: 30, probLluviaFuerte: 20, probLluviaLeve: 25, probLlovizna: 40, lluviaDiaEntero: true },
      promedio: { vientoMax: 30, rafagaMax: 35, tempMin: 8, tempMax: 32, probLluviaFuerte: 30, probLluviaLeve: 35, probLlovizna: 60, lluviaDiaEntero: false },
      extremo: { vientoMax: 40, rafagaMax: 45, tempMin: 4, tempMax: 35, probLluviaFuerte: 40, probLluviaLeve: 50, probLlovizna: 999, lluviaDiaEntero: false },
    },
  },
  moto: {
    // tolera más viento total, pero el cruzado fuerte pega; frío endurecido
    // porque la sensación no incluye el aire de avanzar a velocidad de moto
    factores: { frenteViento: 1, frenteRafaga: 1, cruzadoViento: 0.8, cruzadoRafaga: 0.85 },
    comboAmarillo: 0.75,
    comboAmarilloCruzado: 0.7,
    pisoMojado: false,
    umbrales: {
      flojo: { vientoMax: 30, rafagaMax: 45, tempMin: 12, tempMax: 28, probLluviaFuerte: 25, probLluviaLeve: 35, probLlovizna: 50, lluviaDiaEntero: true },
      promedio: { vientoMax: 40, rafagaMax: 55, tempMin: 8, tempMax: 31, probLluviaFuerte: 35, probLluviaLeve: 50, probLlovizna: 70, lluviaDiaEntero: false },
      extremo: { vientoMax: 50, rafagaMax: 65, tempMin: 4, tempMax: 34, probLluviaFuerte: 40, probLluviaLeve: 999, probLlovizna: 999, lluviaDiaEntero: false },
    },
  },
}

// Arma la configuración que consume el motor (verdict.evalDia).
export function configEval(v: VehiculoId, p: PresetId): ConfigEval {
  const m = MATRIZ[v]
  return {
    umbrales: m.umbrales[p],
    factores: m.factores,
    comboAmarillo: m.comboAmarillo,
    comboAmarilloCruzado: m.comboAmarilloCruzado ?? m.comboAmarillo,
    pisoMojado: m.pisoMojado,
  }
}

export function umbralesDe(v: VehiculoId): Record<PresetId, Umbrales> {
  return MATRIZ[v].umbrales
}

export function reglasExtraDe(v: VehiculoId): string[] {
  const m = MATRIZ[v]
  const notas: string[] = []
  const f = m.factores
  if (f.frenteViento < 1)
    notas.push(`Con viento de frente, tu límite de viento baja al ${Math.round(f.frenteViento * 100)}%.`)
  if (f.cruzadoViento < 1 || f.cruzadoRafaga < 1)
    notas.push(
      `Con viento cruzado, tus límites bajan al ${Math.round(f.cruzadoViento * 100)}% (viento) y ${Math.round(f.cruzadoRafaga * 100)}% (ráfagas).`,
    )
  if (m.pisoMojado)
    notas.push('Piso mojado (llueve, o llovió en las 2 horas previas): no se sale, sin excepción.')
  return notas
}
