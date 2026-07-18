"use strict";
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
exports.useSyncQueue = void 0;
var db_1 = require("@/lib/db");
var react_1 = require("react");
var client_1 = require("@/lib/supabase/client");
function useSyncQueue() {
    var _this = this;
    var _a = (0, react_1.useState)(false), isProcessing = _a[0], setIsProcessing = _a[1];
    var _b = (0, react_1.useState)(function () {
        return typeof navigator !== 'undefined' ? navigator.onLine : false;
    }), isOnline = _b[0], setIsOnline = _b[1];
    (0, react_1.useEffect)(function () {
        var handleOnline = function () { return setIsOnline(true); };
        var handleOffline = function () { return setIsOnline(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return function () {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    var processQueue = function () { return __awaiter(_this, void 0, void 0, function () {
        var queue, _i, queue_1, item, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isOnline || isProcessing)
                        return [2 /*return*/];
                    setIsProcessing(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 15, 16, 17]);
                    return [4 /*yield*/, db_1.db.syncQueue.toArray()];
                case 2:
                    queue = _a.sent();
                    _i = 0, queue_1 = queue;
                    _a.label = 3;
                case 3:
                    if (!(_i < queue_1.length)) return [3 /*break*/, 14];
                    item = queue_1[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 12, , 13]);
                    if (!(item.table === 'documents')) return [3 /*break*/, 6];
                    return [4 /*yield*/, syncDocument(item)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 6:
                    if (!(item.table === 'vaults')) return [3 /*break*/, 8];
                    return [4 /*yield*/, syncVault(item)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    if (!(item.table === 'vaultMembers')) return [3 /*break*/, 10];
                    return [4 /*yield*/, syncVaultMember(item)];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [4 /*yield*/, db_1.db.syncQueue.delete(item.id)];
                case 11:
                    _a.sent();
                    return [3 /*break*/, 13];
                case 12:
                    error_1 = _a.sent();
                    console.error('Erro ao sincronizar item:', item, error_1);
                    return [3 /*break*/, 13];
                case 13:
                    _i++;
                    return [3 /*break*/, 3];
                case 14: return [3 /*break*/, 17];
                case 15:
                    error_2 = _a.sent();
                    console.error('Erro ao processar fila:', error_2);
                    return [3 /*break*/, 17];
                case 16:
                    setIsProcessing(false);
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    }); };
    var syncDocument = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var doc, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!client_1.supabase)
                        return [2 /*return*/];
                    doc = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case 'add': return [3 /*break*/, 1];
                        case 'update': return [3 /*break*/, 3];
                        case 'delete': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client_1.supabase.from('documents').insert({
                        id: doc.id,
                        person_id: doc.person_id,
                        category_id: doc.category_id,
                        type: doc.type,
                        title: doc.title,
                        description: doc.description,
                        metadata: doc.metadata,
                        attachments: doc.attachments,
                        is_favorite: doc.is_favorite,
                        vault_id: doc.vault_id || null,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                    })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 3: return [4 /*yield*/, client_1.supabase.from('documents')
                        .update({
                        title: doc.title,
                        description: doc.description,
                        metadata: doc.metadata,
                        attachments: doc.attachments,
                        is_favorite: doc.is_favorite,
                        vault_id: doc.vault_id || null,
                        updated_at: doc.updated_at,
                    })
                        .eq('id', doc.id)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, client_1.supabase.from('documents')
                        .delete()
                        .eq('id', item.payload.id)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 7:
                    if (!(item.operation !== 'delete' && doc.id)) return [3 /*break*/, 9];
                    return [4 /*yield*/, db_1.db.documents.update(doc.id, { synced: true })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var syncVault = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var vault, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!client_1.supabase)
                        return [2 /*return*/];
                    vault = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case 'add': return [3 /*break*/, 1];
                        case 'update': return [3 /*break*/, 3];
                        case 'delete': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client_1.supabase.from('vaults').insert({
                        id: vault.id,
                        user_id: vault.user_id,
                        name: vault.name,
                        description: vault.description || null,
                        icon: vault.icon,
                        color: vault.color,
                        created_at: vault.created_at,
                        updated_at: vault.updated_at,
                    })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 3: return [4 /*yield*/, client_1.supabase.from('vaults')
                        .update({
                        name: vault.name,
                        description: vault.description || null,
                        icon: vault.icon,
                        color: vault.color,
                        updated_at: vault.updated_at,
                    })
                        .eq('id', vault.id)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, client_1.supabase.from('vaults')
                        .delete()
                        .eq('id', item.payload.id)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 7:
                    if (!(item.operation !== 'delete' && vault.id)) return [3 /*break*/, 9];
                    return [4 /*yield*/, db_1.db.vaults.update(vault.id, { synced: true })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var syncVaultMember = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var member, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!client_1.supabase)
                        return [2 /*return*/];
                    member = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case 'add': return [3 /*break*/, 1];
                        case 'update': return [3 /*break*/, 3];
                        case 'delete': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client_1.supabase.from('vault_members').insert({
                        id: member.id,
                        vault_id: member.vault_id,
                        user_id: member.user_id,
                        email: member.email,
                        name: member.name || null,
                        permission: member.permission,
                        invited_by: member.invited_by,
                        status: member.status,
                        invited_at: member.invited_at,
                        updated_at: member.updated_at,
                    })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 3: return [4 /*yield*/, client_1.supabase.from('vault_members')
                        .update({
                        name: member.name || null,
                        permission: member.permission,
                        status: member.status,
                        updated_at: member.updated_at,
                    })
                        .eq('id', member.id)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, client_1.supabase.from('vault_members')
                        .delete()
                        .eq('id', item.payload.id)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 7:
                    if (!(item.operation !== 'delete' && member.id)) return [3 /*break*/, 9];
                    return [4 /*yield*/, db_1.db.vaultMembers.update(member.id, { synced: true })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline]);
    return { processQueue: processQueue, isProcessing: isProcessing, isOnline: isOnline };
}
exports.useSyncQueue = useSyncQueue;
