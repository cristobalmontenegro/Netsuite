# Committed Stock Monitor for NetSuite

[Español abajo](#monitor-de-stock-comprometido)

A Suitelet dashboard that lists **every transaction currently committing stock** (`quantity committed > 0`), so you can find what is blocking inventory in real time — the root causes of a "stock rupture" (a product showing available stock but already promised to an unfulfilled order).

## Overview (EN)

When a warehouse says "there is no stock" but the item card shows quantity available, the cause is usually **committed inventory**: sales orders, fulfillments, work orders or transfers that hold quantity without having shipped. Finding those documents one by one is slow.

This Suitelet shows them all in one filterable list.

**Use cases**

- Inventory control: see everything holding stock right now.
- Sales support: check whether a customer's order can be fulfilled.
- Root-cause analysis of stock ruptures.
- Periodic operational review by item.

**What it does**

- Searches `Transaction` filtered by `mainline = F`, `quantitycommitted > 0`, excluding `COGS` and tax lines.
- Optional free-text filter by item (contains).
- Renders an HTML list with: item, document (clickable link that opens the transaction in a new tab), transaction type, status, committed quantity and document date.
- The search runs server-side and the link is built with `url.resolveRecord`, so it always points to the right record type/id.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Multi-location / advanced inventory (recommended), or any account with inventory items. |
| Feature | **Server SuiteScript** + **Client SuiteScript** not required (pure server). SuiteQL not required. |
| Permission | Role must be able to run Suitelets and view transactions/inventory. |
| Modules | `N/search`, `N/ui/serverWidget`, `N/url`, `N/redirect`, `N/runtime`, `N/log` (all standard). |

No custom fields, custom records or script parameters are required.

## How it works (EN)

- **GET**: builds a `serverWidget` form with a list sublist and one text filter, runs a `search.Type.TRANSACTION` search and fills the rows. The document column is a `TEXTAREA` field set to `INLINE`, which lets the script render an HTML `<a target="_blank">` link inside the cell.
- **POST** (the *Search* button): re-directs to the same Suitelet (`redirect.toSuitelet` with the current script/deployment) passing `custpage_filter_text`, which produces a clean GET URL and keeps the filter visible. This avoids `NET_SUBMIT` warnings and duplicate-post issues.

Search filters:

| Filter | Value |
|---|---|
| `mainline` | `F` (lines only) |
| `quantitycommitted` | `greaterthan 0` |
| `cogs` | `F` (exclude COGS lines) |
| `taxline` | `F` (exclude tax lines) |
| `formulatext: {item}` | optional, `contains <text>` |

## Files (EN)

| File | Type | Description |
|---|---|---|
| `sl_committed_stock_monitor.js` | Suitelet | The dashboard. |

## Step-by-step implementation (EN)

1. **Upload** `sl_committed_stock_monitor.js` to `File Cabinet > SuiteScripts`.
2. **Create the Script record**: `Customization > Scripting > Scripts > New` → select the file.
   - **Name**: `Committed Stock Monitor`
   - **ID**: `customscript_committed_stock_monitor`
   - **API Version**: 2.1
3. **Deploy**: `Deployments > New` → **Applies To**: your roles (e.g. *All Roles* or a Warehouse/Inventory role) → **Status**: Released → Deployment ID `customdeploy_committed_stock_monitor`.
4. **Open** the deployment's **External URL** and use the *Buscar Artículo* box to filter.

---

# Monitor de Stock Comprometido

Un panel (Suitelet) que lista **todas las transacciones que están comprometiendo stock en este momento** (`cantidad comprometida > 0`), para encontrar qué está bloqueando el inventario en vivo — las causas raíz de una "ruptura de stock".

## Descripción (ES)

Cuando el depósito dice "no hay stock" pero la ficha del artículo muestra cantidad disponible, la causa suele ser el **inventario comprometido**: pedidos de venta, entregas, órdenes de trabajo o transferencias que retienen cantidad sin haber despachado. Buscarlos de a uno es lento.

Este Suitelet los muestra todos en una lista filtrable.

**Casos de uso**

- Control de inventario: ver todo lo que retiene stock ahora mismo.
- Soporte a ventas: verificar si el pedido de un cliente se puede cumplir.
- Análisis de causa raíz de rupturas de stock.
- Revisión operativa periódica por artículo.

**Qué hace**

- Busca en `Transaction` filtrando por `mainline = F`, `quantitycommitted > 0`, excluyendo líneas de `COGS` e impuestos.
- Filtro de texto libre opcional por artículo (contiene).
- Muestra una lista HTML con: artículo, documento (enlace clickeable que abre la transacción en pestaña nueva), tipo de transacción, estado, cantidad comprometida y fecha del documento.
- La búsqueda corre en el servidor y el enlace se arma con `url.resolveRecord`, por lo que siempre apunta al tipo/id correcto.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Multiubicación/inventario avanzado (recomendado), o cualquier cuenta con artículos de inventario. |
| Feature | **Server SuiteScript**. No requiere Client SuiteScript ni SuiteQL. |
| Permiso | El rol debe poder ejecutar Suitelets y ver transacciones/inventario. |
| Módulos | `N/search`, `N/ui/serverWidget`, `N/url`, `N/redirect`, `N/runtime`, `N/log` (todos estándar). |

No requiere campos personalizados, registros custom ni parámetros de script.

## Cómo funciona (ES)

- **GET**: arma un formulario `serverWidget` con sublista tipo list y un campo de filtro, ejecuta una búsqueda `search.Type.TRANSACTION` y llena las filas. La columna del documento es un campo `TEXTAREA` en modo `INLINE`, lo que permite renderizar un enlace HTML `<a target="_blank">` dentro de la celda.
- **POST** (botón *Buscar*): redirige al mismo Suitelet (`redirect.toSuitelet` con el script/deployment actual) pasando `custpage_filter_text`, generando una URL GET limpia y manteniendo el filtro visible. Evita avisos de reenvío y problemas de doble POST.

Filtros de la búsqueda:

| Filtro | Valor |
|---|---|
| `mainline` | `F` (solo líneas) |
| `quantitycommitted` | `greaterthan 0` |
| `cogs` | `F` (excluye líneas de costo) |
| `taxline` | `F` (excluye impuestos) |
| `formulatext: {item}` | opcional, `contains <texto>` |

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `sl_committed_stock_monitor.js` | Suitelet | El panel. |

## Guía de implementación paso a paso (ES)

1. **Subir** `sl_committed_stock_monitor.js` a `File Cabinet > SuiteScripts`.
2. **Crear el Script record**: `Personalización > Scripting > Scripts > Nuevo` → elegir el archivo.
   - **Nombre**: `Committed Stock Monitor`
   - **ID**: `customscript_committed_stock_monitor`
   - **API Version**: 2.1
3. **Desplegar**: `Deployments > Nuevo` → **Applies To**: tus roles (p. ej. *All Roles* o un rol de Depósito/Inventario) → **Status**: Released → Deployment ID `customdeploy_committed_stock_monitor`.
4. **Abrir** la **External URL** del deployment y usar el campo *Buscar Artículo* para filtrar.

---

## 👤 Author / Autoría

**Cristóbal Montenegro** — https://github.com/cristobalmontenegro

## 📜 License / Licencia

MIT — see [`LICENSE`](../LICENSE).
