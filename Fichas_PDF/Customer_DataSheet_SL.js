/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Generador de Ficha de Cliente Master en PDF.
 * Consolida información de perfil, calificación RFM, cartera (Aging), 
 * direcciones (Facturación/Envío) y contactos.
 * 
 * REQUERIMIENTOS:
 * 1. Configurar el mapeo de campos personalizados (Mapping Configuration) abajo.
 */
define(['N/record', 'N/render', 'N/xml', 'N/search', 'N/format', 'N/log'], (record, render, xml, search, format, log) => {

    // --- CONFIGURACIÓN DE MAPEOS ---
    const FIELD_MAPPING = {
        DOCUMENT_NUMBER: 'custentity_id_number', // Cédula/RUC
        SCORE: 'custentity_credit_score',
        RANK: 'custentity_customer_rank',
        RFM: 'custentity_rfm_metric',
        DUPONT: 'custentity_dupont_index',
        CANAL: 'custentity_sales_channel',
        SEGMENTO: 'custentity_customer_segment'
    };

    const onRequest = (context) => {
        const { request, response } = context;
        if (request.method !== 'GET') return;

        const customerId = request.parameters.id;
        if (!customerId) {
            response.write('ERROR: Missing parameter &id=XXX');
            return;
        }

        try {
            const customerRec = record.load({ type: record.Type.CUSTOMER, id: customerId });
            
            const profile = extractProfile(customerRec);
            const aging = calculateAging(customerId, customerRec);
            const addresses = extractAddresses(customerRec);
            const contacts = extractContacts(customerRec);

            const xmlTemplate = buildXml(profile, aging, addresses, contacts);

            const renderer = render.create();
            renderer.templateContent = xmlTemplate;
            const pdfFile = renderer.renderAsPdf();

            pdfFile.name = `Ficha_Cliente_${customerId}.pdf`;
            response.writeFile(pdfFile, true);

        } catch (e) {
            log.error('Customer DataSheet Error', e);
            response.write(`Error: ${e.message}`);
        }
    };

    // --- EXTRACCIÓN DE DATOS ---

    const esc = (val) => {
        if (val === null || val === undefined || val === '') return '-';
        return xml.escape({ xmlText: String(val) });
    };

    const fmtNum = (val) => {
        let n = parseFloat(val);
        if (isNaN(n)) return '0.00';
        return n.toLocaleString('en-US', { minimumFractionDigits: 2 });
    };

    const extractProfile = (rec) => {
        const getV = (fid) => esc(rec.getText(fid) || rec.getValue(fid));
        return {
            name: getV('companyname'),
            id: getV('entityid'),
            docNum: getV(FIELD_MAPPING.DOCUMENT_NUMBER),
            status: getV('entitystatus'),
            email: getV('email'),
            phone: getV('phone'),
            terms: getV('terms'),
            creditLimit: fmtNum(rec.getValue('creditlimit')),
            balance: fmtNum(rec.getValue('balance')),
            salesRep: getV('salesrep'),
            score: getV(FIELD_MAPPING.SCORE),
            rank: getV(FIELD_MAPPING.RANK)
        };
    };

    const calculateAging = (id, rec) => {
        let buckets = { current: 0, p30: 0, p60: 0, p90: 0, over90: 0 };
        try {
            search.create({
                type: search.Type.TRANSACTION,
                filters: [['entity', 'anyof', id], 'AND', ['mainline', 'is', 'T'], 'AND', ['status', 'anyof', ['CustInvc:A']]],
                columns: ['daysoverdue', 'amountremaining']
            }).run().each(res => {
                let days = parseInt(res.getValue('daysoverdue') || 0);
                let amount = parseFloat(res.getValue('amountremaining') || 0);
                if (days <= 0) buckets.current += amount;
                else if (days <= 30) buckets.p30 += amount;
                else if (days <= 60) buckets.p60 += amount;
                else if (days <= 90) buckets.p90 += amount;
                else buckets.over90 += amount;
                return true;
            });
        } catch (e) {}

        return {
            balance: fmtNum(rec.getValue('balance')),
            overdue: fmtNum(rec.getValue('overduebalance')),
            detail: buckets
        };
    };

    const extractAddresses = (rec) => {
        let bill = '', ship = '';
        const count = rec.getLineCount('addressbook');
        for (let i = 0; i < count; i++) {
            const isBill = rec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', line: i });
            const isShip = rec.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', line: i });
            if (isBill) bill = esc(rec.getSublistValue({ sublistId: 'addressbook', fieldId: 'addrtext', line: i }));
            if (isShip) ship = esc(rec.getSublistValue({ sublistId: 'addressbook', fieldId: 'addrtext', line: i }));
        }
        return { bill, ship };
    };

    const extractContacts = (rec) => {
        let list = [];
        const count = rec.getLineCount('contactroles');
        for (let i = 0; i < count; i++) {
            list.push({
                name: esc(rec.getSublistText({ sublistId: 'contactroles', fieldId: 'contact', line: i })),
                email: esc(rec.getSublistValue({ sublistId: 'contactroles', fieldId: 'email', line: i })),
                phone: esc(rec.getSublistValue({ sublistId: 'contactroles', fieldId: 'phone', line: i })),
                title: esc(rec.getSublistValue({ sublistId: 'contactroles', fieldId: 'title', line: i }))
            });
        }
        return list;
    };

    // --- XML / PDF ---
    const buildXml = (p, a, addr, contacts) => {
        let contactRows = contacts.map(c => `<tr><td>${c.name}</td><td>${c.title}</td><td>${c.email}</td><td>${c.phone}</td></tr>`).join('');
        return `<?xml version="1.0"?>
        <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
        <pdf>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 8pt; }
                .header { border-bottom: 2px solid #336699; margin-bottom: 10px; }
                .section-title { background-color: #f2f2f2; font-weight: bold; padding: 4px; border-bottom: 1px solid #ccc; margin-top: 10px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                td { padding: 3px; vertical-align: top; }
                .label { font-weight: bold; color: #666; width: 25%; }
                .aging-table td { text-align: center; border: 1px solid #eee; padding: 5px; }
            </style>
        </head>
        <body size="A4">
            <div class="header">
                <table style="border:none;">
                    <tr>
                        <td>
                            <span style="font-size:16pt; font-weight:bold;">${p.name}</span><br/>
                            <span style="font-size:10pt;">ID: ${p.id} | Identificación: ${p.docNum}</span>
                        </td>
                        <td align="right">
                            <span style="color:#666;">Ficha de Cliente Master</span>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="section-title">Información de Perfil</div>
            <table>
                <tr>
                    <td class="label">Estado</td><td>${p.status}</td>
                    <td class="label">Vendedor</td><td>${p.salesRep}</td>
                </tr>
                <tr>
                    <td class="label">Email</td><td>${p.email}</td>
                    <td class="label">Teléfono</td><td>${p.phone}</td>
                </tr>
            </table>

            <div class="section-title">Crédito y Cartera</div>
            <table>
                <tr>
                    <td class="label">Términos</td><td>${p.terms}</td>
                    <td class="label">Límite Crédito</td><td>${p.creditLimit}</td>
                </tr>
                <tr>
                    <td class="label">Saldo Total</td><td style="font-weight:bold;">${p.balance}</td>
                    <td class="label">Vencido</td><td style="color:#cc0000; font-weight:bold;">${a.overdue}</td>
                </tr>
            </table>

            <div style="margin-top:5px;">
                <table class="aging-table">
                    <tr style="background-color:#fafafa; font-weight:bold;">
                        <td>Corriente</td><td>1-30 Días</td><td>31-60 Días</td><td>61-90 Días</td><td>+90 Días</td>
                    </tr>
                    <tr>
                        <td>${fmtNum(a.detail.current)}</td>
                        <td>${fmtNum(a.detail.p30)}</td>
                        <td>${fmtNum(a.detail.p60)}</td>
                        <td>${fmtNum(a.detail.p90)}</td>
                        <td style="color:red;">${fmtNum(a.detail.over90)}</td>
                    </tr>
                </table>
            </div>

            <div class="section-title">Direcciones Principales</div>
            <table style="table-layout:fixed;">
                <tr>
                    <td style="width:50%; border-right:1px solid #eee;">
                        <b>Facturación:</b><br/>${addr.bill}
                    </td>
                    <td style="width:50%;">
                        <b>Envío:</b><br/>${addr.ship}
                    </td>
                </tr>
            </table>

            <div class="section-title">Contactos Relacionados</div>
            <table>
                <tr style="font-weight:bold; border-bottom:1px solid #eee;">
                    <td>Nombre</td><td>Cargo</td><td>Email</td><td>Teléfono</td>
                </tr>
                ${contactRows || '<tr><td colspan="4">Sin contactos.</td></tr>'}
            </table>
        </body>
        </pdf>`;
    };

    return { onRequest };
});