// Búsqueda de lugares: lista local primero (instantánea, alfabética),
// completada con el geocoder de Open-Meteo (gratis, sin key, mismo proveedor del clima).
// La prioridad es "cerca del usuario" usando la zona horaria del dispositivo:
// sin GPS, sin permisos, sin servicios de IP — el navegador ya la sabe.
import type { Lugar } from '../types'
import { BARRIOS } from '../data/barrios'

const TZ_URUGUAY = 'America/Montevideo'

export function tzUsuario(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // saca los tildes (rango unicode de diacríticos combinantes)
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// La lista embebida es toda uruguaya: solo aporta si el usuario está en Uruguay.
export function buscarLocal(q: string, tz: string = tzUsuario()): Lugar[] {
  if (tz !== TZ_URUGUAY) return []
  const nq = normalizar(q)
  if (nq.length < 2) return []
  return BARRIOS.filter((b) => normalizar(b.nombre).includes(nq))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((b) => ({ nombre: b.nombre, detalle: b.depto, lat: b.lat, lon: b.lon }))
}

export interface GeoResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  timezone?: string
}

// "Cerca" = misma zona horaria que el usuario, o mismo país que algún
// resultado con esa zona horaria (cubre países con varias zonas, ej. Canarias).
export function clasificar(
  results: GeoResult[],
  tz: string,
): { cerca: GeoResult[]; lejos: GeoResult[] } {
  const paises = new Set(
    results.filter((r) => r.timezone === tz && r.country_code).map((r) => r.country_code),
  )
  const esCerca = (r: GeoResult) =>
    r.timezone === tz || (r.country_code !== undefined && paises.has(r.country_code))
  return {
    cerca: results.filter(esCerca),
    lejos: results.filter((r) => !esCerca(r)),
  }
}

export interface ResultadoOnline {
  cerca: Lugar[]
  lejos: Lugar[]
}

export async function buscarOnline(
  q: string,
  signal?: AbortSignal,
  tz: string = tzUsuario(),
): Promise<ResultadoOnline> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=10&language=es&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) return { cerca: [], lejos: [] }
  const data = (await res.json()) as { results?: GeoResult[] }
  const { cerca, lejos } = clasificar(data.results ?? [], tz)

  const aLugar = (r: GeoResult, propio: boolean): Lugar => ({
    nombre: r.name,
    detalle: propio
      ? (r.admin1 || r.country || '').replace(/^Departamento de /, '')
      : [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  })

  return {
    cerca: cerca.map((r) => aLugar(r, true)),
    lejos: lejos.map((r) => aLugar(r, false)),
  }
}

// Mezcla local + online sin duplicados. Lo local y lo cercano van siempre;
// los lugares lejanos solo entran si la lista viene flaca (evita que
// "Punta, Filipinas" tape a Punta Gorda). Si el online duplica un local
// (mismo nombre a menos de ~5 km), gana el local (coordenadas curadas).
export function mezclar(local: Lugar[], online: ResultadoOnline, max = 10): Lugar[] {
  const out = [...local]
  const esDup = (o: Lugar) =>
    out.some(
      (l) =>
        normalizar(l.nombre) === normalizar(o.nombre) &&
        Math.abs(l.lat - o.lat) < 0.05 &&
        Math.abs(l.lon - o.lon) < 0.05,
    )
  for (const o of online.cerca) {
    if (!esDup(o) && out.length < max) out.push(o)
  }
  for (const o of online.lejos) {
    if (out.length >= 5) break
    if (!esDup(o)) out.push(o)
  }
  return out.slice(0, max)
}
