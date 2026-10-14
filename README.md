# 🚀 NetSuite Excellence Suite: Community Edition

A curated collection of professional-grade NetSuite scripts, business modules, and developer tools designed to extend the platform's capabilities beyond standard limits. Built with **SuiteScript 2.1** high-performance patterns.

**16 modules · 31 scripts (30 SuiteScript + 1 Python) · 17 guides** — every module ships with its own bilingual README and a step-by-step implementation guide.

[Versión en Español abajo](#versión-en-español-es)

---

## 🏗️ Suite Architecture

This repository is organized into independent modules. You can deploy the entire suite or pick specific components based on your business needs.

| Module | Purpose | Key Technology |
| :--- | :--- | :--- |
| [**Mobile Suite**](./Mobile_Suite) | Field force automation & UI optimized for mobile devices (8 Suitelets). | Suitelet, UI Framework |
| [**File Sync & Backup**](./SFTP_Foundation) | External file synchronization & secure Cloud Backup Bridge. | Restlet, Python Client |
| [**RFM Engine**](./RFM_Engine) | Customer segmentation by 7 behaviour variables (R·F·M·P·Z·G·D), 0–100 score, DuPont index, letter rating. | 3 Scheduled Scripts, Analytics |
| [**Kardex Optimizado**](./Kardex_Optimizado) | Real-time inventory ledger with advanced indexing. | Scheduled, Suitelet UI |
| [**Inventory Reports**](./Inventory_Reports) | Custom PDF printouts for warehouse operations. | XML/BFO, Rendering |
| [**Accounting Vouchers**](./Accounting_Vouchers) | Printable financial controls & internal vouchers. | PDF Design, FinOps |
| [**Fichas PDF**](./Fichas_PDF) | Item & Customer 360 dossiers. | Document Generation |
| [**Inventory Utilities**](./Inventory_Utilities) | Maintenance tools for quantity/lot reconciliation. | Technical Admin |
| [**Deployment Audit**](./Deployment_Audit) | Audit every Script Deployment: creator, audience, allroles, state. | Suitelet, SuiteQL |
| [**Committed Stock Monitor**](./Committed_Stock_Monitor) | Find what is blocking inventory (committed quantities) in real time. | Suitelet, Search |
| [**Text Sanitizer**](./Text_Sanitizer) | Normalize descriptions & addresses on save (e-invoicing safe). | User Event |
| [**Reopen Transaction**](./Reopen_Transaction) | Reopen closed transactions the UI blocks. | User Event + Suitelet |
| [**Lock Units Field**](./Lock_Units_Field) | Make the line "Units" field read-only. | Client Script |
| [**Inbound Shipment Gate**](./Inbound_Shipment_Gate) | Require "costs complete" before receiving an Inbound Shipment. | User Event + Client |
| [**Sales Budget Guard**](./Sales_Budget_Guard) | Block duplicate Seller + Period + Classification budgets. | User Event |
| [**Purchase Invoice Comparator**](./Purchase_Invoice_Comparator) | Reconcile received-invoice TXT vs Vendor Bills (access key). | Suitelet |

---

## 📦 Repository Contents

Everything uploaded to this repository, module by module.

<details>
<summary><b>Automation & Analytics (4 modules)</b></summary>

### [RFM_Engine](./RFM_Engine) — [README](./RFM_Engine/README.md)
| File | Type | Role |
|---|---|---|
| `RFM_Engine_SCH.js` | Scheduled | Calculator: 7 variables + score, one row per customer per week (v16.2) |
| `RFM_Controller_SCH.js` | Scheduled | Backfill driver using a "page marker" date (v4.1) |
| `RFM_Sync_SCH.js` | Scheduled | Writes the latest week onto the Customer record (v3.1) |

### [Kardex_Optimizado](./Kardex_Optimizado) — [README](./Kardex_Optimizado/README.md)
`Kardex_SCH.js` (Scheduled) · `Kardex_SL.js` (Suitelet UI)

### [Deployment_Audit](./Deployment_Audit) — [README](./Deployment_Audit/README.md)
`deployment_audit.js` (Suitelet + SuiteQL)

### [Committed_Stock_Monitor](./Committed_Stock_Monitor) — [README](./Committed_Stock_Monitor/README.md)
`sl_committed_stock_monitor.js` (Suitelet)

</details>

<details>
<summary><b>Mobile & Integration (2 modules)</b></summary>

### [Mobile_Suite](./Mobile_Suite) — [README](./Mobile_Suite/README.md)
`lib_menu_movil.js` (shared lib) · `Mobile_Aging_SL.js` · `Mobile_Visit_SL.js` · `Order_Entry_SL.js` · `Order_Portal_SL.js` · `Order_Tracker_SL.js` · `Stock_Query_SL.js` · `Support_Case_SL.js`

### [SFTP_Foundation](./SFTP_Foundation) — [README](./SFTP_Foundation/README.md)
`RL_FileCabinet_API.js` (Restlet)
└── [Python_Client](./SFTP_Foundation/Python_Client) — [README](./SFTP_Foundation/Python_Client/README.md)
  `netsuite_backup_client.py` · `requirements.txt`

</details>

<details>
<summary><b>Document Generation (3 modules)</b></summary>

### [Fichas_PDF](./Fichas_PDF) — [README](./Fichas_PDF/README.md)
`Customer_DataSheet_SL.js` · `Item_DataSheet_SL.js`

### [Inventory_Reports](./Inventory_Reports) — [README](./Inventory_Reports/README.md)
`Inventory_Print_SL.js`

### [Accounting_Vouchers](./Accounting_Vouchers) — [README](./Accounting_Vouchers/README.md)
`Accounting_Voucher_SL.js`

</details>

<details>
<summary><b>Business Rules & Controls (6 modules)</b></summary>

### [Text_Sanitizer](./Text_Sanitizer) — [README](./Text_Sanitizer/README.md)
`ue_sanitize_descriptions.js` · `ue_sanitize_addresses.js`

### [Reopen_Transaction](./Reopen_Transaction) — [README](./Reopen_Transaction/README.md)
`ue_reopen_button.js` · `sl_force_reopen.js`

### [Lock_Units_Field](./Lock_Units_Field) — [README](./Lock_Units_Field/README.md)
`cs_lock_units_field.js`

### [Inbound_Shipment_Gate](./Inbound_Shipment_Gate) — [README](./Inbound_Shipment_Gate/README.md)
`ue_inbound_shipment_gate.js` · `cs_inbound_shipment_gate.js`

### [Sales_Budget_Guard](./Sales_Budget_Guard) — [README](./Sales_Budget_Guard/README.md)
`ue_sales_budget_duplicate_guard.js`

### [Purchase_Invoice_Comparator](./Purchase_Invoice_Comparator) — [README](./Purchase_Invoice_Comparator/README.md)
`sl_purchase_invoice_comparator.js`

</details>

<details>
<summary><b>Technical Administration (1 module)</b></summary>

### [Inventory_Utilities](./Inventory_Utilities) — [README](./Inventory_Utilities/README.md)
`Lot_Correction_SL.js`

</details>

---

## 🛠️ Global Prerequisites

Not every module needs every feature — check the table below.

| Feature | Needed by | Enabled at |
|---|---|---|
| **Server SuiteScript** | All modules | `Setup > Company > Enable Features > SuiteCloud > Server SuiteScript` |
| **Client SuiteScript** | Mobile Suite, SFTP, and the `_cs_` scripts (Lock Units, Inbound Shipment Gate) | `Setup > Company > Enable Features > SuiteCloud > Client SuiteScript` |
| **SuiteQL** | Kardex, RFM Engine, Deployment Audit | `Setup > Company > Enable Features > SuiteCloud` |
| **Scheduled Scripts** | RFM Engine (3), Kardex | Deployments must be scheduled — see each README |
| **Token-Based Authentication (TBA)** | **Mobile Suite and SFTP Foundation only** — the other modules never call the API | `Setup > Users/Roles > Manage Roles` / Access Tokens |
| **Custom records & fields** | RFM Engine, Mobile Suite, Accounting Vouchers, and most control modules | Per-module README lists every ID to create |

> Each module folder has its own **bilingual README** with the exact records, fields, script parameters and deployment steps. Read it before deploying.

## 📥 Global Installation

General workflow for all modules:
1. **Read the module README** — it lists every custom record, field and parameter you must create first.
2. **Upload**: Copy the module folder into your `File Cabinet > SuiteScripts` directory.
3. **Create Script**: Navigate to `Customization > Scripting > Scripts > New` (API Version **2.1**).
4. **Deploy**: Define the audience, parameters, and event triggers (see script-specific headers).
5. **Schedule** (only for `_SCH` scripts): set the deployment status to `Scheduled`.

---

## 👤 Author
**Cristóbal Montenegro**  
Project Lead & Principal Architect  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 🚀 NetSuite Excellence Suite: Edición Comunitaria

Una colección curada de scripts de NetSuite de grado profesional, módulos de negocio y herramientas de desarrollo diseñadas para extender las capacidades de la plataforma más allá de los límites estándar. Construido con patrones de alto rendimiento de **SuiteScript 2.1**.

**16 módulos · 31 scripts (30 SuiteScript + 1 Python) · 17 guías** — cada módulo incluye su propio README bilingüe y una guía de implementación paso a paso.

---

## 🏗️ Arquitectura de la Suite

Este repositorio está organizado en módulos independientes. Puede desplegar la suite completa o elegir componentes específicos según las necesidades de su negocio.

| Módulo | Propósito | Tecnología Clave |
| :--- | :--- | :--- |
| [**Mobile Suite**](./Mobile_Suite) | Automatización de fuerza de ventas y UI optimizada para dispositivos móviles (8 Suitelets). | Suitelet, UI Framework |
| [**File Sync & Backup**](./SFTP_Foundation) | Sincronización externa de archivos y puente de backup seguro. | Restlet, Cliente Python |
| [**RFM Engine**](./RFM_Engine) | Segmentación de clientes por 7 variables de comportamiento (R·F·M·P·Z·G·D), puntaje 0–100, índice DuPont y calificación por letras. | 3 Scripts Programados, Analytics |
| [**Kardex Optimizado**](./Kardex_Optimizado) | Libro auxiliar de inventarios en tiempo real con indexación avanzada. | Programado, Suitelet UI |
| [**Inventory Reports**](./Inventory_Reports) | Impresiones PDF personalizadas para operaciones de almacén. | XML/BFO, Rendering |
| [**Accounting Vouchers**](./Accounting_Vouchers) | Controles financieros impresos y comprobantes internos. | Diseño PDF, FinOps |
| [**Fichas PDF**](./Fichas_PDF) | Dossiers 360° de Artículos y Clientes. | Generación de Documentos |
| [**Inventory Utilities**](./Inventory_Utilities) | Herramientas de mantenimiento para conciliación de cantidades/lotes. | Adm. Técnica |
| [**Deployment Audit**](./Deployment_Audit) | Audita todos los Script Deployments: creador, audiencia, allroles, estado. | Suitelet, SuiteQL |
| [**Committed Stock Monitor**](./Committed_Stock_Monitor) | Encuentra qué bloquea el inventario (cantidades comprometidas) en vivo. | Suitelet, Búsqueda |
| [**Text Sanitizer**](./Text_Sanitizer) | Normaliza descripciones y direcciones al guardar (seguro para facturación electrónica). | User Event |
| [**Reopen Transaction**](./Reopen_Transaction) | Reabre transacciones cerradas que la UI bloquea. | User Event + Suitelet |
| [**Lock Units Field**](./Lock_Units_Field) | Vuelve de solo lectura el campo "Unidades" de la línea. | Client Script |
| [**Inbound Shipment Gate**](./Inbound_Shipment_Gate) | Exige "costos completos" antes de recibir un Inbound Shipment. | User Event + Client |
| [**Sales Budget Guard**](./Sales_Budget_Guard) | Bloquea presupuestos duplicados Vendedor + Período + Clasificación. | User Event |
| [**Purchase Invoice Comparator**](./Purchase_Invoice_Comparator) | Concilia TXT de facturas recibidas vs Vendor Bills (clave de acceso). | Suitelet |

---

## 📦 Contenido del Repositorio

Todo lo subido a este repositorio, módulo por módulo.

<details>
<summary><b>Automatización y Analítica (4 módulos)</b></summary>

### [RFM_Engine](./RFM_Engine) — [README](./RFM_Engine/README.md)
| Archivo | Tipo | Rol |
|---|---|---|
| `RFM_Engine_SCH.js` | Programado | Calculador: 7 variables + score, una fila por cliente por semana (v16.2) |
| `RFM_Controller_SCH.js` | Programado | Controlador de backfill con "fecha marcador" (v4.1) |
| `RFM_Sync_SCH.js` | Programado | Escribe la última semana en la ficha del Cliente (v3.1) |

### [Kardex_Optimizado](./Kardex_Optimizado) — [README](./Kardex_Optimizado/README.md)
`Kardex_SCH.js` (Programado) · `Kardex_SL.js` (Suitelet UI)

### [Deployment_Audit](./Deployment_Audit) — [README](./Deployment_Audit/README.md)
`deployment_audit.js` (Suitelet + SuiteQL)

### [Committed_Stock_Monitor](./Committed_Stock_Monitor) — [README](./Committed_Stock_Monitor/README.md)
`sl_committed_stock_monitor.js` (Suitelet)

</details>

<details>
<summary><b>Móvil e Integración (2 módulos)</b></summary>

### [Mobile_Suite](./Mobile_Suite) — [README](./Mobile_Suite/README.md)
`lib_menu_movil.js` (librería compartida) · `Mobile_Aging_SL.js` · `Mobile_Visit_SL.js` · `Order_Entry_SL.js` · `Order_Portal_SL.js` · `Order_Tracker_SL.js` · `Stock_Query_SL.js` · `Support_Case_SL.js`

### [SFTP_Foundation](./SFTP_Foundation) — [README](./SFTP_Foundation/README.md)
`RL_FileCabinet_API.js` (Restlet)
└── [Python_Client](./SFTP_Foundation/Python_Client) — [README](./SFTP_Foundation/Python_Client/README.md)
  `netsuite_backup_client.py` · `requirements.txt`

</details>

<details>
<summary><b>Generación de Documentos (3 módulos)</b></summary>

### [Fichas_PDF](./Fichas_PDF) — [README](./Fichas_PDF/README.md)
`Customer_DataSheet_SL.js` · `Item_DataSheet_SL.js`

### [Inventory_Reports](./Inventory_Reports) — [README](./Inventory_Reports/README.md)
`Inventory_Print_SL.js`

### [Accounting_Vouchers](./Accounting_Vouchers) — [README](./Accounting_Vouchers/README.md)
`Accounting_Voucher_SL.js`

</details>

<details>
<summary><b>Reglas de Negocio y Controles (6 módulos)</b></summary>

### [Text_Sanitizer](./Text_Sanitizer) — [README](./Text_Sanitizer/README.md)
`ue_sanitize_descriptions.js` · `ue_sanitize_addresses.js`

### [Reopen_Transaction](./Reopen_Transaction) — [README](./Reopen_Transaction/README.md)
`ue_reopen_button.js` · `sl_force_reopen.js`

### [Lock_Units_Field](./Lock_Units_Field) — [README](./Lock_Units_Field/README.md)
`cs_lock_units_field.js`

### [Inbound_Shipment_Gate](./Inbound_Shipment_Gate) — [README](./Inbound_Shipment_Gate/README.md)
`ue_inbound_shipment_gate.js` · `cs_inbound_shipment_gate.js`

### [Sales_Budget_Guard](./Sales_Budget_Guard) — [README](./Sales_Budget_Guard/README.md)
`ue_sales_budget_duplicate_guard.js`

### [Purchase_Invoice_Comparator](./Purchase_Invoice_Comparator) — [README](./Purchase_Invoice_Comparator/README.md)
`sl_purchase_invoice_comparator.js`

</details>

<details>
<summary><b>Administración Técnica (1 módulo)</b></summary>

### [Inventory_Utilities](./Inventory_Utilities) — [README](./Inventory_Utilities/README.md)
`Lot_Correction_SL.js`

</details>

---

## 🛠️ Requisitos Globales Previos

No todos los módulos necesitan todas las funciones — revise la tabla.

| Función | Requerida por | Se habilita en |
|---|---|---|
| **Server SuiteScript** | Todos los módulos | `Setup > Company > Enable Features > SuiteCloud > Server SuiteScript` |
| **Client SuiteScript** | Mobile Suite, SFTP y los scripts `_cs_` (Lock Units, Inbound Shipment Gate) | `Setup > Company > Enable Features > SuiteCloud > Client SuiteScript` |
| **SuiteQL** | Kardex, RFM Engine, Deployment Audit | `Setup > Company > Enable Features > SuiteCloud` |
| **Scripts Programados** | RFM Engine (3), Kardex | Los despliegues deben programarse — ver cada README |
| **Autenticación Basada en Tokens (TBA)** | **Solo Mobile Suite y SFTP Foundation** — los demás módulos nunca llaman a la API | `Setup > Users/Roles > Manage Roles` / Access Tokens |
| **Registros y campos personalizados** | RFM Engine, Mobile Suite, Accounting Vouchers y la mayoría de los módulos de control | Cada README lista todos los IDs a crear |

> Cada carpeta de módulo incluye su propio **README bilingüe** con los registros, campos, parámetros de script y pasos de despliegue exactos. Léalo antes de desplegar.

## 📥 Instalación Global

Flujo de trabajo general para todos los módulos:
1. **Leer el README del módulo** — lista cada registro personalizado, campo y parámetro que debe crear primero.
2. **Subir**: Copie la carpeta del módulo a su directorio `File Cabinet > SuiteScripts`.
3. **Crear Script**: Navegue a `Customization > Scripting > Scripts > New` (API Version **2.1**).
4. **Despliegue**: Defina la audiencia, parámetros y activadores de eventos (ver encabezados específicos del script).
5. **Programar** (solo para scripts `_SCH`): ponga el estado del despliegue en `Scheduled`.

---

## 👤 Autor
**Cristóbal Montenegro**  
Líder de Proyecto y Arquitecto Principal  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
