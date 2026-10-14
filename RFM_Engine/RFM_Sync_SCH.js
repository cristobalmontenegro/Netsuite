/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * @version 3.1
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @date 01-12-2025
 * @description
 * Script Sincronizador Desacoplado (v3.1).
 * Toma la semana más reciente calculada y la refleja en la ficha del Cliente:
 * cadena RFM de 7 dígitos (R F M P Z G D), Score, Rank, DuPont y Días Promedio de Pago.
 * 1. Detecta dinámicamente la semana más reciente (MAX) del sistema.
 * 2. Busca clientes de esa semana.
 * 3. Actualiza y LOGUEA con el formato original (RFM | Score | DuPont).
 */
define(['N/search', 'N/record', 'N/runtime', 'N/task', 'N/log'],
    (search, record, runtime, task, log) => {

        // --- CONSTANTES DE ORIGEN (Registro RFM) ---
        const TARGET_FIELD_ID = 'custentity_ultimo_rfm_cmc';
        const SOURCE_RECORD_ID = 'customrecord_rfm_cmc';
        const SOURCE_CUSTOMER_FIELD = 'custrecord_rfm_cliente';
        const SOURCE_WEEK_FIELD = 'custrecord_rfm_semana';
        
        // Campos para la cadena de texto RFM
        const SOURCE_R = 'custrecord_rfm_r';
        const SOURCE_F = 'custrecord_rfm_f';
        const SOURCE_M = 'custrecord_rfm_m';
        const SOURCE_P = 'custrecord_rfm_p';
        const SOURCE_Z = 'custrecord_rfm_z';
        const SOURCE_G = 'custrecord_rfm_g';
        const SOURCE_D = 'custrecord_rfm_d';

        // --- OTROS CAMPOS DE MÉTRICAS ---
        const SOURCE_VALOR_D = 'custrecord_v_d';   // Días Promedio (valor real)
        const SOURCE_SCORE = 'custrecord_score';     // Score (0-100)
        const SOURCE_RANK = 'custrecord_rank';       // Calificación (Letras)
        const SOURCE_DUPONT = 'custrecord_dupont';   // DuPont

        // --- CONSTANTES DE DESTINO (Ficha de Cliente) ---
        const TARGET_DPP = 'custentity_dpp_cmc';       // Días Promedio de Pago
        const TARGET_SCORE = 'custentity_score_cmc';   // Score
        const TARGET_RANK = 'custentity_rank_cmc';     // Rank
        const TARGET_DUPONT = 'custentity_dupont_cmc'; // DuPont

        const GOVERNANCE_THRESHOLD = 200; 
        const PARAM_CLIENTES_PENDIENTES = 'custscript_cmc_rfm_sync_clientes';

        const execute = (context) => {
            const script = runtime.getCurrentScript();
            let clientesParaProcesar = [];

            try {
                // Leer parámetro de reagendamiento
                let clientesPendientesStr = script.getParameter({ name: PARAM_CLIENTES_PENDIENTES });
                
                if (clientesPendientesStr) {
                    clientesParaProcesar = JSON.parse(clientesPendientesStr);
                    log.audit(`Reanudando Sincronizador v3.1`, `Procesando ${clientesParaProcesar.length} clientes restantes de la cola...`);
                } else {
                    // PASO 1: Lógica Dinámica - Obtener la semana MÁXIMA del sistema
                    const ultimaSemanaGlobal = obtenerSemanaMasRecienteDelSistema();
                    
                    if (!ultimaSemanaGlobal) {
                        log.audit('FIN', 'No se encontraron registros RFM en el sistema.');
                        return;
                    }

                    log.audit(`Iniciando Sincronizador v3.1`, `La semana más reciente detectada es: [${ultimaSemanaGlobal}]. Buscando clientes...`);
                    
                    // PASO 2: Buscar clientes que tengan datos de esa semana exacta
                    clientesParaProcesar = buscarClientesDeLaSemana(ultimaSemanaGlobal);
                    log.audit(`Clientes Encontrados`, `${clientesParaProcesar.length} clientes tienen datos para la semana ${ultimaSemanaGlobal}.`);
                }

                // --- Procesar cada cliente ---
                for (let i = 0; i < clientesParaProcesar.length; i++) {
                    const clienteId = clientesParaProcesar[i];
                    
                    // Verificar Gobernanza
                    const remainingUsage = script.getRemainingUsage();
                    if (remainingUsage < GOVERNANCE_THRESHOLD) {
                        const clientesRestantes = clientesParaProcesar.slice(i);
                        reschedule(clientesRestantes);
                        log.audit('Límite de Gobernanza Próximo', `Reagendando script. Quedan ${clientesRestantes.length} clientes pendientes.`);
                        return;
                    }

                    try {
                        actualizarClienteConMejorRFM(clienteId);
                    } catch (eCliente) {
                        log.error(`Error al procesar Cliente ID: ${clienteId}`, eCliente.toString());
                    }
                }

                log.audit('FIN Sincronizador v3.1', `Proceso completado.`);

            } catch (e) {
                log.error('Error Crítico en Sincronizador v3.1', e.toString());
            }
        };

        // --- LÓGICA NUEVA DE SEMANA MÁXIMA ---
        const obtenerSemanaMasRecienteDelSistema = () => {
            let maxSemana = '';
            search.create({
                type: SOURCE_RECORD_ID,
                columns: [
                    search.createColumn({
                        name: SOURCE_WEEK_FIELD,
                        summary: search.Summary.MAX
                    })
                ]
            }).run().each(result => {
                maxSemana = result.getValue({ name: SOURCE_WEEK_FIELD, summary: search.Summary.MAX });
                return false; 
            });
            return maxSemana;
        };

        const buscarClientesDeLaSemana = (semanaObjetivo) => {
            const clientesUnicos = new Set();
            search.create({
                type: SOURCE_RECORD_ID,
                filters: [
                    [SOURCE_WEEK_FIELD, 'is', semanaObjetivo],
                    'AND',
                    [SOURCE_CUSTOMER_FIELD, 'noneof', '@NONE@']
                ],
                columns: [
                    search.createColumn({
                        name: SOURCE_CUSTOMER_FIELD,
                        summary: search.Summary.GROUP
                    })
                ]
            }).run().each(result => {
                clientesUnicos.add(result.getValue({ name: SOURCE_CUSTOMER_FIELD, summary: search.Summary.GROUP }));
                return true;
            });
            return Array.from(clientesUnicos);
        };

        // --- LÓGICA ORIGINAL DE ACTUALIZACIÓN Y LOGS RESTAURADA ---
        const actualizarClienteConMejorRFM = (clienteId) => {
            const searchResult = search.create({
                type: SOURCE_RECORD_ID,
                filters: [
                    [SOURCE_CUSTOMER_FIELD, 'anyof', clienteId]
                ],
                columns: [
                    SOURCE_R, SOURCE_F, SOURCE_M, SOURCE_P, SOURCE_Z, SOURCE_G, SOURCE_D,
                    SOURCE_VALOR_D, 
                    SOURCE_SCORE,   
                    SOURCE_RANK,
                    SOURCE_DUPONT, 
                    // Mantenemos el sort por seguridad
                    search.createColumn({ name: SOURCE_WEEK_FIELD, sort: search.Sort.DESC })
                ]
            }).run().getRange({ start: 0, end: 1 }); 

            if (searchResult && searchResult.length > 0) {
                const ultimoRfm = searchResult[0];
                
                const R = ultimoRfm.getValue(SOURCE_R) || '0';
                const F = ultimoRfm.getValue(SOURCE_F) || '0';
                const M = ultimoRfm.getValue(SOURCE_M) || '0';
                const P = ultimoRfm.getValue(SOURCE_P) || '0';
                const Z = ultimoRfm.getValue(SOURCE_Z) || '0';
                const G = ultimoRfm.getValue(SOURCE_G) || '0';
                const D = ultimoRfm.getValue(SOURCE_D) || '0';
                
                const rfmScoreString = `${R}${F}${M}${P}${Z}${G}${D}`;

                const diasPromedioPago = parseFloat(ultimoRfm.getValue(SOURCE_VALOR_D)) || 0;
                const scoreValue = parseFloat(ultimoRfm.getValue(SOURCE_SCORE)) || 0;
                const rankValue = ultimoRfm.getValue(SOURCE_RANK) || '';
                const dupontValue = parseFloat(ultimoRfm.getValue(SOURCE_DUPONT)) || 0;

                record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: clienteId,
                    values: {
                        [TARGET_FIELD_ID]: rfmScoreString, 
                        [TARGET_DPP]: diasPromedioPago,    
                        [TARGET_SCORE]: scoreValue,        
                        [TARGET_RANK]: rankValue,
                        [TARGET_DUPONT]: dupontValue.toFixed(4)
                    }
                });
                
                // --- LOG ORIGINAL RESTAURADO ---
                log.debug(`Cliente ID ${clienteId} actualizado`, 
                    `Semana: ${ultimoRfm.getValue(SOURCE_WEEK_FIELD)} | RFM: ${rfmScoreString} | Score: ${scoreValue} | DuPont: ${dupontValue.toFixed(4)}`);
            } else {
                log.audit(`Cliente ID ${clienteId} no tiene registros RFM`, 'Se omitió la actualización.');
            }
        };

        const reschedule = (clientesRestantes) => {
            try {
                const script = runtime.getCurrentScript();
                task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: script.id,
                    deploymentId: script.deploymentId,
                    params: {
                        [PARAM_CLIENTES_PENDIENTES]: JSON.stringify(clientesRestantes)
                    }
                }).submit();
            } catch (e) {
                log.error('Error al Reagendar', e.toString());
            }
        };

        return { execute };
    }
);