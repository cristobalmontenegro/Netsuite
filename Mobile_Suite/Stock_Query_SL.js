/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Interfaz Móvil para Consulta de Stock en Tiempo Real.
 * Permite a usuarios con "tokens" (empleados externos/vendedores) consultar disponibilidad
 * sin necesidad de entrar a la interfaz estándar de NetSuite.
 * 
 * REQUERIMIENTOS:
 * 1. Campo de entidad en Empleado para el Token (ej. _mobile_token).
 * 2. Librería lib_menu_movil.js cargada en la misma carpeta.
 */

define(['N/search', 'N/file', 'N/log', './lib_menu_movil'], (search, file, log, libMenu) => {

    // --- CONFIGURACIÓN ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token', // ID del campo de token en el Empleado
        PAGE_TITLE: 'Consulta de Stock Móvil'
    };

    const onRequest = (context) => {
        const { request, response } = context;
        const { action, token } = request.parameters;

        // 1. VALIDACIÓN DE SEGURIDAD (TOKEN)
        const userInfo = getUserInfoByToken(token);
        if (!userInfo) {
            response.write('ERROR: Acceso denegado o sesión expirada.');
            return;
        }

        if (request.method === 'GET') {
            try {
                let html = getHtmlTemplate();
                html = html.replace('{{TOKEN}}', token);
                
                // Inyectar Menú Superior y Estilos
                html = libMenu.inyectarHeaderGlobal(html, token, 'stock', userInfo.name);

                response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' });
                response.write(html);
            } catch (e) {
                log.error('GET Error', e);
                response.write(`Error: ${e.message}`);
            }
        }

        if (request.method === 'POST') {
            response.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
            try {
                const body = request.body ? JSON.parse(request.body) : {};
                let results = [];

                if (action === 'getArticulos') {
                    results = searchItems(body.query);
                } else if (action === 'getStock') {
                    results = getStockData(body.articuloId);
                }

                response.write(JSON.stringify(results));
            } catch (e) {
                log.error('POST/API Error', e);
                response.write(JSON.stringify({ success: false, error: e.message }));
            }
        }
    };

    // --- BÚSQUEDAS Y LÓGICA ---

    const getUserInfoByToken = (token) => {
        if (!token) return null;
        const s = search.create({
            type: search.Type.EMPLOYEE,
            filters: [[CONFIG.TOKEN_FIELD, 'is', token], 'AND', ['isinactive', 'is', 'F']],
            columns: ['firstname', 'lastname']
        });
        const res = s.run().getRange({ start: 0, end: 1 });
        if (res.length === 0) return null;
        return { 
            id: res[0].id, 
            name: (res[0].getValue('firstname') + ' ' + res[0].getValue('lastname')).trim() 
        };
    };

    const searchItems = (query) => {
        if (!query || query.length < 2) return [];
        const items = [];
        const filters = [
            ['isinactive', 'is', 'F'], 'AND', 
            ['type', 'anyof', ['InvtPart', 'Assembly', 'LotNumberedAssemblyItem', 'LotNumberedInventoryItem']], 'AND',
            [['itemid', 'contains', query], 'OR', ['displayname', 'contains', query], 'OR', ['upccode', 'contains', query]]
        ];

        search.create({
            type: search.Type.ITEM,
            filters,
            columns: [{ name: 'itemid', sort: search.Sort.ASC }, 'upccode', 'displayname']
        }).run().getRange({ start: 0, end: 15 }).forEach(res => {
            const label = `${res.getValue('itemid')} - ${res.getValue('displayname')}`;
            items.push({ value: res.id, label: label });
        });
        return items;
    };

    const getStockData = (itemId) => {
        const data = [];
        const colLoc = search.createColumn({ name: 'inventorylocation', sort: search.Sort.ASC });
        const colAvail = search.createColumn({ name: 'locationquantityavailable' });
        const colOnHand = search.createColumn({ name: 'locationquantityonhand' });

        search.create({
            type: search.Type.ITEM,
            filters: [['internalid', 'is', itemId], 'AND', ['locationquantityonhand', 'greaterthan', 0]],
            columns: [colLoc, colAvail, colOnHand, 'stockunit']
        }).run().each(res => {
            data.push({
                ubicacion: res.getText(colLoc),
                unidad: res.getText('stockunit') || 'Und',
                disponible: parseFloat(res.getValue(colAvail) || 0),
                fisico: parseFloat(res.getValue(colOnHand) || 0)
            });
            return true;
        });
        return data;
    };

    const getHtmlTemplate = () => {
        return `<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Consulta Stock</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css" />
            <style>
                .stock-box { background: white; border-radius: 8px; padding: 15px; margin-top: 10px; border: 1px solid #eee; }
                .loading { display:none; text-align:center; padding: 20px; }
            </style>
        </head>
        <body>
            <div id="loader" class="loading"><div class="spinner-border text-primary"></div></div>
            <div class="container-fluid">
                <div class="mb-3">
                    <label class="form-label fw-bold">Buscar Producto:</label>
                    <select id="articuloId" class="form-select"></select>
                </div>
                <button class="btn btn-primary w-100 mb-4" onclick="consultarStock()">BUSCAR DISPONIBILIDAD</button>
                <div id="resultados"></div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
            <script>
                const TOKEN = "{{TOKEN}}";
                const BASE_URL = window.location.href.split('&action=')[0];
                let choices;
                let timer;

                window.onload = () => {
                    choices = new Choices('#articuloId', { searchChoices: false, placeholderValue: 'Escriba código o nombre...' });
                    document.getElementById('articuloId').addEventListener('search', (e) => {
                        if(timer) clearTimeout(timer);
                        timer = setTimeout(() => buscarItems(e.detail.value), 400);
                    });
                };

                async function buscarItems(q) {
                    if(q.length < 2) return;
                    const res = await fetch(\`\${BASE_URL}&action=getArticulos\`, { method: 'POST', body: JSON.stringify({ query: q }) });
                    const items = await res.json();
                    choices.setChoices(items, 'value', 'label', true);
                }

                async function consultarStock() {
                    const id = document.getElementById('articuloId').value;
                    if(!id) return;
                    document.getElementById('loader').style.display='block';
                    const res = await fetch(\`\${BASE_URL}&action=getStock\`, { method: 'POST', body: JSON.stringify({ articuloId: id }) });
                    const data = await res.json();
                    render(data);
                    document.getElementById('loader').style.display='none';
                }

                function render(data) {
                    const div = document.getElementById('resultados');
                    div.innerHTML = data.length ? data.map(i => \`
                        <div class="stock-box">
                            <div class="fw-bold text-primary">\${i.ubicacion}</div>
                            <div class="d-flex justify-content-between mt-2">
                                <span>Físico: \${i.fisico} \${i.unidad}</span>
                                <span class="fw-bold text-success">Disp: \${i.disponible}</span>
                            </div>
                        </div>
                    \`).join('') : '<div class="alert alert-warning">Sin stock disponible.</div>';
                }
            </script>
        </body></html>`;
    };

    return { onRequest };
});
