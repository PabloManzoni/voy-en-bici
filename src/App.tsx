import { useEffect, useState } from 'react'
import type { PresetId, Recorrido } from './types'
import { loadPreset, loadRecorridos, savePreset, saveRecorridos } from './lib/storage'
import { Home } from './components/Home'
import { RouteForm } from './components/RouteForm'
import { VerdictView } from './components/VerdictView'
import { Settings } from './components/Settings'

function useHashRoute(): string {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setRoute(location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function nav(to: string) {
  location.hash = to
}

export default function App() {
  const route = useHashRoute()
  const [recorridos, setRecorridos] = useState<Recorrido[]>(loadRecorridos)
  const [preset, setPreset] = useState<PresetId>(loadPreset)

  const updateRecorridos = (rs: Recorrido[]) => {
    setRecorridos(rs)
    saveRecorridos(rs)
  }

  const updatePreset = (p: PresetId) => {
    setPreset(p)
    savePreset(p)
  }

  let view
  if (route === '/new') {
    view = <RouteForm recorridos={recorridos} onSave={updateRecorridos} />
  } else if (route.startsWith('/edit/')) {
    view = <RouteForm recorridos={recorridos} onSave={updateRecorridos} editId={route.slice(6)} />
  } else if (route.startsWith('/r/')) {
    view = <VerdictView recorridos={recorridos} preset={preset} id={route.slice(3)} />
  } else if (route === '/settings') {
    view = <Settings preset={preset} onChange={updatePreset} />
  } else {
    view = <Home recorridos={recorridos} />
  }

  return <div className="app">{view}</div>
}
