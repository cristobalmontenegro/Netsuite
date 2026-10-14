# 🚀 Sales Budget Guard for NetSuite

[Español abajo](#guardián-de-presupuesto-de-ventas)

A User Event script that **blocks saving a duplicate sales-budget record**: it prevents two active records sharing the same Seller + Period + Classification combination.

## Overview (EN)

Sales budgets are stored in a custom record (seller / period / classification). Without a control, the same combination can be entered twice, producing double-counted targets and wrong reports. NetSuite cannot enforce this with a simple unique constraint across a *select* + text combination, so a script is needed.

This script throws a blocking error on `beforeSubmit` when an **active** duplicate exists, and correctly excludes the current record when editing.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account. |
| Feature | **Server SuiteScript**. |
| Permission | Deploy as Administrator. |
| Modules | `N/search`, `N/error` (standard). |

### Custom record + fields to create (EN)

Create a custom record (suggested id `customrecord_sales_budget`) with these fields:

| Field | Type | Suggested ID | Notes |
|---|---|---|---|
| Seller | List/Record → Employee (or Entity) | `custrecord_sales_budget_seller` | — |
| Period | Free text or List/Record → Custom List | `custrecord_sales_budget_period` | e.g. `2026-Q1` |
| Classification | List/Record → Custom List | `custrecord_sales_budget_class` | e.g. product line / channel |
| (optional) Amount | Currency | `custrecord_sales_budget_amount` | target value |
| Inactive | standard | `isinactive` | script only checks active records |

> Field ids used by the script are shown in the code (`custrecord_vendedor_ppto_cmc`, `custrecord_periodo_ppto_cmc`, `custrecord_clasificacion_ppto_cmc`). Rename them in the record **or** change the constants in the script to match your account. Keep the script's `AUTH_CODE`-style configuration section consistent.

## How it works (EN)

`beforeSubmit`:

1. Reads `seller`, `period`, `classification` from the new record.
2. If all three have a value, runs a search on **the record's own type** (`newRecord.type`) filtered by those three fields + `isinactive = F`.
3. On `EDIT`, excludes the current record id so it does not collide with itself.
4. If the search returns ≥ 1 row, throws `ERR_PRESUPUESTO_DUPLICADO` (a user-facing message), blocking the save.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `ue_sales_budget_duplicate_guard.js` | User Event | Duplicate guard on the sales-budget custom record. |

## Step-by-step implementation (EN)

1. **Create the custom record** and the three fields listed above (`Customization > Lists, Records & Fields > Custom Records > New` + `Custom Record Fields`).

2. **Adjust the field ids** in `ue_sales_budget_duplicate_guard.js` (lines reading `custrecord_vendedor_ppto_cmc`, etc.) to match the field ids you created.

3. **Upload** `ue_sales_budget_duplicate_guard.js` to `File Cabinet > SuiteScripts`.

4. **Create the Script record**: **ID** `customscript_ue_sales_budget_guard`, **API Version**: 2.1.

5. **Deploy**: **Applies To: Custom Record** → your sales-budget record type; **Events**: `Create`, `Edit`; **Status**: Released; **Audience**: All Roles.
   Deployment ID: `customdeploy_ue_sales_budget_guard`.

6. **Test**: create a budget for Seller A / Period P / Class C → save OK. Try creating the *same* combination again → the error **"Ya existe un presupuesto registrado para este Vendedor, en este Período y con esta Clasificación."** appears and blocks the save. Editing the existing record must still work.

## Configuration (EN)

Edit the field ids referenced in the script (`custrecord_vendedor_ppto_cmc`, `custrecord_periodo_ppto_cmc`, `custrecord_clasificacion_ppto_cmc`) to match your custom record fields.

---

# Guardián de Presupuesto de Ventas

Un User Event que **bloquea guardar un presupuesto de ventas duplicado**: impide que existan dos registros activos con la misma combinación Vendedor + Período + Clasificación.

## Descripción (ES)

Los presupuestos de ventas se guardan en un registro personalizado (vendedor / período / clasificación). Sin un control, la misma combinación se puede ingresar dos veces, duplicando metas y arruinando los reportes. NetSuite no puede forzar esto con una restricción única simple sobre una combinación de *select* + texto, por lo que se necesita un script.

Este script lanza un error bloqueante en `beforeSubmit` cuando existe un duplicado **activo**, y excluye correctamente el registro actual al editar.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta. |
| Feature | **Server SuiteScript**. |
| Permiso | Desplegar como Administrador. |
| Módulos | `N/search`, `N/error` (estándar). |

### Registro personalizado + campos a crear (ES)

Crear un registro personalizado (id sugerido `customrecord_sales_budget`) con estos campos:

| Campo | Tipo | ID sugerido | Notas |
|---|---|---|---|
| Vendedor | Lista/Registro → Empleado (o Entidad) | `custrecord_sales_budget_seller` | — |
| Período | Texto libre o Lista/Registro → Lista custom | `custrecord_sales_budget_period` | p. ej. `2026-Q1` |
| Clasificación | Lista/Registro → Lista custom | `custrecord_sales_budget_class` | p. ej. línea / canal |
| (opcional) Monto | Moneda | `custrecord_sales_budget_amount` | valor meta |
| Inactivo | estándar | `isinactive` | el script solo revisa activos |

> Los ids de campo que usa el script se ven en el código (`custrecord_vendedor_ppto_cmc`, `custrecord_periodo_ppto_cmc`, `custrecord_clasificacion_ppto_cmc`). Renómbralos en el registro **o** cambia las constantes del script para que coincidan con tu cuenta.

## Cómo funciona (ES)

`beforeSubmit`:

1. Lee `vendedor`, `período`, `clasificación` del registro nuevo.
2. Si los tres tienen valor, ejecuta una búsqueda **sobre el propio tipo del registro** (`newRecord.type`) filtrando por esos tres campos + `isinactive = F`.
3. En `EDIT`, excluye el id actual para no chocar consigo mismo.
4. Si la búsqueda devuelve ≥ 1 fila, lanza `ERR_PRESUPUESTO_DUPLICADO` (mensaje visible al usuario), bloqueando el guardado.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `ue_sales_budget_duplicate_guard.js` | User Event | Guardián de duplicados del registro de presupuesto. |

## Guía de implementación paso a paso (ES)

1. **Crear el registro personalizado** y los tres campos de la tabla (`Personalización > Listas, registros y campos > Registros personalizados > Nuevo` + `Campos de registro personalizado`).

2. **Ajustar los ids de campo** en `ue_sales_budget_duplicate_guard.js` (las líneas que leen `custrecord_vendedor_ppto_cmc`, etc.) para que coincidan con los campos que creaste.

3. **Subir** `ue_sales_budget_duplicate_guard.js` a `File Cabinet > SuiteScripts`.

4. **Crear el Script record**: **ID** `customscript_ue_sales_budget_guard`, **API Version**: 2.1.

5. **Desplegar**: **Applies To: Custom Record** → tu tipo de registro de presupuesto; **Eventos**: `Create`, `Edit`; **Status**: Released; **Audience**: All Roles.
   Deployment ID: `customdeploy_ue_sales_budget_guard`.

6. **Probar**: crear un presupuesto para Vendedor A / Período P / Clase C → guarda OK. Intentar crear la *misma* combinación otra vez → aparece el error **"Ya existe un presupuesto registrado para este Vendedor, en este Período y con esta Clasificación."** y bloquea el guardado. Editar el registro existente debe seguir funcionando.

## Configuración (ES)

Editar los ids de campo referenciados en el script (`custrecord_vendedor_ppto_cmc`, `custrecord_periodo_ppto_cmc`, `custrecord_clasificacion_ppto_cmc`) para que coincidan con tus campos del registro personalizado.

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
