# Reopen Closed Transaction for NetSuite

[Español abajo](#reapertura-de-transacciones-cerradas)

A User Event script + Suitelet pair that adds a **"Reopen Transaction"** button on closed transactions and forces them back to open by clearing the per-line *closed* flag — something the standard UI does not allow.

## Overview (EN)

NetSuite closes transaction lines (e.g. an Invoice fully applied, an Item Fulfillment fully billed) and then **blocks edits**. Sometimes business needs to reopen that document — to fix a line, re-link a payment, or correct an item. The standard UI offers no supported button, and simply saving throws validation errors.

This module does it safely:

- **`ue_reopen_button.js`** (User Event, `beforeLoad`): when the record is `VIEW` and status is `closed`, injects a small JS function and adds a button that calls it. The button redirects to the companion Suitelet.
- **`sl_force_reopen.js`** (Suitelet): loads the transaction **non-dynamically** (`isDynamic: false`, so client scripts and real-time calculations are skipped), clears `isclosed` on each item line, and saves with `enableSourcing: false` and `ignoreMandatoryFields: true`. Then redirects the user back to the document.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account. |
| Feature | **Server SuiteScript**. |
| Permission | Deploy as Administrator (the Suitelet needs to edit closed transactions). |
| Modules | `N/url`, `N/log`, `N/ui/serverWidget`, `N/record`, `N/redirect` (standard). |

⚠️ **Caution:** reopening a closed transaction changes accounting/inventory state. Use restricted audience and audit the log (`N/log` audit entries are written on success).

## How it works (EN)

1. User opens a **closed** transaction (VIEW). The UE sees `statusRef === 'closed'` and adds the button.
2. The button runs `window.location.replace(<suiteletUrl>)` (with `window.onbeforeunload = null` to avoid the "leave page?" prompt), passing `custparam_recid` and `custparam_rectype`.
3. The Suitelet loads the record non-dynamically, iterates `item` lines, sets `isclosed = false` where needed, saves, and redirects back to the record.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `ue_reopen_button.js` | User Event | Adds the button to closed transactions. |
| `sl_force_reopen.js` | Suitelet | Performs the forced reopen. |

## Step-by-step implementation (EN)

1. **Upload** both files to `File Cabinet > SuiteScripts`.

2. **Create the Suitelet script record first** (the UE references it):
   `Customization > Scripting > Scripts > New` → `sl_force_reopen.js`.
   - **ID**: `customscript_sl_force_reopen`
   - **API Version**: 2.1
   - Deploy it: **Applies To: Role** → Administration roles only → **Status**: Released.
   - Deployment ID: `customdeploy_sl_force_reopen`.

3. **Adjust the config in `ue_reopen_button.js`** so it points to the Suitelet ids you just created:
   ```js
   const REOPEN_SUITELET_SCRIPT_ID = 'customscript_sl_force_reopen';
   const REOPEN_SUITELET_DEPLOY_ID = 'customdeploy_sl_force_reopen';
   ```

4. **Create the User Event script record**: `ue_reopen_button.js`.
   - **ID**: `customscript_ue_reopen_button`, **API Version**: 2.1.
   - **Deploy**: **Applies To: Transaction** → the types you want to allow reopening (`Invoice`, `Item Fulfillment`, `Journal Entry`, …); **Event**: only `Before Load` is needed; **Status**: Released.
   - Deployment ID: `customdeploy_ue_reopen_button`.

5. **Test**: open a closed transaction → the green **"Reopen Transaction"** button appears → click → the page returns with the transaction reopened. Check `N/log` audit entries.

## Configuration (EN)

| Constant | File | Purpose |
|---|---|---|
| `REOPEN_SUITELET_SCRIPT_ID` | `ue_reopen_button.js` | Script id of the companion Suitelet. |
| `REOPEN_SUITELET_DEPLOY_ID` | `ue_reopen_button.js` | Deployment id of the companion Suitelet. |

---

# Reapertura de Transacciones Cerradas

Un User Event + Suitelet que agrega un botón **"Reabrir Transacción"** en transacciones cerradas y las fuerza a abrirse limpiando el flag *closed* por línea — algo que la UI estándar no permite.

## Descripción (ES)

NetSuite cierra las líneas de una transacción (p. ej. una Factura totalmente aplicada, una Entrega totalmente facturada) y luego **bloquea la edición**. A veces el negocio necesita reabrir ese documento —para corregir una línea, re-vincular un pago o corregir un artículo. La UI estándar no ofrece un botón soportado, y simplemente guardar lanza errores de validación.

Este módulo lo hace de forma segura:

- **`ue_reopen_button.js`** (User Event, `beforeLoad`): cuando el registro está en `VIEW` y su estado es `closed`, inyecta una función JS y agrega un botón que la llama. El botón redirige al Suitelet compañero.
- **`sl_force_reopen.js`** (Suitelet): carga la transacción **en modo no-dinámico** (`isDynamic: false`, así se saltan scripts de cliente y cálculos en tiempo real), limpia `isclosed` en cada línea de ítem y guarda con `enableSourcing: false` e `ignoreMandatoryFields: true`. Luego redirige al usuario de vuelta al documento.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta. |
| Feature | **Server SuiteScript**. |
| Permiso | Desplegar como Administrador (el Suitelet necesita editar transacciones cerradas). |
| Módulos | `N/url`, `N/log`, `N/ui/serverWidget`, `N/record`, `N/redirect` (estándar). |

⚠️ **Precaución:** reabrir una transacción cerrada cambia el estado contable/inventario. Usar audiencia restringida y auditar el log (se escriben entradas de auditoría `N/log` al tener éxito).

## Cómo funciona (ES)

1. El usuario abre una transacción **cerrada** (VIEW). El UE ve `statusRef === 'closed'` y agrega el botón.
2. El botón ejecuta `window.location.replace(<suiteletUrl>)` (con `window.onbeforeunload = null` para evitar el aviso "¿salir de la página?"), pasando `custparam_recid` y `custparam_rectype`.
3. El Suitelet carga el registro de forma no-dinámica, recorre las líneas de `item`, pone `isclosed = false` donde haga falta, guarda y redirige de vuelta al registro.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `ue_reopen_button.js` | User Event | Agrega el botón en transacciones cerradas. |
| `sl_force_reopen.js` | Suitelet | Realiza la reapertura forzada. |

## Guía de implementación paso a paso (ES)

1. **Subir** ambos archivos a `File Cabinet > SuiteScripts`.

2. **Crear primero el Script record del Suitelet** (el UE lo referencia):
   `Personalización > Scripting > Scripts > Nuevo` → `sl_force_reopen.js`.
   - **ID**: `customscript_sl_force_reopen`
   - **API Version**: 2.1
   - Desplegarlo: **Applies To: Role** → solo roles de administración → **Status**: Released.
   - Deployment ID: `customdeploy_sl_force_reopen`.

3. **Ajustar la config en `ue_reopen_button.js`** para que apunte a los ids del Suitelet recién creado:
   ```js
   const REOPEN_SUITELET_SCRIPT_ID = 'customscript_sl_force_reopen';
   const REOPEN_SUITELET_DEPLOY_ID = 'customdeploy_sl_force_reopen';
   ```

4. **Crear el Script record del User Event**: `ue_reopen_button.js`.
   - **ID**: `customscript_ue_reopen_button`, **API Version**: 2.1.
   - **Desplegar**: **Applies To: Transaction** → los tipos que quieras permitir reabrir (`Invoice`, `Item Fulfillment`, `Journal Entry`, …); **Evento**: solo hace falta `Before Load`; **Status**: Released.
   - Deployment ID: `customdeploy_ue_reopen_button`.

5. **Probar**: abrir una transacción cerrada → aparece el botón verde **"Reabrir Transacción"** → clic → la página vuelve con la transacción reabierta. Revisar las entradas de auditoría en `N/log`.

## Configuración (ES)

| Constante | Archivo | Propósito |
|---|---|---|
| `REOPEN_SUITELET_SCRIPT_ID` | `ue_reopen_button.js` | Script id del Suitelet compañero. |
| `REOPEN_SUITELET_DEPLOY_ID` | `ue_reopen_button.js` | Deployment id del Suitelet compañero. |

---

## 👤 Author / Autoría

**Cristóbal Montenegro** — https://github.com/cristobalmontenegro

## 📜 License / Licencia

MIT — see [`LICENSE`](../LICENSE).
