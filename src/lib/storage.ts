import type { PresetId, Recorrido } from '../types'

const K_RECORRIDOS = 'vb.recorridos'
const K_PRESET = 'vb.preset'

export function loadRecorridos(): Recorrido[] {
  try {
    const raw = localStorage.getItem(K_RECORRIDOS)
    return raw ? (JSON.parse(raw) as Recorrido[]) : []
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

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
