# 🚀 Inbound Shipment Gate for NetSuite

[Español abajo](#control-de-recepción-de-envíos)

A User Event + Client Script pair that **blocks receiving an Inbound Shipment** until a custom "Costs complete" checkbox is checked. Prevents receiving goods before freight, duties and landed costs are fully captured.

## Overview (EN)

In NetSuite, an **Inbound Shipment** can be received (converted into an Item Receipt) as soon as it arrives — even if freight, insurance or other landed costs have not been entered yet. Receiving too early locks in wrong item costs.

This module adds a gate:

- **`ue_inbound_shipment_gate.js`** (User Event, `beforeLoad`): on `VIEW`, if the checkbox `custrecord_costoscompletos_cmc` is **not** checked, disables the **Receive** button server-side (robust, cannot be bypassed in the UI).
- **`cs_inbound_shipment_gate.js`** (Client Script, `pageInit`): on `view` mode, visually disables the same button (`#receive`) so the user gets immediate feedback. It is a cosmetic companion to the server-side control.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Advanced inventory / Inbound Shipment feature enabled. |
| Feature | **Server SuiteScript** + **Client SuiteScript**. |
| Permission | Deploy as Administrator. |
| Modules | `N/log` (UE). |

### Custom field to create (EN)

| Field | Type | Applies To | ID | Purpose |
|---|---|---|---|---|
| Costs complete | Checkbox | Inbound Shipment | `custrecord_costoscompletos_cmc` | Marks that all costs (freight, duties…) are captured and the shipment may be received. |

> The field id is a **configuration constant** at the top of both scripts (`COSTS_COMPLETE_FIELD`). Change it there if you use a different id.

## How it works (EN)

- The checkbox is checked by warehouse/accounting once all landed costs are entered.
- While unchecked: the **Receive** button is disabled server-side (UE) and greys out client-side (CS).
- Once checked: receiving is allowed as normal.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `ue_inbound_shipment_gate.js` | User Event | Server-side control of the Receive button. |
| `cs_inbound_shipment_gate.js` | Client Script | Cosmetic/UX disabling of the button. |

## Step-by-step implementation (EN)

1. **Create the custom field**
   `Customization > Lists, Records & Fields > Transaction Body Fields > New`:
   - **Label**: `Costs Complete`
   - **ID**: `custrecord_costoscompletos_cmc`
   - **Type**: `Checkbox`
   - **Applies To**: `Inbound Shipment` (✔ also applies to `Inbound Shipment` record type)
   - **Display**: normal. **Store Value**: ✔

2. **Upload** both files to `File Cabinet > SuiteScripts`.

3. **Create the User Event script**:
   - **ID**: `customscript_ue_inbound_shipment_gate`, **API Version**: 2.1.
   - **Deploy**: **Applies To: Inbound Shipment**; **Event**: `Before Load`; **Status**: Released; **Audience**: All Roles.
   - Deployment ID: `customdeploy_ue_inbound_shipment_gate`.

4. **Create the Client Script**:
   - **ID**: `customscript_cs_inbound_shipment_gate`, **API Version**: 2.1.
   - **Deploy**: **Applies To: Inbound Shipment**; **Status**: Released.
   - Deployment ID: `customdeploy_cs_inbound_shipment_gate`.

5. **Test**:
   - Open an Inbound Shipment in view mode with the checkbox **unchecked** → the **Receive** button is disabled.
   - Check the box, save, reopen → the button is enabled.

## Configuration (EN)

| Constant | File(s) | Default | Purpose |
|---|---|---|---|
| `COSTS_COMPLETE_FIELD` | both | `custrecord_costoscompletos_cmc` | Id of the "costs complete" checkbox. |

---

# Control de Recepción de Envíos

Un User Event + Client Script que **bloquea recibir un Inbound Shipment** hasta que se marque un check personalizado de "Costos completos". Evita recibir mercadería antes de capturar flete, aranceles y costos de importación.

## Descripción (ES)

En NetSuite, un **Inbound Shipment** se puede recibir (convertir en Recepción de artículos) apenas llega — incluso si el flete, seguro u otros costos aún no se cargaron. Recibir demasiado temprano fija costos de artículo incorrectos.

Este módulo agrega una barrera:

- **`ue_inbound_shipment_gate.js`** (User Event, `beforeLoad`): en `VIEW`, si el check `custrecord_costoscompletos_cmc` **no** está marcado, deshabilita el botón **Recibir** en el servidor (robusto, no se puede saltar desde la UI).
- **`cs_inbound_shipment_gate.js`** (Client Script, `pageInit`): en modo `view`, deshabilita visualmente el mismo botón (`#receive`) para dar retroalimentación inmediata. Es un compañero cosmético del control del lado servidor.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Feature de inventario avanzado / Inbound Shipment habilitada. |
| Feature | **Server SuiteScript** + **Client SuiteScript**. |
| Permiso | Desplegar como Administrador. |
| Módulos | `N/log` (UE). |

### Campo personalizado a crear (ES)

| Campo | Tipo | Aplica a | ID | Propósito |
|---|---|---|---|---|
| Costos completos | Checkbox | Inbound Shipment | `custrecord_costoscompletos_cmc` | Marca que todos los costos (flete, aranceles…) fueron capturados y puede recibirse el envío. |

> El id del campo es una **constante de configuración** al inicio de ambos scripts (`COSTS_COMPLETE_FIELD`). Cambiarla ahí si usas otro id.

## Cómo funciona (ES)

- El check lo marca depósito/contabilidad cuando ya se cargaron todos los costos.
- Mientras está sin marcar: el botón **Recibir** queda deshabilitado del lado servidor (UE) y se grisácea del lado cliente (CS).
- Al marcarlo: la recepción se permite normalmente.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `ue_inbound_shipment_gate.js` | User Event | Control del botón Recibir del lado servidor. |
| `cs_inbound_shipment_gate.js` | Client Script | Deshabilitado cosmético/UX del botón. |

## Guía de implementación paso a paso (ES)

1. **Crear el campo personalizado**
   `Personalización > Listas, registros y campos > Campos de cuerpo de transacción > Nuevo`:
   - **Etiqueta**: `Costos Completos`
   - **ID**: `custrecord_costoscompletos_cmc`
   - **Tipo**: `Checkbox`
   - **Aplica a**: `Inbound Shipment`
   - **Display**: normal. **Store Value**: ✔

2. **Subir** ambos archivos a `File Cabinet > SuiteScripts`.

3. **Crear el User Event script**:
   - **ID**: `customscript_ue_inbound_shipment_gate`, **API Version**: 2.1.
   - **Desplegar**: **Applies To: Inbound Shipment**; **Evento**: `Before Load`; **Status**: Released; **Audience**: All Roles.
   - Deployment ID: `customdeploy_ue_inbound_shipment_gate`.

4. **Crear el Client Script**:
   - **ID**: `customscript_cs_inbound_shipment_gate`, **API Version**: 2.1.
   - **Desplegar**: **Applies To: Inbound Shipment**; **Status**: Released.
   - Deployment ID: `customdeploy_cs_inbound_shipment_gate`.

5. **Probar**:
   - Abrir un Inbound Shipment en modo vista con el check **sin marcar** → el botón **Recibir** queda deshabilitado.
   - Marcar el check, guardar, reabrir → el botón queda habilitado.

## Configuración (ES)

| Constante | Archivo(s) | Default | Propósito |
|---|---|---|---|
| `COSTS_COMPLETE_FIELD` | ambos | `custrecord_costoscompletos_cmc` | id del check "costos completos". |

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
