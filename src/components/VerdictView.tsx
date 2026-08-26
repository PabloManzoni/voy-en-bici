import { useEffect, useMemo, useState } from 'react'
import type { PresetId, Recorrido, VehiculoId } from '../types'
import { VEHICULOS } from '../lib/vehiculos'
import type { Umbrales } from '../lib/verdict'
import { franjaById } from '../lib/franjas'
import { bearing, puntoMedio } from '../lib/geo'
import { getForecast, hoyLocal, invalidarForecast, type Forecast, type ForecastDay } from '../lib/weather'
import { evalDia, PRESETS, type ConfigEval, type DiaEval } from '../lib/verdict'
import { configEval } from '../lib/vehiculos'
import { fraseBadge, fraseResumen, fraseTramo } from '../lib/explain'
import { explicacionIA } from '../lib/ai'
import { DayStrip } from './DayStrip'
import { GearIcon, RefreshIcon } from './Icons'
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
  vehiculo,
  umbrales,
  horaActual,
  expandido,
  onToggle,
  destacar,
}: {
  titulo: string
  fecha: Date
  day: ForecastDay
  dia: DiaEval
  modo: Modo
  recorrido: Recorrido
  presetId: PresetId
  vehiculo: VehiculoId
  umbrales: Umbrales
  horaActual?: number // solo HOY: para atenuar horas pasadas y mostrar "quedan X–Y"
  expandido: boolean
  onToggle: () => void
  destacar: boolean // al entrar: pulso sobre los motivos del NO GO
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
    explicacionIA({
      etiquetaDia: etiqueta,
      recorrido: `${recorrido.origen.nombre} → ${recorrido.destino.nombre}`,
      vehiculo: VEHICULOS[vehiculo].nombre,
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

  // Rango que se muestra por franja: si estamos adentro, "quedan X–Y".
  const horasDe = (f: typeof fIda) =>
    horaActual !== undefined && horaActual > f.desde && horaActual < f.hasta
      ? `quedan ${horaActual}–${f.hasta}`
      : f.horas

  const resumen =
    modo === 'pasado'
      ? 'El día ya terminó. Mirá mañana.'
      : (texto ?? fraseResumen(modo === 'solo-vuelta' ? { ...dia, go } : dia, modo, umbrales))

  const clase =
    modo === 'pasado' ? 'day-card day-past' : go ? 'day-card day-go' : 'day-card day-nogo'

  return (
    <section className={`${clase} ${expandido ? '' : 'day-colapsada'}`}>
      <button type="button" className="day-head" onClick={onToggle}>
        <span className="day-title">
          <span className="day-caret">{expandido ? '▾' : '▸'}</span>
          {titulo} · <span className="muted">{fechaLabel}</span>
        </span>
        {modo === 'pasado' ? (
          <span className="badge badge-past">Ya fue</span>
        ) : (
          <span className={`badge ${go ? 'badge-go' : 'badge-nogo'}`}>
            {go ? 'Sí, dale' : 'Mejor no'}
          </span>
        )}
      </button>

      {expandido && modo !== 'pasado' && (
        <p className="day-frase">{fraseBadge(go, fecha.getDate())}</p>
      )}

      <p className="day-sub">{resumen}</p>

      {expandido && modo !== 'pasado' && (
        <div className="tramos">
          <div
            className={`tramo ${modo === 'solo-vuelta' ? 'tramo-off' : dia.ida.go ? '' : `tramo-bad ${destacar ? 'tramo-pulso' : ''}`}`}
          >
            <span className="tramo-dir">→</span>
            <span className="tramo-body">
              <strong>Ida</strong> · {fIda.label} ({horasDe(fIda)} h)
              <span className="tramo-detalle">
                {modo === 'solo-vuelta' ? 'ya pasó' : fraseTramo(dia.ida)}
              </span>
            </span>
            <span className="tramo-mark">
              {modo === 'solo-vuelta' ? '–' : dia.ida.go ? '✓' : '✗'}
            </span>
          </div>
          <div className={`tramo ${dia.vuelta.go ? '' : `tramo-bad ${destacar ? 'tramo-pulso' : ''}`}`}>
            <span className="tramo-dir">←</span>
            <span className="tramo-body">
              <strong>Vuelta</strong> · {fVuelta.label} ({horasDe(fVuelta)} h)
              <span className="tramo-detalle">{fraseTramo(dia.vuelta)}</span>
            </span>
            <span className="tramo-mark">{dia.vuelta.go ? '✓' : '✗'}</span>
          </div>
        </div>
      )}

      {expandido && (
        <DayStrip
          hours={day.hours}
          umbrales={umbrales}
          ida={fIda}
          vuelta={fVuelta}
          horaActual={horaActual}
        />
      )}
    </section>
  )
}

export function VerdictView({
  recorridos,
  preset,
  vehiculo,
  id,
}: {
  recorridos: Recorrido[]
  preset: PresetId
  vehiculo: VehiculoId
  id: string
}) {
  const recorrido = recorridos.find((r) => r.id === id)
  const [fc, setFc] = useState<Forecast | null>(null)
  const [error, setError] = useState(false)
  const [reintento, setReintento] = useState(0)

  const origen = recorrido?.origen
  const destino = recorrido?.destino

  const ahora = new Date()
  const horaActual = ahora.getHours()
  const fIda = recorrido ? franjaById(recorrido.franjaIda) : null
  const fVuelta = recorrido ? franjaById(recorrido.franjaVuelta) : null
  const modoHoy: Modo = !fIda || !fVuelta
    ? 'full'
    : horaActual >= fVuelta.hasta
      ? 'pasado'
      : horaActual >= fIda.hasta
        ? 'solo-vuelta'
        : 'full'

  // Acordeón: hoy expandido por defecto; si el día ya fue, mañana.
  const [abierto, setAbierto] = useState<'hoy' | 'manana'>(() =>
    modoHoy === 'pasado' ? 'manana' : 'hoy',
  )

  // Pulso de entrada sobre los motivos del NO GO: solo unos segundos al abrir.
  const [destacar, setDestacar] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setDestacar(false), 3600)
    return () => clearTimeout(t)
  }, [])

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

  const cfg: ConfigEval = useMemo(() => configEval(vehiculo, preset), [vehiculo, preset])

  // HOY: las horas que ya pasaron no cuentan para el veredicto.
  const evalHoy = dayHoy
    ? evalDia(dayHoy.hours, recorrido.franjaIda, recorrido.franjaVuelta, heading, cfg, horaActual)
    : null
  const evalMan = dayMan
    ? evalDia(dayMan.hours, recorrido.franjaIda, recorrido.franjaVuelta, heading, cfg)
    : null

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
        <button
          className="icon-btn"
          aria-label="Actualizar clima"
          onClick={() => {
            const mid = puntoMedio(origen, destino)
            invalidarForecast(mid.lat, mid.lon)
            setReintento((n) => n + 1)
          }}
        >
          <RefreshIcon />
        </button>
        <button className="icon-btn" aria-label="Perfil" onClick={() => nav('/settings')}>
          <GearIcon />
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
          vehiculo={vehiculo}
          umbrales={cfg.umbrales}
          horaActual={horaActual}
          expandido={abierto === 'hoy'}
          onToggle={() => setAbierto('hoy')}
          destacar={destacar}
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
          vehiculo={vehiculo}
          umbrales={cfg.umbrales}
          expandido={abierto === 'manana'}
          onToggle={() => setAbierto('manana')}
          destacar={destacar}
        />
      )}

      {fc && (
        <p className="footer-note">
          {fc.stale && '⚠️ Sin conexión: mostrando datos viejos. '}
          {VEHICULOS[vehiculo].emoji} {VEHICULOS[vehiculo].nombre} · {p.emoji} {p.nombre} ·
          Clima: Open-Meteo · Actualizado{' '}
          {new Date(fc.fetchedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </>
  )
}
