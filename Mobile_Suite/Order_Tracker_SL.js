/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Portal móvil para que los vendedores consulten el estado y detalle de sus pedidos.
 * Proporciona visibilidad del pipeline: Aprobación, Despacho, Facturación y Cobro.
 */
define([
    'N/search', 
    'N/record', 
    'N/error', 
    'N/log',
    'N/url', 
    'N/render',
    'N/format',
    './lib_menu_movil' 
], function(search, record, error, log, url, render, format, libMenu) {

    // --- CONFIGURACIÓN ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token', // Campo de token en el Empleado
        // IDs de campos personalizados de estado (si existen en el reporte de movilidad)
        FIELDS: {
            estado_credito: 'custbody_credit_status', 
            estado_precio:  'custbody_price_approval_status'
        }
    };

    function onRequest(context) {
        try {
            const token = context.request.parameters.token;
            if (!token) throw error.create({ name: 'ACCESO_DENEGADO', message: 'Acceso no autorizado.' }); 

            const vendedorInfo = getVendedorInfo(token);
            if (!vendedorInfo) throw error.create({ name: 'TOKEN_INVALIDO', message: 'Token no válido.' }); 

            const action = context.request.parameters.action;

            // ==========================================
            // 1. ENDPOINTS DE DATOS (AJAX)
            // ==========================================

            if (action === 'getPedidos') {
                const fechaInicio = context.request.parameters.fechaInicio;
                const fechaFin = context.request.parameters.fechaFin;

                let filtros = [
                    ['salesrep', 'anyof', vendedorInfo.id], 'AND',
                    ['mainline', 'is', 'T'], 'AND',
                    ['type', 'anyof', 'SalesOrd']
                ];

                if (fechaInicio && fechaFin) {
                    let nsFechaInicio = format.format({ value: parseDate(fechaInicio), type: format.Type.DATE });
                    let nsFechaFin = format.format({ value: parseDate(fechaFin), type: format.Type.DATE });
                    filtros.push('AND', ['trandate', 'within', nsFechaInicio, nsFechaFin]);
                } else {
                    filtros.push('AND', ['trandate', 'within', 'daysago7', 'daysago0']); 
                }

                const searchPedidos = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: filtros,
                    columns: [
                        { name: 'trandate', sort: search.Sort.DESC }, 
                        { name: 'internalid', sort: search.Sort.DESC },
                        'tranid', 'entity', 'total', 'statusref', 'memo', 'duedate',
                        CONFIG.FIELDS.estado_credito, CONFIG.FIELDS.estado_precio
                    ]
                });

                let soIds = [];
                let pedidosMap = {};
                let pedidosArray = [];

                searchPedidos.run().each(function(res) {
                    let id = res.id;
                    soIds.push(id);
                    let totalVal = parseFloat(res.getValue('total')) || 0;
                    
                    let soData = {
                        id: id,
                        tranid: res.getValue('tranid'),
                        fecha: res.getValue('trandate'),
                        clienteText: res.getText('entity'),
                        total: totalVal,
                        memo: res.getValue('memo') || '',
                        statusRef: res.getValue('statusref'),
                        estadoCredito: res.getValue(CONFIG.FIELDS.estado_credito),
                        estadoPrecio: res.getValue(CONFIG.FIELDS.estado_precio),
                        fechaVencimiento: res.getValue('duedate') || '',
                        pendientePago: totalVal, 
                        tieneFacturas: false
                    };

                    pedidosMap[id] = soData;
                    pedidosArray.push(soData);
                    return true;
                });

                // Cálculo de Por Cobrar (Facturas vinculadas)
                if (soIds.length > 0) {
                    search.create({
                        type: search.Type.INVOICE,
                        filters: [['createdfrom', 'anyof', soIds], 'AND', ['mainline', 'is', 'T']],
                        columns: ['createdfrom', 'amountremaining', 'duedate']
                    }).run().each(function(res) {
                        let soId = res.getValue('createdfrom');
                        let amtRemaining = parseFloat(res.getValue('amountremaining')) || 0;
                        if (pedidosMap[soId]) {
                            if (!pedidosMap[soId].tieneFacturas) {
                                pedidosMap[soId].pendientePago = 0; 
                                pedidosMap[soId].tieneFacturas = true;
                                if (res.getValue('duedate')) pedidosMap[soId].fechaVencimiento = res.getValue('duedate'); 
                            }
                            pedidosMap[soId].pendientePago += amtRemaining;
                        }
                        return true;
                    });
                }

                pedidosArray.forEach(p => {
                    p.multiEstados = evaluarEstados(p.statusRef, p.estadoCredito, p.estadoPrecio, p.pendientePago);
                });

                enviarJSON(context, pedidosArray);
                return;
            }

            if (action === 'getDetallePedido') {
                const orderId = context.request.parameters.orderId;
                const rec = record.load({ type: record.Type.SALES_ORDER, id: orderId });
                let details = {
                    tranid: rec.getValue('tranid'), trandate: rec.getText('trandate'),
                    clienteText: rec.getText('entity'), articulos: []
                };
                const lineCount = rec.getLineCount({ sublistId: 'item' });
                for (let i = 0; i < lineCount; i++) {
                    details.articulos.push({
                        itemText: rec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                        cantidad: rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }),
                        precioUnitario: rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }),
                        subtotal: rec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })
                    });
                }
                enviarJSON(context, details);
                return;
            }

            // GET Principal: Renderizar Interfaz
            let html = generarHTML(vendedorInfo, token);
            html = libMenu.inyectarHeaderGlobal(html, token, 'mis_pedidos', vendedorInfo.nombre);
            context.response.write(html);

        } catch (e) {
            log.error('Error Suitelet', e);
            context.response.write(`Error: ${e.message}`);
        }
    }

    // --- LÓGICA DE ESTADOS ---
    function evaluarEstados(status, credito, precio, pendiente) {
        let tags = [];
        if (status === 'cancelled' || status === 'closed') {
            return { tags: [{ label: 'Finalizado/Cerrado', class: 'badge-gray' }], filterKeys: ['cerrado'] };
        }
        if (status === 'pendingApproval') {
            return { tags: [{ label: 'Pend. Aprobación', class: 'badge-red' }], filterKeys: ['aprobar'] };
        }
        if (status !== 'pendingBilling' && status !== 'fullyBilled' && status !== 'billed') {
            tags.push({ label: 'Pend. Despacho', class: 'badge-yellow' });
        }
        if (status !== 'fullyBilled' && status !== 'billed') {
            tags.push({ label: 'Pend. Facturar', class: 'badge-green' });
        }
        if (pendiente > 0) {
            tags.push({ label: 'Pend. Cobro', class: 'badge-blue' });
        }
        return { tags: tags, filterKeys: tags.map(t => t.label) };
    }

    function parseDate(str) {
        let p = str.split('-');
        return new Date(p[0], p[1] - 1, p[2]);
    }

    function enviarJSON(c, d) {
        c.response.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
        c.response.write(JSON.stringify(d));
    }

    function getVendedorInfo(token) {
        const empSearch = search.create({ 
            type: search.Type.EMPLOYEE, 
            filters: [[CONFIG.TOKEN_FIELD, 'is', token], 'AND', ['isinactive', 'is', 'F']], 
            columns: ['firstname', 'lastname'] 
        });
        const res = empSearch.run().getRange({ start: 0, end: 1 });
        return res.length > 0 ? { id: res[0].id, nombre: (res[0].getValue('firstname') + ' ' + res[0].getValue('lastname')).trim() } : null;
    }

    function generarHTML(vendedor) {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            .card { background: white; border-radius: 8px; padding: 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 5px; color: white; }
            .badge-red { background: #dc3545; } .badge-yellow { background: #ffc107; color: #333; } 
            .badge-green { background: #28a745; } .badge-blue { background: #007bff; } .badge-gray { background: #6c757d; }
        </style></head><body>
            <div id="pedidosContainer">Cargando...</div>
            <script>
                const BASE_URL = window.location.href.split('&action=')[0];
                async function load() {
                    const res = await fetch(\`\${BASE_URL}&action=getPedidos\`);
                    const data = await res.json();
                    document.getElementById('pedidosContainer').innerHTML = data.map(p => \`
                        <div class="card">
                            <div class="fw-bold">\${p.tranid} - \${p.fecha}</div>
                            <div class="text-secondary small">\${p.clienteText}</div>
                            <div class="mt-2">\${p.multiEstados.tags.map(t => \`<span class="badge \${t.class}">\${t.label}</span>\`).join('')}</div>
                            <div class="mt-2 text-end fw-bold">Total: $\${p.total}</div>
                        </div>
                    \`).join('');
                }
                load();
            </script>
        </body></html>`;
    }

    return { onRequest };
});
