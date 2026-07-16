"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePersonsByUserId = exports.usePerson = exports.usePersons = void 0;
var dexie_react_hooks_1 = require("dexie-react-hooks");
var db_1 = require("@/lib/db");
function usePersons() {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () { return db_1.db.persons.toArray(); }, [], []);
}
exports.usePersons = usePersons;
function usePerson(id) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () { return (id ? db_1.db.persons.get(id) : null); }, [id], null);
}
exports.usePerson = usePerson;
function usePersonsByUserId(userId) {
    return (0, dexie_react_hooks_1.useLiveQuery)(function () { return db_1.db.persons.where('user_id').equals(userId).toArray(); }, [userId], []);
}
exports.usePersonsByUserId = usePersonsByUserId;
