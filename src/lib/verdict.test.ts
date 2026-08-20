import { describe, expect, it } from 'vitest'
import { evalDia, windRel, type HourData } from './verdict'

function mkHour(over: Partial<HourData> = {}): HourData {
  return {
    hour: 8,
    temp: 15,
    rainProb: 0,
    precip: 0,
    code: 1,
    wind: 10,
    gust: 15,
    windFrom: 0,
    ...over,
  }
}

// Día completo lindo; se pisan horas puntuales con `over`.
function mkDay(overrides: Array<Partial<HourData> & { hour: number }> = []): HourData[] {
  const day = Array.from({ length: 24 }, (_, h) => mkHour({ hour: h }))
  for (const o of overrides) day[o.hour] = mkHour(o)
  return day
}

// Recorrido de prueba: ida Mañana (8-11), vuelta Tarde (17-20), rumbo este (90°).
const eval_ = (day: HourData[], preset: 'flojo' | 'promedio' | 'extremo') =>
  evalDia(day, 'manana', 'tarde', 90, preset)

describe('veredicto', () => {
  it('día lindo es GO para todos', () => {
    for (const p of ['flojo', 'promedio', 'extremo'] as const) {
      expect(eval_(mkDay(), p).go).toBe(true)
    }
  })

  it('tormenta eléctrica en la franja es NO GO para todos', () => {
    const day = mkDay([{ hour: 18, code: 95, rainProb: 60 }])
    for (const p of ['flojo', 'promedio', 'extremo'] as const) {
      const r = eval_(day, p)
      expect(r.go).toBe(false)
      expect(r.vuelta.motivos[0].tipo).toBe('tormenta')
    }
  })

  it('ráfagas de 55 frenan al promedio pero no al extremo', () => {
    const day = mkDay([{ hour: 9, gust: 55 }])
    expect(eval_(day, 'promedio').go).toBe(false)
    expect(eval_(day, 'extremo').go).toBe(true)
  })

  it('AND: ida linda + vuelta con lluvia = NO GO', () => {
    const day = mkDay([{ hour: 18, code: 63, rainProb: 80 }])
    const r = eval_(day, 'promedio')
    expect(r.ida.go).toBe(true)
    expect(r.vuelta.go).toBe(false)
    expect(r.go).toBe(false)
  })

  it('flojo: llovizna fuera de las franjas (mediodía) también es NO GO; promedio va igual', () => {
    const day = mkDay([{ hour: 13, code: 53, rainProb: 50 }])
    const flojo = eval_(day, 'flojo')
    expect(flojo.go).toBe(false)
    expect(flojo.motivosDia[0].tipo).toBe('lluvia-dia')
    expect(eval_(day, 'promedio').go).toBe(true)
  })

  it('extremo va bajo llovizna en su franja; flojo y promedio no', () => {
    const day = mkDay([{ hour: 9, code: 53, rainProb: 90 }])
    expect(eval_(day, 'extremo').go).toBe(true)
    expect(eval_(day, 'promedio').go).toBe(false)
    expect(eval_(day, 'flojo').go).toBe(false)
  })

  it('frío: 7° de invierno es GO para el promedio (corta en 4); 3° lo frena; el extremo aguanta hasta 1°', () => {
    const day = mkDay([{ hour: 8, temp: 7 }, { hour: 9, temp: 7 }, { hour: 10, temp: 9 }])
    expect(eval_(day, 'promedio').go).toBe(true)
    expect(eval_(day, 'flojo').go).toBe(false)
    const helada = mkDay([{ hour: 8, temp: 3 }])
    expect(eval_(helada, 'promedio').go).toBe(false)
    expect(eval_(helada, 'extremo').go).toBe(true)
  })

  it('calor de 34° a la vuelta: promedio NO (corta en 33), extremo GO', () => {
    const day = mkDay([{ hour: 18, temp: 34 }])
    expect(eval_(day, 'promedio').go).toBe(false)
    expect(eval_(day, 'extremo').go).toBe(true)
  })

  it('viento de 25 sostenido frena al flojo (corta en 20) pero no al promedio (32)', () => {
    const day = mkDay([{ hour: 9, wind: 25 }])
    expect(eval_(day, 'flojo').go).toBe(false)
    expect(eval_(day, 'promedio').go).toBe(true)
  })
})

describe('viento relativo', () => {
  it('viento que viene de donde vas = de frente', () => {
    expect(windRel(90, 90)).toBe('frente')
  })
  it('viento que viene de atrás = de cola', () => {
    expect(windRel(90, 270)).toBe('cola')
  })
  it('viento perpendicular = cruzado', () => {
    expect(windRel(90, 0)).toBe('cruzado')
    expect(windRel(90, 180)).toBe('cruzado')
  })
  it('la vuelta invierte: el frente de la ida es cola a la vuelta', () => {
    expect(windRel(90, 90)).toBe('frente')
    expect(windRel((90 + 180) % 360, 90)).toBe('cola')
  })
})
