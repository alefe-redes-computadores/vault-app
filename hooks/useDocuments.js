"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDocumentsByType = exports.useDocument = exports.useFavorites = exports.useDocuments = void 0;
var dexie_react_hooks_1 = require("dexie-react-hooks");
var db_1 = require("@/lib/db");
function useDocuments(personId, categoryId) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () {
        var query = db_1.db.documents.toCollection();
        if (personId)
            query = query.filter(function (doc) { return doc.person_id === personId; });
        if (categoryId)
            query = query.filter(function (doc) { return doc.category_id === categoryId; });
        return query.reverse().sortBy('created_at');
    }, [personId, categoryId], []);
}
exports.useDocuments = useDocuments;
function useFavorites(personId) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () {
        var query = db_1.db.documents.filter(function (doc) { return doc.is_favorite === true; });
        if (personId)
            query = query.filter(function (doc) { return doc.person_id === personId; });
        return query.reverse().sortBy('created_at');
    }, [personId], []);
}
exports.useFavorites = useFavorites;
function useDocument(id) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () { return (id ? db_1.db.documents.get(id) : null); }, [id], null);
}
exports.useDocument = useDocument;
function useDocumentsByType(personId, type) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () { return db_1.db.documents.where({ person_id: personId, type: type }).toArray(); }, [personId, type], []);
}
exports.useDocumentsByType = useDocumentsByType;
