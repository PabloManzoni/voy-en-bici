import type { PresetId, Recorrido, VehiculoId } from '../types'
import { barrioById } from '../data/barrios'

const K_RECORRIDOS = 'vb.recorridos'
const K_PRESET = 'vb.preset'
const K_VEHICULO = 'vb.vehiculo'

// Formato viejo (v1): guardaba origenId/destinoId contra la lista embebida.
interface RecorridoV1 {
  id: string
  nombre: string
  origenId: string
  destinoId: string
  franjaIda: Recorrido['franjaIda']
  franjaVuelta: Recorrido['franjaVuelta']
}

function migrar(r: Recorrido | RecorridoV1): Recorrido | null {
  if ('origen' in r) return r
  const o = barrioById(r.origenId)
  const d = barrioById(r.destinoId)
  if (!o || !d) return null
  return {
    id: r.id,
    nombre: r.nombre,
    origen: { nombre: o.nombre, detalle: o.depto, lat: o.lat, lon: o.lon },
    destino: { nombre: d.nombre, detalle: d.depto, lat: d.lat, lon: d.lon },
    franjaIda: r.franjaIda,
    franjaVuelta: r.franjaVuelta,
  }
}

export function loadRecorridos(): Recorrido[] {
  try {
    const raw = localStorage.getItem(K_RECORRIDOS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Recorrido | RecorridoV1>
    const migrados = parsed.map(migrar).filter((r): r is Recorrido => r !== null)
    if (migrados.length !== parsed.length || parsed.some((r) => !('origen' in r))) {
      saveRecorridos(migrados)
    }
    return migrados
  } catch {
    return []
  }
}

export function saveRecorridos(rs: Recorrido[]): void {
  localStorage.setItem(K_RECORRIDOS, JSON.stringify(rs))
}

export function loadPreset(): PresetId {
  const p = localStorage.getItem(K_PRESET)
  return p === 'flojo' || p === 'extremo' ? p : 'promedio'
}

export function savePreset(p: PresetId): void {
  localStorage.setItem(K_PRESET, p)
}

const K_ONBOARDED = 'vb.onboarded'

// El onboarding se muestra UNA sola vez: la primera apertura sin recorridos
// ni configuración. Completarlo (o ya tener recorridos) lo apaga para siempre.
export function loadOnboarded(): boolean {
  return localStorage.getItem(K_ONBOARDED) === '1'
}

export function marcarOnboarded(): void {
  localStorage.setItem(K_ONBOARDED, '1')
}

const K_UBICACION = 'vb.ubicacion'

// El usuario tocó "usar mi ubicación" y el permiso fue concedido:
// de ahí en más el semáforo se calcula de donde esté, en silencio.
export function loadUbicacion(): boolean {
  return localStorage.getItem(K_UBICACION) === '1'
}

export function marcarUbicacion(activa: boolean): void {
  if (activa) localStorage.setItem(K_UBICACION, '1')
  else localStorage.removeItem(K_UBICACION)
}

export function loadVehiculo(): VehiculoId {
  const v = localStorage.getItem(K_VEHICULO)
  return v === 'deportivo' || v === 'ebike' || v === 'monopatin' || v === 'moto' ? v : 'bici'
}

export function saveVehiculo(v: VehiculoId): void {
  localStorage.setItem(K_VEHICULO, v)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
