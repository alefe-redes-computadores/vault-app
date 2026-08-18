"use strict";
// lib/repositories/locais.ts
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
exports.locaisRepository = void 0;
var db_1 = require("@/lib/db");
var enfileirarOperacao_1 = require("@/lib/sync/enfileirarOperacao");
exports.locaisRepository = {
    getAll: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.locais.toArray()];
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.locais.get(id)];
            });
        });
    },
    create: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.safeAddLocal)(data)];
                    case 1:
                        id = _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("locais", "add", __assign({ id: id }, data))];
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
                    case 0: return [4 /*yield*/, (0, db_1.safeUpdateLocal)(id, data)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("locais", "update", __assign({ id: id }, data))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    /**
     * Exclusão Segura com Sincronização
     * Remove o local e limpa o ID dele de renovações, medicamentos, exames, consultas e cirurgias.
     */
    deleteSafe: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var renovacoesAfetadas, _i, renovacoesAfetadas_1, ren, medicamentosAfetados, _a, medicamentosAfetados_1, med, examesAfetados, _b, examesAfetados_1, exame, consultasAfetadas, _c, consultasAfetadas_1, con, cirurgiasAfetadas, _d, cirurgiasAfetadas_1, cir;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: 
                    // 1. Exclui o local
                    return [4 /*yield*/, (0, db_1.safeDeleteLocal)(id)];
                    case 1:
                        // 1. Exclui o local
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("locais", "delete", { id: id })];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, db_1.db.renovacoes.where('local_id').equals(id).toArray()];
                    case 3:
                        renovacoesAfetadas = _e.sent();
                        _i = 0, renovacoesAfetadas_1 = renovacoesAfetadas;
                        _e.label = 4;
                    case 4:
                        if (!(_i < renovacoesAfetadas_1.length)) return [3 /*break*/, 8];
                        ren = renovacoesAfetadas_1[_i];
                        if (!ren.id) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, db_1.safeUpdateRenovacao)(ren.id, { local_id: undefined })];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("renovacoes", "update", { id: ren.id, local_id: undefined })];
                    case 6:
                        _e.sent();
                        _e.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 4];
                    case 8: return [4 /*yield*/, db_1.db.medicamentos.where('local_id').equals(id).toArray()];
                    case 9:
                        medicamentosAfetados = _e.sent();
                        _a = 0, medicamentosAfetados_1 = medicamentosAfetados;
                        _e.label = 10;
                    case 10:
                        if (!(_a < medicamentosAfetados_1.length)) return [3 /*break*/, 14];
                        med = medicamentosAfetados_1[_a];
                        if (!med.id) return [3 /*break*/, 13];
                        return [4 /*yield*/, (0, db_1.safeUpdateMedicamento)(med.id, { local_id: undefined })];
                    case 11:
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicamentos", "update", { id: med.id, local_id: undefined })];
                    case 12:
                        _e.sent();
                        _e.label = 13;
                    case 13:
                        _a++;
                        return [3 /*break*/, 10];
                    case 14: return [4 /*yield*/, db_1.db.exames.where('local_id').equals(id).toArray()];
                    case 15:
                        examesAfetados = _e.sent();
                        _b = 0, examesAfetados_1 = examesAfetados;
                        _e.label = 16;
                    case 16:
                        if (!(_b < examesAfetados_1.length)) return [3 /*break*/, 20];
                        exame = examesAfetados_1[_b];
                        if (!exame.id) return [3 /*break*/, 19];
                        return [4 /*yield*/, (0, db_1.safeUpdateExame)(exame.id, { local_id: undefined })];
                    case 17:
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("exames", "update", { id: exame.id, local_id: undefined })];
                    case 18:
                        _e.sent();
                        _e.label = 19;
                    case 19:
                        _b++;
                        return [3 /*break*/, 16];
                    case 20: return [4 /*yield*/, db_1.db.consultas.where('local_id').equals(id).toArray()];
                    case 21:
                        consultasAfetadas = _e.sent();
                        _c = 0, consultasAfetadas_1 = consultasAfetadas;
                        _e.label = 22;
                    case 22:
                        if (!(_c < consultasAfetadas_1.length)) return [3 /*break*/, 26];
                        con = consultasAfetadas_1[_c];
                        if (!con.id) return [3 /*break*/, 25];
                        return [4 /*yield*/, (0, db_1.safeUpdateConsulta)(con.id, { local_id: undefined })];
                    case 23:
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("consultas", "update", { id: con.id, local_id: undefined })];
                    case 24:
                        _e.sent();
                        _e.label = 25;
                    case 25:
                        _c++;
                        return [3 /*break*/, 22];
                    case 26: return [4 /*yield*/, db_1.db.cirurgias.where('local_id').equals(id).toArray()];
                    case 27:
                        cirurgiasAfetadas = _e.sent();
                        _d = 0, cirurgiasAfetadas_1 = cirurgiasAfetadas;
                        _e.label = 28;
                    case 28:
                        if (!(_d < cirurgiasAfetadas_1.length)) return [3 /*break*/, 32];
                        cir = cirurgiasAfetadas_1[_d];
                        if (!cir.id) return [3 /*break*/, 31];
                        return [4 /*yield*/, (0, db_1.safeUpdateCirurgia)(cir.id, { local_id: undefined })];
                    case 29:
                        _e.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("cirurgias", "update", { id: cir.id, local_id: undefined })];
                    case 30:
                        _e.sent();
                        _e.label = 31;
                    case 31:
                        _d++;
                        return [3 /*break*/, 28];
                    case 32: return [2 /*return*/];
                }
            });
        });
    },
};
