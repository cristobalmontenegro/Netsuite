/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Suitelet para creación de órdenes de venta (pedidos) mediante interfaz móvil.
 * Permite selección de cliente, validación de crédito y carga de artículos con reglas de descuento.
 */
define([
    'N/search', 
    'N/record', 
    'N/error', 
    'N/log',
    'N/email', 
    'N/url', 
    'N/render', 
    './lib_menu_movil'
], function(search, record, error, log, email, url, render, libMenu) {

    // --- CONFIGURACIÓN PARA GENERALIZACIÓN ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token', // Campo de token en el Empleado
        ORDER_FORM:  '107',                           // ID del Formulario de Orden de Venta
        
        // Mapeo de campos personalizados (Ajustar según su instancia)
        FIELDS: {
            sucursal_vendedor: 'custentity_vendedor_sucursal',
            condiciones_pago:  'custbody_condiciones_venta',
            estado_credito:    'custbody_credit_status',
            estado_precio:     'custbody_price_approval_status',
            precio_lista:      'custcol_precio_lista',
            descuento_aplic:   'custcol_descuento_aplicado'
        },

        // Mapeo de sucursales a ubicaciones y gerentes (Ejemplo)
        BRANCH_MAPPING: {
            '1': { location: 101, manager: 19 }, // Sucursal Norte
            '2': { location: 102, manager: 20 }  // Sucursal Sur
        }
    };

    function onRequest(context) {
        try {
            const { request, response } = context;
            const token = request.parameters.token;
            if (!token) throw error.create({ name: 'ACCESO_DENEGADO', message: 'Falta token.' }); 

            const user = getVendedorInfo(token);
            if (!user) throw error.create({ name: 'TOKEN_INVALIDO', message: 'Token no válido.' }); 

            if (request.method === 'POST') {
                handlePost(context, user);
                return;
            }

            const action = request.parameters.action;
            if (action === 'printPDF') {
                handlePrintPDF(context);
            } else if (action === 'getClientes') {
                enviarJSON(response, searchClientes(user.id));
            } else if (action === 'getCustomerData') {
                enviarJSON(response, getCustomerDetails(request.parameters.customerId));
            } else if (action === 'getItemPricing') {
                enviarJSON(response, getItemPricing(request.parameters, user));
            } else if (action === 'buscarArticulos') {
                enviarJSON(response, searchItems(request.parameters.term));
            } else {
                // GET Principal
                let html = generarHTML(user, token);
                html = libMenu.inyectarHeaderGlobal(html, token, 'pedidos', user.nombre);
                response.write(html);
            }

        } catch (e) {
            log.error('Suitelet Error', e);
            context.response.write(`Error: ${e.message}`);
        }
    }

    // --- MANEJO DE POST (CREACIÓN) ---
    function handlePost(context, user) {
        const data = JSON.parse(context.request.body);
        let so = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });

        so.setValue({ fieldId: 'customform', value: CONFIG.ORDER_FORM });
        so.setValue({ fieldId: 'entity', value: data.clienteId });
        
        const branchCfg = CONFIG.BRANCH_MAPPING[user.sucursal];
        if (branchCfg) {
            so.setValue({ fieldId: 'location', value: branchCfg.location });
        }

        so.setValue({ fieldId: 'memo', value: data.memo });
        so.setValue({ fieldId: 'otherrefnum', value: data.otherrefnum });
        so.setValue({ fieldId: 'terms', value: data.termsId });

        data.articulos.forEach(item => {
            so.selectNewLine({ sublistId: 'item' });
            so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.id });
            so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.cantidad });
            so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.precioFinal });
            so.commitLine({ sublistId: 'item' });
        });

        const id = so.save();
        context.response.write(JSON.stringify({ success: true, salesOrderId: id, tranid: 'SO-' + id }));
    }

    // --- BÚSQUEDAS Y HELPER ---
    function searchClientes(vendedorId) {
        let results = [];
        search.create({
            type: search.Type.CUSTOMER,
            filters: [['salesrep', 'anyof', vendedorId], 'AND', ['isinactive', 'is', 'F']],
            columns: ['companyname', 'entityid']
        }).run().each(res => {
            results.push({ id: res.id, nombre: res.getValue('companyname') || res.getValue('entityid') });
            return true;
        });
        return results;
    }

    function getVendedorInfo(token) {
        const s = search.create({ 
            type: search.Type.EMPLOYEE, 
            filters: [[CONFIG.TOKEN_FIELD, 'is', token], 'AND', ['isinactive', 'is', 'F']], 
            columns: ['firstname', 'lastname', CONFIG.FIELDS.sucursal_vendedor] 
        });
        const res = s.run().getRange({ start: 0, end: 1 });
        if (res.length === 0) return null;
        return { 
            id: res[0].id, 
            nombre: (res[0].getValue('firstname') + ' ' + res[0].getValue('lastname')).trim(),
            sucursal: res[0].getValue(CONFIG.FIELDS.sucursal_vendedor)
        };
    }

    function enviarJSON(res, data) {
        res.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
        res.write(JSON.stringify(data));
    }

    function generarHTML(user, token) {
        return `<!DOCTYPE html><html><body>
            <h2>Crear Pedido - \${user.nombre}</h2>
            <div id="app">Cargando Interfaz...</div>
            <script>
                // Lógica de frontend similar a la original pero simplificada para el README
                console.log('Token activo: \${token}');
            </script>
        </body></html>`;
    }

    return { onRequest };
});
