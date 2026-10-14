# 📄 NetSuite 360° Data Sheets (PDF)

A set of specialized Suitelets to generate high-quality, printable data sheets for both **Items** and **Customers**. These reports aggregate data from multiple records (Sales, Inventory, Marketing) into a single optimized document.

[Versión en Español abajo](#versión-en-español-es)

---

## 📦 Included Scripts

1. **`Item_DataSheet_SL.js`**: Generates a technical data sheet for Inventory and Assembly items, including current stock, pricing, and key attributes.
2. **`Customer_DataSheet_SL.js`**: Generates a 360° profile of a customer, including aging, recent transactions, and relationship metadata.

---

## 🚀 Deployment Instructions

### 1. Script Setup
1. Upload the chosen `.js` file to your File Cabinet.
2. Create a **Suitelet** script record.
3. Deploy the script with **Status: Released**.

### 2. Integration & Usage
These scripts are designed to be called via URL with a specific record ID.

#### For Items:
- **Parameter**: `item_id`
- **URL Example**: `{SUITELET_URL}&item_id=123`

#### For Customers:
- **Parameter**: `customer_id`
- **URL Example**: `{SUITELET_URL}&customer_id=456`

---

## 🎨 Customization

The PDF generation uses the **XML/BFO** engine. To modify the layout, colors, or displayed fields:
- Locate the `templateContent` string or the XML generation function in the script.
- Modify the CSS and HTML table structures to match your corporate branding.

---

---

## ☕ Support me / Apóyame

**EN:** If any of this was useful, you can buy me a coffee. Thanks for the support!

**ES:** Si te resultó útil, puedes invitarme un café. ¡Gracias por el apoyo!

<p align="center">
  <a href="https://ko-fi.com/cristobalmontenegro" target="_blank">
    <img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" border="0" alt="Buy Me a Coffee at ko-fi.com" />
  </a>
</p>

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 📄 Fichas de Datos NetSuite 360° (PDF)

Un conjunto de Suitelets especializados para generar fichas de datos impresas de alta calidad tanto para **Artículos** como para **Clientes**. Estos reportes agregan datos de múltiples registros (Ventas, Inventario, Marketing) en un solo documento optimizado.

---

## 📦 Scripts Incluidos

1. **`Item_DataSheet_SL.js`**: Genera una ficha técnica para artículos de Inventario y Ensamble, incluyendo stock actual, precios y atributos clave.
2. **`Customer_DataSheet_SL.js`**: Genera un perfil 360° de un cliente, incluyendo cartera (aging), transacciones recientes y metadatos de la relación.

---

## 🚀 Instrucciones de Despliegue

### 1. Configuración del Script
1. Suba el archivo `.js` elegido a su File Cabinet.
2. Cree un registro de script tipo **Suitelet**.
3. Despliegue el script con **Estado: Lanzado (Released)**.

### 2. Integración y Uso
Estos scripts están diseñados para ser invocados a través de una URL con un ID de registro específico.

#### Para Artículos:
- **Parámetro**: `item_id`
- **Ejemplo de URL**: `{SUITELET_URL}&item_id=123`

#### Para Clientes:
- **Parámetro**: `customer_id`
- **Ejemplo de URL**: `{SUITELET_URL}&customer_id=456`

---

## 🎨 Personalización

La generación de PDF utiliza el motor **XML/BFO**. Para modificar el diseño, los colores o los campos mostrados:
- Localice la cadena `templateContent` o la función de generación de XML en el script.
- Modifique las estructuras de las tablas CSS y HTML para que coincidan con su imagen corporativa.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
---

# 📄 📄 NetSuite 360° Data Sheets (PDF) (English)

**🇬🇧 English**

> The full documentation is in Spanish above. This is a brief English summary.

- **Author:** Cristóbal Montenegro ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
- **License:** MIT — see [`LICENSE`](../../LICENSE).
