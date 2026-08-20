import { useState } from 'react'
import type { Franja } from '../types'
import { evalHour, type HourData, type Umbrales } from '../lib/verdict'
import { motivoFrase, palabraClima } from '../lib/explain'
import { rumboCardinal } from '../lib/geo'
import { WeatherIcon } from './Icons'

// Mapa del día (6 a 22 h): ícono y temperatura por hora.
// Un solo código de color: los tramos feos para la bici se tiñen de rosado, sutil.
// La ida y la vuelta se marcan con flechas largas (→ arriba, ← abajo) sobre su rango.
// Tocar una hora abre el detalle: clima, temperatura, viento, lluvia y si bloquea tu perfil.
export function DayStrip({
  hours,
  umbrales,
  ida,
  vuelta,
}: {
  hours: HourData[]
  umbrales: Umbrales
  ida: Franja
  vuelta: Franja
}) {
  const [sel, setSel] = useState<number | null>(null)
  const visibles = hours.filter((h) => h.hour >= 6 && h.hour <= 22)

  // Horas consecutivas con el mismo estado se unen en un solo lapso,
  // así el día se lee como bandas: "de acá a acá, mejor no".
  const lapsos: Array<{ ok: boolean; hs: HourData[] }> = []
  for (const h of visibles) {
    const ok = evalHour(h, umbrales).length === 0
    const ultimo = lapsos[lapsos.length - 1]
    if (ultimo && ultimo.ok === ok) ultimo.hs.push(h)
    else lapsos.push({ ok, hs: [h] })
  }

  const pieza = (h: number, f: Franja) => {
    if (h < f.desde || h >= f.hasta) return null
    return `${h === f.desde ? 'fr-first' : ''} ${h === f.hasta - 1 ? 'fr-last' : ''}`
  }

  const elegida = sel !== null ? visibles.find((h) => h.hour === sel) : undefined

  return (
    <div>
      <div className="strip" aria-label="Pronóstico por hora">
        {lapsos.map((seg) => (
          <div
            key={seg.hs[0].hour}
            className={`strip-seg ${seg.ok ? '' : 'seg-bad'}`}
            style={{ flex: seg.hs.length }}
          >
            {seg.hs.map((h) => {
              const pIda = pieza(h.hour, ida)
              const pVuelta = pieza(h.hour, vuelta)
              return (
                <button
                  type="button"
                  key={h.hour}
                  className={`strip-col ${sel === h.hour ? 'strip-sel' : ''}`}
                  aria-label={`Detalle de las ${h.hour}:00`}
                  onClick={() => setSel(sel === h.hour ? null : h.hour)}
                >
                  <WeatherIcon code={h.code} size={15} />
                  <span className="strip-temp">{Math.round(h.temp)}°</span>
                  <span className="fr">
                    {pIda !== null && <i className={`fr-ida ${pIda}`} />}
                    {pVuelta !== null && <i className={`fr-vuelta ${pVuelta}`} />}
                  </span>
                  <span className="strip-hour">{h.hour % 4 === 2 ? `${h.hour}` : ''}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {elegida && <HoraDetalle h={elegida} umbrales={umbrales} />}
    </div>
  )
}

function HoraDetalle({ h, umbrales }: { h: HourData; umbrales: Umbrales }) {
  const motivos = evalHour(h, umbrales)
  const prob = h.rainProb ?? 0
  const sensacion =
    h.apparent !== undefined && Math.abs(h.apparent - h.temp) >= 2
      ? ` (sensación ${Math.round(h.apparent)}°)`
      : ''
  const rafagas = h.gust >= h.wind + 10 ? `, ráfagas de ${Math.round(h.gust)}` : ''
  const lluvia =
    prob >= 10 || h.precip > 0
      ? `${prob}% de lluvia${h.precip > 0 ? ` (${h.precip.toFixed(1)} mm)` : ''}`
      : 'sin lluvia a la vista'

  return (
    <div className="hora-panel">
      <div className="hora-head">
        <WeatherIcon code={h.code} size={18} />
        <strong>{h.hour}:00</strong> · {palabraClima(h.code)}
      </div>
      <div className="hora-datos">
        <span>
          {Math.round(h.temp)}°{sensacion}
        </span>
        <span>
          viento del {rumboCardinal(h.windFrom)} a {Math.round(h.wind)} km/h{rafagas}
        </span>
        <span>{lluvia}</span>
      </div>
      {motivos.length > 0 ? (
        <div className="hora-veredicto hora-mal">Para tu perfil: {motivoFrase(motivos[0])}.</div>
      ) : (
        <div className="hora-veredicto hora-bien">A esta hora está para bici.</div>
      )}
    </div>
  )
}
