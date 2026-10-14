# 📊 NetSuite Kardex Optimizado

The **Kardex Optimizado** is an advanced inventory ledger designed to handle large volumes of data while providing a real-time, chronological view of stock movements (In, Out, Balance). It overcomes the performance limitations of standard saved searches.

[Versión en Español abajo](#versión-en-español-es)

---

## 🏗️ Architecture

This module consists of two main components:
1. **`Kardex_SCH.js` (Backend)**: A Scheduled Script that processes historical transactions and prepares the index for fast querying.
2. **`Kardex_SL.js` (Frontend)**: A Suitelet that provides a clean, searchable user interface to view the Kardex by Item and Location.

---

## 🚀 Installation & Deployment

### 1. Data Processor (Scheduled Script)
1. Upload `Kardex_SCH.js` to the File Cabinet.
2. Create a **Scheduled Script** record.
3. Deploy the script. 
   - **Recommendation**: Run it daily during off-peak hours to refresh the inventory index.

### 2. View Interface (Suitelet)
1. Upload `Kardex_SL.js` to the File Cabinet.
2. Create a **Suitelet** script record.
3. Deploy the script with **Status: Released**.
4. Set the **Audience** to your Warehouse Managers or Accountants.

---

## 🛠️ Usage Guide

1. Open the Suitelet URL.
2. Select an **Item** and a **Location**.
3. Choose the **Date Range**.
4. Click "Consultar".
5. The system will display:
   - Initial Balance.
   - Detailed Transactions (Type, ID, Qty In, Qty Out).
   - Running Balance.
   - Final Balance.

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

# 📊 Kardex de NetSuite Optimizado

El **Kardex Optimizado** es un libro auxiliar de inventario avanzado diseñado para manejar grandes volúmenes de datos, proporcionando una vista cronológica en tiempo real de los movimientos de stock (Entradas, Salidas, Saldo). Supera las limitaciones de rendimiento de las búsquedas guardadas estándar.

---

## 🏗️ Arquitectura

Este módulo consta de dos componentes principales:
1. **`Kardex_SCH.js` (Backend)**: Un Script Programado que procesa las transacciones históricas y prepara el índice para una consulta rápida.
2. **`Kardex_SL.js` (Frontend)**: Un Suitelet que proporciona una interfaz de usuario limpia y con capacidad de búsqueda para ver el Kardex por Artículo y Ubicación.

---

## 🚀 Instalación y Despliegue

### 1. Procesador de Datos (Script Programado)
1. Suba `Kardex_SCH.js` al File Cabinet.
2. Cree un registro de **Script Programado (Scheduled Script)**.
3. Despliegue el script.
   - **Recomendación**: Ejecútelo diariamente durante las horas de menor actividad para refrescar el índice de inventario.

### 2. Interfaz de Vista (Suitelet)
1. Suba `Kardex_SL.js` al File Cabinet.
2. Cree un registro de script tipo **Suitelet**.
3. Despliegue el script con **Estado: Lanzado (Released)**.
4. Establezca la **Audiencia** para sus Gerentes de Almacén o Contadores.

---

## 🛠️ Guía de Uso

1. Abra la URL del Suitelet.
2. Seleccione un **Artículo** y una **Ubicación**.
3. Elija el **Rango de Fechas**.
4. Haga clic en "Consultar".
5. El sistema mostrará:
   - Saldo Inicial.
   - Transacciones Detalladas (Tipo, ID, Cant. Entrada, Cant. Salida).
   - Saldo Acumulado.
   - Saldo Final.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
---

# 📊 📊 NetSuite Kardex Optimizado (English)

**🇬🇧 English**

> The full documentation is in Spanish above. This is a brief English summary.

- **Author:** Cristóbal Montenegro ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
- **License:** MIT — see [`LICENSE`](../../LICENSE).
