"use strict";
// lib/repositories/medicos.ts
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
exports.medicosRepository = void 0;
var db_1 = require("@/lib/db");
var enfileirarOperacao_1 = require("@/lib/sync/enfileirarOperacao");
exports.medicosRepository = {
    getAll: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.medicos.toArray()];
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.medicos.get(id)];
            });
        });
    },
    create: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.safeAddMedico)(data)];
                    case 1:
                        id = _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicos", "add", __assign({ id: id }, data))];
                    case 2:
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
                    case 0: return [4 /*yield*/, (0, db_1.safeUpdateMedico)(id, data)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicos", "update", __assign({ id: id }, data))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    /**
     * Exclusão Segura com Sincronização
     * Remove o médico e limpa o ID dele de medicamentos, consultas e cirurgias.
     * Todas as operações usam safe... e enfileirarOperacao.
     */
    deleteSafe: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var medicamentosAfetados, _i, medicamentosAfetados_1, med, consultasAfetadas, _a, consultasAfetadas_1, con, cirurgiasAfetadas, _b, cirurgiasAfetadas_1, cir;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 1. Exclui o médico
                    return [4 /*yield*/, (0, db_1.safeDeleteMedico)(id)];
                    case 1:
                        // 1. Exclui o médico
                        _c.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicos", "delete", { id: id })];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, db_1.db.medicamentos.where('medico_id').equals(id).toArray()];
                    case 3:
                        medicamentosAfetados = _c.sent();
                        _i = 0, medicamentosAfetados_1 = medicamentosAfetados;
                        _c.label = 4;
                    case 4:
                        if (!(_i < medicamentosAfetados_1.length)) return [3 /*break*/, 8];
                        med = medicamentosAfetados_1[_i];
                        if (!med.id) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, db_1.safeUpdateMedicamento)(med.id, { medico_id: undefined })];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicamentos", "update", { id: med.id, medico_id: undefined })];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 4];
                    case 8: return [4 /*yield*/, db_1.db.consultas.where('medico_id').equals(id).toArray()];
                    case 9:
                        consultasAfetadas = _c.sent();
                        _a = 0, consultasAfetadas_1 = consultasAfetadas;
                        _c.label = 10;
                    case 10:
                        if (!(_a < consultasAfetadas_1.length)) return [3 /*break*/, 14];
                        con = consultasAfetadas_1[_a];
                        if (!con.id) return [3 /*break*/, 13];
                        return [4 /*yield*/, (0, db_1.safeUpdateConsulta)(con.id, { medico_id: undefined })];
                    case 11:
                        _c.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("consultas", "update", { id: con.id, medico_id: undefined })];
                    case 12:
                        _c.sent();
                        _c.label = 13;
                    case 13:
                        _a++;
                        return [3 /*break*/, 10];
                    case 14: return [4 /*yield*/, db_1.db.cirurgias.where('medico_id').equals(id).toArray()];
                    case 15:
                        cirurgiasAfetadas = _c.sent();
                        _b = 0, cirurgiasAfetadas_1 = cirurgiasAfetadas;
                        _c.label = 16;
                    case 16:
                        if (!(_b < cirurgiasAfetadas_1.length)) return [3 /*break*/, 20];
                        cir = cirurgiasAfetadas_1[_b];
                        if (!cir.id) return [3 /*break*/, 19];
                        return [4 /*yield*/, (0, db_1.safeUpdateCirurgia)(cir.id, { medico_id: undefined })];
                    case 17:
                        _c.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("cirurgias", "update", { id: cir.id, medico_id: undefined })];
                    case 18:
                        _c.sent();
                        _c.label = 19;
                    case 19:
                        _b++;
                        return [3 /*break*/, 16];
                    case 20: return [2 /*return*/];
                }
            });
        });
    },
};
