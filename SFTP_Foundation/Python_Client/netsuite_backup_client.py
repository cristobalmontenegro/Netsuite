# Author: Cristóbal Montenegro (https://github.com/cristobalmontenegro)
import os
import time
import base64
import json
import requests
from requests_oauthlib import OAuth1

# ==============================================================================
# === 1. CONFIGURATION / CONFIGURACIÓN ===
# ==============================================================================

# NetSuite RESTlet URL and Account ID
# URL del RESTlet de NetSuite e ID de la Cuenta
RESTLET_URL = "https://<ACCOUNT_ID>.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=<SCRIPT_ID>&deploy=<DEPLOY_ID>"
NETSUITE_ACCOUNT_ID = "<ACCOUNT_ID>"

# OAuth 1.0 Credentials (TBA)
# Credenciales OAuth 1.0 (Autenticación basada en Token)
CLIENT_KEY = "YOUR_CLIENT_KEY"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
TOKEN_ID = "YOUR_TOKEN_ID"
TOKEN_SECRET = "YOUR_TOKEN_SECRET"

# Local Backup Path
# Ruta local para guardar el respaldo
BACKUP_BASE_DIR = "./BACKUP_NETSUITE"

# File size limit for RESTlet (NetSuite blocks > 10MB)
# Límite de tamaño para RESTlet (NetSuite bloquea transferencias > 10MB)
MAX_FILE_SIZE_BYTES = 9.5 * 1024 * 1024 

# MySQL Logging (Optional)
# Registro en MySQL (Opcional)
ENABLE_MYSQL_LOGS = False
DB_CONFIG = {
    "user": "user",
    "password": "password",
    "host": "127.0.0.1",
    "database": "backups_db",
    "table": "logs"
}

# ==============================================================================
# === 2. HELPER FUNCTIONS / FUNCIONES AUXILIARES ===
# ==============================================================================

oauth = OAuth1(CLIENT_KEY,
               client_secret=CLIENT_SECRET,
               resource_owner_key=TOKEN_ID,
               resource_owner_secret=TOKEN_SECRET,
               realm=NETSUITE_ACCOUNT_ID,
               signature_method='HMAC-SHA256')

def registrar_en_mysql(plataforma, tipo, origen, tamano, ruta, estado, duracion):
    """Inserts the log into the database if enabled."""
    if not ENABLE_MYSQL_LOGS:
        return
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=DB_CONFIG["host"], 
            user=DB_CONFIG["user"], 
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"]
        )
        cursor = conn.cursor()
        query = (f"INSERT INTO {DB_CONFIG['table']} "
                 "(plataforma, tipo, origen, archivo, tamano, ruta, estado, duracion) "
                 "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)")
        values = (plataforma, tipo, origen, "", tamano, ruta, estado, duracion)
        cursor.execute(query, values)
        conn.commit()
        cursor.close()
        conn.close()
        print("[Log MySQL] Record saved.")
    except Exception as e:
        print(f"[Aviso MySQL] Could not save log to DB: {e}")

def call_restlet(payload, retries=3):
    """Calls the RESTlet with retries and governance handling."""
    headers = {'Content-Type': 'application/json'}
    for attempt in range(retries):
        try:
            response = requests.post(RESTLET_URL, auth=oauth, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            data = response.json()

            if isinstance(data, dict) and 'error' in data:
                error_msg = str(data.get('error'))
                if "API_GOVERNANCE_EXCEEDED" in error_msg:
                    print("  [!] NetSuite Governance Exceeded. Waiting 60s...")
                    time.sleep(60)
                    continue
                return {"error": error_msg}
            return data
        except Exception as e:
            print(f"  [Attempt {attempt+1}/{retries}] Connection Error: {e}")
            if attempt < retries - 1:
                time.sleep(10 * (attempt + 1))
            else:
                return {"error": str(e)}

# ==============================================================================
# === 3. CORE LOGIC / LÓGICA PRINCIPAL ===
# ==============================================================================

def process_folder(folder_id, local_path):
    stats = {'bytes': 0, 'archivos': 0, 'errores': 0, 'skipped': 0, 'protected': 0}
    os.makedirs(local_path, exist_ok=True)

    last_file_id = 0
    has_more_files = True

    while has_more_files:
        # Use SuiteQL to list files incrementally
        sql_files = (f"SELECT ID, Name, FileSize, "
                     f"TO_CHAR(LastModifiedDate, 'YYYY-MM-DD HH24:MI:SS') as lastmod "
                     f"FROM File WHERE Folder = {folder_id} AND ID > {last_file_id} ORDER BY ID ASC")
        data_files = call_restlet({"function": "suiteQLRun", "sql": sql_files})

        if not data_files or 'error' in data_files or not data_files.get('records'):
            has_more_files = False
            break
        
        for file in data_files['records']:
            file_id, file_name, file_size, ns_mod_str = file['id'], file['name'], int(file['filesize'] or 0), file['lastmod']
            last_file_id = file_id
            
            safe_file_name = file_name.replace('/', '_').replace(':', '-').replace('\\', '_')
            local_file_path = os.path.join(local_path, safe_file_name)

            # Incremental Logic: Check modification date
            ns_mod_dt = time.mktime(time.strptime(ns_mod_str, '%Y-%m-%d %H:%M:%S'))
            if os.path.exists(local_file_path):
                if os.path.getmtime(local_file_path) >= ns_mod_dt:
                    continue
            
            # Size validation
            if file_size > MAX_FILE_SIZE_BYTES:
                print(f"    [!] Skipping (Size > 10MB): {file_name}")
                stats['skipped'] += 1
                continue

            # Fetch file content
            file_data = call_restlet({"function": "fileGet", "fileID": file_id})

            if file_data and 'content' in file_data:
                try:
                    content = file_data['content']
                    # Handle binary vs text (NetSuite file module behavior dependent)
                    file_bytes = base64.b64decode(content or "") if not file_data.get('info', {}).get('isText') else content.encode('utf-8')
                            
                    with open(local_file_path, 'wb') as f:
                        f.write(file_bytes)
                    
                    # Sync local file date with NetSuite
                    os.utime(local_file_path, (ns_mod_dt, ns_mod_dt))
                    stats['bytes'] += len(file_bytes)
                    stats['archivos'] += 1
                except Exception as e:
                    print(f"    [Error] saving {safe_file_name}: {e}")
                    stats['errores'] += 1
            else:
                stats['errores'] += 1

    # Recurse subfolders
    sql_folders = f"SELECT ID, Name FROM MediaItemFolder WHERE Parent = {folder_id}"
    data_folders = call_restlet({"function": "suiteQLRun", "sql": sql_folders})

    if data_folders and 'records' in data_folders:
        for folder in data_folders['records']:
            new_path = os.path.join(local_path, folder['name'].replace('/', '_'))
            sub_stats = process_folder(folder['id'], new_path)
            for k in stats: stats[k] += sub_stats[k]
            
    return stats

def main():
    print(f"--- Backup Started: {time.strftime('%Y-%m-%d %H:%M:%S')} ---")
    start_time = time.time()
    total_stats = {'bytes': 0, 'archivos': 0, 'errores': 0, 'skipped': 0, 'protected': 0}

    try:
        data_root = call_restlet({"function": "suiteQLRun", "sql": "SELECT ID, Name FROM MediaItemFolder WHERE Parent IS NULL"})
        if data_root and 'records' in data_root:
            for folder in data_root['records']:
                f_stats = process_folder(folder['id'], os.path.join(BACKUP_BASE_DIR, folder['name'].replace('/', '_')))
                for k in total_stats: total_stats[k] += f_stats[k]
        else:
            print("[Error] Could not access NetSuite Root Folder.")

    except Exception as e:
        print(f"[Global Error] {e}")

    duration = int(time.time() - start_time)
    print(f"\n--- SUCCESS ---")
    print(f"Files Sync'd: {total_stats['archivos']} | Total Data: {total_stats['bytes'] / (1024*1024):.2f} MB")
    
    registrar_en_mysql("NetSuite", "Sync", "FileCabinet", total_stats['bytes'], BACKUP_BASE_DIR, "Complete", duration)

if __name__ == "__main__":
    main()
