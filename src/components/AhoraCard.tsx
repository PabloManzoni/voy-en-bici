import { useEffect, useState } from 'react'
import type { PresetId, Recorrido, VehiculoId } from '../types'
import { evalHour, pisoMojado, PRESETS, type HourData } from '../lib/verdict'
import { configEval, VEHICULOS } from '../lib/vehiculos'
import { motivoFrase } from '../lib/explain'
import { getForecast, hoyLocal } from '../lib/weather'
import { puntoMedio, rumboCardinal } from '../lib/geo'
import { tzUsuario } from '../lib/geocoding'
import { loadUbicacion, marcarUbicacion } from '../lib/storage'
import { WeatherIcon } from './Icons'

const MONTEVIDEO = { lat: -34.905, lon: -56.19 }

type Fuente = 'real' | 'recorrido' | 'ciudad'

// Ubicación del semáforo, en orden de preferencia:
// 1) la real, si el usuario alguna vez tocó "usar mi ubicación" (precisión
//    baja: alcanza para clima y no gasta batería; si falla, cae al siguiente);
// 2) el punto del primer recorrido (comparte el cache de clima con él);
// 3) Montevideo, si la zona horaria es de Uruguay;
// 4) nada → se muestra el pedido de ubicación.
async function resolverCoords(
  recorridos: Recorrido[],
): Promise<{ lat: number; lon: number; fuente: Fuente } | null> {
  if (loadUbicacion() && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 10 * 60 * 1000,
        }),
      )
      return { lat: pos.coords.latitude, lon: pos.coords.longitude, fuente: 'real' }
    } catch (e) {
      // permiso revocado: volver a ofrecer el botón
      if ((e as GeolocationPositionError)?.code === 1) marcarUbicacion(false)
    }
  }
  const r = recorridos[0]
  if (r) return { ...puntoMedio(r.origen, r.destino), fuente: 'recorrido' }
  if (tzUsuario() === 'America/Montevideo') return { ...MONTEVIDEO, fuente: 'ciudad' }
  return null
}

export function AhoraCard({
  recorridos,
  vehiculo,
  preset,
}: {
  recorridos: Recorrido[]
  vehiculo: VehiculoId
  preset: PresetId
}) {
  const [fase, setFase] = useState<'cargando' | 'listo' | 'pedir' | 'nada'>('cargando')
  const [fuente, setFuente] = useState<Fuente>('ciudad')
  const [hora, setHora] = useState<HourData | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    setFase('cargando')
    ;(async () => {
      const coords = await resolverCoords(recorridos)
      if (!vivo) return
      if (!coords) {
        setFase('pedir')
        return
      }
      try {
        const fc = await getForecast(coords.lat, coords.lon)
        if (!vivo) return
        const dia = fc.days.find((d) => d.date === hoyLocal())
        const h = dia?.hours.find((x) => x.hour === new Date().getHours())
        if (!dia || !h) {
          setFase('nada')
          return
        }
        const cfg = configEval(vehiculo, preset)
        const motivos = evalHour(h, cfg.umbrales)
        if (cfg.pisoMojado && motivos.length === 0) {
          const mojado = pisoMojado(dia.hours, h.hour)
          if (mojado) motivos.push({ tipo: 'piso-mojado', valor: mojado.mm, hora: h.hour })
        }
        setHora(h)
        setMotivo(motivos.length > 0 ? motivoFrase(motivos[0]) : null)
        setFuente(coords.fuente)
        setFase('listo')
      } catch {
        if (vivo) setFase('nada')
      }
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, vehiculo, preset, recorridos.length])

  // El toque del botón ES el gesto que dispara el popup de permiso del navegador.
  const pedirUbicacion = () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      () => {
        marcarUbicacion(true)
        setTick((t) => t + 1)
      },
      () => {
        // denegado o falló: no insistimos; el botón queda para otro intento
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  if (fase === 'nada') return null

  if (fase === 'cargando') {
    return <div className="ahora-card ahora-skeleton" aria-hidden="true" />
  }

  if (fase === 'pedir') {
    return (
      <div className="ahora-card">
        <span className="ahora-pedir-emoji">📍</span>
        <p className="ahora-texto">
          <strong>No sé dónde estás.</strong>
          <br />
          Compartí tu ubicación para ver si da para salir.
        </p>
        <button className="btn-mini ahora-espaciado" onClick={pedirUbicacion}>
          Usar mi ubicación
        </button>
      </div>
    )
  }

  const da = motivo === null
  const v = VEHICULOS[vehiculo]
  const p = PRESETS[preset]

  return (
    <div className={`ahora-card ${da ? 'ahora-da' : 'ahora-noda'}`}>
      {hora && <WeatherIcon code={hora.code} size={110} />}
      <div className="ahora-texto">
        Ahora{' '}
        {da ? (
          <strong className="ahora-si">da para salir</strong>
        ) : (
          <strong className="ahora-no">no da</strong>
        )}
      </div>
      {hora && (
        <div className="ahora-temp">
          {Math.round(hora.temp)}°
          {hora.apparent !== undefined && Math.abs(hora.apparent - hora.temp) >= 2
            ? ` (sensación ${Math.round(hora.apparent)}°)`
            : ''}
        </div>
      )}
      {!da && <div className="ahora-motivo">{motivo}</div>}
      <div className="ahora-perfil">
        {fuente === 'real' && '📍 tu zona · '}
        {v.emoji} {v.nombre} · {p.emoji} {p.nombre}
        {hora && hora.wind >= 12 && ` · viento del ${rumboCardinal(hora.windFrom)} a ${Math.round(hora.wind)} km/h`}
      </div>
      {fuente !== 'real' && (
        <button className="ahora-pin ahora-espaciado" onClick={pedirUbicacion}>
          📍 usar mi ubicación
        </button>
      )}
    </div>
  )
}
