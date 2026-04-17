# 🛠️ NetSuite Inventory Utilities

A collection of technical maintenance tools designed for Warehouse Administrators and NetSuite Power Users to fix data inconsistencies and reconcile physical stock with system records.

[Versión en Español abajo](#versión-en-español-es)

---

## 🏗️ Featured Tool: Negative Lot Corrector

The `Lot_Correction_SL.js` Suitelet is a specialized utility that identifies and fixes **Item Fulfillments** that were saved with inventory numbers (lots) containing negative stock.

### Use Case:
In high-volume environments, a transaction might occasionally be saved using a lot that has already been depleted, resulting in "Negative Inventory Numbers". This script allows you to re-map those lines to lots with positive availability without deleting the fulfillment.

### 🚀 Deployment & Usage
1. Upload `Lot_Correction_SL.js` to the File Cabinet.
2. Create and deploy a **Suitelet** record.
3. **Usage**:
   - Open the Suitelet URL.
   - Enter the **Internal ID** of the problematic Item Fulfillment.
   - The script will scan the transaction and display lines with negative lots.
   - Select a replacement lot from the dropdown (the script only shows lots with `available > 0`).
   - Click **Submit** to update the transaction subrecord.

---

## 🔒 Permissions Required
- **Transactions**: Item Fulfillment (Edit).
- **Lists**: Inventory Numbers (View).
- **Setup**: Suitelet execution permissions for the specific administrator role.

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 🛠️ Utilidades de Inventario de NetSuite

Una colección de herramientas de mantenimiento técnico diseñadas para Administradores de Almacén y Usuarios Avanzados de NetSuite para corregir inconsistencias de datos y conciliar el stock físico con los registros del sistema.

---

## 🏗️ Herramienta Destacada: Corrector de Lotes Negativos

El Suitelet `Lot_Correction_SL.js` es una utilidad especializada que identifica y corrige **Ejecuciones de Artículos (Item Fulfillments)** que se guardaron con números de inventario (lotes) que contienen stock negativo.

### Caso de Uso:
En entornos de alto volumen, una transacción puede guardarse ocasionalmente utilizando un lote que ya se ha agotado, lo que resulta en "Números de Inventario Negativos". Este script le permite volver a mapear esas líneas a lotes con disponibilidad positiva sin eliminar el cumplimiento.

### 🚀 Despliegue y Uso
1. Suba `Lot_Correction_SL.js` al File Cabinet.
2. Cree y despliegue un registro de **Suitelet**.
3. **Uso**:
   - Abra la URL del Suitelet.
   - Ingrese el **ID Interno** del Item Fulfillment problemático.
   - El script escaneará la transacción y mostrará las líneas con lotes negativos.
   - Seleccione un lote de reemplazo del menú desplegable (el script solo muestra lotes con `disponible > 0`).
   - Haga clic en **Enviar (Submit)** para actualizar el subregistro de la transacción.

---

## 🔒 Permisos Requeridos
- **Transacciones**: Ejecución de Artículo (Editar).
- **Listas**: Números de Inventario (Ver).
- **Configuración**: Permisos de ejecución de Suitelet para el rol de administrador específico.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
