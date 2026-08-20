# Análisis — ¿Voy en bici?

*Sesión de análisis con Pablo, 19-20 de agosto de 2026. Este documento captura lo decidido antes de construir.*

## Qué exploramos

Una PWA mobile-first que responde una sola pregunta: **¿voy en bici hoy (y mañana)?** Guarda recorridos habituales (ej. "al trabajo"), consulta el pronóstico en los horarios de ida y vuelta, y da un veredicto **GO / NO GO** con explicación en lenguaje humano. Pimponeamos la interacción y las capacidades; no la investigación de usuario (Pablo la hace por fuera).

## Problemas (implementación / UX)

1. **La ida compromete la vuelta.** Si vas en bici, volvés en bici. La decisión es una sola con dos momentos: ida GO + vuelta GO → GO; cualquier tramo malo → NO GO (AND lógico).
2. **El AND multiplica los NO GO.** 2 momentos × varias variables × regla estricta = app que casi siempre dice no. Una app que siempre dice no deja de aportar información. Mitigación elegida: umbrales calibrados a "que no sea un día feo feo" (generosa), no "solo días lindos".
3. **La ventana ancha es un umbral escondido.** Franjas de ~3h capturan más eventos de lluvia que una hora puntual. Aceptado conscientemente: el horario es aproximado por naturaleza ("el clima jamás es tan exacto").
4. **La variable más rígida es la peor pronosticada.** La lluvia (regla binaria: "si hay lluvia no") es justo la de peor precisión temporal; viento y temperatura (umbrales numéricos) son las más confiables. Mitigado con presets que gradúan la tolerancia a la lluvia.
5. **El frío en 8°C apaga el invierno de Montevideo** (mínimas de julio ~7-8°C). Resuelto: el umbral varía por preset (hasta 5°C para el extremo).
6. **Viento: lo que te tira es la ráfaga lateral, no el viento de frente.** El frente = sufrimiento; el lateral = peligro. Quedó **abierto** si el ángulo modifica el veredicto (Pablo: "no sé"). v1: la magnitud decide, la dirección solo narra ("de frente / cruzado / de cola").
7. **Confianza y determinismo.** Un LLM en el camino crítico del veredicto = respuestas distintas con los mismos datos + latencia que mata lo *glanceable*. Decidido: el veredicto sale de reglas auditables; la IA redacta la explicación.
8. **Persistencia local sin backend.** Sin login, sin base de datos: localStorage. Riesgo real: Safari iOS borra storage de sitios sin uso por 7 días, **salvo que la PWA esté instalada**. Mitigación: fomentar instalación.
9. **API key en el cliente.** El clima no necesita key (Open-Meteo es gratis y sin key). Gemini sí: para pruebas locales va en `.env.local`; si se deploya público, la key queda expuesta en el bundle → resolver en deploy (proxy chico), no ahora.

## Opciones consideradas

- **Veredicto por día vs. por tramo** → por tramo (ida/vuelta) combinado con AND. Se apoya en que la decisión real es "una apuesta sobre la vuelta".
- **Binario vs. semáforo** → binario estricto GO/NO GO (decisión de Pablo). El matiz vive en la explicación y en la grafiquita del día, no en el veredicto. (Patrón: divulgación progresiva — veredicto grande, detalle debajo.)
- **Hora exacta vs. franjas** → franjas: madrugada (5-8), mañana (8-11), mediodía (11-14), media tarde (14-17), tarde (17-20), noche (20-23).
- **Umbrales numéricos configurables vs. presets nombrados** → presets: **Flojo / Promedio / Extremo** con settings amigables. (Buena práctica real: preajustes con nombres significativos > configuración granular que nadie sabe llenar.)
- **Ubicación exacta vs. barrios** → barrios (ej. "El Pinar, Canelones → Punta Gorda, Montevideo"). El clima no cambia a escala de cuadras; el rumbo sale igual. Ubicación exacta = v2.
- **Notificaciones vs. abrir la app** → la abre él. Sin push (evita permisos, fatiga de alertas y complejidad).
- **Sugerir alternativa (bus/auto)** → NO. La app solo dice bici sí / bici no. (Calibración de confianza — Lee & See 2004: no prometer lo que no se mide.)
- **LLM decide vs. LLM redacta** → reglas deciden, Gemini redacta la explicación (con fallback a plantillas si no hay red/key).

## Reglas del veredicto (decididas)

- GO = ida GO **y** vuelta GO. La franja se evalúa hora por hora; la peor hora manda.
- **Tormenta eléctrica: NO GO para todos los presets.**
- **Flojo**: no va si hay llovizna *en cualquier momento del día* (no solo su franja). Viento ≥30 sostenido o ≥45 ráfagas. Temp fuera de 10-30°C.
- **Promedio**: llovizna/lluvia en su franja → NO. Viento ≥40 sostenido o ≥50 ráfagas (números de Pablo). Temp fuera de 8-32°C.
- **Extremo**: va bajo llovizna; lluvia moderada/fuerte → NO. Viento ≥50 sostenido o ≥60 ráfagas. Temp fuera de 5-35°C.
- Los números exactos los eligió Claude (delegado por Pablo) apoyados en la escala Beaufort: 29-38 km/h = trabajo duro; 39-49 = desagradable/feo; 50+ = peligroso. **No existe umbral oficial de viento peligroso para bici** — es consenso práctico ciclista, documentado como tal.
- No se muestra sensación térmica como umbral (se usa temperatura de termómetro, más legible); la sensación puede mencionarse en la explicación.

## Interacción (decidida)

1. Abrir app → **lista de recorridos** (aunque haya uno solo; evita casuística) + botón "nuevo recorrido" ahí mismo.
2. Tocar recorrido → **HOY y MAÑANA**, cada uno con GO/NO GO grande + explicación + detalle de ida y vuelta + **grafiquita del día** (solcitos/gotas por hora, tipo Google) para que el usuario pueda "sospechar" cambios y ver contexto (ej. llovió antes, piso mojado — la app no lo juzga, lo muestra).
3. Si la ida de hoy ya pasó → hoy muestra solo la vuelta; si pasó todo el día → foco en mañana.
4. Mañana es GO/NO GO igual de tajante ("de última abro mañana"). Sin re-chequeo proactivo: si el pronóstico cambia, se entera al abrir.
5. Recorrido = nombre + barrio origen + barrio destino + franja ida + franja vuelta. Disponible siempre, sea el día que sea (sin días asociados).

## Trade-offs y hacia dónde nos inclinamos

- Simplicidad del binario > matiz del semáforo; el matiz vive en el texto.
- Franja ancha + peor-hora-manda es honesto pero severo; la generosidad se calibra en los umbrales del preset, no promediando horas.
- Local-first sin cuentas: si cambia de celular, pierde los datos ("me jodo" — aceptado).

## Buenas prácticas de referencia (reales)

- **Diseño glanceable / time-to-value**: el valor en los primeros 2 segundos (patrón widget de clima).
- **Calibración de confianza en automatización** (Lee & See, 2004): prometer solo lo que se mide.
- **Divulgación progresiva** (progressive disclosure): veredicto grande, detalle debajo.
- **Presets con nombres significativos** en vez de sliders técnicos.
- **Escala Beaufort** (OMM) para anclar los umbrales de viento.
- **Determinismo en el camino crítico**: reglas auditables deciden; el LLM redacta.
- **Backtesting** contra histórico de clima para calibrar umbrales (anotado, no hecho aún).

## Preguntas abiertas

- ¿El viento lateral fuerte debería endurecer el veredicto? (Pablo: "no sé" — v1 no lo hace, solo lo narra.)
- Calibración fina de umbrales de lluvia (probabilidad × intensidad): validar con uso real / backtesting.
- Qué pasa al deployar con la key de Gemini (proxy chico vs. solo plantillas en producción).

## Parking lot

- Sugerir horario alternativo ("si salís 8:30 zafás") — la app ya conoce todas las horas.
- Notificación proactiva solo ante cambios ("hoy no", inversión de pronóstico).
- Aprender del usuario ("fuiste igual con 25 km/h → subo la vara") — Pablo dijo no por ahora.
- Ubicación exacta / trazado real del recorrido (v2).
- Backtesting de umbrales con histórico Open-Meteo.
- Peso del viento lateral en el veredicto.
- Sync entre dispositivos (hoy: local-only).

## Próximos pasos para el build (decididos con Pablo)

- Sin overkill de infra: todo local, se prueba local; **no se sube hasta que Pablo diga**.
- Deploy futuro: Vercel + subdominio de **tuggsy.com** (patrón de synthetic-user-builder / vecinos).
- IA: **Gemini** (key existente de que-comer, `gemini-2.5-flash`) para redactar explicaciones; fallback a plantillas.
- Clima: **Open-Meteo** (gratis, sin key, datos horarios, CORS abierto).
- PWA instalable, datos en localStorage.

## Glosario

- **PWA**: web que se instala como app en el teléfono.
- **AND lógico**: "todas las condiciones deben cumplirse a la vez".
- **Ráfaga**: pico breve de viento, distinto del viento sostenido; es lo que desestabiliza.
- **Beaufort**: escala estándar que traduce km/h de viento a efectos observables.
- **localStorage**: almacenamiento del navegador, local al dispositivo, sin servidor.
- **Backtesting**: probar una regla contra datos del pasado antes de confiarle el futuro.
- **Glanceable**: diseñado para entenderse de un vistazo, sin navegar.
