import { describe, expect, it } from 'vitest'
import { evalDia, windRel, type HourData } from './verdict'
import { configEval } from './vehiculos'
import type { PresetId, VehiculoId } from '../types'

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
// A la ida: windFrom 90 = frente, 0/180 = cruzado, 270 = cola.
const evalV = (day: HourData[], veh: VehiculoId, preset: PresetId) =>
  evalDia(day, 'manana', 'tarde', 90, configEval(veh, preset))
const eval_ = (day: HourData[], preset: PresetId) => evalV(day, 'bici', preset)

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

  it('ráfagas de 45 frenan al promedio (corta en 40) pero no al extremo (50)', () => {
    const day = mkDay([{ hour: 9, gust: 45 }])
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

  it('frío: 7° de invierno es GO para el promedio (corta en 5); 3° lo frena; el extremo aguanta hasta 1°', () => {
    const day = mkDay([{ hour: 8, temp: 7 }, { hour: 9, temp: 7 }, { hour: 10, temp: 9 }])
    expect(eval_(day, 'promedio').go).toBe(true)
    expect(eval_(day, 'flojo').go).toBe(false)
    const helada = mkDay([{ hour: 8, temp: 3 }])
    expect(eval_(helada, 'promedio').go).toBe(false)
    expect(eval_(helada, 'extremo').go).toBe(true)
  })

  it('calor de 34° a la vuelta: promedio NO (corta en 30), extremo GO (corta en 34)', () => {
    const day = mkDay([{ hour: 18, temp: 34 }])
    expect(eval_(day, 'promedio').go).toBe(false)
    expect(eval_(day, 'extremo').go).toBe(true)
  })

  it('viento de 25 sostenido frena al flojo (corta en 20) pero no al promedio (30)', () => {
    const day = mkDay([{ hour: 9, wind: 25 }])
    expect(eval_(day, 'flojo').go).toBe(false)
    expect(eval_(day, 'promedio').go).toBe(true)
  })
})

describe('sensación térmica y combos', () => {
  it('sensación manda: 9° reales con sensación 3° es NO GO para el promedio (corta en 5)', () => {
    const day = mkDay([{ hour: 18, temp: 9, apparent: 3 }])
    const r = eval_(day, 'promedio')
    expect(r.go).toBe(false)
    expect(r.vuelta.motivos[0].tipo).toBe('frio')
    // sin dato de sensación cae al termómetro: 9° pasa
    expect(eval_(mkDay([{ hour: 18, temp: 9 }]), 'promedio').go).toBe(true)
  })

  it('combo: llovizna probable + viento de frente al límite = NO GO aunque nada bloquee solo', () => {
    // promedio: llovizna cuenta desde 30% (corta en 60), viento amarillo desde 22.5 (corta en 30)
    // vuelta con rumbo 270 y viento desde 270 = de frente
    const day = mkDay([{ hour: 18, code: 53, rainProb: 45, wind: 26, windFrom: 270 }])
    const r = eval_(day, 'promedio')
    expect(r.go).toBe(false)
    expect(r.vuelta.motivos[0].tipo).toBe('combo')
  })

  it('el mismo combo con viento de cola no resta: GO', () => {
    // vuelta con rumbo 270 y viento desde 90 = de cola
    const day = mkDay([{ hour: 18, code: 53, rainProb: 45, wind: 26, windFrom: 90 }])
    expect(eval_(day, 'promedio').go).toBe(true)
  })

  it('combo con frío: llovizna probable + sensación pegada al límite = NO GO', () => {
    // promedio: sensación 6° está en zona amarilla (límite 5 + margen 3)
    const day = mkDay([{ hour: 18, code: 53, rainProb: 45, temp: 10, apparent: 6 }])
    const r = eval_(day, 'promedio')
    expect(r.go).toBe(false)
    expect(r.vuelta.motivos[0].tipo).toBe('combo')
  })

  it('lluvia casi imposible (5%) no arma combo aunque el viento esté al límite', () => {
    const day = mkDay([{ hour: 18, code: 53, rainProb: 5, wind: 26, windFrom: 270 }])
    expect(eval_(day, 'promedio').go).toBe(true)
  })
})

describe('matriz por vehículo (casos del doc de investigación)', () => {
  it('deportivo común: viento de frente 26 bloquea (límite efectivo 30×0.85=26); de cola 29 pasa', () => {
    const frente = mkDay([{ hour: 9, wind: 26, windFrom: 90 }])
    const r = evalV(frente, 'deportivo', 'promedio')
    expect(r.ida.go).toBe(false)
    expect(r.ida.motivos[0].tipo).toBe('viento')
    expect(r.ida.motivos[0].limite).toBe(26)
    const cola = mkDay([{ hour: 9, wind: 29, windFrom: 270 }])
    expect(evalV(cola, 'deportivo', 'promedio').ida.go).toBe(true)
    // en bici urbana ese mismo frente de 26 pasa (límite 30 sin factor)
    expect(evalV(frente, 'bici', 'promedio').ida.go).toBe(true)
  })

  it('deportivo común: ráfaga cruzada 34 bloquea (40×0.85=34); calor a sensación 30 bloquea (>29)', () => {
    const cruzada = mkDay([{ hour: 9, gust: 34, windFrom: 0 }])
    expect(evalV(cruzada, 'deportivo', 'promedio').ida.go).toBe(false)
    const calor = mkDay([{ hour: 9, temp: 27, apparent: 30 }])
    expect(evalV(calor, 'deportivo', 'promedio').ida.go).toBe(false)
    expect(evalV(calor, 'bici', 'promedio').ida.go).toBe(true) // bici corta en 30
  })

  it('e-bike común: banca viento 34 (corta en 35) pero la ráfaga 40 bloquea igual que bici', () => {
    expect(evalV(mkDay([{ hour: 9, wind: 34, windFrom: 90 }]), 'ebike', 'promedio').go).toBe(true)
    expect(evalV(mkDay([{ hour: 9, wind: 35, windFrom: 90 }]), 'ebike', 'promedio').go).toBe(false)
    expect(evalV(mkDay([{ hour: 9, gust: 40 }]), 'ebike', 'promedio').go).toBe(false)
    // flojo e-bike siente el frío antes: sensación 11.9 < 12 bloquea
    expect(evalV(mkDay([{ hour: 9, temp: 14, apparent: 11.9 }]), 'ebike', 'flojo').go).toBe(false)
  })

  it('monopatín: ráfaga cruzada 28 frena al común (35×0.80=28); de cola 44 no frena al extremo', () => {
    expect(evalV(mkDay([{ hour: 9, gust: 28, windFrom: 0 }]), 'monopatin', 'promedio').go).toBe(false)
    expect(evalV(mkDay([{ hour: 9, gust: 44, windFrom: 270 }]), 'monopatin', 'extremo').ida.go).toBe(true)
  })

  it('monopatín: piso mojado es NO GO absoluto — lluvia en la hora, o caída en las 2 horas previas', () => {
    // llueve en la hora evaluada
    const ahora = mkDay([{ hour: 9, precip: 0.1, code: 61, rainProb: 20 }])
    const r = evalV(ahora, 'monopatin', 'extremo')
    expect(r.go).toBe(false)
    expect(r.ida.motivos[0].tipo).toBe('piso-mojado')
    // llovió a las 7 (fuera de la franja): a las 8 el piso sigue mojado
    const antes = mkDay([{ hour: 7, precip: 0.3 }])
    expect(evalV(antes, 'monopatin', 'promedio').ida.go).toBe(false)
    // acumulado 0.5 mm entre las dos horas previas
    const suma = mkDay([{ hour: 7, precip: 0.4 }, { hour: 8, precip: 0.1 }])
    expect(evalV(suma, 'monopatin', 'flojo').ida.go).toBe(false)
    // la bici con la misma agua previa no tiene esa regla
    expect(evalV(antes, 'bici', 'extremo').ida.go).toBe(true)
  })

  it('moto común: cruzado endurece (viento 32=40×0.8, ráfaga 47=55×0.85); de frente banca 39', () => {
    expect(evalV(mkDay([{ hour: 9, wind: 32, windFrom: 0 }]), 'moto', 'promedio').ida.go).toBe(false)
    expect(evalV(mkDay([{ hour: 9, gust: 47, windFrom: 0 }]), 'moto', 'promedio').ida.go).toBe(false)
    expect(evalV(mkDay([{ hour: 9, wind: 39, windFrom: 90 }]), 'moto', 'promedio').ida.go).toBe(true)
    // ráfaga 65 frena hasta al extremo, venga de donde venga
    expect(evalV(mkDay([{ hour: 9, gust: 65, windFrom: 270 }]), 'moto', 'extremo').ida.go).toBe(false)
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
