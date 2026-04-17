# RFM Analysis Engine for NetSuite

The **RFM Analysis Engine** is a powerful segmentation tool designed for NetSuite. RFM stands for **Recency, Frequency, and Monetary** value, a marketing technique used to determine quantitatively which customers are the best ones by examining how recently a customer has purchased (recency), how often they purchase (frequency), and how much the customer spends (monetary).

---

## 🇺🇸 English Version

### Purpose
This module identifies your most valuable customers, those at risk of churning, and those who have already left. By segmenting your customer base, you can tailor your marketing strategies to increase loyalty and revenue.

### How it Works
1. **Recency**: Calculates the days since the customer's last purchase.
2. **Frequency**: Counts how many orders the customer hasn't returned in a specific period.
3. **Monetary**: Sums the total spent by the customer.
4. **Scoring**: Assigns a score (usually 1-5) to each metric.
5. **Ranking**: Combines scores into a final ranking (e.g., "Champion", "At Risk", "Hibernating").

### Configuration & Parameters
The script is a **Scheduled Script** (`RFM_Engine_SS.js`). You need to configure the following mapping inside the script or via script parameters:
- **Transaction Search**: A saved search that lists all valid customer transactions.
- **Score Fields**: Custom fields on the Customer record to store R, F, M, and Total scores.
- **Ranking Field**: A custom field (Select or Free Form Text) to store the final segment.

### Installation & Deployment
1. **Upload**: Save `RFM_Engine_SS.js` in your File Cabinet.
2. **Step-by-Step Custom Fields Setup**:
    - Go to **Customization > Lists, Records, & Fields > Entity Fields > New**.
    - Create the following fields:
        - **Label**: `RFM Recency Score` | **ID**: `_rfm_recency` | **Type**: `Decimal Number`.
        - **Label**: `RFM Frequency Score` | **ID**: `_rfm_frequency` | **Type**: `Decimal Number`.
        - **Label**: `RFM Monetary Score` | **ID**: `_rfm_monetary` | **Type**: `Decimal Number`.
        - **Label**: `RFM Ranking` | **ID**: `_rfm_ranking` | **Type**: `Free-Form Text` or `List/Record`.
    - On the **Applies To** tab, check **Customer**.
3. **Script Record**: Create a new Scheduled Script record.
4. **Deployment**: Set up a schedule (e.g., weekly or monthly) and define the parameter values if using script parameters.

---

## 🇪🇸 Versión en Español

### Descripción Completa
El **Motor de Análisis RFM** es una herramienta de segmentación avanzada para NetSuite. RFM significa **Recencia, Frecuencia y Monetario**, una técnica de marketing utilizada para determinar cuantitativamente quiénes son los mejores clientes analizando qué tan recientemente han comprado (recencia), con qué frecuencia lo hacen (frecuencia) y cuánto gastan (monetario).

### ¿Para qué sirve? (Propósito)
Este módulo permite identificar a tus clientes más valiosos, aquellos en riesgo de fuga y los que ya han dejado de comprar. Al segmentar tu base de clientes, puedes personalizar tus estrategias de marketing para aumentar la fidelidad y los ingresos.

### ¿Cuándo usarlo?
Es ideal para empresas B2C o B2B que deseen realizar campañas de re-activación, premiar la lealtad de sus mejores clientes o identificar debilidades en su retención de clientes.

### Configuración y Parametrización
El script es de tipo **Scheduled Script** (`RFM_Engine_SS.js`). Los pormenores de la configuración incluyen:
1. **Búsqueda Maestra**: Requiere una búsqueda guardada de transacciones que sirva como fuente de datos.
2. **Guía de Configuración Paso a Paso (Campos)**:
    - Ve a **Personalización > Listas, registros y campos > Campos de entidad > Nuevo**.
    - Crea los siguientes campos:
        - **Etiqueta**: `Puntaje Recencia` | **ID**: `_rfm_recency` | **Tipo**: `Número decimal`.
        - **Etiqueta**: `Puntaje Frecuencia` | **ID**: `_rfm_frequency` | **Tipo**: `Número decimal`.
        - **Etiqueta**: `Puntaje Monetario` | **ID**: `_rfm_monetary` | **Tipo**: `Número decimal`.
        - **Etiqueta**: `Ranking RFM` | **ID**: `_rfm_ranking` | **Tipo**: `Texto libre`.
    - En la pestaña **Se aplica a**, marca la casilla **Cliente**.

### Instalación y Despliegue
1. **Carga**: Sube el archivo `RFM_Engine_SS.js` al File Cabinet.
2. **Registro de Script**: Crea un nuevo registro de Script Programado.
3. **Despliegue**: Define la periodicidad (ej. semanal o mensual) y establece los valores de los parámetros según los IDs creados.

---
**Author:** CMC
**Version:** 1.0.0

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
