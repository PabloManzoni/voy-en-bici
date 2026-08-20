import type { Franja } from '../types'
import { evalHour, type HourData, type Umbrales } from '../lib/verdict'
import { WeatherIcon } from './Icons'

// Mapa del día (6 a 22 h): ícono y temperatura por hora.
// Un solo código de color: los tramos feos para la bici se tiñen de rosado, sutil.
// La ida y la vuelta se marcan con flechas largas (→ arriba, ← abajo) sobre su rango.
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

  return (
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
              <div key={h.hour} className="strip-col">
                <WeatherIcon code={h.code} size={15} />
                <span className="strip-temp">{Math.round(h.temp)}°</span>
                <span className="fr">
                  {pIda !== null && <i className={`fr-ida ${pIda}`} />}
                  {pVuelta !== null && <i className={`fr-vuelta ${pVuelta}`} />}
                </span>
                <span className="strip-hour">{h.hour % 4 === 2 ? `${h.hour}` : ''}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
