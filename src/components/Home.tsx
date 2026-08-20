import type { Recorrido } from '../types'
import { barrioById } from '../data/barrios'
import { franjaById } from '../lib/franjas'
import { nav } from '../App'

export function Home({ recorridos }: { recorridos: Recorrido[] }) {
  return (
    <>
      <header className="topbar">
        <h1>🚴 ¿Voy en bici?</h1>
        <button className="icon-btn" aria-label="Perfil" onClick={() => nav('/settings')}>
          ⚙️
        </button>
      </header>

      {recorridos.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🚴💨</div>
          <p>
            Cargá tu primer recorrido y te digo si <strong>hoy y mañana</strong> se va en bici o no.
          </p>
          <button className="btn-primary" onClick={() => nav('/new')}>
            Crear mi primer recorrido
          </button>
        </div>
      ) : (
        <>
          <div className="route-list">
            {recorridos.map((r) => {
              const o = barrioById(r.origenId)
              const d = barrioById(r.destinoId)
              return (
                <button key={r.id} className="route-card" onClick={() => nav(`/r/${r.id}`)}>
                  <div className="route-card-main">
                    <div className="route-name">{r.nombre}</div>
                    <div className="route-sub">
                      {o?.nombre} → {d?.nombre}
                    </div>
                    <div className="route-sub muted">
                      Ida {franjaById(r.franjaIda).label.toLowerCase()} · Vuelta{' '}
                      {franjaById(r.franjaVuelta).label.toLowerCase()}
                    </div>
                  </div>
                  <span
                    className="edit-link"
                    role="button"
                    aria-label={`Editar ${r.nombre}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      nav(`/edit/${r.id}`)
                    }}
                  >
                    ✏️
                  </span>
                  <span className="chevron">›</span>
                </button>
              )
            })}
          </div>
          <button className="btn-secondary" onClick={() => nav('/new')}>
            + Nuevo recorrido
          </button>
        </>
      )}
    </>
  )
}
