// hooks/useCredentials.ts
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCredentials = void 0;
var dexie_react_hooks_1 = require("dexie-react-hooks");
var db_1 = require("@/lib/db");
var credentials_1 = require("@/lib/repositories/credentials");
var useAuth_1 = require("@/hooks/useAuth");
var crypto_1 = require("@/lib/crypto");
function useCredentials() {
    var _this = this;
    var user = (0, useAuth_1.useAuth)().user;
    var credentials = (0, dexie_react_hooks_1.useLiveQuery)(function () { return db_1.db.credentials.where("user_id").equals((user === null || user === void 0 ? void 0 : user.id) || "").toArray(); }, [user === null || user === void 0 ? void 0 : user.id], []);
    var addCredential = function (data) { return __awaiter(_this, void 0, Promise, function () {
        var password_plain, rest, password_encrypted;
        return __generator(this, function (_a) {
            password_plain = data.password_plain, rest = __rest(data, ["password_plain"]);
            password_encrypted = (0, crypto_1.encryptPassword)(password_plain);
            return [2 /*return*/, credentials_1.credentialsRepository.create(__assign(__assign({}, rest), { user_id: (user === null || user === void 0 ? void 0 : user.id) || "", password_encrypted: password_encrypted }))];
        });
    }); };
    var updateCredential = function (id, changes) { return __awaiter(_this, void 0, Promise, function () {
        var password_plain, rest, payload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    password_plain = changes.password_plain, rest = __rest(changes, ["password_plain"]);
                    payload = __assign({}, rest);
                    if (password_plain) {
                        payload.password_encrypted = (0, crypto_1.encryptPassword)(password_plain);
                    }
                    return [4 /*yield*/, credentials_1.credentialsRepository.update(id, payload)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var deleteCredential = function (id) { return __awaiter(_this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, credentials_1.credentialsRepository.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var credentialsByVault = function (vaultId) { return (credentials || []).filter(function (c) { return c.vault_id === vaultId; }); };
    var credentialsPersonal = function () { return (credentials || []).filter(function (c) { return !c.vault_id; }); };
    return {
        credentials: credentials || [],
        addCredential: addCredential,
        updateCredential: updateCredential,
        deleteCredential: deleteCredential,
        credentialsByVault: credentialsByVault,
        credentialsPersonal: credentialsPersonal,
    };
}
exports.useCredentials = useCredentials;
