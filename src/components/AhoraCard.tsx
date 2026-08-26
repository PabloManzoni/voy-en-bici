import { useEffect, useState } from 'react'
import type { PresetId, Recorrido, VehiculoId } from '../types'
import { evalHour, pisoMojado, PRESETS, type HourData } from '../lib/verdict'
import { configEval, VEHICULOS } from '../lib/vehiculos'
import { motivoFrase } from '../lib/explain'
import { getForecast, hoyLocal } from '../lib/weather'
import { puntoMedio, rumboCardinal } from '../lib/geo'
import { tzUsuario } from '../lib/geocoding'
import { WeatherIcon } from './Icons'

const MONTEVIDEO = { lat: -34.905, lon: -56.19 }

// Semáforo de AHORA en la home: ¿da para salir en este momento?
// Independiente de recorridos (sin dirección de viento ni franjas).
// Usa el mismo cache de clima que los recorridos: una sola llamada cada 30 min.
export function AhoraCard({
  recorridos,
  vehiculo,
  preset,
}: {
  recorridos: Recorrido[]
  vehiculo: VehiculoId
  preset: PresetId
}) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [hora, setHora] = useState<HourData | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)

  // Ubicación: el punto del primer recorrido (comparte cache con su veredicto);
  // sin recorridos, Montevideo — y fuera de Uruguay sin recorridos, nada.
  const r = recorridos[0]
  const coords = r
    ? puntoMedio(r.origen, r.destino)
    : tzUsuario() === 'America/Montevideo'
      ? MONTEVIDEO
      : null

  useEffect(() => {
    if (!coords) return
    let vivo = true
    setEstado('cargando')
    getForecast(coords.lat, coords.lon)
      .then((fc) => {
        if (!vivo) return
        const dia = fc.days.find((d) => d.date === hoyLocal())
        const h = dia?.hours.find((x) => x.hour === new Date().getHours())
        if (!dia || !h) {
          setEstado('error')
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
        setEstado('listo')
      })
      .catch(() => vivo && setEstado('error'))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lon, vehiculo, preset])

  if (!coords || estado === 'error') return null

  if (estado === 'cargando' || !hora) {
    return <div className="ahora-card ahora-skeleton" aria-hidden="true" />
  }

  const da = motivo === null
  const v = VEHICULOS[vehiculo]
  const p = PRESETS[preset]

  return (
    <div className={`ahora-card ${da ? 'ahora-da' : 'ahora-noda'}`}>
      <div className="ahora-fila">
        <WeatherIcon code={hora.code} size={26} />
        <span className="ahora-texto">
          Ahora {da ? <strong className="ahora-si">da para salir</strong> : <strong className="ahora-no">no da</strong>}
        </span>
        <span className="ahora-temp">
          {Math.round(hora.temp)}°
          {hora.apparent !== undefined && Math.abs(hora.apparent - hora.temp) >= 2
            ? ` (${Math.round(hora.apparent)}°)`
            : ''}
        </span>
      </div>
      {!da && <div className="ahora-motivo">{motivo}</div>}
      <div className="ahora-perfil">
        {v.emoji} {v.nombre} · {p.emoji} {p.nombre}
        {hora.wind >= 12 && ` · viento del ${rumboCardinal(hora.windFrom)} a ${Math.round(hora.wind)} km/h`}
      </div>
    </div>
  )
}
