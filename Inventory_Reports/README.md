# Unified Inventory Reports for NetSuite

The **Unified Inventory Reports** module is a comprehensive printing suite for critical inventory transactions: Item Receipts, Inventory Adjustments, and Inventory Transfers.

---

## 🇺🇸 English Version

### Purpose
To replace standard, rigid NetSuite printouts with professional documents that include detailed cost breakdowns and weight calculations, essential for warehouse operations and financial audits.

### Features
- **3-in-1 Unified Script**: One Suitelet handles all receipt, adjustment, and transfer transaction types.
- **Cost Transparency**: Clearly shows unit rates and total amounts, even for complex transactions.
- **Simplified Weight Logic**: Automates weight accumulation based on Item record specifications.
- **Integrated Design**: The XML/CSS template is embedded in the script for maximum portability.

### Configuration & Parameters
The script `Inventory_Print_SL.js` is designed to be plug-and-play. 
- It detects the transaction type automatically via the `type` URL parameter.
- It uses standard NetSuite field IDs as defaults. If you use custom columns for weights or specific costs, you should update the `extractTransactionData` function.

### Installation & Deployment
1. **Upload**: Save `Inventory_Print_SL.js` in the File Cabinet.
2. **Step-by-Step Item Setup (Weight)**:
    - For weight calculations to work:
    - Go to an **Item Record**.
    - Ensure the **Weight** field (native `weight`) is populated with a numeric value.
    - Set the **Weight Unit** (native `weightunit`) appropriately.
3. **Step-by-Step Button Deployment**:
    - Build a **User Event Script** and apply it to:
        - `Item Receipt`
        - `Inventory Adjustment`
        - `Inventory Transfer`
    - Use the `beforeLoad` function to add a button:
      ```javascript
      let printUrl = url.resolveScript({
          scriptId: 'customscript_your_inventory_print_sl',
          deploymentId: 'customdeploy_your_inventory_print_sl',
          params: { internalid: scriptContext.newRecord.id, type: scriptContext.newRecord.type }
      });
      scriptContext.form.addButton({
          id: 'custpage_print_inventory',
          label: 'Print Unified Report',
          functionName: `window.open('${printUrl}')`
      });
      ```

---

## 🇪🇸 Versión en Español

### Descripción Completa
El módulo de **Reportes de Inventario Unificados** es una suite de impresión integral para transacciones críticas de inventario: Recepciones de Artículos, Ajustes de Inventario y Transferencias de Inventario.

### ¿Para qué sirve? (Propósito)
Reemplazar los formularios impresos rígidos y básicos de NetSuite con documentos profesionales que incluyen desgloses detallados de costos y cálculos de peso, elementos esenciales para operaciones de almacén y auditorías financieras.

### ¿Cuándo usarlo?
Es ideal para almacenes que necesitan un soporte físico de sus movimientos de inventario que muestre no solo cantidades, sino también el valor unitario y total de cada línea, facilitando la conciliación contable.

### Guía de Configuración Paso a Paso (Peso y Botones)

1. **Configuración de Artículos (Peso)**:
    - Para que el cálculo de peso en los reportes sea exacto, asegúrate de que tus registros de artículo tengan configurado el campo **Peso** (nativo: `weight`) y la **Unidad de peso** (nativo: `weightunit`).

2. **Despliegue de Botones en Transacciones**:
    - Crea un script de tipo **User Event**.
    - Asígnalo a los tipos de transacción: `Recepción de artículos`, `Ajuste de inventario` y `Transferencia de inventario`.
    - En el `beforeLoad`, añade el botón que apunte al Suitelet:
      ```javascript
      // La lógica debe pasar el ID interno y el TIPO de transacción:
      const printUrl = url.resolveScript({ 
          scriptId: '...', 
          deploymentId: '...', 
          params: { internalid: rec.id, type: rec.type } 
      });
      ```

### Instalación y Despliegue
1. **Carga**: Sube el archivo `Inventory_Print_SL.js` al File Cabinet.
2. **Registro de Script**: Crea un registro de Suitelet.
3. **Despliegue**: Despliega el Suitelet y anota su ID para usarlo en el botón.

---
**Author:** CMC
**Version:** 1.0.0

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
