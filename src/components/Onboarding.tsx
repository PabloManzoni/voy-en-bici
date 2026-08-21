import { useState } from 'react'
import type { PresetId, VehiculoId } from '../types'
import { PRESETS } from '../lib/verdict'
import { VEHICULOS } from '../lib/vehiculos'

// Primera apertura (sin recorridos ni configuración): dos preguntas en pasos
// y de ahí directo a crear el primer recorrido. Nunca más se muestra.
export function Onboarding({
  onVehiculo,
  onPreset,
  onCompleto,
}: {
  onVehiculo: (v: VehiculoId) => void
  onPreset: (p: PresetId) => void
  onCompleto: () => void
}) {
  const [paso, setPaso] = useState<1 | 2>(1)

  return (
    <div className="onboarding">
      <div className="ob-head">
        <img src="/logo-96.png" alt="" className="logo-hero" />
        <h1>¿Me mando?</h1>
        <p>Te digo si hoy y mañana salís rodando o mejor no, según el clima.</p>
      </div>

      {paso === 1 ? (
        <>
          <p className="section-title">1 de 3 · ¿En qué te movés?</p>
          <div className="preset-list">
            {Object.values(VEHICULOS).map((v) => (
              <button
                key={v.id}
                className="preset-card preset-slim"
                onClick={() => {
                  onVehiculo(v.id)
                  setPaso(2)
                }}
              >
                <span className="preset-emoji">{v.emoji}</span>
                <span className="preset-body">
                  <strong>{v.nombre}</strong>
                  <span>{v.descripcion}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="section-title">2 de 3 · ¿Qué tan aguante sos con el clima?</p>
          <div className="preset-list">
            {Object.values(PRESETS).map((p) => (
              <button
                key={p.id}
                className="preset-card"
                onClick={() => {
                  onPreset(p.id)
                  onCompleto()
                }}
              >
                <span className="preset-emoji">{p.emoji}</span>
                <span className="preset-body">
                  <strong>{p.nombre}</strong>
                  <span>{p.descripcion}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="ob-nota">Después lo cambiás cuando quieras en Ajustes.</p>
    </div>
  )
}
