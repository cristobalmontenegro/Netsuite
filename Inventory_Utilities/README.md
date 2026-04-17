# 🛠️ NetSuite Power Utilities

A collection of technical scripts to solve complex NetSuite operational issues, including inventory data integrity and external file system automation.

[Versión en Español abajo](#versión-en-español)

## 📁 Modules Included

### 1. SFTP Foundation (File Cabinet API)
A high-performance RESTlet that serves as an RPC-style API for the NetSuite File Cabinet. 
- **Use Case**: Integrate with local SFTP backup scripts, external document management systems, or ETL tools.
- **Key Functions**: `fileCreate`, `fileGet`, `folderCreate`, `suiteQLRun`.

### 2. Inventory Lot Corrector
A technical Suitelet designed to fix Item Fulfillments that have "frozen" or incorrect lot assignments (e.g., negative inventory lots).
- **Use Case**: When a script or import bypasses standard inventory validations and creates lot discrepancies.
- **How it works**: Analyzes a specific Fulfillment ID, identifies negative lot balances, and allows the user to re-assign a positive-stock lot in real-time.

---

## 🚀 Installation

### SFTP Foundation:
1. Deploy `RL_FileCabinet_API.js` as a Restlet.
2. Use OAuth 1.0 or OAuth 2.0 (M2M) for secure external authentication.
3. Call the RESTlet with a JSON body specifying the `function` and parameters.

### Lot Corrector:
1. Deploy `Lot_Correction_SL.js` as a Suitelet.
2. Access the Suitelet URL and provide the `fulfillment_id` parameter to start the correction wizard.

---

# Versión en Español

## 🛠️ Utilidades de Poder para NetSuite

Colección de scripts técnicos para resolver problemas operativos complejos, incluyendo la integridad de datos de inventario y la automatización de archivos externos.

## 📁 Módulos Incluidos

### 1. SFTP Foundation (API de Gabinete de Archivos)
Un RESTlet de alto rendimiento que sirve como API RPC para el gabinete de archivos de NetSuite.
- **Uso**: Integración con scripts de respaldo SFTP locales, sistemas de gestión documental externos o herramientas ETL.

### 2. Corrector de Lotes de Inventario
Un Suitelet técnico diseñado para corregir Ejecuciones de Artículos (Item Fulfillments) con asignaciones de lotes erróneas o negativas.
- **Uso**: Cuando una importación o script se salta las validaciones nativas y crea discrepancias en los lotes.
- **Funcionamiento**: Analiza una transacción específica, detecta saldos negativos de lotes y permite al usuario reasignar lotes con stock positivo en tiempo real.

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
