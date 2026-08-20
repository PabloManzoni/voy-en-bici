import { describe, expect, it } from 'vitest'
import { buscarLocal, clasificar, mezclar, type GeoResult } from './geocoding'

const mk = (name: string, tz: string, cc: string, admin1 = ''): GeoResult => ({
  name,
  latitude: 0,
  longitude: 0,
  timezone: tz,
  country_code: cc,
  country: cc,
  admin1,
})

describe('prioridad por zona horaria', () => {
  const resultados = [
    mk('Santa Lucía', 'America/Montevideo', 'UY'),
    mk('Santa Lucía', 'Europe/Madrid', 'ES'),
    mk('Santa Lucía de Tirajana', 'Atlantic/Canary', 'ES'),
    mk('Santa Lucia', 'Asia/Manila', 'PH'),
  ]

  it('para un usuario en Montevideo, Uruguay queda cerca y el resto lejos', () => {
    const { cerca, lejos } = clasificar(resultados, 'America/Montevideo')
    expect(cerca.map((r) => r.country_code)).toEqual(['UY'])
    expect(lejos).toHaveLength(3)
  })

  it('para un usuario en Madrid, España queda cerca — Canarias incluida (mismo país, otra zona)', () => {
    const { cerca } = clasificar(resultados, 'Europe/Madrid')
    expect(cerca.map((r) => r.country_code)).toEqual(['ES', 'ES'])
  })

  it('la lista local uruguaya no aparece para un usuario fuera de Uruguay', () => {
    expect(buscarLocal('pocitos', 'Europe/Madrid')).toEqual([])
    expect(buscarLocal('pocitos', 'America/Montevideo').map((l) => l.nombre)).toEqual(['Pocitos'])
  })

  it('lo lejano solo entra si la lista viene flaca', () => {
    const lugar = (n: string) => ({ nombre: n, lat: 0, lon: 0 })
    const online = {
      cerca: [lugar('A'), lugar('B'), lugar('C'), lugar('D'), lugar('E')],
      lejos: [lugar('X'), lugar('Y')],
    }
    // con 5 cercanos, los lejanos no entran
    expect(mezclar([], online).map((l) => l.nombre)).toEqual(['A', 'B', 'C', 'D', 'E'])
    // con lista flaca, sí
    const flaca = { cerca: [lugar('A')], lejos: [lugar('X'), lugar('Y')] }
    expect(mezclar([], flaca).map((l) => l.nombre)).toEqual(['A', 'X', 'Y'])
  })
})
