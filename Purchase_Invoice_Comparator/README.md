# 🚀 Purchase Invoice Comparator for NetSuite

[Español abajo](#comparador-de-facturas-de-compra)

A Suitelet to which you upload the **received-invoices TXT** exported from the tax authority portal, and it tells you **which of those invoices are still missing in NetSuite** — matched by electronic access key (authorization number) against every Vendor Bill already registered.

## Overview (EN)

Accounts payable receives a periodic list of invoices issued by suppliers (from the tax authority). Manually checking each one against NetSuite to see whether it was already entered is slow and error-prone. This Suitelet automates the reconciliation:

1. User uploads the TXT (tab-separated export of received invoices).
2. The script reads **all** access keys already present on Vendor Bills (`mainline = T`, field not empty).
3. It compares: any access key in the TXT that is **not** in NetSuite is listed as missing.
4. Results are shown in a table (RUC, legal name, series, issue date, total, access key).

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account. Ecuador/electronic-invoicing use case. |
| Feature | **Server SuiteScript**. |
| Permission | Role able to run Suitelets and read Vendor Bills. |
| Modules | `N/ui/serverWidget`, `N/search`, `N/file`, `N/log`, `N/ui/message` (standard). |

### Field to have (EN)

The script reads the electronic access key from a Vendor Bill body field:

| Field | Type | Applies To | ID (default) | Notes |
|---|---|---|---|---|
| Access key / Authorization | Free-Text | Vendor Bill | `custbody_ft_fe_numaut_ec` | Standard in the Ecuador localization. Configure via `AUTH_CODE_FIELD`. |

> The field id and the TXT column index are **configuration constants** at the top of the script (`AUTH_CODE_FIELD`, `TXT_ACCESS_KEY_COLUMN`).

### Expected TXT format (EN)

Tab-separated, **one header line** then data. Columns used (0-based):

| Index | Content |
|---|---|
| 0 | Emitter RUC |
| 1 | Legal name |
| 2 | Document type |
| 3 | Series |
| **4** | **Electronic access key** |
| 6 | Issue date |
| 10 | Total amount |

## How it works (EN)

- **GET**: renders the upload form.
- **POST**:
  1. Runs a `VENDOR_BILL` search with `mainline = T` and `AUTH_CODE_FIELD isnotempty`, paginated (1000/page), collecting all access keys into a `Set`.
  2. Splits the uploaded TXT by `\n`, skips the header, splits each line by `\t`, takes `columns[TXT_ACCESS_KEY_COLUMN]` as the key (deduplicated).
  3. Keys not found in NetSuite become the "missing" list, rendered in a sublist.
- Failures are reported as an `N/ui/message` error (e.g. wrong field id) instead of throwing.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `sl_purchase_invoice_comparator.js` | Suitelet | Upload form + comparison + results. |

## Step-by-step implementation (EN)

1. **Confirm the access-key field** on Vendor Bill (`custbody_...`). If your id differs, update `AUTH_CODE_FIELD` at the top of the script.

2. **Upload** `sl_purchase_invoice_comparator.js` to `File Cabinet > SuiteScripts`.

3. **Create the Script record**: `Customization > Scripting > Scripts > New` → select the file.
   - **Name**: `Purchase Invoice Comparator`
   - **ID**: `customscript_sl_purchase_invoice_comparator`
   - **API Version**: 2.1

4. **Deploy**: `Deployments > New` → **Applies To: Role** → Accounts Payable / Administration → **Status**: Released.
   Deployment ID: `customdeploy_sl_purchase_invoice_comparator`.

5. **Use it**: open the deployment's **External URL**, choose the TXT, press **Compare Files**. The table lists invoices pending entry (empty result = everything already registered).

## Configuration (EN)

| Constant | Default | Purpose |
|---|---|---|
| `AUTH_CODE_FIELD` | `custbody_ft_fe_numaut_ec` | Vendor Bill body field with the access key. |
| `TXT_ACCESS_KEY_COLUMN` | `4` | Zero-based column index of the access key in the TXT. |

---

# Comparador de Facturas de Compra

Un Suitelet al que subes el **TXT de comprobantes recibidos** exportado del portal del fisco, y te dice **cuáles de esas facturas aún faltan registrar en NetSuite** — comparando por clave de acceso electrónica (número de autorización) contra todas las facturas de compra (Vendor Bills) ya registradas.

## Descripción (ES)

Cuentas por pagar recibe periódicamente una lista de facturas emitidas por proveedores (del fisco). Verificar a mano una por una contra NetSuite para saber si ya se ingresó es lento y propenso a errores. Este Suitelet automatiza la conciliación:

1. El usuario sube el TXT (export tabulado de comprobantes recibidos).
2. El script lee **todas** las claves de acceso ya presentes en las Vendor Bills (`mainline = T`, campo no vacío).
3. Compara: cualquier clave del TXT que **no** esté en NetSuite se lista como faltante.
4. Muestra los resultados en una tabla (RUC, razón social, serie, fecha de emisión, total, clave de acceso).

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta. Caso de uso Ecuador/facturación electrónica. |
| Feature | **Server SuiteScript**. |
| Permiso | Rol que pueda ejecutar Suitelets y leer Vendor Bills. |
| Módulos | `N/ui/serverWidget`, `N/search`, `N/file`, `N/log`, `N/ui/message` (estándar). |

### Campo requerido (ES)

El script lee la clave de acceso desde un campo de cuerpo de la Vendor Bill:

| Campo | Tipo | Aplica a | ID (default) | Notas |
|---|---|---|---|---|
| Clave de acceso / Autorización | Texto libre | Vendor Bill | `custbody_ft_fe_numaut_ec` | Estándar en la localización Ecuador. Configurable vía `AUTH_CODE_FIELD`. |

> El id del campo y el índice de columna del TXT son **constantes de configuración** al inicio del script (`AUTH_CODE_FIELD`, `TXT_ACCESS_KEY_COLUMN`).

### Formato esperado del TXT (ES)

Tabulado, **una línea de encabezado** y luego datos. Columnas usadas (base 0):

| Índice | Contenido |
|---|---|
| 0 | RUC del emisor |
| 1 | Razón social |
| 2 | Tipo de documento |
| 3 | Serie |
| **4** | **Clave de acceso electrónica** |
| 6 | Fecha de emisión |
| 10 | Importe total |

## Cómo funciona (ES)

- **GET**: muestra el formulario de subida.
- **POST**:
  1. Ejecuta una búsqueda `VENDOR_BILL` con `mainline = T` y `AUTH_CODE_FIELD isnotempty`, paginada (1000/página), juntando todas las claves en un `Set`.
  2. Separa el TXT subido por `\n`, salta el encabezado, separa cada línea por `\t`, toma `columns[TXT_ACCESS_KEY_COLUMN]` como clave (sin duplicados).
  3. Las claves que no están en NetSuite forman la lista de "faltantes", mostrada en una sublista.
- Los errores se reportan como mensaje `N/ui/message` (p. ej. id de campo incorrecto) en lugar de lanzar excepción.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `sl_purchase_invoice_comparator.js` | Suitelet | Formulario + comparación + resultados. |

## Guía de implementación paso a paso (ES)

1. **Confirmar el campo de clave de acceso** en la Vendor Bill (`custbody_...`). Si tu id difiere, actualizar `AUTH_CODE_FIELD` al inicio del script.

2. **Subir** `sl_purchase_invoice_comparator.js` a `File Cabinet > SuiteScripts`.

3. **Crear el Script record**: `Personalización > Scripting > Scripts > Nuevo` → elegir el archivo.
   - **Nombre**: `Purchase Invoice Comparator`
   - **ID**: `customscript_sl_purchase_invoice_comparator`
   - **API Version**: 2.1

4. **Desplegar**: `Deployments > Nuevo` → **Applies To: Role** → Cuentas por Pagar / Administración → **Status**: Released.
   Deployment ID: `customdeploy_sl_purchase_invoice_comparator`.

5. **Usarlo**: abrir la **External URL** del deployment, elegir el TXT, presionar **Comparar Archivos**. La tabla lista las facturas pendientes de ingreso (resultado vacío = todo ya registrado).

## Configuración (ES)

| Constante | Default | Propósito |
|---|---|---|
| `AUTH_CODE_FIELD` | `custbody_ft_fe_numaut_ec` | Campo de cuerpo de la Vendor Bill con la clave de acceso. |
| `TXT_ACCESS_KEY_COLUMN` | `4` | Índice (base 0) de la columna de la clave en el TXT. |

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
