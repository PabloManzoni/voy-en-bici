# ¿Me mando? — Matriz climática por vehículo y conductor

**Estado:** propuesta lista para implementación  
**Fecha de investigación:** 21 de agosto de 2026  
**Ámbito:** Montevideo y Canelones, Uruguay  
**Vehículos:** bici urbana, ciclismo deportivo, e-bike, monopatín eléctrico y moto/ciclomotor

---

## 0. Decisión de diseño

La tabla actual de **bici urbana se conserva exactamente como fue entregada**. Las demás matrices son una calibración de producto apoyada en:

- las bandas de viento de Beaufort;
- evidencia sobre viento lateral, ráfagas, agarre y esfuerzo;
- guías de seguridad y manuales de fabricantes;
- estrés térmico por ejercicio o equipamiento protector;
- el clima ventoso y húmedo de la costa uruguaya.

No existe una norma científica o legal universal que diga, por ejemplo, “un monopatín deja de ser seguro exactamente a 35 km/h”. Por eso los valores de este documento deben entenderse así:

1. **La jerarquía entre vehículos está respaldada por evidencia.**
2. **Los números exactos son una política determinista y auditable del producto.**
3. **Los límites priorizan que haya días GO razonables en Uruguay sin presentar falsa precisión.**
4. **Tormenta eléctrica y nieve siguen siendo NO GO absolutos para todos.**

La escala Beaufort ayuda a ordenar los cortes: aproximadamente, 20–30 km/h corresponde a brisa moderada, 31–39 km/h a brisa fresca, 41–50 km/h a brisa fuerte y 52–61 km/h a viento casi temporal. Los límites actuales de bici urbana ya siguen de cerca esos escalones. [S1]

---

## 1. Reglas globales que no cambian

### 1.1 Evaluación temporal

- Madrugada: 5–8
- Mañana: 8–11
- Mediodía: 11–14
- Media tarde: 14–17
- Tarde: 17–20
- Noche: 20–23
- Se evalúa cada hora de cada franja y **la peor hora manda**.
- **GO del día = ida GO y vuelta GO**.

### 1.2 Absolutos

Para cualquier vehículo y perfil:

- `code` de tormenta (`95`, `96`, `99`) con `rainProb >= 20` → **NO GO**.
- `code` de nieve (`71–77`, `85`, `86`) → **NO GO**.
- `rainProb == null` → tratar como `100`.

### 1.3 Comparadores

- Viento sostenido: NO GO si `wind >= limiteEfectivo`.
- Ráfaga: NO GO si `gust >= limiteEfectivo`.
- Frío: NO GO si `apparent < limiteFrio`.
- Calor: NO GO si `apparent > limiteCalor`.
- Lluvia: NO GO si `rainProb >= limiteDeLaCategoria`.
- `nunca bloquea` significa que esa categoría de lluvia no bloquea sola **ni entra en la capa combo**. Tormenta, nieve y las reglas especiales del vehículo siguen aplicando.

### 1.4 Sensación térmica

Se mantiene `apparent` como dato térmico principal. Open-Meteo la calcula combinando temperatura, humedad, viento meteorológico y radiación solar. No incorpora explícitamente el viento aparente creado por avanzar en una moto o ciclomotor; por eso ese vehículo usa límites de frío algo más conservadores. [S2]

### 1.5 Dirección relativa

Se conserva la clasificación existente por tramo:

- Frente: diferencia angular `<= 60°`.
- Cruzado: diferencia `> 60°` y `< 120°`.
- Cola: diferencia `>= 120°`.

La ida y la vuelta se calculan por separado.

---

## 2. Cómo aplicar los modificadores de dirección

Algunos vehículos reducen su límite cuando la dirección es especialmente desfavorable.

```ts
limiteEfectivo = Math.round(limiteBase * factorDireccion)
```

Luego se usa el mismo comparador inclusivo:

```ts
noGo = valorObservado >= limiteEfectivo
```

Los factores se aplican por separado a `wind` y `gust`; no se multiplican entre sí.

| Vehículo | Frente: viento | Frente: ráfaga | Cruzado: viento | Cruzado: ráfaga | Cola |
|---|---:|---:|---:|---:|---:|
| Bici urbana | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Ciclismo deportivo | **0.85** | 1.00 | **0.90** | **0.85** | 1.00 |
| E-bike | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Monopatín / scooter | 1.00 | 1.00 | **0.85** | **0.80** | 1.00 |
| Moto / ciclomotor | 1.00 | 1.00 | **0.80** | **0.85** | 1.00 |

**Importante:** el viento de cola conserva el límite duro base. Solo deja de contar como dimensión amarilla en la capa combo. Una ráfaga al límite puede ser peligrosa aunque venga de atrás.

---

# 3. Matrices por vehículo

## 3.1 Bici urbana — baseline sin cambios

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---:|---:|---:|
| Viento sostenido ≥ | **20 km/h** | **30 km/h** | **40 km/h** |
| Ráfagas ≥ | **30 km/h** | **40 km/h** | **50 km/h** |
| Frío: sensación < | **10 °C** | **5 °C** | **1 °C** |
| Calor: sensación > | **28 °C** | **30 °C** | **34 °C** |
| Lluvia fuerte: prob ≥ | **30%** | **40%** | **40%** |
| Lluvia leve: prob ≥ | **30%** | **40%** | **nunca bloquea** |
| Llovizna: prob ≥ | **30%** | **60%** | **nunca bloquea** |
| Ámbito de la lluvia | **todo el día (6–22 h)** | **solo sus franjas** | **solo sus franjas** |

### Reglas extra

1. **Sin modificador duro por dirección.** La dirección solo influye en la capa combo existente.
2. **Capa combo:** zona amarilla de viento a `0.75`; temperatura a menos de `3 °C` del límite.
3. El viento de cola no cuenta como amarillo.

### Justificación

Se mantiene como verdad de producto. Además, los cortes 20/30/40 km/h siguen aproximadamente la entrada a bandas sucesivas de Beaufort. Cycling UK recomienda observar especialmente las ráfagas, porque pueden ser más dañinas que un viento estable, y considerar dirección y exposición de la ruta. [S1] [S3]

---

## 3.2 Ciclismo deportivo

**Supuesto:** ciclismo de ruta o entrenamiento deportivo sobre pavimento. No se modelan todavía profundidad de llanta, peso del ciclista, pelotón, descenso ni nivel técnico específico.

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---:|---:|---:|
| Viento sostenido ≥ | **20 km/h** | **30 km/h** | **40 km/h** |
| Ráfagas ≥ | **30 km/h** | **40 km/h** | **50 km/h** |
| Frío: sensación < | **8 °C** | **3 °C** | **-2 °C** |
| Calor: sensación > | **26 °C** | **29 °C** | **32 °C** |
| Lluvia fuerte: prob ≥ | **25%** | **35%** | **40%** |
| Lluvia leve: prob ≥ | **25%** | **40%** | **nunca bloquea** |
| Llovizna: prob ≥ | **40%** | **60%** | **nunca bloquea** |
| Ámbito de la lluvia | **todo el día (6–22 h)** | **solo sus franjas** | **solo sus franjas** |

### Reglas extra

1. **Viento de frente:** `windMaxEfectivo = round(windMaxBase * 0.85)`.
2. **Viento cruzado:**
   - `windMaxEfectivo = round(windMaxBase * 0.90)`;
   - `gustMaxEfectivo = round(gustMaxBase * 0.85)`.
3. **Viento de cola:** límites base completos.
4. **Capa combo:** zona amarilla de viento desde `0.70`, calculada contra el **límite efectivo por dirección**. Temperatura: margen de `3 °C`.

### Ejemplos efectivos

| Perfil | Frente: viento | Cruzado: viento | Cruzado: ráfaga |
|---|---:|---:|---:|
| Flojo | 17 km/h | 18 km/h | 26 km/h |
| Pibe común | 26 km/h | 27 km/h | 34 km/h |
| Extremo | 34 km/h | 36 km/h | 43 km/h |

### Justificación

- En ciclismo, gran parte de la potencia se consume venciendo resistencia aerodinámica; el viento de frente altera directamente esfuerzo y calidad del entrenamiento. El viento oblicuo también cambia la carga aerodinámica. [S4]
- Modelos de dinámica lateral muestran que el viento cruzado reduce la estabilidad de la bicicleta y que el efecto aumenta con la velocidad del viento. [S5]
- El deportista genera más calor metabólico que un usuario urbano. ACSM señala riesgo alto de lesión por calor al ejercitar con temperatura por encima de unos 26.6 °C y humedad superior a 75%, y recomienda reducir intensidad o pasar a interior. Por eso los máximos de calor bajan respecto de la bici urbana. [S6]
- El frío se tolera algo mejor por vestimenta y producción de calor durante el ejercicio, por eso el mínimo baja.

---

## 3.3 E-bike

**Supuesto:** pedelec o e-bike urbana con asistencia hasta aproximadamente 25 km/h, batería y sistema eléctrico de fabricante reconocido. Una e-bike casera o sin protección al agua puede requerir límites más estrictos.

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---:|---:|---:|
| Viento sostenido ≥ | **25 km/h** | **35 km/h** | **45 km/h** |
| Ráfagas ≥ | **30 km/h** | **40 km/h** | **50 km/h** |
| Frío: sensación < | **12 °C** | **7 °C** | **3 °C** |
| Calor: sensación > | **30 °C** | **32 °C** | **35 °C** |
| Lluvia fuerte: prob ≥ | **30%** | **40%** | **40%** |
| Lluvia leve: prob ≥ | **30%** | **40%** | **nunca bloquea** |
| Llovizna: prob ≥ | **30%** | **60%** | **nunca bloquea** |
| Ámbito de la lluvia | **todo el día (6–22 h)** | **solo sus franjas** | **solo sus franjas** |

### Reglas extra

1. **Sin modificador duro por dirección.** El motor reduce el costo del viento de frente, mientras que las ráfagas conservan los mismos límites de estabilidad que la bici urbana.
2. **Capa combo:** zona amarilla de viento a `0.75`; temperatura a menos de `3 °C` del límite. Frente y cruzado cuentan; cola no.
3. **No crear un NO GO por autonomía solo con el clima.** Para una regla de batería hacen falta, como mínimo, distancia real del recorrido, carga disponible, nivel de asistencia y capacidad/estado de la batería.

### Justificación

- La asistencia permite tolerar más viento sostenido, pero no elimina la exposición del cuerpo ni el problema de una ráfaga lateral; por eso sube `wind` y se conserva `gust`.
- Bosch indica que el frío reduce temporalmente el rendimiento y el alcance de la batería. También recomienda guardar/cargar la batería a temperatura ambiente y señala que sus componentes están protegidos contra lluvia, salpicaduras y spray. [S7] [S8]
- Como el usuario produce menos calor pedaleando, el frío se siente antes; el límite mínimo sube. Por el mismo menor esfuerzo, el máximo de calor puede ser algo más permisivo que en bici urbana.

---

## 3.4 Monopatín / scooter eléctrico

**Supuesto:** VMP de pie, con ruedas pequeñas, velocidad urbana aproximada de hasta 25 km/h. Un scooter sentado o ciclomotor pertenece a la categoría moto/ciclomotor.

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---:|---:|---:|
| Viento sostenido ≥ | **20 km/h** | **30 km/h** | **40 km/h** |
| Ráfagas ≥ | **25 km/h** | **35 km/h** | **45 km/h** |
| Frío: sensación < | **12 °C** | **8 °C** | **4 °C** |
| Calor: sensación > | **30 °C** | **32 °C** | **35 °C** |
| Lluvia fuerte: prob ≥ | **20%** | **30%** | **40%** |
| Lluvia leve: prob ≥ | **25%** | **35%** | **50%** |
| Llovizna: prob ≥ | **40%** | **60%** | **nunca bloquea** |
| Ámbito de la lluvia | **todo el día (6–22 h)** | **solo sus franjas** | **solo sus franjas** |

### Reglas extra

1. **Viento cruzado:**
   - `windMaxEfectivo = round(windMaxBase * 0.85)`;
   - `gustMaxEfectivo = round(gustMaxBase * 0.80)`.
2. Frente y cola usan los límites base.
3. **Piso mojado: NO GO absoluto para los tres perfiles** cuando se cumpla cualquiera:
   - en la hora evaluada, `precip > 0`;
   - en la hora evaluada, `code` es llovizna o lluvia (`51–57`, `61`, `63`, `65`, `66`, `67`, `80`, `81`, `82`);
   - en alguna de las dos horas anteriores, `precip >= 0.2 mm`;
   - suma de las dos horas anteriores `>= 0.5 mm`.
4. Para evaluar las dos horas previas al comienzo del rango, la consulta a Open-Meteo debe incluir al menos `past_days=1` o un buffer horario equivalente.
5. **Capa combo:** zona amarilla de viento desde `0.65`, usando el límite efectivo por dirección. Temperatura: margen de `3 °C`. El piso mojado se evalúa antes y, si se activa, ya devuelve NO GO.

### Ejemplos efectivos con viento cruzado

| Perfil | Cruzado: viento | Cruzado: ráfaga |
|---|---:|---:|
| Flojo | 17 km/h | 20 km/h |
| Pibe común | 26 km/h | 28 km/h |
| Extremo | 34 km/h | 36 km/h |

### Justificación

- Xiaomi prohíbe usar varios de sus scooters bajo lluvia por razones de seguridad, aunque el producto tenga resistencia IPX4. Segway también indica no circular bajo lluvia ni atravesar charcos en manuales de usuario. Una clasificación IP describe ingreso de agua; no garantiza agarre ni frenado seguro. [S9] [S10]
- Estudios de siniestros de e-scooters identifican pérdida de equilibrio y superficies peligrosas como causas frecuentes, pero la propia literatura reconoce que todavía no hay evidencia suficiente para fijar un multiplicador universal de riesgo por lluvia. Por eso la regla de piso mojado es una **heurística conservadora de producto**, no una estadística exacta. [S11]
- La evidencia de pavimentos muestra que incluso películas de agua delgadas reducen rápidamente la fricción. No es correcto convertir directamente milímetros de lluvia en milímetros de película sobre el pavimento; los valores de `0.2/0.5 mm` anteriores funcionan solo como proxy operacional de “probablemente sigue mojado”. [S12]
- Las ruedas pequeñas, la postura alta y el manillar estrecho justifican ráfagas más estrictas y una capa combo que empieza antes.

---

## 3.5 Moto / ciclomotor

**Supuesto conservador:** moto urbana liviana, scooter sentado o ciclomotor. Una touring pesada puede tolerar más, pero no debe mezclarse en el mismo perfil sin conocer masa, carenado y experiencia del conductor.

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---:|---:|---:|
| Viento sostenido ≥ | **30 km/h** | **40 km/h** | **50 km/h** |
| Ráfagas ≥ | **45 km/h** | **55 km/h** | **65 km/h** |
| Frío: sensación < | **12 °C** | **8 °C** | **4 °C** |
| Calor: sensación > | **28 °C** | **31 °C** | **34 °C** |
| Lluvia fuerte: prob ≥ | **25%** | **35%** | **40%** |
| Lluvia leve: prob ≥ | **35%** | **50%** | **nunca bloquea** |
| Llovizna: prob ≥ | **50%** | **70%** | **nunca bloquea** |
| Ámbito de la lluvia | **todo el día (6–22 h)** | **solo sus franjas** | **solo sus franjas** |

### Reglas extra

1. **Viento cruzado:**
   - `windMaxEfectivo = round(windMaxBase * 0.80)`;
   - `gustMaxEfectivo = round(gustMaxBase * 0.85)`.
2. Frente y cola usan el límite base.
3. **Capa combo:**
   - con viento cruzado: zona amarilla desde `0.70` del límite efectivo;
   - con viento de frente: desde `0.75`;
   - cola: no cuenta como amarillo;
   - temperatura: margen de `3 °C`.
4. No agregar por ahora una regla dura de “piso previamente mojado”: una moto puede circular en mojado con técnica adecuada. La lluvia prevista, visibilidad reducida y combinación con viento ya se penalizan. Sí debe mantenerse en la explicación que la adherencia baja.

### Ejemplos efectivos con viento cruzado

| Perfil | Cruzado: viento | Cruzado: ráfaga |
|---|---:|---:|
| Flojo | 24 km/h | 38 km/h |
| Pibe común | 32 km/h | 47 km/h |
| Extremo | 40 km/h | 55 km/h |

### Justificación

- NHTSA advierte que superficies mojadas, marcas pintadas, tapas metálicas y charcos son peligros mayores para motociclistas y recomienda mayor cautela con lluvia. MSF incluye viento fuerte, superficies mojadas y arena entre las condiciones adversas que el conductor debe saber manejar. [S13] [S14]
- El viento cruzado merece un factor específico: investigación en túnel de viento publicada en 2026 encontró cambios importantes en las cargas aerodinámicas de la moto según el ángulo de incidencia. [S15]
- Como referencia operacional externa, Traffic Wales restringe motos en el Britannia Bridge cuando el viento supera 40 mph, aproximadamente 64 km/h. No se usa como equivalencia directa para calles uruguayas, pero respalda colocar el límite máximo de ráfaga de esta categoría en torno a 65 km/h, no por encima. [S16]
- El frío se endurece porque `apparent` no incorpora completamente el aire relativo de avanzar. El calor no se vuelve muy permisivo porque el equipamiento protector aumenta carga térmica; NHTSA resume evidencia de mayor temperatura corporal, estrés cardiovascular y errores bajo calor con ropa protectora. [S17]

---

# 4. Capa “se junta demasiado” por vehículo

La condición general se conserva:

> Si la probabilidad de la lluvia vigente llega a la mitad de su umbral, sin bloquear sola, y otra dimensión está amarilla, devuelve NO GO.

## 4.1 Parámetros finales

| Vehículo | Inicio amarillo de viento | Margen amarillo de temperatura | ¿Cola cuenta? | Observación |
|---|---:|---:|---|---|
| Bici urbana | **0.75** | **3 °C** | No | Baseline |
| Ciclismo deportivo | **0.70** | **3 °C** | No | Usar límites efectivos por dirección |
| E-bike | **0.75** | **3 °C** | No | No inferir batería/autonomía |
| Monopatín / scooter | **0.65** | **3 °C** | No | Piso mojado se evalúa antes |
| Moto / ciclomotor | **0.70 cruzado / 0.75 frente** | **3 °C** | No | Usar límites efectivos por dirección |

## 4.2 Fórmula

```ts
windRatio = Math.max(
  wind / effectiveWindLimit,
  gust / effectiveGustLimit
)

windYellow = relativeDirection !== 'tail' &&
  windRatio >= vehicle.yellowWindRatio &&
  windRatio < 1

tempYellow =
  apparent < coldLimit + 3 ||
  apparent > heatLimit - 3

rainNear = rainThreshold !== null &&
  rainProb >= rainThreshold / 2 &&
  rainProb < rainThreshold

comboNoGo = rainNear && (windYellow || tempYellow)
```

Para moto/ciclomotor, `vehicle.yellowWindRatio` depende de la dirección: `0.70` cruzado, `0.75` de frente. Cola no activa amarillo.

---

# 5. Orden obligatorio de evaluación

Para evitar resultados contradictorios:

1. Validar datos y convertir `rainProb == null` a `100`.
2. Tormenta eléctrica absoluta.
3. Nieve absoluta.
4. Regla especial de piso mojado de monopatín.
5. Calcular dirección relativa por tramo.
6. Calcular límites efectivos de viento y ráfaga.
7. Evaluar límites duros de viento, ráfaga, frío y calor.
8. Evaluar lluvia por categoría y ámbito.
9. Evaluar capa combo.
10. Consolidar peor hora, tramo, ida/vuelta y día.

La explicación debe señalar la primera causa de mayor prioridad que disparó el NO GO.

---

# 6. Plantillas de explicación auditables

- `No vas porque hay tormenta eléctrica con 30% de probabilidad.`
- `No vas porque las ráfagas cruzadas llegan a 34 km/h; tu límite efectivo para ciclismo deportivo es 34 km/h.`
- `No vas porque el viento de frente llega a 26 km/h; para tu entrenamiento el límite efectivo es 26 km/h.`
- `No vas porque el piso sigue mojado: cayeron 0.6 mm en las dos horas anteriores.`
- `No vas porque la sensación térmica es de 33 °C y tu límite para ciclismo deportivo es 29 °C.`
- `No vas porque se junta demasiado: 35% de lluvia leve y ráfagas cruzadas al 72% de tu límite.`

Nunca redactar una explicación que muestre un número por debajo del límite que el código realmente aplicó.

---

# 7. Casos mínimos de prueba

## 7.1 Regresiones de bici urbana

1. Flojo, `wind = 20` → NO GO.
2. Común, `gust = 39` → no bloquea por ráfaga.
3. Extremo, lluvia leve 100% → no bloquea sola.
4. Tormenta 20% → NO GO para todos.

## 7.2 Ciclismo deportivo

1. Común, frente, `wind = 26` → NO GO; límite efectivo `round(30 × 0.85) = 26`.
2. Común, cruzado, `gust = 34` → NO GO; límite efectivo `round(40 × 0.85) = 34`.
3. Común, cola, `wind = 29` → no bloquea por viento.
4. Común, `apparent = 30` → NO GO por calor (`> 29`).

## 7.3 E-bike

1. Común, `wind = 34` → no bloquea.
2. Común, `wind = 35` → NO GO.
3. Común, `gust = 40` → NO GO.
4. Flojo, `apparent = 11.9` → NO GO por frío.

## 7.4 Monopatín

1. Común, cruzado, `gust = 28` → NO GO.
2. Extremo, cola, `gust = 44` → no bloquea por ráfaga.
3. Cualquier perfil, `precip[t] = 0.1` → NO GO por piso mojado.
4. Cualquier perfil, `precip[t-1] = 0.2` → NO GO por piso mojado.
5. Cualquier perfil, `precip[t-1] = 0.1` y `precip[t-2] = 0.4` → NO GO por acumulado previo.

## 7.5 Moto / ciclomotor

1. Común, cruzado, `wind = 32` → NO GO.
2. Común, cruzado, `gust = 47` → NO GO.
3. Común, frente, `wind = 39` → no bloquea.
4. Extremo, cualquier dirección, `gust = 65` → NO GO.

---

# 8. Límites y mejoras futuras

1. **Ruta expuesta:** la rambla, puentes y zonas sin reparo pueden tener ráfagas locales superiores al pronóstico de grilla. La versión futura puede sumar un atributo de exposición de ruta.
2. **Peso y geometría:** masa del conductor, carenado, profundidad de ruedas y tamaño de rueda cambian la sensibilidad al viento; hoy no están disponibles.
3. **Autonomía eléctrica:** para e-bike o scooter, el viento de frente no debe producir un NO GO de batería sin conocer viaje y carga.
4. **Piso mojado:** la regla de dos horas es un proxy. Un modelo mejor debería usar radiación solar, temperatura de superficie, humedad, viento, drenaje y observación real de pavimento.
5. **Calor deportivo:** `apparent` es mejor que temperatura seca, pero WBGT sería una métrica más adecuada para esfuerzo intenso. Con los datos actuales, los límites conservadores de ciclismo deportivo son la opción explicable.
6. **Validación:** registrar por 4–8 semanas el veredicto y la respuesta humana “igual habría ido / no habría ido” para recalibrar perfiles sin convertirlos en un score opaco.

---

# 9. Resumen canónico para implementación

| Vehículo | Wind F/C/E | Gust F/C/E | Frío F/C/E | Calor F/C/E | Fuerte F/C/E | Leve F/C/E | Llovizna F/C/E | Combo viento |
|---|---|---|---|---|---|---|---|---|
| Bici urbana | 20/30/40 | 30/40/50 | 10/5/1 | 28/30/34 | 30/40/40 | 30/40/∞ | 30/60/∞ | 0.75 |
| Ciclismo deportivo | 20/30/40 | 30/40/50 | 8/3/-2 | 26/29/32 | 25/35/40 | 25/40/∞ | 40/60/∞ | 0.70 |
| E-bike | 25/35/45 | 30/40/50 | 12/7/3 | 30/32/35 | 30/40/40 | 30/40/∞ | 30/60/∞ | 0.75 |
| Monopatín | 20/30/40 | 25/35/45 | 12/8/4 | 30/32/35 | 20/30/40 | 25/35/50 | 40/60/∞ | 0.65 |
| Moto/ciclomotor | 30/40/50 | 45/55/65 | 12/8/4 | 28/31/34 | 25/35/40 | 35/50/∞ | 50/70/∞ | 0.70 cruzado / 0.75 frente |

`F/C/E = Flojo / Pibe común / Extremo`.  
`∞ = nunca bloquea y no participa en combo`.

---

# 10. Fuentes

- **[S1] Met Office — Beaufort wind force scale.** Bandas oficiales de velocidad y descripción de intensidad.  
  https://weather.metoffice.gov.uk/guides/coast-and-sea/beaufort-scale

- **[S2] Open-Meteo — Weather Forecast API.** Definición de `apparent_temperature` y variables horarias.  
  https://open-meteo.com/en/docs

- **[S3] Cycling UK — Tips for cycling in wind, wet and leaves.** Importancia de dirección, exposición y ráfagas.  
  https://www.cyclinguk.org/article/tips-cycling-wind-wet-and-leaves

- **[S4] Isvan, O. — Wind speed, wind yaw and aerodynamic drag acting on a bicycle and rider. Journal of Science and Cycling.** Efecto del viento y ángulo de incidencia sobre resistencia aerodinámica.  
  https://www.jsc-journal.com/index.php/JSC/article/view/168

- **[S5] Schwab et al. — Some Effects of Crosswind on the Lateral Dynamics of a Bicycle.** Simulación de estabilidad lateral ante viento cruzado.  
  https://www.mdpi.com/2504-3900/2/6/218

- **[S6] American College of Sports Medicine — Exercising in Hot and Cold Environments.** Riesgo térmico durante ejercicio y ajustes recomendados.  
  https://www.acsm.org/wp-content/uploads/2025/02/Exercising-in-hot-and-cold-environments.pdf

- **[S7] Bosch eBike Systems — Safely through the winter with the eBike.** Pérdida de capacidad con frío y protección contra lluvia/salpicaduras.  
  https://www.bosch-ebike.com/en/news/safely-through-the-winter-with-the-ebike/

- **[S8] Bosch eBike Systems — Protection against the weather.** Temperaturas de operación y cuidados de batería.  
  https://help.bosch-ebike.com/en/help-center/ebw-care/asset-ast-00047

- **[S9] Xiaomi — Electric Scooter 4 Pro Plus waterproof rating and rainy weather.** Prohibición de circular con lluvia por seguridad, aun con IPX4.  
  https://www.mi.com/es/support/faq/details/KA-321866/

- **[S10] Segway — E2 Plus II User Manual.** Indicación de no circular bajo lluvia ni atravesar charcos.  
  https://store.segway.com/media/wysiwyg/e2_plus_ii/User_Manual.pdf

- **[S11] Tian et al. — Characteristics and Risk Factors for Electric Scooter-Related Crashes and Injury Crashes.** Pérdida de equilibrio, superficies peligrosas y limitación de la evidencia meteorológica.  
  https://www.mdpi.com/1660-4601/19/16/10129

- **[S12] Xu et al. — Prediction of pavement water film depth and critical rainfall conditions. PLOS ONE.** Reducción de fricción con películas delgadas de agua y falta de consenso sobre un único corte de pavimento mojado.  
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318228

- **[S13] NHTSA — Motorcycle Safety.** Riesgo de lluvia, superficies resbaladizas, marcas pintadas y tapas metálicas.  
  https://www.nhtsa.gov/sites/nhtsa.gov/files/807709.pdf

- **[S14] Motorcycle Safety Foundation — If You Ride a Motorcycle.** Manejo de viento fuerte y superficies mojadas como condiciones adversas.  
  https://msf-usa.org/documents/library/if-you-ride-a-motorcycle/

- **[S15] Do, Katsuchi & Wang — Investigating the effect of crosswind on the aerodynamic stability of motorcycle (2026).** Variación de cargas según dirección del viento.  
  https://www.jstage.jst.go.jp/article/structcivil/72A/0/72A_315/_article/-char/en

- **[S16] Traffic Wales — High Winds on Britannia Bridge.** Restricción a motos sobre 40 mph de viento.  
  https://traffic.wales/high-winds-britannia-bridge

- **[S17] NHTSA — Strategies to Increase Rider Conspicuity and Use of Protective Clothing.** Evidencia de estrés térmico y errores con equipamiento protector en calor.  
  https://www.nhtsa.gov/book/countermeasures-that-work/motorcycle-safety/countermeasures/other-strategies-behavior-change-0

- **[S18] INUMET — Características climáticas de Uruguay.** Régimen de vientos, humedad y mayor intensidad sobre zonas costeras.  
  https://www.inumet.gub.uy/en/clima/estadisticas-climatologicas/caracteristicas-climaticas

---

## Conclusión de producto

La matriz evita tratar a todos los rodados como si fueran una bicicleta:

- **Ciclismo deportivo:** castiga dirección y calor por rendimiento y esfuerzo.
- **E-bike:** tolera más viento sostenido, pero no más ráfaga.
- **Monopatín:** castiga ráfagas, viento cruzado y piso mojado.
- **Moto/ciclomotor:** tolera más viento total, pero reduce mucho el límite cuando es cruzado.

La lógica sigue siendo binaria, determinista y explicable con una frase.
