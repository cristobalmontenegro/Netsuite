/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Disables the "Receive" button on an Inbound Shipment (view mode) until the
 *              custom checkbox marking that all costs are complete is checked.
 */
define(['N/log'], function(log) {

    // Custom body field (checkbox) on Inbound Shipment that enables receiving.
    const COSTS_COMPLETE_FIELD = 'custrecord_costoscompletos_cmc';


    /**
     * Se ejecuta antes de que la página del registro se cargue.
     * @param {Object} context
     * @param {Record} context.newRecord - El registro que se está cargando.
     * @param {string} context.type - El tipo de evento (e.g., VIEW, EDIT).
     * @param {Form} context.form - El objeto del formulario actual.
     */
    function beforeLoad(context) {
        // Solo queremos que se ejecute en modo VISTA (VIEW).
        if (context.type !== context.UserEventType.VIEW) {
            return;
        }

        const inboundShipment = context.newRecord;

        // Obtenemos el valor del checkbox.
        const costosCompletos = inboundShipment.getValue({
            fieldId: COSTS_COMPLETE_FIELD
        });

        // Si el checkbox NO está marcado (es false), deshabilitamos el botón.
        if (!costosCompletos) {
            try {
                // Obtenemos el botón "Recibir" desde el objeto del formulario.
                // El ID estándar del botón es 'receive'.
                const receiveButton = context.form.getButton({
                    id: 'receive'
                });

                if (receiveButton) {
                    // Esta es la forma correcta y robusta de deshabilitar el botón.
                    receiveButton.isDisabled = true;
                }
            } catch (e) {
                log.error({
                    title: 'Error al deshabilitar el botón Recibir',
                    details: e
                });
            }
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});