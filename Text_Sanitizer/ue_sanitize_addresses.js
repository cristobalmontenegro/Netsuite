/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Sanitizes address fields and the SRI "legal name" field on Customers/Vendors
 *              before saving, and disables the address "override" checkbox for non-admins.
 */
define(['N/runtime', 'N/log'], (runtime, log) => {

    /**
     * ================== CONFIGURATION ==================
     * Adjust these to your account.
     */
    // Field that holds the SRI legal name (Ecuador localization). Set to your own field id,
    // or to null to skip legal-name sanitization.
    const SRI_LEGAL_NAME_FIELD = 'custentity_ft_lc_nomempsri_ec';

    // Role that is allowed to use the address "override" checkbox (default: 3 = Administrator).
    const ADMIN_ROLE_ID = 3;
    // ===================================================

    /**
     * Función que se ejecuta antes de que el registro se muestre al usuario.
     * Deshabilita el campo 'override' en la sublista de direcciones para no-administradores.
     */
    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {
            const userRole = runtime.getCurrentUser().role;
            // Only admins may use the address "override" checkbox
            if (userRole !== ADMIN_ROLE_ID) {
                try {
                    const addressSublist = context.form.getSublist({ id: 'addressbook' });
                    if (addressSublist) {
                        const overrideField = addressSublist.getField({ id: 'override' });
                        if (overrideField) {
                            overrideField.updateDisplayType({
                                displayType: 'DISABLED'
                            });
                        }
                    }
                } catch (e) {
                    // No hacer nada si falla, la validación en beforeSubmit es la importante.
                }
            }
        }
    }

    /**
     * Función que se ejecuta justo antes de que el registro se guarde en la base de datos.
     * Aquí se realiza la limpieza de los campos de la dirección y de la Razón Social.
     */
    function beforeSubmit(context) {
        const currentRecord = context.newRecord;

        // --- LÓGICA PARA LIMPIAR LA RAZÓN SOCIAL ---
        try {
            const razonSocialFieldId = SRI_LEGAL_NAME_FIELD;
            if (razonSocialFieldId) {
                const originalRazonSocial = currentRecord.getValue({ fieldId: razonSocialFieldId });
                if (originalRazonSocial) {
                    const sanitizedRazonSocial = sanitizeRazonSocial(originalRazonSocial);
                    currentRecord.setValue({ fieldId: razonSocialFieldId, value: sanitizedRazonSocial });
                }
            }
        } catch (e) {
            log.error('Error saneando Razón Social', e.message);
        }
        
        // --- LÓGICA PARA LIMPIAR DIRECCIONES ---
        const addressCount = currentRecord.getLineCount({ sublistId: 'addressbook' });

        for (let i = 0; i < addressCount; i++) {
            try {
                const addressSubrecord = currentRecord.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });

                // Campos de dirección a sanear
                const fieldsToSanitize = ['attention', 'addressee', 'addr1', 'addr2', 'addr3', 'city'];
                
                fieldsToSanitize.forEach(function(fieldId) {
                    const originalValue = addressSubrecord.getValue({ fieldId: fieldId });
                    if (originalValue) {
                        let sanitizedValue;
                        // Si el campo es 'addressee' o 'city', usamos una función que permite puntos.
                        // Para los demás, usamos la función original sin puntos.
                        if (fieldId === 'addressee' || fieldId === 'city') {
                            sanitizedValue = sanitizeAddresseeText(originalValue);
                        } else {
                            sanitizedValue = sanitizeAddressText(originalValue);
                        }
                        addressSubrecord.setValue({ fieldId: fieldId, value: sanitizedValue });
                    }
                });

            } catch (e) {
                log.error('Error saneando dirección en línea ' + i, e.message);
            }
        }
    }

    // --- FUNCIÓN DE LIMPIEZA PARA LA RAZÓN SOCIAL (AHORA PERMITE GUIONES) ---
    function sanitizeRazonSocial(text) {
        if (!text) { return ''; }

        let sanitized = text.toUpperCase(); // 1. Convertir todo a mayúsculas
        
        sanitized = sanitized
            .replace(/[ÁÀÄÂ]/g, 'A')
            .replace(/[ÉÈËÊ]/g, 'E')
            .replace(/[ÍÌÏÎ]/g, 'I')
            .replace(/[ÓÒÖÔ]/g, 'O')
            .replace(/[ÚÙÜÛ]/g, 'U') // 2. Quitar tildes
            .replace(/Ñ/g, 'N')       // 3. Reemplazar Ñ por N
            .replace(/&/g, 'Y')       // 4. Reemplazar & por Y
            // 5. Reemplazar .,#+()_[]{}"' por un espacio (¡SE QUITÓ EL GUIÓN DE ESTA LISTA!)
            .replace(/[.,#+()_\[\]{}"']/g, ' ') 
            // 6. Eliminar cualquier otro caracter especial, PERO permitiendo el guión (\-)
            .replace(/[^A-Z0-9\s\-]/g, ''); 

        // 7. Reemplazar múltiples espacios por uno solo y quitar espacios al inicio/final
        return sanitized.replace(/\s+/g, ' ').trim();
    }

    // --- FUNCIÓN QUE PERMITE PUNTOS (PARA ADDRESSEE Y CITY) ---
    function sanitizeAddresseeText(text) {
        if (!text) { return ''; }
        let sanitized = text.replace(/(\r\n|\n|\r|\t)/gm, " ");
        sanitized = sanitized
            .replace(/[ÁÀÄÂ]/g, 'A').replace(/[áàäâ]/g, 'a')
            .replace(/[ÉÈËÊ]/g, 'E').replace(/[éèëê]/g, 'e')
            .replace(/[ÍÌÏÎ]/g, 'I').replace(/[íìïî]/g, 'i')
            .replace(/[ÓÒÖÔ]/g, 'O').replace(/[óòöô]/g, 'o')
            .replace(/[ÚÙÜÛ]/g, 'U').replace(/[úùüû]/g, 'u')
            .replace(/[Ñ]/g, 'N').replace(/[ñ]/g, 'n')
            .replace(/[,]/g, '').replace(/[&]/g, 'Y'); 
        // El guión (\-) está protegido en esta lista
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s#()/\-.]/g, ''); 
        return sanitized.replace(/\s+/g, ' ').trim();
    }

    // --- FUNCIÓN ORIGINAL (PARA CAMPOS SIN PUNTOS) ---
    function sanitizeAddressText(text) {
        if (!text) { return ''; }
        let sanitized = text.replace(/(\r\n|\n|\r|\t)/gm, " ");
        sanitized = sanitized
            .replace(/[ÁÀÄÂ]/g, 'A').replace(/[áàäâ]/g, 'a')
            .replace(/[ÉÈËÊ]/g, 'E').replace(/[éèëê]/g, 'e')
            .replace(/[ÍÌÏÎ]/g, 'I').replace(/[íìïî]/g, 'i')
            .replace(/[ÓÒÖÔ]/g, 'O').replace(/[óòöô]/g, 'o')
            .replace(/[ÚÙÜÛ]/g, 'U').replace(/[úùüû]/g, 'u')
            .replace(/[Ñ]/g, 'N').replace(/[ñ]/g, 'n')
            .replace(/[.,]/g, '').replace(/[&]/g, 'Y');
        // El guión (\-) está protegido en esta lista
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s#()/\-]/g, '');
        return sanitized.replace(/\s+/g, ' ').trim();
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});