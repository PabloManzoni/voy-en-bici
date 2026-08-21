import type { Recorrido } from '../types'
import { franjaById } from '../lib/franjas'
import { nav } from '../App'
import { ChevronIcon, GearIcon, PencilIcon } from './Icons'

export function Home({ recorridos }: { recorridos: Recorrido[] }) {
  return (
    <>
      <header className="topbar">
        <h1>
          <img src="/logo-96.png" alt="" className="logo-mini" /> ¿Me mando?
        </h1>
        <button className="icon-btn" aria-label="Perfil" onClick={() => nav('/settings')}>
          <GearIcon />
        </button>
      </header>

      {recorridos.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">
            <img src="/logo-96.png" alt="" className="logo-hero" />
          </div>
          <p>
            Cargá tu primer recorrido y te digo si <strong>hoy y mañana</strong> te mandás o no.
          </p>
          <button className="btn-primary" onClick={() => nav('/new')}>
            Crear mi primer recorrido
          </button>
        </div>
      ) : (
        <>
          <div className="route-list">
            {recorridos.map((r) => {
              return (
                <button key={r.id} className="route-card" onClick={() => nav(`/r/${r.id}`)}>
                  <div className="route-card-main">
                    <div className="route-name">{r.nombre}</div>
                    <div className="route-sub">
                      {r.origen.nombre} → {r.destino.nombre}
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
                    <PencilIcon />
                  </span>
                  <span className="chevron">
                    <ChevronIcon />
                  </span>
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
