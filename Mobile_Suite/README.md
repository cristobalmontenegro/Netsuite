# 📱 NetSuite Mobile Lite Suite

A comprehensive suit of mobile-optimized tools for sales and field teams.

[Versión en Español abajo](#versión-en-español)

---

## 📋 Included Modules
1.  **Mobile Visit Registration**: GPS-validated visit entry.
2.  **Product Stock Query**: Multi-location inventory check.
3.  **Mobile Order Entry**: Field sales order creation.
4.  **Order Portal (Advanced)**: Dashboard for reps to track their order pipeline (Approvals, Shipments, Billing, Collection).
5.  **Order Tracker (Simple)**: Linear list view of orders.
6.  **Customer Aging Report**: SuiteQL-powered accounts receivable.
7.  **Support Case Entry**: PQR/Incident reporting linked to invoices.

---

## 🔒 Security & Configuration
All scripts utilize the **Token-Based Access** model via the `custentity_mobile_access_token` field on the Employee record.

### Order Portal Setup:
The **Order Portal** (`Order_Portal_SL.js`) provides a visual pipeline for sales representatives.
- **Statuses**: It uses standard NetSuite status internal IDs (`pendingApproval`, `pendingFulfillment`, etc.) to show progress tags.
- **Filtering**: Allows searching by customer name or transaction ID, and filtering by pipeline stage.

---

# Versión en Español

## 📋 Módulos Incluidos
1.  **Registro de Visitas**: Registro con validación de geolocalización.
2.  **Consulta de Stock**: Inventario en tiempo real.
3.  **Creación de Pedidos**: Ingreso de ventas en campo.
4.  **Portal de Pedidos (Avanzado)**: Dashboard visual para que el vendedor rastree el progreso de sus pedidos (Aprobación -> Despacho -> Facturación -> Cobro).
5.  **Rastreador de Pedidos (Simple)**: Vista de lista lineal de órdenes.
6.  **Reporte de Cartera**: Análisis de deudas mediante SuiteQL.
7.  **Creación de Casos**: Reporte de incidentes/PQR.

### Configuración del Portal de Pedidos:
El portal utiliza los estados nativos de NetSuite para mostrar el progreso. Si su empresa utiliza flujos de trabajo personalizados, puede ajustar el objeto `CONFIG` al inicio del script para mapear sus IDs internos de estado.

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
