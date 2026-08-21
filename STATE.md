# ¿Me mando? — Estado

*(ex "¿Voy en bici?" — renombrada el 21/08 al generalizar a toda la movilidad ligera)*

*Actualizado: 20 de agosto de 2026*

## Qué es

PWA mobile-first que responde una sola pregunta: **¿voy en bici hoy (y mañana)?**
Guarda recorridos (barrio → barrio, franja de ida y de vuelta), consulta el pronóstico
horario y da un veredicto **GO / NO GO** por día con explicación en rioplatense.

El análisis completo de decisiones está en [docs/ANALISIS.md](docs/ANALISIS.md).

## Estado actual

**v1 deployada en GitHub Pages con dominio propio**: https://bici.tuggsy.com
(la URL vieja pablomanzoni.github.io/voy-en-bici redirige sola). DNS: CNAME `bici` →
`pablomanzoni.github.io` en Cloudflare (nube gris / DNS only — con proxy naranja GitHub
no emite el certificado). Sin Vercel — los proyectos críticos (synthetic y vecinos) no se
tocan. Deploy automático: push a `main` → GitHub Actions buildea y publica. La key de
Gemini vive en un *secret* del repo (`VITE_GEMINI_API_KEY`), no en el código — pero queda
legible en el bundle público (riesgo aceptado; mitigable restringiendo la key por referrer).

- ✅ Recorridos: crear/editar/borrar, con nombre, lugares y franjas
- ✅ Buscador de lugares: lista local (75 de Mvd/Canelones/San José, alfabética) + geocoder
  online de Open-Meteo; prioriza "cerca del usuario" por **zona horaria del dispositivo**
  (sin GPS, sin IP, sin permisos) — funciona en cualquier país
- ✅ Veredicto: reglas deterministas (`src/lib/verdict.ts`), ida Y vuelta (AND), peor hora de la franja manda
- ✅ Presets: Flojo / Promedio / Extremo (umbrales en `PRESETS`, un solo lugar; valores
  finales elegidos por Pablo 21/08 y validados contra guías ciclistas)
- ✅ Vehículos: Bici urbana / Ciclismo deportivo / E-bike / Monopatín / Moto — selector en
  Ajustes (arriba del perfil), persistido, mostrado en el veredicto y pasado a la IA.
- ✅ **Matriz vehículo×conductor implementada** (21/08, investigación externa aprobada por
  Pablo — fuentes: Beaufort, Cycling UK, ACSM, Bosch, Xiaomi/Segway, NHTSA/MSF):
  umbrales propios por vehículo (`src/lib/vehiculos.ts` → `MATRIZ`), **límites efectivos por
  dirección** (deportivo: frente 0.85 / cruzado 0.90-0.85; monopatín: cruzado 0.85-0.80;
  moto: cruzado 0.80-0.85), **piso mojado = NO GO absoluto para monopatín** (lluvia en la
  hora o ≥0.2 mm en las 2 previas), combos por vehículo (0.65-0.75, moto por dirección).
  Bici urbana quedó intacta como baseline. La tabla de Ajustes muestra los números del
  vehículo elegido, dinámica desde la matriz. 28 tests, incluidos los casos del doc.
- ✅ Frío y calor por **sensación térmica** (fusiona viento+humedad; fallback a termómetro)
- ✅ Capa **"se junta demasiado"**: lluvia desde la mitad del umbral + viento o temperatura
  en zona amarilla (≥75% del límite) → NO GO explicado. El viento **de cola no cuenta**
  (empuja, no resta) — dirección evaluada por tramo, ida y vuelta por separado
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

## v1 declarada estable (21/08) — decisiones de rumbo

- **Sigue 100% PWA estática, sin servidor** (decisión de Pablo): notificaciones push
  descartadas (requieren una pieza de backend), stores descartados (Apple US$99/año no;
  Play US$25 únicos queda como puerta abierta "no por ahora").
- **Difusión = link compartido**: tarjeta Open Graph agregada (og.jpg 1200×630 + meta tags
  estáticos) — al compartir bici.tuggsy.com en WhatsApp/Telegram aparece logo+nombre+bajada.

## Pendiente / decisiones para después

- **Dominio propio** (ej. bici.tuggsy.com): posible más adelante; hoy alcanza con el de GitHub.
- **Key de Gemini**: si algún día molesta que sea legible en el bundle → restringirla por
  HTTP referrer en Google Cloud Console, o proxy chico. Por ahora: aceptado.
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
