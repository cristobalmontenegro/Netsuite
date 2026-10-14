# 🚀 RFM Engine for NetSuite

[Español abajo](#rfm-engine-para-netsuite)

Three Scheduled Scripts that segment every customer by their real behaviour: **7 weekly measurement variables**, a consolidated 0–100 score, a DuPont index, a letter rating (AAA…DDD), and a sync of the latest week onto the customer record.

## The 7 measurement variables

Every week each customer gets these seven values, stored **raw** (real value) and **normalized 0–9**:

| Sigla | Name | What it measures | Normalization |
|:--:|---|---|:--:|
| **R** | **Recency** | Days since the customer's last invoice | `9 · (365 − r) / 365` |
| **F** | **Frequency** | Number of invoices in the 12-month window | `9 · f / 12` (max 9) |
| **M** | **Monetary** | Net invoiced amount (invoices − credit memos) | `9 · √(m / 60000)` |
| **P** | **Punctuality** | Weighted **days late** vs. due date (0 = on time) | `9 · (180 − min(180,p)) / 180` |
| **Z** | **Credit term** | Weighted days of credit actually granted | same shape as P |
| **G** | **Profit per tonne** | Total profit ÷ tonnes sold (`pesoKg / 1000`) | `4 · g / 230` |
| **D** | **Avg. days to pay** | Weighted days from invoice date to payment | `9 · (75 − d) / (75 − 8)` |

The **7-digit RFM string** written onto the customer is: `R F M P Z G D`.

### Derived metrics

| Metric | Formula | Meaning |
|---|---|---|
| `b` | `gananciaTotal / montoTotal · 100` | Gross margin % |
| `k` | `pesoTotalParaGanancia` | Tonnes sold (raw weight) |
| `NMON` | `clamp(m / 1000, 0, 100)` | Volume component — **40%** |
| `NMGN` | `clamp(100 · (b − 8) / (17 − 8), 0, 100)` | Margin component — **30%** |
| `NMORA` | `clamp((180 − p) / 180 · 100, 0, 100)` | Arrears component — **30%** |
| `NDPP` | `clamp(100 · (75 − d) / (75 − 8), 0, 100)` | Kept for history (no longer in the score) |
| **`SCORE`** | `NMON·0.4 + NMGN·0.3 + NMORA·0.3` | **0–100 consolidated score** |
| `dupont` | `(360 / max(d,1)) · max(b,0)` | DuPont ROI index |
| `rank` | 3 letters from amount / DuPont / days-to-pay | e.g. `AAA`, `BBA`, `CDD` |

Rank letters: **≥60000 → A, ≥25000 → B, ≥10000 → C, else D** (amount); **≥2 / ≥1.2 / ≥0.6** (DuPont); **≤8 / ≤15 / ≤30 days** (payment). Detail text and colour come from the mapping record.

## Files

| File | Script type | Role |
|---|---|---|
| `RFM_Engine_SCH.js` | Scheduled | **The calculator.** Pulls 5 searches, computes the 7 variables + score, upserts one row per customer **per week**. v16.2 |
| `RFM_Controller_SCH.js` | Scheduled | **Backfill driver.** Keeps a "page marker" date in a custom record and fires the calculator week by week until the range is done, then turns itself off. v4.1 |
| `RFM_Sync_SCH.js` | Scheduled | **Synchronizer.** Detects the newest calculated week and writes RFM string, Score, Rank, DuPont and avg. days-to-pay onto the Customer record. v3.1 |

## Requirements

- **Server SuiteScript** enabled.
- Scheduled Script governance: the calculator re-schedules itself (queue parameter) when it is under **800 units**; the synchronizer under **200 units**.
- Inactive customers are excluded automatically (`isinactive = T`).
- No external integration, no Token-Based Authentication.

## Data model

**Custom record 1 — results (`customrecord_rfm_cmc`)**, one row per customer per week:

| Group | Fields |
|---|---|
| Keys | `custrecord_rfm_cliente`, `custrecord_rfm_semana` (`YYYY-ww`) |
| Normalized 0–9 | `custrecord_rfm_r` `…_f` `…_m` `…_p` `…_z` `…_g` `…_d` |
| Raw values | `custrecord_v_r` `…_f` `…_m` `…_p` `…_z` `…_g` `…_d` `…_k` `…_b` |
| Score | `custrecord_score`, `custrecord_rank`, `custrecord_dupont` |
| Components | `custrecord_nmon`, `custrecord_nmgn`, `custrecord_nmora`, `custrecord_ndpp` |
| Rating meta | `custrecord_rank_detalle`, `custrecord_rank_color` |

**Custom record 2 — rating map (`customrecord_mapeorank`)**: `custrecord_map_rank`, `custrecord_map_detalle`, `custrecord_map_color`. Fill one row per `AAA`…`DDD`.

**Custom record 3 — backfill marker (`customrecord_cmc_rfm_backfill_ctrl`)**: `custrecord_proxima_fecha_backfill` (date). Internal id **1**.

**Customer fields written by the sync**: `custentity_ultimo_rfm_cmc` (7-digit string), `custentity_dpp_cmc`, `custentity_score_cmc`, `custentity_rank_cmc`, `custentity_dupont_cmc`.

## Step-by-step implementation

### 1. Create the custom records and fields

Create the three records above with **exactly those IDs** (or change the IDs in the scripts to match yours).

### 2. Upload the scripts

Upload `RFM_Engine_SCH.js`, `RFM_Controller_SCH.js` and `RFM_Sync_SCH.js` to `File Cabinet > SuiteScripts`.

### 3. Create the script records

`Customization > Scripting > Scripts > New`, API Version **2.1**, one per file:

| Suggested ID | File |
|---|---|
| `customscript_cmc_ss_calcularfm` | `RFM_Engine_SCH.js` |
| `customscript_cmc_ss_rfm_controller` | `RFM_Controller_SCH.js` |
| `customscript_cmc_ss_rfm_sync` | `RFM_Sync_SCH.js` |

### 4. Create the deployments and set parameters

| Script | Parameter | Purpose |
|---|---|---|
| Calculator | `custscript_cmc_ss_calcularfm_idcliente` | Run for a single customer (debug) |
| Calculator | `custscript_cmc_ss_calcularfm_fechacorte` | Cut-off date (`dd/mm/yyyy`); defaults to today |
| Calculator | `custscript_cmc_ss_rfm_clientespend` | Queue of pending customers (managed by reschedule — leave empty) |
| Sync | `custscript_cmc_rfm_sync_clientes` | Pending-customer queue (leave empty) |

> **Parameter IDs must be short enough for NetSuite** — keep the same IDs shown here.

### 5. Point the controller at the calculator

Open `RFM_Controller_SCH.js` and set the constants so they match the IDs you actually created:

```js
const ID_SCRIPT_OBRERO     = 'customscript_cmc_ss_calcularfm';
const ID_DEPLOYMENT_OBRERO = 'customdeploy_cmc_ss_calcularfm_backfill';
const ID_PARAM_OBRERO_SCRIPT = 'custscript_cmc_ss_calcularfm_fechacorte';
const ID_TIPO_REGISTRO_MARCADOR = 'customrecord_cmc_rfm_backfill_ctrl';
const ID_CAMPO_MARCADOR     = 'custrecord_proxima_fecha_backfill';
const ID_REGISTRO_MARCADOR  = 1;
const FECHA_INICIO_STR = 'dd/mm/yyyy';   // first week to process
const FECHA_FIN_STR    = 'dd/mm/yyyy';   // last week to process
```

### 6. Schedule

1. **Calculator** — deployment `NOTSCHEDULED` when driven by the controller (it is the "worker"); or schedule it *weekly* directly if you only want the current week.
2. **Controller** — schedule it (e.g. every 30 min) for backfill runs; it stops itself when it passes `FECHA_FIN_STR`.
3. **Synchronizer** — schedule *after* the calculator (e.g. daily), so it picks up the newest week.

### 7. Fill the rating map

Add rows to `customrecord_mapeorank` for `AAA`, `AAB`, … `DDD` with a description and colour.

### 8. Test

Set `IS_TEST_MODE = true` at the top of `RFM_Engine_SCH.js` (logs a CSV-like line per customer without writing). Then run a single customer via `custscript_cmc_ss_calcularfm_idcliente`.

## Configuration

| Constant | File | Default | Purpose |
|---|---|---|---|
| `IS_TEST_MODE` | `RFM_Engine_SCH.js` | `false` | `true` = log only, no DB writes |
| `GOVERNANCE_THRESHOLD` | `RFM_Engine_SCH.js` | `800` | Units left before rescheduling |
| `FILTROS_EXTRA_MAESTRA` | `RFM_Engine_SCH.js` | `[]` | Optional account/localization filters (see comment in code) |
| `FECHA_INICIO_STR` / `FECHA_FIN_STR` | `RFM_Controller_SCH.js` | — | Backfill range |
| `GOVERNANCE_THRESHOLD` | `RFM_Sync_SCH.js` | `200` | Units left before rescheduling |

## Typical runtime flow

```
Controller ──(fires, week by week)──▶ Calculator ──▶ customrecord_rfm_cmc (1 row/client/week)
                                              └─▶ re-queues remaining clients if < 800 units

Sync ──(newest week)──▶ Customer: RFM string, Score, Rank, DuPont, avg. days-to-pay
```

---

# RFM Engine para NetSuite

Tres scripts programados que segmentan a cada cliente por su comportamiento real: **7 variables de medición semanales**, un puntaje consolidado 0–100, un índice DuPont, una calificación por letras (AAA…DDD) y la sincronización de la última semana hacia la ficha del cliente.

## Las 7 variables de medición

Cada semana, por cliente, se guardan estos siete valores **en crudo** (valor real) y **normalizados 0–9**:

| Sigla | Nombre | Qué mide | Normalización |
|:--:|---|---|:--:|
| **R** | **Recencia** | Días desde la última factura del cliente | `9 · (365 − r) / 365` |
| **F** | **Frecuencia** | Cantidad de facturas en la ventana de 12 meses | `9 · f / 12` (máx. 9) |
| **M** | **Monetario** | Monto facturado neto (facturas − notas de crédito) | `9 · √(m / 60000)` |
| **P** | **Puntualidad** | Días de atraso promedio ponderados vs. vencimiento (0 = puntual) | `9 · (180 − min(180,p)) / 180` |
| **Z** | **Plazo** | Días de crédito otorgados, ponderados por monto | misma forma que P |
| **G** | **Ganancia por Tonelada** | Ganancia total ÷ toneladas vendidas (`pesoKg / 1000`) | `4 · g / 230` |
| **D** | **Días promedio de Pago** | Días ponderados desde emisión hasta pago | `9 · (75 − d) / (75 − 8)` |

La **cadena RFM de 7 dígitos** que se escribe en el cliente es: `R F M P Z G D`.

### Métricas derivadas

| Métrica | Fórmula | Significado |
|---|---|---|
| `b` | `gananciaTotal / montoTotal · 100` | Margen bruto % |
| `k` | `pesoTotalParaGanancia` | Toneladas vendidas (peso en crudo) |
| `NMON` | `clamp(m / 1000, 0, 100)` | Componente de volumen — **40%** |
| `NMGN` | `clamp(100 · (b − 8) / (17 − 8), 0, 100)` | Componente de margen — **30%** |
| `NMORA` | `clamp((180 − p) / 180 · 100, 0, 100)` | Componente de mora — **30%** |
| `NDPP` | `clamp(100 · (75 − d) / (75 − 8), 0, 100)` | Se conserva por histórico (ya no entra al score) |
| **`SCORE`** | `NMON·0.4 + NMGN·0.3 + NMORA·0.3` | **Puntaje consolidado 0–100** |
| `dupont` | `(360 / max(d,1)) · max(b,0)` | Índice DuPont de rentabilidad |
| `rank` | 3 letras por monto / DuPont / días de pago | p. ej. `AAA`, `BBA`, `CDD` |

Letras: **≥60000 → A, ≥25000 → B, ≥10000 → C, resto D** (monto); **≥2 / ≥1.2 / ≥0.6** (DuPont); **≤8 / ≤15 / ≤30 días** (pago). El detalle y el color vienen del registro de mapeo.

## Archivos

| Archivo | Tipo de script | Rol |
|---|---|---|
| `RFM_Engine_SCH.js` | Programado | **El calculador.** Ejecuta 5 búsquedas, calcula las 7 variables + score y hace upsert de **una fila por cliente por semana**. v16.2 |
| `RFM_Controller_SCH.js` | Programado | **Controlador de backfill.** Guarda una "fecha marcador" en un registro personalizado y dispara el calculador semana a semana hasta cubrir el rango, luego se apaga. v4.1 |
| `RFM_Sync_SCH.js` | Programado | **Sincronizador.** Detecta la semana más reciente calculada y escribe la cadena RFM, Score, Rank, DuPont y días promedio de pago en la ficha del Cliente. v3.1 |

## Requisitos

- **Server SuiteScript** habilitado.
- Gobernanza de scripts programados: el calculador se re-agenda con la cola de clientes cuando le quedan **800 unidades**; el sincronizador con **200**.
- Los clientes inactivos se excluyen automáticamente (`isinactive = T`).
- Sin integraciones externas ni Token-Based Authentication.

## Modelo de datos

**Registro 1 — resultados (`customrecord_rfm_cmc`)**, una fila por cliente por semana:

| Grupo | Campos |
|---|---|
| Claves | `custrecord_rfm_cliente`, `custrecord_rfm_semana` (`AAAA-ss`) |
| Normalizados 0–9 | `custrecord_rfm_r` `…_f` `…_m` `…_p` `…_z` `…_g` `…_d` |
| Valores crudos | `custrecord_v_r` `…_f` `…_m` `…_p` `…_z` `…_g` `…_d` `…_k` `…_b` |
| Puntaje | `custrecord_score`, `custrecord_rank`, `custrecord_dupont` |
| Componentes | `custrecord_nmon`, `custrecord_nmgn`, `custrecord_nmora`, `custrecord_ndpp` |
| Meta de calificación | `custrecord_rank_detalle`, `custrecord_rank_color` |

**Registro 2 — mapa de calificaciones (`customrecord_mapeorank`)**: `custrecord_map_rank`, `custrecord_map_detalle`, `custrecord_map_color`. Una fila por `AAA`…`DDD`.

**Registro 3 — marcador de backfill (`customrecord_cmc_rfm_backfill_ctrl`)**: `custrecord_proxima_fecha_backfill` (fecha). Id interno **1**.

**Campos de Cliente que escribe el sincronizador**: `custentity_ultimo_rfm_cmc` (cadena de 7 dígitos), `custentity_dpp_cmc`, `custentity_score_cmc`, `custentity_rank_cmc`, `custentity_dupont_cmc`.

## Guía de implementación paso a paso

### 1. Crear los registros personalizados y sus campos

Crear los tres registros de arriba con **exactamente esos IDs** (o cambiar los IDs en los scripts para que coincidan con los tuyos).

### 2. Subir los scripts

Subir `RFM_Engine_SCH.js`, `RFM_Controller_SCH.js` y `RFM_Sync_SCH.js` a `File Cabinet > SuiteScripts`.

### 3. Crear los Script records

`Personalización > Scripting > Scripts > Nuevo`, API Version **2.1**, uno por archivo:

| ID sugerido | Archivo |
|---|---|
| `customscript_cmc_ss_calcularfm` | `RFM_Engine_SCH.js` |
| `customscript_cmc_ss_rfm_controller` | `RFM_Controller_SCH.js` |
| `customscript_cmc_ss_rfm_sync` | `RFM_Sync_SCH.js` |

### 4. Crear los despliegues y configurar parámetros

| Script | Parámetro | Propósito |
|---|---|---|
| Calculador | `custscript_cmc_ss_calcularfm_idcliente` | Ejecutar para un solo cliente (depuración) |
| Calculador | `custscript_cmc_ss_calcularfm_fechacorte` | Fecha de corte (`dd/mm/aaaa`); por defecto hoy |
| Calculador | `custscript_cmc_ss_rfm_clientespend` | Cola de clientes pendientes (la gestiona el re-agendado — dejar vacío) |
| Sync | `custscript_cmc_rfm_sync_clientes` | Cola de pendientes (dejar vacío) |

> **Los IDs de parámetro deben ser cortos** para que NetSuite los acepte — conserva los mismos IDs indicados aquí.

### 5. Apuntar el controlador al calculador

Abrir `RFM_Controller_SCH.js` y ajustar las constantes para que coincidan con los IDs que realmente creaste:

```js
const ID_SCRIPT_OBRERO     = 'customscript_cmc_ss_calcularfm';
const ID_DEPLOYMENT_OBRERO = 'customdeploy_cmc_ss_calcularfm_backfill';
const ID_PARAM_OBRERO_SCRIPT = 'custscript_cmc_ss_calcularfm_fechacorte';
const ID_TIPO_REGISTRO_MARCADOR = 'customrecord_cmc_rfm_backfill_ctrl';
const ID_CAMPO_MARCADOR     = 'custrecord_proxima_fecha_backfill';
const ID_REGISTRO_MARCADOR  = 1;
const FECHA_INICIO_STR = 'dd/mm/aaaa';   // primera semana a procesar
const FECHA_FIN_STR    = 'dd/mm/aaaa';   // última semana a procesar
```

### 6. Programar

1. **Calculador** — despliegue `NOTSCHEDULED` cuando lo mueve el controlador (es el "obrero"); o agendarlo *semanal* para solo la semana en curso.
2. **Controlador** — agendarlo (p. ej. cada 30 min) para backfill; se apaga solo al superar `FECHA_FIN_STR`.
3. **Sincronizador** — agendar *después* del calculador (p. ej. diario), para que tome la semana más reciente.

### 7. Cargar el mapa de calificaciones

Agregar filas en `customrecord_mapeorank` para `AAA`, `AAB`, … `DDD` con descripción y color.

### 8. Probar

Poner `IS_TEST_MODE = true` al inicio de `RFM_Engine_SCH.js` (loguea una línea tipo CSV por cliente sin escribir en BD). Luego ejecutar un solo cliente con `custscript_cmc_ss_calcularfm_idcliente`.

## Configuración

| Constante | Archivo | Default | Propósito |
|---|---|---|---|
| `IS_TEST_MODE` | `RFM_Engine_SCH.js` | `false` | `true` = solo log, no escribe en BD |
| `GOVERNANCE_THRESHOLD` | `RFM_Engine_SCH.js` | `800` | Unidades restantes antes de re-agendarse |
| `FILTROS_EXTRA_MAESTRA` | `RFM_Engine_SCH.js` | `[]` | Filtros opcionales de cuenta/localización (ver comentario en el código) |
| `FECHA_INICIO_STR` / `FECHA_FIN_STR` | `RFM_Controller_SCH.js` | — | Rango de backfill |
| `GOVERNANCE_THRESHOLD` | `RFM_Sync_SCH.js` | `200` | Unidades restantes antes de re-agendarse |

## Flujo típico de ejecución

```
Controlador ──(dispara, semana a semana)──▶ Calculador ──▶ customrecord_rfm_cmc (1 fila/cliente/semana)
                                                   └─▶ re-encola clientes si quedan < 800 unidades

Sync ──(semana más reciente)──▶ Cliente: cadena RFM, Score, Rank, DuPont, días prom. de pago
```

---

---

## ☕ Support me / Apóyame

**EN:** If any of this was useful, you can buy me a coffee. Thanks for the support!

**ES:** Si te resultó útil, puedes invitarme un café. ¡Gracias por el apoyo!

<p align="center">
  <a href="https://ko-fi.com/cristobalmontenegro" target="_blank">
    <img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" border="0" alt="Buy Me a Coffee at ko-fi.com" />
  </a>
</p>

---

## 👤 Author / Autoría

**Cristóbal Montenegro** — https://github.com/cristobalmontenegro

## 📜 License / Licencia

MIT — see [`LICENSE`](../LICENSE).
---

# 🌐 RFM Engine for NetSuite (English)

**🇬🇧 English**

> The full documentation is in Spanish above. This is a brief English summary.

- **Author:** Cristóbal Montenegro ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
- **License:** MIT — see [`LICENSE`](../../LICENSE).
