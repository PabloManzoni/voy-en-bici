// Capa de IA: SOLO redacta la explicación en lenguaje humano.
// El veredicto GO/NO GO ya está decidido por las reglas (verdict.ts) y acá no se toca.
//
// La app NO tiene ninguna API key. Le manda los datos del día a nuestro servidor
// (ia.tuggsy.com, carpeta `tuggsy-ia`), que es quien arma el prompt, elige el modelo
// y aplica los topes de gasto. Nunca poner una key en una variable VITE_*: Vite la
// compila dentro del JS público (así se filtró la de Gemini el 21/11/2026).
//
// Si el servidor no responde, tarda o cortó por tope, la UI se queda con la
// plantilla de explain.ts.

import type { DiaEval, TramoEval } from './verdict'
import type { PresetId, VehiculoId } from '../types'

const IA_URL = (import.meta.env.VITE_IA_URL as string | undefined)?.replace(/\/+$/, '')
const TIMEOUT_MS = 8000

export function iaDisponible(): boolean {
  return Boolean(IA_URL)
}

interface ContextoDia {
  cuando: 'hoy' | 'manana'
  vehiculo: VehiculoId
  dia: DiaEval
  presetId: PresetId
  modo: 'full' | 'solo-vuelta'
}

// Solo los datos que el servidor necesita para redactar. Sin nombres de lugares:
// el recorrido del usuario no sale del dispositivo.
function tramoPara(t: TramoEval) {
  return { temp: t.temp, viento: t.viento, lluvia: t.lluvia, motivos: t.motivos }
}

function pedidoDe(ctx: ContextoDia) {
  return {
    dia: ctx.cuando,
    go: ctx.dia.go,
    modo: ctx.modo,
    vehiculo: ctx.vehiculo,
    preset: ctx.presetId,
    ida: tramoPara(ctx.dia.ida),
    vuelta: tramoPara(ctx.dia.vuelta),
    motivosDia: ctx.dia.motivosDia,
  }
}

async function pedirExplicacion(pedido: ReturnType<typeof pedidoDe>): Promise<string | null> {
  if (!IA_URL) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${IA_URL}/bici/explicacion`, {
      method: 'POST',
      // text/plain evita el preflight CORS: un viaje de red en vez de dos.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(pedido),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { texto?: string | null }
    // El badge ya da el veredicto: si el modelo lo repite al inicio, lo sacamos.
    return (
      data.texto
        ?.trim()
        .replace(/^[¡!]*\s*(no\s+go|go|s[ií],?\s*dale|mejor\s+no)[.!:¡,]*\s*/i, '')
        .trim() || null
    )
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Cache por contenido: mismo pronóstico + mismo veredicto → misma explicación.
// Es lo que hace que cada usuario gaste 1 o 2 pedidos por día y no uno por apertura.
function cacheKeyDe(pedido: ReturnType<typeof pedidoDe>): string {
  // 'v3': pedido estructurado al servidor propio (antes: prompt directo a Gemini)
  const s = JSON.stringify(['v3', pedido])
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return `vb.ia.${h}`
}

// Pedidos en vuelo: si la misma tarjeta pide dos veces a la vez (re-render), sale UN pedido.
const enVuelo = new Map<string, Promise<string | null>>()

export function explicacionIA(ctx: ContextoDia): Promise<string | null> {
  if (!IA_URL) return Promise.resolve(null)
  const pedido = pedidoDe(ctx)
  const key = cacheKeyDe(pedido)
  const cached = localStorage.getItem(key)
  if (cached) return Promise.resolve(cached)

  const yaPedido = enVuelo.get(key)
  if (yaPedido) return yaPedido

  const promesa = pedirExplicacion(pedido)
    .then((text) => {
      if (text) {
        try {
          localStorage.setItem(key, text)
        } catch {
          // sin espacio: seguimos sin cachear
        }
      }
      return text
    })
    .finally(() => enVuelo.delete(key))
  enVuelo.set(key, promesa)
  return promesa
}
