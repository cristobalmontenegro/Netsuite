/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Adds a "Reopen Transaction" button on closed transactions. The button calls the
 *              companion Suitelet (sl_force_reopen.js) which clears the per-line "closed" flag.
 */
define(['N/url', 'N/log', 'N/ui/serverWidget'], (url, log, serverWidget) => {

    // ===== CONFIGURATION =====
    // Script/deployment ids of the companion Suitelet (sl_force_reopen.js) in YOUR account.
    const REOPEN_SUITELET_SCRIPT_ID = 'customscript_sl_force_reopen';
    const REOPEN_SUITELET_DEPLOY_ID = 'customdeploy_sl_force_reopen';
    // =========================

    
    const beforeLoad = (context) => {
        // Solo en modo VISTA
        if (context.type === context.UserEventType.VIEW) {
            let rec = context.newRecord;
            let status = rec.getValue('statusRef'); 
            
            // Si la transacción está cerrada, mostramos el botón
            if (status === 'closed') {
                try {
                    let suiteletUrl = url.resolveScript({
                        scriptId: REOPEN_SUITELET_SCRIPT_ID, 
                        deploymentId: REOPEN_SUITELET_DEPLOY_ID, 
                        params: {
                            custparam_recid: rec.id,
                            custparam_rectype: rec.type
                        }
                    });

                    // 1. INYECTAMOS LA FUNCIÓN JS DIRECTO AL NAVEGADOR
                    let scriptField = context.form.addField({
                        id: 'custpage_reapertura_script',
                        label: 'Script Oculto',
                        type: serverWidget.FieldType.INLINEHTML
                    });
                    
                    scriptField.defaultValue = `<script>
                        function llamarSuiteletReapertura() {
                            // Eliminamos alertas molestas de "Seguro que quieres salir"
                            window.onbeforeunload = null; 
                            // Redirigimos al Suitelet
                            window.location.replace('${suiteletUrl}');
                        }
                    </script>`;

                    // 2. EL BOTÓN AHORA LLAMA A LA FUNCIÓN LIMPIA
                    context.form.addButton({
                        id: 'custpage_btn_reabrir_ov',
                        label: 'Reabrir Transacción',
                        functionName: 'llamarSuiteletReapertura'
                    });
                    
                } catch (e) {
                    log.error('Error al generar botón de reapertura', e.message);
                }
            }
        }
    };

    return { beforeLoad };
});