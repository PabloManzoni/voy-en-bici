import type { FranjaId, PresetId } from '../types'
import { franjaById } from './franjas'

// ── Datos de una hora de pronóstico ─────────────────────────────────────────
export interface HourData {
  hour: number // 0-23 hora local
  temp: number // °C
  apparent?: number // sensación térmica °C (puede faltar en caches viejos)
  rainProb: number | null // % (puede venir null de la API → se trata como 100)
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
  | 'piso-mojado'
  | 'rafagas'
  | 'viento'
  | 'frio'
  | 'calor'
  | 'combo'
  | 'lluvia-dia'

export interface Motivo {
  tipo: MotivoTipo
  valor: number // el número que disparó (km/h, °C, %, mm según tipo)
  hora: number
  partes?: string[] // solo 'combo': los factores que se juntaron
  rel?: Rel // viento/ráfagas: dirección relativa cuando el límite fue ajustado
  limite?: number // viento/ráfagas: límite EFECTIVO cuando difiere del base
}

// Orden de gravedad para elegir qué contar primero (sigue el orden del doc).
const SEVERIDAD: MotivoTipo[] = [
  'tormenta', 'nieve', 'piso-mojado', 'rafagas', 'viento', 'lluvia', 'llovizna',
  'frio', 'calor', 'combo', 'lluvia-dia',
]
export function masGrave(a: Motivo, b: Motivo): number {
  return SEVERIDAD.indexOf(a.tipo) - SEVERIDAD.indexOf(b.tipo)
}

// ── Perfiles de conductor (identidad; los números viven en la MATRIZ) ───────
export interface Preset {
  id: PresetId
  nombre: string
  emoji: string
  descripcion: string
}

export const PRESETS: Record<PresetId, Preset> = {
  flojo: {
    id: 'flojo',
    nombre: 'Flojo',
    emoji: '💅',
    descripcion: 'Salgo solo si está lindo. Ni llovizna en todo el día, ni viento pesado, ni frío.',
  },
  promedio: {
    id: 'promedio',
    nombre: 'Promedio',
    emoji: '👍',
    descripcion: 'Soy un pibe común: me banco fresco y algo de viento, pero si llueve en mi horario, no salgo.',
  },
  extremo: {
    id: 'extremo',
    nombre: 'Extremo',
    emoji: '🥚',
    descripcion: 'Salgo casi siempre, llovizna incluida. Me frenan las tormentas, las ráfagas fuertes y la lluvia en serio.',
  },
}

// ── Umbrales y configuración por vehículo ───────────────────────────────────
// probLluvia*: prob mínima (%) para bloquear esa categoría; 999 = nunca bloquea
// (y tampoco participa de la capa combo).
export interface Umbrales {
  vientoMax: number
  rafagaMax: number
  tempMin: number // sensación térmica
  tempMax: number // sensación térmica
  probLluviaFuerte: number
  probLluviaLeve: number
  probLlovizna: number
  lluviaDiaEntero: boolean // Flojo: llovizna en cualquier momento del día = NO GO
}

// Factores de dirección: multiplican el límite (bajarlo = más estricto).
// La cola SIEMPRE usa el límite base: empuja, no resta.
export interface FactoresDireccion {
  frenteViento: number
  frenteRafaga: number
  cruzadoViento: number
  cruzadoRafaga: number
}

export const SIN_FACTORES: FactoresDireccion = {
  frenteViento: 1,
  frenteRafaga: 1,
  cruzadoViento: 1,
  cruzadoRafaga: 1,
}

// Todo lo que necesita el motor para evaluar: umbrales del conductor
// + configuración del vehículo (dirección, combo, piso mojado).
export interface ConfigEval {
  umbrales: Umbrales
  factores: FactoresDireccion
  comboAmarillo: number // inicio de zona amarilla de viento (frente/base)
  comboAmarilloCruzado: number // ídem con viento cruzado (moto la endurece)
  pisoMojado: boolean // monopatín: piso mojado = NO GO absoluto
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

// Límites de viento ajustados por dirección para esta hora.
export function limitesEfectivos(
  h: HourData,
  heading: number,
  cfg: ConfigEval,
): { vientoMax: number; rafagaMax: number; rel: Rel } {
  const rel = windRel(heading, h.windFrom)
  const f = cfg.factores
  const fv = rel === 'frente' ? f.frenteViento : rel === 'cruzado' ? f.cruzadoViento : 1
  const fr = rel === 'frente' ? f.frenteRafaga : rel === 'cruzado' ? f.cruzadoRafaga : 1
  return {
    vientoMax: Math.round(cfg.umbrales.vientoMax * fv),
    rafagaMax: Math.round(cfg.umbrales.rafagaMax * fr),
    rel,
  }
}

// ── Evaluación de una hora (límites duros) ──────────────────────────────────
// `ef` trae los límites de viento ajustados por dirección; sin `ef` (la tira
// del día, que no conoce el rumbo) se usan los límites base.
export function evalHour(
  h: HourData,
  u: Umbrales,
  ef?: { vientoMax: number; rafagaMax: number; rel: Rel },
): Motivo[] {
  const motivos: Motivo[] = []
  const prob = h.rainProb ?? 100
  const cat = catLluvia(h.code)

  if (cat === 'tormenta' && prob >= 20) motivos.push({ tipo: 'tormenta', valor: prob, hora: h.hour })
  if (cat === 'nieve') motivos.push({ tipo: 'nieve', valor: h.temp, hora: h.hour })
  if (cat === 'fuerte' && prob >= u.probLluviaFuerte) motivos.push({ tipo: 'lluvia', valor: prob, hora: h.hour })
  if (cat === 'leve' && prob >= u.probLluviaLeve) motivos.push({ tipo: 'lluvia', valor: prob, hora: h.hour })
  if (cat === 'llovizna' && prob >= u.probLlovizna) motivos.push({ tipo: 'llovizna', valor: prob, hora: h.hour })

  const vMax = ef?.vientoMax ?? u.vientoMax
  const rMax = ef?.rafagaMax ?? u.rafagaMax
  if (h.gust >= rMax)
    motivos.push({
      tipo: 'rafagas', valor: Math.round(h.gust), hora: h.hour,
      rel: ef?.rel, limite: ef && rMax !== u.rafagaMax ? rMax : undefined,
    })
  if (h.wind >= vMax)
    motivos.push({
      tipo: 'viento', valor: Math.round(h.wind), hora: h.hour,
      rel: ef?.rel, limite: ef && vMax !== u.vientoMax ? vMax : undefined,
    })

  // Frío y calor por SENSACIÓN térmica (viento y humedad incluidos).
  // floor/ceil para que el número mostrado nunca contradiga el umbral.
  const tEff = h.apparent ?? h.temp
  if (tEff < u.tempMin) motivos.push({ tipo: 'frio', valor: Math.floor(tEff), hora: h.hour })
  if (tEff > u.tempMax) motivos.push({ tipo: 'calor', valor: Math.ceil(tEff), hora: h.hour })
  return motivos
}

// ── Piso mojado (monopatín): NO GO absoluto ─────────────────────────────────
// Moja: precipitación o llovizna/lluvia en la hora evaluada, o ≥0.2 mm en
// alguna de las 2 horas previas, o ≥0.5 mm acumulados entre ambas.
export function pisoMojado(
  dayHours: HourData[],
  hour: number,
): { mm: number; ahora: boolean } | null {
  const at = (hh: number) => dayHours.find((x) => x.hour === hh)
  const h = at(hour)
  if (!h) return null
  const cat = catLluvia(h.code)
  const ahora = h.precip > 0 || cat === 'llovizna' || cat === 'leve' || cat === 'fuerte'
  const p1 = at(hour - 1)?.precip ?? 0
  const p2 = at(hour - 2)?.precip ?? 0
  const antes = p1 >= 0.2 || p2 >= 0.2 || p1 + p2 >= 0.5
  if (!ahora && !antes) return null
  return { mm: Math.round((p1 + p2) * 10) / 10, ahora }
}

// ── Capa "se junta demasiado" ───────────────────────────────────────────────
// Lluvia desde la MITAD de su umbral (sin bloquear sola) + viento o temperatura
// en zona amarilla → NO GO. La cola no cuenta: empuja, no resta.
const MARGEN_TEMP = 3

export function comboHora(h: HourData, heading: number, cfg: ConfigEval): Motivo | null {
  const u = cfg.umbrales
  const cat = catLluvia(h.code)
  if (!cat || cat === 'tormenta' || cat === 'nieve') return null
  const prob = h.rainProb ?? 100
  const umbralProb =
    cat === 'fuerte' ? u.probLluviaFuerte : cat === 'leve' ? u.probLluviaLeve : u.probLlovizna
  // o ya bloquea sola, o es demasiado improbable para contar
  if (prob < umbralProb / 2 || prob >= umbralProb) return null

  const partes: string[] = [`${cat === 'llovizna' ? 'llovizna' : 'lluvia'} ${prob}%`]

  const ef = limitesEfectivos(h, heading, cfg)
  const inicio = ef.rel === 'cruzado' ? cfg.comboAmarilloCruzado : cfg.comboAmarillo
  const ratioViento = Math.max(h.wind / ef.vientoMax, h.gust / ef.rafagaMax)
  if (ef.rel !== 'cola' && ratioViento >= inicio && ratioViento < 1) {
    partes.push(
      h.gust / ef.rafagaMax >= h.wind / ef.vientoMax
        ? `ráfagas${ef.rel === 'cruzado' ? ' cruzadas' : ''} de ${Math.round(h.gust)}`
        : `viento${ef.rel === 'frente' ? ' de frente' : ef.rel === 'cruzado' ? ' cruzado' : ''} de ${Math.round(h.wind)}`,
    )
  }

  const tEff = h.apparent ?? h.temp
  if (tEff >= u.tempMin && tEff < u.tempMin + MARGEN_TEMP)
    partes.push(`sensación de ${Math.floor(tEff)}°`)
  else if (tEff <= u.tempMax && tEff > u.tempMax - MARGEN_TEMP)
    partes.push(`sensación de ${Math.ceil(tEff)}°`)

  if (partes.length < 2) return null
  return { tipo: 'combo', valor: prob, hora: h.hour, partes }
}

// ── Evaluación de tramo y día ───────────────────────────────────────────────
export interface TramoEval {
  go: boolean
  motivos: Motivo[] // el peor por tipo, ordenados por gravedad
  temp: { min: number; max: number }
  viento: { max: number; gustMax: number; rel: Rel }
  lluvia: { probMax: number; cat: CatLluvia }
  codeDominante: number
}

export function evalTramo(
  hours: HourData[],
  heading: number,
  cfg: ConfigEval,
  mojadas?: Map<number, { mm: number; ahora: boolean }>,
): TramoEval {
  const u = cfg.umbrales
  const porTipo = new Map<MotivoTipo, Motivo>()
  for (const h of hours) {
    const ef = limitesEfectivos(h, heading, cfg)
    const combo = comboHora(h, heading, cfg)
    const mojada = mojadas?.get(h.hour)
    const extras: Motivo[] = []
    if (combo) extras.push(combo)
    if (mojada) extras.push({ tipo: 'piso-mojado', valor: mojada.mm, hora: h.hour })
    for (const m of [...evalHour(h, u, ef), ...extras]) {
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
  cfg: ConfigEval,
): DiaEval {
  const u = cfg.umbrales

  // Piso mojado (si el vehículo lo mira): precomputado sobre el día entero.
  let mojadas: Map<number, { mm: number; ahora: boolean }> | undefined
  if (cfg.pisoMojado) {
    mojadas = new Map()
    for (const h of dayHours) {
      const m = pisoMojado(dayHours, h.hour)
      if (m) mojadas.set(h.hour, m)
    }
  }

  const ida = evalTramo(horasDeFranja(dayHours, franjaIda), headingIda, cfg, mojadas)
  const vuelta = evalTramo(
    horasDeFranja(dayHours, franjaVuelta),
    (headingIda + 180) % 360,
    cfg,
    mojadas,
  )

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
