# 📱 NetSuite Mobile Lite Suite

A comprehensive suite of mobile-optimized Suitelets designed for high-performance field operations. This module provides a unified mobile interface for sales, inventory, and support teams.

[Versión en Español abajo](#versión-en-español-es)

---

## 🔒 Security Model: Token-Based Access

This suite uses a custom **Token-Based Access (TBA)** security model to identify the Employee without requiring standard NetSuite UI login.

### 1. Prerequisite: Create the Entity Field
You must create a custom field to store each employee's unique access token.
1. Navigate to: `Customization > Lists, Records, & Fields > Entity Fields > New`.
2. **Label**: Mobile Access Token
3. **ID**: `_mobile_access_token` (Final ID will be `custentity_mobile_access_token`).
4. **Type**: Free-Form Text.
5. **Applies To**: Check the **Employee** box.
6. **Access Tab**: Ensure the roles using the mobile suite have at least **View** access.

### 2. Token Generation
Generate a random secure string (at least 32 characters) for each user. You can use external tools like [IT-Tools Token Generator](https://it-tools.tech/token-generator). 
- Paste the generated token into the recently created field on the **Employee record**.
- Access URLs will require the parameter `&token=YOUR_TOKEN`.

---

## 📦 Global Deployment Guide

To ensure the navigation menu works across all modules, you **must deploy all scripts** using the specific IDs defined in the centralized library.

### 1. Order of Deployment
1. Upload all files to `File Cabinet > SuiteScripts`.
2. Create and deploy Every Suitelet in the table below.
3. On the **Deployment** tab, set **Audience** to "All Roles" (or your specific sales roles) and **Status** to "Released".

### 2. Mandatory Script ID Mapping
The navigation bar in `lib_menu_movil.js` expects the following IDs. If you change them, you must update the `CONFIG` object in the library.

| Filename | Mandatory Script ID | Purpose |
| :--- | :--- | :--- |
| `Mobile_Visit_SL.js` | `customscript_mobile_visit_sl` | GPS-validated check-in. |
| `Stock_Query_SL.js` | `customscript_mobile_stock_sl` | Real-time multi-location stock. |
| `Order_Entry_SL.js` | `customscript_mobile_order_sl` | Sales Order creation. |
| `Order_Portal_SL.js` | `customscript_mobile_myorders_sl` | Pipeline/Dashboard view. |
| `Order_Tracker_SL.js` | `customscript_mobile_tracker_sl` | Simple search list. |
| `Mobile_Aging_SL.js` | `customscript_mobile_aging_sl` | Customer A/R Aging. |
| `Support_Case_SL.js` | `customscript_mobile_case_sl` | Support/Incident logging. |

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 📱 NetSuite Mobile Lite Suite

Una suite completa de Suitelets optimizados para dispositivos móviles, diseñada para operaciones de campo de alto rendimiento. Proporciona una interfaz móvil unificada para equipos de ventas, inventario y soporte.

---

## 🔒 Modelo de Seguridad: Acceso Basado en Tokens

Esta suite utiliza un modelo de seguridad personalizado de **Acceso Basado en Tokens** para identificar al Empleado sin requerir el inicio de sesión estándar de la interfaz de NetSuite.

### 1. Requisito Previo: Crear el Campo de Entidad
Debe crear un campo personalizado para almacenar el token de acceso único de cada empleado.
1. Navegue a: `Customization > Lists, Records, & Fields > Entity Fields > New`.
2. **Etiqueta**: Mobile Access Token
3. **ID**: `_mobile_access_token` (El ID final será `custentity_mobile_access_token`).
4. **Tipo**: Texto de Formato Libre (Free-Form Text).
5. **Se aplica a (Applies To)**: Marque la casilla **Empleado (Employee)**.
6. **Pestaña de Acceso**: Asegúrese de que los roles que usarán la suite móvil tengan al menos acceso de **Ver (View)**.

### 2. Generación de Tokens
Genere una cadena segura aleatoria (al menos 32 caracteres) para cada usuario. Puede usar herramientas externas como [IT-Tools Token Generator](https://it-tools.tech/token-generator).
- Pegue el token generado en el campo recién creado en el **registro del Empleado**.
- Las URLs de acceso requerirán el parámetro `&token=SU_TOKEN`.

---

## 📦 Guía de Despliegue Global

Para asegurar que el menú de navegación funcione en todos los módulos, **debe desplegar todos los scripts** utilizando los IDs específicos definidos en la librería centralizada.

### 1. Orden de Despliegue
1. Suba todos los archivos a `File Cabinet > SuiteScripts`.
2. Cree y despliegue cada Suitelet de la tabla a continuación.
3. En la pestaña de **Despliegue (Deployment)**, establezca la **Audiencia** en "Todos los Roles" (o sus roles de ventas específicos) y el **Estado** en "Released" (Liberado).

### 2. Mapeo Obligatorio de IDs de Script
La barra de navegación en `lib_menu_movil.js` espera los siguientes IDs. Si los cambia, debe actualizar el objeto `CONFIG` en la librería.

| Archivo | Script ID Obligatorio | Propósito |
| :--- | :--- | :--- |
| `Mobile_Visit_SL.js` | `customscript_mobile_visit_sl` | Registro con validación GPS. |
| `Stock_Query_SL.js` | `customscript_mobile_stock_sl` | Stock multi-ubicación en tiempo real. |
| `Order_Entry_SL.js` | `customscript_mobile_order_sl` | Creación de Órdenes de Venta. |
| `Order_Portal_SL.js` | `customscript_mobile_myorders_sl` | Vista de Pipeline/Dashboard. |
| `Order_Tracker_SL.js` | `customscript_mobile_tracker_sl` | Lista de búsqueda simple. |
| `Mobile_Aging_SL.js` | `customscript_mobile_aging_sl` | Cartera de Clientes (Aging). |
| `Support_Case_SL.js` | `customscript_mobile_case_sl` | Registro de Soporte/Incidentes. |

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
