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
    // El badge ya dice GO/NO GO gigante: si el modelo lo repite al inicio, lo sacamos.
    return text?.trim().replace(/^[¡!]*\s*(no\s+)?go[.!:¡]*\s*/i, '').trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Cache por contenido: mismo pronóstico + mismo veredicto → misma explicación.
function cacheKeyDe(ctx: ContextoDia): string {
  const s = JSON.stringify([ctx.etiquetaDia, ctx.recorrido, ctx.presetId, ctx.modo, ctx.dia])
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
  const prompt = `Sos el redactor de una app uruguaya que decide si conviene ir en bicicleta según el clima.
El veredicto YA está decidido por reglas: ${veredicto}. NO lo cuestiones ni lo cambies.
Tu única tarea: redactar la explicación para el usuario en 1 o 2 frases cortas, español rioplatense (voseo), tono cercano y directo, sin emojis, sin saludos, sin repetir "GO" ni "NO GO".
Mencioná el dato concreto que más importa (viento con su dirección relativa —de frente/cruzado/de cola—, lluvia, temperatura). Si es GO con alguna advertencia (viento cerca del límite, frío), avisala en corto.
IMPORTANTE: estás hablando de «${ctx.etiquetaDia}». Nombrá el día exactamente así — si es mañana, decí "mañana", nunca "hoy".
Perfil del usuario: "${preset.nombre}" (${preset.descripcion}).
Recorrido: ${ctx.recorrido}, ${ctx.etiquetaDia}.
Datos por tramo:
${describir(ctx)}
Respondé SOLO con la explicación, nada más.`

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
