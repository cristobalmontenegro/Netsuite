/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * @version 4.1 - Patrón "Marcador de Página" (Funcional)
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @date 06-11-2025
 * @description
 * Controlador de Backfill Serial.
 * Guarda y lee en un Registro Personalizado la próxima fecha a procesar
 * (customrecord_cmc_rfm_backfill_ctrl) y dispara el calculador RFM semana a
 * semana hasta completar el rango de fechas configurado.
 */
define(['N/task', 'N/log', 'N/format', 'N/runtime', 'N/record', 'N/search'],
    (task, log, format, runtime, record, search) => {

        // --- IDs DEL MARCADOR (REGISTRO PERSONALIZADO) ---
        // ID Interno del registro "Marcador de Fecha" que creaste
        const ID_REGISTRO_MARCADOR = 1; //
        
        // ID del tipo de registro
        const ID_TIPO_REGISTRO_MARCADOR = 'customrecord_cmc_rfm_backfill_ctrl'; //
        // ID del campo de fecha
        const ID_CAMPO_MARCADOR = 'custrecord_proxima_fecha_backfill'; //

        // --- IDs del Obrero ---
        const ID_SCRIPT_OBRERO = 'customscript_cmc_ss_calcularfm'; //
        const ID_DEPLOYMENT_OBRERO = 'customdeploy_cmc_ss_calcularfm_backfill'; //
        const ID_PARAM_OBRERO_SCRIPT = 'custscript_cmc_ss_calcularfm_fechacorte'; //

        // --- FECHAS "QUEMADAS" ---
        const FECHA_INICIO_STR = '03/01/2024'; //
        const FECHA_FIN_STR = '26/11/2025'; // Basado en tu último log (06/11/2025)

        const execute = (scriptContext) => {
            log.audit(`INICIO CONTROLADOR (v4.1 Marcador)`, `Buscando fecha en Marcador ID: ${ID_REGISTRO_MARCADOR}`);
            
            let fechaActualStr;
            try {
                // 1. Leer la fecha del "marcador"
                fechaActualStr = search.lookupFields({
                    type: ID_TIPO_REGISTRO_MARCADOR,
                    id: ID_REGISTRO_MARCADOR,
                    columns: [ID_CAMPO_MARCADOR]
                })[ID_CAMPO_MARCADOR];

                if (!fechaActualStr) {
                    fechaActualStr = FECHA_INICIO_STR;
                }

            } catch (e) {
                log.error('Error al LEER el marcador', `¿Existe el registro ID: ${ID_REGISTRO_MARCADOR}? Error: ${e.toString()}`);
                return; // No podemos continuar si no podemos leer
            }

            const fechaActual = format.parse({ value: fechaActualStr, type: format.Type.DATE });
            const fechaFin = format.parse({ value: FECHA_FIN_STR, type: format.Type.DATE });

            log.audit(`Procesando semana de: ${fechaActualStr}`);

            // 2. Verificar si ya terminamos el backfill
            if (fechaActual > fechaFin) {
                log.audit('FIN DEL BACKFILL', 'Todas las semanas han sido procesadas. Apagando el controlador...');
                
                // Apaga el despliegue actual
                try {
                    record.submitFields({
                        type: record.Type.SCRIPT_DEPLOYMENT,
                        id: runtime.getCurrentScript().deploymentId,
                        values: { 'status': 'NOTSCHEDULED' }
                    });
                } catch (e) {
                    log.error('Error al auto-apagar el despliegue', e.toString());
                }

                // Limpia el marcador de fecha
                record.submitFields({
                    type: ID_TIPO_REGISTRO_MARCADOR,
                    id: ID_REGISTRO_MARCADOR,
                    values: { [ID_CAMPO_MARCADOR]: '' }
                });
                return; 
            }

            try {
                // 3. Enviar la tarea para el "Obrero"
                let ssTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: ID_SCRIPT_OBRERO,
                    deploymentId: ID_DEPLOYMENT_OBRERO
                });
                ssTask.params = { [ID_PARAM_OBRERO_SCRIPT]: fechaActualStr };
                let taskId = ssTask.submit();
                log.debug(`Trabajo Obrero enviado para ${fechaActualStr}`, `ID: ${taskId}`);

                // 4. Calcular la próxima fecha (siguiente miércoles)
                let proximaFecha = new Date(fechaActual.getTime());
                proximaFecha.setDate(proximaFecha.getDate() + 7);
                let proximaFechaStr = format.format({ value: proximaFecha, type: format.Type.DATE });

                // 5. ACTUALIZAR EL "MARCADOR DE PÁGINA"
                record.submitFields({
                    type: ID_TIPO_REGISTRO_MARCADOR,
                    id: ID_REGISTRO_MARCADOR,
                    values: {
                        [ID_CAMPO_MARCADOR]: proximaFechaStr
                    }
                });
                
                log.audit('PRÓXIMA SEMANA LISTA', `Marcador actualizado a: ${proximaFechaStr}`);
            
            } catch (e) {
                // Si el obrero está ocupado (NO_DEPLOYMENTS_AVAILABLE)
                // el script fallará aquí, ANTES de actualizar el marcador.
                // Esto es bueno, porque reintentará la MISMA fecha en 15-30 mins.
                log.error(`Error al enviar el Obrero (v4.1) para ${fechaActualStr}`, e.toString());
            }
        };

        return { execute };
    }
);