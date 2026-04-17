/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Suitelet universal para la generación de Comprobantes Contables con Impacto Contable (GL Impact).
 * Diseñado para cubrir "todo el abanico que mueve plata" en NetSuite.
 * Soporta: Pagos (CLI/PROV), Cheques, Depósitos, Transferencias, Reembolsos y Asientos.
 */
define(['N/record', 'N/render', 'N/search', 'N/file', 'N/log', 'N/format'],
    (record, render, search, file, log, format) => {

    const CONFIG = {
        COMPANY_NAME: 'SU EMPRESA S.A.'
    };

    const onRequest = (context) => {
        const { request, response } = context;
        if (request.method !== 'GET') return;

        const recordId = request.parameters.recordId;
        const recordType = request.parameters.recordType || record.Type.VENDOR_PAYMENT;

        if (!recordId) {
            response.write('Error: ID de registro no proporcionado.');
            return;
        }

        try {
            const rec = record.load({ type: recordType, id: recordId, isDynamic: true });
            const subsidiaryId = rec.getValue('subsidiary');
            const subsidiaryRec = record.load({ type: record.Type.SUBSIDIARY, id: subsidiaryId });

            // 1. Obtener Líneas Aplicadas (Facturas cubiertas en Pagos/Reembolsos)
            const appliedLines = [];
            const sublistIds = ['apply', 'reimbursements']; // Diferentes sublistas segun el tipo
            
            sublistIds.forEach(subId => {
                if (hasSublist(rec, subId)) {
                    const count = rec.getLineCount({ sublistId: subId });
                    for (let i = 0; i < count; i++) {
                        if (rec.getSublistValue({ sublistId: subId, fieldId: 'apply', line: i })) {
                            appliedLines.push({
                                refnum: escapeXml(rec.getSublistValue({ sublistId: subId, fieldId: 'refnum', line: i }) || rec.getSublistValue({ sublistId: subId, fieldId: 'doc', line: i })),
                                total: formatCurrency(rec.getSublistValue({ sublistId: subId, fieldId: 'total', line: i })),
                                disc: formatCurrency(rec.getSublistValue({ sublistId: subId, fieldId: 'disc', line: i })),
                                amount: formatCurrency(rec.getSublistValue({ sublistId: subId, fieldId: 'amount', line: i }))
                            });
                        }
                    }
                }
            });

            // 2. Obtener Impacto Contable (GL Impact) - EL CORAZÓN DEL SCRIPT
            const glLines = [];
            let totalDebit = 0, totalCredit = 0;
            search.create({
                type: search.Type.TRANSACTION,
                filters: [['internalid', 'anyof', recordId], 'AND', ['posting', 'is', 'T']],
                columns: ['account', 'debitamount', 'creditamount', 'memo']
            }).run().each(res => {
                const d = parseFloat(res.getValue('debitamount')) || 0;
                const c = parseFloat(res.getValue('creditamount')) || 0;
                glLines.push({
                    account: escapeXml(res.getText('account')),
                    memo: escapeXml(res.getValue('memo')),
                    debit: d > 0 ? formatCurrency(d) : '',
                    credit: c > 0 ? formatCurrency(c) : ''
                });
                totalDebit += d; totalCredit += c;
                return true;
            });

            // 3. Normalizar Datos por Tipo de Transacción Financiera
            const data = {
                title: getFinancialTitle(recordType, rec),
                companyName: CONFIG.COMPANY_NAME,
                entity: escapeXml(rec.getText('entity') || rec.getText('vendor') || rec.getText('customer') || 'N/A'),
                subsidiary: escapeXml(rec.getText('subsidiary')),
                tranid: rec.getValue('tranid') || rec.getValue('transactionnumber') || rec.getValue('number'),
                trandate: rec.getText('trandate'),
                total: formatCurrency(rec.getValue('total') || rec.getValue('amount') || totalDebit),
                account: escapeXml(rec.getText('account') || rec.getText('aracct') || 'Detalle Contable'),
                appliedLines: appliedLines,
                glLines: glLines,
                totalDebit: formatCurrency(totalDebit),
                totalCredit: formatCurrency(totalCredit),
                showApplied: appliedLines.length > 0
            };

            // 4. Renderizado Final
            const renderer = render.create();
            renderer.templateContent = getXmlTemplate(); 
            renderer.addRecord({ templateName: 'subsidiary', record: subsidiaryRec });
            renderer.addCustomDataSource({ format: render.DataSource.JSON, alias: 'data', data: JSON.stringify(data) });

            const pdf = render.xmlToPdf({ xmlString: renderer.renderAsString() });
            response.setHeader({ name: 'Content-Type', value: 'application/pdf' });
            response.write(pdf.getContents());

        } catch (e) {
            log.error('Financial Voucher Error', e);
            response.write(`Error: \${e.message}`);
        }
    };

    const hasSublist = (rec, id) => rec.getSublists().indexOf(id) !== -1;
    const formatCurrency = (val) => format.format({ value: val || 0, type: format.Type.CURRENCY });
    const escapeXml = (str) => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

    function getFinancialTitle(type, rec) {
        const titles = {
            [record.Type.VENDOR_PAYMENT]: 'COMPROBANTE DE EGRESO',
            [record.Type.CUSTOMER_PAYMENT]: 'COMPROBANTE DE INGRESO',
            [record.Type.CHECK]: 'COMPROBANTE DE PAGO (CHEQUE)',
            [record.Type.CUSTOMER_REFUND]: 'REEMBOLSO A CLIENTE',
            [record.Type.DEPOSIT]: 'COMPROBANTE DE DEPÓSITO',
            [record.Type.TRANSFER]: 'TRANSFERENCIA DE FONDOS',
            [record.Type.JOURNAL_ENTRY]: 'ASIENTO CONTABLE'
        };
        
        let title = titles[type] || 'COMPROBANTE FINANCIERO';
        
        // Detección especial de Amortizaciones
        if (type === record.Type.JOURNAL_ENTRY) {
            const memo = String(rec.getValue('memo')).toLowerCase();
            if (memo.includes('amortiza')) title = 'COMPROBANTE DE AMORTIZACIÓN';
        }
        
        return title;
    }

    function getXmlTemplate() {
        return \`<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
        <pdf>
        <head>
            <style type="text/css">
                * { font-family: sans-serif; font-size: 8pt; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background-color: #f2f2f2; font-weight: bold; border-bottom: 1px solid black; padding: 4px; }
                td { border-bottom: 1px solid #eee; padding: 4px; vertical-align: top; }
                .title { font-size: 16pt; font-weight: bold; }
            </style>
        </head>
        <body size="A4">
            <table width="100%">
                <tr>
                    <td><div class="title">\${data.title}</div><div>\${data.companyName}</div></td>
                    <td align="right"><#if subsidiary.logo?has_content><img src="\${subsidiary.logo@url}" style="width:100px;" /></#if></td>
                </tr>
            </table>

            <table style="margin-top:20px; background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd;">
                <tr><td width="50%"><b>Entidad:</b> \${data.entity}</td><td width="50%"><b>Referencia:</b> \${data.tranid}</td></tr>
                <tr><td><b>Fecha:</b> \${data.trandate}</td><td><b>Monto Total:</b> \${data.total}</td></tr>
                <tr><td colspan="2"><b>Cuenta Principal:</b> \${data.account}</td></tr>
            </table>

            <#if data.showApplied>
                <div style="font-weight:bold; margin-top:15px; border-bottom: 1px solid #333;">DETALLE DE APLICACIÓN</div>
                <table>
                    <thead><tr><th>Ref</th><th align="right">Total</th><th align="right">Puntual</th></tr></thead>
                    <#list data.appliedLines as line>
                        <tr><td>\${line.refnum}</td><td align="right">\${line.total}</td><td align="right">\${line.amount}</td></tr>
                    </#list>
                </table>
            </#if>

            <div style="font-weight:bold; margin-top:20px; border-bottom: 1px solid #333;">DETALLE DE ASIENTO (GL IMPACT)</div>
            <table>
                <thead><tr><th width="40%">Cuenta</th><th width="30%">Memo</th><th align="right">DÉBITO</th><th align="right">CRÉDITO</th></tr></thead>
                <#list data.glLines as gl>
                    <tr><td>\${gl.account}</td><td><i>\${gl.memo}</i></td><td align="right">\${gl.debit}</td><td align="right">\${gl.credit}</td></tr>
                </#list>
                <tr style="background-color:#f2f2f2; font-weight:bold;">
                    <td colspan="2" align="right">TOTALES</td><td align="right">\${data.totalDebit}</td><td align="right">\${data.totalCredit}</td>
                </tr>
            </table>

            <table style="margin-top: 60px;">
                <tr>
                    <td align="center" style="border:none;"><br/><br/>__________________<br/>Elaborado</td>
                    <td align="center" style="border:none;"><br/><br/>__________________<br/>Contador</td>
                    <td align="center" style="border:none;"><br/><br/>__________________<br/>Autorizado</td>
                </tr>
            </table>
        </body>
        </pdf>\`;
    }

    return { onRequest };
});
