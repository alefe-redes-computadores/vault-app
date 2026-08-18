// hooks/useTratamentos.ts
"use client";
"use strict";
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
exports.useTratamentos = void 0;
var react_1 = require("react");
var dexie_react_hooks_1 = require("dexie-react-hooks");
var db_1 = require("@/lib/db");
var tratamentos_1 = require("@/lib/repositories/tratamentos");
var medicamentos_1 = require("@/lib/repositories/medicamentos");
var useAuth_1 = require("./useAuth");
var dose_notifications_1 = require("@/lib/dose-notifications");
function useTratamentos() {
    var _this = this;
    var user = (0, useAuth_1.useAuth)().user;
    var tratamentos = (0, dexie_react_hooks_1.useLiveQuery)(function () { return db_1.db.tratamentos.where('user_id').equals((user === null || user === void 0 ? void 0 : user.id) || '').toArray(); }, [user === null || user === void 0 ? void 0 : user.id], []);
    var getTratamento = (0, react_1.useCallback)(function (id) {
        return tratamentos_1.tratamentosRepository.getById(id);
    }, []);
    var addTratamento = (0, react_1.useCallback)(function (data) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, tratamentos_1.tratamentosRepository.create(__assign(__assign({}, data), { user_id: (user === null || user === void 0 ? void 0 : user.id) || "" }))];
        });
    }); }, [user]);
    var updateTratamento = (0, react_1.useCallback)(function (id, data) { return __awaiter(_this, void 0, void 0, function () {
        var medicamentosAfetados, _i, medicamentosAfetados_1, med;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // 1. Atualiza os dados do Tratamento (via repositório, já enfileira)
                return [4 /*yield*/, tratamentos_1.tratamentosRepository.update(id, data)];
                case 1:
                    // 1. Atualiza os dados do Tratamento (via repositório, já enfileira)
                    _a.sent();
                    if (!(data.status === 'concluido' || data.status === 'suspenso')) return [3 /*break*/, 7];
                    return [4 /*yield*/, db_1.db.medicamentos
                            .where('tratamento_ids')
                            .equals(id)
                            .toArray()];
                case 2:
                    medicamentosAfetados = _a.sent();
                    _i = 0, medicamentosAfetados_1 = medicamentosAfetados;
                    _a.label = 3;
                case 3:
                    if (!(_i < medicamentosAfetados_1.length)) return [3 /*break*/, 7];
                    med = medicamentosAfetados_1[_i];
                    if (!(med.id && med.status !== 'descontinuado')) return [3 /*break*/, 6];
                    // Usa o repositório para enfileirar a atualização do medicamento
                    return [4 /*yield*/, medicamentos_1.medicamentosRepository.update(med.id, {
                            status: 'descontinuado',
                            motivo_descontinuacao: "Tratamento original marcado como ".concat(data.status)
                        })];
                case 4:
                    // Usa o repositório para enfileirar a atualização do medicamento
                    _a.sent();
                    if (!(med.estoque_horarios && med.estoque_horarios.length > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, dose_notifications_1.cancelDoseNotifications)({
                            id: med.id,
                            estoque_horarios: med.estoque_horarios
                        })];
                case 5:
                    _a.sent(); // TODO: tipar DoseNotificationPayload
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 3];
                case 7: return [2 /*return*/];
            }
        });
    }); }, []);
    var deleteTratamento = (0, react_1.useCallback)(function (id) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, tratamentos_1.tratamentosRepository.delete(id)];
        });
    }); }, []);
    var deleteTratamentoSafe = (0, react_1.useCallback)(function (id) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, tratamentos_1.tratamentosRepository.deleteSafe(id)];
        });
    }); }, []);
    return {
        tratamentos: tratamentos,
        getTratamento: getTratamento,
        addTratamento: addTratamento,
        updateTratamento: updateTratamento,
        deleteTratamento: deleteTratamento,
        deleteTratamentoSafe: deleteTratamentoSafe,
    };
}
exports.useTratamentos = useTratamentos;
