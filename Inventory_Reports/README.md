# 📦 NetSuite Inventory Reports (Custom Printing)

This module provides a unified PDF generator for inventory-related transactions. It allows for advanced formatting and calculations (like automatic weight summation) that are difficult to achieve with standard Advanced PDF/HTML templates.

[Versión en Español abajo](#versión-en-español-es)

---

## 🚀 Deployment Instructions

### 1. Script Setup
1. Upload `Inventory_Print_SL.js` to the File Cabinet.
2. Create a **Suitelet** script record.
3. Deploy the script with **Status: Released**.
4. Set the **Audience** to the roles that need to generate these reports.

### 2. Integration (How to trigger)
Since this is a Suitelet, it requires parameters to know what to print. You can trigger it by:
- Creating a **User Event** script that adds a "Print Custom" button to the desired records.
- The button should redirect to:
  `{SUITELET_URL}&internalid={RECORD_ID}&type={RECORD_TYPE}`

---

## 🛠️ Supported Transactions

The script is pre-configured to handle:
- **Item Receipts** (`itemreceipt`)
- **Inventory Adjustments** (`inventoryadjustment`)
- **Inventory Transfers** (`inventorytransfer`)

### Automatic Weight Calculation:
To use this feature, ensure your Items have a value in the standard **Weight** field. The script will automatically aggregate weights for the entire transaction.

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 📦 Reportes de Inventario de NetSuite (Impresión Personalizada)

Este módulo proporciona un generador de PDF unificado para transacciones relacionadas con el inventario. Permite formatos avanzados y cálculos (como la suma automática de pesos) que son difíciles de lograr con las plantillas estándar de Advanced PDF/HTML.

---

## 🚀 Instrucciones de Despliegue

### 1. Configuración del Script
1. Suba `Inventory_Print_SL.js` al File Cabinet.
2. Cree un registro de script tipo **Suitelet**.
3. Despliegue el script con **Estado: Lanzado (Released)**.
4. Establezca la **Audiencia** para los roles que necesitan generar estos reportes.

### 2. Integración (Cómo activarlo)
Dado que este es un Suitelet, requiere parámetros para saber qué imprimir. Puede activarlo:
- Creando un script de **User Event** que agregue un botón "Imprimir Personalizado" a los registros deseados.
- El botón debe redireccionar a:
  `{SUITELET_URL}&internalid={RECORD_ID}&type={RECORD_TYPE}`

---

## 🛠️ Transacciones Soportadas

El script está preconfigurado para manejar:
- **Recepciones de Artículos** (`itemreceipt`)
- **Ajustes de Inventario** (`inventoryadjustment`)
- **Transferencias de Inventario** (`inventorytransfer`)

### Cálculo Automático de Peso:
Para usar esta función, asegúrese de que sus Artículos tengan un valor en el campo estándar de **Peso (Weight)**. El script agregará automáticamente los pesos de toda la transacción.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
