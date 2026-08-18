// hooks/usePaginatedCards.ts
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
exports.usePaginatedCards = void 0;
var react_1 = require("react");
var dexie_react_hooks_1 = require("dexie-react-hooks");
var db_1 = require("@/lib/db");
var cards_1 = require("@/lib/repositories/cards");
var useAuth_1 = require("./useAuth");
var PAGE_SIZE = 20;
var CONTA_TYPES = ["conta_corrente", "conta_poupanca", "conta_digital"];
var CARTAO_TYPES = ["cartao_credito", "cartao_debito"];
function usePaginatedCards(_a) {
    var _this = this;
    var _b = _a === void 0 ? {} : _a, _c = _b.searchQuery, searchQuery = _c === void 0 ? "" : _c, _d = _b.selectedType, selectedType = _d === void 0 ? "all" : _d, _e = _b.initialPage, initialPage = _e === void 0 ? 1 : _e;
    var user = (0, useAuth_1.useAuth)().user;
    var _f = (0, react_1.useState)(initialPage), page = _f[0], setPage = _f[1];
    var _g = (0, react_1.useState)(false), allLoaded = _g[0], setAllLoaded = _g[1];
    var _h = (0, react_1.useState)(false), isLoadingMore = _h[0], setIsLoadingMore = _h[1];
    var totalCount = (0, dexie_react_hooks_1.useLiveQuery)(function () { return __awaiter(_this, void 0, void 0, function () {
        var allCards, q_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/, 0];
                    return [4 /*yield*/, db_1.db.cards.where("user_id").equals(user.id).toArray()];
                case 1:
                    allCards = _a.sent();
                    allCards = applyTypeFilter(allCards, selectedType);
                    if (searchQuery.trim()) {
                        q_1 = searchQuery.toLowerCase();
                        allCards = allCards.filter(function (item) {
                            return item.title.toLowerCase().includes(q_1) ||
                                item.bank_name.toLowerCase().includes(q_1);
                        });
                    }
                    return [2 /*return*/, allCards.length];
            }
        });
    }); }, [user === null || user === void 0 ? void 0 : user.id, selectedType, searchQuery], 0);
    var cards = (0, dexie_react_hooks_1.useLiveQuery)(function () { return __awaiter(_this, void 0, void 0, function () {
        var allCards, q_2, end, paginated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db_1.db.cards.where("user_id").equals(user.id).toArray()];
                case 1:
                    allCards = _a.sent();
                    allCards = applyTypeFilter(allCards, selectedType);
                    if (searchQuery.trim()) {
                        q_2 = searchQuery.toLowerCase();
                        allCards = allCards.filter(function (item) {
                            return item.title.toLowerCase().includes(q_2) ||
                                item.bank_name.toLowerCase().includes(q_2);
                        });
                    }
                    allCards.sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
                    end = page * PAGE_SIZE;
                    paginated = allCards.slice(0, end);
                    setAllLoaded(paginated.length >= allCards.length);
                    return [2 /*return*/, paginated];
            }
        });
    }); }, [user === null || user === void 0 ? void 0 : user.id, selectedType, searchQuery, page], []);
    var loadMore = (0, react_1.useCallback)(function () {
        if (!allLoaded && !isLoadingMore) {
            setIsLoadingMore(true);
            setPage(function (prev) { return prev + 1; });
        }
    }, [allLoaded, isLoadingMore]);
    (0, react_1.useEffect)(function () {
        setIsLoadingMore(false);
    }, [cards]);
    var reset = (0, react_1.useCallback)(function () {
        setPage(1);
        setAllLoaded(false);
    }, []);
    (0, react_1.useEffect)(function () {
        reset();
    }, [searchQuery, selectedType, reset]);
    var addCard = function (cardData) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!user)
                throw new Error("Usuário não autenticado");
            return [2 /*return*/, cards_1.cardsRepository.create(__assign(__assign({}, cardData), { user_id: user.id }))];
        });
    }); };
    var updateCard = function (id, changes) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, cards_1.cardsRepository.update(id, changes)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var deleteCard = function (id) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, cards_1.cardsRepository.delete(id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var hasMore = !allLoaded && ((cards === null || cards === void 0 ? void 0 : cards.length) || 0) < (totalCount || 0);
    return {
        cards: cards || [],
        totalCount: totalCount || 0,
        hasMore: hasMore,
        isLoadingMore: isLoadingMore,
        loadMore: loadMore,
        addCard: addCard,
        updateCard: updateCard,
        deleteCard: deleteCard,
    };
}
exports.usePaginatedCards = usePaginatedCards;
function applyTypeFilter(allCards, selectedType) {
    if (selectedType === "cartoes") {
        return allCards.filter(function (item) { return CARTAO_TYPES.includes(item.type); });
    }
    if (selectedType === "contas") {
        return allCards.filter(function (item) { return CONTA_TYPES.includes(item.type); });
    }
    if (selectedType !== "all") {
        return allCards.filter(function (item) { return item.type === selectedType; });
    }
    return allCards;
}
