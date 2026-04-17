/**
 * @author Cristóbal Montenegro (https://github.com/cristobalmontenegro)

 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @Description 
 * File Cabinet API (RPC-style). 
 * Based on original work by Tim Dietrich. 
 * Allows external systems to read, create, and delete files/folders in the NetSuite File Cabinet.
 * Useful for SFTP integration sinks and local file synchronizers.
 */
define(['N/file', 'N/log', 'N/query', 'N/record'], function(file, log, query, record) {

    return {
        post: function(request) {
            if (!request.function) return { error: 'No function specified.' };

            try {
                switch (request.function) {
                    case 'fileCreate': return fileCreate(request);
                    case 'fileGet':    return fileGet(request);
                    case 'folderCreate': return folderCreate(request);
                    case 'folderDelete': return folderDelete(request);
                    case 'suiteQLRun':   return suiteQLRun(request);
                    default: return { error: 'Unsupported Function' };
                }
            } catch (e) {
                log.error('API Error', e);
                return { error: e.message };
            }
        }
    };

    function fileCreate(request) {
        let f = file.create({
            name: request.name,
            fileType: request.fileType,
            contents: request.contents,
            folder: request.folderID,
            encoding: request.encoding || file.Encoding.UTF_8
        });
        let id = f.save();
        return { success: true, id: id };
    }

    function fileGet(request) {
        let f = file.load({ id: request.fileID });
        return {
            name: f.name,
            size: f.size,
            contents: f.getContents()
        };
    }

    function folderCreate(request) {
        let r = record.create({ type: record.Type.FOLDER });
        r.setValue({ fieldId: 'name', value: request.name });
        if (request.parent) r.setValue({ fieldId: 'parent', value: request.parent });
        return { id: r.save() };
    }

    function folderDelete(request) {
        record.delete({ type: record.Type.FOLDER, id: request.folderID });
        return { success: true };
    }

    function suiteQLRun(request) {
        return { records: query.runSuiteQL(request.sql).asMappedResults() };
    }
});
