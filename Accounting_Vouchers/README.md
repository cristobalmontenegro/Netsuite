# 🧾 NetSuite Accounting Vouchers (FinOps)

This module provides a robust, printable voucher system for financial transactions in NetSuite. It is designed to meet local accounting requirements for printed evidence of Journal Entries, Customer Payments, and Vendor Bills.

[Versión en Español abajo](#versión-en-español-es)

---

## 🚀 Deployment Instructions

### 1. Script Setup
1. Upload `Accounting_Voucher_SL.js` to the File Cabinet.
2. Create a **Suitelet** script record.
3. Deploy the script with **Status: Released**.
4. Set the **Audience** to your accounting and finance roles.

### 2. Implementation (Link to Record)
To allow users to print a voucher directly from a transaction:
1. Create a **User Event** script (or use a Workflow) to add a button to the desired transaction types (e.g., Journal, Payment).
2. The button should open the Suitelet URL with the following query parameters:
   - `internalid`: The ID of the current transaction.
   - `type`: The internal ID of the record type.

---

## 🛠️ Design & Customization

The voucher uses a standardized financial layout featuring:
- Company Header (Logo can be added in the XML).
- Transaction Metadata (Date, Number, Subsidiary).
- **Accounting Lines**: GL accounts, debits, credits, and memos.
- **Signature Section**: Places for "Prepared by", "Approved by", and "Received by".

To modify the labels or the signature section, edit the `buildXmlTemplate` function in the source code.

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

# 🧾 Comprobantes Contables de NetSuite (FinOps)

Este módulo proporciona un sistema de comprobantes impresos robusto para transacciones financieras en NetSuite. Está diseñado para cumplir con los requisitos contables locales de evidencia impresa para Asientos de Diario, Pagos de Clientes y Facturas de Proveedores.

---

## 🚀 Instrucciones de Despliegue

### 1. Configuración del Script
1. Suba `Accounting_Voucher_SL.js` al File Cabinet.
2. Cree un registro de script tipo **Suitelet**.
3. Despliegue el script con **Estado: Lanzado (Released)**.
4. Establezca la **Audiencia** para sus roles de contabilidad y finanzas.

### 2. Implementación (Enlace al Registro)
Para permitir que los usuarios impriman un comprobante directamente desde una transacción:
1. Cree un script de **User Event** (o use un Workflow) para agregar un botón a los tipos de transacción deseados (ej., Diario, Pago).
2. El botón debe abrir la URL del Suitelet con los siguientes parámetros de consulta:
   - `internalid`: El ID de la transacción actual.
   - `type`: El ID interno del tipo de registro.

---

## 🛠️ Diseño y Personalización

El comprobante utiliza un diseño financiero estandarizado que incluye:
- Encabezado de la Empresa (El logotipo se puede agregar en el XML).
- Metadatos de la Transacción (Fecha, Número, Subsidiaria).
- **Líneas Contables**: Cuentas del libro mayor, débitos, créditos y notas (memos).
- **Sección de Firmas**: Espacios para "Preparado por", "Aprobado por" y "Recibido por".

Para modificar las etiquetas o la sección de firmas, edite la función `buildXmlTemplate` en el código fuente.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
---

# 🧾 🧾 NetSuite Accounting Vouchers (FinOps) (English)

**🇬🇧 English**

> The full documentation is in Spanish above. This is a brief English summary.

- **Author:** Cristóbal Montenegro ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
- **License:** MIT — see [`LICENSE`](../../LICENSE).
