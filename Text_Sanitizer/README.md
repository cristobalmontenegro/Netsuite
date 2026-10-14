# 🚀 Text Sanitizer for NetSuite

[Español abajo](#sanitizador-de-texto)

Two User Event scripts that normalize free-text fields **before saving**: item/customer/vendor descriptions and address fields are cleaned of line breaks, accents/diacritics and special characters — which prevents malformed data in downstream docs, printouts and integrations (SRI/e-invoicing, PDFs, XML exports).

## Overview (EN)

Free text typed by users ends up with line breaks, `Ñ`, accents, `&`, quotes and symbols. That breaks fixed-format documents, XML/electronic-invoicing payloads and printed layouts. This module sanitizes two kinds of text at the source:

1. **Descriptions** (`ue_sanitize_descriptions.js`)
   - On **Item** records: cleans `salesdescription` and `description`.
   - On **sales transactions** (`Sales Order`, `Item Fulfillment`, `Invoice`, `Credit Memo`): cleans each line's `description`.
2. **Addresses & SRI legal name** (`ue_sanitize_addresses.js`)
   - On **Customer / Vendor**: cleans address subrecord fields (`attention`, `addressee`, `addr1`, `addr2`, `addr3`, `city`).
   - Cleans the **SRI "legal name"** field (Ecuador localization) into an uppercase, accent-free form (hyphens allowed).
   - Disables the address **"override"** checkbox for non-administrators.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account. For the SRI legal-name part, the Ecuador localization field must exist (configurable, see below). |
| Feature | **Server SuiteScript**. |
| Permission | Deploy as Administrator or a role able to modify records. |
| Modules | `N/log`, `N/runtime` (standard). |

## How it works (EN)

- Both scripts run on **`beforeSubmit`** (only `CREATE` / `EDIT`), so the value stored in the database is already sanitized.
- `sanitizeDescription` / `sanitizeAddressText`: collapse line breaks to spaces, strip accents (`Á→A`, `Ñ→N`…), turn `&` into `Y`, remove `.`/`,`, and finally keep only `A-Z a-z 0-9 space # ( ) / -`.
- `sanitizeAddresseeText`: same but **also allows `.`** (useful for `addressee` and `city`).
- `sanitizeRazonSocial`: uppercase + accent-free, hyphens allowed.
- Everything is wrapped in `try/catch` and logged with `N/log`, so a sanitization failure never blocks the save.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `ue_sanitize_descriptions.js` | User Event | Descriptions on items and sales transaction lines. |
| `ue_sanitize_addresses.js` | User Event | Addresses + SRI legal name on Customer/Vendor. |

## Step-by-step implementation (EN)

### A. Descriptions script

1. **Upload** `ue_sanitize_descriptions.js` to `File Cabinet > SuiteScripts`.
2. **Create the Script record**: `Customization > Scripting > Scripts > New` → select the file.
   - **ID**: `customscript_ue_sanitize_descriptions`, **API Version**: 2.1
3. **Deploy** (`Deployments > New`). Because the script differentiates by record type, deploy it to **both**:
   - **Applies To: Item** (all item types you use).
   - **Applies To: Transaction** → `Sales Order`, `Item Fulfillment`, `Invoice`, `Credit Memo`.
   - **Status**: Released. Events: `Create`, `Edit`.
   - Deployment ID: `customdeploy_ue_sanitize_descriptions`.

### B. Addresses / SRI script

1. **Upload** `ue_sanitize_addresses.js`.
2. **Create the Script record**: **ID** `customscript_ue_sanitize_addresses`, **API Version**: 2.1.
3. **Configure** (top of the file):
   - `SRI_LEGAL_NAME_FIELD` → your SRI legal-name field id (default `custentity_ft_lc_nomempsri_ec`). Set to `null` to disable.
   - `ADMIN_ROLE_ID` → role id allowed to use the address *override* checkbox (default `3` = Administrator).
4. **Deploy**: **Applies To: Entity** → `Customer`, `Vendor`. Events: `Create`, `Edit`. Deployment ID `customdeploy_ue_sanitize_addresses`.

## Configuration (EN)

| Constant | File | Default | Purpose |
|---|---|---|---|
| `SRI_LEGAL_NAME_FIELD` | `ue_sanitize_addresses.js` | `custentity_ft_lc_nomempsri_ec` | SRI legal-name field id (or `null`). |
| `ADMIN_ROLE_ID` | `ue_sanitize_addresses.js` | `3` | Role allowed to use address *override*. |

---

# Sanitizador de Texto

Dos scripts de User Event que normalizan campos de texto libre **antes de guardar**: descripciones de artículos/clientes/proveedores y campos de dirección se limpian de saltos de línea, tildes y caracteres especiales — lo que evita datos malformados en documentos posteriores, impresiones e integraciones (SRI/facturación electrónica, PDFs, exportaciones XML).

## Descripción (ES)

El texto libre que escriben los usuarios termina con saltos de línea, `Ñ`, tildes, `&`, comillas y símbolos. Eso rompe documentos de formato fijo, payloads XML/facturación electrónica e impresiones. Este módulo sanea dos tipos de texto en el origen:

1. **Descripciones** (`ue_sanitize_descriptions.js`)
   - En **Artículos**: limpia `salesdescription` y `description`.
   - En **transacciones de venta** (`Sales Order`, `Item Fulfillment`, `Invoice`, `Credit Memo`): limpia el `description` de cada línea.
2. **Direcciones y Razón Social (SRI)** (`ue_sanitize_addresses.js`)
   - En **Cliente / Proveedor**: limpia los campos de la sublista de dirección (`attention`, `addressee`, `addr1`, `addr2`, `addr3`, `city`).
   - Limpia el campo **Razón Social (SRI)** (localización Ecuador) a mayúsculas sin tildes (permite guiones).
   - Deshabilita el check **"override"** de dirección para no-administradores.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta. Para la parte de Razón Social, debe existir el campo de la localización Ecuador (configurable, ver abajo). |
| Feature | **Server SuiteScript**. |
| Permiso | Desplegar como Administrador o un rol con permiso de modificar registros. |
| Módulos | `N/log`, `N/runtime` (estándar). |

## Cómo funciona (ES)

- Ambos scripts corren en **`beforeSubmit`** (solo `CREATE` / `EDIT`), así que el valor que queda en base ya está saneado.
- `sanitizeDescription` / `sanitizeAddressText`: colapsan saltos de línea a espacios, quitan tildes (`Á→A`, `Ñ→N`…), convierten `&` en `Y`, eliminan `.`/`,`, y al final conservan solo `A-Z a-z 0-9 espacio # ( ) / -`.
- `sanitizeAddresseeText`: igual pero **permite `.`** (útil para `addressee` y `city`).
- `sanitizeRazonSocial`: mayúsculas + sin tildes, permitiendo guiones.
- Todo está envuelto en `try/catch` y se registra con `N/log`, de modo que un fallo de saneo nunca bloquea el guardado.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `ue_sanitize_descriptions.js` | User Event | Descripciones en artículos y líneas de transacciones de venta. |
| `ue_sanitize_addresses.js` | User Event | Direcciones + Razón Social (SRI) en Cliente/Proveedor. |

## Guía de implementación paso a paso (ES)

### A. Script de descripciones

1. **Subir** `ue_sanitize_descriptions.js` a `File Cabinet > SuiteScripts`.
2. **Crear el Script record**: `Personalización > Scripting > Scripts > Nuevo` → elegir el archivo.
   - **ID**: `customscript_ue_sanitize_descriptions`, **API Version**: 2.1
3. **Desplegar** (`Deployments > Nuevo`). Como el script distingue por tipo de registro, desplegarlo a **ambos**:
   - **Applies To: Item** (todos los tipos de artículo que uses).
   - **Applies To: Transaction** → `Sales Order`, `Item Fulfillment`, `Invoice`, `Credit Memo`.
   - **Status**: Released. Eventos: `Create`, `Edit`.
   - Deployment ID: `customdeploy_ue_sanitize_descriptions`.

### B. Script de direcciones / SRI

1. **Subir** `ue_sanitize_addresses.js`.
2. **Crear el Script record**: **ID** `customscript_ue_sanitize_addresses`, **API Version**: 2.1.
3. **Configurar** (arriba del archivo):
   - `SRI_LEGAL_NAME_FIELD` → el id de tu campo Razón Social SRI (default `custentity_ft_lc_nomempsri_ec`). Poner `null` para deshabilitar.
   - `ADMIN_ROLE_ID` → id del rol con permiso para usar el check *override* de dirección (default `3` = Administrador).
4. **Desplegar**: **Applies To: Entity** → `Customer`, `Vendor`. Eventos: `Create`, `Edit`. Deployment ID `customdeploy_ue_sanitize_addresses`.

## Configuración (ES)

| Constante | Archivo | Default | Propósito |
|---|---|---|---|
| `SRI_LEGAL_NAME_FIELD` | `ue_sanitize_addresses.js` | `custentity_ft_lc_nomempsri_ec` | id del campo Razón Social SRI (o `null`). |
| `ADMIN_ROLE_ID` | `ue_sanitize_addresses.js` | `3` | Rol autorizado a usar *override* de dirección. |

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
