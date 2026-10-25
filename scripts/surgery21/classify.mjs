#!/usr/bin/env node
// Classify failures; never downgrade result to success.
import fs from 'node:fs';
const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error('Informe o log do gate');
const text=fs.readFileSync(file,'utf8');
let kind='FALHA FUNCIONAL/AMBIENTE — analisar log';
let action='Manter rollback seletivo; investigar as linhas anteriores ao primeiro erro.';
if(/ERR_ASSERTION|AssertionError/.test(text)) {
  kind=/marker missing|\.includes\(|regex|regular expression|expected.*\/|input did not match/i.test(text)?'CONTRATO TEXTUAL LEGADO POTENCIALMENTE FRÁGIL':'ASSERTIVA FUNCIONAL';
  action='Inspecionar teste e comportamento real. Nunca ajustar produção apenas para satisfazer marcador textual.';
} else if(/Cannot find module|ERR_MODULE_NOT_FOUND/.test(text)){kind='DEPENDÊNCIA/MOCK INCOMPATÍVEL';action='Atualizar fixture ou mock, sem apagar teste.';}
else if(/TS\d{4}:|error TS\d{4}/i.test(text)){kind='TYPESCRIPT';action='Corrigir origem de tipagem e repetir tsc.';}
else if(/network|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|supabaseUrl is required/i.test(text)){kind='AMBIENTE/REDE';action='Verificar ambiente sem expor segredos ou forçar publicação.';}
const lines=text.split(/\r?\n/);const idx=lines.findIndex(l=>/AssertionError|ERR_ASSERTION|Error:|FALHOU|error TS\d{4}/.test(l));
console.log(JSON.stringify({classification:kind,recommendation:action,firstErrorLine:idx<0?null:idx+1,excerpt:idx<0?lines.slice(-20).join('\n'):lines.slice(Math.max(0,idx-2),Math.min(lines.length,idx+9)).join('\n')},null,2));
