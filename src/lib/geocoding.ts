// Búsqueda de lugares: lista local primero (instantánea, alfabética),
// completada con el geocoder de Open-Meteo (gratis, sin key, mismo proveedor del clima).
import type { Lugar } from '../types'
import { BARRIOS } from '../data/barrios'

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // saca los tildes (rango unicode de diacríticos combinantes)
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function buscarLocal(q: string): Lugar[] {
  const nq = normalizar(q)
  if (nq.length < 2) return []
  return BARRIOS.filter((b) => normalizar(b.nombre).includes(nq))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((b) => ({ nombre: b.nombre, detalle: b.depto, lat: b.lat, lon: b.lon }))
}

interface GeoResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  admin2?: string
}

export interface ResultadoOnline {
  uy: Lugar[]
  exterior: Lugar[]
}

export async function buscarOnline(q: string, signal?: AbortSignal): Promise<ResultadoOnline> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=10&language=es&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) return { uy: [], exterior: [] }
  const data = (await res.json()) as { results?: GeoResult[] }
  const results = data.results ?? []

  const aLugar = (r: GeoResult): Lugar => ({
    nombre: r.name,
    detalle:
      r.country_code === 'UY'
        ? (r.admin1 || 'Uruguay').replace(/^Departamento de /, '')
        : [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  })

  return {
    uy: results.filter((r) => r.country_code === 'UY').map(aLugar),
    exterior: results.filter((r) => r.country_code !== 'UY').map(aLugar),
  }
}

// Mezcla local + online sin duplicados. Lo local y lo uruguayo van siempre;
// los lugares del exterior solo entran si la lista viene flaca (evita que
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
  for (const o of online.uy) {
    if (!esDup(o) && out.length < max) out.push(o)
  }
  for (const o of online.exterior) {
    if (out.length >= 5) break
    if (!esDup(o)) out.push(o)
  }
  return out.slice(0, max)
}
