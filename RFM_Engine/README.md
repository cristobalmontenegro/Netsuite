# 📈 NetSuite RFM Engine

The **RFM Engine** (Recency, Frequency, Monetary) is a customer segmentation tool that automatically ranks your customers based on their historical purchasing behavior. It uses quintile-based ranking to assign scores from 1 to 5.

[Versión en Español abajo](#versión-en-español-es)

---

## 🔬 Calculation Logic

- **Recency**: Days since the last invoice.
- **Frequency**: Count of invoices within the analysis period.
- **Monetary**: Total revenue generated.

The engine calculates these values using **SuiteQL** for high performance, then applies a statistical distribution to assign a rank (1-5) to each customer.

---

## 🛠️ Prerequisites: Custom Fields

You must create the following fields on the **Customer** record for the script to store findings:

| Field Label | Field ID | Type |
| :--- | :--- | :--- |
| **RFM: Recency Rank** | `custentity_rfm_recency` | Integer |
| **RFM: Frequency Rank** | `custentity_rfm_frequency` | Integer |
| **RFM: Monetary Rank** | `custentity_rfm_monetary` | Integer |
| **RFM: Global Score** | `custentity_rfm_score` | Integer (Sum of ranks) |

---

## 🚀 Installation & Deployment

1. Upload `RFM_Engine_SS.js` to the File Cabinet.
2. Create a **Scheduled Script** record.
3. **Parameters**:
   - The script can be configured via parameters to define the "Lookback Period" (default is 365 days).
4. **Deployment**:
   - **Status**: Scheduled.
   - **Frequency**: Recommend running weekly (e.g., Sunday at 12:00 AM).

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)

---

# Versión en Español (ES)

# 📈 Motor RFM de NetSuite

El **Motor RFM** (Recency, Frequency, Monetary) es una herramienta de segmentación de clientes que clasifica automáticamente a sus clientes según su comportamiento histórico de compra. Utiliza una clasificación basada en quintiles para asignar puntuaciones del 1 al 5.

---

## 🔬 Lógica de Cálculo

- **Recency (Recencia)**: Días desde la última factura.
- **Frequency (Frecuencia)**: Cantidad de facturas dentro del período de análisis.
- **Monetary (Monetario)**: Ingresos totales generados.

El motor calcula estos valores utilizando **SuiteQL** para un alto rendimiento, luego aplica una distribución estadística para asignar un rango (1-5) a cada cliente.

---

## 🛠️ Requisitos Previos: Campos Personalizados

Debe crear los siguientes campos en el registro de **Cliente** para que el script almacene los hallazgos:

| Etiqueta de Campo | ID de Campo | Tipo |
| :--- | :--- | :--- |
| **RFM: Recency Rank** | `custentity_rfm_recency` | Entero |
| **RFM: Frequency Rank** | `custentity_rfm_frequency` | Entero |
| **RFM: Monetary Rank** | `custentity_rfm_monetary` | Entero |
| **RFM: Global Score** | `custentity_rfm_score` | Entero (Suma de rangos) |

---

## 🚀 Instalación y Despliegue

1. Suba `RFM_Engine_SS.js` al File Cabinet.
2. Cree un registro de **Script Programado (Scheduled Script)**.
3. **Parámetros**:
   - El script se puede configurar mediante parámetros para definir el "Período de Retroceso" (por defecto es 365 días).
4. **Despliegue**:
   - **Estado**: Programado (Scheduled).
   - **Frecuencia**: Se recomienda ejecutar semanalmente (ej., domingos a las 12:00 AM).

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
