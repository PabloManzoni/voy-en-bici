import { useMemo, useState } from 'react'
import type { FranjaId, Lugar, Recorrido } from '../types'
import { FRANJAS } from '../lib/franjas'
import { bearing, distanciaKm, rumboCardinal } from '../lib/geo'
import { uid } from '../lib/storage'
import { nav } from '../App'
import { LugarPicker } from './LugarPicker'

function FranjaPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: FranjaId | ''
  onChange: (v: FranjaId) => void
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips">
        {FRANJAS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${value === f.id ? 'chip-on' : ''}`}
            onClick={() => onChange(f.id)}
          >
            {f.label} <small>{f.horas}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

export function RouteForm({
  recorridos,
  onSave,
  editId,
}: {
  recorridos: Recorrido[]
  onSave: (rs: Recorrido[]) => void
  editId?: string
}) {
  const editando = editId ? recorridos.find((r) => r.id === editId) : undefined
  const [nombre, setNombre] = useState(editando?.nombre ?? '')
  const [origen, setOrigen] = useState<Lugar | null>(editando?.origen ?? null)
  const [destino, setDestino] = useState<Lugar | null>(editando?.destino ?? null)
  const [franjaIda, setFranjaIda] = useState<FranjaId | ''>(editando?.franjaIda ?? '')
  const [franjaVuelta, setFranjaVuelta] = useState<FranjaId | ''>(editando?.franjaVuelta ?? '')

  const mismoLugar =
    origen !== null &&
    destino !== null &&
    Math.abs(origen.lat - destino.lat) < 0.002 &&
    Math.abs(origen.lon - destino.lon) < 0.002

  const preview = useMemo(() => {
    if (!origen || !destino || mismoLugar) return null
    const km = distanciaKm(origen.lat, origen.lon, destino.lat, destino.lon)
    const rumbo = rumboCardinal(bearing(origen.lat, origen.lon, destino.lat, destino.lon))
    return `≈ ${km < 10 ? km.toFixed(1) : Math.round(km)} km, rumbo ${rumbo}`
  }, [origen, destino, mismoLugar])

  const valido = origen && destino && !mismoLugar && franjaIda && franjaVuelta

  const guardar = () => {
    if (!valido) return
    const nuevo: Recorrido = {
      id: editando?.id ?? uid(),
      nombre: nombre.trim() || `${origen!.nombre} → ${destino!.nombre}`,
      origen: origen!,
      destino: destino!,
      franjaIda: franjaIda as FranjaId,
      franjaVuelta: franjaVuelta as FranjaId,
    }
    const rs = editando
      ? recorridos.map((r) => (r.id === editando.id ? nuevo : r))
      : [...recorridos, nuevo]
    onSave(rs)
    nav('/')
  }

  const borrar = () => {
    if (!editando) return
    if (!confirm(`¿Borrar "${editando.nombre}"?`)) return
    onSave(recorridos.filter((r) => r.id !== editando.id))
    nav('/')
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" aria-label="Volver" onClick={() => nav('/')}>
          ←
        </button>
        <h1>
          {editando
            ? 'Editar recorrido'
            : recorridos.length === 0
              ? '3 de 3 · Tu primer recorrido'
              : 'Nuevo recorrido'}
        </h1>
        <span className="icon-btn" />
      </header>

      <div className="form">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            type="text"
            placeholder="Al trabajo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>

        <LugarPicker label="¿De dónde salís?" value={origen} onChange={setOrigen} />
        <LugarPicker label="¿A dónde vas?" value={destino} onChange={setDestino} />

        {mismoLugar && (
          <p className="form-error">El origen y el destino no pueden ser el mismo lugar.</p>
        )}
        {preview && <p className="form-preview">{preview}</p>}

        <FranjaPicker label="¿A qué hora vas? (ida)" value={franjaIda} onChange={setFranjaIda} />
        <FranjaPicker label="¿A qué hora volvés?" value={franjaVuelta} onChange={setFranjaVuelta} />

        <button className="btn-primary" disabled={!valido} onClick={guardar}>
          Guardar recorrido
        </button>
        {editando && (
          <button className="btn-danger" onClick={borrar}>
            Borrar recorrido
          </button>
        )}
      </div>
    </>
  )
}
