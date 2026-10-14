/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Control panel that lists every transaction with committed stock (quantitycommitted > 0),
 *              so you can find what is blocking inventory ("stock rupture" root causes).
 */
define(['N/search', 'N/ui/serverWidget', 'N/url', 'N/redirect', 'N/runtime', 'N/log'], 
(search, serverWidget, url, redirect, runtime, log) => {

    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            
            // Crear el formulario (Interfaz)
            const form = serverWidget.createForm({ 
                title: 'Monitor de Stock Comprometido (Causantes de Ruptura)' 
            });

            // Crear la sublista (Tabla de resultados)
            const sublist = form.addSublist({
                id: 'custpage_stock_list',
                type: serverWidget.SublistType.LIST,
                label: 'Transacciones Bloqueando Inventario'
            });

            // Agregar columnas a la tabla
            sublist.addField({ id: 'custpage_item', type: serverWidget.FieldType.TEXT, label: 'Artículo' });
            
            // Columna de Enlace (Debe ser TEXTAREA inline para renderizar HTML correctamente)
            const linkField = sublist.addField({ id: 'custpage_tranid_link', type: serverWidget.FieldType.TEXTAREA, label: 'Documento (Clic para abrir)' });
            linkField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            
            sublist.addField({ id: 'custpage_type', type: serverWidget.FieldType.TEXT, label: 'Tipo de Transacción' });
            sublist.addField({ id: 'custpage_status', type: serverWidget.FieldType.TEXT, label: 'Estado' });
            sublist.addField({ id: 'custpage_qty_committed', type: serverWidget.FieldType.TEXT, label: 'Cant. Comprometida / Bloqueada' });
            sublist.addField({ id: 'custpage_date', type: serverWidget.FieldType.TEXT, label: 'Fecha del Documento' });

            // Campo de texto para filtro "%valor%"
            const filterField = form.addField({
                id: 'custpage_filter_text',
                type: serverWidget.FieldType.TEXT,
                label: 'Buscar Artículo (Contiene la palabra...)'
            });
            
            // Mantener el valor filtrado en pantalla
            if (context.request.parameters.custpage_filter_text) {
                filterField.defaultValue = context.request.parameters.custpage_filter_text;
            }

            form.addSubmitButton({ label: 'Buscar' });

            // Crear la Búsqueda
            let searchFilters = [
                ['mainline', 'is', 'F'], 
                'AND',
                ['quantitycommitted', 'greaterthan', '0'], 
                'AND',
                ['cogs', 'is', 'F'],
                'AND',
                ['taxline', 'is', 'F']
            ];

            // Filtro "%valor%"
            const searchText = context.request.parameters.custpage_filter_text;
            if (searchText) {
                searchFilters.push('AND', ['formulatext: {item}', 'contains', searchText]);
            }

            const transactionSearch = search.create({
                type: search.Type.TRANSACTION,
                filters: searchFilters,
                columns: [
                    'item', 
                    'tranid', 
                    'type', 
                    'statusref',
                    'quantitycommitted', 
                    'trandate'
                ]
            });

            // Llenar la sublista con los resultados
            let lineNum = 0;
            transactionSearch.run().each((result) => {
                
                sublist.setSublistValue({ id: 'custpage_item', line: lineNum, value: result.getText('item') || 'N/A' });

                // Procesar URL del Documento para abrir en nueva pestaña
                const recordId = result.id;
                const recordType = result.recordType;
                const tranIdText = result.getValue('tranid') || 'Ver Documento';
                let linkHtml = tranIdText;

                if (recordType && recordId) {
                    try {
                        const tranUrl = url.resolveRecord({
                            recordType: recordType,
                            recordId: recordId
                        });
                        linkHtml = `<a href="${tranUrl}" target="_blank" style="color: #255599; font-weight: bold; text-decoration: underline;">${tranIdText}</a>`;
                    } catch (e) {
                        log.error('Error al resolver URL', e.message);
                    }
                }

                sublist.setSublistValue({ id: 'custpage_tranid_link', line: lineNum, value: linkHtml });
                sublist.setSublistValue({ id: 'custpage_type', line: lineNum, value: result.getText('type') || 'N/A' });
                sublist.setSublistValue({ id: 'custpage_status', line: lineNum, value: result.getText('statusref') || 'N/A' });
                sublist.setSublistValue({ id: 'custpage_qty_committed', line: lineNum, value: result.getValue('quantitycommitted') || '0' });
                sublist.setSublistValue({ id: 'custpage_date', line: lineNum, value: result.getValue('trandate') || 'N/A' });
                
                lineNum++;
                return true; 
            });

            // Mostrar la página
            context.response.writePage(form);
            
        } else {
            // 2. CORRECCIÓN EN EL MANEJO DEL POST (Cuando hacen clic en Buscar)
            const filterValue = context.request.parameters.custpage_filter_text || '';
            
            // Obtenemos el script actual
            const currentScript = runtime.getCurrentScript();
            
            // Usamos redirect.toSuitelet que es la forma nativa y segura en NetSuite
            redirect.toSuitelet({
                scriptId: currentScript.id,
                deploymentId: currentScript.deploymentId,
                parameters: {
                    'custpage_filter_text': filterValue
                }
            });
        }
    };

    return { onRequest };
});