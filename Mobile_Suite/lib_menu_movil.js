/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Description 
 * Librería centralizada para el menú de navegación móvil de los Suitelets.
 * Proporciona una interfaz unificada (CSS/HTML) para aplicaciones móviles ligeras en NetSuite.
 * 
 * INSTRUCCIONES:
 * 1. Actualice los IDs de Script y Despliegue en el objeto CONFIG abajo.
 */
define(['N/url'], (url) => {

    // --- CONFIGURACIÓN DE LINKS ---
    // Reemplace los IDs con los IDs de sus Suitelets desplegados
    const CONFIG = {
        SCRIPTS: {
            prospectos:  { script: 'customscript_mobile_lead_sl',  deploy: 'customdeploy_mobile_lead_sl' },
            visitas:     { script: 'customscript_mobile_visit_sl', deploy: 'customdeploy_mobile_visit_sl' },
            stock:       { script: 'customscript_mobile_stock_sl', deploy: 'customdeploy_mobile_stock_sl' },
            pedidos:     { script: 'customscript_mobile_order_sl', deploy: 'customdeploy_mobile_order_sl' },
            mis_pedidos: { script: 'customscript_mobile_myorders_sl', deploy: 'customdeploy_mobile_myorders_sl' },
            casos:       { script: 'customscript_mobile_case_sl',  deploy: 'customdeploy_mobile_case_sl' },
            cartera:     { script: 'customscript_mobile_aging_sl', deploy: 'customdeploy_mobile_aging_sl' }
        }
    };

    /**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

     * Inyecta el CSS y el HTML del menú de navegación en el contenido HTML proporcionado.
     * @param {string} html - Contenido HTML original del Suitelet.
     * @param {string} token - Token de seguridad del empleado/vendedor.
     * @param {string} activo - ID de la pestaña activa.
     * @param {string} nombreVendedor - Nombre del usuario para mostrar en la barra.
     * @returns {string} HTML modificado con el menú inyectado.
     */
    function inyectarHeaderGlobal(html, token, activo, nombreVendedor) {
        
        const getUrl = (key) => {
            try {
                const cfg = CONFIG.SCRIPTS[key];
                if (!cfg) return '#';
                return url.resolveScript({
                    scriptId: cfg.script,
                    deploymentId: cfg.deploy,
                    params: { token: token },
                    returnExternalUrl: true
                });
            } catch (e) {
                return '#';
            }
        };

        const cssStyles = `
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { box-sizing: border-box; }
                body { font-family: -apple-system, system-ui, sans-serif; background-color: #f4f4f8; margin: 0; padding: 0; color: #333; }
                
                .nav-bar { background-color: #f8f9fa; padding: 12px 10px; text-align: center; border-bottom: 1px solid #ddd; white-space: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .nav-bar a { text-decoration: none; color: white; background-color: #007bff; padding: 10px 15px; border-radius: 5px; font-weight: bold; font-size: 14px; margin: 0 4px; display: inline-block; }
                .nav-bar a.active { background-color: #004085; border: 2px solid #002752; }
                .nav-bar a.lead-btn { background-color: #28a745; } 

                .user-info { background: #e9ecef; color: #495057; padding: 8px; text-align: center; font-size: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; }

                .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 15px; }
                .form-control, input, select, textarea { width: 100%; padding: 12px; margin: 5px 0 15px 0; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
                button, .btn-primary { width: 100%; padding: 15px; font-size: 16px; border-radius: 4px; border: none; background-color: #004085; color: white; font-weight: bold; cursor: pointer; }
            </style>
        `;

        const menuHtml = `
            <div class="nav-bar">
                <a href="${getUrl('prospectos')}" class="lead-btn ${activo === 'prospectos' ? 'active' : ''}">➕ LEAD</a>
                <a href="${getUrl('visitas')}" class="${activo === 'visitas' ? 'active' : ''}">📍 VISITAS</a>
                <a href="${getUrl('stock')}" class="${activo === 'stock' ? 'active' : ''}">📦 STOCK</a>
                <a href="${getUrl('pedidos')}" class="${activo === 'pedidos' ? 'active' : ''}">🛒 PEDIDOS</a>
                <a href="${getUrl('mis_pedidos')}" class="${activo === 'mis_pedidos' ? 'active' : ''}">📋 MIS PEDIDOS</a>
                <a href="${getUrl('casos')}" class="${activo === 'casos' ? 'active' : ''}">⚠️ CASOS</a>
                <a href="${getUrl('cartera')}" class="${activo === 'cartera' ? 'active' : ''}">💰 CARTERA</a>
            </div>
            <div class="user-info">
                👤 Usuario: ${nombreVendedor}
            </div>
            <div class="container">
        `;

        let newHtml = html;
        if (newHtml.match(/<head>/i)) {
            newHtml = newHtml.replace(/<head>/i, '<head>\n' + cssStyles);
        } else {
            newHtml = cssStyles + newHtml;
        }

        if (newHtml.match(/<body[^>]*>/i)) {
            newHtml = newHtml.replace(/(<body[^>]*>)/i, '$1\n' + menuHtml);
        } else {
            newHtml = menuHtml + newHtml;
        }
        
        return newHtml;
    }

    return { inyectarHeaderGlobal };

});
