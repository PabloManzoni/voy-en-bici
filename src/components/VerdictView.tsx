import { useEffect, useMemo, useState } from 'react'
import type { PresetId, Recorrido } from '../types'
import { barrioById } from '../data/barrios'
import { franjaById } from '../lib/franjas'
import { bearing, puntoMedio } from '../lib/geo'
import { getForecast, hoyLocal, type Forecast, type ForecastDay } from '../lib/weather'
import { evalDia, PRESETS, type DiaEval } from '../lib/verdict'
import { fraseBadge, fraseResumen, fraseTramo } from '../lib/explain'
import { explicacionIA } from '../lib/ai'
import { DayStrip } from './DayStrip'
import { nav } from '../App'

type Modo = 'full' | 'solo-vuelta' | 'pasado'

function DayCard({
  titulo,
  fecha,
  day,
  dia,
  modo,
  recorrido,
  presetId,
}: {
  titulo: string
  fecha: Date
  day: ForecastDay
  dia: DiaEval
  modo: Modo
  recorrido: Recorrido
  presetId: PresetId
}) {
  const fIda = franjaById(recorrido.franjaIda)
  const fVuelta = franjaById(recorrido.franjaVuelta)

  // En modo solo-vuelta el GO/NO GO es solo por la vuelta (la ida ya pasó).
  const go = modo === 'solo-vuelta' ? dia.vuelta.go && dia.motivosDia.length === 0 : dia.go

  const [texto, setTexto] = useState<string | null>(null)
  useEffect(() => {
    if (modo === 'pasado') return
    let vivo = true
    const etiqueta = `${titulo.toLowerCase()} ${fecha.toLocaleDateString('es-UY', { weekday: 'long' })}`
    const o = barrioById(recorrido.origenId)
    const d = barrioById(recorrido.destinoId)
    explicacionIA({
      etiquetaDia: etiqueta,
      recorrido: `${o?.nombre} → ${d?.nombre}`,
      dia: modo === 'solo-vuelta' ? { ...dia, go } : dia,
      presetId,
      modo: modo === 'solo-vuelta' ? 'solo-vuelta' : 'full',
    }).then((t) => {
      if (vivo && t) setTexto(t)
    })
    return () => {
      vivo = false
    }
  }, [dia, modo, presetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fechaLabel = fecha.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric' })

  if (modo === 'pasado') {
    return (
      <section className="day-card day-past">
        <div className="day-head">
          <span className="day-title">
            {titulo} · <span className="muted">{fechaLabel}</span>
          </span>
          <span className="badge badge-past">Ya fue 🌙</span>
        </div>
        <p className="day-sub">El día ya terminó para la bici. Mirá mañana.</p>
        <DayStrip hours={day.hours} franjas={[fIda, fVuelta]} />
      </section>
    )
  }

  const resumen = texto ?? fraseResumen(modo === 'solo-vuelta' ? { ...dia, go } : dia, modo, presetId)

  return (
    <section className={`day-card ${go ? 'day-go' : 'day-nogo'}`}>
      <div className="day-head">
        <span className="day-title">
          {titulo} · <span className="muted">{fechaLabel}</span>
        </span>
        <span className={`badge ${go ? 'badge-go' : 'badge-nogo'}`}>{go ? 'GO' : 'NO GO'}</span>
      </div>
      <p className="day-frase">{fraseBadge(go, fecha.getDate())}</p>
      <p className="day-sub">{resumen}</p>

      <div className="tramos">
        <div className={`tramo ${modo === 'solo-vuelta' ? 'tramo-off' : dia.ida.go ? '' : 'tramo-bad'}`}>
          <span className="tramo-dir">→</span>
          <span className="tramo-body">
            <strong>Ida</strong> · {fIda.label} ({fIda.horas} h)
            <span className="tramo-detalle">
              {modo === 'solo-vuelta' ? 'ya pasó' : fraseTramo(dia.ida)}
            </span>
          </span>
          <span className="tramo-mark">{modo === 'solo-vuelta' ? '–' : dia.ida.go ? '✓' : '✗'}</span>
        </div>
        <div className={`tramo ${dia.vuelta.go ? '' : 'tramo-bad'}`}>
          <span className="tramo-dir">←</span>
          <span className="tramo-body">
            <strong>Vuelta</strong> · {fVuelta.label} ({fVuelta.horas} h)
            <span className="tramo-detalle">{fraseTramo(dia.vuelta)}</span>
          </span>
          <span className="tramo-mark">{dia.vuelta.go ? '✓' : '✗'}</span>
        </div>
      </div>

      <DayStrip hours={day.hours} franjas={[fIda, fVuelta]} />
    </section>
  )
}

export function VerdictView({
  recorridos,
  preset,
  id,
}: {
  recorridos: Recorrido[]
  preset: PresetId
  id: string
}) {
  const recorrido = recorridos.find((r) => r.id === id)
  const [fc, setFc] = useState<Forecast | null>(null)
  const [error, setError] = useState(false)
  const [reintento, setReintento] = useState(0)

  const origen = recorrido ? barrioById(recorrido.origenId) : undefined
  const destino = recorrido ? barrioById(recorrido.destinoId) : undefined

  useEffect(() => {
    if (!origen || !destino) return
    setError(false)
    setFc(null)
    const mid = puntoMedio(origen, destino)
    getForecast(mid.lat, mid.lon)
      .then(setFc)
      .catch(() => setError(true))
  }, [origen, destino, reintento])

  const heading = useMemo(
    () => (origen && destino ? bearing(origen.lat, origen.lon, destino.lat, destino.lon) : 0),
    [origen, destino],
  )

  if (!recorrido || !origen || !destino) {
    return (
      <div className="empty">
        <p>No encontré ese recorrido.</p>
        <button className="btn-primary" onClick={() => nav('/')}>
          Volver
        </button>
      </div>
    )
  }

  const hoyStr = hoyLocal()
  const dayHoy = fc?.days.find((d) => d.date === hoyStr)
  const dayMan = fc?.days.find((d) => d.date > hoyStr)

  const evalHoy = dayHoy
    ? evalDia(dayHoy.hours, recorrido.franjaIda, recorrido.franjaVuelta, heading, preset)
    : null
  const evalMan = dayMan
    ? evalDia(dayMan.hours, recorrido.franjaIda, recorrido.franjaVuelta, heading, preset)
    : null

  const ahora = new Date()
  const fIda = franjaById(recorrido.franjaIda)
  const fVuelta = franjaById(recorrido.franjaVuelta)
  const modoHoy: Modo =
    ahora.getHours() >= fVuelta.hasta ? 'pasado' : ahora.getHours() >= fIda.hasta ? 'solo-vuelta' : 'full'

  const manana = new Date(ahora)
  manana.setDate(manana.getDate() + 1)

  const p = PRESETS[preset]

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" aria-label="Volver" onClick={() => nav('/')}>
          ←
        </button>
        <div className="topbar-title">
          <h1>{recorrido.nombre}</h1>
          <span className="topbar-sub">
            {origen.nombre} → {destino.nombre}
          </span>
        </div>
        <button className="icon-btn" aria-label="Perfil" onClick={() => nav('/settings')}>
          ⚙️
        </button>
      </header>

      {error && (
        <div className="empty">
          <div className="empty-emoji">😕</div>
          <p>No pude traer el clima. ¿Estás sin conexión?</p>
          <button className="btn-primary" onClick={() => setReintento((n) => n + 1)}>
            Probar de nuevo
          </button>
        </div>
      )}

      {!error && !fc && (
        <>
          <div className="day-card skeleton" />
          <div className="day-card skeleton" />
        </>
      )}

      {fc && dayHoy && evalHoy && (
        <DayCard
          titulo="Hoy"
          fecha={ahora}
          day={dayHoy}
          dia={evalHoy}
          modo={modoHoy}
          recorrido={recorrido}
          presetId={preset}
        />
      )}
      {fc && dayMan && evalMan && (
        <DayCard
          titulo="Mañana"
          fecha={manana}
          day={dayMan}
          dia={evalMan}
          modo="full"
          recorrido={recorrido}
          presetId={preset}
        />
      )}

      {fc && (
        <p className="footer-note">
          {fc.stale && '⚠️ Sin conexión: mostrando datos viejos. '}
          Perfil {p.emoji} {p.nombre} · Clima: Open-Meteo · Actualizado{' '}
          {new Date(fc.fetchedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </>
  )
}
