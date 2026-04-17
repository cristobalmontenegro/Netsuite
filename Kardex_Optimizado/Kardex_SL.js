/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Reporte Kardex de Inventario Optimizado para NetSuite.
 * Combina datos históricos pre-calculados con datos transaccionales en vivo.
 * Soporta múltiples niveles de agrupación (Artículo, Ubicación, Lote, Clasificación).
 * Provee visualización en pantalla y exportación a CSV/Excel con manejo de tildes.
 * 
 * REQUERIMIENTOS:
 * 1. Registro Personalizado: customrecord_kardex_history (Para almacenar datos históricos)
 * 2. Script Programado (Kardex_SCH): Para poblar el registro histórico periódicamente.
 * 3. Parámetro de Script: URL de una búsqueda guardada formateada como Web Query (HTML).
 */

define(['N/ui/serverWidget', 'N/https', 'N/runtime', 'N/format', 'N/log', 'N/url', 'N/search', 'N/file'],
    (serverWidget, https, runtime, format, log, url, search, file) => {

    // --- CONSTANTES ---
    const DAYS_TO_PROCESS_LIVE = 30; // Días de datos que se leen en vivo desde el reporte
    const KG_PER_POUND = 0.453592;
    const NO_LOT_PLACEHOLDER = 'SIN_LOTE';

    const onRequest = (context) => {
        try {
            if (context.request.method === 'GET') {
                const params = context.request.parameters;
                const preloadedItemId = params.custpage_item_preload || '';
                
                // Cargar listas para filtros
                const classifications = getAvailableClassifications();
                const allLocations = getAllLocations();
                const allInventoryItems = getInventoryItems();
                const availableUnits = getAvailableUnits();

                displayFilterForm(context, classifications, allLocations, allInventoryItems, availableUnits, null, preloadedItemId);
            } else {
                // PROCESAR REPORTE
                const params = context.request.parameters;
                const viewParams = {
                    startDateStr: params.custpage_start_date,
                    endDateStr: params.custpage_end_date,
                    itemId: params.custpage_item,
                    locationId: params.custpage_location,
                    lotNumber: params.custpage_lot_number,
                    classification: params.custpage_classification,
                    unit: params.custpage_unit,
                    showInitial: params.custpage_show_initial === 'T',
                    showMovements: params.custpage_show_movements === 'T',
                    showFinal: params.custpage_show_final === 'T',
                    showItem: params.custpage_show_item === 'T',
                    showLocation: params.custpage_show_location === 'T',
                    showLot: params.custpage_show_lot === 'T',
                    showClassification: params.custpage_show_classification === 'T',
                    showUnitCost: params.custpage_show_unit_cost === 'T',
                    showWeight: params.custpage_show_weight === 'T',
                    showUnitWeight: params.custpage_show_unit_weight === 'T',
                    exportExcel: params.custpage_export_excel === 'T'
                };

                if (!viewParams.showInitial && !viewParams.showMovements && !viewParams.showFinal) {
                    throw new Error('Debe seleccionar al menos una sección para mostrar (Inicial, Movimientos o Final).');
                }

                log.audit('Generando Reporte', viewParams);
                const allData = getConsolidatedData(viewParams);
                
                const initialBalances = getInitialBalances(allData, viewParams.startDateStr, viewParams);
                const movements = getMovements(allData, viewParams.startDateStr, viewParams.endDateStr);
                const finalBalances = getFinalBalances(allData, viewParams.endDateStr, viewParams);

                const data = { initialBalances, movements, finalBalances, params: viewParams };

                if (viewParams.exportExcel) {
                    generateCsvForExcel(context, data);
                } else {
                    displayReportSublist(context, data);
                }
            }
        } catch (e) {
            log.error('Error en Suitelet Kardex', e);
            if (context.request.method === 'GET') {
                context.response.write(`Error: ${e.message}`);
            } else {
                displayFilterForm(context, [], [], [], [], e.message);
            }
        }
    };

    // --- SECCIÓN DE PROCESAMIENTO ---

    const removeAccents = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const parseDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        return format.parse({ value: dateString, type: format.Type.DATE });
    };

    const parseReportHtml = (html) => {
        const data = [];
        const tableMatch = html.match(/<TABLE.*?>([\s\S]*)<\/TABLE>/i);
        if (!tableMatch) return data;
        const rows = tableMatch[1].match(/<TR[^>]*>.*?<\/TR>/gis);
        if (!rows) return data;
        const headerCellsHtml = rows[0].match(/<T[DH][^>]*>.*?<\/T[DH]>/gi);
        if (!headerCellsHtml) return data;
        
        const headerCells = headerCellsHtml.map(cell => cell.replace(/<[^>]+>/g, '').trim().toLowerCase());
        const columnMapping = {
            'fecha': 'fecha', 'date': 'fecha',
            'tipotransaccion': 'tipoTransaccion', 'type': 'tipoTransaccion',
            'documento': 'transaccion', 'document': 'transaccion',
            'ubicacion': 'ubicacion', 'location': 'ubicacion',
            'articulo': 'articulo', 'item': 'articulo',
            'lote': 'loteOriginal', 'lot': 'loteOriginal',
            'cantidad': 'cantidad', 'quantity': 'cantidad',
            'importe': 'costoTotal', 'amount': 'costoTotal',
            'idinternoarticulo': 'articuloId', 'internal id (item)': 'articuloId',
            'id interno (ubicación)': 'ubicacionId', 'internal id (location)': 'ubicacionId'
        };

        const indexMap = {};
        Object.keys(columnMapping).forEach(key => {
            const headerIndex = headerCells.findIndex(h => h.includes(key));
            if (headerIndex !== -1) indexMap[columnMapping[key]] = headerIndex;
        });

        for (let i = 1; i < rows.length; i++) {
            const cellsHtml = rows[i].match(/<TD[^>]*>.*?<\/TD>/gi);
            if (!cellsHtml) continue;
            const cellsText = cellsHtml.map(cell => cell.replace(/<[^>]+>/g, '').trim());
            const rowData = {};
            for (const key in indexMap) { rowData[key] = cellsText[indexMap[key]]; }
            data.push(rowData);
        }
        return data;
    };

    const getConsolidatedData = (params) => {
        let historicalData = [];
        let liveData = [];
        const locationNameCache = {};

        const getCachedLocationName = (locationId, fallbackName) => {
            if (!locationId) return fallbackName || '';
            if (locationNameCache[locationId]) return locationNameCache[locationId];
            try {
                const lookup = search.lookupFields({ type: search.Type.LOCATION, id: locationId, columns: ['name'] });
                locationNameCache[locationId] = lookup.name || fallbackName || '';
                return locationNameCache[locationId];
            } catch (e) { return fallbackName || ''; }
        };

        const frontierDate = new Date();
        frontierDate.setDate(frontierDate.getDate() - DAYS_TO_PROCESS_LIVE);
        frontierDate.setHours(0, 0, 0, 0);

        // 1. Cargar Histórico desde Registro Personalizado
        const historicalSearch = search.create({
            type: 'customrecord_kardex_history',
            columns: [
                'custrecord_kdx_fecha', 'custrecord_kdx_tipo_trans', 'custrecord_kdx_documento',
                'custrecord_kdx_articulo_id_txt', 'custrecord_kdx_unidad',
                'custrecord_kdx_ubicacion_id_txt', 'custrecord_kdx_lote', 'custrecord_kdx_cantidad',
                'custrecord_kdx_costo', 'custrecord_kdx_peso', 'custrecord_kdx_clasificacion',
                search.createColumn({ name: 'itemid', join: 'custrecord_kdx_articulo' })
            ]
        });

        historicalSearch.run().each(result => {
            historicalData.push({
                fecha: result.getValue('custrecord_kdx_fecha'),
                tipoTransaccion: result.getValue('custrecord_kdx_tipo_trans'),
                transaccion: result.getValue('custrecord_kdx_documento'),
                articulo: result.getValue({ name: 'itemid', join: 'custrecord_kdx_articulo' }),
                articuloId: result.getValue('custrecord_kdx_articulo_id_txt'),
                unidad: result.getValue('custrecord_kdx_unidad'),
                ubicacionId: result.getValue('custrecord_kdx_ubicacion_id_txt'),
                ubicacion: getCachedLocationName(result.getValue('custrecord_kdx_ubicacion_id_txt')),
                lote: result.getValue('custrecord_kdx_lote'),
                cantidad: parseFloat(result.getValue('custrecord_kdx_cantidad') || 0),
                costoTotal: parseFloat(result.getValue('custrecord_kdx_costo') || 0),
                pesoTotalKG: parseFloat(result.getValue('custrecord_kdx_peso') || 0),
                clasificacion: result.getValue('custrecord_kdx_clasificacion')
            });
            return true;
        });

        // 2. Cargar en Vivo desde Reporte HTML (opcional si la fecha fin es reciente)
        const userEndDate = parseDate(params.endDateStr);
        if (userEndDate >= frontierDate) {
            const reportUrl = runtime.getCurrentScript().getParameter({ name: 'custscript_kardex_sl_report_url' });
            if (reportUrl) {
                const response = https.get({ url: reportUrl });
                if (response.code === 200) {
                    const parsedData = parseReportHtml(response.body);
                    liveData = parsedData.filter(row => {
                        const d = parseDate(row.fecha);
                        return d && d >= frontierDate;
                    }).map(mov => ({
                        fecha: mov.fecha, tipoTransaccion: mov.tipoTransaccion, transaccion: mov.transaccion,
                        articulo: mov.articulo, articuloId: mov.articuloId,
                        unidad: mov.unidad || '', ubicacion: mov.ubicacion, ubicacionId: mov.ubicacionId,
                        lote: mov.loteOriginal || '',
                        cantidad: parseFloat(mov.cantidad) || 0,
                        costoTotal: parseFloat(mov.costoTotal) || 0,
                        pesoTotalKG: 0, // En vivo suele requerir lógica adicional de peso
                        clasificacion: mov.clasificacion || ''
                    }));
                }
            }
        }

        return historicalData.concat(liveData);
    };

    const buildAggregationKey = (row, params) => {
        let keyParts = [];
        if (params.showItem) keyParts.push(row.articuloId || 'N/A');
        if (params.showLocation) keyParts.push(row.ubicacionId || 'N/A');
        if (params.showLot) keyParts.push(row.lote || NO_LOT_PLACEHOLDER);
        return keyParts.length > 0 ? keyParts.join('_') : 'TOTAL';
    };

    const getInitialBalances = (allData, startDateStr, params) => {
        const balances = {};
        const startDate = parseDate(startDateStr);
        allData.forEach(row => {
            const rowDate = parseDate(row.fecha);
            if (rowDate && rowDate < startDate) {
                const key = buildAggregationKey(row, params);
                if (!balances[key]) balances[key] = { qty: 0, cost: 0, weight: 0, item: row.articulo, location: row.ubicacion, lot: row.lote };
                balances[key].qty += row.cantidad;
                balances[key].cost += row.costoTotal;
                balances[key].weight += row.pesoTotalKG;
            }
        });
        return balances;
    };

    const getMovements = (allData, startDateStr, endDateStr) => {
        const startDate = parseDate(startDateStr), endDate = parseDate(endDateStr);
        return allData.filter(row => {
            const d = parseDate(row.fecha);
            return d && d >= startDate && d <= endDate;
        }).sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
    };

    const getFinalBalances = (allData, endDateStr, params) => {
        const balances = {};
        const endDate = parseDate(endDateStr);
        allData.forEach(row => {
            const rowDate = parseDate(row.fecha);
            if (rowDate && rowDate <= endDate) {
                const key = buildAggregationKey(row, params);
                if (!balances[key]) balances[key] = { qty: 0, cost: 0, weight: 0, item: row.articulo, location: row.ubicacion, lot: row.lote };
                balances[key].qty += row.cantidad;
                balances[key].cost += row.costoTotal;
                balances[key].weight += row.pesoTotalKG;
            }
        });
        return balances;
    };

    // --- SECCIÓN UI ---

    const displayFilterForm = (context, classifications, allLocations, allInventoryItems, availableUnits, errorMessage, preloadedItemId) => {
        const form = serverWidget.createForm({ title: 'Kardex de Inventario - Filtros' });
        
        if (errorMessage) {
            form.addField({ id: 'custpage_err', type: serverWidget.FieldType.INLINEHTML, label: ' ' })
                .defaultValue = `<div style="color:red; font-weight:bold;">${errorMessage}</div>`;
        }

        form.addField({ id: 'custpage_start_date', type: serverWidget.FieldType.DATE, label: 'Fecha Inicio' }).isMandatory = true;
        form.addField({ id: 'custpage_end_date', type: serverWidget.FieldType.DATE, label: 'Fecha Fin' }).isMandatory = true;
        
        const itemFld = form.addField({ id: 'custpage_item', type: serverWidget.FieldType.SELECT, label: 'Artículo' });
        itemFld.addSelectOption({ value: '', text: '- Todos -' });
        allInventoryItems.forEach(i => itemFld.addSelectOption({ value: i.id, text: i.name }));
        if (preloadedItemId) itemFld.defaultValue = preloadedItemId;

        const locFld = form.addField({ id: 'custpage_location', type: serverWidget.FieldType.SELECT, label: 'Ubicación' });
        locFld.addSelectOption({ value: '', text: '- Todas -' });
        allLocations.forEach(l => locFld.addSelectOption({ value: l.id, text: l.name }));

        form.addField({ id: 'custpage_show_initial', type: serverWidget.FieldType.CHECKBOX, label: 'Mostrar Saldo Inicial' }).defaultValue = 'T';
        form.addField({ id: 'custpage_show_movements', type: serverWidget.FieldType.CHECKBOX, label: 'Mostrar Movimientos' }).defaultValue = 'T';
        form.addField({ id: 'custpage_show_final', type: serverWidget.FieldType.CHECKBOX, label: 'Mostrar Saldo Final' }).defaultValue = 'T';
        form.addField({ id: 'custpage_export_excel', type: serverWidget.FieldType.CHECKBOX, label: 'Exportar a CSV' });

        form.addSubmitButton({ label: 'Generar Reporte' });
        context.response.writePage(form);
    };

    const displayReportSublist = (context, data) => {
        const form = serverWidget.createForm({ title: 'Resultado Kardex' });
        const sublist = form.addSublist({ id: 'custpage_sublist', type: serverWidget.ListType.LIST, label: 'Movimientos' });
        
        sublist.addField({ id: 'col_date', type: serverWidget.FieldType.TEXT, label: 'Fecha' });
        sublist.addField({ id: 'col_type', type: serverWidget.FieldType.TEXT, label: 'Tipo' });
        sublist.addField({ id: 'col_doc', type: serverWidget.FieldType.TEXT, label: 'Documento' });
        sublist.addField({ id: 'col_item', type: serverWidget.FieldType.TEXT, label: 'Artículo' });
        sublist.addField({ id: 'col_qty', type: serverWidget.FieldType.FLOAT, label: 'Cantidad' });
        sublist.addField({ id: 'col_cum_qty', type: serverWidget.FieldType.FLOAT, label: 'Acumulado' });
        sublist.addField({ id: 'col_cost', type: serverWidget.FieldType.CURRENCY, label: 'Costo' });

        let line = 0;
        let runningQty = 0;

        // Renderizar Saldos Iniciales, Movimientos y Finales...
        // (Lógica simplificada para ejemplo de estructura)
        
        context.response.writePage(form);
    };

    const generateCsvForExcel = (context, data) => {
        let csv = "Fecha,Tipo,Documento,Articulo,Ubicacion,Lote,Cantidad,Costo\n";
        data.movements.forEach(m => {
            csv += `${m.fecha},${removeAccents(m.tipoTransaccion)},${m.transaccion},${m.articulo},${m.ubicacion},${m.lote},${m.cantidad},${m.costoTotal}\n`;
        });
        
        const fileObj = file.create({ name: 'kardex.csv', fileType: file.Type.CSV, contents: csv, encoding: file.Encoding.UTF_8_BOM });
        context.response.writeFile(fileObj);
    };

    // --- HELPERS BÚSQUEDA ---
    const getAllLocations = () => {
        const list = [];
        search.create({ type: search.Type.LOCATION, columns: ['name'] }).run().each(res => {
            list.push({ id: res.id, name: res.getValue('name') });
            return true;
        });
        return list;
    };

    const getInventoryItems = () => {
        const list = [];
        search.create({ type: search.Type.ITEM, filters: [['type', 'anyof', ['InvtPart', 'Assembly']]], columns: ['itemid'] }).run().each(res => {
            list.push({ id: res.id, name: res.getValue('itemid') });
            return true;
        });
        return list;
    };

    const getAvailableClassifications = () => []; // Opcional
    const getAvailableUnits = () => []; // Opcional

    return { onRequest };

});