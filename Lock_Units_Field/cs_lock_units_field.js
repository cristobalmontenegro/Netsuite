/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Locks the 'Units' field on transaction lines using lineInit, postSourcing and
 *              fieldChanged for maximum compatibility.
 */
define([], () => {

    /**
     * Función auxiliar para deshabilitar el campo de unidades.
     * @param {Object} context El contexto del script del cliente.
     */
    function disableUnitsField(context) {
        const sublistId = context.sublistId;

        if (sublistId !== 'item' && sublistId !== 'inventory') {
            return;
        }

        try {
            const unitsField = context.currentRecord.getCurrentSublistField({
                sublistId: sublistId,
                fieldId: 'units'
            });

            if (unitsField && !unitsField.isDisabled) {
                unitsField.isDisabled = true;
            }
        } catch (e) {
            console.error('Error al intentar deshabilitar el campo de unidades.', e);
        }
    }

    /**
     * Se ejecuta cada vez que se inicia una nueva línea o se selecciona una existente.
     */
    function lineInit(context) {
        disableUnitsField(context);
    }

    /**
     * Se ejecuta DESPUÉS de que NetSuite ha terminado de obtener los datos de un campo.
     */
    function postSourcing(context) {
        if (context.fieldId === 'item') {
            disableUnitsField(context);
        }
    }

    /**
     * Se ejecuta cada vez que un campo es modificado por el usuario.
     * Esta es nuestra tercera capa de seguridad para reafirmar la regla.
     */
    function fieldChanged(context) {
        // Si el campo que cambió fue el 'artículo', volvemos a aplicar la lógica de bloqueo.
        if ((context.sublistId === 'item' || context.sublistId === 'inventory') && context.fieldId === 'item') {
            disableUnitsField(context);
        }
    }

    return {
        lineInit: lineInit,
        postSourcing: postSourcing,
        fieldChanged: fieldChanged
    };
});