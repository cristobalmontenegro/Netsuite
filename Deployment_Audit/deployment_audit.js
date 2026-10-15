/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @name deployment_audit
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)
 * @description Universal Script Deployment audit: filters by creator/type/status, audience (roles + run-as)
 *              detail mode, and JSON output. Works both inside NetSuite and as a public Suitelet (external URL).
 *
 * Fuente de datos:
 *  - SuiteQL: scriptdeployment JOIN script JOIN employee -> creador, script del script, filtros
 *  - Saved search por scriptid puntual: internalid real (para link ?id=<internal> via scriptrecord.nl)
 *
 * Modos:
 *  - default: listado rápido (sin record.load, sin search por fila). Links "Abrir" (si aplica) y "Roles".
 *  - verroles=T: modo detalle. Para cada fila filtrada obtiene internalid (search puntual) y audiencia (record.load).
 *  - format=json: JSON de resultados; con verroles=T incluye audiencia + internalId.
 *
 * Parámetros (todos opcionales):
 *   format   : html (default) | json
 *   verroles : T -> cargar internalId + audiencia
 *   creador  : substring en creador del script
 *   deployid : substring en scriptid del deployment (customdeploy_xxx)
 *   scriptid : substring en scriptid del script (customscript_xxx)
 *   titulo   : substring en title del deployment o nombre del script
 *   tipo     : tipo de script (suitelet, clientscript, userevent, etc. - s.scripttype)
 *   archivo  : substring en el nombre de archivo del script (f.name)
 *   allroles : all | T | F | null
 *   estado   : all | T | F
 *   recordtype: tipo de registro (dropdown poblado en runtime desde scriptdeployment.recordtype).
 *               "__NULL__" = solo deployments sin recordtype (Suitelets, Scheduled, RESTlets "en el aire").
 */
define(['N/query', 'N/search', 'N/url', 'N/record'],
    (query, search, url, record) => {

        // Obtiene el id numérico REAL de un deployment por scriptid, con saved search PUNTUAL
        // filtrando por 'scriptid' y leyendo result.id. Método que ya dio ids correctos (ej. 3283, 838).
        // Se usa por fila (≤50 por página); no hace barrido masivo.
        var idNumerico = function(scriptid) {
            try {
                var s = search.create({
                    type: 'scriptdeployment',
                    filters: [['scriptid', 'is', scriptid]],
                    columns: ['internalid']
                });
                var res = s.run().getRange({ start: 0, end: 1 });
                if (res && res.length && res[0].id) return String(res[0].id);
            } catch (e) {
                return null;
            }
            return null;
        };

        // Lee audiencia de un deployment dado su id numérico (record.load con número funciona).
        var registroRoles = null;
        var nombreRol = function(id) {
            try {
                if (registroRoles === null) {
                    registroRoles = {};
                    var q = query.runSuiteQL({ query: "SELECT id, name FROM role" });
                    var rls = q.asMappedResults();
                    for (var i = 0; i < rls.length; i++) {
                        registroRoles[String(rls[i].id)] = rls[i].name || String(rls[i].id);
                    }
                }
                return registroRoles['' + id] || String(id);
            } catch (e) {
                return String(id);
            }
        };

        var leerAudiencia = function(idNum) {
            try {
                var r = record.load({ type: 'scriptdeployment', id: String(idNum) });
                var roles = [];
                // Campos de audiencia del deployment:
                //  - audslctrole  : lista de roles que ejecutan/ven el script (ids reales de rol)
                //  - audslctextrole: puede venir con un valor distinto (no siempre es id de rol)
                var t = r.getValue({ fieldId: 'audslctrole' });
                if (t === null || t === undefined || t === '' || t === '0' || t === 'F') {
                    roles = [];
                } else if (typeof t === 'object' && Array.isArray(t)) {
                    roles = t.map(function(x) { return nombreRol(x); });
                } else {
                    roles = String(t).split(',').map(function(x) { return nombreRol(x.trim()); }).filter(Boolean);
                }
                var rr = r.getValue({ fieldId: 'runasrole' });
                return {
                    id: String(idNum),
                    roles: roles,
                    runasrole: rr ? nombreRol(rr) : null,
                    allroles: r.getValue({ fieldId: 'allroles' }) ? 'T' : 'F',
                    allemployees: r.getValue({ fieldId: 'allemployees' }) ? 'T' : 'F',
                    allpartners: r.getValue({ fieldId: 'allpartners' }) ? 'T' : 'F',
                    status: r.getValue({ fieldId: 'status' }),
                    isdeployed: r.getValue({ fieldId: 'isdeployed' }) ? 'T' : 'F'
                };
            } catch (e) {
                return { error: e.message.substring(0, 120) };
            }
        };

        const onRequest = (ctx) => {
            if (ctx.request.method !== 'GET') {
                ctx.response.write('Solo GET');
                return;
            }

            var params = ctx.request.parameters;
            var format = params.format || 'html';
            var verroles = params.verroles === 'T';
            var idDeploy = (params.idDeploy || '').trim();
            var PAGE_SIZE = 50;
            var pagina = parseInt(params.pagina, 10) || 1;
            if (pagina < 1) pagina = 1;
            var creador = (params.creador || '').trim();
            var allroles = params.allroles || 'all';
            var estado = params.estado || 'all';
            var deployid = (params.deployid || '').trim();
            var scriptsrch = (params.scriptid || '').trim();
            var titulo = (params.titulo || '').trim();
            var tipo = (params.tipo || '').trim();
            var archivo = (params.archivo || '').trim();
            var recordtype = (params.recordtype || '').trim();
            var esExterno = !!params.compid;

            // Carga los valores reales de scriptdeployment.recordtype en cada request.
            // Así, cuando se crea un nuevo custom record y se despliegan scripts sobre él,
            // aparece automáticamente en el dropdown. Sin caché, sin hardcode.
            // Distingue NULL (deployments "en el aire": Suitelets, Scheduled, RESTlets).
            var recordtypeOptions = [];
            try {
                var rtq = query.runSuiteQL({
                    query: "SELECT recordtype, COUNT(*) AS total FROM scriptdeployment GROUP BY recordtype ORDER BY total DESC"
                });
                var rtRows = rtq.asMappedResults();
                var totalNulos = 0;
                var conValor = [];
                for (var rti = 0; rti < rtRows.length; rti++) {
                    var rtKey = rtRows[rti].recordtype;
                    var rtCnt = Number(rtRows[rti].total) || 0;
                    if (rtKey === null || rtKey === '' || rtKey === 'null') {
                        totalNulos = rtCnt;
                    } else {
                        conValor.push({ valor: String(rtKey), total: rtCnt });
                    }
                }
                recordtypeOptions = { nulos: totalNulos, conValor: conValor };
            } catch (e) {
                recordtypeOptions = { nulos: 0, conValor: [], error: e.message };
            }

            var where = [];
            if (allroles === 'T') where.push("d.allroles = 'T'");
            else if (allroles === 'F') where.push("d.allroles = 'F'");
            else if (allroles === 'null') where.push("d.allroles IS NULL");
            if (estado === 'T') where.push("d.isdeployed = 'T'");
            else if (estado === 'F') where.push("d.isdeployed = 'F'");
            var esc = function(v) { return (v || '').replace(/'/g, "''"); };
            if (deployid) where.push("UPPER(d.scriptid) LIKE UPPER('%" + esc(deployid) + "%')");
            if (scriptsrch) where.push("UPPER(s.scriptid) LIKE UPPER('%" + esc(scriptsrch) + "%')");
            if (creador) {
                var c = esc(creador);
                where.push("(UPPER(e.firstname || ' ' || e.lastname) LIKE UPPER('%" + c + "%') " +
                    "OR UPPER(COALESCE(e.entityid, e.firstname || ' ' || e.lastname)) LIKE UPPER('%" + c + "%') " +
                    "OR UPPER(COALESCE(s.name, '')) LIKE UPPER('%" + c + "%'))");
            }
            if (titulo) {
                var ti = esc(titulo);
                where.push("(UPPER(COALESCE(d.title, '')) LIKE UPPER('%" + ti + "%') " +
                    "OR UPPER(COALESCE(s.name, '')) LIKE UPPER('%" + ti + "%'))");
            }
            if (tipo) where.push("UPPER(COALESCE(s.scripttype, '')) = UPPER('" + esc(tipo) + "')");
            if (archivo) where.push("UPPER(COALESCE(f.name, '')) LIKE UPPER('%" + esc(archivo) + "%')");
            // Filtro por Tipo de registro. Tres casos:
            //  - "__NULL__"  -> solo deployments sin recordtype (Suitelets/Scheduled/RESTlets "en el aire")
            //  - valor       -> match exacto case-insensitive (no substring, para no confundir SALESORDER con SALESORDER_xxx)
            //  - vacío       -> no filtra
            if (recordtype === '__NULL__') {
                where.push("(d.recordtype IS NULL OR d.recordtype = '')");
            } else if (recordtype) {
                where.push("UPPER(COALESCE(d.recordtype, '')) = UPPER('" + esc(recordtype) + "')");
            }

            var sql = "SELECT d.scriptid AS deploy_scriptid, d.title, d.allroles, d.isdeployed, d.recordtype AS rec_type, " +
                "s.scriptid AS script_scriptid, s.name AS script_name, s.scripttype AS script_type, " +
                "f.name AS script_file, " +
                "e.firstname, e.lastname, e.entityid " +
                "FROM scriptdeployment d " +
                "LEFT JOIN script s ON s.id = d.script " +
                "LEFT JOIN file f ON f.id = s.scriptfile " +
                "LEFT JOIN employee e ON e.id = s.owner";
            if (where.length > 0) sql += " WHERE " + where.join(" AND ");
            sql += " ORDER BY e.lastname, e.firstname, d.title";

            var result = query.runSuiteQL({ query: sql });
            var rows = result.asMappedResults();
            var host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            var rowsTotal = rows.length;

            // Paginación: solo resolver internalId/audiencia para la página actual (<= PAGE_SIZE),
            // para evitar timeout en listados grandes. El link "Abrir" siempre está disponible.
            var totalPaginas = Math.max(1, Math.ceil(rowsTotal / PAGE_SIZE));
            if (pagina > totalPaginas) pagina = totalPaginas;
            var inicio = (pagina - 1) * PAGE_SIZE;
            var rows = rows.slice(inicio, inicio + PAGE_SIZE);

            // Cada fila resuelve su id numérico vía saved search (result.id) para el link
            // scriptrecord.nl?id=<num> y para record.load de la audiencia.
            // Si viene idDeploy por URL (desde el link "Roles"), se reutiliza sin re-resolver.
            for (var i = 0; i < rows.length; i++) {
                var sid = rows[i].deploy_scriptid;
                var idNum = idDeploy || idNumerico(sid);
                rows[i]._id = idNum;
                if (verroles) {
                    rows[i]._aud = idNum ? leerAudiencia(idNum) : { error: 'No se pudo resolver id numerico de ' + sid };
                }
            }

            if (format === 'json') {
                var jsonResult = rows.map(function(row) {
                    var o = {
                        deployId: row.deploy_scriptid,
                        title: row.title,
                        allroles: row.allroles,
                        isdeployed: row.isdeployed,
                        recordType: row.rec_type || null,
                        scriptId: row.script_scriptid,
                        scriptName: row.script_name,
                        scriptType: row.script_type || null,
                        scriptFile: row.script_file || null,
                        creador: [row.firstname, row.lastname].filter(Boolean).join(' ') || row.entityid || null
                    };
                    if (verroles) o.audiencia = row._aud;
                    return o;
                });
                ctx.response.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
                ctx.response.write(JSON.stringify(jsonResult, null, 2));
                return;
            }

            var buildParams = function(extra) {
                var p = {};
                if (creador) p.creador = creador;
                if (deployid) p.deployid = deployid;
                if (scriptsrch) p.scriptid = scriptsrch;
                if (titulo) p.titulo = titulo;
                if (tipo) p.tipo = tipo;
                if (recordtype) p.recordtype = recordtype;
                if (allroles !== 'all') p.allroles = allroles;
                if (estado !== 'all') p.estado = estado;
                for (var k in extra) p[k] = extra[k];
                return p;
            };

            // Arma una URL de este mismo Suitelet preservando TODO el contexto de la request.
            // Base: los parámetros de la request (ctx.request.parameters) SIEMPRE tienen los
            // filtros actuales (deployid, idDeploy, script, deploy, etc.). Sobre eso se mezclan
            // los extras de la query URL (para capturar parámetros de sesión/entorno que a veces
            // no vienen en parameters) y luego se aplican los cambios del link (extra).
            var armarUrl = function(extra) {
                var base = ctx.request.url;
                var qIdx = base.indexOf('?');
                var path = qIdx >= 0 ? base.slice(0, qIdx) : base;
                var qs = qIdx >= 0 ? base.slice(qIdx + 1) : '';
                var pa = {};
                // 1) Params de la request (fuente principal y confiable: tiene deployid, idDeploy, filtros, script, deploy).
                for (var pk0 in params) { pa[pk0] = params[pk0]; }
                // 2) Extras de la query URL que no estén ya en parameters (parámetros de sesión/entorno).
                qs.split('&').forEach(function(kv) {
                    if (!kv) return;
                    var i2 = kv.indexOf('=');
                    var k = i2 >= 0 ? decodeURIComponent(kv.slice(0, i2)) : decodeURIComponent(kv);
                    if (!(k in pa)) {
                        var v = i2 >= 0 ? decodeURIComponent(kv.slice(i2 + 1)) : '';
                        pa[k] = v;
                    }
                });
                // 3) Aplicar cambios específicos del link (extra); null/''/undefined elimina.
                for (var ekey in extra) {
                    if (extra[ekey] === null || extra[ekey] === undefined || extra[ekey] === '') delete pa[ekey];
                    else pa[ekey] = extra[ekey];
                }
                // 4) Garantiza los parámetros obligatorios del Suitelet (script/deploy).
                if (params.script) pa.script = params.script;
                if (params.deploy) pa.deploy = params.deploy;
                var parts = [];
                for (var pk in pa) parts.push(encodeURIComponent(pk) + '=' + encodeURIComponent(pa[pk]));
                return path + (parts.length ? '?' + parts.join('&') : '');
            };

            var paginaUrl = function(targetPagina) {
                return armarUrl({ pagina: String(targetPagina) });
            };

            var jsonUrl = armarUrl({ format: 'json', verroles: verroles ? 'T' : null, pagina: String(pagina) });

            var rolUrl = armarUrl({ verroles: 'T', pagina: String(pagina), idDeploy: idDeploy ? String(idDeploy) : null });

            var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
                '<title>' + (verroles ? 'Audiencia de despliegue' : 'Auditoría de Deployments') + '</title>' +
                '<script>function doFiltro(e){e.preventDefault();' +
                'var qs=window.location.search;' +
                'var pa={};' +
                'if(qs.length>1){var q=qs.slice(1).split("&");for(var i=0;i<q.length;i++){var kv=q[i];' +
                'var i2=kv.indexOf("=");var k=i2>=0?decodeURIComponent(kv.slice(0,i2)):decodeURIComponent(kv);' +
                'var v=i2>=0?decodeURIComponent(kv.slice(i2+1)):"";pa[k]=v;}}' +
                'function Set(k,v){if(v===""){delete pa[k];}else{pa[k]=v;}}' +
                'Set("script",document.getElementById("f_script").value);' +
                'Set("deploy",document.getElementById("f_deploy").value);' +
                'Set("creador",document.getElementById("f_creador").value);' +
                'Set("deployid",document.getElementById("f_deployid").value);' +
                'Set("scriptid",document.getElementById("f_scriptid").value);' +
                'Set("titulo",document.getElementById("f_titulo").value);' +
                'Set("tipo",document.getElementById("f_tipo").value);' +
                'Set("archivo",document.getElementById("f_archivo").value);' +
                'var rt=document.getElementById("f_recordtype").value;if(rt===""){delete pa.recordtype;}else{pa.recordtype=rt;}' +
                'var ar=document.getElementById("f_allroles").value;if(ar==="all"){delete pa.allroles;}else{pa.allroles=ar;}' +
                'var es=document.getElementById("f_estado").value;if(es==="all"){delete pa.estado;}else{pa.estado=es;}' +
                'delete pa.pagina;delete pa.verroles;delete pa.format;' +
                'var parts=[];for(var kk in pa){parts.push(encodeURIComponent(kk)+"="+encodeURIComponent(pa[kk]));}' +
                'window.location.href=window.location.pathname+(parts.length?"?"+parts.join("&"):"");}' +
                '</script>' +
                '<style>' +
                'body { font-family: sans-serif; margin: 20px; }' +
                'h1 { color: #004085; }' +
                'table { border-collapse: collapse; width: 100%; font-size: 12px; }' +
                'th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }' +
                'th { background: #004085; color: white; position: sticky; top: 0; }' +
                'tr:nth-child(even) { background: #f2f2f2; }' +
                'a { color: #004085; text-decoration: none; }' +
                'a:hover { text-decoration: underline; }' +
                '.count { margin: 15px 0; color: #666; }' +
                '.filtros { background: #e8f0fe; padding: 12px; border-radius: 6px; margin-bottom: 12px; }' +
                '.filtros label { margin-right: 8px; font-size: 12px; }' +
                '.btn { padding: 6px 14px; background: #28a745; color: white; border: none; ' +
                'border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 5px; text-decoration: none; }' +
                '.btn:hover { background: #218838; }' +
                '.badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }' +
                '.bF { background: #fff3cd; color: #856404; }' +
                '.bT { background: #d4edda; color: #155724; }' +
                '.bNull { background: #e2e3e5; color: #383d41; }' +
                '.pag { margin: 12px 0; }' +
                '.pagcur { display:inline-block; background:#004085; color:#fff; padding:6px 10px; ' +
                'border-radius:4px; font-weight:bold; margin-right:3px; }' +
                '.paglnk { display:inline-block; background:#e8f0fe; color:#004085; padding:6px 10px; ' +
                'border-radius:4px; margin-right:3px; text-decoration:none; }' +
                '.paglnk:hover { background:#cfe0fc; }' +
                '.pts { margin:0 2px; color:#666; }' +
                '.detalle { background:#fff; border:1px solid #d8dde6; border-radius:8px; ' +
                'padding:8px 0; max-width:680px; box-shadow:0 1px 3px rgba(0,0,0,.08); }' +
                '.detitem { display:flex; padding:10px 16px; border-bottom:1px solid #eef1f6; align-items:baseline; }' +
                '.detitem:last-child { border-bottom:none; }' +
                '.detitem > span { width:150px; flex:none; color:#555; font-weight:600; font-size:13px; }' +
                '.detitem > b { color:#1d1d1d; }' +
                '</style></head><body>' +
                '<h1>' + (verroles
                    ? 'Audiencia de despliegue - ' + (deployid || 'resultados')
                    : 'Auditoría de Script Deployments') + '</h1>' +
                '<div class="filtros"><form onsubmit="doFiltro(event)">' +
                '<input type="hidden" id="f_script" value="' + (params.script || '') + '">' +
                '<input type="hidden" id="f_deploy" value="' + (params.deploy || '') + '">' +
                '<label>Creador: <input type="text" id="f_creador" value="' + (creador || '') + '" placeholder="ej: John Doe"></label>' +
                '<label>Deployment: <input type="text" id="f_deployid" value="' + (deployid || '') + '" placeholder="customdeploy_xxx"></label>' +
                '<label>Script: <input type="text" id="f_scriptid" value="' + (scriptsrch || '') + '" placeholder="customscript_xxx"></label>' +
                '<label>Título: <input type="text" id="f_titulo" value="' + (titulo || '') + '" placeholder="nombre del script"></label>' +
                '<label>Tipo: <input type="text" id="f_tipo" value="' + (tipo || '') + '" placeholder="ej: suitelet, clientscript, userevent"></label>' +
                '<label>Archivo: <input type="text" id="f_archivo" value="' + (archivo || '') + '" placeholder="ej: my_userevent.js"></label>' +
                '<label>Tipo de registro: <select id="f_recordtype">' +
                '<option value=""' + (!recordtype ? ' selected' : '') + '>Todos</option>' +
                '<option value="__NULL__"' + (recordtype === '__NULL__' ? ' selected' : '') + '>(no aplica / NULL — Suitelets, Scheduled...)</option>' +
                (function() {
                    // Dropdown poblado dinámicamente desde scriptdeployment.recordtype.
                    // Cuando se crea un nuevo custom record y se despliegan scripts sobre él,
                    // aparece automáticamente aquí en la próxima carga.
                    var html = '';
                    var builtIn = [];
                    var customs = [];
                    for (var ri = 0; ri < recordtypeOptions.conValor.length; ri++) {
                        var opt = recordtypeOptions.conValor[ri];
                        if (opt.valor.indexOf('customrecord_') === 0 || opt.valor.indexOf('custom_') === 0) {
                            customs.push(opt);
                        } else {
                            builtIn.push(opt);
                        }
                    }
                    if (builtIn.length > 0) {
                        html += '<optgroup label="Built-in">';
                        for (var bi = 0; bi < builtIn.length; bi++) {
                            var bo = builtIn[bi];
                            html += '<option value="' + bo.valor + '"' + (recordtype === bo.valor ? ' selected' : '') + '>' + bo.valor + ' (' + bo.total + ')</option>';
                        }
                        html += '</optgroup>';
                    }
                    if (customs.length > 0) {
                        html += '<optgroup label="Custom records">';
                        for (var ci = 0; ci < customs.length; ci++) {
                            var co = customs[ci];
                            html += '<option value="' + co.valor + '"' + (recordtype === co.valor ? ' selected' : '') + '>' + co.valor + ' (' + co.total + ')</option>';
                        }
                        html += '</optgroup>';
                    }
                    return html;
                })() +
                '</select></label>' +
                '<label>All roles: <select id="f_allroles">' +
                '<option value="all"' + (allroles === 'all' ? ' selected' : '') + '>Todos</option>' +
                '<option value="F"' + (allroles === 'F' ? ' selected' : '') + '>Solo F (restringido)</option>' +
                '<option value="T"' + (allroles === 'T' ? ' selected' : '') + '>Solo T (todos)</option>' +
                '<option value="null"' + (allroles === 'null' ? ' selected' : '') + '>Solo null</option>' +
                '</select></label>' +
                '<label>Desplegado: <select id="f_estado">' +
                '<option value="all"' + (estado === 'all' ? ' selected' : '') + '>Todos</option>' +
                '<option value="T"' + (estado === 'T' ? ' selected' : '') + '>Sí</option>' +
                '<option value="F"' + (estado === 'F' ? ' selected' : '') + '>No</option>' +
                '</select></label>' +
                '<button class="btn" type="submit">Filtrar</button>' +
                '</form></div>' +
                '<p class="count">Total: <b>' + rowsTotal + '</b> deployments | Mostrando ' + rows.length + ' (página ' + pagina + ' de ' + totalPaginas + ')' +
                (creador ? ' | Creador: ' + creador : '') +
                (deployid ? ' | Deployment: ' + deployid : '') +
                (scriptsrch ? ' | Script: ' + scriptsrch : '') +
                (titulo ? ' | Título: ' + titulo : '') +
                (tipo ? ' | Tipo: ' + tipo : '') +
                (recordtype ? ' | Tipo de registro: ' + (recordtype === '__NULL__' ? '(NULL)' : recordtype) : '') +
                (allroles !== 'all' ? ' | allroles=' + allroles : '') +
                (estado !== 'all' ? ' | desplegado=' + estado : '') + '</p>' +
                '<a href="' + jsonUrl + '" target="_blank" class="btn">Obtener JSON' + (verroles ? ' (con audiencia)' : '') + '</a>' +
                (!verroles ? '<a href="' + rolUrl + '" target="_blank" class="btn" style="background:#007bff;">Ver Audiencia de resultados</a>' : '') +
                '<div class="pag">' +
                (pagina > 1 ? '<a class="btn" style="background:#6c757d;" href="' + paginaUrl(pagina - 1) + '">&#8592; Anterior</a>' : '') +
                (function() {
                    var nums = '';
                    var vist = 1;
                    for (var pn = 1; pn <= totalPaginas && vist <= 9; pn++) {
                        if (totalPaginas > 9 && pn > 3 && pn < totalPaginas - 2) { pn = totalPaginas - 3; nums += '<span class="pts">…</span>'; continue; }
                        if (pn === pagina) { nums += '<span class="pagcur">' + pn + '</span>'; vist++; }
                        else { nums += '<a class="paglnk" href="' + paginaUrl(pn) + '">' + pn + '</a>'; vist++; }
                    }
                    return nums;
                })() +
                (pagina < totalPaginas ? '<a class="btn" style="background:#6c757d;" href="' + paginaUrl(pagina + 1) + '">Siguiente &#8594;</a>' : '') +
                '</div>';
                // --- RENDER ---
                // Caso detalle: verroles activo con un solo deployment -> tarjeta legible.
                // Caso normal / audiencias múltiples -> tabla.
                if (verroles && rows.length === 1) {
                    var rw = rows[0];
                    var creadorF = [rw.firstname, rw.lastname].filter(Boolean).join(' ') || rw.entityid || '-';
                    var rolesR = '-';
                    var runasR = '-';
                    var allR = rw.allroles === null ? 'null' : (rw.allroles === 'T' ? 'T' : 'F');
                    var actR = rw.isdeployed === 'T' ? 'Sí' : 'No';
                    if (rw._aud && !rw._aud.error) {
                        rolesR = rw._aud.roles && rw._aud.roles.length ? rw._aud.roles.join(', ') : '(sin roles específicos / todos los empleados)';
                        runasR = rw._aud.runasrole || '(no definido: corre con el rol del ejecutor)';
                    } else if (rw._aud && rw._aud.error) {
                        rolesR = 'ERR: ' + rw._aud.error;
                    }
                    var link = rw._id ? '<a href="' + ('https://' + host + '/app/common/scripting/scriptrecord.nl?id=' + rw._id) + '" target="_blank">' + (rw.deploy_scriptid || rw._id) + '</a>' : (rw.deploy_scriptid || '-');
                    html += '<div class="detalle">' +
                        '<div class="detitem"><span>Deployment</span><b>' + link + '</b></div>' +
                        '<div class="detitem"><span>Script</span><b>' + (rw.script_scriptid || '-') + '</b></div>' +
                        '<div class="detitem"><span>Archivo</span><b>' + (rw.script_file || '-') + '</b></div>' +
                        '<div class="detitem"><span>Título</span><b>' + (rw.title || (rw.script_name || '-')) + '</b></div>' +
                        '<div class="detitem"><span>Tipo</span><b>' + (rw.script_type || '-') + '</b></div>' +
                        '<div class="detitem"><span>Creador</span><b>' + creadorF + '</b></div>' +
                        '<div class="detitem"><span>All Roles</span><b><span class="badge ' + (rw.allroles === 'T' ? 'bT' : (rw.allroles === 'F' ? 'bF' : 'bNull')) + '">' + allR + '</span></b></div>' +
                        '<div class="detitem"><span>Activo</span><b><span class="badge ' + (rw.isdeployed === 'T' ? 'bT' : 'bF') + '">' + actR + '</span></b></div>' +
                        '<div class="detitem"><span>Roles audiencia</span><b>' + rolesR + '</b></div>' +
                        '<div class="detitem"><span>Run As</span><b>' + runasR + '</b></div>' +
                        '</div></body></html>';
                } else {
                    html += '<table><thead><tr>' +
                        '<th>#</th><th>Creador</th><th>Deployment</th><th>Script</th><th>Archivo</th><th>Título</th>' +
                        '<th>Tipo</th><th>Tipo de registro</th><th>All Roles</th><th>Activo</th>' +
                        (verroles ? '<th>ID</th><th>Roles Audiencia</th><th>Run As</th>' : '') +
                        '<th>Acciones</th>' +
                        '</tr></thead><tbody>';

                    for (var q = 0; q < rows.length; q++) {
                        var row = rows[q];
                        var creadorFull = [row.firstname, row.lastname].filter(Boolean).join(' ') || row.entityid || '-';
                        var allroleVal = row.allroles === null ? 'null' : (row.allroles === 'T' ? 'T' : 'F');
                        var badgeClass = 'b' + (row.allroles === 'T' ? 'T' : (row.allroles === 'F' ? 'F' : 'null'));
                        var activo = row.isdeployed === 'T' ? 'Sí' : 'No';
                        var activoClass = row.isdeployed === 'T' ? 'bT' : 'bF';

                        var acciones = '';
                        var singleRolUrl = armarUrl({ verroles: 'T', deployid: row.deploy_scriptid, idDeploy: row._id ? String(row._id) : null });
                        acciones = '<a href="' + singleRolUrl + '" target="_blank">Roles</a>';

                        var iidLnkValido = !esExterno && !!row._id;
                        html += '<tr>' +
                            '<td>' + (iidLnkValido ? '<a href="' + ('https://' + host + '/app/common/scripting/scriptrecord.nl?id=' + row._id) + '" target="_blank">' + (q + 1) + '</a>' : (q + 1)) + '</td>' +
                            '<td>' + creadorFull + '</td>' +
                            '<td>' + (row.deploy_scriptid || '') + '</td>' +
                            '<td>' + (row.script_scriptid || '') + '</td>' +
                            '<td>' + (row.script_file || '-') + '</td>' +
                            '<td>' + (row.title || (row.script_name || '')) + '</td>' +
                            '<td>' + (row.script_type || '-') + '</td>' +
                            '<td>' + (row.rec_type || '<span class="badge bNull">(no aplica)</span>') + '</td>' +
                            '<td><span class="badge ' + badgeClass + '">' + allroleVal + '</span></td>' +
                            '<td><span class="badge ' + activoClass + '">' + activo + '</span></td>';

                        if (verroles) {
                            var rolesStr = '-';
                            var runasStr = '-';
                            var iidStr = row._id || '-';
                            if (row._aud && !row._aud.error) {
                                rolesStr = row._aud.roles && row._aud.roles.length ? row._aud.roles.join(', ') : '(ningun rol especifico)';
                                runasStr = row._aud.runasrole || '-';
                            } else if (row._aud && row._aud.error) {
                                rolesStr = 'ERR: ' + row._aud.error;
                            }
                            html += '<td>' + iidStr + '</td><td>' + rolesStr + '</td><td>' + runasStr + '</td>';
                        }

                        html += '<td>' + (acciones || '-') + '</td></tr>';
                    }

                    html += '</tbody></table></body></html>';
                }

            ctx.response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' });
            ctx.response.write(html);

        };

        return { onRequest };
    });
