import { useEffect, useState } from 'react'
import type { PresetId, Recorrido, VehiculoId } from './types'
import {
  loadOnboarded,
  loadPreset,
  loadRecorridos,
  loadVehiculo,
  marcarOnboarded,
  savePreset,
  saveRecorridos,
  saveVehiculo,
} from './lib/storage'
import { Home } from './components/Home'
import { Onboarding } from './components/Onboarding'
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
  const [vehiculo, setVehiculo] = useState<VehiculoId>(loadVehiculo)
  const [onboarded, setOnboarded] = useState<boolean>(loadOnboarded)

  // Quien ya tiene recorridos nunca ve el onboarding (queda con sus valores
  // o los defaults: bici urbana + promedio).
  useEffect(() => {
    if (recorridos.length > 0 && !onboarded) {
      marcarOnboarded()
      setOnboarded(true)
    }
  }, [recorridos.length, onboarded])

  const updateRecorridos = (rs: Recorrido[]) => {
    setRecorridos(rs)
    saveRecorridos(rs)
  }

  const updatePreset = (p: PresetId) => {
    setPreset(p)
    savePreset(p)
  }

  const updateVehiculo = (v: VehiculoId) => {
    setVehiculo(v)
    saveVehiculo(v)
  }

  let view
  if (route === '/new') {
    view = <RouteForm recorridos={recorridos} onSave={updateRecorridos} />
  } else if (route.startsWith('/edit/')) {
    view = <RouteForm recorridos={recorridos} onSave={updateRecorridos} editId={route.slice(6)} />
  } else if (route.startsWith('/r/')) {
    view = <VerdictView recorridos={recorridos} preset={preset} vehiculo={vehiculo} id={route.slice(3)} />
  } else if (route === '/settings') {
    view = (
      <Settings
        preset={preset}
        onChange={updatePreset}
        vehiculo={vehiculo}
        onChangeVehiculo={updateVehiculo}
      />
    )
  } else if (recorridos.length === 0 && !onboarded) {
    view = (
      <Onboarding
        onVehiculo={updateVehiculo}
        onPreset={updatePreset}
        onCompleto={() => {
          marcarOnboarded()
          setOnboarded(true)
          nav('/new')
        }}
      />
    )
  } else {
    view = <Home recorridos={recorridos} vehiculo={vehiculo} preset={preset} />
  }

  return <div className="app">{view}</div>
}
