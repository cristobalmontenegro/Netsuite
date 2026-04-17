# Master DataSheets (PDF) for NetSuite

The **Master DataSheets** module provides professional PDF generation for both Items and Customers/Entities. These documents are ideal for technical catalogs, internal audits, and master data management.

---

## 🇺🇸 English Version

### Purpose
To generate clean, professional, and customizable data sheets in PDF format. It solves the problem of NetSuite's basic "Print" functionality by offering a layout designed for technical and commercial use.

### Features
- **Field Mapping**: Easy configuration to map your custom fields without touching the XML/CSS logic.
- **Barcodes**: Integrated support for Code128 barcodes (e.g., UPC/EAN).
- **Embedded Templates**: No external files needed; the design is fully contained within the script.
- **HTML Support**: Correctly renders rich-text/HTML descriptions into the PDF.

### Configuration & Parameters
Both scripts (`Item_DataSheet_SL.js` and `Customer_DataSheet_SL.js`) include a `FIELD_MAPPING` object at the top. 
- You must edit these objects with your custom field IDs (e.g., `custitem_brand`, `custentity_id_number`).
- No external parameters are required on the script record itself.

### Installation & Deployment
1. **Upload**: Save the scripts in the File Cabinet.
2. **Setup Script Record**: Create a Suitelet script record for each.
3. **Step-by-Step Button Deployment (User Event)**:
    - To add the "Print" button to the record:
    - Create a new **User Event Script** for the Item (or Customer) record.
    - In the `beforeLoad` function, add the following logic:
      ```javascript
      if (scriptContext.type === scriptContext.UserEventType.VIEW) {
          let suiteletUrl = url.resolveScript({
              scriptId: 'customscript_your_suitelet_id',
              deploymentId: 'customdeploy_your_suitelet_deploy',
              params: { id: scriptContext.newRecord.id }
          });
          scriptContext.form.addButton({
              id: 'custpage_print_datasheet',
              label: 'Print DataSheet',
              functionName: `window.open('${suiteletUrl}')`
          });
      }
      ```
4. **Alternative (Workflow)**: Use a "Button" action in a workflow that executes a "Go to Record" or "Window Open" pointing to the Suitelet URL.

---

## 🇪🇸 Versión en Español

### Descripción Completa
El módulo de **Fichas Maestras** permite la generación de documentos PDF profesionales para Artículos y Clientes/Entidades. Estos documentos son ideales para catálogos técnicos, auditorías internas y gestión de datos maestros.

### ¿Para qué sirve? (Propósito)
Generar fichas de datos limpias, profesionales y personalizables. Soluciona la limitación de la función básica de "Imprimir" de NetSuite, ofreciendo un diseño estructurado para uso técnico y comercial.

### ¿Cuándo usarlo?
Cuando necesites enviar especificaciones técnicas de productos a clientes, realizar auditorías de maestros de clientes o tener documentos físicos profesionales de tu base instalada.

### Guía de Configuración Paso a Paso (Botón de Impresión)
Para que los usuarios puedan imprimir la ficha con un solo clic, se recomienda añadir un botón en el registro:

1. **Mediante Script (User Event)**:
    - Crea un script de tipo **User Event** y asígnalo al registro de Artículo o Cliente.
    - En la función `beforeLoad`, añade un botón que abra la URL del Suitelet:
      ```javascript
      // Ejemplo rápido:
      const suiteletUrl = url.resolveScript({ scriptId: '...', deploymentId: '...', params: { id: recordId } });
      form.addButton({ id: 'custpage_btn_ficha', label: 'Imprimir Ficha', functionName: "window.open('" + suiteletUrl + "')" });
      ```

2. **Mediante Workflow**:
    - Crea un flujo de trabajo sencillo.
    - Añade una acción de **Botón** (Add Button) en el estado de "Inicio" o "Visualización".
    - Configura el botón para que ejecute un script de cliente o use una URL de redirección.

### Instalación y Despliegue
1. **Carga**: Sube los archivos al File Cabinet.
2. **Registro de Script**: Crea un registro de Suitelet para cada uno.
3. **Mapeo de Campos**: Edita el objeto `FIELD_MAPPING` en el script con tus IDs reales.

---
**Author:** CMC
**Version:** 1.0.0

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
