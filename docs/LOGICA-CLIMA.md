# ¿Me mando? — Lógica completa del veredicto climático

*Documento autocontenido para un agente externo. Contiene TODA la lógica actual de decisión
y el encargo: proponer la matriz de umbrales VEHÍCULO × CONDUCTOR.*

## 1. Qué hace la app

PWA que responde una sola pregunta: **¿me mando a salir rodando hoy (y mañana)?**
El usuario guarda recorridos (origen → destino con coordenadas, franja horaria de ida y de
vuelta) y la app da un veredicto binario **GO / NO GO** por día, con explicación en una línea.

Principio rector no negociable: **el veredicto lo deciden reglas deterministas y auditables**
(un LLM solo redacta la explicación). Cualquier propuesta debe poder explicarse en una frase
del tipo "no vas porque X". Nada de scores opacos.

## 2. Datos disponibles (Open-Meteo, por hora, 2 días)

| Campo | Descripción |
|---|---|
| `temp` | temperatura °C (termómetro) |
| `apparent` | **sensación térmica** °C (incluye viento y humedad) |
| `rainProb` | probabilidad de precipitación % (puede ser null → se trata como 100) |
| `precip` | mm de lluvia de esa hora |
| `code` | weathercode WMO (clasificado abajo) |
| `wind` | viento sostenido km/h |
| `gust` | ráfaga km/h |
| `windFrom` | dirección DESDE donde viene el viento (grados) |

Clasificación del `code`: **tormenta** (95,96,99) · **lluvia fuerte** (63,65,66,67,81,82) ·
**lluvia leve** (61,80) · **llovizna** (51-57) · **nieve** (71-77,85,86) · resto: seco.

**Dirección relativa** por tramo: la app conoce el rumbo del recorrido (bearing origen→destino;
la vuelta es el rumbo opuesto). `windFrom` vs rumbo → **de frente** (≤60° de diferencia),
**cruzado** (60-120°), **de cola** (≥120°). La ida y la vuelta se evalúan por separado:
el mismo viento puede ser de frente a la ida y de cola a la vuelta.

## 3. Estructura del veredicto

- Franjas horarias fijas: Madrugada 5-8 · Mañana 8-11 · Mediodía 11-14 · Media tarde 14-17 ·
  Tarde 17-20 · Noche 20-23. Se evalúa cada hora de la franja; **la peor hora manda**.
- **GO del día = ida GO Y vuelta GO** (si ya vas rodando, la vuelta te compromete).
- Reglas absolutas (todo perfil, todo vehículo): tormenta eléctrica con prob ≥20% → NO GO;
  nieve → NO GO.

## 4. Umbrales actuales por CONDUCTOR (hoy solo existe "bici urbana")

Tres perfiles de conductor. Los eligió el dueño del producto y están validados contra guías
ciclistas (Beaufort, guías de commuting, wind-chill charts):

| Variable | 💅 Flojo (chill, si no está lindo va en auto) | Pibe común (usa el rodado seguido, no se expone) | 🥚 Extremo (tolera más, no es boludo) |
|---|---|---|---|
| Viento sostenido ≥ | 20 km/h | 30 km/h | 40 km/h |
| Ráfagas ≥ | 30 km/h | 40 km/h | 50 km/h |
| Frío: sensación < | 10° | 5° | 1° |
| Calor: sensación > | 28° | 30° | 34° |
| Lluvia fuerte: prob ≥ | 30% | 40% | 40% |
| Lluvia leve: prob ≥ | 30% | 40% | nunca bloquea |
| Llovizna: prob ≥ | 30% | 60% | nunca bloquea |
| Ámbito de la lluvia | **todo el día (6-22h)** | solo sus franjas | solo sus franjas |

Notas:
- Frío/calor comparan contra **sensación térmica** (`apparent`), no termómetro. La sensación
  ya fusiona viento+frío+humedad — es un índice compuesto real y evita doble castigo.
- El número mostrado nunca contradice el umbral (floor para frío, ceil para calor).

## 5. Capa "se junta demasiado" (combinación)

Un AND de umbrales sueltos no ve la miseria combinada. Regla adicional, por hora y por tramo:

> Si la probabilidad de lluvia de la categoría vigente llega a la **MITAD** del umbral del
> conductor (sin llegar a bloquear sola) **Y** al menos otra dimensión está en **zona
> amarilla**, → NO GO con explicación "se junta demasiado: llovizna 45% + viento de frente de 26".

- Zona amarilla de viento: `max(wind/vientoMax, gust/rafagaMax) ≥ 0.75` (y < 1).
- Zona amarilla de temperatura: sensación a menos de **3°** del límite de frío o calor.
- **El viento DE COLA no cuenta** en esta capa (empuja, no resta). Frente y cruzado sí.
- Los límites duros (100%) siguen valiendo vengan de donde vengan (una ráfaga al límite es
  peligrosa aunque venga de atrás).

## 6. EL ENCARGO: matriz VEHÍCULO × CONDUCTOR

La app suma 5 vehículos. Sensibilidades definidas por el dueño del producto:

- **Bici urbana** — importa viento, lluvia, temperatura. *(baseline: la tabla de arriba)*
- **Ciclismo deportivo** — importa mucho más viento sostenido, ráfagas y dirección del viento.
- **E-bike** — el viento afecta menos el esfuerzo, pero sí estabilidad/autonomía.
- **Monopatín / scooter** — muy sensible a ráfagas (ruedas chicas, poco agarre en mojado).
- **Moto / ciclomotor** — más resistente, pero el viento lateral fuerte importa.

Se pide: para cada uno de los 5 vehículos, los valores de las 8 variables de la tabla del
punto 4, para los 3 conductores (matriz 5×3×8). Además, si aplica por vehículo:

1. ¿La **dirección** del viento debería modular algo más que la capa combo? (ej.: deportivo:
   ¿el viento de frente sostenido baja el umbral efectivo? moto: ¿el CRUZADO fuerte pesa más?)
   Proponer regla concreta y explicable si corresponde.
2. ¿El **piso mojado** (llovió en horas previas) merece regla para monopatín? Proponer si sí.
3. Ajustes a la capa combo por vehículo (¿el 0.75 amarillo baja a 0.65 en monopatín?).

Restricciones duras para la propuesta:
- Mantener el formato de la tabla del punto 4 (mismas 8 variables por conductor).
- Tormenta y nieve siguen siendo NO GO absolutos, sin excepción.
- Toda regla nueva debe ser explicable en una frase ("no vas porque…"). Sin puntajes.
- Anclar los números en fuentes reales (Beaufort, guías de cada vehículo, estadística de
  siniestralidad de scooters en mojado, etc.) y citarlas.
- El clima es de Uruguay (Montevideo/Canelones): inviernos 5-14°, veranos 25-33° con humedad,
  ciudad ventosa (rambla). Los umbrales deben dejar días GO razonables en cada estación.

Formato de salida pedido: por vehículo, una tabla markdown idéntica a la del punto 4 +
(si hay) reglas extra numeradas con su justificación y fuente. Eso se integra directo al código.
