/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Sanitizes description text on item records and on sales transaction lines
 *              before saving (strips line breaks, accents, and special characters).
 */
define(['N/log'], (log) => {

    /**
     * Función que se ejecuta justo antes de que el registro se guarde en la base de datos.
     */
    function beforeSubmit(context) {
        // Solo se ejecuta en eventos de creación o edición.
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        const currentRecord = context.newRecord;
        const recordType = currentRecord.type;
        
        // Lista de transacciones en las que se limpiarán las líneas de artículos.
        const transactionTypes = ['salesorder', 'itemfulfillment', 'invoice', 'creditmemo'];

        // PARTE 2: Lógica para limpiar las líneas de las TRANSACCIONES
        if (transactionTypes.indexOf(recordType) > -1) {
            try {
                const lineCount = currentRecord.getLineCount({ sublistId: 'item' });
                for (let i = 0; i < lineCount; i++) {
                    const originalDescription = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: i
                    });

                    if (originalDescription) {
                        const sanitizedDescription = sanitizeDescription(originalDescription);
                        currentRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'description',
                            line: i,
                            value: sanitizedDescription
                        });
                    }
                }
            } catch (e) {
                log.error('Error limpiando líneas de transacción', 'Tipo: ' + recordType + ' | Error: ' + e.message);
            }
        } 
        // PARTE 1: Lógica para limpiar la ficha del ARTÍCULO
        else {
            try {
                // Limpiar el campo "Sales Description"
                const salesDesc = currentRecord.getValue({ fieldId: 'salesdescription' });
                if (salesDesc) {
                    currentRecord.setValue({ fieldId: 'salesdescription', value: sanitizeDescription(salesDesc) });
                }

                // Limpiar el campo "Description" (usado en algunos tipos de artículos)
                const itemDesc = currentRecord.getValue({ fieldId: 'description' });
                if (itemDesc) {
                    currentRecord.setValue({ fieldId: 'description', value: sanitizeDescription(itemDesc) });
                }
            } catch (e) {
                log.error('Error limpiando ficha de artículo', 'Tipo: ' + recordType + ' | Error: ' + e.message);
            }
        }
    }

    /**
     * Función auxiliar para sanear texto de descripciones.
     * @param {string} text - El texto original a limpiar.
     * @returns {string} - El texto saneado.
     */
    function sanitizeDescription(text) {
        if (!text) { return ''; }
        
        // Reemplaza saltos de línea y tabulaciones con un espacio.
        let sanitized = text.replace(/(\r\n|\n|\r|\t)/gm, " ");
        
        sanitized = sanitized
            // Reemplaza vocales con tildes y diéresis por su versión simple.
            .replace(/[ÁÀÄÂ]/g, 'A').replace(/[áàäâ]/g, 'a')
            .replace(/[ÉÈËÊ]/g, 'E').replace(/[éèëê]/g, 'e')
            .replace(/[ÍÌÏÎ]/g, 'I').replace(/[íìïî]/g, 'i')
            .replace(/[ÓÒÖÔ]/g, 'O').replace(/[óòöô]/g, 'o')
            .replace(/[ÚÙÜÛ]/g, 'U').replace(/[úùüû]/g, 'u')
            // Reemplaza Ñ por N.
            .replace(/[Ñ]/g, 'N').replace(/[ñ]/g, 'n')
            // Elimina puntos y comas. Reemplaza & por Y.
            .replace(/[.,]/g, '').replace(/[&]/g, 'Y');
            
        // Elimina cualquier caracter que NO sea alfanumérico, espacio o uno de los siguientes: #()/-
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s#()/\-]/g, '');
        
        // Reemplaza múltiples espacios por uno solo y elimina espacios al inicio/final.
        return sanitized.replace(/\s+/g, ' ').trim();
    }

    return {
        beforeSubmit: beforeSubmit
    };
});