/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Portal de Pedidos Avanzado para Móviles. 
 * Permite a los vendedores buscar, filtrar y rastrear el "Pipeline" de sus órdenes de venta 
 * (Aprobación -> Despacho -> Facturación -> Cobro) mediante etiquetas visuales.
 */
define([
    'N/search', 
    'N/record', 
    'N/error', 
    'N/log',
    'N/url', 
    'N/render',
    'N/format',
    './lib_menu_movil.js' 
], function(search, record, error, log, url, render, format, libMenu) {

    // --- CONFIGURACIÓN DE ESTADOS NATIVOS ---
    const CONFIG = {
        // Mapeo selectivo para etiquetas de Pipeline
        STATUS_MAP: {
            'pendingApproval': { label: 'Pend. Aprobar', class: 'badge-red', key: 'aprobar' },
            'pendingFulfillment': { label: 'Pend. Despachar', class: 'badge-yellow', key: 'despachar' },
            'partiallyFulfilled': { label: 'Pend. Despachar (Parcial)', class: 'badge-yellow', key: 'despachar' },
            'pendingBilling': { label: 'Pend. Facturar', class: 'badge-green', key: 'facturar' },
            'billed': { label: 'Pend. Cobrar', class: 'badge-blue', key: 'cobrar' },
            'closed': { label: 'Cerrado', class: 'badge-gray', key: 'cerrado' },
            'cancelled': { label: 'Cancelado', class: 'badge-gray', key: 'cerrado' }
        }
    };

    function onRequest(context) {
        try {
            const token = context.request.parameters.token;
            if (!token) throw error.create({ name: 'ACCESO_DENEGADO', message: 'Acceso no autorizado.' }); 

            const empInfo = getEmployeeByToken(token);
            if (!empInfo) throw error.create({ name: 'TOKEN_INVALIDO', message: 'Token no válido.' }); 

            const action = context.request.parameters.action;

            // 1. ENDPOINTS AJAX
            if (action === 'getOrders') {
                return getOrdersAjax(context, empInfo);
            }
            if (action === 'getOrderDetail') {
                return getOrderDetailAjax(context);
            }
            if (action === 'printPDF') {
                return printPDF(context);
            }

            // 2. RENDERIZADO HTML
            let html = getHtmlTemplate(empInfo, token);
            html = libMenu.inyectarHeaderGlobal(html, token, 'portal_pedidos', empInfo.name);

            context.response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' });
            context.response.write(html);

        } catch (e) {
            log.error('Order Portal Error', e);
            context.response.write('<h1>Error: ' + e.message + '</h1>');
        }
    }

    function getOrdersAjax(context, empInfo) {
        const fi = context.request.parameters.fechaInicio;
        const ff = context.request.parameters.fechaFin;

        let filters = [
            ['salesrep', 'anyof', empInfo.id], 'AND',
            ['mainline', 'is', 'T'], 'AND',
            ['type', 'anyof', 'SalesOrd']
        ];

        if (fi && ff) {
            let nsFi = format.format({ value: new Date(fi.split('-')[0], fi.split('-')[1]-1, fi.split('-')[2]), type: format.Type.DATE });
            let nsFf = format.format({ value: new Date(ff.split('-')[0], ff.split('-')[1]-1, ff.split('-')[2]), type: format.Type.DATE });
            filters.push('AND', ['trandate', 'within', nsFi, nsFf]);
        }

        const soSearch = search.create({
            type: search.Type.SALES_ORDER,
            filters: filters,
            columns: [
                search.createColumn({ name: 'trandate', sort: search.Sort.DESC }), 
                'tranid', 'entity', 'total', 'statusref', 'amountremaining', 'duedate'
            ]
        });

        let results = [];
        soSearch.run().each(res => {
            let statusRef = res.getValue('statusref');
            let amtRem = parseFloat(res.getValue('amountremaining')) || 0;
            
            results.push({
                id: res.id,
                tranid: res.getValue('tranid'),
                fecha: res.getValue('trandate'),
                cliente: res.getText('entity'),
                total: parseFloat(res.getValue('total')) || 0,
                pendiente: amtRem,
                tags: evaluatePipeline(statusRef, amtRem)
            });
            return true;
        });

        sendJsonResponse(context, results);
    }

    function evaluatePipeline(status, pendingAmt) {
        let tags = [];
        let keys = [];

        if (status === 'pendingApproval') {
            tags.push(CONFIG.STATUS_MAP.pendingApproval);
            keys.push('aprobar');
        } else if (status === 'pendingFulfillment' || status === 'partiallyFulfilled') {
            tags.push(CONFIG.STATUS_MAP.pendingFulfillment);
            keys.push('despachar');
            tags.push(CONFIG.STATUS_MAP.pendingBilling);
            keys.push('facturar');
        } else if (status === 'pendingBilling') {
            tags.push(CONFIG.STATUS_MAP.pendingBilling);
            keys.push('facturar');
        }

        if (pendingAmt > 0 && status !== 'cancelled' && status !== 'closed') {
            tags.push(CONFIG.STATUS_MAP.billed); // Pend. Cobrar
            keys.push('cobrar');
        }

        if (status === 'closed' || status === 'cancelled') {
            tags.push(CONFIG.STATUS_MAP[status]);
            keys.push('cerrado');
        }

        if (tags.length === 0) {
            tags.push({ label: '✓ Completado', class: 'badge-gray', key: 'completado' });
            keys.push('completado');
        }

        return { tags: tags, keys: keys };
    }

    // Funciones de utilidad (JSON, PDF, Employee Lookup) omitidas por brevedad en este bloque
    // pero incluidas en el archivo final real.
    
    function sendJsonResponse(context, data) {
        context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
        context.response.write(JSON.stringify(data));
    }

    function getEmployeeByToken(token) {
        const s = search.create({
            type: search.Type.EMPLOYEE,
            filters: [['custentity_mobile_access_token', 'is', token], 'AND', ['isinactive', 'is', 'F']],
            columns: ['firstname', 'lastname']
        });
        const res = s.run().getRange(0, 1);
        return res.length ? { id: res[0].id, name: res[0].getValue('firstname') + ' ' + res[0].getValue('lastname') } : null;
    }

    function getOrderDetailAjax(context) {
        const id = context.request.parameters.orderId;
        const rec = record.load({ type: record.Type.SALES_ORDER, id: id });
        let data = {
            tranid: rec.getValue('tranid'),
            items: []
        };
        for (let i = 0; i < rec.getLineCount('item'); i++) {
            data.items.push({
                name: rec.getSublistText('item', 'item', i),
                qty: rec.getSublistValue('item', 'quantity', i),
                rate: rec.getSublistValue('item', 'rate', i)
            });
        }
        sendJsonResponse(context, data);
    }

    function printPDF(context) {
        const id = context.request.parameters.orderId;
        const pdf = render.transaction({ entityId: parseInt(id), printMode: render.PrintMode.PDF });
        context.response.writeFile(pdf, true);
    }

    function getHtmlTemplate(emp, token) {
        // Reducido para brevedad, similar al proporcionado en la consulta inicial
        return `<html>... Estructura de Portal de Pedidos ...</html>`;
    }

    return { onRequest };
});
