import type { Franja } from '../types'
import type { HourData } from '../lib/verdict'
import { emojiDe } from '../lib/explain'

// Grafiquita del día tipo Google: una columna por hora (6 a 22),
// con las franjas de ida y vuelta resaltadas.
export function DayStrip({
  hours,
  franjas,
}: {
  hours: HourData[]
  franjas: Franja[]
}) {
  const visibles = hours.filter((h) => h.hour >= 6 && h.hour <= 22)
  const enFranja = (hour: number) => franjas.some((f) => hour >= f.desde && hour < f.hasta)

  return (
    <div className="strip" aria-label="Pronóstico por hora">
      {visibles.map((h) => (
        <div key={h.hour} className={`strip-col ${enFranja(h.hour) ? 'strip-col-on' : ''}`}>
          <span className="strip-emoji">{emojiDe(h.code)}</span>
          <span className="strip-temp">{Math.round(h.temp)}°</span>
          <span className="strip-hour">{h.hour % 4 === 2 ? `${h.hour}` : ''}</span>
        </div>
      ))}
    </div>
  )
}
