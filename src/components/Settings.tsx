import { useEffect, useState } from 'react'
import type { PresetId } from '../types'
import { PRESETS } from '../lib/verdict'
import { iaDisponible } from '../lib/ai'
import { nav } from '../App'
import { PhoneIcon } from './Icons'

interface PromptInstalacion extends Event {
  prompt: () => Promise<void>
}

function InstallCard() {
  const [promptEvento, setPromptEvento] = useState<PromptInstalacion | null>(null)
  const [instalada, setInstalada] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvento(e as PromptInstalacion)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setInstalada(mq.matches)
    mq.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      mq.removeEventListener('change', onChange)
    }
  }, [])

  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="install-card">
      <div className="install-head">
        <PhoneIcon /> Llevala en el teléfono
      </div>
      {instalada ? (
        <p className="install-ok">Ya está instalada en este dispositivo ✓</p>
      ) : promptEvento ? (
        <>
          <p className="install-body">
            Instalada abre al toque y tus recorridos no se borran nunca.
          </p>
          <button className="btn-mini" onClick={() => promptEvento.prompt()}>
            Instalar la app
          </button>
        </>
      ) : esIOS ? (
        <p className="install-body">
          En Safari: tocá <strong>Compartir</strong> y elegí{' '}
          <strong>«Agregar a pantalla de inicio»</strong>. Así abre como app y tus recorridos no
          se borran nunca.
        </p>
      ) : (
        <p className="install-body">
          En el menú del navegador elegí <strong>«Instalar app»</strong> (o «Agregar a pantalla
          de inicio»). Así abre al toque y tus recorridos no se borran.
        </p>
      )}
    </div>
  )
}

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
              <th>💅 Flojo</th>
              <th>🚴 Promedio</th>
              <th>🥚 Extremo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Viento sostenido</td>
              <td>20 km/h</td>
              <td>32 km/h</td>
              <td>50 km/h</td>
            </tr>
            <tr>
              <td>Ráfagas</td>
              <td>35 km/h</td>
              <td>50 km/h</td>
              <td>60 km/h</td>
            </tr>
            <tr>
              <td>Frío</td>
              <td>&lt; 12°</td>
              <td>&lt; 4°</td>
              <td>&lt; 1°</td>
            </tr>
            <tr>
              <td>Calor</td>
              <td>&gt; 30°</td>
              <td>&gt; 33°</td>
              <td>&gt; 36°</td>
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
        <p className="thresholds-note">Tormenta eléctrica: nadie sale, sin discusión.</p>
      </details>

      <InstallCard />

      <p className="settings-footer">
        Clima por Open-Meteo · Explicaciones {iaDisponible() ? 'redactadas con IA (Gemini)' : 'automáticas'}
      </p>
    </>
  )
}
