# Optimized Inventory Kardex for NetSuite

The **Optimized Kardex** is a high-performance inventory traceability solution. Unlike standard NetSuite reports that can time out with large volumes, this module uses a hybrid approach combining pre-calculated historical data with real-time transactional data.

---

## 🇺🇸 English Version

### Purpose
To provide a complete, reliable, and fast "Kardex" (inventory ledger) that includes historical balances, detailed movements, and final balances, with support for Lot/Serial tracking and cost breakdown (unit and total).

### How it Works
1. **Processor (Scheduled Script)**: Periodically takes "archived" data from a standard report and saves it into a Custom Record (`customrecord_kardex_history`). This avoids calculating years of data on every load.
2. **Viewer (Suitelet)**: When requested, it loads the historical data and adds the "live" transactions (usually the last 30 days) from a Web Query, presenting a seamless view to the user.

### Configuration & Parameters
- **Custom Records**: You must create two custom records:
    - `customrecord_kardex_history`: To store processed data.
    - `customrecord_kardex_staging`: Optional, for temporary processing.
- **Suitelet Parameters**:
    - `custscript_kardex_sl_report_url`: The URL of the NetSuite Web Query (HTML) used to fetch live data.
- **Scheduled Parameters**:
    - `custscript_kardex_sch_report_url`: The URL of the report for historical processing.
    - `custscript_kardex_temp_folder`: ID of a File Cabinet folder to store processing state.

### Installation & Deployment
1. **Upload**: Save `Kardex_SL.js` and `Kardex_SCH.js` in the File Cabinet.
2. **Step-by-Step Custom Records Setup**:
    - **A. History Record**:
        - Go to **Customization > Lists, Records, & Fields > Record Types > New**.
        - **Label**: `Kardex History` | **ID**: `_kardex_history`.
        - Create the following fields:
            - `custrecord_kdx_fecha` (Date)
            - `custrecord_kdx_articulo` (List/Record: Item)
            - `custrecord_kdx_articulo_id_txt` (Free-Form Text)
            - `custrecord_kdx_ubicacion` (List/Record: Location)
            - `custrecord_kdx_ubicacion_id_txt` (Free-Form Text)
            - `custrecord_kdx_lote` (Free-Form Text)
            - `custrecord_kdx_cantidad` (Decimal Number)
            - `custrecord_kdx_costo` (Currency)
            - `custrecord_kdx_peso` (Decimal Number)
            - `custrecord_kdx_tipo_trans` (Free-Form Text)
            - `custrecord_kdx_documento` (Free-Form Text)
            - `custrecord_kdx_unidad` (Free-Form Text)
            - `custrecord_kdx_clasificacion` (Free-Form Text)
    - **B. Staging Record**: (Optional but recommended for large volumes)
        - Create a mirror of the History record with ID `_kardex_staging`.
3. **Deploy Scripts**: 
    - Deploy the Suitelet for users to access the report.
    - Deploy the Scheduled script to run daily or weekly to update history.

---

## 🇪🇸 Versión en Español

### Descripción Completa
El **Kardex Optimizado** es una solución de trazabilidad de inventario de alto rendimiento. A diferencia de los reportes estándar de NetSuite que pueden fallar por tiempo de espera con grandes volúmenes, este módulo utiliza un enfoque híbrido que combina datos históricos pre-calculados con datos transaccionales en tiempo real.

### ¿Para qué sirve? (Propósito)
Proveer un "Kardex" (libro auxiliar de inventario) completo, confiable y rápido que incluya saldos iniciales, movimientos detallados y saldos finales, con soporte para rastreo de Lotes/Series y desglose de costos (unitario y total).

### ¿Cuándo usarlo?
Es indispensable para empresas con alto volumen transaccional donde los reportes nativos son lentos o cuando se requiere una visibilidad exacta de saldos históricos por ubicación y lote en una sola vista.

### Guía de Configuración Paso a Paso (Registros)
Para que el sistema funcione, debes crear los siguientes objetos en NetSuite:

1. **Registro de Histórico**:
    - Ve a **Personalización > Listas, registros y campos > Tipos de registros > Nuevo**.
    - **Etiqueta**: `Kardex History` | **ID**: `_kardex_history`.
    - Crea los siguientes campos:
        - `custrecord_kdx_fecha` (Fecha)
        - `custrecord_kdx_articulo` (Lista/Registro: Artículo)
        - `custrecord_kdx_articulo_id_txt` (Texto libre) - *Para optimización de búsqueda*.
        - `custrecord_kdx_ubicacion` (Lista/Registro: Ubicación)
        - `custrecord_kdx_ubicacion_id_txt` (Texto libre)
        - `custrecord_kdx_lote` (Texto libre)
        - `custrecord_kdx_cantidad` (Número decimal)
        - `custrecord_kdx_costo` (Moneda)
        - `custrecord_kdx_peso` (Número decimal)
        - `custrecord_kdx_tipo_trans` (Texto libre)
        - `custrecord_kdx_documento` (Texto libre)
        - `custrecord_kdx_unidad` (Texto libre)
        - `custrecord_kdx_clasificacion` (Texto libre)

2. **Registro de Staging**:
    - Crea un registro similar (espejo) con el ID `_kardex_staging` para el procesamiento intermedio de datos.

### Instalación y Despliegue
1. **Carga**: Sube `Kardex_SL.js` y `Kardex_SCH.js` al File Cabinet.
2. **Desplegar Scripts**:
    - Despliega el Suitelet para acceso de usuario.
    - Despliega el Scheduled script para actualización periódica.
    - Configura la URL del informe de búsqueda guardada (HTML) en los parámetros del script.

---
**Author:** CMC
**Version:** 1.0.0

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
