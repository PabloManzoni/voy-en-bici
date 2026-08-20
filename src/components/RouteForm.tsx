import { useMemo, useState } from 'react'
import type { FranjaId, Recorrido } from '../types'
import { BARRIOS, barrioById } from '../data/barrios'
import { FRANJAS } from '../lib/franjas'
import { bearing, distanciaKm, rumboCardinal } from '../lib/geo'
import { uid } from '../lib/storage'
import { nav } from '../App'

const DEPTOS = ['Montevideo', 'Canelones', 'San José'] as const

function BarrioSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Elegí un barrio…</option>
        {DEPTOS.map((d) => (
          <optgroup key={d} label={d}>
            {BARRIOS.filter((b) => b.depto === d).map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

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
  const [origenId, setOrigenId] = useState(editando?.origenId ?? '')
  const [destinoId, setDestinoId] = useState(editando?.destinoId ?? '')
  const [franjaIda, setFranjaIda] = useState<FranjaId | ''>(editando?.franjaIda ?? '')
  const [franjaVuelta, setFranjaVuelta] = useState<FranjaId | ''>(editando?.franjaVuelta ?? '')

  const origen = barrioById(origenId)
  const destino = barrioById(destinoId)

  const preview = useMemo(() => {
    if (!origen || !destino || origen.id === destino.id) return null
    const km = distanciaKm(origen.lat, origen.lon, destino.lat, destino.lon)
    const rumbo = rumboCardinal(bearing(origen.lat, origen.lon, destino.lat, destino.lon))
    return `≈ ${km < 10 ? km.toFixed(1) : Math.round(km)} km, rumbo ${rumbo}`
  }, [origen, destino])

  const valido = origen && destino && origen.id !== destino.id && franjaIda && franjaVuelta

  const guardar = () => {
    if (!valido) return
    const nuevo: Recorrido = {
      id: editando?.id ?? uid(),
      nombre: nombre.trim() || `${origen!.nombre} → ${destino!.nombre}`,
      origenId,
      destinoId,
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
        <h1>{editando ? 'Editar recorrido' : 'Nuevo recorrido'}</h1>
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

        <BarrioSelect label="¿De dónde salís?" value={origenId} onChange={setOrigenId} />
        <BarrioSelect label="¿A dónde vas?" value={destinoId} onChange={setDestinoId} />

        {origen && destino && origen.id === destino.id && (
          <p className="form-error">El origen y el destino no pueden ser el mismo barrio.</p>
        )}
        {preview && <p className="form-preview">📍 {preview}</p>}

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
