// hooks/useSyncQueue.ts
"use client";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSyncQueue = void 0;
var db_1 = require("@/lib/db");
var react_1 = require("react");
var client_1 = require("@/lib/supabase/client");
var MAX_RETRIES = 5;
var MAX_BACKOFF_MS = 60000;
function useSyncQueue() {
    var _this = this;
    var _a = (0, react_1.useState)(false), isProcessing = _a[0], setIsProcessing = _a[1];
    var _b = (0, react_1.useState)(function () {
        return typeof navigator !== "undefined" ? navigator.onLine : false;
    }), isOnline = _b[0], setIsOnline = _b[1];
    var _c = (0, react_1.useState)([]), syncLogs = _c[0], setSyncLogs = _c[1];
    var processingRef = (0, react_1.useRef)(false);
    var timeoutRef = (0, react_1.useRef)(null);
    // ============================================================
    // LOGS
    // ============================================================
    var addLog = (0, react_1.useCallback)(function (message, type) {
        if (type === void 0) { type = "info"; }
        var time = new Date().toLocaleTimeString();
        setSyncLogs(function (prev) {
            var next = __spreadArray([{ time: time, message: message, type: type }], prev, true);
            return next.slice(0, 50);
        });
    }, []);
    var clearLogs = (0, react_1.useCallback)(function () {
        setSyncLogs([]);
    }, []);
    // ============================================================
    // ONLINE / OFFLINE
    // ============================================================
    (0, react_1.useEffect)(function () {
        var handleOnline = function () { return setIsOnline(true); };
        var handleOffline = function () { return setIsOnline(false); };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return function () {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);
    // ============================================================
    // SUPABASE
    // ============================================================
    var requireSupabase = function () {
        if (!client_1.supabase) {
            throw new Error("Cliente Supabase indisponível");
        }
        return client_1.supabase;
    };
    // ============================================================
    // PERSONS
    // ============================================================
    var syncPerson = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, person, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    person = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("persons").upsert({
                        id: person.id,
                        user_id: person.user_id,
                        name: person.name,
                        email: person.email || null,
                        phone: person.phone || null,
                        avatar_url: person.avatar_url || null,
                        color: person.color || "#60A5FA",
                        is_default: person.isDefault || false,
                        created_at: person.created_at,
                        updated_at: person.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Persons insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("persons")
                        .update({
                        name: person.name,
                        email: person.email || null,
                        phone: person.phone || null,
                        avatar_url: person.avatar_url || null,
                        color: person.color || "#60A5FA",
                        is_default: person.isDefault || false,
                        updated_at: person.updated_at,
                    })
                        .eq("id", person.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Persons update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("persons").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Persons delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em persons: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && person.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.persons.update(person.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // MÉDICOS
    // ============================================================
    var syncMedico = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, medico, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    medico = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("medicos").upsert({
                        id: medico.id,
                        user_id: medico.user_id,
                        nome: medico.nome,
                        especialidade: medico.especialidade || null,
                        crm: medico.crm || null,
                        telefone: medico.telefone || null,
                        email: medico.email || null,
                        observacoes: medico.observacoes || null,
                        created_at: medico.created_at,
                        updated_at: medico.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicos insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("medicos")
                        .update({
                        nome: medico.nome,
                        especialidade: medico.especialidade || null,
                        crm: medico.crm || null,
                        telefone: medico.telefone || null,
                        email: medico.email || null,
                        observacoes: medico.observacoes || null,
                        updated_at: medico.updated_at,
                    })
                        .eq("id", medico.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicos update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("medicos").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicos delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em medicos: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && medico.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.medicos.update(medico.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // FARMÁCIAS
    // ============================================================
    var syncFarmacia = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, farmacia, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    farmacia = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("farmacias").upsert({
                        id: farmacia.id,
                        user_id: farmacia.user_id,
                        nome: farmacia.nome,
                        endereco: farmacia.endereco || null,
                        telefone: farmacia.telefone || null,
                        observacoes: farmacia.observacoes || null,
                        created_at: farmacia.created_at,
                        updated_at: farmacia.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Farmacias insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("farmacias")
                        .update({
                        nome: farmacia.nome,
                        endereco: farmacia.endereco || null,
                        telefone: farmacia.telefone || null,
                        observacoes: farmacia.observacoes || null,
                        updated_at: farmacia.updated_at,
                    })
                        .eq("id", farmacia.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Farmacias update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("farmacias").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Farmacias delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em farmacias: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && farmacia.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.farmacias.update(farmacia.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // HOSPITAIS
    // ============================================================
    var syncHospital = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, hospital, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    hospital = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("hospitais").upsert({
                        id: hospital.id,
                        user_id: hospital.user_id,
                        nome: hospital.nome,
                        endereco: hospital.endereco || null,
                        telefone: hospital.telefone || null,
                        tipo: hospital.tipo || null,
                        observacoes: hospital.observacoes || null,
                        created_at: hospital.created_at,
                        updated_at: hospital.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Hospitais insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("hospitais")
                        .update({
                        nome: hospital.nome,
                        endereco: hospital.endereco || null,
                        telefone: hospital.telefone || null,
                        tipo: hospital.tipo || null,
                        observacoes: hospital.observacoes || null,
                        updated_at: hospital.updated_at,
                    })
                        .eq("id", hospital.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Hospitais update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("hospitais").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Hospitais delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em hospitais: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && hospital.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.hospitais.update(hospital.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // LOCAIS DE SAÚDE
    // ============================================================
    var syncLocal = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, local, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    local = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("locais").upsert({
                        id: local.id,
                        user_id: local.user_id,
                        nome: local.nome,
                        endereco: local.endereco || null,
                        telefone: local.telefone || null,
                        tipo: local.tipo || null,
                        observacoes: local.observacoes || null,
                        created_at: local.created_at,
                        updated_at: local.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Locais insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("locais")
                        .update({
                        nome: local.nome,
                        endereco: local.endereco || null,
                        telefone: local.telefone || null,
                        tipo: local.tipo || null,
                        observacoes: local.observacoes || null,
                        updated_at: local.updated_at,
                    })
                        .eq("id", local.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Locais update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("locais").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Locais delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em locais: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && local.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.locais.update(local.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // INSTITUIÇÕES DE ENSINO
    // ============================================================
    var syncInstituicao = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, instituicao, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    instituicao = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("instituicoes").upsert({
                        id: instituicao.id,
                        user_id: instituicao.user_id,
                        nome: instituicao.nome,
                        cnpj: instituicao.cnpj || null,
                        created_at: instituicao.created_at,
                        updated_at: instituicao.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Instituicoes insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("instituicoes")
                        .update({
                        nome: instituicao.nome,
                        cnpj: instituicao.cnpj || null,
                        updated_at: instituicao.updated_at,
                    })
                        .eq("id", instituicao.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Instituicoes update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("instituicoes").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Instituicoes delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em instituicoes: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && instituicao.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.instituicoes.update(instituicao.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // CIDs
    // ============================================================
    var syncCid = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, cid, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    cid = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("cids").upsert({
                        id: cid.id,
                        user_id: cid.user_id,
                        codigo: cid.codigo,
                        descricao: cid.descricao,
                        person_id: cid.person_id || null,
                        data_diagnostico: cid.data_diagnostico || null,
                        medico_id: cid.medico_id || null,
                        hospital_id: cid.hospital_id || null,
                        local_id: cid.local_id || null,
                        observacoes: cid.observacoes || null,
                        anexo_url: cid.anexo_url || null,
                        created_at: cid.created_at,
                        updated_at: cid.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cids insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("cids")
                        .update({
                        codigo: cid.codigo,
                        descricao: cid.descricao,
                        person_id: cid.person_id || null,
                        data_diagnostico: cid.data_diagnostico || null,
                        medico_id: cid.medico_id || null,
                        hospital_id: cid.hospital_id || null,
                        local_id: cid.local_id || null,
                        observacoes: cid.observacoes || null,
                        anexo_url: cid.anexo_url || null,
                        updated_at: cid.updated_at,
                    })
                        .eq("id", cid.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cids update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("cids").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cids delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em cids: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && cid.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.cids.update(cid.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // TRATAMENTOS
    // ============================================================
    var syncTratamento = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, tratamento, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    tratamento = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("tratamentos").upsert({
                        id: tratamento.id,
                        user_id: tratamento.user_id,
                        person_id: tratamento.person_id || null,
                        nome: tratamento.nome,
                        status: tratamento.status,
                        cor: tratamento.cor || "#8B5CF6",
                        observacoes: tratamento.observacoes || null,
                        created_at: tratamento.created_at,
                        updated_at: tratamento.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Tratamentos insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("tratamentos")
                        .update({
                        person_id: tratamento.person_id || null,
                        nome: tratamento.nome,
                        status: tratamento.status,
                        cor: tratamento.cor || "#8B5CF6",
                        observacoes: tratamento.observacoes || null,
                        updated_at: tratamento.updated_at,
                    })
                        .eq("id", tratamento.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Tratamentos update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("tratamentos").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Tratamentos delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em tratamentos: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && tratamento.id)) return [3 /*break*/, 11];
                    return [4 /*yield*/, syncTratamentoCids(tratamento.id, tratamento.cid_ids || [])];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, db_1.db.tratamentos.update(tratamento.id, { synced: true })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // MEDICAMENTOS
    // ============================================================
    var syncMedicamento = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, med, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    med = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("medicamentos").upsert({
                        id: med.id,
                        user_id: med.user_id,
                        person_id: med.person_id || null,
                        document_id: med.document_id || null,
                        medico_id: med.medico_id || null,
                        farmacia_id: med.farmacia_id || null,
                        hospital_id: med.hospital_id || null,
                        local_id: med.local_id || null,
                        nome: med.nome,
                        dosagem: med.dosagem,
                        medico: med.medico || "",
                        farmacia: med.farmacia || null,
                        data_receita: med.data_receita,
                        proxima_renovacao: med.proxima_renovacao,
                        observacoes: med.observacoes || null,
                        tipo_receita: med.tipo_receita || "comum",
                        tipo_uso: med.tipo_uso || "continuo",
                        forma_farmaceutica: med.forma_farmaceutica || null,
                        cor_principal: med.cor_principal || null,
                        cor_secundaria: med.cor_secundaria || null,
                        status: med.status || "ativo",
                        estoque_quantidade: med.estoque_quantidade || 0,
                        estoque_data_referencia: med.estoque_data_referencia || null,
                        estoque_horarios: med.estoque_horarios || [],
                        estoque_unidade_por_dose: med.estoque_unidade_por_dose || null,
                        estoque_unidade_medida: med.estoque_unidade_medida || null,
                        estoque_ml_total: med.estoque_ml_total || null,
                        estoque_gotas_por_ml: med.estoque_gotas_por_ml || null,
                        formato: med.formato || null,
                        cores: med.cores || [],
                        preco: med.preco || null,
                        motivo_descontinuacao: med.motivo_descontinuacao || null,
                        medico_descontinuacao_id: med.medico_descontinuacao_id || null,
                        medico_descontinuacao_nome: med.medico_descontinuacao_nome || null,
                        substituido_por_id: med.substituido_por_id || null,
                        data_descontinuacao: med.data_descontinuacao || null,
                        historico_dosagens: med.historico_dosagens || [],
                        created_at: med.created_at,
                        updated_at: med.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicamentos insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("medicamentos")
                        .update({
                        person_id: med.person_id || null,
                        document_id: med.document_id || null,
                        medico_id: med.medico_id || null,
                        farmacia_id: med.farmacia_id || null,
                        hospital_id: med.hospital_id || null,
                        local_id: med.local_id || null,
                        nome: med.nome,
                        dosagem: med.dosagem,
                        medico: med.medico || "",
                        farmacia: med.farmacia || null,
                        data_receita: med.data_receita,
                        proxima_renovacao: med.proxima_renovacao,
                        observacoes: med.observacoes || null,
                        tipo_receita: med.tipo_receita || "comum",
                        tipo_uso: med.tipo_uso || "continuo",
                        forma_farmaceutica: med.forma_farmaceutica || null,
                        cor_principal: med.cor_principal || null,
                        cor_secundaria: med.cor_secundaria || null,
                        status: med.status || "ativo",
                        estoque_quantidade: med.estoque_quantidade || 0,
                        estoque_data_referencia: med.estoque_data_referencia || null,
                        estoque_horarios: med.estoque_horarios || [],
                        estoque_unidade_por_dose: med.estoque_unidade_por_dose || null,
                        estoque_unidade_medida: med.estoque_unidade_medida || null,
                        estoque_ml_total: med.estoque_ml_total || null,
                        estoque_gotas_por_ml: med.estoque_gotas_por_ml || null,
                        formato: med.formato || null,
                        cores: med.cores || [],
                        preco: med.preco || null,
                        motivo_descontinuacao: med.motivo_descontinuacao || null,
                        medico_descontinuacao_id: med.medico_descontinuacao_id || null,
                        medico_descontinuacao_nome: med.medico_descontinuacao_nome || null,
                        substituido_por_id: med.substituido_por_id || null,
                        data_descontinuacao: med.data_descontinuacao || null,
                        historico_dosagens: med.historico_dosagens || [],
                        updated_at: med.updated_at,
                    })
                        .eq("id", med.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicamentos update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("medicamentos").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Medicamentos delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em medicamentos: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && med.id)) return [3 /*break*/, 11];
                    return [4 /*yield*/, syncMedicamentoTratamentos(med.id, med.tratamento_ids || [])];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, db_1.db.medicamentos.update(med.id, { synced: true })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // DOCUMENTOS
    // ============================================================
    var syncDocument = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, doc, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    doc = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("documents").upsert({
                        id: doc.id,
                        user_id: doc.user_id,
                        person_id: doc.person_id,
                        category_id: doc.category_id,
                        type: doc.type,
                        title: doc.title,
                        description: doc.description || null,
                        metadata: doc.metadata || {},
                        attachments: doc.attachments || [],
                        is_favorite: doc.is_favorite,
                        vault_id: doc.vault_id || null,
                        hospital_id: doc.hospital_id || null,
                        medico_id: doc.medico_id || null,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Documents insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("documents")
                        .update({
                        person_id: doc.person_id,
                        category_id: doc.category_id,
                        type: doc.type,
                        title: doc.title,
                        description: doc.description || null,
                        metadata: doc.metadata || {},
                        attachments: doc.attachments || [],
                        is_favorite: doc.is_favorite,
                        vault_id: doc.vault_id || null,
                        hospital_id: doc.hospital_id || null,
                        medico_id: doc.medico_id || null,
                        updated_at: doc.updated_at,
                    })
                        .eq("id", doc.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Documents update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("documents").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Documents delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em documents: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && doc.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.documents.update(doc.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // EXAMES
    // ============================================================
    var syncExame = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, exame, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    exame = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("exames").upsert({
                        id: exame.id,
                        user_id: exame.user_id || null,
                        person_id: exame.person_id || null,
                        document_id: exame.document_id || null,
                        medico_id: exame.medico_id || null,
                        local_id: exame.local_id || null,
                        laboratorio: exame.laboratorio || null,
                        medico: exame.medico || null,
                        nome: exame.nome,
                        data: exame.data,
                        data_retorno: exame.data_retorno || null,
                        motivo: exame.motivo || null,
                        observacoes: exame.observacoes || null,
                        anexo_url: exame.anexo_url || null,
                        created_at: exame.created_at,
                        updated_at: exame.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Exames insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("exames")
                        .update({
                        person_id: exame.person_id || null,
                        document_id: exame.document_id || null,
                        medico_id: exame.medico_id || null,
                        local_id: exame.local_id || null,
                        laboratorio: exame.laboratorio || null,
                        medico: exame.medico || null,
                        nome: exame.nome,
                        data: exame.data,
                        data_retorno: exame.data_retorno || null,
                        motivo: exame.motivo || null,
                        observacoes: exame.observacoes || null,
                        anexo_url: exame.anexo_url || null,
                        updated_at: exame.updated_at,
                    })
                        .eq("id", exame.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Exames update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("exames").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Exames delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em exames: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && exame.id)) return [3 /*break*/, 11];
                    return [4 /*yield*/, syncExameTratamentos(exame.id, exame.tratamento_ids || [])];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, db_1.db.exames.update(exame.id, { synced: true })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // CONSULTAS
    // ============================================================
    var syncConsulta = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, consulta, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    consulta = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("consultas").upsert({
                        id: consulta.id,
                        user_id: consulta.user_id,
                        person_id: consulta.person_id || null,
                        medico_id: consulta.medico_id || null,
                        hospital_id: consulta.hospital_id || null,
                        document_id: consulta.document_id || null,
                        especialidade: consulta.especialidade,
                        medico: consulta.medico || "",
                        data: consulta.data,
                        horario: consulta.horario || null,
                        status: consulta.status,
                        motivo: consulta.motivo || null,
                        observacoes: consulta.observacoes || null,
                        created_at: consulta.created_at,
                        updated_at: consulta.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Consultas insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("consultas")
                        .update({
                        person_id: consulta.person_id || null,
                        medico_id: consulta.medico_id || null,
                        hospital_id: consulta.hospital_id || null,
                        document_id: consulta.document_id || null,
                        especialidade: consulta.especialidade,
                        medico: consulta.medico || "",
                        data: consulta.data,
                        horario: consulta.horario || null,
                        status: consulta.status,
                        motivo: consulta.motivo || null,
                        observacoes: consulta.observacoes || null,
                        updated_at: consulta.updated_at,
                    })
                        .eq("id", consulta.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Consultas update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("consultas").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Consultas delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em consultas: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && consulta.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.consultas.update(consulta.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // CIRURGIAS
    // ============================================================
    var syncCirurgia = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, cirurgia, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    cirurgia = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("cirurgias").upsert({
                        id: cirurgia.id,
                        user_id: cirurgia.user_id,
                        person_id: cirurgia.person_id || null,
                        procedimento: cirurgia.procedimento,
                        data: cirurgia.data,
                        medico_id: cirurgia.medico_id || null,
                        hospital_id: cirurgia.hospital_id || null,
                        document_id: cirurgia.document_id || null,
                        status: cirurgia.status,
                        observacoes: cirurgia.observacoes || null,
                        created_at: cirurgia.created_at,
                        updated_at: cirurgia.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cirurgias insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("cirurgias")
                        .update({
                        person_id: cirurgia.person_id || null,
                        procedimento: cirurgia.procedimento,
                        data: cirurgia.data,
                        medico_id: cirurgia.medico_id || null,
                        hospital_id: cirurgia.hospital_id || null,
                        document_id: cirurgia.document_id || null,
                        status: cirurgia.status,
                        observacoes: cirurgia.observacoes || null,
                        updated_at: cirurgia.updated_at,
                    })
                        .eq("id", cirurgia.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cirurgias update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("cirurgias").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cirurgias delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em cirurgias: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && cirurgia.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.cirurgias.update(cirurgia.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // RENOVAÇÕES
    // ============================================================
    var syncRenovacao = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, renovacao, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    renovacao = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("renovacoes").upsert({
                        id: renovacao.id,
                        user_id: renovacao.user_id,
                        person_id: renovacao.person_id || null,
                        medicamento_id: renovacao.medicamento_id,
                        medico_id: renovacao.medico_id || null,
                        farmacia_id: renovacao.farmacia_id || null,
                        hospital_id: renovacao.hospital_id || null,
                        local_id: renovacao.local_id || null,
                        document_id: renovacao.document_id || null,
                        quantidade: renovacao.quantidade || null,
                        preco: renovacao.preco || null,
                        lote: renovacao.lote || null,
                        validade_produto: renovacao.validade_produto || null,
                        data: renovacao.data,
                        anexo_url: renovacao.anexo_url || null,
                        observacoes: renovacao.observacoes || null,
                        created_at: renovacao.created_at,
                        updated_at: renovacao.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Renovacoes insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("renovacoes")
                        .update({
                        person_id: renovacao.person_id || null,
                        medicamento_id: renovacao.medicamento_id,
                        medico_id: renovacao.medico_id || null,
                        farmacia_id: renovacao.farmacia_id || null,
                        hospital_id: renovacao.hospital_id || null,
                        local_id: renovacao.local_id || null,
                        document_id: renovacao.document_id || null,
                        quantidade: renovacao.quantidade || null,
                        preco: renovacao.preco || null,
                        lote: renovacao.lote || null,
                        validade_produto: renovacao.validade_produto || null,
                        data: renovacao.data,
                        anexo_url: renovacao.anexo_url || null,
                        observacoes: renovacao.observacoes || null,
                        updated_at: renovacao.updated_at,
                    })
                        .eq("id", renovacao.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Renovacoes update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("renovacoes").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Renovacoes delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em renovacoes: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && renovacao.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.renovacoes.update(renovacao.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // DOSE LOGS
    // ============================================================
    var syncDoseLog = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, log, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    log = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("dose_logs").upsert({
                        id: log.id,
                        user_id: log.user_id,
                        person_id: log.person_id || null,
                        medicamento_id: log.medicamento_id,
                        data: log.data,
                        horario: log.horario,
                        tomado_em: log.tomado_em || null,
                        ignorado_em: log.ignorado_em || null,
                        quantidade: log.quantidade || null,
                        created_at: log.created_at,
                        updated_at: log.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Dose_logs insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("dose_logs")
                        .update({
                        person_id: log.person_id || null,
                        tomado_em: log.tomado_em || null,
                        ignorado_em: log.ignorado_em || null,
                        quantidade: log.quantidade || null,
                        updated_at: log.updated_at,
                    })
                        .eq("id", log.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Dose_logs update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("dose_logs").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Dose_logs delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em doseLogs: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && log.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.doseLogs.update(log.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // ANEXOS CLÍNICOS
    // ============================================================
    var syncAnexoClinico = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, anexo, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    anexo = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("anexos_clinicos").upsert({
                        id: anexo.id,
                        user_id: anexo.user_id || null,
                        person_id: anexo.person_id || null,
                        tratamento_id: anexo.tratamento_id || null,
                        medicamento_id: anexo.medicamento_id || null,
                        tipo: anexo.tipo || null,
                        url: anexo.url || null,
                        thumbnail_url: anexo.thumbnail_url || null,
                        tags: anexo.tags || [],
                        created_at: anexo.created_at,
                        updated_at: anexo.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Anexos_clinicos insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("anexos_clinicos")
                        .update({
                        person_id: anexo.person_id || null,
                        tratamento_id: anexo.tratamento_id || null,
                        medicamento_id: anexo.medicamento_id || null,
                        tipo: anexo.tipo || null,
                        url: anexo.url || null,
                        thumbnail_url: anexo.thumbnail_url || null,
                        tags: anexo.tags || [],
                        updated_at: anexo.updated_at,
                    })
                        .eq("id", anexo.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Anexos_clinicos update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("anexos_clinicos").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Anexos_clinicos delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em anexos_clinicos: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && anexo.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.anexos_clinicos.update(anexo.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // VAULTS
    // ============================================================
    var syncVault = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, vault, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    vault = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("vaults").upsert({
                        id: vault.id,
                        user_id: vault.user_id,
                        name: vault.name,
                        description: vault.description || null,
                        icon: vault.icon,
                        color: vault.color,
                        created_at: vault.created_at,
                        updated_at: vault.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vaults insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("vaults")
                        .update({
                        name: vault.name,
                        description: vault.description || null,
                        icon: vault.icon,
                        color: vault.color,
                        updated_at: vault.updated_at,
                    })
                        .eq("id", vault.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vaults update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("vaults").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vaults delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em vaults: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && vault.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.vaults.update(vault.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // VAULT MEMBERS
    // ============================================================
    var syncVaultMember = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, member, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    member = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("vault_members").upsert({
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
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vault_members insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("vault_members")
                        .update({
                        email: member.email,
                        name: member.name || null,
                        permission: member.permission,
                        status: member.status,
                        updated_at: member.updated_at,
                    })
                        .eq("id", member.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vault_members update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("vault_members").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Vault_members delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em vaultMembers: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && member.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.vaultMembers.update(member.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // CREDENTIALS
    // ============================================================
    var syncCredential = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, credential, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    credential = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("credentials").upsert({
                        id: credential.id,
                        user_id: credential.user_id,
                        vault_id: credential.vault_id || null,
                        title: credential.title,
                        username: credential.username || null,
                        password_encrypted: credential.password_encrypted,
                        url: credential.url || null,
                        notes: credential.notes || null,
                        category: credential.category,
                        password_history: credential.password_history || null,
                        created_at: credential.created_at,
                        updated_at: credential.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Credentials insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("credentials")
                        .update({
                        vault_id: credential.vault_id || null,
                        title: credential.title,
                        username: credential.username || null,
                        password_encrypted: credential.password_encrypted,
                        url: credential.url || null,
                        notes: credential.notes || null,
                        category: credential.category,
                        password_history: credential.password_history || null,
                        updated_at: credential.updated_at,
                    })
                        .eq("id", credential.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Credentials update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("credentials").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Credentials delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em credentials: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && credential.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.credentials.update(credential.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // CARTÕES
    // ============================================================
    var syncCard = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var client, card, _a, error, error, payload, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = requireSupabase();
                    card = item.payload;
                    _a = item.operation;
                    switch (_a) {
                        case "add": return [3 /*break*/, 1];
                        case "update": return [3 /*break*/, 3];
                        case "delete": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, client.from("cards").upsert({
                        id: card.id,
                        user_id: card.user_id,
                        title: card.title,
                        bank_name: card.bank_name,
                        type: card.type,
                        card_number_encrypted: card.card_number_encrypted || null,
                        card_holder: card.card_holder || null,
                        brand: card.brand || null,
                        expiry_date: card.expiry_date || null,
                        cvv_encrypted: card.cvv_encrypted || null,
                        agency: card.agency || null,
                        account: card.account || null,
                        notes: card.notes || null,
                        created_at: card.created_at,
                        updated_at: card.updated_at,
                    }, { onConflict: "id" })];
                case 2:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cards insert error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, client
                        .from("cards")
                        .update({
                        title: card.title,
                        bank_name: card.bank_name,
                        type: card.type,
                        card_number_encrypted: card.card_number_encrypted || null,
                        card_holder: card.card_holder || null,
                        brand: card.brand || null,
                        expiry_date: card.expiry_date || null,
                        cvv_encrypted: card.cvv_encrypted || null,
                        agency: card.agency || null,
                        account: card.account || null,
                        notes: card.notes || null,
                        updated_at: card.updated_at,
                    })
                        .eq("id", card.id)];
                case 4:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cards update error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 5:
                    payload = item.payload;
                    return [4 /*yield*/, client.from("cards").delete().eq("id", payload.id)];
                case 6:
                    error = (_b.sent()).error;
                    if (error)
                        throw new Error("Cards delete error: ".concat(error.message));
                    return [3 /*break*/, 8];
                case 7: throw new Error("Opera\u00E7\u00E3o n\u00E3o suportada em cards: ".concat(item.operation));
                case 8:
                    if (!(item.operation !== "delete" && card.id)) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.cards.update(card.id, { synced: true })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // SINCRONIZAÇÃO DAS JUNÇÕES N:N
    // ============================================================
    var syncMedicamentoTratamentos = function (medicamentoId, tratamentoIds) { return __awaiter(_this, void 0, void 0, function () {
        var client, deleteError, rows, insertError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = requireSupabase();
                    return [4 /*yield*/, client
                            .from("medicamento_tratamentos")
                            .delete()
                            .eq("medicamento_id", medicamentoId)];
                case 1:
                    deleteError = (_a.sent()).error;
                    if (deleteError)
                        throw new Error("medicamento_tratamentos delete error: ".concat(deleteError.message));
                    if (!(tratamentoIds.length > 0)) return [3 /*break*/, 3];
                    rows = tratamentoIds.map(function (tratamentoId) { return ({
                        medicamento_id: medicamentoId,
                        tratamento_id: tratamentoId,
                    }); });
                    return [4 /*yield*/, client.from("medicamento_tratamentos").insert(rows)];
                case 2:
                    insertError = (_a.sent()).error;
                    if (insertError)
                        throw new Error("medicamento_tratamentos insert error: ".concat(insertError.message));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var syncTratamentoCids = function (tratamentoId, cidIds) { return __awaiter(_this, void 0, void 0, function () {
        var client, deleteError, rows, insertError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = requireSupabase();
                    return [4 /*yield*/, client
                            .from("tratamento_cids")
                            .delete()
                            .eq("tratamento_id", tratamentoId)];
                case 1:
                    deleteError = (_a.sent()).error;
                    if (deleteError)
                        throw new Error("tratamento_cids delete error: ".concat(deleteError.message));
                    if (!(cidIds.length > 0)) return [3 /*break*/, 3];
                    rows = cidIds.map(function (cidId) { return ({
                        tratamento_id: tratamentoId,
                        cid_id: cidId,
                    }); });
                    return [4 /*yield*/, client.from("tratamento_cids").insert(rows)];
                case 2:
                    insertError = (_a.sent()).error;
                    if (insertError)
                        throw new Error("tratamento_cids insert error: ".concat(insertError.message));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var syncExameTratamentos = function (exameId, tratamentoIds) { return __awaiter(_this, void 0, void 0, function () {
        var client, deleteError, rows, insertError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = requireSupabase();
                    return [4 /*yield*/, client
                            .from("exame_tratamentos")
                            .delete()
                            .eq("exame_id", exameId)];
                case 1:
                    deleteError = (_a.sent()).error;
                    if (deleteError)
                        throw new Error("exame_tratamentos delete error: ".concat(deleteError.message));
                    if (!(tratamentoIds.length > 0)) return [3 /*break*/, 3];
                    rows = tratamentoIds.map(function (tratamentoId) { return ({
                        exame_id: exameId,
                        tratamento_id: tratamentoId,
                    }); });
                    return [4 /*yield*/, client.from("exame_tratamentos").insert(rows)];
                case 2:
                    insertError = (_a.sent()).error;
                    if (insertError)
                        throw new Error("exame_tratamentos insert error: ".concat(insertError.message));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // ============================================================
    // PROCESSAMENTO DA FILA
    // ============================================================
    var processQueue = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var queue, priorityOrder_1, successCount, highestRetry, _i, queue_1, item, retryCount, _a, error_1, nextRetryCount, failed, errorMessage, remaining, delay, error_2, errorMessage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (processingRef.current || !isOnline) {
                        return [2 /*return*/];
                    }
                    processingRef.current = true;
                    setIsProcessing(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 53, 54, 55]);
                    return [4 /*yield*/, db_1.db.syncQueue
                            .toCollection()
                            .filter(function (item) { return item.failed !== true && (item.retry_count || 0) < MAX_RETRIES; })
                            .toArray()];
                case 2:
                    queue = _b.sent();
                    if (queue.length === 0) {
                        return [2 /*return*/];
                    }
                    addLog("\uD83D\uDFE2 Iniciando sync: ".concat(queue.length, " itens na fila"), "info");
                    priorityOrder_1 = [
                        "persons",
                        "medicos",
                        "farmacias",
                        "hospitais",
                        "locais",
                        "instituicoes",
                        "cids",
                        "documents",
                        "tratamentos",
                        "medicamentos",
                        "exames",
                        "consultas",
                        "cirurgias",
                        "renovacoes",
                        "doseLogs",
                        "anexos_clinicos",
                        "vaults",
                        "vaultMembers",
                        "credentials",
                        "cards",
                    ];
                    queue.sort(function (a, b) {
                        var aIndex = priorityOrder_1.indexOf(a.table);
                        var bIndex = priorityOrder_1.indexOf(b.table);
                        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                    });
                    successCount = 0;
                    highestRetry = 0;
                    _i = 0, queue_1 = queue;
                    _b.label = 3;
                case 3:
                    if (!(_i < queue_1.length)) return [3 /*break*/, 51];
                    item = queue_1[_i];
                    retryCount = item.retry_count || 0;
                    highestRetry = Math.max(highestRetry, retryCount);
                    if (!navigator.onLine) {
                        addLog("📴 Conexão perdida durante a sincronização. Fila preservada.", "info");
                        return [3 /*break*/, 51];
                    }
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 48, , 50]);
                    _a = item.table;
                    switch (_a) {
                        case "persons": return [3 /*break*/, 5];
                        case "medicos": return [3 /*break*/, 7];
                        case "farmacias": return [3 /*break*/, 9];
                        case "hospitais": return [3 /*break*/, 11];
                        case "locais": return [3 /*break*/, 13];
                        case "instituicoes": return [3 /*break*/, 15];
                        case "cids": return [3 /*break*/, 17];
                        case "documents": return [3 /*break*/, 19];
                        case "tratamentos": return [3 /*break*/, 21];
                        case "medicamentos": return [3 /*break*/, 23];
                        case "exames": return [3 /*break*/, 25];
                        case "consultas": return [3 /*break*/, 27];
                        case "cirurgias": return [3 /*break*/, 29];
                        case "renovacoes": return [3 /*break*/, 31];
                        case "doseLogs": return [3 /*break*/, 33];
                        case "anexos_clinicos": return [3 /*break*/, 35];
                        case "vaults": return [3 /*break*/, 37];
                        case "vaultMembers": return [3 /*break*/, 39];
                        case "credentials": return [3 /*break*/, 41];
                        case "cards": return [3 /*break*/, 43];
                    }
                    return [3 /*break*/, 45];
                case 5: return [4 /*yield*/, syncPerson(item)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 7: return [4 /*yield*/, syncMedico(item)];
                case 8:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 9: return [4 /*yield*/, syncFarmacia(item)];
                case 10:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 11: return [4 /*yield*/, syncHospital(item)];
                case 12:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 13: return [4 /*yield*/, syncLocal(item)];
                case 14:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 15: return [4 /*yield*/, syncInstituicao(item)];
                case 16:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 17: return [4 /*yield*/, syncCid(item)];
                case 18:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 19: return [4 /*yield*/, syncDocument(item)];
                case 20:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 21: return [4 /*yield*/, syncTratamento(item)];
                case 22:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 23: return [4 /*yield*/, syncMedicamento(item)];
                case 24:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 25: return [4 /*yield*/, syncExame(item)];
                case 26:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 27: return [4 /*yield*/, syncConsulta(item)];
                case 28:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 29: return [4 /*yield*/, syncCirurgia(item)];
                case 30:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 31: return [4 /*yield*/, syncRenovacao(item)];
                case 32:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 33: return [4 /*yield*/, syncDoseLog(item)];
                case 34:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 35: return [4 /*yield*/, syncAnexoClinico(item)];
                case 36:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 37: return [4 /*yield*/, syncVault(item)];
                case 38:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 39: return [4 /*yield*/, syncVaultMember(item)];
                case 40:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 41: return [4 /*yield*/, syncCredential(item)];
                case 42:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 43: return [4 /*yield*/, syncCard(item)];
                case 44:
                    _b.sent();
                    return [3 /*break*/, 46];
                case 45: throw new Error("Tabela n\u00E3o suportada no sync: ".concat(item.table));
                case 46: return [4 /*yield*/, db_1.db.syncQueue.delete(item.id)];
                case 47:
                    _b.sent();
                    successCount++;
                    addLog("\u2705 ".concat(item.table, " sincronizado"), "success");
                    return [3 /*break*/, 50];
                case 48:
                    error_1 = _b.sent();
                    nextRetryCount = retryCount + 1;
                    failed = nextRetryCount >= MAX_RETRIES;
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [4 /*yield*/, db_1.db.syncQueue.update(item.id, {
                            retry_count: nextRetryCount,
                            failed: failed,
                        })];
                case 49:
                    _b.sent();
                    if (failed) {
                        addLog("\u2716\uFE0F Falha permanente em ".concat(item.table, ": ").concat(errorMessage), "error");
                    }
                    else {
                        addLog("\u26A0\uFE0F Erro em ".concat(item.table, " (tentativa ").concat(nextRetryCount, "/").concat(MAX_RETRIES, "): ").concat(errorMessage), "error");
                    }
                    return [3 /*break*/, 50];
                case 50:
                    _i++;
                    return [3 /*break*/, 3];
                case 51:
                    if (successCount > 0) {
                        addLog("\u2705 ".concat(successCount, " itens sincronizados com sucesso!"), "success");
                    }
                    return [4 /*yield*/, db_1.db.syncQueue
                            .toCollection()
                            .filter(function (item) { return item.failed !== true && (item.retry_count || 0) < MAX_RETRIES; })
                            .count()];
                case 52:
                    remaining = _b.sent();
                    if (remaining > 0 && navigator.onLine) {
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                        }
                        delay = Math.min(5000 * Math.pow(2, highestRetry), MAX_BACKOFF_MS);
                        timeoutRef.current = setTimeout(function () {
                            timeoutRef.current = null;
                            if (!processingRef.current) {
                                processQueue();
                            }
                        }, delay);
                    }
                    return [3 /*break*/, 55];
                case 53:
                    error_2 = _b.sent();
                    errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                    addLog("\u274C Erro ao processar fila: ".concat(errorMessage), "error");
                    return [3 /*break*/, 55];
                case 54:
                    processingRef.current = false;
                    setIsProcessing(false);
                    return [7 /*endfinally*/];
                case 55: return [2 /*return*/];
            }
        });
    }); }, [isOnline, addLog]);
    // ============================================================
    // RESETAR FALHAS PERMANENTES
    // ============================================================
    var resetFailedItems = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var failedItems, _i, failedItems_1, item;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db.syncQueue
                        .toCollection()
                        .filter(function (item) { return item.failed === true; })
                        .toArray()];
                case 1:
                    failedItems = _a.sent();
                    if (failedItems.length === 0) {
                        return [2 /*return*/];
                    }
                    _i = 0, failedItems_1 = failedItems;
                    _a.label = 2;
                case 2:
                    if (!(_i < failedItems_1.length)) return [3 /*break*/, 5];
                    item = failedItems_1[_i];
                    return [4 /*yield*/, db_1.db.syncQueue.update(item.id, {
                            failed: false,
                            retry_count: 0,
                        })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    addLog("\u2705 ".concat(failedItems.length, " itens redefinidos para reenvio"), "success");
                    return [4 /*yield*/, processQueue()];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [processQueue, addLog]);
    // ============================================================
    // EVENTO MANUAL
    // ============================================================
    (0, react_1.useEffect)(function () {
        var handleProcess = function () {
            if (isOnline && !processingRef.current) {
                processQueue();
            }
        };
        window.addEventListener("sync:process", handleProcess);
        return function () {
            window.removeEventListener("sync:process", handleProcess);
        };
    }, [isOnline, processQueue]);
    // ============================================================
    // PROCESSAMENTO AO VOLTAR ONLINE
    // ============================================================
    (0, react_1.useEffect)(function () {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline, processQueue]);
    // ============================================================
    // RETORNO
    // ============================================================
    return {
        processQueue: processQueue,
        isProcessing: isProcessing,
        isOnline: isOnline,
        resetFailedItems: resetFailedItems,
        syncLogs: syncLogs,
        clearLogs: clearLogs,
    };
}
exports.useSyncQueue = useSyncQueue;
