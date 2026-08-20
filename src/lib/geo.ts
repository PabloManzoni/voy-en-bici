// Rumbo inicial (grados desde el norte, 0-360) de A hacia B.
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const f1 = toRad(lat1)
  const f2 = toRad(lat2)
  const dl = toRad(lon2 - lon1)
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function puntoMedio(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 }
}

const CARDINALES = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']

export function rumboCardinal(deg: number): string {
  return CARDINALES[Math.round(deg / 45) % 8]
}
