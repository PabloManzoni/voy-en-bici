// Iconos minimalistas de línea (estilo lucide, trazo redondeado).
// Dos tonos pastel: la nube en gris-azulado, los acentos (sol, lluvia, rayo) en su color.
import type { ReactNode } from 'react'

const S = {
  fill: 'none',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const CLOUD = '#9aa3b8'
const SUN = '#f2d3a2'
const RAIN = '#a8c7ec'
const BOLT = '#f2d3a2'

function Svg({ size, children, label }: { size: number; children: ReactNode; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {children}
    </svg>
  )
}

export function WeatherIcon({ code, size = 16 }: { code: number; size?: number }) {
  // tormenta
  if ([95, 96, 99].includes(code))
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 1.5 8.742" />
        <path {...S} stroke={BOLT} d="m13 12-3 5h4l-3 5" />
      </Svg>
    )
  // nieve
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 1.5 8.742" />
        <g {...S} stroke={RAIN}>
          <path d="M8 15h.01" />
          <path d="M8 19h.01" />
          <path d="M12 17h.01" />
          <path d="M12 21h.01" />
          <path d="M16 15h.01" />
          <path d="M16 19h.01" />
        </g>
      </Svg>
    )
  // lluvia
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <g {...S} stroke={RAIN}>
          <path d="M16 14v6" />
          <path d="M8 14v6" />
          <path d="M12 16v6" />
        </g>
      </Svg>
    )
  // llovizna
  if ([51, 53, 55, 56, 57].includes(code))
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <g {...S} stroke={RAIN}>
          <path d="M8 19v1" />
          <path d="M8 14v1" />
          <path d="M16 19v1" />
          <path d="M16 14v1" />
          <path d="M12 21v1" />
          <path d="M12 16v1" />
        </g>
      </Svg>
    )
  // niebla
  if ([45, 48].includes(code))
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 1.5 8.742" />
        <g {...S} stroke={CLOUD}>
          <path d="M16 17H7" />
          <path d="M17 21H9" />
        </g>
      </Svg>
    )
  // nublado
  if (code === 3)
    return (
      <Svg size={size}>
        <path {...S} stroke={CLOUD} d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </Svg>
    )
  // parcialmente nublado
  if ([1, 2].includes(code))
    return (
      <Svg size={size}>
        <g {...S} stroke={SUN}>
          <path d="M12 2v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="M20 12h2" />
          <path d="m19.07 4.93-1.41 1.41" />
          <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
        </g>
        <path {...S} stroke={CLOUD} d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
      </Svg>
    )
  // despejado
  return (
    <Svg size={size}>
      <g {...S} stroke={SUN}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </g>
    </Svg>
  )
}

// Rueda: el símbolo que sirve para todos los rodados (bici, monopatín, moto…).
export function WheelIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <g {...S} stroke={color}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="1.6" />
        <path d="M12 4v6.4" />
        <path d="M12 13.6V20" />
        <path d="M4 12h6.4" />
        <path d="M13.6 12H20" />
      </g>
    </Svg>
  )
}

export function BikeIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <g {...S} stroke={color}>
        <circle cx="18.5" cy="17.5" r="3.5" />
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="15" cy="5" r="1" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      </g>
    </Svg>
  )
}

export function GearIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size} label="Ajustes">
      <g {...S} stroke={color}>
        <path d="M21 4h-7" />
        <path d="M10 4H3" />
        <path d="M21 12h-9" />
        <path d="M8 12H3" />
        <path d="M21 20h-5" />
        <path d="M12 20H3" />
        <path d="M14 2v4" />
        <path d="M8 10v4" />
        <path d="M16 18v4" />
      </g>
    </Svg>
  )
}

export function PencilIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size} label="Editar">
      <g {...S} stroke={color}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </g>
    </Svg>
  )
}

export function ChevronIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <path {...S} stroke={color} d="m9 18 6-6-6-6" />
    </Svg>
  )
}

export function RefreshIcon({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size} label="Actualizar clima">
      <g {...S} stroke={color}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </g>
    </Svg>
  )
}

// El "Compartir" de iOS: cuadrado con flecha para arriba.
export function ShareIOSIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <g {...S} stroke={color}>
        <path d="M12 2v13" />
        <path d="m16 6-4-4-4 4" />
        <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      </g>
    </Svg>
  )
}

export function PlusSquareIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <g {...S} stroke={color}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </g>
    </Svg>
  )
}

export function PhoneIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <g {...S} stroke={color}>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M12 18h.01" />
      </g>
    </Svg>
  )
}
