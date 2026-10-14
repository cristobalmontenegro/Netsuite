/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Upload the "received invoices" TXT export from the tax authority portal and compare
 *              it against every Vendor Bill already registered in NetSuite. Lists the invoices that
 *              are still missing (matched by the electronic access key / authorization number).
 */
define(['N/ui/serverWidget', 'N/search', 'N/file', 'N/log', 'N/ui/message'],
    (serverWidget, search, file, log, message) => {

        // ===== CONFIGURATION =====
        // Body field on Vendor Bill that stores the electronic access key (authorization number).
        // Change this to the field id used in your account / localization.
        const AUTH_CODE_FIELD = 'custbody_ft_fe_numaut_ec';

        // Zero-based column index in the TXT (tab-separated) that holds the access key.
        const TXT_ACCESS_KEY_COLUMN = 4;
        // =========================

        const onRequest = (context) => {
            if (context.request.method === 'GET') {
                // --- GET request: Muestra el formulario para subir el archivo. ---
                const form = serverWidget.createForm({
                    title: 'Comparador de Facturas de Compra'
                });

                form.addSubmitButton({
                    label: 'Comparar Archivos'
                });
                
                form.addField({
                    id: 'custpage_instructions',
                    type: serverWidget.FieldType.LABEL,
                    label: 'Por favor, sube el archivo TXT. El sistema lo comparará con todas las facturas de compra en NetSuite y mostrará las que faltan por registrar.'
                });

                const fileField = form.addField({
                    id: 'custpage_file',
                    type: serverWidget.FieldType.FILE,
                    label: 'Subir Archivo TXT de Facturas Recibidas'
                });
                fileField.isMandatory = true;

                // ===== NUEVA LÍNEA PARA EL CAMBIO COSMÉTICO =====
                // Esta línea fuerza al campo a mostrarse debajo del anterior, en una nueva fila.
                fileField.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
                });

                context.response.writePage(form);

            } else {
                // --- POST request: Procesa el archivo y muestra los resultados. ---
                const request = context.request;
                const form = serverWidget.createForm({
                    title: 'Resultados de la Comparación'
                });

                const fileObj = request.files.custpage_file;

                if (!fileObj || fileObj.size === 0) {
                    form.addPageInitMessage({
                        type: message.Type.ERROR,
                        title: 'Error',
                        message: 'No se ha subido ningún archivo o el archivo está vacío. Por favor, vuelve e inténtalo de nuevo.'
                    });
                    context.response.writePage(form);
                    return;
                }
                
                // 1. Obtener TODAS las Claves de Acceso desde NetSuite
                const netsuiteAuthCodes = new Set();
                try {
                    const vendorBillSearch = search.create({
                        type: search.Type.VENDOR_BILL,
                        filters: [
                            ['mainline', 'is', 'T'],
                            'AND',
                            [AUTH_CODE_FIELD, 'isnotempty', '']
                        ],
                        columns: [
                            search.createColumn({ name: AUTH_CODE_FIELD })
                        ]
                    });
                    
                    const pagedData = vendorBillSearch.runPaged({ pageSize: 1000 });
                    pagedData.pageRanges.forEach(pageRange => {
                        const page = pagedData.fetch({ index: pageRange.index });
                        page.data.forEach(result => {
                            const authCode = result.getValue({ name: AUTH_CODE_FIELD });
                            if (authCode) {
                                netsuiteAuthCodes.add(authCode.trim());
                            }
                        });
                    });
                    log.debug('Total de facturas existentes con autorización', netsuiteAuthCodes.size);

                } catch (e) {
                    log.error('Error al crear la búsqueda en NetSuite', e);
                    form.addPageInitMessage({
                        type: message.Type.ERROR,
                        title: 'Error al buscar en NetSuite',
                        message: `Ocurrió un error al intentar buscar facturas. Revisa que el ID del campo '${AUTH_CODE_FIELD}' sea correcto. Error: ${e.message}`
                    });
                    context.response.writePage(form);
                    return;
                }

                // 2. Leer y procesar el archivo TXT
                const fileContent = fileObj.getContents();
                const lines = fileContent.split('\n');
                const missingInvoices = [];
                const txtAuthCodes = new Set();

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        const columns = line.split('\t');
                        if (columns.length > TXT_ACCESS_KEY_COLUMN) {
                            const claveAcceso = columns[TXT_ACCESS_KEY_COLUMN] ? columns[TXT_ACCESS_KEY_COLUMN].trim() : '';
                            if (claveAcceso && !txtAuthCodes.has(claveAcceso)) {
                                txtAuthCodes.add(claveAcceso);
                                if (!netsuiteAuthCodes.has(claveAcceso)) {
                                    missingInvoices.push({
                                        ruc: columns[0] || 'N/A',
                                        razonSocial: columns[1] || 'N/A',
                                        tipo: columns[2] || 'N/A',
                                        serie: columns[3] || 'N/A',
                                        claveAcceso: claveAcceso,
                                        fechaEmision: columns[6] || 'N/A',
                                        importeTotal: columns[10] || 'N/A'
                                    });
                                }
                            }
                        }
                    }
                }
                log.debug('Total de facturas únicas en TXT', txtAuthCodes.size);
                log.debug('Facturas no encontradas en NetSuite', missingInvoices.length);

                // 3. Mostrar los resultados
                if (missingInvoices.length > 0) {
                    form.addPageInitMessage({
                        type: message.Type.CONFIRMATION,
                        title: 'Comparación Exitosa',
                        message: `Se encontraron ${missingInvoices.length} facturas que no están ingresadas en NetSuite.`
                    });

                    const resultsSublist = form.addSublist({
                        id: 'custpage_missing_invoices',
                        type: serverWidget.SublistType.LIST,
                        label: 'Facturas Pendientes de Ingreso'
                    });

                    resultsSublist.addField({ id: 'ruc', type: serverWidget.FieldType.TEXT, label: 'RUC Emisor' });
                    resultsSublist.addField({ id: 'razonsocial', type: serverWidget.FieldType.TEXT, label: 'Razón Social' });
                    resultsSublist.addField({ id: 'serie', type: serverWidget.FieldType.TEXT, label: 'Serie' });
                    resultsSublist.addField({ id: 'fecha', type: serverWidget.FieldType.TEXT, label: 'Fecha Emisión' });
                    resultsSublist.addField({ id: 'total', type: serverWidget.FieldType.CURRENCY, label: 'Importe Total' });
                    resultsSublist.addField({ id: 'claveacceso', type: serverWidget.FieldType.TEXT, label: 'Clave de Acceso (Autorización)' });

                    missingInvoices.forEach((invoice, index) => {
                        resultsSublist.setSublistValue({ id: 'ruc', line: index, value: invoice.ruc });
                        resultsSublist.setSublistValue({ id: 'razonsocial', line: index, value: invoice.razonSocial });
                        resultsSublist.setSublistValue({ id: 'serie', line: index, value: invoice.serie });
                        resultsSublist.setSublistValue({ id: 'fecha', line: index, value: invoice.fechaEmision });
                        if (invoice.importeTotal && !isNaN(parseFloat(invoice.importeTotal))) {
                            resultsSublist.setSublistValue({ id: 'total', line: index, value: parseFloat(invoice.importeTotal).toFixed(2) });
                        }
                        resultsSublist.setSublistValue({ id: 'claveacceso', line: index, value: invoice.claveAcceso });
                    });

                } else {
                    form.addPageInitMessage({
                        type: message.Type.INFORMATION,
                        title: '¡Todo en Orden!',
                        message: 'Todas las facturas del archivo TXT ya se encuentran registradas en el sistema.'
                    });
                }
                context.response.writePage(form);
            }
        };

        return {
            onRequest
        };
    });