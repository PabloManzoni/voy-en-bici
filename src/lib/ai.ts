// Capa de IA (Gemini): SOLO redacta la explicación en lenguaje humano.
// El veredicto GO/NO GO ya está decidido por las reglas (verdict.ts) y acá no se toca.
// Si no hay key, no hay red o el modelo tarda, la UI se queda con la plantilla de explain.ts.

import type { DiaEval } from './verdict'
import { motivoFrase } from './explain'
import { PRESETS } from './verdict'
import type { PresetId } from '../types'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash'
const TIMEOUT_MS = 8000

export function iaDisponible(): boolean {
  return Boolean(API_KEY)
}

interface ContextoDia {
  etiquetaDia: string // "hoy miércoles" / "mañana jueves"
  recorrido: string // "El Pinar → Punta Gorda"
  vehiculo: string // "Bici urbana", "Monopatín / scooter"…
  dia: DiaEval
  presetId: PresetId
  modo: 'full' | 'solo-vuelta'
}

function describir(ctx: ContextoDia): string {
  const { dia } = ctx
  const t = (tramo: typeof dia.ida, nombre: string) =>
    `${nombre}: temp ${tramo.temp.min.toFixed(1)} a ${tramo.temp.max.toFixed(1)}°C, ` +
    `viento ${tramo.viento.max} km/h ${tramo.viento.rel} (ráfagas ${tramo.viento.gustMax}), ` +
    `prob. lluvia ${tramo.lluvia.probMax}%${tramo.lluvia.cat ? ` (${tramo.lluvia.cat})` : ''}` +
    (tramo.motivos.length ? `, bloqueado por: ${tramo.motivos.map(motivoFrase).join('; ')}` : ', pasa')

  const lineas = [
    ctx.modo === 'full' ? t(dia.ida, 'IDA') : 'IDA: ya pasó, no se evalúa',
    t(dia.vuelta, 'VUELTA'),
  ]
  if (dia.motivosDia.length) lineas.push(`DÍA COMPLETO: ${dia.motivosDia.map(motivoFrase).join('; ')}`)
  return lineas.join('\n')
}

async function llamarGemini(prompt: string): Promise<string | null> {
  if (!API_KEY) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // thinkingBudget 0: gemini-2.5-flash sin razonamiento interno —
          // respuesta más rápida y los tokens quedan para el texto (evita cortes).
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    // El badge ya da el veredicto: si el modelo lo repite al inicio, lo sacamos.
    return (
      text
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
function cacheKeyDe(ctx: ContextoDia): string {
  // 'v2' invalida los textos cacheados con el estilo largo anterior
  const s = JSON.stringify(['v2', ctx.etiquetaDia, ctx.recorrido, ctx.presetId, ctx.modo, ctx.dia])
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return `vb.ia.${h}`
}

export async function explicacionIA(ctx: ContextoDia): Promise<string | null> {
  if (!API_KEY) return null
  const key = cacheKeyDe(ctx)
  const cached = localStorage.getItem(key)
  if (cached) return cached

  const veredicto = ctx.dia.go ? 'GO (se puede ir en bici)' : 'NO GO (mejor no ir en bici)'
  const preset = PRESETS[ctx.presetId]
  const dia = ctx.etiquetaDia.startsWith('mañana') ? 'Mañana' : 'Hoy'
  const arranque = ctx.dia.go ? `${dia} podés:` : `${dia} no:`
  const prompt = `Sos el redactor de una app uruguaya que decide si conviene salir rodando (bici, monopatín, moto…) según el clima. El usuario anda en: ${ctx.vehiculo}.
El veredicto YA está decidido por reglas: ${veredicto}. NO lo cuestiones ni lo cambies.
Redactá UNA sola frase corta — una línea, ideal menos de 14 palabras. Dos frases solo si es imprescindible. Español rioplatense (voseo), sin saludos, sin exclamaciones, sin emojis, sin nombrar el día de la semana.
Formato exacto: empezá con "${arranque}" y seguí con lo que más importa (máximo 2 datos: viento con su dirección —de frente/cruzado/de cola—, lluvia o temperatura).
Ejemplos del tono buscado:
"Hoy podés: a la vuelta fresco y viento de cola."
"Mañana no: la vuelta cae a 6° y hay ráfagas de 50."
"Hoy podés: llovizna finita a la ida, nada más."
Perfil del usuario: "${preset.nombre}" (${preset.descripcion}).
Recorrido: ${ctx.recorrido}, ${ctx.etiquetaDia}.
Datos por tramo:
${describir(ctx)}
Respondé SOLO con la frase, nada más.`

  const text = await llamarGemini(prompt)
  if (text) {
    try {
      localStorage.setItem(key, text)
    } catch {
      // sin espacio: seguimos sin cachear
    }
  }
  return text
}
