import { useEffect, useRef, useState } from 'react'
import type { Lugar } from '../types'
import { buscarLocal, buscarOnline, mezclar } from '../lib/geocoding'

// Buscador de lugares con autocompletado: la lista local responde al instante
// (alfabética) y el geocoder online completa con cualquier otro lugar.
export function LugarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Lugar | null
  onChange: (l: Lugar | null) => void
}) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Lugar[]>([])
  const [buscando, setBuscando] = useState(false)
  const [sinRed, setSinRed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const q = query.trim()
    if (q.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }

    const local = buscarLocal(q)
    setResultados(local)
    setBuscando(true)
    setSinRed(false)

    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(async () => {
      try {
        const online = await buscarOnline(q, controller.signal)
        if (!controller.signal.aborted) {
          setResultados(mezclar(local, online))
          setBuscando(false)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setBuscando(false)
          if (local.length === 0) setSinRed(true)
        }
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  if (value) {
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <div className="lugar-elegido">
          <span className="lugar-nombre">
            {value.nombre}
            {value.detalle && <span className="lugar-detalle"> · {value.detalle}</span>}
          </span>
          <button type="button" className="lugar-cambiar" onClick={() => onChange(null)}>
            cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        placeholder="Escribí un barrio o ciudad…"
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length >= 2 && (
        <div className="lugar-lista">
          {resultados.map((r, i) => (
            <button
              key={`${r.nombre}-${r.lat}-${i}`}
              type="button"
              className="lugar-item"
              onClick={() => {
                onChange(r)
                setQuery('')
              }}
            >
              <span className="lugar-nombre">{r.nombre}</span>
              {r.detalle && <span className="lugar-detalle">{r.detalle}</span>}
            </button>
          ))}
          {buscando && <div className="lugar-nota">buscando…</div>}
          {!buscando && resultados.length === 0 && !sinRed && (
            <div className="lugar-nota">No encontré ese lugar. Probá con otro nombre.</div>
          )}
          {sinRed && <div className="lugar-nota">Sin conexión: no pude buscar lugares.</div>}
        </div>
      )}
    </div>
  )
}
