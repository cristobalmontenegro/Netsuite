/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Blocks saving a custom "sales budget" record that duplicates an active
 *              Seller + Period + Classification combination.
 */
define(['N/search', 'N/error'], (search, error) => {

    const beforeSubmit = (context) => {
        // Ignorar si el usuario está eliminando el registro
        if (context.type === context.UserEventType.DELETE) return;

        const newRecord = context.newRecord;

        // Obtener los valores de los campos que definiste
        const vendedor = newRecord.getValue('custrecord_vendedor_ppto_cmc');
        const periodo = newRecord.getValue('custrecord_periodo_ppto_cmc');
        const clasificacion = newRecord.getValue('custrecord_clasificacion_ppto_cmc');

        // Solo validamos si los tres campos tienen información
        if (vendedor && periodo && clasificacion) {
            
            // Creamos la búsqueda para buscar duplicados
            const duplicateSearch = search.create({
                type: newRecord.type, // Automáticamente toma tu 'customrecord_pptoventas_cmc'
                filters: [
                    ['custrecord_vendedor_ppto_cmc', 'anyof', vendedor], 'AND',
                    ['custrecord_periodo_ppto_cmc', 'anyof', periodo], 'AND',
                    ['custrecord_clasificacion_ppto_cmc', 'anyof', clasificacion], 'AND',
                    ['isinactive', 'is', 'F'] // Solo buscar registros activos
                ]
            });

            // Si estamos EDITANDO un registro, debemos excluir el registro actual de la búsqueda
            // de lo contrario, chocará consigo mismo y no te dejará guardar cambios.
            if (context.type === context.UserEventType.EDIT) {
                duplicateSearch.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.NONEOF, 
                    values: newRecord.id
                }));
            }

            // Ejecutamos la búsqueda. Si encuentra al menos 1, hay duplicado.
            const count = duplicateSearch.runPaged().count;

            if (count > 0) {
                // Lanzamos el error en pantalla para bloquear el guardado
                throw error.create({
                    name: 'ERR_PRESUPUESTO_DUPLICADO',
                    message: 'Ya existe un presupuesto registrado para este Vendedor, en este Período y con esta Clasificación.',
                    notifyOff: true
                });
            }
        }
    };

    return { beforeSubmit };
});