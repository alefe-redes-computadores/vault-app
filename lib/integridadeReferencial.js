"use strict";
// lib/db/integridadeReferencial.ts
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
exports.validarIntegridadeReferencial = void 0;
var db_1 = require("@/lib/db");
var enfileirarOperacao_1 = require("@/lib/sync/enfileirarOperacao");
/**
 * Verifica e corrige referências órfãs no IndexedDB.
 * Deve ser chamado uma vez por dia (ou por sessão) no boot do app.
 * Utiliza localStorage para registrar a última execução (evita rodar sempre).
 *
 * As correções feitas localmente são enfileiradas para sincronização.
 */
function validarIntegridadeReferencial() {
    return __awaiter(this, void 0, Promise, function () {
        var LAST_RUN_KEY, today, _a, persons, medicos, farmacias, hospitais, locais, cids, tratamentos, medicamentos, exames, consultas, cirurgias, renovacoes, documents, personIds, medicoIds, farmaciaIds, hospitalIds, localIds, cidIds, tratamentoIds, medicamentoIds, exameIds, consultaIds, cirurgiaIds, renovacaoIds, documentIds, _i, medicamentos_1, med, changed, validTratamentos, _b, exames_1, ex, changed, validTratamentos, _c, tratamentos_1, trat, changed, validCids, _d, consultas_1, cons, changed, _e, cirurgias_1, cir, changed, _f, renovacoes_1, ren, changed, _g, cids_1, cid, changed, _h, documents_1, doc, changed, doseLogs, _j, doseLogs_1, log, changed;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    LAST_RUN_KEY = 'vault_integrity_check_date';
                    today = new Date().toISOString().slice(0, 10);
                    // Verifica se já rodou hoje
                    if (localStorage.getItem(LAST_RUN_KEY) === today) {
                        return [2 /*return*/];
                    }
                    // Marca como executado agora (será mantido mesmo se falhar)
                    localStorage.setItem(LAST_RUN_KEY, today);
                    return [4 /*yield*/, Promise.all([
                            db_1.db.persons.toArray(),
                            db_1.db.medicos.toArray(),
                            db_1.db.farmacias.toArray(),
                            db_1.db.hospitais.toArray(),
                            db_1.db.locais.toArray(),
                            db_1.db.cids.toArray(),
                            db_1.db.tratamentos.toArray(),
                            db_1.db.medicamentos.toArray(),
                            db_1.db.exames.toArray(),
                            db_1.db.consultas.toArray(),
                            db_1.db.cirurgias.toArray(),
                            db_1.db.renovacoes.toArray(),
                            db_1.db.documents.toArray(),
                        ])];
                case 1:
                    _a = _k.sent(), persons = _a[0], medicos = _a[1], farmacias = _a[2], hospitais = _a[3], locais = _a[4], cids = _a[5], tratamentos = _a[6], medicamentos = _a[7], exames = _a[8], consultas = _a[9], cirurgias = _a[10], renovacoes = _a[11], documents = _a[12];
                    personIds = new Set(persons.map(function (p) { return p.id; }));
                    medicoIds = new Set(medicos.map(function (m) { return m.id; }));
                    farmaciaIds = new Set(farmacias.map(function (f) { return f.id; }));
                    hospitalIds = new Set(hospitais.map(function (h) { return h.id; }));
                    localIds = new Set(locais.map(function (l) { return l.id; }));
                    cidIds = new Set(cids.map(function (c) { return c.id; }));
                    tratamentoIds = new Set(tratamentos.map(function (t) { return t.id; }));
                    medicamentoIds = new Set(medicamentos.map(function (m) { return m.id; }));
                    exameIds = new Set(exames.map(function (e) { return e.id; }));
                    consultaIds = new Set(consultas.map(function (c) { return c.id; }));
                    cirurgiaIds = new Set(cirurgias.map(function (c) { return c.id; }));
                    renovacaoIds = new Set(renovacoes.map(function (r) { return r.id; }));
                    documentIds = new Set(documents.map(function (d) { return d.id; }));
                    _i = 0, medicamentos_1 = medicamentos;
                    _k.label = 2;
                case 2:
                    if (!(_i < medicamentos_1.length)) return [3 /*break*/, 6];
                    med = medicamentos_1[_i];
                    changed = false;
                    // tratamento_ids array
                    if (med.tratamento_ids && med.tratamento_ids.length > 0) {
                        validTratamentos = med.tratamento_ids.filter(function (id) {
                            return tratamentoIds.has(id);
                        });
                        if (validTratamentos.length !== med.tratamento_ids.length) {
                            med.tratamento_ids = validTratamentos;
                            changed = true;
                        }
                    }
                    // FK person_id
                    if (med.person_id && !personIds.has(med.person_id)) {
                        med.person_id = undefined;
                        changed = true;
                    }
                    // FK medico_id
                    if (med.medico_id && !medicoIds.has(med.medico_id)) {
                        med.medico_id = undefined;
                        changed = true;
                    }
                    // FK farmacia_id
                    if (med.farmacia_id && !farmaciaIds.has(med.farmacia_id)) {
                        med.farmacia_id = undefined;
                        changed = true;
                    }
                    // FK hospital_id
                    if (med.hospital_id && !hospitalIds.has(med.hospital_id)) {
                        med.hospital_id = undefined;
                        changed = true;
                    }
                    // FK local_id
                    if (med.local_id && !localIds.has(med.local_id)) {
                        med.local_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 5];
                    return [4 /*yield*/, db_1.db.medicamentos.update(med.id, med)];
                case 3:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('medicamentos', 'update', med)];
                case 4:
                    _k.sent();
                    _k.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    _b = 0, exames_1 = exames;
                    _k.label = 7;
                case 7:
                    if (!(_b < exames_1.length)) return [3 /*break*/, 11];
                    ex = exames_1[_b];
                    changed = false;
                    // tratamento_ids array
                    if (ex.tratamento_ids && ex.tratamento_ids.length > 0) {
                        validTratamentos = ex.tratamento_ids.filter(function (id) {
                            return tratamentoIds.has(id);
                        });
                        if (validTratamentos.length !== ex.tratamento_ids.length) {
                            ex.tratamento_ids = validTratamentos;
                            changed = true;
                        }
                    }
                    // FK person_id
                    if (ex.person_id && !personIds.has(ex.person_id)) {
                        ex.person_id = undefined;
                        changed = true;
                    }
                    // FK medico_id
                    if (ex.medico_id && !medicoIds.has(ex.medico_id)) {
                        ex.medico_id = undefined;
                        changed = true;
                    }
                    // FK local_id
                    if (ex.local_id && !localIds.has(ex.local_id)) {
                        ex.local_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 10];
                    return [4 /*yield*/, db_1.db.exames.update(ex.id, ex)];
                case 8:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('exames', 'update', ex)];
                case 9:
                    _k.sent();
                    _k.label = 10;
                case 10:
                    _b++;
                    return [3 /*break*/, 7];
                case 11:
                    _c = 0, tratamentos_1 = tratamentos;
                    _k.label = 12;
                case 12:
                    if (!(_c < tratamentos_1.length)) return [3 /*break*/, 16];
                    trat = tratamentos_1[_c];
                    changed = false;
                    // cid_ids array
                    if (trat.cid_ids && trat.cid_ids.length > 0) {
                        validCids = trat.cid_ids.filter(function (id) { return cidIds.has(id); });
                        if (validCids.length !== trat.cid_ids.length) {
                            trat.cid_ids = validCids;
                            changed = true;
                        }
                    }
                    // FK person_id
                    if (trat.person_id && !personIds.has(trat.person_id)) {
                        trat.person_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 15];
                    return [4 /*yield*/, db_1.db.tratamentos.update(trat.id, trat)];
                case 13:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('tratamentos', 'update', trat)];
                case 14:
                    _k.sent();
                    _k.label = 15;
                case 15:
                    _c++;
                    return [3 /*break*/, 12];
                case 16:
                    _d = 0, consultas_1 = consultas;
                    _k.label = 17;
                case 17:
                    if (!(_d < consultas_1.length)) return [3 /*break*/, 21];
                    cons = consultas_1[_d];
                    changed = false;
                    if (cons.person_id && !personIds.has(cons.person_id)) {
                        cons.person_id = undefined;
                        changed = true;
                    }
                    if (cons.medico_id && !medicoIds.has(cons.medico_id)) {
                        cons.medico_id = undefined;
                        changed = true;
                    }
                    if (cons.hospital_id && !hospitalIds.has(cons.hospital_id)) {
                        cons.hospital_id = undefined;
                        changed = true;
                    }
                    if (cons.local_id && !localIds.has(cons.local_id)) {
                        cons.local_id = undefined;
                        changed = true;
                    }
                    if (cons.document_id && !documentIds.has(cons.document_id)) {
                        cons.document_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 20];
                    return [4 /*yield*/, db_1.db.consultas.update(cons.id, cons)];
                case 18:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('consultas', 'update', cons)];
                case 19:
                    _k.sent();
                    _k.label = 20;
                case 20:
                    _d++;
                    return [3 /*break*/, 17];
                case 21:
                    _e = 0, cirurgias_1 = cirurgias;
                    _k.label = 22;
                case 22:
                    if (!(_e < cirurgias_1.length)) return [3 /*break*/, 26];
                    cir = cirurgias_1[_e];
                    changed = false;
                    if (cir.person_id && !personIds.has(cir.person_id)) {
                        cir.person_id = undefined;
                        changed = true;
                    }
                    if (cir.medico_id && !medicoIds.has(cir.medico_id)) {
                        cir.medico_id = undefined;
                        changed = true;
                    }
                    if (cir.hospital_id && !hospitalIds.has(cir.hospital_id)) {
                        cir.hospital_id = undefined;
                        changed = true;
                    }
                    if (cir.local_id && !localIds.has(cir.local_id)) {
                        cir.local_id = undefined;
                        changed = true;
                    }
                    if (cir.document_id && !documentIds.has(cir.document_id)) {
                        cir.document_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 25];
                    return [4 /*yield*/, db_1.db.cirurgias.update(cir.id, cir)];
                case 23:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('cirurgias', 'update', cir)];
                case 24:
                    _k.sent();
                    _k.label = 25;
                case 25:
                    _e++;
                    return [3 /*break*/, 22];
                case 26:
                    _f = 0, renovacoes_1 = renovacoes;
                    _k.label = 27;
                case 27:
                    if (!(_f < renovacoes_1.length)) return [3 /*break*/, 31];
                    ren = renovacoes_1[_f];
                    changed = false;
                    if (ren.person_id && !personIds.has(ren.person_id)) {
                        ren.person_id = undefined;
                        changed = true;
                    }
                    if (ren.medicamento_id && !medicamentoIds.has(ren.medicamento_id)) {
                        // Se o medicamento não existe, não faz sentido manter a renovação? 
                        // Decisão: manter, mas sem medicamento_id seria quebrar a integridade. 
                        // Melhor excluir a renovação? Por ora, apenas logamos e removemos a referência.
                        ren.medicamento_id = '';
                        changed = true;
                    }
                    if (ren.medico_id && !medicoIds.has(ren.medico_id)) {
                        ren.medico_id = undefined;
                        changed = true;
                    }
                    if (ren.farmacia_id && !farmaciaIds.has(ren.farmacia_id)) {
                        ren.farmacia_id = undefined;
                        changed = true;
                    }
                    if (ren.hospital_id && !hospitalIds.has(ren.hospital_id)) {
                        ren.hospital_id = undefined;
                        changed = true;
                    }
                    if (ren.local_id && !localIds.has(ren.local_id)) {
                        ren.local_id = undefined;
                        changed = true;
                    }
                    if (ren.document_id && !documentIds.has(ren.document_id)) {
                        ren.document_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 30];
                    return [4 /*yield*/, db_1.db.renovacoes.update(ren.id, ren)];
                case 28:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('renovacoes', 'update', ren)];
                case 29:
                    _k.sent();
                    _k.label = 30;
                case 30:
                    _f++;
                    return [3 /*break*/, 27];
                case 31:
                    _g = 0, cids_1 = cids;
                    _k.label = 32;
                case 32:
                    if (!(_g < cids_1.length)) return [3 /*break*/, 36];
                    cid = cids_1[_g];
                    changed = false;
                    if (cid.person_id && !personIds.has(cid.person_id)) {
                        cid.person_id = undefined;
                        changed = true;
                    }
                    if (cid.medico_id && !medicoIds.has(cid.medico_id)) {
                        cid.medico_id = undefined;
                        changed = true;
                    }
                    if (cid.hospital_id && !hospitalIds.has(cid.hospital_id)) {
                        cid.hospital_id = undefined;
                        changed = true;
                    }
                    if (cid.local_id && !localIds.has(cid.local_id)) {
                        cid.local_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 35];
                    return [4 /*yield*/, db_1.db.cids.update(cid.id, cid)];
                case 33:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('cids', 'update', cid)];
                case 34:
                    _k.sent();
                    _k.label = 35;
                case 35:
                    _g++;
                    return [3 /*break*/, 32];
                case 36:
                    _h = 0, documents_1 = documents;
                    _k.label = 37;
                case 37:
                    if (!(_h < documents_1.length)) return [3 /*break*/, 41];
                    doc = documents_1[_h];
                    changed = false;
                    if (doc.person_id && !personIds.has(doc.person_id)) {
                        doc.person_id = '';
                        changed = true;
                    }
                    if (doc.hospital_id && !hospitalIds.has(doc.hospital_id)) {
                        doc.hospital_id = undefined;
                        changed = true;
                    }
                    if (doc.medico_id && !medicoIds.has(doc.medico_id)) {
                        doc.medico_id = undefined;
                        changed = true;
                    }
                    if (!changed) return [3 /*break*/, 40];
                    return [4 /*yield*/, db_1.db.documents.update(doc.id, doc)];
                case 38:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('documents', 'update', doc)];
                case 39:
                    _k.sent();
                    _k.label = 40;
                case 40:
                    _h++;
                    return [3 /*break*/, 37];
                case 41: return [4 /*yield*/, db_1.db.doseLogs.toArray()];
                case 42:
                    doseLogs = _k.sent();
                    _j = 0, doseLogs_1 = doseLogs;
                    _k.label = 43;
                case 43:
                    if (!(_j < doseLogs_1.length)) return [3 /*break*/, 50];
                    log = doseLogs_1[_j];
                    changed = false;
                    if (log.person_id && !personIds.has(log.person_id)) {
                        log.person_id = undefined;
                        changed = true;
                    }
                    if (!!medicamentoIds.has(log.medicamento_id)) return [3 /*break*/, 46];
                    // Excluir dose log se medicamento não existe
                    return [4 /*yield*/, db_1.db.doseLogs.delete(log.id)];
                case 44:
                    // Excluir dose log se medicamento não existe
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('doseLogs', 'delete', { id: log.id })];
                case 45:
                    _k.sent();
                    return [3 /*break*/, 49];
                case 46:
                    if (!changed) return [3 /*break*/, 49];
                    return [4 /*yield*/, db_1.db.doseLogs.update(log.id, log)];
                case 47:
                    _k.sent();
                    return [4 /*yield*/, (0, enfileirarOperacao_1.enfileirarOperacao)('doseLogs', 'update', log)];
                case 48:
                    _k.sent();
                    _k.label = 49;
                case 49:
                    _j++;
                    return [3 /*break*/, 43];
                case 50:
                    console.log('[Integridade] Verificação concluída.');
                    return [2 /*return*/];
            }
        });
    });
}
exports.validarIntegridadeReferencial = validarIntegridadeReferencial;
