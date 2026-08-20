# ¿Voy en bici? — Estado

*Actualizado: 20 de agosto de 2026*

## Qué es

PWA mobile-first que responde una sola pregunta: **¿voy en bici hoy (y mañana)?**
Guarda recorridos (barrio → barrio, franja de ida y de vuelta), consulta el pronóstico
horario y da un veredicto **GO / NO GO** por día con explicación en rioplatense.

El análisis completo de decisiones está en [docs/ANALISIS.md](docs/ANALISIS.md).

## Estado actual

**v1 funcionando en local. NO deployada** (decisión de Pablo: probar local primero).

- ✅ Recorridos: crear/editar/borrar, con nombre, barrios (75 de Mvd/Canelones/San José), franjas
- ✅ Veredicto: reglas deterministas (`src/lib/verdict.ts`), ida Y vuelta (AND), peor hora de la franja manda
- ✅ Presets: Flojo / Promedio / Extremo (umbrales en `PRESETS`, un solo lugar)
- ✅ Clima: Open-Meteo (gratis, sin key), cache 30 min en localStorage, fallback a datos viejos sin red
- ✅ Explicaciones: plantillas al instante (`explain.ts`) + Gemini las reemplaza async (`ai.ts`), cache por contenido
- ✅ Viento relativo: rumbo del recorrido vs dirección del viento → de frente / cruzado / de cola (solo narra, no decide)
- ✅ Grafiquita del día (6-22h) con franjas resaltadas
- ✅ Hoy con ida ya pasada → evalúa solo la vuelta; día terminado → "Ya fue"
- ✅ PWA instalable (manifest + service worker), datos 100% en localStorage, sin login
- ✅ 12 tests del motor (`npm test`), build limpio (`npm run build`)

## Cómo correr

```bash
npm --prefix voy-en-bici run dev   # puerto 5183 (o preview "voy-en-bici" en launch.json)
```

`.env.local` tiene `VITE_GEMINI_API_KEY` (misma key que que-comer). Sin key, la app
funciona igual con explicaciones de plantilla.

## Recorrido de prueba cargado

"Al trabajo": El Pinar → Punta Gorda, ida Mañana (8-11), vuelta Tarde (17-20).
(Vive en el localStorage del navegador de prueba, no en el código.)

## Pendiente / decisiones para después

- **Deploy**: Vercel + subdominio de tuggsy.com (patrón de synthetic/vecinos). OJO: la key de
  Gemini en el bundle queda pública → al deployar, decidir: proxy chico (una serverless function)
  o solo plantillas en prod.
- Safari iOS borra localStorage tras 7 días sin uso **si la PWA no está instalada** — fomentar instalar.
- Parking lot (ver ANALISIS.md): sugerir horario alternativo, viento lateral en el veredicto,
  notificaciones ante cambios, backtesting de umbrales, ubicación exacta.

## Decisiones técnicas

- Vite + React + TS, sin router (hash casero en `App.tsx`), sin backend, sin base de datos.
- El LLM **nunca decide** el veredicto: reglas puras y testeadas deciden; Gemini solo redacta
  (thinkingBudget 0, timeout 8s, si falla queda la plantilla).
- Barrios con coordenadas aproximadas embebidas (`src/data/barrios.ts`) — el clima no cambia
  a escala de cuadras.
- Clima del punto medio del recorrido, 2 días de forecast, timezone auto.
