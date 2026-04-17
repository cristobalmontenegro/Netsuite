# 📁 NetSuite SFTP Foundation & Backup Suite

A two-part solution for automating NetSuite File Cabinet operations and performing secure, incremental local backups.

[Versión en Español abajo](#versión-en-español)

---

## 🛠️ Components
1.  **Server-Side (RESTlet)**: `RL_FileCabinet_API.js`. An RPC-style API that exposes File Cabinet operations (Create, Get, List, Delete) via HTTPS.
2.  **Client-Side (Python)**: `netsuite_backup_client.py`. A robust synchronization script that performs incremental backups of your entire NetSuite File Cabinet to a local directory or SFTP sink.

---

## 🚀 Server setup (NetSuite)
1.  Upload `RL_FileCabinet_API.js` to your File Cabinet.
2.  Create a **Restlet** script record and deploy it.
3.  Ensure your role has the necessary permissions (Documents and Files).
4.  Note down the **Script ID** and **Deployment ID**.

---

## 🐍 Client Setup (Python)

### 1. Requirements
Ensure you have Python 3.x installed. Install dependencies using:
```bash
pip install -r Python_Client/requirements.txt
```

### 2. Authentication (OAuth 1.0)
The client uses Token-Based Authentication (TBA). You will need:
- Consumer Key & Secret (from Integration Record)
- Token ID & Secret (from User Token generation)
- Account ID

### 3. Configuration
Edit `netsuite_backup_client.py` and update the `CONFIGURATION` section:
- `RESTLET_URL`: Your deployed RESTlet URL.
- `BACKUP_BASE_DIR`: Local path where files will be saved.
- `ENABLE_MYSQL_LOGS`: Set to `True` if you wish to log every execution in a database.

### ⚡ Key Features
- **Incremental Logic**: Only downloads files that are new or modified since the last run (based on `LastModifiedDate`).
- **Governance Management**: NetSuite has usage limits (Governance). This script automatically detects `API_GOVERNANCE_EXCEEDED` errors and pauses for 60 seconds before retrying.
- **Large File Handling**: Automatically skips files larger than 10MB (RESTlet limit) to avoid execution errors.

---

# Versión en Español

## 📁 NetSuite SFTP Foundation & Backup Suite

Sincronización y automatización del Gabinete de Archivos de NetSuite mediante una API RESTlet y un cliente de respaldo en Python.

## 🚀 Configuración del Servidor
1. suba `RL_FileCabinet_API.js` a su gabinete de archivos.
2. Cree un registro de **Restlet** y despliéguelo.
3. El script permite funciones como `fileCreate`, `fileGet`, `folderCreate` y `suiteQLRun`.

## 🐍 Configuración del Cliente Python
El script `netsuite_backup_client.py` permite realizar un espejo exacto de su gabinete de archivos localmente.

### Características:
- **Sincronización Incremental**: Solo descarga lo nuevo o modificado.
- **Manejo de Gobernanza**: Detecta límites de uso de NetSuite y pausa la ejecución automáticamente por 60 segundos si es necesario.
- **MySQL Opcional**: Incluye lógica para guardar logs de respaldo en una base de datos si se desea.
- **Límite de Tamaño**: Omite archivos > 10MB para cumplir con las restricciones nativas de los RESTlets.

### Instalación:
```bash
pip install -r requirements.txt
```
Luego configure sus credenciales OAuth 1.0 al inicio del script.

---

## 👤 Author
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
