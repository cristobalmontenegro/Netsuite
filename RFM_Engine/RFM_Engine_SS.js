/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 *
 * @version 1.0.0
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description 
 * Módulo de Análisis RFM (Recencia, Frecuencia, Monetario) para NetSuite.
 * Calcula métricas de comportamiento de compra, rentabilidad, términos de crédito y puntualidad.
 * Genera un score consolidado y una calificación (Rank) para segmentación de clientes.
 * 
 * REQUERIMIENTOS:
 * 1. Registro Personalizado: customrecord_rfm_data (Para almacenar resultados semanales)
 * 2. Registro Personalizado: customrecord_rfm_mapping (Para mapear Score a Grados A, B, C, D)
 * 3. Parámetros de Script configurados en el despliegue.
 */
define(['N/runtime', 'N/search', 'N/log', 'N/format', 'N/record'],
    (runtime, search, log, format, record) => {

        const execute = (scriptContext) => {
            
            // --- CONFIGURACIÓN ---
            const IS_TEST_MODE = false; // true = Solo Logs (No guarda), false = Producción (Guardado en BD)

            const script = runtime.getCurrentScript();
            
            // PARÁMETROS: Definir estos IDs en la pestaña de Parámetros del Script en NetSuite
            const clienteIdParam = script.getParameter({ name: 'custscript_rfm_id_cliente' });
            const fechaCorteStr = script.getParameter({ name: 'custscript_rfm_fecha_corte' });
            
            log.audit(`INICIO`, `Calculando RFM - MODO: ${IS_TEST_MODE ? 'TEST' : 'PRODUCTION'}`);
            
            if (clienteIdParam) {
                log.audit('MODO DEPURACIÓN', `Ejecutando solo para Cliente ID: ${clienteIdParam}`);
            }

            // --- PASO 1: Cargar Diccionarios de Calificación (A, B, C, D) ---
            const mapaCalificaciones = cargarMapaCalificaciones();
            if(!mapaCalificaciones) {
                log.error('ERROR CRÍTICO', 'No se pudo cargar el registro de Mapeo de Rangos (customrecord_rfm_mapping).');
                return;
            }

            const fechaCorte = fechaCorteStr ? format.parse({ value: fechaCorteStr, type: format.Type.DATE }) : new Date();
            fechaCorte.setHours(23, 59, 59, 999);
            const semanaCalculo = obtenerSemanaDelAno(fechaCorte);

            // Cargar registros existentes para evitar duplicados en la misma semana
            const mapaRegistrosExistentes = IS_TEST_MODE ? {} : cargarRegistrosExistentes(semanaCalculo);
            
            let fechaInicioAnalisisRFM = new Date(fechaCorte);
            fechaInicioAnalisisRFM.setDate(fechaInicioAnalisisRFM.getDate() - 365); // Análisis de 1 año
            const fechaInicioStrRFM = format.format({ value: fechaInicioAnalisisRFM, type: format.Type.DATE });
            const fechaCorteStrFmt = format.format({ value: fechaCorte, type: format.Type.DATE });

            log.audit('Paso 2', 'Ejecutando búsquedas de transacciones...');
            const resultadosMaestra = crearYEjecutarBusquedaMaestra(fechaInicioStrRFM, fechaCorteStrFmt, clienteIdParam);
            const facturasHistorial = crearYEjecutarBusquedaFacturasHistorial(fechaCorteStrFmt, clienteIdParam);
            const aplicacionesHistorial = crearYEjecutarBusquedaAplicaciones(fechaCorteStrFmt, clienteIdParam);
            const ordenVentaIds = recolectarOrdenVentaIds(resultadosMaestra);
            const resultadosCostos = crearYEjecutarBusquedaCostos(ordenVentaIds, clienteIdParam);

            if (!resultadosMaestra || !facturasHistorial || !aplicacionesHistorial) {
                log.error('ERROR', 'Fallo en la carga de datos maestros.'); return;
            }
            
            log.audit('Paso 3', 'Procesando cálculos por cliente...');
            let datosClientes = {};
            procesarRFMZ(datosClientes, resultadosMaestra, clienteIdParam);
            procesarGanancia(datosClientes, resultadosMaestra, resultadosCostos, clienteIdParam);
            procesarPuntualidad(datosClientes, facturasHistorial, aplicacionesHistorial, fechaCorte, clienteIdParam);

            log.audit('Paso 4', `Consolidando y ${IS_TEST_MODE ? 'logeando' : 'guardando'}...`);
            
            for (const clienteId in datosClientes) {
                const cliente = datosClientes[clienteId];
                if (cliente.frecuencia === 0 && cliente.montoTotalFacturadoHistorial === 0) continue;
                
                // --- CÁLCULOS RFM ---
                const r = cliente.ultimaFechaFactura ? Math.ceil((fechaCorte.getTime() - cliente.ultimaFechaFactura.getTime()) / (1000 * 3600 * 24)) : 365;
                const f = cliente.frecuencia;
                const m = cliente.monetario;
                const p = cliente.montoTotalFacturadoHistorial !== 0 ? (cliente.puntualidadPonderada / cliente.montoTotalFacturadoHistorial) : 0;
                const z = cliente.montoTotalPlazo !== 0 ? (cliente.plazoPonderado / cliente.montoTotalPlazo) : 0;
                const g = cliente.pesoTotalParaGanancia > 0 ? (cliente.gananciaTotal / (cliente.pesoTotalParaGanancia / 1000)) : 0;
                const d = cliente.montoTotalPago > 0 ? (cliente.diasPagoPonderado / cliente.montoTotalPago) : 0;
                const b = m > 0 ? (cliente.gananciaTotal / m) * 100 : 0;

                // Dinámica de Normalización (Escala 0-9 para visualización)
                const R = Math.round(Math.max(0, (365 - r) / 365 * 9));
                const F = Math.min(9, Math.round(f / 12 * 9));
                const M = Math.max(0, Math.min(9, Math.round(Math.sqrt(Math.max(0, m) / 60000) * 9)));
                const P = Math.round(Math.min(9, (180 - Math.min(180, p)) / 180 * 9));
                const Z = Math.round(Math.min(9, (180 - Math.min(180, z)) / 180 * 9));
                
                // --- CÁLCULO DE SCORE CONSOLIDADO (0-100) ---
                const margenBruto = b / 100;
                const NMON = Math.max(0, Math.min(100, m / 1000));
                const NMGN = Math.max(0, Math.min(100, 100 * (margenBruto - 0.08) / (0.17 - 0.08)));
                const NMORA = Math.max(0, Math.min(100, (180 - p) / 180 * 100));

                const SCORE = (NMON * 0.4 + NMGN * 0.3 + NMORA * 0.3); // Ponderación: 40% Volumen, 30% Margen, 30% Puntualidad

                // Dupont y Calificación Matrix (AAA, BBA, etc.)
                const dupont = (360 / Math.max(d, 1)) * Math.max(margenBruto, 0);

                let letra1, letra2, letra3;
                if (m >= 60000) letra1 = 'A'; else if (m >= 25000) letra1 = 'B'; else if (m >= 10000) letra1 = 'C'; else letra1 = 'D';
                if (dupont >= 2) letra2 = 'A'; else if (dupont >= 1.2) letra2 = 'B'; else if (dupont >= 0.6) letra2 = 'C'; else letra2 = 'D';
                if (d <= 8) letra3 = 'A'; else if (d <= 15) letra3 = 'B'; else if (d <= 30) letra3 = 'C'; else letra3 = 'D';
                const calificacion = `${letra1}${letra2}${letra3}`;
                
                const detalleCalificacion = mapaCalificaciones[calificacion] ? mapaCalificaciones[calificacion].detalle : 'Sin definición';
                const colorCalificacion = mapaCalificaciones[calificacion] ? mapaCalificaciones[calificacion].color : 'grey';

                if (IS_TEST_MODE) {
                    log.debug(`Resultado Cliente ID: ${clienteId}`, `Score: ${SCORE.toFixed(2)}, Rank: ${calificacion}`);
                } else {
                    guardarResultado(mapaRegistrosExistentes[clienteId], {
                        clienteId, semanaCalculo, R, F, M, P, Z, SCORE, calificacion,
                        raw: { r, f, m, p, z, g, d, b, dupont, nmora: NMORA, nmon: NMON, nmgn: NMGN },
                        meta: { detalle: detalleCalificacion, color: colorCalificacion }
                    });
                }
            }
            log.audit('FIN', 'Proceso RFM completado.');
        };

        const guardarResultado = (idExistente, data) => {
            try {
                let rfmRecord = idExistente ? 
                    record.load({ type: 'customrecord_rfm_data', id: idExistente, isDynamic: true }) :
                    record.create({ type: 'customrecord_rfm_data', isDynamic: true });

                rfmRecord.setValue({ fieldId: 'custrecord_rfm_client', value: data.clienteId });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_week', value: data.semanaCalculo });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_score', value: data.SCORE.toFixed(2) });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_rank', value: data.calificacion });
                
                // Mapeo detallado (Normalizado 0-9)
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_val_r', value: data.R });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_val_f', value: data.F });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_val_m', value: data.M });
                
                // Valores Crudos (Para análisis profundo)
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_raw_recency', value: data.raw.r });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_raw_monetary', value: data.raw.m.toFixed(2) });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_raw_margin', value: data.raw.b.toFixed(2) });
                rfmRecord.setValue({ fieldId: 'custrecord_rfm_raw_mora', value: data.raw.nmora.toFixed(2) });

                rfmRecord.save();
            } catch (e) {
                log.error('Error al guardar registro RFM', e.toString());
            }
        };

        const cargarMapaCalificaciones = () => {
            let mapa = {};
            try {
                // Requiere registro customrecord_rfm_mapping con campos: custrecord_map_rank, custrecord_map_detail, custrecord_map_color
                search.create({
                    type: 'customrecord_rfm_mapping',
                    columns: ['custrecord_map_rank', 'custrecord_map_detail', 'custrecord_map_color']
                }).run().each(res => {
                    const rank = res.getValue('custrecord_map_rank');
                    if (rank) {
                        mapa[rank] = {
                            detalle: res.getValue('custrecord_map_detail'),
                            color: res.getValue('custrecord_map_color')
                        };
                    }
                    return true;
                });
                return mapa;
            } catch (e) {
                log.error('Error al cargarMapaCalificaciones', e.toString());
                return null;
            }
        };

        const cargarRegistrosExistentes = (semana) => {
            let mapa = {};
            try {
                search.create({
                    type: 'customrecord_rfm_data',
                    filters: [['custrecord_rfm_week', 'is', semana]],
                    columns: ['custrecord_rfm_client'] 
                }).run().each(res => {
                    mapa[res.getValue('custrecord_rfm_client')] = res.id;
                    return true;
                });
                return mapa;
            } catch (e) { return {}; }
        };

        const inicializarObjetoCliente = (nombre) => {
            return {
                nombre: nombre, ultimaFechaFactura: null, frecuencia: 0, monetario: 0,
                plazoPonderado: 0, montoTotalPlazo: 0,
                puntualidadPonderada: 0, montoTotalFacturadoHistorial: 0,
                gananciaTotal: 0, pesoTotalParaGanancia: 0,
                diasPagoPonderado: 0, montoTotalPago: 0, 
                facturasHistorial: {}
            };
        };
        
        const procesarRFMZ = (datosClientes, resultadosMaestra, clienteIdParam) => {
            let transaccionesAgregadas = {};
            resultadosMaestra.forEach(res => {
                const idTransaccion = res.getValue({ name: 'internalid' });
                if (!transaccionesAgregadas[idTransaccion]) {
                    transaccionesAgregadas[idTransaccion] = {
                        clienteId: res.getValue({ name: 'entity' }),
                        clienteNombre: res.getText({ name: 'entity' }),
                        fecha: format.parse({ value: res.getValue({ name: 'trandate' }), type: format.Type.DATE }),
                        tipo: res.getValue({ name: 'type' }),
                        fechaVencimiento: format.parse({ value: res.getValue({ name: 'duedate' }) || res.getValue({ name: 'trandate' }), type: format.Type.DATE }),
                        montoTotal: 0
                    };
                }
                const tipoTransaccion = res.getValue({ name: 'type' });
                let montoLinea = parseFloat(res.getValue({ name: 'amount' }));
                transaccionesAgregadas[idTransaccion].montoTotal += (tipoTransaccion === 'CustCred' ? -1 * Math.abs(montoLinea) : Math.abs(montoLinea));
            });

            for (const idTransaccion in transaccionesAgregadas) {
                const tran = transaccionesAgregadas[idTransaccion];
                const clienteId = tran.clienteId;
                if (!datosClientes[clienteId]) {
                    datosClientes[clienteId] = inicializarObjetoCliente(tran.clienteNombre);
                }
                const cliente = datosClientes[clienteId];

                if (tran.tipo === 'CustInvc') {
                    if (!cliente.ultimaFechaFactura || tran.fecha > cliente.ultimaFechaFactura) {
                        cliente.ultimaFechaFactura = tran.fecha;
                    }
                    cliente.frecuencia++;
                    const diasCredito = Math.round((tran.fechaVencimiento.getTime() - tran.fecha.getTime()) / (1000 * 3600 * 24));
                    cliente.plazoPonderado += diasCredito * tran.montoTotal;
                    cliente.montoTotalPlazo += tran.montoTotal;
                }
                cliente.monetario += tran.montoTotal;
            }
        };
        
        const procesarGanancia = (datosClientes, resultadosMaestra, resultadosCostos) => {
            let mapaCostos = {};
            resultadosCostos.forEach(res => {
                const ordenVentaId = res.getValue({ name: 'createdfrom' });
                const itemId = res.getValue({ name: 'item' });
                const costoDeLinea = parseFloat(res.getValue({ name: 'debitamount' })) || 0;
                const clave = `${ordenVentaId}-${itemId}`;
                mapaCostos[clave] = (mapaCostos[clave] || 0) + costoDeLinea;
            });

            let mapaFactura = {};
            resultadosMaestra.forEach(res => {
                if (res.getValue({ name: 'type' }) !== 'CustInvc') return;
                const itemType = res.getValue({ name: 'type', join: 'item'});
                if (itemType !== 'InvtPart' && itemType !== 'Assembly') return;

                const ordenVentaId = res.getValue({ name: 'createdfrom' });
                const itemId = res.getValue({ name: 'item' });
                const clave = `${ordenVentaId}-${itemId}`;

                if (!mapaFactura[clave]) {
                    mapaFactura[clave] = { ingresoTotal: 0, pesoTotal: 0, clienteId: res.getValue({ name: 'entity' }) };
                }

                mapaFactura[clave].ingresoTotal += parseFloat(res.getValue({ name: 'amount' })) || 0;
                const cantidadVenta = parseFloat(res.getValue({ name: 'quantity' })) || 0;
                const pesoUnitario = parseFloat(res.getValue({ name: 'weight', join: 'item' })) || 0;
                mapaFactura[clave].pesoTotal += cantidadVenta * pesoUnitario;
            });
            
            for (const clave in mapaFactura) {
                const dataFactura = mapaFactura[clave];
                const costoTotal = mapaCostos[clave] || 0;
                const margenTotal = dataFactura.ingresoTotal - costoTotal;
                const cliente = datosClientes[dataFactura.clienteId];
                if (cliente) {
                    cliente.gananciaTotal += margenTotal;
                    cliente.pesoTotalParaGanancia += dataFactura.pesoTotal;
                }
            }
        };

        const procesarPuntualidad = (datosClientes, facturasHistorial, aplicacionesHistorial, fechaCorte) => {
           let aplicacionesProcesadas = new Set();
            
            facturasHistorial.forEach(res => {
                const clienteId = res.getValue({ name: 'entity' });
                if(!clienteId) return;
                if (!datosClientes[clienteId]) {
                    datosClientes[clienteId] = inicializarObjetoCliente(res.getText({ name: 'entity' }));
                }
                const cliente = datosClientes[clienteId];
                const idFactura = res.getValue({ name: 'internalid' });
                if (!cliente.facturasHistorial[idFactura]) {
                    cliente.facturasHistorial[idFactura] = {
                        fechaEmision: format.parse({ value: res.getValue({ name: 'trandate' }), type: format.Type.DATE }),
                        fechaVencimiento: format.parse({ value: res.getValue({ name: 'duedate' }) || res.getValue({ name: 'trandate' }), type: format.Type.DATE }),
                        montoTotal: parseFloat(res.getValue({ name: 'amount' })),
                        montoPagadoHastaLaFecha: 0
                    };
                    cliente.montoTotalFacturadoHistorial += parseFloat(res.getValue({ name: 'amount' }));
                }
            });
            
            aplicacionesHistorial.forEach(res => {
                const idAplicacion = res.id + '-' + res.getValue({ name: 'appliedToTransaction' });
                if (aplicacionesProcesadas.has(idAplicacion)) return;
                const clienteId = res.getValue({ name: 'entity' });
                if(!clienteId || !datosClientes[clienteId]) return;
                const cliente = datosClientes[clienteId];
                const idFacturaAplicada = res.getValue({ name: 'appliedToTransaction' });
                const factura = cliente.facturasHistorial[idFacturaAplicada];

                if (factura) {
                    const fechaPago = format.parse({ value: res.getValue({ name: 'trandate' }), type: format.Type.DATE });
                    const montoAplicado = Math.abs(parseFloat(res.getValue({ name: 'amount' })));
                    factura.montoPagadoHastaLaFecha += montoAplicado;
                    
                    const diasAtraso = Math.ceil((fechaPago.getTime() - factura.fechaVencimiento.getTime()) / (1000 * 3600 * 24));
                    cliente.puntualidadPonderada += diasAtraso * montoAplicado;

                    const diasRealesDePago = Math.ceil((fechaPago.getTime() - factura.fechaEmision.getTime()) / (1000 * 3600 * 24));
                    cliente.diasPagoPonderado += diasRealesDePago * montoAplicado;
                    cliente.montoTotalPago += montoAplicado;

                    aplicacionesProcesadas.add(idAplicacion);
                }
            });

            for (const clienteId in datosClientes) {
                const cliente = datosClientes[clienteId];
                for (const idFactura in cliente.facturasHistorial) {
                    const factura = cliente.facturasHistorial[idFactura];
                    const montoPendiente = factura.montoTotal - factura.montoPagadoHastaLaFecha;
                    if (montoPendiente > 0.01) { 
                        const diasAtraso = Math.ceil((fechaCorte.getTime() - factura.fechaVencimiento.getTime()) / (1000 * 3600 * 24));
                        cliente.puntualidadPonderada += diasAtraso * montoPendiente;
                        const diasRealesDePago = Math.ceil((fechaCorte.getTime() - factura.fechaEmision.getTime()) / (1000 * 3600 * 24));
                        cliente.diasPagoPonderado += diasRealesDePago * montoPendiente;
                        cliente.montoTotalPago += montoPendiente;
                    }
                }
            }
        };
        
        const recolectarOrdenVentaIds = (resultadosMaestra) => {
            const ids = new Set();
            if(resultadosMaestra) {
                resultadosMaestra.forEach(res => {
                    if (res.getValue({ name: 'type' }) === 'CustInvc') {
                        const soId = res.getValue({ name: 'createdfrom' });
                        if (soId) ids.add(soId);
                    }
                });
            }
            return Array.from(ids);
        };
        
        const crearYEjecutarBusquedaMaestra = (fechaInicio, fechaFin, clienteId) => {
            let filters = [
                ['mainline', 'is', 'F'], 'AND', ['taxline', 'is', 'F'], 'AND', ['cogs', 'is', 'F'], 'AND', ['shipping', 'is', 'F'], 'AND',
                ['type', 'anyof', 'CustInvc', 'CustCred'], 'AND',
                ['trandate', 'within', fechaInicio, fechaFin], 'AND',
                ['voided', 'is', 'F']
            ];
            if (clienteId) { filters.push('AND', ['entity', 'anyof', [clienteId]]); }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: ['internalid', 'trandate', 'type', 'entity', 'amount', 'total', 'duedate', 'createdfrom', 'item', 'rate', 'quantity',
                        search.createColumn({ name: 'type', join: 'item'}),
                        search.createColumn({ name: 'weight', join: 'item'})
                    ]
                }));
            } catch (e) { log.error('Error al CREAR Búsqueda Maestra', e.toString()); return null; }
        };

        const crearYEjecutarBusquedaCostos = (ordenVentaIds, clienteId) => {
            if (!ordenVentaIds || ordenVentaIds.length === 0) return [];
            let filters = [
                ['createdfrom', 'anyof', ordenVentaIds], 'AND',
                ['type', 'anyof', 'ItemShip'], 'AND',
                ['accounttype', 'anyof', 'COGS'], 'AND',
                ['debitamount', 'greaterthan', 0]
            ];
            if (clienteId) { filters.push('AND', ['entity', 'anyof', [clienteId]]); }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: ['createdfrom', 'item', 'debitamount']
                }));
            } catch (e) { log.error('Error al CREAR Búsqueda de Costos', e.toString()); return null; }
        };
        
        const crearYEjecutarBusquedaFacturasHistorial = (fechaFin, clienteId) => {
            let filters = [['mainline', 'is', 'T'], 'AND', ['trandate', 'onorbefore', fechaFin], 'AND', ['voided', 'is', 'F']];
            if (clienteId) { filters.push('AND', ['entity', 'anyof', [clienteId]]); }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.INVOICE,
                    filters: filters,
                    columns: ['internalid', 'entity', 'amount', 'duedate', 'trandate']
                }));
            } catch(e) { log.error('Error al CREAR Búsqueda de Facturas Historial', e.toString()); return null; }
        };
        
        const crearYEjecutarBusquedaAplicaciones = (fechaFin, clienteId) => {
            let filters = [['type', 'anyof', 'CustPymt', 'CustCred'], 'AND', ['trandate', 'onorbefore', fechaFin], 'AND', ['voided', 'is', 'F'], 'AND', ['appliedToTransaction', 'noneof', '@NONE@']];
            if (clienteId) { filters.push('AND', ['entity', 'anyof', [clienteId]]); }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: ['internalid', 'trandate', 'entity', 'appliedToTransaction', 'amount']
                }));
            } catch(e) { log.error('Error al CREAR Búsqueda de Aplicaciones', e.toString()); return null; }
        };
        
        const ejecutarBusquedaPaginada = (miBusqueda) => {
            let todosLosResultados = [];
            try {
                const pagedData = miBusqueda.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    todosLosResultados = todosLosResultados.concat(page.data);
                });
                return todosLosResultados;
            } catch (e) { log.error(`Error al ejecutar búsqueda paginada`, e.message); return null; }
        };

        const obtenerSemanaDelAno = (fecha) => {
            const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return `${fecha.getFullYear()}-${weekNo.toString().padStart(2, '0')}`;
        };

        return { execute };
    }
);