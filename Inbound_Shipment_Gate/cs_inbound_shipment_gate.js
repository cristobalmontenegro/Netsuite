/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Client-side companion: visually disables the "Receive" button on Inbound Shipment
 *              (view mode) when the costs-complete checkbox is not checked.
 */
define([], function() {

    // Custom body field (checkbox) on Inbound Shipment that enables receiving.
    const COSTS_COMPLETE_FIELD = 'custrecord_costoscompletos_cmc';


    function pageInit(context) {
        // Log para saber siempre en qué modo estamos
        console.log('Script ejecutado en modo: ' + context.mode);

        // La acción de recibir solo existe en modo de VISTA. Si no estamos en ese modo, no hacemos nada.
        if (context.mode !== 'view') {
            return;
        }

        const currentRecord = context.currentRecord;

        // Obtenemos el valor de tu checkbox
        const costosCompletos = currentRecord.getValue({
            fieldId: COSTS_COMPLETE_FIELD
        });
        console.log('Valor de "Costos Completos":', costosCompletos);

        // Si la casilla NO está marcada, procedemos a deshabilitar el botón
        if (!costosCompletos) {
            try {
                // Buscamos el botón "Recibir" por su ID de HTML estándar ('receive')
                const receiveButton = document.getElementById('receive');

                if (receiveButton) {
                    // Deshabilitamos el botón visualmente cambiando su apariencia y comportamiento
                    receiveButton.style.pointerEvents = 'none'; // Evita que se pueda hacer clic
                    receiveButton.style.cursor = 'not-allowed'; // Muestra el cursor de "no permitido"
                    receiveButton.style.backgroundColor = '#f2f2f2'; // Color gris claro
                    receiveButton.style.color = '#888888'; // Color de texto gris
                    receiveButton.textContent = 'Recepción Bloqueada'; // Cambiamos el texto (Opcional)
                    
                    console.log('Botón "Recibir" ha sido deshabilitado en modo VISTA.');
                } else {
                    console.warn('El botón con id="receive" no fue encontrado en el DOM.');
                }
            } catch (e) {
                console.error('Error al intentar deshabilitar el botón "Recibir":', e);
            }
        }
    }

    return {
        pageInit: pageInit
    };
});