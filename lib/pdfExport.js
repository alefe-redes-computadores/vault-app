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
exports.exportCardsToPDF = exports.exportCardToPDF = void 0;
var jspdf_1 = require("jspdf");
var html2canvas_1 = require("html2canvas");
var date_fns_1 = require("date-fns");
/**
 * Exporta um card (elemento HTML) para PDF como imagem
 * Mantém as cores, rebites e estilo visual
 */
function exportCardToPDF(options) {
    return __awaiter(this, void 0, Promise, function () {
        var cardRef, _a, title, _b, filename, canvas, pdf, pageWidth, pageHeight, imgWidth, imgHeight, ratio, finalWidth, finalHeight, x, y, imgData, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cardRef = options.cardRef, _a = options.title, title = _a === void 0 ? 'Documento Vault' : _a, _b = options.filename, filename = _b === void 0 ? "documento_".concat((0, date_fns_1.format)(new Date(), 'dd-MM-yyyy_HH-mm'), ".pdf") : _b;
                    if (!cardRef.current) {
                        throw new Error('Elemento do card não encontrado');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, html2canvas_1.default)(cardRef.current, {
                            scale: 3,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#0A0C0F',
                            allowTaint: true,
                            width: cardRef.current.scrollWidth,
                            height: cardRef.current.scrollHeight,
                        })];
                case 2:
                    canvas = _c.sent();
                    pdf = new jspdf_1.default({
                        orientation: 'portrait',
                        unit: 'px',
                        format: 'a4',
                        hotfixes: ['px_scaling'],
                    });
                    pageWidth = pdf.internal.pageSize.getWidth();
                    pageHeight = pdf.internal.pageSize.getHeight();
                    imgWidth = canvas.width;
                    imgHeight = canvas.height;
                    ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                    finalWidth = imgWidth * ratio * 0.95;
                    finalHeight = imgHeight * ratio * 0.95;
                    x = (pageWidth - finalWidth) / 2;
                    y = (pageHeight - finalHeight) / 2;
                    imgData = canvas.toDataURL('image/png');
                    // Adiciona a imagem ao PDF
                    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
                    // Salva o PDF
                    pdf.save(filename);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    console.error('Erro ao gerar PDF do card:', error_1);
                    throw new Error('Não foi possível gerar o PDF. Tente novamente.');
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.exportCardToPDF = exportCardToPDF;
/**
 * Exporta múltiplos cards para um único PDF (um por página)
 */
function exportCardsToPDF(options) {
    return __awaiter(this, void 0, Promise, function () {
        var cards, _a, title, _b, filename, onProgress, pdf, pageWidth, pageHeight, i, ref, canvas, imgWidth, imgHeight, ratio, finalWidth, finalHeight, x, y, imgData, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cards = options.cards, _a = options.title, title = _a === void 0 ? 'Meus Documentos' : _a, _b = options.filename, filename = _b === void 0 ? "documentos_".concat((0, date_fns_1.format)(new Date(), 'dd-MM-yyyy_HH-mm'), ".pdf") : _b, onProgress = options.onProgress;
                    if (cards.length === 0) {
                        throw new Error('Nenhum card para exportar');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    pdf = new jspdf_1.default({
                        orientation: 'portrait',
                        unit: 'px',
                        format: 'a4',
                        hotfixes: ['px_scaling'],
                    });
                    pageWidth = pdf.internal.pageSize.getWidth();
                    pageHeight = pdf.internal.pageSize.getHeight();
                    i = 0;
                    _c.label = 2;
                case 2:
                    if (!(i < cards.length)) return [3 /*break*/, 5];
                    ref = cards[i];
                    if (!ref.current)
                        return [3 /*break*/, 4];
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress(i + 1, cards.length);
                    return [4 /*yield*/, (0, html2canvas_1.default)(ref.current, {
                            scale: 3,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#0A0C0F',
                            allowTaint: true,
                            width: ref.current.scrollWidth,
                            height: ref.current.scrollHeight,
                        })];
                case 3:
                    canvas = _c.sent();
                    imgWidth = canvas.width;
                    imgHeight = canvas.height;
                    ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                    finalWidth = imgWidth * ratio * 0.95;
                    finalHeight = imgHeight * ratio * 0.95;
                    x = (pageWidth - finalWidth) / 2;
                    y = (pageHeight - finalHeight) / 2;
                    imgData = canvas.toDataURL('image/png');
                    // Adiciona página (exceto na primeira)
                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
                    _c.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    pdf.save(filename);
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _c.sent();
                    console.error('Erro ao exportar cards:', error_2);
                    throw new Error('Não foi possível gerar o PDF. Tente novamente.');
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.exportCardsToPDF = exportCardsToPDF;
