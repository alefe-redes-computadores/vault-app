"use strict";
// lib/db/index.ts
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
exports.safeUpdateInstituicao = exports.safeAddInstituicao = exports.safeDeleteCard = exports.safeUpdateCard = exports.safeAddCard = exports.safeDeleteCredential = exports.safeUpdateCredential = exports.safeAddCredential = exports.safeDeleteCirurgia = exports.safeUpdateCirurgia = exports.safeAddCirurgia = exports.safeDeleteConsulta = exports.safeUpdateConsulta = exports.safeAddConsulta = exports.safeDeleteExame = exports.safeUpdateExame = exports.safeAddExame = exports.safeDeleteLocal = exports.safeUpdateLocal = exports.safeAddLocal = exports.safeDeleteHospital = exports.safeUpdateHospital = exports.safeAddHospital = exports.safeDeleteFarmacia = exports.safeUpdateFarmacia = exports.safeAddFarmacia = exports.safeDeleteMedico = exports.safeUpdateMedico = exports.safeAddMedico = exports.getVaultMembers = exports.getVaultDocuments = exports.shareDocumentWithVault = exports.safeUpdateVaultMember = exports.safeAddVaultMember = exports.safeAddVault = exports.safeSetDoseLog = exports.safeUpdateRenovacao = exports.safeAddRenovacao = exports.safeDeleteMedicamento = exports.safeUpdateMedicamento = exports.safeAddMedicamento = exports.toggleFavorite = exports.safeDeleteDocument = exports.safeUpdateDocument = exports.safeAddDocument = exports.safeDeletePerson = exports.safeUpdatePerson = exports.safeAddPerson = exports.syncMedicamentoTratamentos = exports.db = void 0;
exports.safeDeleteAnexoClinico = exports.safeUpdateAnexoClinico = exports.safeAddAnexoClinico = exports.safeDeleteCid = exports.safeUpdateCid = exports.safeAddCid = exports.safeDeleteTratamento = exports.safeUpdateTratamento = exports.safeAddTratamento = exports.safeDeleteInstituicao = void 0;
var dexie_1 = require("dexie");
var storage_1 = require("@/lib/supabase/storage");
var health_utils_1 = require("@/lib/health-utils");
// ============================================================
// HELPERS
// ============================================================
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function nowIso() {
    return new Date().toISOString();
}
// ============================================================
// DATABASE
// ============================================================
var VaultDB = /** @class */ (function (_super) {
    __extends(VaultDB, _super);
    function VaultDB() {
        var _this = _super.call(this, 'vault-db') || this;
        // ==========================================================
        // VERSÃO 2
        // ==========================================================
        _this.version(2).stores({
            persons: 'id',
            documents: 'id',
            syncQueue: 'id',
        });
        // ==========================================================
        // VERSÃO 3
        // ==========================================================
        _this.version(3).stores({
            medicamentos: 'id',
            renovacoes: 'id',
        });
        // ==========================================================
        // VERSÃO 4
        // ==========================================================
        _this.version(4).stores({
            vaults: 'id',
            vaultMembers: 'id',
        });
        // ==========================================================
        // VERSÃO 5
        // ==========================================================
        _this.version(5).stores({
            medicos: 'id',
            farmacias: 'id',
            hospitais: 'id',
        });
        // ==========================================================
        // VERSÃO 6
        // ==========================================================
        _this.version(6).stores({
            documents: 'id',
        });
        // ==========================================================
        // VERSÃO 7
        // Remove temporariamente medicamentos/renovacoes
        // para reconstrução posterior.
        // ==========================================================
        _this.version(7).stores({
            medicamentos: null,
            renovacoes: null,
        });
        // ==========================================================
        // VERSÃO 8
        // ==========================================================
        _this.version(8).stores({
            medicamentos: 'id',
            renovacoes: 'id',
        });
        // ==========================================================
        // VERSÃO 9
        // ==========================================================
        _this.version(9).stores({
            doseLogs: 'id',
        });
        // ==========================================================
        // VERSÃO 10
        // ==========================================================
        _this.version(10).stores({
            credentials: 'id',
        });
        // ==========================================================
        // VERSÃO 11
        // ==========================================================
        _this.version(11).stores({
            cards: 'id',
        });
        // ==========================================================
        // VERSÃO 12
        // ==========================================================
        _this.version(12).stores({
            instituicoes: 'id',
            tratamentos: 'id',
        });
        // ==========================================================
        // VERSÃO 13
        // Laboratórios ainda existiam nesta versão.
        // ==========================================================
        _this.version(13).stores({
            laboratorios: 'id',
        });
        // ==========================================================
        // VERSÃO 14
        // ==========================================================
        _this.version(14).stores({
            exames: 'id',
        });
        // ==========================================================
        // VERSÃO 15
        // Relações N:N e anexos clínicos.
        // ==========================================================
        _this.version(15).stores({
            medicamento_tratamentos: 'id',
            anexos_clinicos: 'id',
        });
        // ==========================================================
        // VERSÃO 16
        // ==========================================================
        _this.version(16).stores({
            cids: 'id',
            exame_tratamentos: 'id',
        });
        // ==========================================================
        // VERSÃO 17
        // ==========================================================
        _this.version(17).stores({
            locais: 'id',
            consultas: 'id',
            cirurgias: 'id',
        });
        // ==========================================================
        // VERSÃO 18
        //
        // Expansão dos índices para permitir consultas locais
        // eficientes.
        // ==========================================================
        _this.version(18)
            .stores({
            persons: 'id, user_id, name, synced, updated_at',
            documents: 'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',
            medicamentos: 'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',
            renovacoes: 'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',
            medicos: 'id, user_id, nome, especialidade, synced, updated_at',
            farmacias: 'id, user_id, nome, synced, updated_at',
            hospitais: 'id, user_id, nome, tipo, synced, updated_at',
            locais: 'id, user_id, nome, synced, updated_at',
            laboratorios: 'id, user_id, nome, synced, updated_at',
            exames: 'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',
            consultas: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
            cirurgias: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
            doseLogs: 'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',
            credentials: 'id, user_id, vault_id, category, synced, updated_at',
            cards: 'id, user_id, type, synced, updated_at',
            instituicoes: 'id, user_id, nome, synced, updated_at',
            tratamentos: 'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',
            cids: 'id, user_id, codigo, synced, updated_at',
            anexos_clinicos: 'id, user_id, synced, updated_at',
            syncQueue: 'id, table, operation, created_at, retry_count, failed',
        })
            .upgrade(function (tx) { return __awaiter(_this, void 0, void 0, function () {
            var medicamentos, vinculosMedicamentos, vinculosPorMedicamento, _i, vinculosMedicamentos_1, vinculo, lista, _a, medicamentos_1, med, medRaw, ids, exames, vinculosExames, vinculosPorExame, _b, vinculosExames_1, vinculo, lista, _c, exames_1, exame, exameRaw, ids;
            var _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0: return [4 /*yield*/, tx
                            .table('medicamentos')
                            .toArray()];
                    case 1:
                        medicamentos = _h.sent();
                        return [4 /*yield*/, tx
                                .table('medicamento_tratamentos')
                                .toArray()];
                    case 2:
                        vinculosMedicamentos = _h.sent();
                        vinculosPorMedicamento = new Map();
                        for (_i = 0, vinculosMedicamentos_1 = vinculosMedicamentos; _i < vinculosMedicamentos_1.length; _i++) {
                            vinculo = vinculosMedicamentos_1[_i];
                            lista = (_d = vinculosPorMedicamento.get(vinculo.medicamento_id)) !== null && _d !== void 0 ? _d : [];
                            lista.push(vinculo.tratamento_id);
                            vinculosPorMedicamento.set(vinculo.medicamento_id, lista);
                        }
                        _a = 0, medicamentos_1 = medicamentos;
                        _h.label = 3;
                    case 3:
                        if (!(_a < medicamentos_1.length)) return [3 /*break*/, 6];
                        med = medicamentos_1[_a];
                        medRaw = med;
                        if (Array.isArray(medRaw.tratamento_ids) &&
                            medRaw.tratamento_ids.length > 0) {
                            return [3 /*break*/, 5];
                        }
                        ids = (_e = vinculosPorMedicamento.get(medRaw.id)) !== null && _e !== void 0 ? _e : [];
                        if (ids.length === 0 &&
                            medRaw.tratamento_id) {
                            ids.push(medRaw.tratamento_id);
                        }
                        if (!(ids.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, tx
                                .table('medicamentos')
                                .update(medRaw.id, {
                                tratamento_ids: ids,
                            })];
                    case 4:
                        _h.sent();
                        _h.label = 5;
                    case 5:
                        _a++;
                        return [3 /*break*/, 3];
                    case 6: return [4 /*yield*/, tx
                            .table('exames')
                            .toArray()];
                    case 7:
                        exames = _h.sent();
                        return [4 /*yield*/, tx
                                .table('exame_tratamentos')
                                .toArray()];
                    case 8:
                        vinculosExames = _h.sent();
                        vinculosPorExame = new Map();
                        for (_b = 0, vinculosExames_1 = vinculosExames; _b < vinculosExames_1.length; _b++) {
                            vinculo = vinculosExames_1[_b];
                            lista = (_f = vinculosPorExame.get(vinculo.exame_id)) !== null && _f !== void 0 ? _f : [];
                            lista.push(vinculo.tratamento_id);
                            vinculosPorExame.set(vinculo.exame_id, lista);
                        }
                        _c = 0, exames_1 = exames;
                        _h.label = 9;
                    case 9:
                        if (!(_c < exames_1.length)) return [3 /*break*/, 12];
                        exame = exames_1[_c];
                        exameRaw = exame;
                        if (Array.isArray(exameRaw.tratamento_ids) &&
                            exameRaw.tratamento_ids.length > 0) {
                            return [3 /*break*/, 11];
                        }
                        ids = (_g = vinculosPorExame.get(exameRaw.id)) !== null && _g !== void 0 ? _g : [];
                        if (!(ids.length > 0)) return [3 /*break*/, 11];
                        return [4 /*yield*/, tx
                                .table('exames')
                                .update(exameRaw.id, {
                                tratamento_ids: ids,
                            })];
                    case 10:
                        _h.sent();
                        _h.label = 11;
                    case 11:
                        _c++;
                        return [3 /*break*/, 9];
                    case 12: return [2 /*return*/];
                }
            });
        }); });
        // ==========================================================
        // VERSÃO 19
        //
        // Suporte a múltiplos CIDs por tratamento.
        // ==========================================================
        _this.version(19)
            .stores({
            persons: 'id, user_id, name, synced, updated_at',
            documents: 'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',
            medicamentos: 'id, user_id, person_id, document_id, medico_id, farmacia_id, estabelecimento_id, status, synced, updated_at, *tratamento_ids',
            renovacoes: 'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, local_id, synced, updated_at',
            medicos: 'id, user_id, nome, especialidade, synced, updated_at',
            farmacias: 'id, user_id, nome, synced, updated_at',
            hospitais: 'id, user_id, nome, tipo, synced, updated_at',
            locais: 'id, user_id, nome, synced, updated_at',
            laboratorios: 'id, user_id, nome, synced, updated_at',
            exames: 'id, user_id, person_id, medico_id, laboratorio_id, synced, updated_at, *tratamento_ids',
            consultas: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
            cirurgias: 'id, user_id, person_id, medico_id, hospital_id, status, synced, updated_at',
            doseLogs: 'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',
            credentials: 'id, user_id, vault_id, category, synced, updated_at',
            cards: 'id, user_id, type, synced, updated_at',
            instituicoes: 'id, user_id, nome, synced, updated_at',
            tratamentos: 'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',
            cids: 'id, user_id, codigo, synced, updated_at',
            anexos_clinicos: 'id, user_id, synced, updated_at',
            syncQueue: 'id, table, operation, created_at, retry_count, failed',
        })
            .upgrade(function (tx) { return __awaiter(_this, void 0, void 0, function () {
            var tratamentos, _i, tratamentos_1, tratamento, tratRaw, cidIds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tx
                            .table('tratamentos')
                            .toArray()];
                    case 1:
                        tratamentos = _a.sent();
                        _i = 0, tratamentos_1 = tratamentos;
                        _a.label = 2;
                    case 2:
                        if (!(_i < tratamentos_1.length)) return [3 /*break*/, 5];
                        tratamento = tratamentos_1[_i];
                        tratRaw = tratamento;
                        if (Array.isArray(tratRaw.cid_ids)) {
                            return [3 /*break*/, 4];
                        }
                        cidIds = tratRaw.cid_id
                            ? [tratRaw.cid_id]
                            : [];
                        return [4 /*yield*/, tx
                                .table('tratamentos')
                                .update(tratRaw.id, {
                                cid_ids: cidIds,
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        // ==========================================================
        // VERSÃO 20
        //
        // PADRÃO ATUAL
        //
        // - laboratório removido
        // - estabelecimento_id removido de medicamentos
        // - laboratorio_id removido de exames
        // - medicamentos usam local_id
        // - exames usam local_id
        // - consultas usam hospital_id + local_id
        // - cirurgias usam hospital_id + local_id
        // - tratamentos continuam com múltiplos CIDs
        // ==========================================================
        _this.version(20)
            .stores({
            persons: 'id, user_id, name, synced, updated_at',
            documents: 'id, user_id, person_id, category_id, is_favorite, synced, updated_at, vault_id, hospital_id, medico_id',
            medicamentos: 'id, user_id, person_id, document_id, medico_id, farmacia_id, hospital_id, local_id, status, synced, updated_at, *tratamento_ids',
            renovacoes: 'id, user_id, person_id, medicamento_id, medico_id, farmacia_id, hospital_id, local_id, synced, updated_at',
            medicos: 'id, user_id, nome, especialidade, synced, updated_at',
            farmacias: 'id, user_id, nome, synced, updated_at',
            hospitais: 'id, user_id, nome, tipo, synced, updated_at',
            locais: 'id, user_id, nome, synced, updated_at',
            exames: 'id, user_id, person_id, medico_id, local_id, synced, updated_at, *tratamento_ids',
            consultas: 'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',
            cirurgias: 'id, user_id, person_id, medico_id, hospital_id, local_id, status, synced, updated_at',
            doseLogs: 'id, user_id, person_id, medicamento_id, data, horario, synced, updated_at',
            credentials: 'id, user_id, vault_id, category, synced, updated_at',
            cards: 'id, user_id, type, synced, updated_at',
            instituicoes: 'id, user_id, nome, synced, updated_at',
            tratamentos: 'id, user_id, person_id, nome, status, synced, updated_at, *cid_ids',
            cids: 'id, user_id, codigo, synced, updated_at',
            anexos_clinicos: 'id, user_id, synced, updated_at',
            syncQueue: 'id, table, operation, created_at, retry_count, failed',
            // Laboratórios não fazem mais parte do modelo atual.
            laboratorios: null,
        })
            .upgrade(function (tx) { return __awaiter(_this, void 0, void 0, function () {
            var medicamentos, _i, medicamentos_2, medicamento, medRaw, exames, _a, exames_2, exame, exameRaw;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, tx
                            .table('medicamentos')
                            .toArray()];
                    case 1:
                        medicamentos = _b.sent();
                        _i = 0, medicamentos_2 = medicamentos;
                        _b.label = 2;
                    case 2:
                        if (!(_i < medicamentos_2.length)) return [3 /*break*/, 5];
                        medicamento = medicamentos_2[_i];
                        medRaw = medicamento;
                        if (!(!medRaw.local_id &&
                            medRaw.estabelecimento_id)) return [3 /*break*/, 4];
                        return [4 /*yield*/, tx
                                .table('medicamentos')
                                .update(medRaw.id, {
                                local_id: medRaw.estabelecimento_id,
                            })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, tx
                            .table('exames')
                            .toArray()];
                    case 6:
                        exames = _b.sent();
                        _a = 0, exames_2 = exames;
                        _b.label = 7;
                    case 7:
                        if (!(_a < exames_2.length)) return [3 /*break*/, 10];
                        exame = exames_2[_a];
                        exameRaw = exame;
                        if (!(!exameRaw.local_id &&
                            exameRaw.laboratorio_id)) return [3 /*break*/, 9];
                        return [4 /*yield*/, tx
                                .table('exames')
                                .update(exameRaw.id, {
                                local_id: exameRaw.laboratorio_id,
                            })];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 7];
                    case 10: return [2 /*return*/];
                }
            });
        }); });
        // ==========================================================
        // VERSÃO 21
        //
        // Atualização dos índices de CIDs para incluir campos
        // clínicos (person_id, medico_id, hospital_id, local_id).
        // ==========================================================
        _this.version(21).stores({
            cids: 'id, user_id, person_id, codigo, medico_id, hospital_id, local_id, synced, updated_at',
        });
        return _this;
    }
    return VaultDB;
}(dexie_1.default));
// ============================================================
// INSTÂNCIA ÚNICA
// ============================================================
exports.db = new VaultDB();
// ============================================================
// MEDICAMENTO ↔ TRATAMENTO
//
// O relacionamento atual fica diretamente em
// Medicamento.tratamento_ids.
//
// Esta função NÃO sincroniza Supabase.
// Ela apenas atualiza o IndexedDB local.
// ============================================================
function syncMedicamentoTratamentos(medicamentoId, tratamentoIds) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.medicamentos.get(medicamentoId)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Medicamento não encontrado');
                    }
                    return [4 /*yield*/, exports.db.medicamentos.update(medicamentoId, {
                            tratamento_ids: tratamentoIds,
                            updated_at: timestamp,
                            synced: false,
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.syncMedicamentoTratamentos = syncMedicamentoTratamentos;
// ============================================================
// PERSONS
// ============================================================
function safeAddPerson(person) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, person), { id: id, synced: false, created_at: timestamp, updated_at: timestamp });
                    return [4 /*yield*/, exports.db.persons.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddPerson = safeAddPerson;
function safeUpdatePerson(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.persons.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Pessoa não encontrada');
                    }
                    return [4 /*yield*/, exports.db.persons.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdatePerson = safeUpdatePerson;
function safeDeletePerson(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.persons.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeletePerson = safeDeletePerson;
// ============================================================
// DOCUMENTS
// ============================================================
function safeAddDocument(doc) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, doc), { id: id, synced: false, created_at: timestamp, updated_at: timestamp });
                    return [4 /*yield*/, exports.db.documents.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddDocument = safeAddDocument;
function safeUpdateDocument(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, document;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.documents.get(id)];
                case 1:
                    document = _a.sent();
                    if (!document) {
                        throw new Error('Documento não encontrado');
                    }
                    return [4 /*yield*/, exports.db.documents.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateDocument = safeUpdateDocument;
function safeDeleteDocument(id) {
    return __awaiter(this, void 0, Promise, function () {
        var document, _i, _a, attachment, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, exports.db.documents.get(id)];
                case 1:
                    document = _b.sent();
                    if (!document) {
                        throw new Error('Documento não encontrado');
                    }
                    if (!(document.attachments &&
                        document.attachments.length > 0)) return [3 /*break*/, 7];
                    _i = 0, _a = document.attachments;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    attachment = _a[_i];
                    if (!(attachment.url &&
                        !attachment.url.startsWith('blob:'))) return [3 /*break*/, 6];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, storage_1.deleteFile)(attachment.url)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    console.error('Erro ao deletar anexo:', attachment.url, error_1);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [4 /*yield*/, exports.db.documents.delete(id)];
                case 8:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteDocument = safeDeleteDocument;
function toggleFavorite(id) {
    return __awaiter(this, void 0, Promise, function () {
        var document;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.documents.get(id)];
                case 1:
                    document = _a.sent();
                    if (!document) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, safeUpdateDocument(id, {
                            is_favorite: !document.is_favorite,
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.toggleFavorite = toggleFavorite;
// ============================================================
// MEDICAMENTOS
// ============================================================
function safeAddMedicamento(med) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, med), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.medicamentos.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddMedicamento = safeAddMedicamento;
function safeUpdateMedicamento(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.medicamentos.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Medicamento não encontrado');
                    }
                    return [4 /*yield*/, exports.db.medicamentos.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateMedicamento = safeUpdateMedicamento;
function safeDeleteMedicamento(medicamentoId) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.medicamentos.delete(medicamentoId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteMedicamento = safeDeleteMedicamento;
// ============================================================
// RENOVAÇÕES
// ============================================================
function safeAddRenovacao(ren) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, ren), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.renovacoes.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddRenovacao = safeAddRenovacao;
function safeUpdateRenovacao(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.renovacoes.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Renovação não encontrada');
                    }
                    return [4 /*yield*/, exports.db.renovacoes.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateRenovacao = safeUpdateRenovacao;
// ============================================================
// DOSE LOGS
// ============================================================
function safeSetDoseLog(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, targetDate, existing, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    targetDate = data.data || (0, health_utils_1.getLocalTodayISO)();
                    return [4 /*yield*/, exports.db.doseLogs
                            .where('medicamento_id')
                            .equals(data.medicamento_id)
                            .filter(function (log) {
                            return log.data === targetDate &&
                                log.horario === data.horario;
                        })
                            .first()];
                case 1:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 3];
                    return [4 /*yield*/, exports.db.doseLogs.update(existing.id, __assign(__assign({}, data), { data: targetDate, tomado_em: data.tomado_em, ignorado_em: data.ignorado_em, updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/, existing.id];
                case 3:
                    id = generateId();
                    full = __assign(__assign({}, data), { data: targetDate, id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.doseLogs.add(full)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeSetDoseLog = safeSetDoseLog;
// ============================================================
// VAULTS
// ============================================================
function safeAddVault(vault) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, vault), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.vaults.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddVault = safeAddVault;
function safeAddVaultMember(member) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, member), { id: id, invited_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.vaultMembers.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddVaultMember = safeAddVaultMember;
function safeUpdateVaultMember(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.vaultMembers.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Membro do vault não encontrado');
                    }
                    return [4 /*yield*/, exports.db.vaultMembers.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateVaultMember = safeUpdateVaultMember;
function shareDocumentWithVault(documentId, vaultId) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, document;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.documents.get(documentId)];
                case 1:
                    document = _a.sent();
                    if (!document) {
                        throw new Error('Documento não encontrado');
                    }
                    return [4 /*yield*/, exports.db.documents.update(documentId, {
                            vault_id: vaultId,
                            updated_at: timestamp,
                            synced: false,
                        })];
                case 2:
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
            return [2 /*return*/, exports.db.documents
                    .where('vault_id')
                    .equals(vaultId)
                    .toArray()];
        });
    });
}
exports.getVaultDocuments = getVaultDocuments;
function getVaultMembers(vaultId) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.db.vaultMembers
                    .where('vault_id')
                    .equals(vaultId)
                    .toArray()];
        });
    });
}
exports.getVaultMembers = getVaultMembers;
// ============================================================
// MÉDICOS
// ============================================================
function safeAddMedico(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.medicos.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddMedico = safeAddMedico;
function safeUpdateMedico(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.medicos.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Médico não encontrado');
                    }
                    return [4 /*yield*/, exports.db.medicos.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateMedico = safeUpdateMedico;
function safeDeleteMedico(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.medicos.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteMedico = safeDeleteMedico;
// ============================================================
// FARMÁCIAS
// ============================================================
function safeAddFarmacia(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.farmacias.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddFarmacia = safeAddFarmacia;
function safeUpdateFarmacia(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.farmacias.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Farmácia não encontrada');
                    }
                    return [4 /*yield*/, exports.db.farmacias.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateFarmacia = safeUpdateFarmacia;
function safeDeleteFarmacia(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.farmacias.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteFarmacia = safeDeleteFarmacia;
// ============================================================
// HOSPITAIS
// ============================================================
function safeAddHospital(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.hospitais.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddHospital = safeAddHospital;
function safeUpdateHospital(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.hospitais.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Hospital não encontrado');
                    }
                    return [4 /*yield*/, exports.db.hospitais.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateHospital = safeUpdateHospital;
function safeDeleteHospital(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.hospitais.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteHospital = safeDeleteHospital;
// ============================================================
// LOCAIS DE SAÚDE
// ============================================================
function safeAddLocal(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.locais.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddLocal = safeAddLocal;
function safeUpdateLocal(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.locais.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Local não encontrado');
                    }
                    return [4 /*yield*/, exports.db.locais.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateLocal = safeUpdateLocal;
function safeDeleteLocal(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.locais.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteLocal = safeDeleteLocal;
// ============================================================
// EXAMES
// ============================================================
function safeAddExame(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.exames.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddExame = safeAddExame;
function safeUpdateExame(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.exames.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Exame não encontrado');
                    }
                    return [4 /*yield*/, exports.db.exames.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateExame = safeUpdateExame;
function safeDeleteExame(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.exames.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteExame = safeDeleteExame;
// ============================================================
// CONSULTAS
// ============================================================
function safeAddConsulta(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.consultas.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddConsulta = safeAddConsulta;
function safeUpdateConsulta(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.consultas.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Consulta não encontrada');
                    }
                    return [4 /*yield*/, exports.db.consultas.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateConsulta = safeUpdateConsulta;
function safeDeleteConsulta(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.consultas.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteConsulta = safeDeleteConsulta;
// ============================================================
// CIRURGIAS
// ============================================================
function safeAddCirurgia(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.cirurgias.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddCirurgia = safeAddCirurgia;
function safeUpdateCirurgia(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.cirurgias.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Cirurgia não encontrada');
                    }
                    return [4 /*yield*/, exports.db.cirurgias.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateCirurgia = safeUpdateCirurgia;
function safeDeleteCirurgia(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.cirurgias.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteCirurgia = safeDeleteCirurgia;
// ============================================================
// CREDENTIALS
// ============================================================
function safeAddCredential(cred) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, cred), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.credentials.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddCredential = safeAddCredential;
function safeUpdateCredential(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.credentials.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Credencial não encontrada');
                    }
                    return [4 /*yield*/, exports.db.credentials.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateCredential = safeUpdateCredential;
function safeDeleteCredential(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.credentials.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteCredential = safeDeleteCredential;
// ============================================================
// CARTÕES
// ============================================================
function safeAddCard(card) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, card), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.cards.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddCard = safeAddCard;
function safeUpdateCard(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.cards.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Cartão não encontrado');
                    }
                    return [4 /*yield*/, exports.db.cards.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateCard = safeUpdateCard;
function safeDeleteCard(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.cards.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteCard = safeDeleteCard;
// ============================================================
// INSTITUIÇÕES
// ============================================================
function safeAddInstituicao(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.instituicoes.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddInstituicao = safeAddInstituicao;
function safeUpdateInstituicao(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.instituicoes.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Instituição de ensino não encontrada');
                    }
                    return [4 /*yield*/, exports.db.instituicoes.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateInstituicao = safeUpdateInstituicao;
function safeDeleteInstituicao(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.instituicoes.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteInstituicao = safeDeleteInstituicao;
// ============================================================
// TRATAMENTOS
// ============================================================
function safeAddTratamento(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.tratamentos.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddTratamento = safeAddTratamento;
function safeUpdateTratamento(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.tratamentos.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Tratamento não encontrado');
                    }
                    return [4 /*yield*/, exports.db.tratamentos.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateTratamento = safeUpdateTratamento;
function safeDeleteTratamento(id) {
    var _a, _b;
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing, medicamentos, _i, medicamentos_3, medicamento, tratamentoIds, exames, _c, exames_3, exame, tratamentoIds;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.tratamentos.get(id)];
                case 1:
                    existing = _d.sent();
                    if (!existing) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, exports.db.medicamentos.toArray()];
                case 2:
                    medicamentos = _d.sent();
                    _i = 0, medicamentos_3 = medicamentos;
                    _d.label = 3;
                case 3:
                    if (!(_i < medicamentos_3.length)) return [3 /*break*/, 6];
                    medicamento = medicamentos_3[_i];
                    if (!((_a = medicamento.tratamento_ids) === null || _a === void 0 ? void 0 : _a.includes(id))) return [3 /*break*/, 5];
                    tratamentoIds = medicamento.tratamento_ids.filter(function (tratamentoId) {
                        return tratamentoId !== id;
                    });
                    return [4 /*yield*/, exports.db.medicamentos.update(medicamento.id, {
                            tratamento_ids: tratamentoIds,
                            updated_at: timestamp,
                            synced: false,
                        })];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, exports.db.exames.toArray()];
                case 7:
                    exames = _d.sent();
                    _c = 0, exames_3 = exames;
                    _d.label = 8;
                case 8:
                    if (!(_c < exames_3.length)) return [3 /*break*/, 11];
                    exame = exames_3[_c];
                    if (!((_b = exame.tratamento_ids) === null || _b === void 0 ? void 0 : _b.includes(id))) return [3 /*break*/, 10];
                    tratamentoIds = exame.tratamento_ids.filter(function (tratamentoId) {
                        return tratamentoId !== id;
                    });
                    return [4 /*yield*/, exports.db.exames.update(exame.id, {
                            tratamento_ids: tratamentoIds,
                            updated_at: timestamp,
                            synced: false,
                        })];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10:
                    _c++;
                    return [3 /*break*/, 8];
                case 11: 
                // ----------------------------------------------------------
                // Limpar relações legadas
                // ----------------------------------------------------------
                return [4 /*yield*/, exports.db.medicamento_tratamentos
                        .where('tratamento_id')
                        .equals(id)
                        .delete()];
                case 12:
                    // ----------------------------------------------------------
                    // Limpar relações legadas
                    // ----------------------------------------------------------
                    _d.sent();
                    return [4 /*yield*/, exports.db.exame_tratamentos
                            .where('tratamento_id')
                            .equals(id)
                            .delete()];
                case 13:
                    _d.sent();
                    // ----------------------------------------------------------
                    // Deletar tratamento
                    // ----------------------------------------------------------
                    return [4 /*yield*/, exports.db.tratamentos.delete(id)];
                case 14:
                    // ----------------------------------------------------------
                    // Deletar tratamento
                    // ----------------------------------------------------------
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteTratamento = safeDeleteTratamento;
// ============================================================
// CIDs
// ============================================================
function safeAddCid(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.cids.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddCid = safeAddCid;
function safeUpdateCid(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.cids.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('CID não encontrado');
                    }
                    return [4 /*yield*/, exports.db.cids.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateCid = safeUpdateCid;
function safeDeleteCid(id) {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing, tratamentos, _i, tratamentos_2, tratamento, cidIds;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.cids.get(id)];
                case 1:
                    existing = _b.sent();
                    if (!existing) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, exports.db.tratamentos.toArray()];
                case 2:
                    tratamentos = _b.sent();
                    _i = 0, tratamentos_2 = tratamentos;
                    _b.label = 3;
                case 3:
                    if (!(_i < tratamentos_2.length)) return [3 /*break*/, 6];
                    tratamento = tratamentos_2[_i];
                    if (!((_a = tratamento.cid_ids) === null || _a === void 0 ? void 0 : _a.includes(id))) return [3 /*break*/, 5];
                    cidIds = tratamento.cid_ids.filter(function (cidId) { return cidId !== id; });
                    return [4 /*yield*/, exports.db.tratamentos.update(tratamento.id, {
                            cid_ids: cidIds,
                            updated_at: timestamp,
                            synced: false,
                        })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, exports.db.cids.delete(id)];
                case 7:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteCid = safeDeleteCid;
// ============================================================
// ANEXOS CLÍNICOS
// ============================================================
function safeAddAnexoClinico(data) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, id, full;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    id = generateId();
                    full = __assign(__assign({}, data), { id: id, created_at: timestamp, updated_at: timestamp, synced: false });
                    return [4 /*yield*/, exports.db.anexos_clinicos.add(full)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, id];
            }
        });
    });
}
exports.safeAddAnexoClinico = safeAddAnexoClinico;
function safeUpdateAnexoClinico(id, changes) {
    return __awaiter(this, void 0, Promise, function () {
        var timestamp, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = nowIso();
                    return [4 /*yield*/, exports.db.anexos_clinicos.get(id)];
                case 1:
                    existing = _a.sent();
                    if (!existing) {
                        throw new Error('Anexo clínico não encontrado');
                    }
                    return [4 /*yield*/, exports.db.anexos_clinicos.update(id, __assign(__assign({}, changes), { updated_at: timestamp, synced: false }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeUpdateAnexoClinico = safeUpdateAnexoClinico;
function safeDeleteAnexoClinico(id) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.db.anexos_clinicos.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.safeDeleteAnexoClinico = safeDeleteAnexoClinico;
