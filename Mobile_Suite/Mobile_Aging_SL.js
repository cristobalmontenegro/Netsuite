/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Reporte de Cartera Móvil (Aging Report) para Vendedores.
 * Utiliza SuiteQL para obtener un desglose de facturas pendientes, saldos y cheques vinculados.
 */
define([
    'N/query', 
    'N/log', 
    'N/search', 
    'N/format',
    './lib_menu_movil'
], function(query, log, search, format, libMenu) {

    // --- CONFIGURACIÓN DE INSTANCIA ---
    const CONFIG = {
        TOKEN_FIELD: 'custentity_mobile_access_token', // Campo de token en el Empleado
        
        // Mapeo de Registros de Cartera (Ajustar IDs según su esquema de personalización)
        RECORDS: {
            CHEQUES_LINK: 'customrecord_cheque_invoice_link', // Registro que une Fac -> Chq
            CHEQUES:      'customrecord_cheque_data'          // Registro de datos del cheque
        },

        // Mapeo de Campos
        FIELDS: {
            link_factura:     'custrecord_link_invoice',
            link_cheque:      'custrecord_link_cheque',
            cheque_numero:    'custrecord_chq_num',
            cheque_fecha:     'custrecord_chq_date_due',
            cheque_deposito:  'custrecord_chq_date_deposited',
            monto_aplicado:   'custrecord_amount_applied',
            cliente_condicion:'custentity_credit_condition',
            cliente_cartera:  'custentity_aging_type'
        }
    };

    function onRequest(context) {
        try {
            const params = context.request.parameters;
            const token = params.token;
            if (!token) throw error.create({ name: 'DENEGADO', message: 'Falta Token.' });

            const user = getVendedorInfo(token);
            if (!user) throw error.create({ name: 'INVALIDO', message: 'Token Inválido.' });

            let state = {
                token: token,
                vendedorId: user.id,
                vendedorNombre: user.nombre,
                clienteId: params.cliente || '',
                estado_pago: params.estado_pago || 'PENDIENTE'
            };

            if (!state.clienteId) {
                renderSeleccion(context, state);
            } else {
                renderReporte(context, state);
            }

        } catch (e) {
            log.error('Suitelet Error', e);
            context.response.write(`Error: ${e.message}`);
        }
    }

    function renderSeleccion(context, state) {
        const clientes = getClientes(state.vendedorId);
        let html = `<!DOCTYPE html><html><body>
            <h3>Seleccionar Cliente</h3>
            <form method="POST">
                <input type="hidden" name="token" value="\${state.token}">
                <select name="cliente" class="form-control">
                    \${clientes.map(c => \`<option value="\${c.id}">\${c.nombre}</option>\`).join('')}
                </select>
                <button type="submit" class="btn-primary">Ver Cartera</button>
            </form>
        </body></html>`;
        
        html = libMenu.inyectarHeaderGlobal(html, state.token, 'cartera', state.vendedorNombre);
        context.response.write(html);
    }

    function renderReporte(context, state) {
        const data = getCarteraData(state);
        let html = `<!DOCTYPE html><html><body>
            <h3>Cartera de Cliente</h3>
            <div class="summary">Total Saldo: $\${data.totals.saldo.toFixed(2)}</div>
            <div class="list">
                \${data.rows.map(r => \`
                    <div class="card">
                        <b>\${r.doc}</b> - Vence: \${r.vence}<br>
                        Saldo: $\${r.saldo.toFixed(2)}
                    </div>
                \`).join('')}
            </div>
        </body></html>`;

        html = libMenu.inyectarHeaderGlobal(html, state.token, 'cartera', state.vendedorNombre);
        context.response.write(html);
    }

    function getCarteraData(state) {
        // SuiteQL dinámico basado en CONFIG
        let sql = \`
            SELECT
                t.tranid,
                TO_CHAR(t.trandate, 'YYYY-MM-DD') as fecha,
                TO_CHAR(t.duedate, 'YYYY-MM-DD') as vence,
                (t.foreigntotal - t.foreignamountpaid) as saldo
            FROM Transaction t
            WHERE t.type = 'CustInvc' AND t.entity = \${state.clienteId}
            AND (t.foreigntotal - t.foreignamountpaid) > 0.01
            ORDER BY t.trandate DESC
        \`;
        
        let results = query.runSuiteQL({ query: sql }).asMappedResults();
        let totalSaldo = 0;
        results.forEach(r => totalSaldo += parseFloat(r.saldo));

        return { rows: results, totals: { saldo: totalSaldo } };
    }

    function getClientes(vendedorId) {
        let items = [];
        search.create({
            type: search.Type.CUSTOMER,
            filters: [['salesrep', 'anyof', vendedorId]],
            columns: ['companyname']
        }).run().each(res => {
            items.push({ id: res.id, nombre: res.getValue('companyname') });
            return true;
        });
        return items;
    }

    function getVendedorInfo(token) {
        const s = search.create({ 
            type: search.Type.EMPLOYEE, 
            filters: [[CONFIG.TOKEN_FIELD, 'is', token]], 
            columns: ['firstname', 'lastname'] 
        });
        const r = s.run().getRange({ start: 0, end: 1 });
        return r.length ? { id: r[0].id, nombre: r[0].getValue('firstname') + ' ' + r[0].getValue('lastname') } : null;
    }

    return { onRequest };
});
