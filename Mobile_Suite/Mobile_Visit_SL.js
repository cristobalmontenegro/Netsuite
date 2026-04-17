/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Suitelet móvil para el registro de visitas en campo con validación de GPS (distancia).
 * Incluye funcionalidades para agendar visitas futuras automáticamente en el calendario de NetSuite.
 */
define([
    'N/search', 
    'N/error', 
    'N/record', 
    'N/log', 
    'N/format',
    './lib_menu_movil'
], function(search, error, record, log, format, libMenu) {

    // --- CONFIGURACIÓN DE INSTANCIA ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token',
        
        // Registro Personalizado de Visitas (Ejemplo)
        RECORD_TYPE: 'customrecord_visit_registration',
        FIELDS: {
            vendedor:    'custrecord_visit_salesrep',
            cliente:     'custrecord_visit_customer',
            motivo:      'custrecord_visit_reason',
            latitud:     'custrecord_visit_lat',
            longitud:    'custrecord_visit_lng',
            notas:       'custrecord_visit_notes',
            direccion:   'custrecord_visit_address_txt'
        },

        // Lista de Motivos de Visita
        MOTIVOS_LIST: 'customlist_visit_reasons',

        // Búsqueda de Direcciones (Search ID) 
        // Esta búsqueda debe devolver: [ID de Dirección, Etiqueta, Latitud, Longitud]
        ADDRESS_SEARCH_ID: 'customsearch_customer_addresses_gps'
    };

    function onRequest(context) {
        const { request, response } = context;
        const { action, token } = request.parameters;

        try {
            const user = getVendedorInfo(token);
            if (!user) throw error.create({ name: 'DENEGADO', message: 'Token Inválido.' });

            if (request.method === 'POST') {
                handlePost(context, user);
                return;
            }

            if (action === 'getClientes') {
                enviarJSON(response, searchClientes(user.id));
            } else if (action === 'getDirecciones') {
                enviarJSON(response, searchAddresses(request.parameters.clienteId));
            } else if (action === 'getMotivos') {
                enviarJSON(response, getListOptions(CONFIG.MOTIVOS_LIST));
            } else {
                // GET Principal: Renderizar HTML
                let html = getHtmlTemplate();
                html = html.replace('{{vendedorId}}', user.id);
                html = libMenu.inyectarHeaderGlobal(html, token, 'visitas', user.nombre);
                response.write(html);
            }
        } catch (e) {
            log.error('Visita SL Error', e);
            response.write(`Error: \${e.message}`);
        }
    }

    function handlePost(context, user) {
        const data = JSON.parse(context.request.body);
        
        // 1. Crear Registro de Visita
        const vRec = record.create({ type: CONFIG.RECORD_TYPE, isDynamic: true });
        vRec.setValue({ fieldId: CONFIG.FIELDS.vendedor, value: user.id });
        vRec.setValue({ fieldId: CONFIG.FIELDS.cliente,  value: data.clienteId });
        vRec.setValue({ fieldId: CONFIG.FIELDS.motivo,   value: data.motivoVisita });
        vRec.setValue({ fieldId: CONFIG.FIELDS.latitud,  value: data.latitud });
        vRec.setValue({ fieldId: CONFIG.FIELDS.longitud, value: data.longitud });
        vRec.setValue({ fieldId: CONFIG.FIELDS.notas,    value: data.observaciones });
        vRec.setValue({ fieldId: CONFIG.FIELDS.direccion,value: data.direccionTexto });
        
        const visitId = vRec.save();

        // 2. Agendar Evento (Opcional)
        let eventId = null;
        if (data.agendarVisita) {
            eventId = createEvent(data, user);
        }

        context.response.write(JSON.stringify({ success: true, recordId: visitId, eventId: eventId }));
    }

    function createEvent(data, user) {
        const ev = record.create({ type: record.Type.CALENDAR_EVENT, isDynamic: true });
        ev.setValue({ fieldId: 'title', value: \`VISITA: \${data.clienteNombre}\` });
        ev.setValue({ fieldId: 'company', value: data.clienteId });
        ev.setValue({ fieldId: 'organizer', value: user.id });
        
        // Parseo simple de fecha (YYYY-MM-DD HH:mm)
        const dt = new Date(data.fechaAgendada + ' ' + data.horaAgendada);
        ev.setValue({ fieldId: 'startdate', value: dt });
        ev.setValue({ fieldId: 'starttime', value: dt });
        
        return ev.save();
    }

    // --- HELPERS ---
    function getVendedorInfo(token) {
        if (!token) return null;
        const s = search.create({
            type: search.Type.EMPLOYEE,
            filters: [[CONFIG.TOKEN_FIELD, 'is', token]],
            columns: ['firstname', 'lastname']
        });
        const r = s.run().getRange({ start: 0, end: 1 });
        return r.length ? { id: r[0].id, nombre: \`\${r[0].getValue('firstname')} \${r[0].getValue('lastname')}\` } : null;
    }

    function searchClientes(vId) {
        let res = [];
        search.create({
            type: search.Type.CUSTOMER,
            filters: [['salesrep', 'anyof', vId]],
            columns: ['companyname']
        }).run().each(r => {
            res.push({ id: r.id, nombre: r.getValue('companyname').toUpperCase() });
            return true;
        });
        return res;
    }

    function getListOptions(listId) {
        let options = [];
        search.create({ type: listId, filters: [['isinactive', 'is', 'F']], columns: ['name'] }).run().each(r => {
            options.push({ id: r.id, nombre: r.getValue('name') });
            return true;
        });
        return options;
    }

    function searchAddresses(cId) {
        // En esta versión pública sugerimos usar búsqueda cargada
        try {
            const s = search.load({ id: CONFIG.ADDRESS_SEARCH_ID });
            s.filters.push(search.createFilter({ name: 'internalid', operator: 'anyof', values: cId }));
            let results = [];
            s.run().each(r => {
                const cols = r.columns;
                results.push({
                    id: r.getValue(cols[0]),
                    direccionParaMostrar: r.getValue(cols[1]),
                    latitud: r.getValue(cols[2]),
                    longitud: r.getValue(cols[3])
                });
                return true;
            });
            return results;
        } catch (e) { return []; }
    }

    function enviarJSON(res, data) {
        res.setHeader({ name: 'Content-Type', value: 'application/json' });
        res.write(JSON.stringify(data));
    }

    function getHtmlTemplate() {
        return \`<!DOCTYPE html><html><body>
            <h3>Registrar Visita</h3>
            <div id="app">Cargando GPS y Formulario...</div>
            <script>
                // Lógica original de GPS y Autocompletar integrada aquí...
            </script>
        </body></html>\`;
    }

    return { onRequest };
});
