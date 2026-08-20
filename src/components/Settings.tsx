import type { PresetId } from '../types'
import { PRESETS } from '../lib/verdict'
import { iaDisponible } from '../lib/ai'
import { nav } from '../App'

export function Settings({
  preset,
  onChange,
}: {
  preset: PresetId
  onChange: (p: PresetId) => void
}) {
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" aria-label="Volver" onClick={() => nav('/')}>
          ←
        </button>
        <h1>Tu perfil de ciclista</h1>
        <span className="icon-btn" />
      </header>

      <p className="settings-intro">
        El perfil define qué tan feo tiene que estar el día para que te diga NO GO.
      </p>

      <div className="preset-list">
        {Object.values(PRESETS).map((p) => (
          <button
            key={p.id}
            className={`preset-card ${preset === p.id ? 'preset-on' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <span className="preset-emoji">{p.emoji}</span>
            <span className="preset-body">
              <strong>{p.nombre}</strong>
              <span>{p.descripcion}</span>
            </span>
            {preset === p.id && <span className="preset-check">✓</span>}
          </button>
        ))}
      </div>

      <details className="thresholds">
        <summary>¿Qué mira cada perfil? (los números)</summary>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>🙂 Flojo</th>
              <th>🚴 Promedio</th>
              <th>🔥 Extremo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Viento sostenido</td>
              <td>30 km/h</td>
              <td>40 km/h</td>
              <td>50 km/h</td>
            </tr>
            <tr>
              <td>Ráfagas</td>
              <td>45 km/h</td>
              <td>50 km/h</td>
              <td>60 km/h</td>
            </tr>
            <tr>
              <td>Frío</td>
              <td>&lt; 10°</td>
              <td>&lt; 8°</td>
              <td>&lt; 5°</td>
            </tr>
            <tr>
              <td>Calor</td>
              <td>&gt; 30°</td>
              <td>&gt; 32°</td>
              <td>&gt; 35°</td>
            </tr>
            <tr>
              <td>Llovizna</td>
              <td>en todo el día, no</td>
              <td>en tu horario, no</td>
              <td>va igual</td>
            </tr>
            <tr>
              <td>Lluvia</td>
              <td>no</td>
              <td>no</td>
              <td>solo si es fuerte, no</td>
            </tr>
          </tbody>
        </table>
        <p className="thresholds-note">⛈️ Tormenta eléctrica: NO GO para todos, sin discusión.</p>
      </details>

      <p className="settings-footer">
        Clima por Open-Meteo · Explicaciones {iaDisponible() ? 'redactadas con IA (Gemini)' : 'automáticas'}
      </p>
    </>
  )
}
