import type { DiaEval, Motivo, Rel, TramoEval, Umbrales } from './verdict'

export const EMOJI_CODE: Array<[number[], string]> = [
  [[0], '☀️'],
  [[1, 2], '🌤️'],
  [[3], '☁️'],
  [[45, 48], '🌫️'],
  [[51, 53, 55, 56, 57], '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️'],
  [[71, 73, 75, 77, 85, 86], '🌨️'],
  [[95, 96, 99], '⛈️'],
]

export function emojiDe(code: number): string {
  for (const [codes, e] of EMOJI_CODE) if (codes.includes(code)) return e
  return '🌤️'
}

export function palabraClima(code: number): string {
  if (code === 0) return 'despejado'
  if ([1, 2].includes(code)) return 'algo nublado'
  if (code === 3) return 'nublado'
  if ([45, 48].includes(code)) return 'con niebla'
  if ([51, 53, 55, 56, 57].includes(code)) return 'con llovizna'
  if ([61, 80].includes(code)) return 'con lluvia'
  if ([63, 65, 66, 67, 81, 82].includes(code)) return 'con lluvia fuerte'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'con nieve'
  return 'con tormenta'
}

const REL_PALABRA: Record<Rel, string> = {
  frente: 'de frente',
  cola: 'de cola',
  cruzado: 'cruzado',
}

function fraseTemp(t: { min: number; max: number }): string {
  const min = Math.round(t.min)
  const max = Math.round(t.max)
  return max - min >= 2 ? `${min} a ${max}°` : `${Math.round((t.min + t.max) / 2)}°`
}

function fraseViento(v: TramoEval['viento']): string {
  if (v.max < 12) return 'casi sin viento'
  const base = `viento ${REL_PALABRA[v.rel]} de ${v.max} km/h`
  return v.gustMax >= v.max + 15 ? `${base} (ráfagas de ${v.gustMax})` : base
}

// Línea corta de un tramo, para mostrar bajo "Ida" / "Vuelta".
export function fraseTramo(t: TramoEval): string {
  if (t.motivos.length > 0) return motivoFrase(t.motivos[0])
  return `${fraseTemp(t.temp)}, ${palabraClima(t.codeDominante)}, ${fraseViento(t.viento)}`
}

const REL_ADJ: Record<Rel, string> = { frente: ' de frente', cruzado: ' cruzado', cola: '' }
const REL_ADJ_F: Record<Rel, string> = { frente: ' de frente', cruzado: ' cruzadas', cola: '' }

export function motivoFrase(m: Motivo): string {
  switch (m.tipo) {
    case 'tormenta': return `tormenta eléctrica (${m.valor}% de probabilidad)`
    case 'nieve': return 'nieve (sí, nieve)'
    case 'piso-mojado':
      return m.valor > 0
        ? `el piso sigue mojado (${m.valor} mm recientes) — no con estas ruedas`
        : 'llueve a esa hora: piso mojado, no con estas ruedas'
    case 'rafagas':
      return `ráfagas${m.rel ? REL_ADJ_F[m.rel] : ''} de ${m.valor} km/h${m.limite ? ` (tu límite acá: ${m.limite})` : ''}`
    case 'viento':
      return `viento${m.rel ? REL_ADJ[m.rel] : ''} de ${m.valor} km/h${m.limite ? ` (tu límite acá: ${m.limite})` : ''}`
    case 'lluvia': return `lluvia (${m.valor}% de probabilidad)`
    case 'llovizna': return `llovizna (${m.valor}%)`
    case 'frio': return `sensación de ${m.valor}°, mucho frío`
    case 'calor': return `sensación de ${m.valor}°, demasiado calor`
    case 'combo': return `se junta demasiado: ${m.partes?.join(' + ') ?? 'varias cosas al límite'}`
    case 'lluvia-dia': return `llovizna en algún momento del día (~${m.hora}:00)`
  }
}

// Resumen de una línea bajo el veredicto (fallback si no hay IA).
export function fraseResumen(dia: DiaEval, modo: 'full' | 'solo-vuelta', u: Umbrales): string {
  if (dia.go) {
    const t = modo === 'solo-vuelta' ? dia.vuelta : dia.ida
    const avisos: string[] = []
    const peor = [dia.ida, dia.vuelta]
    for (const [i, tramo] of peor.entries()) {
      const donde = i === 0 ? 'a la ida' : 'a la vuelta'
      if (tramo.viento.max >= u.vientoMax * 0.8 && tramo.viento.rel === 'frente')
        avisos.push(`vas a remar contra el viento ${donde}`)
      else if (tramo.viento.gustMax >= u.rafagaMax * 0.8)
        avisos.push(`ojo con las ráfagas ${donde} (${tramo.viento.gustMax} km/h)`)
      if (tramo.temp.min <= u.tempMin + 2) avisos.push(`abrigate ${donde} (${Math.round(tramo.temp.min)}°)`)
    }
    const base = `${cap(palabraClima(t.codeDominante))} y ${fraseTemp(t.temp)}`
    if (avisos.length > 0) return `${base}. Ojo: ${avisos[0]}.`
    // el viento de cola es noticia buena: contarla
    const empuje = [dia.ida, dia.vuelta].findIndex(
      (tr) => tr.viento.rel === 'cola' && tr.viento.max >= 15,
    )
    if (empuje >= 0) return `${base}; el viento te empuja ${empuje === 0 ? 'a la ida' : 'a la vuelta'}.`
    return `${base}, sin drama.`
  }

  // NO GO: contar el motivo más grave y dónde.
  const todos: Array<{ m: Motivo; donde: string }> = [
    ...(modo === 'full' ? dia.ida.motivos.map((m) => ({ m, donde: 'a la ida' })) : []),
    ...dia.vuelta.motivos.map((m) => ({ m, donde: 'a la vuelta' })),
    ...dia.motivosDia.map((m) => ({ m, donde: '' })),
  ].sort((a, b) => {
    const s = ['tormenta', 'nieve', 'piso-mojado', 'rafagas', 'viento', 'lluvia', 'llovizna', 'frio', 'calor', 'combo', 'lluvia-dia']
    return s.indexOf(a.m.tipo) - s.indexOf(b.m.tipo)
  })

  if (todos.length === 0) return 'No dan los números.'
  const p = todos[0]
  const principal = `${cap(motivoFrase(p.m))}${p.donde ? ` ${p.donde}` : ''}.`
  const segundo = todos.find((x) => x.m.tipo !== p.m.tipo && (x.donde !== p.donde || x.m.tipo !== p.m.tipo))
  return segundo ? `${principal} Y encima, ${motivoFrase(segundo.m)}${segundo.donde ? ` ${segundo.donde}` : ''}.` : principal
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Frases cortas bajo el badge, estables por día (varían entre días, no entre aperturas).
// Neutras de vehículo: sirven para bici, monopatín, moto…
const GO_FRASES = ['Día de rodar.', 'Está para salir.', 'Se sale.']
const NOGO_FRASES = ['Se guarda.', 'No es día.', 'Otra vez será.']

export function fraseBadge(go: boolean, dayOfMonth: number): string {
  const arr = go ? GO_FRASES : NOGO_FRASES
  return arr[dayOfMonth % arr.length]
}
