/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * @version 16.2
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @date 16-09-2026
 * @description
 * RFM Engine — calcula 7 variables por cliente y semana (normalizadas 0-9):
 *   R Recencia · F Frecuencia · M Monetario · P Puntualidad · Z Plazo
 *   G Ganancia por Tonelada · D Días promedio de Pago
 * más los componentes NMON, NMGN, NMORA, NDPP, el SCORE consolidado (0-100),
 * el índice DuPont y la calificación por letras (AAA, BBA, ...).
 *
 * Historial de cambios:
 * - Optimización de gobernanza.
 * - Fórmula SCORE actualizada (NMORA en lugar de NDPP).
 * - CAMBIO v15.3: Se guarda el valor calculado de NMORA en el campo 'custrecord_nmora'.
 * - CAMBIO v16.0: Se excluyen clientes INACTIVOS (isinactive = T) del cálculo RFM (evita INVALID_FLD_VALUE en custrecord_rfm_cliente).
 * - CAMBIO v16.0: Control de gobernanza con reschedule (patrón de SS_SincronizarRFMaCliente) para evitar SSS_USAGE_LIMIT_EXCEEDED.
 * - CAMBIO v16.1: Exclusión de inactivos mediante búsqueda directa de customer (Set de IDs) en lugar de columnas JOIN.
 * - CAMBIO v16.2: Id de parámetro de cola corregido a custscript_cmc_ss_rfm_clientespend (máx. 20 caracteres). Si la cola llega inválida/truncada, NO se reagenda (corta el bucle).
 */
define(['N/runtime', 'N/search', 'N/log', 'N/format', 'N/record', 'N/task'],
    (runtime, search, log, format, record, task) => {

        // --- CONSTANTES DE GOBERNANZA (v16.0) ---
        const PARAM_CLIENTES_PENDIENTES = 'custscript_cmc_ss_rfm_clientespend';
        const PARAM_FECHA_CORTE = 'custscript_cmc_ss_calcularfm_fechacorte';
        const GOVERNANCE_THRESHOLD = 800;

        // --- FILTROS EXTRA OPCIONALES (solo si tu cuenta los necesita) ---
        // Déjalo vacío [] para una cuenta estándar. Si trabajas con localización
        // (p. ej. factura electrónica) agrega aquí TUS condiciones de cuenta,
        // reemplazando custbody_tucampo por el id de tu campo personalizado.
        // Ejemplo:
        //   const FILTROS_EXTRA_MAESTRA = [
        //     ['custbody_tiponc', search.Operator.NONEOF, ['3']], 'AND',
        //     [ [['trandate','onorafter','1/1/2024'],'AND',[['custbody_autorizacion','isnotempty','']]], 'OR',
        //       [['trandate','before','1/1/2024'],'AND',['item','anyof',['1234']]] ]
        //   ];
        const FILTROS_EXTRA_MAESTRA = [];

        const execute = (scriptContext) => {
            
            // --- CONFIGURACIÓN ---
            const IS_TEST_MODE = false; // true = Solo Logs (No guarda), false = Producción (Guarda)

            const script = runtime.getCurrentScript();
            const clienteIdParam = script.getParameter({ name: 'custscript_cmc_ss_calcularfm_idcliente' });
            const pendientesParam = script.getParameter({ name: PARAM_CLIENTES_PENDIENTES });

            let filtroClientes = clienteIdParam;
            let colaInvalida = false;
            if (!filtroClientes && pendientesParam) {
                try {
                    filtroClientes = JSON.parse(pendientesParam);
                    if (Array.isArray(filtroClientes) && filtroClientes.length === 0) filtroClientes = null;
                    if (filtroClientes) log.audit('MODO REANUDACIÓN', `Procesando ${filtroClientes.length} clientes pendientes de una corrida anterior.`);
                } catch (e) {
                    log.audit('Parámetro pendientes inválido', `No se pudo parsear la cola. Se procesarán todos los clientes. Detalle: ${e.toString()}`);
                    filtroClientes = null;
                    colaInvalida = true;
                }
            }

            log.audit(`INICIO`, `Iniciando cálculo RFM (Versión 16.2) - MODO: ${IS_TEST_MODE ? 'PRUEBA (Solo Log)' : 'PRODUCCIÓN (Guardado)'}`);
            
            if (clienteIdParam) {
                log.audit('MODO DEPURACIÓN', `Ejecutando script solo para el cliente ID: ${clienteIdParam}`);
            } else {
                log.audit('MODO PRODUCCIÓN', 'Ejecutando script para todos los clientes.');
            }

            // --- PASO 1: Cargar "diccionarios" ---
            const mapaCalificaciones = cargarMapaCalificaciones();
            if(!mapaCalificaciones) {
                log.error('FIN POR ERROR CRÍTICO', 'No se pudo cargar el registro de Mapeo RANK (customrecord_mapeorank).');
                return;
            }
            log.debug('Paso 1a', `Mapa de Calificaciones cargado con ${Object.keys(mapaCalificaciones).length} definiciones.`);

            const fechaCorteStr = script.getParameter({ name: 'custscript_cmc_ss_calcularfm_fechacorte' });
            const fechaCorte = fechaCorteStr ? format.parse({ value: fechaCorteStr, type: format.Type.DATE }) : new Date();
            fechaCorte.setHours(23, 59, 59, 999);
            const semanaCalculo = obtenerSemanaDelAno(fechaCorte);

            // --- NUEVA LÓGICA DE OPTIMIZACIÓN ---
            // Cargar todos los registros existentes para esta semana EN UNA SOLA BÚSQUEDA
            const mapaRegistrosExistentes = IS_TEST_MODE ? {} : cargarRegistrosExistentes(semanaCalculo);
            log.debug('Paso 1b', `Se encontraron ${Object.keys(mapaRegistrosExistentes).length} registros RFM existentes para la semana ${semanaCalculo}.`);
            // --- FIN LÓGICA DE OPTIMIZACIÓN ---

            let fechaInicioAnalisisRFM = new Date(fechaCorte);
            fechaInicioAnalisisRFM.setDate(fechaInicioAnalisisRFM.getDate() - 365);
            const fechaInicioStrRFM = format.format({ value: fechaInicioAnalisisRFM, type: format.Type.DATE });
            const fechaCorteStrFmt = format.format({ value: fechaCorte, type: format.Type.DATE });

            const clientesInactivos = obtenerClientesInactivos();
            log.audit('Clientes inactivos detectados', clientesInactivos.size);

            log.audit('Paso 2', 'Creando y ejecutando búsquedas dinámicas...');
            const resultadosMaestra = crearYEjecutarBusquedaMaestra(fechaInicioStrRFM, fechaCorteStrFmt, filtroClientes);
            const facturasHistorial = crearYEjecutarBusquedaFacturasHistorial(fechaCorteStrFmt, filtroClientes);
            const aplicacionesHistorial = crearYEjecutarBusquedaAplicaciones(fechaCorteStrFmt, filtroClientes);
            const ordenVentaIds = recolectarOrdenVentaIds(resultadosMaestra);
            const resultadosCostos = crearYEjecutarBusquedaCostos(ordenVentaIds, filtroClientes);

            if (!resultadosMaestra || !facturasHistorial || !aplicacionesHistorial || !resultadosCostos) {
                log.error('FIN POR ERROR', 'Una de las búsquedas dinámicas falló.'); return;
            }
            log.debug('Datos Cargados', `Maestra: ${resultadosMaestra.length}, Facturas Historial: ${facturasHistorial.length}, Aplicaciones: ${aplicacionesHistorial.length}, Costos: ${resultadosCostos.length}`);
            
            log.audit('Paso 3', 'Iniciando procesamiento y cálculos...');
            let datosClientes = {};
            procesarRFMZ(datosClientes, resultadosMaestra, clienteIdParam, clientesInactivos);
            procesarGanancia(datosClientes, resultadosMaestra, resultadosCostos, clienteIdParam);
            procesarPuntualidad(datosClientes, facturasHistorial, aplicacionesHistorial, fechaCorte, clienteIdParam, clientesInactivos);

            log.audit('Paso 4', `Consolidando resultados y ${IS_TEST_MODE ? 'enviando al log' : 'guardando en BD'}...`);
            
            if (IS_TEST_MODE) {
                log.debug('--- RESULTADOS FINALES (MODO PRUEBA) ---');
                log.debug(`Header CSV`, `Semana,Cliente,r,f,m,p,z,g,d,k,b,R,F,M,P,Z,G,D,NMON,NMGN,NMORA,SCORE,dupont,calificacion`);
            }

            const clientesAProcesar = Object.keys(datosClientes);
            for (let i = 0; i < clientesAProcesar.length; i++) {
                const clienteId = clientesAProcesar[i];
                const cliente = datosClientes[clienteId];
                if (cliente.frecuencia === 0 && cliente.montoTotalFacturadoHistorial === 0) continue;

                // --- CONTROL DE GOBERNANZA (v16.0): reagendar antes de quedarse sin presupuesto ---
                if (!IS_TEST_MODE && !colaInvalida) {
                    const remainingUsage = script.getRemainingUsage();
                    if (remainingUsage < GOVERNANCE_THRESHOLD) {
                        const clientesRestantes = clientesAProcesar.slice(i);
                        reschedule(JSON.stringify(clientesRestantes), fechaCorteStr);
                        log.audit('Gobernanza limitada', `Presupuesto restante: ${remainingUsage}. Reagendando con ${clientesRestantes.length} clientes pendientes (procesados: ${i}).`);
                        return;
                    }
                }
                
                // --- INICIO CÁLCULOS FINALES ---
                // Variables base (letras minúsculas)
                const r = cliente.ultimaFechaFactura ? Math.ceil((fechaCorte.getTime() - cliente.ultimaFechaFactura.getTime()) / (1000 * 3600 * 24)) : 365;
                const f = cliente.frecuencia;
                const m = cliente.monetario;
                const p = cliente.montoTotalFacturadoHistorial !== 0 ? (cliente.puntualidadPonderada / cliente.montoTotalFacturadoHistorial) : 0;
                const z = cliente.montoTotalPlazo !== 0 ? (cliente.plazoPonderado / cliente.montoTotalPlazo) : 0;
                const g = cliente.pesoTotalParaGanancia > 0 ? (cliente.gananciaTotal / (cliente.pesoTotalParaGanancia / 1000)) : 0;
                const d = cliente.montoTotalPago > 0 ? (cliente.diasPagoPonderado / cliente.montoTotalPago) : 0;
                const k = cliente.pesoTotalParaGanancia;
                const b = m > 0 ? (cliente.gananciaTotal / m) * 100 : 0;

                // Variables RFM normalizadas (letras mayúsculas 0-9)
                const R = Math.round(Math.max(0, (365 - r) / 365 * 9));
                const F = Math.min(9, Math.round(f / 12 * 9));
                const M = Math.max(0, Math.min(9, Math.round(Math.sqrt(Math.max(0, m) / 60000) * 9)));
                const P = Math.round(Math.min(9, (180 - Math.min(180, p)) / 180 * 9));
                const Z = Math.round(Math.min(9, (180 - Math.min(180, z)) / 180 * 9));
                const G = Math.max(0, Math.min(9, Math.round(g / 230 * 4)));
                const D = Math.round(Math.max(0, Math.min(9, 9 * (75 - d) / (75 - 8))));
                
                // --- CÁLCULO DE SCORE v15.2/15.3 ---
                const margenBruto = b / 100;
                
                // 1. NMON (Monto) - 40%
                const NMON = Math.max(0, Math.min(100, m / 1000));
                
                // 2. NMGN (Margen) - 30%
                const NMGN = Math.max(0, Math.min(100, 100 * (margenBruto - 0.08) / (0.17 - 0.08)));
                
                // 3. NMORA (Mora/Puntualidad 0-100) - 30% [NUEVO]
                // Se calcula igual que P pero en escala 0-100.
                // Si p=0 (puntual) -> 100. Si p=180 (moroso) -> 0.
                const NMORA = Math.max(0, Math.min(100, (180 - p) / 180 * 100));

                // NDPP (Se calcula SOLO para registro histórico, ya NO se usa en el Score)
                const NDPP = Math.max(0, Math.min(100, 100 * (75 - d) / (75 - 8)));
                
                // Fórmula Score Actualizada
                const SCORE = (NMON * 0.4 + NMGN * 0.3 + NMORA * 0.3);

                // Dupont y Calificación
                const dupont = (360 / Math.max(d, 1)) * Math.max(margenBruto, 0);

                let letra1, letra2, letra3;
                if (m >= 60000) letra1 = 'A'; else if (m >= 25000) letra1 = 'B'; else if (m >= 10000) letra1 = 'C'; else letra1 = 'D';
                if (dupont >= 2) letra2 = 'A'; else if (dupont >= 1.2) letra2 = 'B'; else if (dupont >= 0.6) letra2 = 'C'; else letra2 = 'D';
                if (d <= 8) letra3 = 'A'; else if (d <= 15) letra3 = 'B'; else if (d <= 30) letra3 = 'C'; else letra3 = 'D';
                const calificacion = `${letra1}${letra2}${letra3}`;
                
                const detalleCalificacion = mapaCalificaciones[calificacion] ? mapaCalificaciones[calificacion].detalle : 'Sin definición';
                const colorCalificacion = mapaCalificaciones[calificacion] ? mapaCalificaciones[calificacion].color : 'N/A';
                // --- FIN CÁLCULOS FINALES ---

                if (IS_TEST_MODE) {
                    const r_fmt = r > 365 ? 'N/A' : r;
                    log.debug(`Cliente ID: ${clienteId}`, `"${semanaCalculo}","${cliente.nombre}",${r_fmt},${f},${m.toFixed(2)},${p.toFixed(2)},${z.toFixed(2)},${g.toFixed(2)},${d.toFixed(2)},${k.toFixed(2)},${b.toFixed(2)},${R},${F},${M},${P},${Z},${G},${D},${NMON.toFixed(2)},${NMGN.toFixed(2)},${NMORA.toFixed(2)},${SCORE.toFixed(2)},${dupont.toFixed(4)},${calificacion}`);

                } else {
                    // --- MODO PRODUCCIÓN: Guardar en el registro ---
                    try {
                        // --- LÓGICA DE UPSERT OPTIMIZADA ---
                        const registroRfmId = mapaRegistrosExistentes[clienteId]; // Consulta el mapa (rápido)
                        let rfmRecord;

                        if (registroRfmId) {
                            rfmRecord = record.load({ type: 'customrecord_rfm_cmc', id: registroRfmId, isDynamic: true });
                        } else {
                            rfmRecord = record.create({ type: 'customrecord_rfm_cmc', isDynamic: true });
                        }

                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_cliente', value: clienteId });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_semana', value: semanaCalculo });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_r', value: R });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_f', value: F });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_m', value: M });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_p', value: P });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_z', value: Z });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_g', value: G });
                        rfmRecord.setValue({ fieldId: 'custrecord_rfm_d', value: D });
                        
                        // Guardar nuevo SCORE
                        rfmRecord.setValue({ fieldId: 'custrecord_score', value: SCORE.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_rank', value: calificacion });
                        
                        rfmRecord.setValue({ fieldId: 'custrecord_v_r', value: r > 365 ? null : r });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_f', value: f });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_m', value: m.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_p', value: p.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_z', value: z.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_g', value: g.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_d', value: d.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_k', value: k.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_v_b', value: b.toFixed(2) });
                        
                        rfmRecord.setValue({ fieldId: 'custrecord_nmon', value: NMON.toFixed(2) });
                        rfmRecord.setValue({ fieldId: 'custrecord_nmgn', value: NMGN.toFixed(2) });
                        // Guardamos NDPP por histórico, aunque ya no afecta al score
                        rfmRecord.setValue({ fieldId: 'custrecord_ndpp', value: NDPP.toFixed(2) });
                        
                        // --- AQUÍ ESTÁ EL CAMBIO V15.3: Guardar NMORA ---
                        rfmRecord.setValue({ fieldId: 'custrecord_nmora', value: NMORA.toFixed(2) });
                        
                        rfmRecord.setValue({ fieldId: 'custrecord_dupont', value: dupont.toFixed(4) });
                        rfmRecord.setValue({ fieldId: 'custrecord_rank_detalle', value: detalleCalificacion });
                        rfmRecord.setValue({ fieldId: 'custrecord_rank_color', value: colorCalificacion });
                        
                        const savedId = rfmRecord.save();
                        log.debug(`Guardado Exitoso - Cliente ID: ${clienteId}`, `Registro ${registroRfmId ? 'actualizado' : 'creado'} con ID: ${savedId}`);

                    } catch (e) {
                        const esClienteInvalido = e.name === 'INVALID_FLD_VALUE' && String(e.message || '').indexOf('custrecord_rfm_cliente') !== -1;
                        if (esClienteInvalido) {
                            log.audit(`Cliente ${clienteId} omitido (inactivo/cerrado)`, `${cliente.nombre}: ${e.message}`);
                        } else {
                            log.error(`Error al procesar/guardar Cliente ID: ${clienteId}`, e.toString());
                        }
                    }
                }
            }
            log.audit('FIN', 'Proceso de cálculo de RFM completado.');
        };

        const cargarMapaCalificaciones = () => {
            let mapa = {};
            try {
                const pagedData = search.create({
                    type: 'customrecord_mapeorank',
                    columns: ['custrecord_map_rank', 'custrecord_map_detalle', 'custrecord_map_color']
                }).runPaged({ pageSize: 1000 });

                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach(res => {
                        const rank = res.getValue({ name: 'custrecord_map_rank' });
                        if (rank) {
                            mapa[rank] = {
                                detalle: res.getValue({ name: 'custrecord_map_detalle' }),
                                color: res.getValue({ name: 'custrecord_map_color' })
                            };
                        }
                    });
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
                const pagedData = search.create({
                    type: 'customrecord_rfm_cmc',
                    filters: [
                        ['custrecord_rfm_semana', 'is', semana]
                    ],
                    columns: ['custrecord_rfm_cliente'] 
                }).runPaged({ pageSize: 1000 });

                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach(res => {
                        const clienteId = res.getValue({ name: 'custrecord_rfm_cliente' });
                        if (clienteId) {
                            mapa[clienteId] = res.id;
                        }
                    });
                });
                return mapa;
            } catch (e) {
                log.error(`Error en cargarRegistrosExistentes (Semana: ${semana})`, e.toString());
                return {}; // Devolver mapa vacío en caso de error
            }
        };


        const inicializarObjetoCliente = (nombre) => {
            return {
                nombre: nombre, recencia: null, frecuencia: 0, monetario: 0,
                plazoPonderado: 0, montoTotalPlazo: 0,
                puntualidadPonderada: 0, montoTotalFacturadoHistorial: 0,
                gananciaTotal: 0, pesoTotalParaGanancia: 0,
                diasPagoPonderado: 0, montoTotalPago: 0, 
                facturasHistorial: {}, ultimaFechaFactura: null
            };
        };
        
        const procesarRFMZ = (datosClientes, resultadosMaestra, clienteIdParam, clientesInactivos) => {
            let transaccionesAgregadas = {};
            resultadosMaestra.forEach(res => {
                if (clientesInactivos.has(res.getValue({ name: 'entity' }))) return;
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

            if (clienteIdParam) log.debug('--- INICIO DETALLE CÁLCULO RFZ (MODO DEPURACIÓN) ---');

            for (const idTransaccion in transaccionesAgregadas) {
                const tran = transaccionesAgregadas[idTransaccion];
                const clienteId = tran.clienteId;
                if (!datosClientes[clienteId]) {
                    datosClientes[clienteId] = inicializarObjetoCliente(tran.clienteNombre);
                }
                const cliente = datosClientes[clienteId];
                let logDetails = '';

                if (tran.tipo === 'CustInvc') {
                    if (!cliente.ultimaFechaFactura || tran.fecha > cliente.ultimaFechaFactura) {
                        if (clienteIdParam) log.debug(`>>> Nueva Fecha Recencia (Factura #${idTransaccion})`, `Fecha anterior: ${cliente.ultimaFechaFactura}, Nueva Fecha: ${tran.fecha}`);
                        cliente.ultimaFechaFactura = tran.fecha;
                    }
                    cliente.frecuencia++;
                    const diasCredito = Math.round((tran.fechaVencimiento.getTime() - tran.fecha.getTime()) / (1000 * 3600 * 24));
                    cliente.plazoPonderado += diasCredito * tran.montoTotal;
                    cliente.montoTotalPlazo += tran.montoTotal;

                    if (clienteIdParam) {
                        logDetails += ` | Frecuencia: +1 (Total: ${cliente.frecuencia})`;
                        logDetails += ` | Plazo (Z): +(${diasCredito} dias * ${tran.montoTotal.toFixed(2)})`;
                    }
                }
                cliente.monetario += tran.montoTotal;
                
                if (clienteIdParam) {
                    const logTitle = `Procesando Tran #${idTransaccion} (Tipo: ${tran.tipo})`;
                    logDetails = `Monetario: ${tran.montoTotal >= 0 ? '+' : ''}${tran.montoTotal.toFixed(2)} (Total: ${cliente.monetario.toFixed(2)})` + logDetails;
                    log.debug(logTitle, logDetails);
                }
            }
            if (clienteIdParam) log.debug('--- FIN DETALLE CÁLCULO RFZ ---');
        };
        
        const procesarGanancia = (datosClientes, resultadosMaestra, resultadosCostos, clienteIdParam) => {
            let mapaCostos = {};
            resultadosCostos.forEach(res => {
                const ordenVentaId = res.getValue({ name: 'createdfrom' });
                const itemId = res.getValue({ name: 'item' });
                const costoDeLinea = parseFloat(res.getValue({ name: 'debitamount' })) || 0;
                
                const clave = `${ordenVentaId}-${itemId}`;
                if (!mapaCostos[clave]) {
                    mapaCostos[clave] = 0;
                }
                mapaCostos[clave] += costoDeLinea;
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
                    mapaFactura[clave] = {
                        ingresoTotal: 0,
                        pesoTotal: 0,
                        clienteId: res.getValue({ name: 'entity' }),
                        facturaId: res.getValue({ name: 'internalid' })
                    };
                }

                mapaFactura[clave].ingresoTotal += parseFloat(res.getValue({ name: 'amount' })) || 0;
                
                const cantidadVenta = parseFloat(res.getValue({ name: 'quantity' })) || 0;
                const pesoUnitario = parseFloat(res.getValue({ name: 'weight', join: 'item' })) || 0;
                mapaFactura[clave].pesoTotal += cantidadVenta * pesoUnitario;
            });
            
            if (clienteIdParam) log.debug('--- INICIO DETALLE CÁLCULO GANANCIA (MODO DEPURACIÓN) ---');

            for (const clave in mapaFactura) {
                const dataFactura = mapaFactura[clave];
                const costoTotal = mapaCostos[clave] || 0;
                const margenTotal = dataFactura.ingresoTotal - costoTotal;

                const cliente = datosClientes[dataFactura.clienteId];
                if (cliente) {
                    cliente.gananciaTotal += margenTotal;
                    cliente.pesoTotalParaGanancia += dataFactura.pesoTotal;
                }

                if (clienteIdParam) {
                    const [soId, itemId] = clave.split('-');
                    const logTitle = `Factura #${dataFactura.facturaId}, Item #${itemId} (Agregado)`;
                    const logDetails = `Ingreso Total Líneas: ${dataFactura.ingresoTotal.toFixed(2)} | ` +
                                   `Costo Total Líneas (de Ejecuciones): ${costoTotal.toFixed(2)} | ` +
                                   `MARGEN TOTAL: ${margenTotal.toFixed(2)} | ` + 
                                   `Peso Total Líneas: ${dataFactura.pesoTotal.toFixed(2)} kg`;
                    log.debug(logTitle, logDetails);
                }
            }
            
            if (clienteIdParam) log.debug('--- FIN DETALLE CÁLCULO GANANCIA ---');
        };

        const procesarPuntualidad = (datosClientes, facturasHistorial, aplicacionesHistorial, fechaCorte, clienteIdParam, clientesInactivos) => {
           let aplicacionesProcesadas = new Set();
            
            if (clienteIdParam) log.debug('--- INICIO DETALLE CÁLCULO PUNTUALIDAD (MODO DEPURACIÓN) ---');
            if (clienteIdParam) log.debug('PASO P1: Cargando facturas históricas...');

            facturasHistorial.forEach(res => {
                const clienteId = res.getValue({ name: 'entity' });
                if(!clienteId || clientesInactivos.has(clienteId)) return;
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
                    if (clienteIdParam) log.debug(`Factura #${idFactura} cargada`, `Monto: ${cliente.facturasHistorial[idFactura].montoTotal.toFixed(2)}, Vence: ${cliente.facturasHistorial[idFactura].fechaVencimiento}`);
                }
            });
            
            if (clienteIdParam) log.debug('PASO P2: Procesando aplicaciones (Pagos / Notas de Crédito)...');

            aplicacionesHistorial.forEach(res => {
                const clienteId = res.getValue({ name: 'entity' });
                if (!clienteId || clientesInactivos.has(clienteId)) return;
                const idAplicacion = res.id + '-' + res.getValue({ name: 'appliedToTransaction' });
                if (aplicacionesProcesadas.has(idAplicacion)) return;
                if(!datosClientes[clienteId]) return;
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
                    if (clienteIdParam) log.debug(`Aplicación #${res.id} -> Factura #${idFacturaAplicada}`, `Monto Aplicado: ${montoAplicado.toFixed(2)}, Días Atraso (p): ${diasAtraso}, Días Pago (d): ${diasRealesDePago}`);
                }
            });

            if (clienteIdParam) log.debug('PASO P3: Calculando mora y pago de saldos pendientes a fecha de corte...');

            for (const clienteId in datosClientes) {
                if (clienteIdParam && clienteId !== clienteIdParam) continue;
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

                        if (clienteIdParam) log.debug(`Saldo Pendiente Factura #${idFactura}`, `Monto Pendiente: ${montoPendiente.toFixed(2)}, Días Atraso (p): ${diasAtraso}, Días Pago (d): ${diasRealesDePago}`);
                    }
                }
            }
            if (clienteIdParam) log.debug('--- FIN DETALLE CÁLCULO PUNTUALIDAD ---');
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
            // Filtros específicos de cuenta / localización (vacíos por defecto)
            if (FILTROS_EXTRA_MAESTRA.length > 0) {
                filters.push('AND', FILTROS_EXTRA_MAESTRA);
            }
            if (clienteId) {
                const ids = Array.isArray(clienteId) ? clienteId : [clienteId];
                filters.push('AND', ['entity', 'anyof', ids]);
            }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: ['internalid', 'trandate', 'type', 'entity', 'amount', 'total', 'duedate', 'createdfrom', 'item', 'rate', 'quantity',
                        search.createColumn({ name: 'type', join: 'item'}),
                        search.createColumn({ name: 'weight', join: 'item'}),
                        search.createColumn({ name: 'quantityuom'})
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
            if (clienteId) {
                const ids = Array.isArray(clienteId) ? clienteId : [clienteId];
                filters.push('AND', ['entity', 'anyof', ids]);
            }
            try {
                return ejecutarBusquedaPaginada(search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: [
                        'createdfrom', 
                        'item', 
                        'debitamount',
                        'quantityuom'
                    ]
                }));
            } catch (e) { log.error('Error al CREAR Búsqueda de Costos', e.toString()); return null; }
        };
        
        const crearYEjecutarBusquedaFacturasHistorial = (fechaFin, clienteId) => {
            let filters = [['mainline', 'is', 'T'], 'AND', ['trandate', 'onorbefore', fechaFin], 'AND', ['voided', 'is', 'F']];
            if (clienteId) {
                const ids = Array.isArray(clienteId) ? clienteId : [clienteId];
                filters.push('AND', ['entity', 'anyof', ids]);
            }
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
            if (clienteId) {
                const ids = Array.isArray(clienteId) ? clienteId : [clienteId];
                filters.push('AND', ['entity', 'anyof', ids]);
            }
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
            } catch (e) { log.error(`Error al ejecutar búsqueda paginada: ${e.name}`, e.message); return null; }
        };

        const obtenerClientesInactivos = () => {
            const filas = ejecutarBusquedaPaginada(search.create({
                type: search.Type.CUSTOMER,
                filters: [['isinactive', 'is', 'T']],
                columns: ['internalid']
            }));
            return new Set(filas ? filas.map(r => r.getValue({ name: 'internalid' })) : []);
        };

        const reschedule = (clientesJson, fechaCorteParam) => {
            try {
                const scriptActual = runtime.getCurrentScript();
                const paramsTarea = { [PARAM_CLIENTES_PENDIENTES]: clientesJson };
                if (fechaCorteParam) paramsTarea[PARAM_FECHA_CORTE] = fechaCorteParam;
                task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: scriptActual.id,
                    deploymentId: scriptActual.deploymentId,
                    params: paramsTarea
                }).submit();
                log.debug('Reagendamiento OK', `Cola de clientes pendientes guardada (${clientesJson.length} caracteres).`);
            } catch (e) {
                log.error('Error al reagendar SS_calculaRFM', e.toString());
            }
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