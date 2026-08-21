import type { FranjaId, PresetId } from '../types'
import { franjaById } from './franjas'

// ── Datos de una hora de pronóstico ─────────────────────────────────────────
export interface HourData {
  hour: number // 0-23 hora local
  temp: number // °C
  apparent?: number // sensación térmica °C (puede faltar en caches viejos)
  rainProb: number | null // % (puede venir null de la API)
  precip: number // mm
  code: number // weathercode WMO
  wind: number // km/h sostenido
  gust: number // km/h ráfaga
  windFrom: number // grados DESDE donde viene el viento
}

// ── Motivos de NO GO ────────────────────────────────────────────────────────
export type MotivoTipo =
  | 'tormenta'
  | 'lluvia'
  | 'llovizna'
  | 'nieve'
  | 'rafagas'
  | 'viento'
  | 'frio'
  | 'calor'
  | 'lluvia-dia'

export interface Motivo {
  tipo: MotivoTipo
  valor: number // el número que disparó (km/h, °C, % según tipo)
  hora: number
}

// Orden de gravedad para elegir qué contar primero.
const SEVERIDAD: MotivoTipo[] = [
  'tormenta', 'nieve', 'rafagas', 'viento', 'lluvia', 'llovizna', 'frio', 'calor', 'lluvia-dia',
]
export function masGrave(a: Motivo, b: Motivo): number {
  return SEVERIDAD.indexOf(a.tipo) - SEVERIDAD.indexOf(b.tipo)
}

// ── Presets ─────────────────────────────────────────────────────────────────
// Umbrales apoyados en la escala Beaufort (ver docs/ANALISIS.md):
// 29-38 km/h trabajo duro · 39-49 desagradable · 50+ peligroso.
// Lluvia: prob. mínima (%) para bloquear cada categoría; 999 = esa categoría no bloquea.
export interface Umbrales {
  vientoMax: number
  rafagaMax: number
  tempMin: number
  tempMax: number
  probLluviaFuerte: number
  probLluviaLeve: number
  probLlovizna: number
  lluviaDiaEntero: boolean // Flojo: llovizna en cualquier momento del día = NO GO
}

export interface Preset {
  id: PresetId
  nombre: string
  emoji: string
  descripcion: string
  umbrales: Umbrales
}

export const PRESETS: Record<PresetId, Preset> = {
  flojo: {
    id: 'flojo',
    nombre: 'Flojo',
    emoji: '💅',
    descripcion: 'Salgo solo si está lindo. Ni llovizna en todo el día, ni viento pesado, ni frío.',
    umbrales: {
      vientoMax: 20, rafagaMax: 30, tempMin: 10, tempMax: 28,
      probLluviaFuerte: 30, probLluviaLeve: 30, probLlovizna: 30,
      lluviaDiaEntero: true,
    },
  },
  promedio: {
    id: 'promedio',
    nombre: 'Promedio',
    emoji: '🚴',
    descripcion: 'Soy un pibe común: me banco fresco y algo de viento, pero si llueve en mi horario, no salgo.',
    umbrales: {
      vientoMax: 30, rafagaMax: 40, tempMin: 5, tempMax: 30,
      probLluviaFuerte: 40, probLluviaLeve: 40, probLlovizna: 60,
      lluviaDiaEntero: false,
    },
  },
  extremo: {
    id: 'extremo',
    nombre: 'Extremo',
    emoji: '🥚',
    descripcion: 'Salgo casi siempre, llovizna incluida. Me frenan las tormentas, las ráfagas fuertes y la lluvia en serio.',
    umbrales: {
      vientoMax: 40, rafagaMax: 50, tempMin: 1, tempMax: 34,
      probLluviaFuerte: 40, probLluviaLeve: 999, probLlovizna: 999,
      lluviaDiaEntero: false,
    },
  },
}

// ── Clasificación de weathercodes WMO ───────────────────────────────────────
export type CatLluvia = 'tormenta' | 'fuerte' | 'leve' | 'llovizna' | 'nieve' | null

export function catLluvia(code: number): CatLluvia {
  if ([95, 96, 99].includes(code)) return 'tormenta'
  if ([63, 65, 66, 67, 81, 82].includes(code)) return 'fuerte'
  if ([61, 80].includes(code)) return 'leve'
  if ([51, 53, 55, 56, 57].includes(code)) return 'llovizna'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'nieve'
  return null
}

// Rango de "qué tan feo" es un código, para elegir el ícono dominante del tramo.
export function rankCode(code: number): number {
  const cat = catLluvia(code)
  if (cat === 'tormenta') return 6
  if (cat === 'nieve') return 5.5
  if (cat === 'fuerte') return 5
  if (cat === 'leve') return 4
  if (cat === 'llovizna') return 3
  if ([45, 48].includes(code)) return 2 // niebla
  if (code === 3) return 1.5 // nublado
  if ([1, 2].includes(code)) return 1 // parcial
  return 0 // despejado
}

// ── Viento relativo al rumbo ────────────────────────────────────────────────
export type Rel = 'frente' | 'cruzado' | 'cola'

// heading = hacia dónde vas; windFrom = desde dónde viene el viento.
// Si el viento viene desde donde vas (windFrom ≈ heading), lo tenés de frente.
export function windRel(heading: number, windFrom: number): Rel {
  const delta = Math.abs(((windFrom - heading + 540) % 360) - 180)
  // delta 0 = viene de donde apuntás (frente); delta 180 = de atrás (cola)
  if (delta <= 60) return 'frente'
  if (delta >= 120) return 'cola'
  return 'cruzado'
}

// ── Evaluación ──────────────────────────────────────────────────────────────
export function evalHour(h: HourData, u: Umbrales): Motivo[] {
  const motivos: Motivo[] = []
  const prob = h.rainProb ?? 100
  const cat = catLluvia(h.code)

  if (cat === 'tormenta' && prob >= 20) motivos.push({ tipo: 'tormenta', valor: prob, hora: h.hour })
  if (cat === 'nieve') motivos.push({ tipo: 'nieve', valor: h.temp, hora: h.hour })
  if (cat === 'fuerte' && prob >= u.probLluviaFuerte) motivos.push({ tipo: 'lluvia', valor: prob, hora: h.hour })
  if (cat === 'leve' && prob >= u.probLluviaLeve) motivos.push({ tipo: 'lluvia', valor: prob, hora: h.hour })
  if (cat === 'llovizna' && prob >= u.probLlovizna) motivos.push({ tipo: 'llovizna', valor: prob, hora: h.hour })
  if (h.gust >= u.rafagaMax) motivos.push({ tipo: 'rafagas', valor: Math.round(h.gust), hora: h.hour })
  if (h.wind >= u.vientoMax) motivos.push({ tipo: 'viento', valor: Math.round(h.wind), hora: h.hour })
  // floor/ceil para que el número mostrado nunca contradiga el umbral
  // (7.6° con umbral "< 8" debe decir 7°, no 8°)
  if (h.temp < u.tempMin) motivos.push({ tipo: 'frio', valor: Math.floor(h.temp), hora: h.hour })
  if (h.temp > u.tempMax) motivos.push({ tipo: 'calor', valor: Math.ceil(h.temp), hora: h.hour })
  return motivos
}

export interface TramoEval {
  go: boolean
  motivos: Motivo[] // el peor por tipo, ordenados por gravedad
  temp: { min: number; max: number }
  viento: { max: number; gustMax: number; rel: Rel }
  lluvia: { probMax: number; cat: CatLluvia }
  codeDominante: number
}

export function evalTramo(hours: HourData[], heading: number, u: Umbrales): TramoEval {
  const porTipo = new Map<MotivoTipo, Motivo>()
  for (const h of hours) {
    for (const m of evalHour(h, u)) {
      const prev = porTipo.get(m.tipo)
      if (!prev || m.valor > prev.valor) porTipo.set(m.tipo, m)
    }
  }
  const motivos = [...porTipo.values()].sort(masGrave)

  const temps = hours.map((h) => h.temp)
  const peorViento = hours.reduce((a, b) => (b.wind > a.wind ? b : a), hours[0])
  const peorCode = hours.reduce((a, b) => (rankCode(b.code) > rankCode(a.code) ? b : a), hours[0])
  const probMax = Math.max(...hours.map((h) => h.rainProb ?? 0))

  return {
    go: motivos.length === 0,
    motivos,
    temp: { min: Math.min(...temps), max: Math.max(...temps) },
    viento: {
      max: Math.round(Math.max(...hours.map((h) => h.wind))),
      gustMax: Math.round(Math.max(...hours.map((h) => h.gust))),
      rel: windRel(heading, peorViento.windFrom),
    },
    lluvia: { probMax, cat: catLluvia(peorCode.code) },
    codeDominante: peorCode.code,
  }
}

export interface DiaEval {
  go: boolean
  ida: TramoEval
  vuelta: TramoEval
  motivosDia: Motivo[] // extra del preset Flojo: lluvia fuera de las franjas
}

export function horasDeFranja(dayHours: HourData[], franjaId: FranjaId): HourData[] {
  const f = franjaById(franjaId)
  return dayHours.filter((h) => h.hour >= f.desde && h.hour < f.hasta)
}

export function evalDia(
  dayHours: HourData[],
  franjaIda: FranjaId,
  franjaVuelta: FranjaId,
  headingIda: number,
  presetId: PresetId,
): DiaEval {
  const u = PRESETS[presetId].umbrales
  const ida = evalTramo(horasDeFranja(dayHours, franjaIda), headingIda, u)
  const vuelta = evalTramo(horasDeFranja(dayHours, franjaVuelta), (headingIda + 180) % 360, u)

  const motivosDia: Motivo[] = []
  if (u.lluviaDiaEntero) {
    for (const h of dayHours.filter((h) => h.hour >= 6 && h.hour <= 22)) {
      const cat = catLluvia(h.code)
      const prob = h.rainProb ?? 100
      if (cat && cat !== 'nieve' && prob >= 30) {
        motivosDia.push({ tipo: 'lluvia-dia', valor: prob, hora: h.hour })
        break
      }
    }
  }

  return { go: ida.go && vuelta.go && motivosDia.length === 0, ida, vuelta, motivosDia }
}
