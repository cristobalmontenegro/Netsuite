/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Companion Suitelet: forces reopening of a closed transaction by clearing the
 *              per-line "closed" flag (isclosed) and saving the record non-dynamically.
 */
define(['N/record', 'N/redirect', 'N/log'], (record, redirect, log) => {
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            // Obtenemos los parámetros que nos enviará el botón
            let recId = context.request.parameters.custparam_recid;
            let recType = context.request.parameters.custparam_rectype;

            if (recId && recType) {
                try {
                    // Cargamos el registro en modo NO dinámico (isDynamic: false)
                    // Esto es crucial para saltarnos validaciones de scripts de cliente y cálculos en tiempo real
                    let objRecord = record.load({
                        type: recType,
                        id: recId,
                        isDynamic: false 
                    });

                    let lineCount = objRecord.getLineCount({ sublistId: 'item' });
                    let changed = false;

                    // Recorremos las líneas para quitar el check de isclosed
                    for (let i = 0; i < lineCount; i++) {
                        let isClosed = objRecord.getSublistValue({ 
                            sublistId: 'item', 
                            fieldId: 'isclosed', 
                            line: i 
                        });
                        
                        if (isClosed) {
                            objRecord.setSublistValue({ 
                                sublistId: 'item', 
                                fieldId: 'isclosed', 
                                line: i, 
                                value: false 
                            });
                            changed = true;
                        }
                    }

                    // Si hubo cambios, guardamos forzando la acción
                    if (changed) {
                        objRecord.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true // Ignora si faltan campos obligatorios
                        });
                        log.audit('Reapertura Exitosa', `Transacción ${recType} con ID ${recId} reabierta.`);
                    }

                } catch (e) {
                    log.error('Error al reabrir la transacción', e.message);
                    // Aquí podrías redirigir a una página de error si lo deseas
                }
                
                // Redirigimos al usuario de vuelta a la transacción original
                redirect.toRecord({
                    type: recType,
                    id: recId
                });
            }
        }
    };

    return { onRequest };
});