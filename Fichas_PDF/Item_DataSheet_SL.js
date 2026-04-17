/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Generador de Fichas Técnicas Profesionales en PDF para Artículos.
 * Incluye secciones de Clasificación, Características, Inventario y Ventas.
 * Soporta códigos de barras y descripciones detalladas en HTML.
 * 
 * REQUERIMIENTOS:
 * 1. Configurar el mapeo de campos personalizados (Mapping Configuration) abajo.
 */
define(['N/record', 'N/render', 'N/xml', 'N/log'], (record, render, xml, log) => {

    // --- CONFIGURACIÓN DE MAPEOS ---
    // Reemplace estos IDs con los IDs de sus campos personalizados en NetSuite
    const FIELD_MAPPING = {
        GRAMAJE: 'custitem_custom_grammage',
        ALTURA: 'custitem_custom_height',
        ANCHO: 'custitem_custom_width',
        LARGO: 'custitem_custom_depth',
        ORIGEN: 'custitem_custom_origin',
        SEGMENTO: 'custitem_custom_segment',
        MARCA: 'custitem_custom_brand',
        MODELO: 'custitem_custom_model'
    };

    const onRequest = (context) => {
        const { request, response } = context;
        const itemId = request.parameters.id;

        if (!itemId) {
            response.write('ERROR: Missing internalid parameter (&id=XXX)');
            return;
        }

        try {
            // 1. CARGAR REGISTRO
            const itemRecord = loadItemRecord(itemId);
            if (!itemRecord) {
                response.write('ERROR: Item not found.');
                return;
            }

            // 2. HELPERS DE EXTRACCIÓN
            const getVal = (fieldId) => {
                let val = itemRecord.getText({ fieldId }) || itemRecord.getValue({ fieldId });
                if (val === null || val === undefined || val === '') return ' '; 
                return xml.escape({ xmlText: String(val) });
            };

            const getHtmlVal = (fieldId) => {
                let val = itemRecord.getValue({ fieldId });
                if (!val) return '<span style="color:#999; font-style:italic;">Sin información.</span>';
                return xml.escape({ xmlText: String(val) }).replace(/\n/g, '<br/>');
            };

            const itemName = getVal('itemid');
            const fileName = `Ficha_${itemName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

            // 3. CONSTRUCCIÓN DE XML PARA PDF
            let xmlTemplate = `<?xml version="1.0"?>
            <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
            <pdf>
            <head>
                <style>
                    body { font-family: Helvetica, sans-serif; font-size: 9pt; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    .header { border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 20px; }
                    .title { font-size: 18pt; font-weight: bold; color: #003366; }
                    .section-title { background-color: #f2f2f2; font-weight: bold; font-size: 10pt; padding: 5px; border-bottom: 1px solid #ccc; margin-top: 10px; text-transform: uppercase; }
                    .label { font-size: 7pt; color: #666; font-weight: bold; text-transform: uppercase; }
                    .value { font-size: 10pt; padding-top: 2px; }
                    .col { width: 50%; padding: 5px; }
                </style>
            </head>
            <body size="A4">
                <div class="header">
                    <table style="border:none;">
                        <tr>
                            <td>
                                <span class="title">${getVal('itemid')}</span><br/>
                                <span style="font-size:11pt; color:#666;">${getVal('displayname')}</span>
                            </td>
                            <td align="right">
                                <barcode codetype="code128" showtext="true" value="${getVal('upccode')}" height="40" width="150"/>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="section-title">1. Especificaciones Técnicas</div>
                <table>
                    <tr>
                        <td class="col"><span class="label">Categoría</span><br/><span class="value">${getVal('class')}</span></td>
                        <td class="col"><span class="label">Marca / Segmento</span><br/><span class="value">${getVal(FIELD_MAPPING.MARCA)} / ${getVal(FIELD_MAPPING.SEGMENTO)}</span></td>
                    </tr>
                    <tr>
                        <td class="col"><span class="label">Dimensiones (AxLxL)</span><br/><span class="value">${getVal(FIELD_MAPPING.ANCHO)} x ${getVal(FIELD_MAPPING.LARGO)} x ${getVal(FIELD_MAPPING.ALTURA)}</span></td>
                        <td class="col"><span class="label">Peso</span><br/><span class="value">${getVal('weight')} ${getVal('weightunit')}</span></td>
                    </tr>
                </table>

                <div class="section-title">2. Información Comercial</div>
                <table>
                    <tr>
                        <td class="col"><span class="label">Descripción de Venta</span><br/><span class="value">${getVal('salesdescription')}</span></td>
                        <td class="col"><span class="label">Unidad de Medida</span><br/><span class="value">${getVal('saleunit')}</span></td>
                    </tr>
                </table>

                <div class="section-title">3. Detalles Logísticos</div>
                <table>
                    <tr>
                        <td class="col"><span class="label">Stock Disponible</span><br/><span class="value">${getVal('totalquantityonhand')}</span></td>
                        <td class="col"><span class="label">UPC / EAN</span><br/><span class="value">${getVal('upccode')}</span></td>
                    </tr>
                </table>

                <div class="section-title">4. Descripción Detallada</div>
                <div style="padding:10px; border: 1px solid #eee; background-color: #fafafa;">
                    ${getHtmlVal('salesdescription')}
                </div>

            </body>
            </pdf>`;

            const pdfFile = render.xmlToPdf({ xmlString: xmlTemplate });
            pdfFile.name = fileName;
            response.writeFile(pdfFile, true);

        } catch (e) {
            log.error('Ficha PDF Error', e);
            response.write(`Error generando PDF: ${e.message}`);
        }
    };

    const loadItemRecord = (id) => {
        const types = ['inventoryitem', 'assemblyitem', 'serializedinventoryitem', 'lotnumberedinventoryitem'];
        for (let type of types) {
            try {
                return record.load({ type, id });
            } catch (e) {}
        }
        return null;
    };

    return { onRequest };
});