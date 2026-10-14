# 📦 NetSuite File Sync & Backup

A powerful disaster recovery and synchronization tool that allows you to mirror your NetSuite File Cabinet to external servers or local storage. It effectively bridges the gap between NetSuite's cloud storage and your corporate backup infrastructure.

[Versión en Español abajo](#versión-en-español-es)

---

## 💎 The Value of Off-Cloud Backups

NetSuite holds your most critical business documents (Invoices, PDFs, Contracts). This module provides a secure, automated way to:
- **Disaster Recovery**: Maintain a local copy of all File Cabinet assets.
- **Speed**: Access local versions of large files without hitting NetSuite concurrency limits.
- **Integration**: Feed NetSuite documents into local AI models, OCR systems, or third-party storage (S3, Azure, local NAS).

---

## 🧩 Components

1. **`RL_FileCabinet_API.js`**: A NetSuite RESTlet that exposes high-speed File Cabinet operations.
2. **`Python_Client/`**: A production-ready Python suite for mass-downloading and synchronization.

---

## 🚀 NetSuite Setup (Server Side)

1. Upload `RL_FileCabinet_API.js` to your File Cabinet.
2. Create a **Restlet** script record and deploy it as **Released**.
3. Enable **Token-Based Authentication (TBA)** on an Integration Record.
4. Secure your credentials: **Consumer Key, Consumer Secret, Token ID, and Token Secret**.

---

## 🐍 Python Client Setup (Backup Logic)

The Python client is designed for scheduled backup tasks.

### Installation:
```bash
pip install requests requests-oauthlib
```

### Configuration:
Edit the `NS_CONFIG` in `netsuite_backup_client.py`:
- Set the `URL` to your Restlet's **External URL**.
- Insert your Oauth 1.0 credentials.

### Backup Strategy:
The client can be scheduled (via CRON or Task Scheduler) to run nightly, ensuring your local mirror is always up to date with the latest cloud files.

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

# 📦 NetSuite File Sync & Backup

Una potente herramienta de sincronización y recuperación ante desastres que le permite duplicar su File Cabinet de NetSuite en servidores externos o almacenamiento local. Cierra la brecha entre el almacenamiento en la nube de NetSuite y su infraestructura de respaldo corporativa.

---

## 💎 El Valor de los Respaldos Fuera de la Nube

NetSuite alberga sus documentos comerciales más críticos (Facturas, PDFs, Contratos). Este módulo proporciona una forma segura y automatizada de:
- **Recuperación ante Desastres (DR)**: Mantener una copia local de todos los activos del File Cabinet.
- **Velocidad**: Acceder a versiones locales de archivos grandes sin afectar los límites de concurrencia de NetSuite.
- **Integración**: Alimentar documentos de NetSuite en modelos de IA locales, sistemas OCR o almacenamiento de terceros (S3, Azure, NAS local).

---

## 🧩 Componentes

1. **`RL_FileCabinet_API.js`**: Un RESTlet de NetSuite que expone operaciones de alta velocidad para el File Cabinet.
2. **`Python_Client/`**: Una suite de Python lista para producción para la descarga masiva y sincronización.

---

## 🚀 Configuración en NetSuite (Servidor)

1. Suba `RL_FileCabinet_API.js` a su File Cabinet.
2. Cree un registro de script **Restlet** y despliéguelo como **Released (Liberado)**.
3. Habilite **Autenticación Basada en Tokens (TBA)** en un Registro de Integración.
4. Asegure sus credenciales: **Consumer Key, Consumer Secret, Token ID y Token Secret**.

---

## 🐍 Configuración del Cliente Python (Lógica de Respaldo)

El cliente Python está diseñado para tareas de respaldo programadas.

### Instalación:
```bash
pip install requests requests-oauthlib
```

### Estrategia de Respaldo:
El cliente se puede programar (vía CRON o Programador de Tareas) para ejecutarse todas las noches, asegurando que su espejo local esté siempre actualizado con los últimos archivos de la nube.

---

## 👤 Autor
**Cristóbal Montenegro**  
GitHub: [@cristobalmontenegro](https://github.com/cristobalmontenegro)
---

# 📦 📦 NetSuite File Sync & Backup (English)

**🇬🇧 English**

> The full documentation is in Spanish above. This is a brief English summary.

- **Author:** Cristóbal Montenegro ([@cristobalmontenegro](https://github.com/cristobalmontenegro))
- **License:** MIT — see [`LICENSE`](../../LICENSE).
