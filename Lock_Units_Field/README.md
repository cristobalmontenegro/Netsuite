# 🚀 Lock Units Field for NetSuite

[Español abajo](#bloqueo-del-campo-unidades)

A tiny Client Script that makes the **Units** field on transaction lines read-only, so users cannot override the unit quantity that NetSuite derived from the item and the quantity. Keeps inventory movements consistent.

## Overview (EN)

On transaction lines the **Units** field can be edited and, if changed, it desyncs the line quantity from the unit of measure — a common source of inventory and billing errors. This Client Script disables the field on every relevant line event, using **three surfaces** so it stays locked regardless of how the line was created or updated:

- `lineInit` — when a line is initialized/selected.
- `postSourcing` — after NetSuite sources a field (e.g. the item).
- `fieldChanged` — when the user changes the item.

It applies to the `item` and `inventory` sublists and fails silently (logs to console) if the field is not present.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account. |
| Feature | **Client SuiteScript**. |
| Permission | None special (runs in the user's browser). |
| Modules | None (self-contained). |

## How it works (EN)

`disableUnitsField(context)` looks up `units` on the current line and sets `isDisabled = true`. The three entry points call it so the lock is re-applied after any event that could re-enable the field. Wrapped in `try/catch` to never break the form.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `cs_lock_units_field.js` | Client Script | Locks the Units field. |

## Step-by-step implementation (EN)

1. **Upload** `cs_lock_units_field.js` to `File Cabinet > SuiteScripts`.
2. **Create the Script record**: `Customization > Scripting > Scripts > New` → select the file.
   - **Name**: `Lock Units Field`
   - **ID**: `customscript_cs_lock_units_field`
   - **API Version**: 2.1
3. **Deploy**: `Deployments > New`.
   - **Applies To: Transaction** → the transaction types where Units must be locked (e.g. `Sales Order`, `Invoice`, `Item Fulfillment`, `Purchase Order`, `Inventory Adjustment`).
   - **Audience**: the roles that should get the locked field (typically *All Roles*).
   - **Status**: Released.
   - Deployment ID: `customdeploy_cs_lock_units_field`.
4. **Test**: open a transaction line → the **Units** field appears greyed out and cannot be edited.

> To lock Units only for some roles, deploy with a restricted audience (do not use *All Roles*).

---

# Bloqueo del Campo Unidades

Un Client Script mínimo que vuelve de solo lectura el campo **Unidades** en las líneas de transacción, para que los usuarios no puedan sobrescribir la cantidad unitaria que NetSuite derivó del artículo y la cantidad. Mantiene consistentes los movimientos de inventario.

## Descripción (ES)

En las líneas de transacción el campo **Unidades** es editable y, si se cambia, desincroniza la cantidad de la línea respecto de la unidad de medida — una fuente común de errores de inventario y facturación. Este Client Script deshabilita el campo en cada evento relevante, usando **tres superficies** para que quede bloqueado sin importar cómo se creó o actualizó la línea:

- `lineInit` — cuando se inicializa/selecciona una línea.
- `postSourcing` — después de que NetSuite obtiene un campo (p. ej. el artículo).
- `fieldChanged` — cuando el usuario cambia el artículo.

Aplica a las sublistas `item` e `inventory` y falla en silencio (escribe en consola) si el campo no existe.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta. |
| Feature | **Client SuiteScript**. |
| Permiso | Ninguno especial (corre en el navegador del usuario). |
| Módulos | Ninguno (autocontenido). |

## Cómo funciona (ES)

`disableUnitsField(context)` busca `units` en la línea actual y pone `isDisabled = true`. Los tres puntos de entrada lo llaman, de modo que el bloqueo se re-aplica tras cualquier evento que pudiera reactivar el campo. Envuelto en `try/catch` para nunca romper el formulario.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `cs_lock_units_field.js` | Client Script | Bloquea el campo Unidades. |

## Guía de implementación paso a paso (ES)

1. **Subir** `cs_lock_units_field.js` a `File Cabinet > SuiteScripts`.
2. **Crear el Script record**: `Personalización > Scripting > Scripts > Nuevo` → elegir el archivo.
   - **Nombre**: `Lock Units Field`
   - **ID**: `customscript_cs_lock_units_field`
   - **API Version**: 2.1
3. **Desplegar**: `Deployments > Nuevo`.
   - **Applies To: Transaction** → los tipos de transacción donde se deba bloquear Unidades (p. ej. `Sales Order`, `Invoice`, `Item Fulfillment`, `Purchase Order`, `Inventory Adjustment`).
   - **Audience**: los roles que deben recibir el campo bloqueado (típicamente *All Roles*).
   - **Status**: Released.
   - Deployment ID: `customdeploy_cs_lock_units_field`.
4. **Probar**: abrir una línea de transacción → el campo **Unidades** aparece gris y no se puede editar.

> Para bloquear Unidades solo a ciertos roles, desplegar con audiencia restringida (no usar *All Roles*).

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
