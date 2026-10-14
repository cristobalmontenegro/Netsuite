# 🐍 NetSuite Backup — Python Client

**ES:** Cliente en **Python** que descarga y respalda el **File Cabinet** de NetSuite a almacenamiento local, consumiendo el RESTlet `RL_FileCabinet_API.js` (ver carpeta superior [`../`](../)). Incluye logging opcional en MySQL.

**EN:** A **Python** client that downloads and backs up the NetSuite **File Cabinet** to local storage by consuming the `RL_FileCabinet_API.js` RESTlet (see the parent folder [`../`](../)). Includes optional MySQL logging.

---

## 📂 Archivos / Files

| Archivo | Descripción (ES) | Description (EN) |
|:---|:---|:---|
| `netsuite_backup_client.py` | Cliente principal de descarga/respaldo. | Main download/backup client. |
| `requirements.txt` | Dependencias de Python. | Python dependencies. |

## 🛠 Requisitos / Requirements

```bash
pip install -r requirements.txt
```

Dependencias / Dependencies: `requests`, `requests-oauthlib`, `mysql-connector-python`.

## ⚙️ Configuración / Configuration

Edita las variables al inicio de `netsuite_backup_client.py` (ES) / Edit the variables at the top of `netsuite_backup_client.py` (EN):

| Variable | Descripción |
|:---|:---|
| `RESTLET_URL` | URL del RESTlet (script + deploy) de NetSuite. |
| `NETSUITE_ACCOUNT_ID` | ID de tu cuenta NetSuite (realm de OAuth). |
| `CLIENT_KEY` / `CLIENT_SECRET` | Credenciales de integración (TBA). |
| `TOKEN_ID` / `TOKEN_SECRET` | Token de acceso (TBA). |
| `BACKUP_BASE_DIR` | Carpeta local donde se guardarán los respaldos. |
| `MAX_FILE_SIZE_BYTES` | Límite por archivo (NetSuite bloquea transferencias > 10 MB). |
| `ENABLE_MYSQL_LOGS` / `DB_CONFIG` | Logging opcional en MySQL. |

> 🔐 Usa **Token-Based Authentication (TBA)** y **nunca** subas tus credenciales reales al repositorio.

## 🚀 Uso / Usage

```bash
python netsuite_backup_client.py
```

---

## ☕ Apóyame / Support me

<a href="https://ko-fi.com/cristobalmontenegro" target="_blank">
  <img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" border="0" alt="Buy Me a Coffee at ko-fi.com" />
</a>

— **Cristóbal Montenegro** ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
