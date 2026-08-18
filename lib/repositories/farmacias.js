"use strict";
// lib/repositories/farmacias.ts
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
exports.farmaciasRepository = void 0;
var db_1 = require("@/lib/db");
var enfileirarOperacao_1 = require("@/lib/sync/enfileirarOperacao");
exports.farmaciasRepository = {
    getAll: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.farmacias.toArray()];
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, db_1.db.farmacias.get(id)];
            });
        });
    },
    create: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.safeAddFarmacia)(data)];
                    case 1:
                        id = _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("farmacias", "add", __assign({ id: id }, data))];
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
                    case 0: return [4 /*yield*/, (0, db_1.safeUpdateFarmacia)(id, data)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("farmacias", "update", __assign({ id: id }, data))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    /**
     * Exclusão Segura com Sincronização
     * Remove a farmácia e limpa o ID dela de medicamentos e renovações.
     */
    deleteSafe: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var medicamentosAfetados, _i, medicamentosAfetados_1, med, renovacoesAfetadas, _a, renovacoesAfetadas_1, ren;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // 1. Exclui a farmácia
                    return [4 /*yield*/, (0, db_1.safeDeleteFarmacia)(id)];
                    case 1:
                        // 1. Exclui a farmácia
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("farmacias", "delete", { id: id })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, db_1.db.medicamentos.where('farmacia_id').equals(id).toArray()];
                    case 3:
                        medicamentosAfetados = _b.sent();
                        _i = 0, medicamentosAfetados_1 = medicamentosAfetados;
                        _b.label = 4;
                    case 4:
                        if (!(_i < medicamentosAfetados_1.length)) return [3 /*break*/, 8];
                        med = medicamentosAfetados_1[_i];
                        if (!med.id) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, db_1.safeUpdateMedicamento)(med.id, { farmacia_id: undefined })];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("medicamentos", "update", { id: med.id, farmacia_id: undefined })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 4];
                    case 8: return [4 /*yield*/, db_1.db.renovacoes.where('farmacia_id').equals(id).toArray()];
                    case 9:
                        renovacoesAfetadas = _b.sent();
                        _a = 0, renovacoesAfetadas_1 = renovacoesAfetadas;
                        _b.label = 10;
                    case 10:
                        if (!(_a < renovacoesAfetadas_1.length)) return [3 /*break*/, 14];
                        ren = renovacoesAfetadas_1[_a];
                        if (!ren.id) return [3 /*break*/, 13];
                        return [4 /*yield*/, (0, db_1.safeUpdateRenovacao)(ren.id, { farmacia_id: undefined })];
                    case 11:
                        _b.sent();
                        return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)("renovacoes", "update", { id: ren.id, farmacia_id: undefined })];
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
    },
};
