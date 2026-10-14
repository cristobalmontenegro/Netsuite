# 🚀 Deployment Audit for NetSuite

[Español abajo](#auditoría-de-script-deployments)

A single Suitelet that audits **every Script Deployment** in a NetSuite account: who created the script, its type, whether it is deployed, and the exact **audience** (roles + run-as) of each deployment — including the classic `allroles = F` pitfall that silently leaves script deployments inaccessible.

## Overview (EN)

NetSuite's standard *Script Deployments* list does not show, in one place, **who owns a script**, **what audience** a deployment has, or **which deployments are inactive/undeloyed**. This tool answers those questions with a filterable HTML table (and a JSON mode for automation).

**Use cases**

- Onboarding/audit: inventory all customizations and who wrote them.
- Security review: find deployments running as Administrator or open to all roles.
- Troubleshooting: locate a deployment that isn't firing because its audience is empty.
- Governance: identify orphan scripts that are not deployed anywhere.

**What it does**

- Queries `scriptdeployment ⨝ script ⨝ employee` via SuiteQL to get the creator (the script *owner*) — a column that does not exist as such in the `scriptdeployment` table.
- Filters by: creator substring, deployment id substring, script/deployment id, type, `allroles` (F/T), and deployed/not-deployed state.
- **Audience detail mode** (`verroles=T`): for each filtered row, loads the deployment and reports roles + run-as.
- **JSON output** (`format=json`) for programmatic consumption.
- Direct links to open the script record and the deployment record.

## Requirements (EN)

| Item | Detail |
|---|---|
| NetSuite | Any account with SuiteCloud. SuiteQL enabled (standard in recent versions). |
| Feature | **Server SuiteScript** (`Setup > Company > Enable Features > SuiteCloud`). |
| Permission | The user/deployment needs *SuiteScript* + *Custom Record* view permission; use a role with full access to Scripting. |
| N/Modules | `N/search`, `N/ui/serverWidget`, `N/url`, `N/ui/serverWidget`, `N/runtime` (all standard). |

No custom fields, custom records or script parameters are required.

## How it works (EN)

The creator of a script is **not** a column of `scriptdeployment`. It is obtained by joining:

```sql
scriptdeployment d
  LEFT JOIN script s ON s.id = d.script
  LEFT JOIN employee e ON e.id = s.owner
```

- `script.owner` → `employee` is the person who created the script.
- The *creator* filter matches `firstname + lastname`, `entityid` and `script.name`.

Two modes:

- **default (list)**: fast. One SuiteQL query, builds an HTML table. Each row has an "Open" link (when applicable) and a "Roles" link that reloads the page in detail mode.
- **detail (`verroles=T`)**: for each filtered row, runs a targeted saved search to get the real `internalid` and then `record.load`s the deployment to read its audience (roles + run-as). Slower but complete.

## Files (EN)

| File | Type | Description |
|---|---|---|
| `deployment_audit.js` | Suitelet | The whole tool (single script). |

## Step-by-step implementation (EN)

1. **Upload the file**
   `Documents > Files > File Cabinet > SuiteScripts` → upload `deployment_audit.js` (e.g. under `SuiteScripts/deployment_audit/`).

2. **Create the Script record**
   `Customization > Scripting > Scripts > New` → choose the uploaded file.
   - **Name**: `Deployment Audit`
   - **ID**: `customscript_deployment_audit` (or your own; remember it for the URL)
   - **API Version**: 2.1

3. **Deploy**
   `Deployments > New`:
   - **Applies To**: *Role* → select the roles that should see the report (typically Administrator / IT).
   - **Status**: Released.
   - **Audience**: *All Roles* or the specific admin role.
   - Deployment ID: `customdeploy_deployment_audit`.

4. **Open it**
   `Customization > Scripting > Scripts > Deployment Audit > Deployments > [deployment] > External URL`, or navigate to:
   ```
   /app/site/hosting/scriptlet.nl?script=customscript_deployment_audit&deploy=customdeploy_deployment_audit
   ```

5. **Use the filters** in the form (creator, deployment id, script, type, allroles, state) and press **Search**. Use the **Roles** link on any row to see that deployment's audience.

### Optional: JSON mode (for automation)

Append `format=json` to the external URL to receive the result set as JSON instead of the HTML table. Combine with filters, e.g.:

```
...&deploy=customdeploy_deployment_audit&format=json&creador=Montenegro
```

## Configuration (EN)

All inputs are **URL query parameters** (no script parameters to create):

| Parameter | Meaning |
|---|---|
| `format` | `html` (default) or `json` |
| `verroles` | `T` → load internal id + audience per row |
| `creador` | substring to match the script creator |
| `deployid` | substring of the deployment `scriptid` (`customdeploy_...`) |
| `script` / `deploy` | filter by script id / deployment id |
| `tipo` | script type |
| `allroles` | `F`, `T` or empty (the `allroles = F` audit) |
| `estado` | deployed / not deployed |

---

# Auditoría de Script Deployments

Un único Suitelet que audita **todos los Script Deployments** de una cuenta NetSuite: quién creó el script, su tipo, si está desplegado y la **audiencia exacta** (roles + run-as) de cada deployment — incluido el clásico problema de `allroles = F` que deja despliegues inaccesibles sin aviso.

## Descripción (ES)

La lista estándar de *Script Deployments* de NetSuite no muestra en un solo lugar **quién es el dueño de un script**, **qué audiencia** tiene un despliegue, ni **qué deployments están inactivos/no desplegados**. Esta herramienta responde esas preguntas con una tabla HTML filtrable (y un modo JSON para automatización).

**Casos de uso**

- Auditoría/inventario: listar todas las personalizaciones y quién las escribió.
- Revisión de seguridad: encontrar despliegues que corren como Administrador o abiertos a todos los roles.
- Soporte: ubicar un deployment que no se ejecuta porque su audiencia quedó vacía.
- Gobierno: identificar scripts huérfanos que no están desplegados en ningún lado.

**Qué hace**

- Consulta `scriptdeployment ⨝ script ⨝ employee` vía SuiteQL para obtener el creador (el *owner* del script), columna que no existe como tal en la tabla `scriptdeployment`.
- Filtra por: subcadena del creador, subcadena del id del deployment, script/deployment id, tipo, `allroles` (F/T) y estado desplegado/no desplegado.
- **Modo detalle de audiencia** (`verroles=T`): por cada fila filtrada, carga el deployment y reporta roles + run-as.
- **Salida JSON** (`format=json`) para consumo programático.
- Enlaces directos para abrir el registro del script y el del deployment.

## Requisitos (ES)

| Ítem | Detalle |
|---|---|
| NetSuite | Cualquier cuenta con SuiteCloud. SuiteQL habilitado (estándar en versiones recientes). |
| Feature | **Server SuiteScript** (`Setup > Company > Enable Features > SuiteCloud`). |
| Permiso | El usuario/deployment necesita permiso *SuiteScript* + ver *Custom Record*; usar un rol con acceso total a Scripting. |
| Módulos | `N/search`, `N/ui/serverWidget`, `N/url`, `N/runtime` (todos estándar). |

No requiere campos personalizados, registros custom ni parámetros de script.

## Cómo funciona (ES)

El creador de un script **no** es una columna de `scriptdeployment`. Se obtiene cruzando:

```sql
scriptdeployment d
  LEFT JOIN script s ON s.id = d.script
  LEFT JOIN employee e ON e.id = s.owner
```

- `script.owner` → `employee` es quien creó el script.
- El filtro *creador* busca en `firstname + lastname`, `entityid` y `script.name`.

Dos modos:

- **default (listado)**: rápido. Una consulta SuiteQL, arma una tabla HTML. Cada fila tiene enlace "Abrir" (si aplica) y "Roles" que recarga la página en modo detalle.
- **detalle (`verroles=T`)**: por cada fila filtrada, hace una búsqueda puntual para obtener el `internalid` real y luego `record.load` del deployment para leer su audiencia (roles + run-as). Más lento pero completo.

## Archivos (ES)

| Archivo | Tipo | Descripción |
|---|---|---|
| `deployment_audit.js` | Suitelet | Toda la herramienta (un solo script). |

## Guía de implementación paso a paso (ES)

1. **Subir el archivo**
   `Documentos > Archivos > File Cabinet > SuiteScripts` → subir `deployment_audit.js` (p. ej. en `SuiteScripts/deployment_audit/`).

2. **Crear el Script record**
   `Personalización > Scripting > Scripts > Nuevo` → elegir el archivo subido.
   - **Nombre**: `Deployment Audit`
   - **ID**: `customscript_deployment_audit` (o el propio; recordarlo para la URL)
   - **API Version**: 2.1

3. **Desplegar**
   `Deployments > Nuevo`:
   - **Applies To**: *Role* → seleccionar los roles que deben ver el reporte (típicamente Administrador / TI).
   - **Status**: Released.
   - **Audience**: *All Roles* o el rol admin específico.
   - Deployment ID: `customdeploy_deployment_audit`.

4. **Abrirlo**
   `Personalización > Scripting > Scripts > Deployment Audit > Deployments > [deployment] > External URL`, o navegar a:
   ```
   /app/site/hosting/scriptlet.nl?script=customscript_deployment_audit&deploy=customdeploy_deployment_audit
   ```

5. **Usar los filtros** del formulario (creador, deployment id, script, tipo, allroles, estado) y presionar **Buscar**. Usar el enlace **Roles** de cualquier fila para ver la audiencia de ese deployment.

### Opcional: modo JSON (para automatización)

Agregar `format=json` a la External URL para recibir el resultado como JSON en lugar de la tabla HTML. Combinable con filtros, p. ej.:

```
...&deploy=customdeploy_deployment_audit&format=json&creador=Montenegro
```

## Configuración (ES)

Todas las entradas son **parámetros de query en la URL** (no hay parámetros de script que crear):

| Parámetro | Significado |
|---|---|
| `format` | `html` (default) o `json` |
| `verroles` | `T` → carga internal id + audiencia por fila |
| `creador` | subcadena para coincidir con el creador del script |
| `deployid` | subcadena del `scriptid` del deployment (`customdeploy_...`) |
| `script` / `deploy` | filtrar por script id / deployment id |
| `tipo` | tipo de script |
| `allroles` | `F`, `T` o vacío (la auditoría de `allroles = F`) |
| `estado` | desplegado / no desplegado |

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

## 👤 Author / Autoría

**Cristóbal Montenegro** — https://github.com/cristobalmontenegro

## 📜 License / Licencia

MIT — see [`LICENSE`](../LICENSE).
