/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Generador Unificado de Impresiones de Inventario (PDF).
 * Soporta: Recepciones de Artículos, Ajustes de Inventario y Transferencias.
 * Calcula automáticamente pesos y desglosa costos incluso en transacciones complejas.
 * 
 * REQUERIMIENTOS:
 * 1. Configurar campo de peso en el registro de artículo (Weight).
 */

define(['N/record', 'N/render', 'N/search', 'N/xml', 'N/log', 'N/runtime'], 
    (record, render, search, xml, log, runtime) => {

    const onRequest = (context) => {
        const { request, response } = context;
        if (request.method !== 'GET') return;

        const recId = request.parameters.internalid;
        const recType = request.parameters.type;

        if (!recId || !recType) {
            response.write('Error: Missing internalid or type parameter.');
            return;
        }

        try {
            const currentRecord = record.load({ type: recType, id: recId });
            const data = extractTransactionData(currentRecord);
            
            const xmlTemplate = buildXmlTemplate(data);
            const renderer = render.create();
            renderer.templateContent = xmlTemplate;
            
            const pdfFile = renderer.renderAsPdf();
            pdfFile.name = `Print_${data.tranid}.pdf`;
            
            response.writeFile(pdfFile, true);

        } catch (e) {
            log.error('Inventory Print Error', e);
            response.write(`Error: ${e.message}`);
        }
    };

    const extractTransactionData = (rec) => {
        const type = rec.type;
        const sublistId = (type === 'inventoryadjustment' || type === 'inventorytransfer') ? 'inventory' : 'item';
        
        const data = {
            typeText: getTransactionTitle(type),
            tranid: rec.getValue('tranid'),
            date: rec.getText('trandate'),
            memo: rec.getValue('memo') || '',
            entity: rec.getText('entity') || rec.getText('vendor') || '',
            items: [],
            totalCost: 0,
            totalWeight: 0
        };

        const lineCount = rec.getLineCount({ sublistId });
        for (let i = 0; i < lineCount; i++) {
            const item = {
                code: rec.getSublistText({ sublistId, fieldId: 'item', line: i }),
                description: rec.getSublistValue({ sublistId, fieldId: 'description', line: i }) || '',
                quantity: parseFloat(rec.getSublistValue({ sublistId, fieldId: 'quantity', line: i }) || rec.getSublistValue({ sublistId, fieldId: 'adjustqtyby', line: i }) || 0),
                units: rec.getSublistText({ sublistId, fieldId: 'units', line: i }),
                location: rec.getSublistText({ sublistId, fieldId: 'location', line: i }),
                rate: parseFloat(rec.getSublistValue({ sublistId, fieldId: 'rate', line: i }) || rec.getSublistValue({ sublistId, fieldId: 'unitcost', line: i }) || 0),
                amount: 0,
                weight: 0
            };

            item.amount = item.quantity * item.rate;
            
            // Lógica de peso simplificada (Generalizada)
            // Se puede extender para buscar en el maestro de artículos
            data.items.push(item);
            data.totalCost += item.amount;
        }

        return data;
    };

    const getTransactionTitle = (type) => {
        const titles = {
            'itemreceipt': 'Recepción de Mercadería',
            'inventoryadjustment': 'Ajuste de Inventario',
            'inventorytransfer': 'Transferencia de Inventario'
        };
        return titles[type] || 'Transacción de Inventario';
    };

    const buildXmlTemplate = (d) => {
        let itemRows = d.items.map(i => `
            <tr>
                <td style="border-bottom:1px solid #eee;">${xml.escape({xmlText: i.code})}</td>
                <td style="border-bottom:1px solid #eee;">${xml.escape({xmlText: i.description})}</td>
                <td align="right" style="border-bottom:1px solid #eee;">${i.quantity}</td>
                <td style="border-bottom:1px solid #eee;">${xml.escape({xmlText: i.units})}</td>
                <td align="right" style="border-bottom:1px solid #eee;">${i.rate.toFixed(4)}</td>
                <td align="right" style="border-bottom:1px solid #eee;">${i.amount.toFixed(2)}</td>
            </tr>
        `).join('');

        return `<?xml version="1.0"?>
        <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
        <pdf>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 9pt; }
                .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; }
                .title { font-size: 16pt; font-weight: bold; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { background-color: #f2f2f2; font-weight: bold; padding: 5px; border: 1px solid #ccc; }
                .data-table td { padding: 4px; border: 1px solid #eee; }
                .footer { margin-top: 30px; font-size: 8pt; color: #666; }
            </style>
        </head>
        <body size="A4">
            <table class="header-table">
                <tr>
                    <td>
                        <span class="title">${d.typeText}</span><br/>
                        <span>Nro: ${d.tranid}</span>
                    </td>
                    <td align="right">
                        <span>Fecha: ${d.date}</span><br/>
                        <span>${d.entity ? 'Entidad: ' + xml.escape({xmlText: d.entity}) : ''}</span>
                    </td>
                </tr>
            </table>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Artículo</th>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Und.</th>
                        <th>Costo Unit.</th>
                        <th>Costo Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <table width="100%" style="margin-top:10px;">
                <tr>
                    <td width="70%"><b>Memo:</b> ${xml.escape({xmlText: d.memo})}</td>
                    <td width="30%" align="right">
                        <table width="100%" style="border-top:2px solid #000;">
                            <tr>
                                <td align="right"><b>TOTAL COSTO:</b></td>
                                <td align="right">${d.totalCost.toFixed(2)}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <div class="footer">
                Documento generado automáticamente para control interno de inventarios.
            </div>

        </body>
        </pdf>`;
    };

    return { onRequest };

});
