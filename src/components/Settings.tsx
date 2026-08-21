import { useEffect, useState } from 'react'
import type { PresetId, VehiculoId } from '../types'
import { PRESETS } from '../lib/verdict'
import { reglasExtraDe, umbralesDe, VEHICULOS } from '../lib/vehiculos'
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

// Elegido compacto + "cambiar": la lista de 5 solo aparece al querer cambiar.
function VehiculoPicker({
  vehiculo,
  onChange,
}: {
  vehiculo: VehiculoId
  onChange: (v: VehiculoId) => void
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const actual = VEHICULOS[vehiculo]

  if (!eligiendo) {
    return (
      <button className="preset-card preset-slim" onClick={() => setEligiendo(true)}>
        <span className="preset-emoji">{actual.emoji}</span>
        <span className="preset-body">
          <strong>{actual.nombre}</strong>
          <span>{actual.descripcion}</span>
        </span>
        <span className="lugar-cambiar">cambiar</span>
      </button>
    )
  }

  return (
    <div className="preset-list">
      {Object.values(VEHICULOS).map((v) => (
        <button
          key={v.id}
          className={`preset-card preset-slim ${vehiculo === v.id ? 'preset-on' : ''}`}
          onClick={() => {
            onChange(v.id)
            setEligiendo(false)
          }}
        >
          <span className="preset-emoji">{v.emoji}</span>
          <span className="preset-body">
            <strong>{v.nombre}</strong>
            <span>{v.descripcion}</span>
          </span>
          {vehiculo === v.id && <span className="preset-check">✓</span>}
        </button>
      ))}
    </div>
  )
}

// Mismo patrón para el perfil de conductor.
function PresetPicker({
  preset,
  onChange,
}: {
  preset: PresetId
  onChange: (p: PresetId) => void
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const actual = PRESETS[preset]

  if (!eligiendo) {
    return (
      <button className="preset-card preset-slim" onClick={() => setEligiendo(true)}>
        <span className="preset-emoji">{actual.emoji}</span>
        <span className="preset-body">
          <strong>{actual.nombre}</strong>
          <span>{actual.descripcion}</span>
        </span>
        <span className="lugar-cambiar">cambiar</span>
      </button>
    )
  }

  return (
    <div className="preset-list">
      {Object.values(PRESETS).map((p) => (
        <button
          key={p.id}
          className={`preset-card ${preset === p.id ? 'preset-on' : ''}`}
          onClick={() => {
            onChange(p.id)
            setEligiendo(false)
          }}
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
  )
}

export function Settings({
  preset,
  onChange,
  vehiculo,
  onChangeVehiculo,
}: {
  preset: PresetId
  onChange: (p: PresetId) => void
  vehiculo: VehiculoId
  onChangeVehiculo: (v: VehiculoId) => void
}) {
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" aria-label="Volver" onClick={() => nav('/')}>
          ←
        </button>
        <h1>Ajustes</h1>
        <span className="icon-btn" />
      </header>

      <p className="section-title">Tu vehículo</p>
      <VehiculoPicker vehiculo={vehiculo} onChange={onChangeVehiculo} />
      <p className="settings-nota">
        Cada vehículo tiene sus propios límites de viento, lluvia y temperatura — los ves
        abajo, en "los números".
      </p>

      <p className="section-title">Tu perfil de conductor</p>
      <p className="settings-intro">
        Define qué tan feo tiene que estar el día para que te diga que no.
      </p>

      <PresetPicker preset={preset} onChange={onChange} />

      <details className="thresholds">
        <summary>
          Los números de tu vehículo ({VEHICULOS[vehiculo].nombre.toLowerCase()})
        </summary>
        {(() => {
          const u = umbralesDe(vehiculo)
          const pct = (n: number) => (n === 999 ? 'nunca' : `${n}%`)
          return (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>💅 Flojo</th>
                  <th>👍 Promedio</th>
                  <th>🥚 Extremo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Viento sostenido</td>
                  <td>{u.flojo.vientoMax} km/h</td>
                  <td>{u.promedio.vientoMax} km/h</td>
                  <td>{u.extremo.vientoMax} km/h</td>
                </tr>
                <tr>
                  <td>Ráfagas</td>
                  <td>{u.flojo.rafagaMax} km/h</td>
                  <td>{u.promedio.rafagaMax} km/h</td>
                  <td>{u.extremo.rafagaMax} km/h</td>
                </tr>
                <tr>
                  <td>Frío (sensación)</td>
                  <td>&lt; {u.flojo.tempMin}°</td>
                  <td>&lt; {u.promedio.tempMin}°</td>
                  <td>&lt; {u.extremo.tempMin}°</td>
                </tr>
                <tr>
                  <td>Calor (sensación)</td>
                  <td>&gt; {u.flojo.tempMax}°</td>
                  <td>&gt; {u.promedio.tempMax}°</td>
                  <td>&gt; {u.extremo.tempMax}°</td>
                </tr>
                <tr>
                  <td>Lluvia fuerte</td>
                  <td>{pct(u.flojo.probLluviaFuerte)}</td>
                  <td>{pct(u.promedio.probLluviaFuerte)}</td>
                  <td>{pct(u.extremo.probLluviaFuerte)}</td>
                </tr>
                <tr>
                  <td>Lluvia leve</td>
                  <td>{pct(u.flojo.probLluviaLeve)}</td>
                  <td>{pct(u.promedio.probLluviaLeve)}</td>
                  <td>{pct(u.extremo.probLluviaLeve)}</td>
                </tr>
                <tr>
                  <td>Llovizna</td>
                  <td>{pct(u.flojo.probLlovizna)}</td>
                  <td>{pct(u.promedio.probLlovizna)}</td>
                  <td>{pct(u.extremo.probLlovizna)}</td>
                </tr>
                <tr>
                  <td>Mira la lluvia en…</td>
                  <td>todo el día</td>
                  <td>tus horarios</td>
                  <td>tus horarios</td>
                </tr>
              </tbody>
            </table>
          )
        })()}
        {reglasExtraDe(vehiculo).map((n) => (
          <p key={n} className="thresholds-note">
            {n}
          </p>
        ))}
        <p className="thresholds-note">
          Los porcentajes son la probabilidad mínima de esa lluvia para frenar el veredicto.
          Tormenta eléctrica: nadie sale, sin discusión. El frío y el calor se miden por la
          sensación térmica (viento y humedad incluidos). Y si se junta demasiado —lluvia
          probable más viento o temperatura al límite— también es no, salvo que el viento
          venga de cola: ese empuja, no resta.
        </p>
      </details>

      <InstallCard />

      <p className="settings-footer">
        Clima por Open-Meteo · Explicaciones {iaDisponible() ? 'redactadas con IA (Gemini)' : 'automáticas'}
      </p>
    </>
  )
}
