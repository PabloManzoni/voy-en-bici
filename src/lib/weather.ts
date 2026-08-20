import type { HourData } from './verdict'

export interface ForecastDay {
  date: string // YYYY-MM-DD local
  hours: HourData[]
}

export interface Forecast {
  days: ForecastDay[]
  fetchedAt: number
  stale: boolean // true si vino del cache porque la red falló
}

const TTL_MS = 30 * 60 * 1000

interface OpenMeteoResponse {
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: (number | null)[]
    precipitation: number[]
    weathercode: number[]
    windspeed_10m: number[]
    winddirection_10m: number[]
    windgusts_10m: number[]
  }
}

function parse(data: OpenMeteoResponse): ForecastDay[] {
  const h = data.hourly
  const byDate = new Map<string, HourData[]>()
  for (let i = 0; i < h.time.length; i++) {
    const [date, hm] = h.time[i].split('T')
    const hour = parseInt(hm.slice(0, 2), 10)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push({
      hour,
      temp: h.temperature_2m[i],
      rainProb: h.precipitation_probability[i],
      precip: h.precipitation[i],
      code: h.weathercode[i],
      wind: h.windspeed_10m[i],
      gust: h.windgusts_10m[i],
      windFrom: h.winddirection_10m[i],
    })
  }
  return [...byDate.entries()].map(([date, hours]) => ({ date, hours }))
}

function cacheKey(lat: number, lon: number) {
  return `vb.wx.${lat.toFixed(2)},${lon.toFixed(2)}`
}

export async function getForecast(lat: number, lon: number): Promise<Forecast> {
  const key = cacheKey(lat, lon)
  const cachedRaw = localStorage.getItem(key)
  const cached = cachedRaw ? (JSON.parse(cachedRaw) as { t: number; days: ForecastDay[] }) : null

  if (cached && Date.now() - cached.t < TTL_MS) {
    return { days: cached.days, fetchedAt: cached.t, stale: false }
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,windgusts_10m` +
    `&forecast_days=2&timezone=auto`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data = (await res.json()) as OpenMeteoResponse
    const days = parse(data)
    const fetchedAt = Date.now()
    try {
      localStorage.setItem(key, JSON.stringify({ t: fetchedAt, days }))
    } catch {
      // storage lleno: seguimos sin cachear
    }
    return { days, fetchedAt, stale: false }
  } catch (err) {
    if (cached) return { days: cached.days, fetchedAt: cached.t, stale: true }
    throw err
  }
}

export function hoyLocal(): string {
  // 'sv' formatea YYYY-MM-DD
  return new Date().toLocaleDateString('sv')
}
