"use strict";
// lib/repositories/tratamentos.ts
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
exports.tratamentosRepository = void 0;
var db_1 = require("@/lib/db");
var db_2 = require("@/lib/db");
var db_3 = require("@/lib/db");
var enfileirarOperacao_1 = require("@/lib/sync/enfileirarOperacao");
exports.tratamentosRepository = {
    getAll: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.tratamentos.toArray()];
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.tratamentos.get(id)];
            });
        });
    },
    create: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.safeAddTratamento)(data)];
                    case 1:
                        id = _a.sent();
                        // 2. Enfileira para o Supabase (fonte de verdade)
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("tratamentos", "add", __assign({ id: id }, data))];
                    case 2:
                        // 2. Enfileira para o Supabase (fonte de verdade)
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    update: function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // 1. Atualiza localmente
                    return [4 /*yield*/, (0, db_1.safeUpdateTratamento)(id, data)];
                    case 1:
                        // 1. Atualiza localmente
                        _a.sent();
                        // 2. Enfileira para o Supabase
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("tratamentos", "update", __assign({ id: id }, data))];
                    case 2:
                        // 2. Enfileira para o Supabase
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    /**
     * Exclusão Segura com Sincronização (Cascade Delete Manual)
     * Remove o tratamento e limpa o ID dele de medicamentos e exames.
     * Todas as operações usam safe... e enfileirarOperacao para a nuvem.
     */
    deleteSafe: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var medicamentosAfetados, _i, medicamentosAfetados_1, med, novosIds, examesAfetados, _a, examesAfetados_1, exame, novosIds;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // 1. Exclui o tratamento e enfileira
                    return [4 /*yield*/, (0, db_1.safeDeleteTratamento)(id)];
                    case 1:
                        // 1. Exclui o tratamento e enfileira
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("tratamentos", "delete", { id: id })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, db_1.db.medicamentos
                                .where('tratamento_ids')
                                .equals(id)
                                .toArray()];
                    case 3:
                        medicamentosAfetados = _b.sent();
                        _i = 0, medicamentosAfetados_1 = medicamentosAfetados;
                        _b.label = 4;
                    case 4:
                        if (!(_i < medicamentosAfetados_1.length)) return [3 /*break*/, 8];
                        med = medicamentosAfetados_1[_i];
                        if (!(med.id && med.tratamento_ids)) return [3 /*break*/, 7];
                        novosIds = Array.from(new Set(med.tratamento_ids.filter(function (tId) { return tId !== id; })));
                        return [4 /*yield*/, (0, db_2.safeUpdateMedicamento)(med.id, { tratamento_ids: novosIds })];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicamentos", "update", { id: med.id, tratamento_ids: novosIds })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 4];
                    case 8: return [4 /*yield*/, db_1.db.exames
                            .where('tratamento_ids')
                            .equals(id)
                            .toArray()];
                    case 9:
                        examesAfetados = _b.sent();
                        _a = 0, examesAfetados_1 = examesAfetados;
                        _b.label = 10;
                    case 10:
                        if (!(_a < examesAfetados_1.length)) return [3 /*break*/, 14];
                        exame = examesAfetados_1[_a];
                        if (!(exame.id && exame.tratamento_ids)) return [3 /*break*/, 13];
                        novosIds = Array.from(new Set(exame.tratamento_ids.filter(function (tId) { return tId !== id; })));
                        return [4 /*yield*/, (0, db_3.safeUpdateExame)(exame.id, { tratamento_ids: novosIds })];
                    case 11:
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("exames", "update", { id: exame.id, tratamento_ids: novosIds })];
                    case 12:
                        _b.sent();
                        _b.label = 13;
                    case 13:
                        _a++;
                        return [3 /*break*/, 10];
                    case 14: return [2 /*return*/];
                }
            });
        });
    }
};
