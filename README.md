# 🚀 NetSuite Excellence Suite: Community Edition

A curated collection of professional-grade NetSuite scripts, business modules, and developer tools designed to extend the platform's capabilities beyond standard limits. Built with **SuiteScript 2.1** high-performance patterns.

[Versión en Español abajo](#versión-en-español-es)

---

## 🏗️ Suite Architecture

This repository is organized into independent modules. You can deploy the entire suite or pick specific components based on your business needs.

| Module | Purpose | Key Technology |
| :--- | :--- | :--- |
| [**Mobile Suite**](./Mobile_Suite) | Field force automation & UI optimized for mobile devices. | Suitelet, UI Framework |
| [**File Sync & Backup**](./SFTP_Foundation) | External file synchronization & secure Cloud Backup Bridge. | Restlet, Python Client |
| [**RFM Engine**](./RFM_Engine) | Customer lifecycle segmentation (Recency, Frequency, Monetary). | Scheduled Script, Analytics |
| [**Kardex Optimizado**](./Kardex_Optimizado) | Real-time inventory ledger with advanced indexing. | Scheduled, Suitelet UI |
| [**Inventory Reports**](./Inventory_Reports) | Custom PDF printouts for warehouse operations. | XML/BFO, Rendering |
| [**Accounting Vouchers**](./Accounting_Vouchers) | Printable financial controls & internal vouchers. | PDF Design, FinOps |
| [**Fichas PDF**](./Fichas_PDF) | Item & Customer 360 dossiers. | Document Generation |
| [**Inventory Utilities**](./Inventory_Utilities) | Maintenance tools for quantity/lot reconciliation. | Technical Admin |
| [**Deployment Audit**](./Deployment_Audit) | Audit every Script Deployment: creator, audience, allroles, state. | Suitelet, SuiteQL |
| [**Committed Stock Monitor**](./Committed_Stock_Monitor) | Find what is blocking inventory (committed quantities) in real time. | Suitelet, Search |
| [**Text Sanitizer**](./Text_Sanitizer) | Normalize descriptions & addresses on save (SRI/e-invoicing safe). | User Event |
| [**Reopen Transaction**](./Reopen_Transaction) | Reopen closed transactions the UI blocks. | User Event + Suitelet |
| [**Lock Units Field**](./Lock_Units_Field) | Make the line "Units" field read-only. | Client Script |
| [**Inbound Shipment Gate**](./Inbound_Shipment_Gate) | Require "costs complete" before receiving an Inbound Shipment. | User Event + Client |
| [**Sales Budget Guard**](./Sales_Budget_Guard) | Block duplicate Seller + Period + Classification budgets. | User Event |
| [**Purchase Invoice Comparator**](./Purchase_Invoice_Comparator) | Reconcile received-invoice TXT vs Vendor Bills (access key). | Suitelet |

---

## 🛠️ Global Prerequisites

Before installing any script, ensure your NetSuite instance has the following features enabled:
1. **SuiteScript**: `Setup > Company > Enable Features > SuiteCloud > Client SuiteScript & Server SuiteScript`.
2. **SuiteQL**: Required for advanced reporting modules (Kardex/RFM).
3. **Token-Based Authentication**: Required for API access and mobile authentication.
4. **Custom Fields**: Most modules require specific custom fields (see individual READMEs).

## 📥 Global Installation

General workflow for all modules:
1. **Upload**: Move the contents of the chosen folder to your `File Cabinet > SuiteScripts` directory.
2. **Create Script**: Navigate to `Customization > Scripting > Scripts > New`.
3. **Deploy**: Define the audience, parameters, and event triggers (see script-specific headers).

---

## 👤 Author
**Cristóbal Montenegro**  
Project Lead & Principal Architect  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 🚀 NetSuite Excellence Suite: Edición Comunitaria

Una colección curada de scripts de NetSuite de grado profesional, módulos de negocio y herramientas de desarrollo diseñadas para extender las capacidades de la plataforma más allá de los límites estándar. Construido con patrones de alto rendimiento de **SuiteScript 2.1**.

---

## 🏗️ Arquitectura de la Suite

Este repositorio está organizado en módulos independientes. Puede desplegar la suite completa o elegir componentes específicos según las necesidades de su negocio.

| Módulo | Propósito | Tecnología Clave |
| :--- | :--- | :--- |
| [**Mobile Suite**](./Mobile_Suite) | Automatización de fuerza de ventas y UI optimizada para dispositivos móviles. | Suitelet, UI Framework |
| [**File Sync & Backup**](./SFTP_Foundation) | Sincronización externa de archivos y puente de backup seguro. | Restlet, Cliente Python |
| [**RFM Engine**](./RFM_Engine) | Segmentación de ciclo de vida del cliente (Recency, Frequency, Monetary). | Script Programado, Analytics |
| [**Kardex Optimizado**](./Kardex_Optimizado) | Libro auxiliar de inventarios en tiempo real con indexación avanzada. | Programado, Suitelet UI |
| [**Inventory Reports**](./Inventory_Reports) | Impresiones PDF personalizadas para operaciones de almacén. | XML/BFO, Rendering |
| [**Accounting Vouchers**](./Accounting_Vouchers) | Controles financieros impresos y comprobantes internos. | Diseño PDF, FinOps |
| [**Fichas PDF**](./Fichas_PDF) | Dossiers 360° de Artículos y Clientes. | Generación de Documentos |
| [**Inventory Utilities**](./Inventory_Utilities) | Herramientas de mantenimiento para conciliación de cantidades/lotes. | Adm. Técnica |
| [**Deployment Audit**](./Deployment_Audit) | Audita todos los Script Deployments: creador, audiencia, allroles, estado. | Suitelet, SuiteQL |
| [**Committed Stock Monitor**](./Committed_Stock_Monitor) | Encuentra qué bloquea el inventario (cantidades comprometidas) en vivo. | Suitelet, Búsqueda |
| [**Text Sanitizer**](./Text_Sanitizer) | Normaliza descripciones y direcciones al guardar (seguro para SRI). | User Event |
| [**Reopen Transaction**](./Reopen_Transaction) | Reabre transacciones cerradas que la UI bloquea. | User Event + Suitelet |
| [**Lock Units Field**](./Lock_Units_Field) | Vuelve de solo lectura el campo "Unidades" de la línea. | Client Script |
| [**Inbound Shipment Gate**](./Inbound_Shipment_Gate) | Exige "costos completos" antes de recibir un Inbound Shipment. | User Event + Client |
| [**Sales Budget Guard**](./Sales_Budget_Guard) | Bloquea presupuestos duplicados Vendedor + Período + Clasificación. | User Event |
| [**Purchase Invoice Comparator**](./Purchase_Invoice_Comparator) | Concilia TXT de facturas recibidas vs Vendor Bills (clave de acceso). | Suitelet |

---

## 🛠️ Requisitos Globales Previos

Antes de instalar cualquier script, asegúrese de que su instancia de NetSuite tenga habilitadas las siguientes funciones:
1. **SuiteScript**: `Setup > Company > Enable Features > SuiteCloud > Client SuiteScript & Server SuiteScript`.
2. **SuiteQL**: Requerido para los módulos de reporte avanzado (Kardex/RFM).
3. **Autenticación Basada en Tokens (TBA)**: Requerida para el acceso API y la autenticación móvil.
4. **Campos Personalizados**: La mayoría de los módulos requieren campos personalizados específicos (ver los README individuales).

## 📥 Instalación Global

Flujo de trabajo general para todos los módulos:
1. **Subida**: Mueva los contenidos de la carpeta elegida a su directorio `File Cabinet > SuiteScripts`.
2. **Crear Script**: Navegue a `Customization > Scripting > Scripts > New`.
3. **Despliegue**: Defina la audiencia, parámetros y activadores de eventos (ver encabezados específicos del script).

---

## 👤 Autor
**Cristóbal Montenegro**  
Líder de Proyecto y Arquitecto Principal  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.