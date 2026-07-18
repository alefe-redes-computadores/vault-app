"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultMembers = exports.getVaultDocuments = exports.shareDocumentWithVault = exports.safeUpdateVaultMember = exports.safeAddVaultMember = exports.safeAddVault = exports.safeAddRenovacao = exports.safeAddMedicamento = exports.toggleFavorite = exports.safeDeleteDocument = exports.safeUpdateDocument = exports.safeAddDocument = exports.safeAddPerson = exports.db = void 0;
var dexie_1 = require("dexie");
var VaultDB = /** @class */ (function (_super) {
    __extends(VaultDB, _super);
    function VaultDB() {
        var _this = _super.call(this, 'vault-db') || this;
        _this.version(2).stores({
            persons: '++id, user_id, name, synced, created_at',
            documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at',
            syncQueue: '++id, table, operation, created_at',
        });
        _this.version(3).stores({
            persons: '++id, user_id, name, synced, created_at',
            documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at',
            syncQueue: '++id, table, operation, created_at',
            medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
            renovacoes: '++id, medicamento_id, data',
        });
        _this.version(4).stores({
            persons: '++id, user_id, name, synced, created_at',
            documents: '++id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
            syncQueue: '++id, table, operation, created_at',
            medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
            renovacoes: '++id, medicamento_id, data',
            vaults: '++id, user_id, name, synced, created_at',
            vaultMembers: '++id, vault_id, user_id, email, status, synced',
        });
        return _this;
    }
    return VaultDB;
}(dexie_1.default));
exports.db = new VaultDB();
// ============================================================
// OPERAÇÕES ATÔMICAS (safeAdd / safeUpdate / safeDelete)
// ============================================================
function nowIso() {
    return new Date().toISOString();
}
function safeAddPerson(person) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, person), { synced: false, created_at: timestamp, updated_at: timestamp });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.persons, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.persons.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'persons',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddPerson = safeAddPerson;
function safeAddDocument(doc) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, doc), { synced: false, created_at: timestamp, updated_at: timestamp });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.documents, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.documents.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'documents',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddDocument = safeAddDocument;
function safeUpdateDocument(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.transaction('rw', exports.db.documents, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                            var updated;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, exports.db.documents.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, exports.db.documents.get(id)];
                                    case 2:
                                        updated = _a.sent();
                                        return [4 /*yield*/, exports.db.syncQueue.add({
                                                table: 'documents',
                                                operation: 'update',
                                                payload: __assign({ id: id }, updated),
                                                created_at: timestamp,
                                            })];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateDocument = safeUpdateDocument;
function safeDeleteDocument(id) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.transaction('rw', exports.db.documents, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, exports.db.documents.delete(id)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, exports.db.syncQueue.add({
                                                table: 'documents',
                                                operation: 'delete',
                                                payload: { id: id },
                                                created_at: timestamp,
                                            })];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteDocument = safeDeleteDocument;
function toggleFavorite(id) {
    return __awaiter(this, void 0, Promise, function () {
        var doc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.documents.get(id)];
                case 1:
                    doc = _a.sent();
                    if (!doc)
                        return [2 /*return*/];
                    return [4 /*yield*/, safeUpdateDocument(id, { is_favorite: !doc.is_favorite })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.toggleFavorite = toggleFavorite;
// ============================================================
// OPERAÇÕES PARA MEDICAMENTOS
// ============================================================
function safeAddMedicamento(med) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, med), { created_at: timestamp, updated_at: timestamp, synced: false });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.medicamentos, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.medicamentos.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'medicamentos',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddMedicamento = safeAddMedicamento;
function safeAddRenovacao(ren) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, ren), { created_at: timestamp, updated_at: timestamp, synced: false });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.renovacoes, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.renovacoes.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'renovacoes',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddRenovacao = safeAddRenovacao;
// ============================================================
// OPERAÇÕES PARA COFRES FAMILIARES
// ============================================================
function safeAddVault(vault) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, vault), { created_at: timestamp, updated_at: timestamp, synced: false });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.vaults, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.vaults.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'vaults',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddVault = safeAddVault;
function safeAddVaultMember(member) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, full;
        var _this = this;
        return __generator(this, function (_a) {
            timestamp = nowIso();
            full = __assign(__assign({}, member), { invited_at: timestamp, updated_at: timestamp, synced: false });
            return [2 /*return*/, exports.db.transaction('rw', exports.db.vaultMembers, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                    var id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.db.vaultMembers.add(full)];
                            case 1:
                                id = _a.sent();
                                return [4 /*yield*/, exports.db.syncQueue.add({
                                        table: 'vaultMembers',
                                        operation: 'add',
                                        payload: __assign(__assign({}, full), { id: id }),
                                        created_at: timestamp,
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, id];
                        }
                    });
                }); })];
        });
    });
}
exports.safeAddVaultMember = safeAddVaultMember;
function safeUpdateVaultMember(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.transaction('rw', exports.db.vaultMembers, exports.db.syncQueue, function () { return __awaiter(_this, void 0, void 0, function () {
                            var updated;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, exports.db.vaultMembers.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, exports.db.vaultMembers.get(id)];
                                    case 2:
                                        updated = _a.sent();
                                        return [4 /*yield*/, exports.db.syncQueue.add({
                                                table: 'vaultMembers',
                                                operation: 'update',
                                                payload: __assign({ id: id }, updated),
                                                created_at: timestamp,
                                            })];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateVaultMember = safeUpdateVaultMember;
function shareDocumentWithVault(documentId, vaultId) {
    return __awaiter(this, void 0, Promise, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.transaction('rw', exports.db.documents, function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, exports.db.documents.update(documentId, { vault_id: vaultId })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.shareDocumentWithVault = shareDocumentWithVault;
function getVaultDocuments(vaultId) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.db.documents.where('vault_id').equals(vaultId).toArray()];
        });
    });
}
exports.getVaultDocuments = getVaultDocuments;
function getVaultMembers(vaultId) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.db.vaultMembers.where('vault_id').equals(vaultId).toArray()];
        });
    });
}
exports.getVaultMembers = getVaultMembers;
