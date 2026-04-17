/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @Description 
 * Suitelet técnico para corregir transacciones de Ejecución de Artículos (Item Fulfillment) 
 * que han sido guardadas con lotes en inventario negativo.
 * Permite al usuario re-seleccionar manualmente lotes con stock positivo para "limpiar" la contabilidad de inventarios.
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/log', 'N/url'],
    (serverWidget, search, record, redirect, log, url) => {

        const onRequest = (context) => {
            const { request, response } = context;

            try {
                if (request.method === 'GET') {
                    const fulfillmentId = request.parameters.fulfillment_id;
                    if (fulfillmentId) {
                        showCorrectionForm(response, fulfillmentId);
                    } else {
                        showInitialForm(response);
                    }
                } else { // POST
                    const fulfillmentId = request.parameters.custpage_fulfillment_id;
                    if (fulfillmentId) {
                        applyCorrections(context);
                    } else {
                        const selectedId = request.parameters.custpage_select_fulfillment;
                        // Redirección dinámica al mismo script
                        redirect.toSuitelet({
                            scriptId: url.resolveScript({ returnExternalUrl: false }).scriptId,
                            deploymentId: url.resolveScript({ returnExternalUrl: false }).deploymentId,
                            parameters: { 'fulfillment_id': selectedId }
                        });
                    }
                }
            } catch (e) {
                log.error('Lot Corrector Error', e);
                response.write(\`<h1>Error</h1><p>\${e.message}</p>\`);
            }
        };

        const showInitialForm = (response) => {
            const form = serverWidget.createForm({ title: 'Corrector de Lotes en Negativo' });
            form.addField({
                id: 'custpage_select_fulfillment',
                type: serverWidget.FieldType.TEXT,
                label: 'ID Interno de Item Fulfillment'
            });
            form.addSubmitButton({ label: 'Analizar Transacción' });
            response.writePage(form);
        };

        const showCorrectionForm = (response, fulfillmentId) => {
            const form = serverWidget.createForm({ title: \`Análisis de Despaho #\${fulfillmentId}\` });
            form.addField({
                id: 'custpage_fulfillment_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Fulfillment ID'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN }).defaultValue = fulfillmentId;

            const problematicLines = getProblematicLines(fulfillmentId);

            if (problematicLines.length === 0) {
                form.addField({
                    id: 'msg',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = '<h4>No se detectaron lotes con inventario negativo en este registro.</h4>';
            } else {
                const sublist = form.addSublist({ id: 'custpage_lines_sublist', type: serverWidget.SublistType.LIST, label: 'Líneas con Error' });
                sublist.addField({ id: 'custpage_sub_line', label: 'Línea #', type: serverWidget.FieldType.TEXT });
                sublist.addField({ id: 'custpage_sub_item', label: 'Artículo', type: serverWidget.FieldType.TEXT });
                sublist.addField({ id: 'custpage_sub_bad_lot', label: 'Lote en Negativo', type: serverWidget.FieldType.TEXT });
                const newLotField = sublist.addField({ id: 'custpage_sub_new_lot', label: 'Lote de Reemplazo (Stock > 0)', type: serverWidget.FieldType.SELECT });
                
                const qField = sublist.addField({ id: 'custpage_sub_base_quantity', label: 'Qty', type: serverWidget.FieldType.TEXT });
                qField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                problematicLines.forEach((line, i) => {
                    sublist.setSublistValue({ id: 'custpage_sub_line', line: i, value: line.line.toString() });
                    sublist.setSublistValue({ id: 'custpage_sub_item', line: i, value: line.itemName });
                    sublist.setSublistValue({ id: 'custpage_sub_bad_lot', line: i, value: line.badLotDisplay });
                    sublist.setSublistValue({ id: 'custpage_sub_base_quantity', line: i, value: line.baseQuantity.toString() });
                    
                    newLotField.addSelectOption({ value: '', text: '' });
                    line.availableLots.forEach(lot => {
                        newLotField.addSelectOption({ value: lot.id, text: \`\${lot.name} (Disp: \${lot.available})\` });
                    });
                });

                form.addSubmitButton({ label: 'Aplicar Corrección' });
            }
            response.writePage(form);
        };

        const applyCorrections = (context) => {
            const { request } = context;
            const fId = request.parameters.custpage_fulfillment_id;
            const rec = record.load({ type: record.Type.ITEM_FULFILLMENT, id: fId, isDynamic: true });
            const count = request.getLineCount({ group: 'custpage_lines_sublist' });

            for (let i = 0; i < count; i++) {
                const lineIdx = parseInt(request.getSublistValue({ group: 'custpage_lines_sublist', name: 'custpage_sub_line', line: i }));
                const lotId = request.getSublistValue({ group: 'custpage_lines_sublist', name: 'custpage_sub_new_lot', line: i });
                const qty = request.getSublistValue({ group: 'custpage_lines_sublist', name: 'custpage_sub_base_quantity', line: i });

                if (lotId) {
                    const subIdx = rec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'line', value: lineIdx });
                    rec.selectLine({ sublistId: 'item', line: subIdx });
                    const det = rec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
                    
                    // Limpiar lotes viejos
                    for (let j = det.getLineCount({ sublistId: 'inventoryassignment' }) - 1; j >= 0; j--) {
                        det.removeLine({ sublistId: 'inventoryassignment', line: j });
                    }

                    det.selectNewLine({ sublistId: 'inventoryassignment' });
                    det.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: lotId });
                    det.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: qty });
                    det.commitLine({ sublistId: 'inventoryassignment' });
                    rec.commitLine({ sublistId: 'item' });
                }
            }
            rec.save();
            context.response.write('<h4>Transacción Corregida Exitosamente.</h4>');
        };

        const getProblematicLines = (fId) => {
            const fRec = record.load({ type: record.Type.ITEM_FULFILLMENT, id: fId });
            let results = [];
            for (let i = 0; i < fRec.getLineCount({ sublistId: 'item' }); i++) {
                const det = fRec.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
                if (!det) continue;

                for (let j = 0; j < det.getLineCount({ sublistId: 'inventoryassignment' }); j++) {
                    const lotId = det.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j });
                    const lookup = search.lookupFields({ type: search.Type.INVENTORY_NUMBER, id: lotId, columns: ['quantityonhand'] });
                    const onHand = parseFloat(lookup.quantityonhand || 0);

                    if (onHand < 0) {
                        results.push({
                            line: fRec.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i }),
                            itemName: fRec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                            badLotDisplay: \`\${det.getSublistText({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: j })} (Inv: \${onHand})\`,
                            baseQuantity: det.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: j }),
                            availableLots: findAvailableLots(fRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }), fRec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i }))
                        });
                    }
                }
            }
            return results;
        };

        const findAvailableLots = (itemId, locId) => {
            let lots = [];
            search.create({
                type: 'inventorynumber',
                filters: [['item', 'anyof', itemId], 'AND', ['location', 'anyof', locId], 'AND', ['quantityavailable', 'greaterthan', 0]],
                columns: ['inventorynumber', 'quantityavailable']
            }).run().each(r => {
                lots.push({ id: r.id, name: r.getValue('inventorynumber'), available: r.getValue('quantityavailable') });
                return true;
            });
            return lots;
        };

        return { onRequest };
    });
