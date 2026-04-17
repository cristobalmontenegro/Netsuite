/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Suitelet para la creación de Casos de Soporte / PQR desde dispositivos móviles.
 * Permite a los vendedores reportar incidentes vinculados a facturas y artículos específicos.
 */
define([
    'N/record', 
    'N/search', 
    'N/email', 
    'N/file', 
    'N/log', 
    'N/url',
    './lib_menu_movil'
], (record, search, email, file, log, url, libMenu) => {

    // --- CONFIGURACIÓN DE INSTANCIA ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token',
        CASE_PROFILE: '1', // ID del Perfil de Caso predeterminado
        EMAIL_CAPTURE: 'cases.placeholder@account.email.netsuite.com', // Email del Case Capture
        
        // Matriz de Notificaciones: Ubicación -> [IDs de Empleados a notificar]
        NOTIF_MATRIX: {
            '101': ['19', '20'], // Sucursal Norte
            '102': ['21'],       // Sucursal Sur
            'default': ['9']     // Fallback (ej. Gerente Nacional)
        }
    };

    const onRequest = (context) => {
        const { request, response } = context;
        const { action, token } = request.parameters;

        const user = getVendedorInfo(token);
        if (!user) {
            response.write('Acceso Denegado.');
            return;
        }

        if (request.method === 'GET') {
            let html = getHtmlTemplate();
            html = html.replace('{{TOKEN}}', token);
            html = libMenu.inyectarHeaderGlobal(html, token, 'casos', user.nombre);
            response.write(html);
            return;
        }

        if (request.method === 'POST') {
            response.setHeader({ name: 'Content-Type', value: 'application/json' });
            try {
                const body = JSON.parse(request.body);
                let result = [];

                if (action === 'getClientes') {
                    result = searchClientes(user.id);
                } else if (action === 'getFacturas') {
                    result = searchInvoices(body.clienteId);
                } else if (action === 'getArticulos') {
                    result = searchItems(body.facturaId);
                } else if (action === 'saveCase') {
                    result = handleSaveCase(body, user);
                }

                response.write(JSON.stringify(result));
            } catch (e) {
                log.error('POST Error', e);
                response.write(JSON.stringify({ success: false, error: e.message }));
            }
        }
    };

    const handleSaveCase = (data, user) => {
        const caseRec = record.create({ type: record.Type.SUPPORT_CASE, isDynamic: true });
        
        caseRec.setValue({ fieldId: 'company', value: data.clienteId });
        caseRec.setValue({ fieldId: 'profile', value: CONFIG.CASE_PROFILE });
        caseRec.setValue({ fieldId: 'title', value: data.titulo.toUpperCase() });
        caseRec.setValue({ fieldId: 'assigned', value: user.id });
        
        if (data.facturaId) {
            caseRec.setValue({ fieldId: 'transaction', value: data.facturaId });
        }

        const caseId = caseRec.save();
        
        // Notificaciones (Opcional)
        sendAlerts(data, caseId, user);

        return { success: true, id: caseId };
    };

    const sendAlerts = (data, caseId, user) => {
        try {
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            const recUrl = url.resolveRecord({ recordType: record.Type.SUPPORT_CASE, recordId: caseId });
            const fullUrl = `https://\${domain}\${recUrl}`;

            email.send({
                author: user.id,
                recipients: CONFIG.NOTIF_MATRIX.default,
                cc: [CONFIG.EMAIL_CAPTURE],
                replyTo: CONFIG.EMAIL_CAPTURE,
                subject: `Nuevo Caso Registrado: \${data.titulo}`,
                body: `Se ha registrado un nuevo caso.\\nCliente: \${data.clienteNombre}\\nNotas: \${data.observaciones}\\n\\nVer en NetSuite: \${fullUrl}`,
                relatedRecords: { caseId: caseId }
            });
        } catch (e) {
            log.error('Email Error', e);
        }
    };

    // --- HELPERS ---
    const getVendedorInfo = (token) => {
        const s = search.create({
            type: search.Type.EMPLOYEE,
            filters: [[CONFIG.TOKEN_FIELD, 'is', token]],
            columns: ['firstname', 'lastname']
        });
        const r = s.run().getRange({ start: 0, end: 1 });
        return r.length ? { id: r[0].id, nombre: \`\${r[0].getValue('firstname')} \${r[0].getValue('lastname')}\` } : null;
    };

    const searchClientes = (vId) => {
        const res = [];
        search.create({
            type: search.Type.CUSTOMER,
            filters: [['salesrep', 'anyof', vId]],
            columns: ['companyname']
        }).run().each(r => {
            res.push({ id: r.id, nombre: r.getValue('companyname').toUpperCase() });
            return true;
        });
        return res;
    };

    const searchInvoices = (cId) => {
        const res = [];
        search.create({
            type: search.Type.INVOICE,
            filters: [['entity', 'anyof', cId], 'AND', ['mainline', 'is', 'T']],
            columns: ['tranid', 'trandate']
        }).run().each(r => {
            res.push({ id: r.id, text: \`\${r.getValue('tranid')} (\${r.getValue('trandate')})\` });
            return true;
        });
        return res;
    };

    const searchItems = (fId) => {
        const res = [];
        search.create({
            type: search.Type.INVOICE,
            filters: [['internalid', 'anyof', fId], 'AND', ['mainline', 'is', 'F'], 'AND', ['taxline', 'is', 'F']],
            columns: ['item']
        }).run().each(r => {
            res.push({ id: r.getValue('item'), text: r.getText('item') });
            return true;
        });
        return res;
    };

    const getHtmlTemplate = () => \`
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style> .box { background: white; padding: 20px; border-radius: 8px; margin-top: 10px; } </style>
        </head><body>
            <div class="box">
                <h4>Nuevo Caso de Soporte</h4>
                <label>Cliente:</label>
                <select id="clienteId" class="form-control" onchange="loadFacturas()"></select>
                <label>Factura:</label>
                <select id="facturaId" class="form-control" onchange="loadItems()"></select>
                <label>Título:</label>
                <input type="text" id="titulo" class="form-control">
                <label>Observaciones:</label>
                <textarea id="obs" class="form-control"></textarea>
                <button class="btn-primary mt-3" onclick="save()">REGISTRAR CASO</button>
            </div>
            <script>
                const BASE_URL = window.location.href.split('&action=')[0];
                async function load() {
                    const res = await fetch(\`\${BASE_URL}&action=getClientes\`);
                    const data = await res.json();
                    const sel = document.getElementById('clienteId');
                    data.forEach(c => sel.add(new Option(c.nombre, c.id)));
                }
                async function save() {
                    const payload = {
                        clienteId: document.getElementById('clienteId').value,
                        facturaId: document.getElementById('facturaId').value,
                        titulo: document.getElementById('titulo').value,
                        observaciones: document.getElementById('obs').value
                    };
                    const res = await fetch(\`\${BASE_URL}&action=saveCase\`, { method: 'POST', body: JSON.stringify(payload) });
                    const r = await res.json();
                    if(r.success) alert('Caso Creado!');
                }
                load();
            </script>
        </body></html>
    \`;

    return { onRequest };
});
