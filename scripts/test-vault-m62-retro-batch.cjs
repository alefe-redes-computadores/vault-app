#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
let passed = 0;
const check = (condition, label) => { assert.ok(condition, `M62: ${label}`); passed++; };
const base = process.cwd();
const files = [
  'lib/today/retro-batch-review.ts',
  'app/saude/medicamentos/revisao-retroativa/page.tsx',
  'app/saude/renovacao/nova/page.tsx',
  'app/saude/medicamentos/detalhes/page.tsx',
  'lib/repositories/renovacoes.ts',
  'lib/repositories/doseLogs.ts',
  'components/saude/MedicationAcquisitionQuantityGuide.tsx',
];
const load = (file, deps={}) => {
  const code=fs.readFileSync(file,'utf8');
  const out=ts.transpileModule(code,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  check(out.diagnostics.length===0,`${file} transpila sem erro sintático`);
  const mod=new Module(path.resolve(file),module);
  mod.require=id=>Object.hasOwn(deps,id)?deps[id]:require(id);
  mod._compile(out.outputText,path.resolve(file));
  return mod.exports;
};
for (const file of files) {
  const code=fs.readFileSync(file,'utf8');
  const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length===0,`AST sem falha: ${file}`);
}
const addDaysToLocalDate = (day, count) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y,m,d]=day.split('-').map(Number);
  const date=new Date(y,m-1,d,12);date.setDate(date.getDate()+count);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
const m=load(files[0],{'@/lib/health-utils':{addDaysToLocalDate}});
const med={id:'med1',user_id:'account1',person_id:'person1',nome:'Teste',dosagem:'1 mg',tipo_uso:'continuo',estoque_horarios:['08:00','20:00'],estoque_quantidade:30,estoque_unidade_por_dose:1,estoque_unidade_medida:'comprimido'};
const context={medication:med,userId:'account1',personId:'person1',from:'2026-10-01',to:'2026-10-03',yesterday:'2026-11-03',logs:[],attestSchedule:false};
check(m.validRetroDate('2026-02-28')&&!m.validRetroDate('2026-02-30')&&!m.validRetroDate('bad'), 'calendário gregoriano estrito');
check(m.retroScheduledTime('23:59')&&!m.retroScheduledTime('24:00')&&!m.retroScheduledTime('bad'),'horário válido');
check(m.retroSlotKey('2026-10-01','08:00')==='2026-10-01|08:00','identidade do slot estável');
check(m.buildRetroBatchSlots(context).slots.length===0,'sem confirmação de rotina não inventa slots retroativos');
const declared=m.buildRetroBatchSlots({...context,attestSchedule:true});
check(!declared.error&&declared.slots.length===6&&declared.days===3,'rotina antiga declarada gera dias e horários explícitos');
check(declared.slots.every(x=>x.status==='unconfirmed'&&!x.persisted),'ausência não vira tomada nem ignorada');
check(m.buildRetroBatchSlots({...context,personId:'person2',attestSchedule:true}).slots.length===0,'isolamento de pessoa');
check(m.buildRetroBatchSlots({...context,userId:'account2',attestSchedule:true}).error!==null,'isolamento de conta');
check(m.buildRetroBatchSlots({...context,medication:{...med,tipo_uso:'sos'},attestSchedule:true}).error!==null,'SOS fora de revisão programada');
check(m.buildRetroBatchSlots({...context,medication:{...med,tipo_uso:'esporadico'},attestSchedule:true}).error!==null,'extra/esporádico fora do lote');
check(Boolean(m.buildRetroBatchSlots({...context,from:'2026-11-04',to:'2026-11-04',attestSchedule:true}).error),'futuro e hoje bloqueados');
check(Boolean(m.buildRetroBatchSlots({...context,from:'2026-09-01',to:'2026-11-03',attestSchedule:true}).error),'limite de 45 dias bloqueia lote excessivo');
check(Boolean(m.buildRetroBatchSlots({...context,from:'2026-10-03',to:'2026-10-01',attestSchedule:true}).error),'período invertido bloqueado');
const log=(day,time,status,kind='scheduled')=>({id:`${day}:${time}`,user_id:'account1',person_id:'person1',medicamento_id:'med1',data:day,horario:time,dose_kind:kind,tomado_em:status==='taken'?'2026-10-01T11:00:00Z':undefined,ignorado_em:status==='ignored'?'2026-10-01T11:00:00Z':undefined});
const history=[log('2026-10-01','08:00','taken'),log('2026-10-01','20:00','ignored'),log('2026-10-02','08:00','unconfirmed','planned'),log('2026-10-02','20:00','taken'),log('2026-10-02','20:00','ignored'),log('2026-10-03','08:00','taken','sos')];
const viewed=m.buildRetroBatchSlots({...context,logs:history});
check(viewed.slots.length===4,'sem atestado só horários persistidos não-SOS');
check(viewed.slots.find(x=>x.key==='2026-10-01|08:00')?.status==='taken','tomada anterior preservada');
check(viewed.slots.find(x=>x.key==='2026-10-01|20:00')?.status==='ignored','ignorada anterior preservada');
check(viewed.slots.find(x=>x.key==='2026-10-02|08:00')?.status==='unconfirmed','slot planejado permanece pendente');
check(viewed.slots.find(x=>x.key==='2026-10-02|20:00')?.status==='conflict','duplicação/conflito detectados');
check(viewed.slots.every(x=>x.persisted),'origem dos horários relatada');
check(m.buildRetroBatchSlots({...context,logs:history,attestSchedule:true}).slots.length===6,'horários declarados juntam histórico sem duplicar');
check(!m.mayDebitHistoricalStock({...med,estoque_quantidade:undefined}),'saldo desconhecido não é debitável');
check(!m.mayDebitHistoricalStock({...med,estoque_quantidade:-1}),'saldo negativo não é debitável no lote');
check(!m.mayDebitHistoricalStock({...med,estoque_quantidade:0}),'saldo zero conhecido bloqueia desconto no lote');
check(!m.mayDebitHistoricalStock({...med,formato:'gotas',estoque_unidade_medida:'frascos'}),'gotas em frascos nunca debitadas sem conversão');
check(!m.mayDebitHistoricalStock({...med,formato:'gotas',estoque_unidade_medida:'ml'}),'gotas em ml sem taxa não debitadas');
check(m.mayDebitHistoricalStock({...med,formato:'gotas',estoque_unidade_medida:'ml',estoque_gotas_por_ml:20}),'gotas em ml com taxa explícita são suportadas');
const iso=m.retroDateTimeISO('2026-10-01','08:00');check(iso.endsWith('Z')&&!Number.isNaN(Date.parse(iso)),'instante local convertido para ISO para o histórico');
let future=false;try{m.retroDateTimeISO('2099-10-01','08:00')}catch{future=true}check(future,'não confirma futuro');
check(m.retroReviewHref('med/1','2026-10-01','counted').includes('stock_mode=counted'),'retorno contém modo de contagem explícita');
check(m.retroReviewHref('med/1','invalid','manual').includes('med%2F1'),'ID do medicamento codificado sem injetar URL');
const acquisition=fs.readFileSync(files[2],'utf8');
const repo=fs.readFileSync(files[4],'utf8');
const dose=fs.readFileSync(files[5],'utf8');
const view=fs.readFileSync(files[1],'utf8');

// R4: transpileModule validates syntax only; the TypeScript semantic checker
// prevents undeclared shorthand properties such as `quantidade` from escaping
// the directed test and surfacing late in tsc --noEmit.
const semanticProgram=ts.createProgram([files[1]],{
  noEmit:true,noResolve:true,strict:false,skipLibCheck:true,
  jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022,
  module:ts.ModuleKind.ESNext,
});
const scopeErrors=ts.getPreEmitDiagnostics(semanticProgram).filter(d=>
  d.file?.fileName.endsWith('revisao-retroativa/page.tsx') &&
  [18004,2304,2552].includes(d.code)
);
check(scopeErrors.length===0,'R4: TypeScript sem variáveis locais fora de escopo na página de revisão');
check(view.includes('quantidade: quantity, onlyIfPending: true'), 'R4: dose utiliza quantidade numérica validada, não identificador inexistente');

const details=fs.readFileSync(files[3],'utf8');
// V112: all visible date/time inputs use the existing accessible VAULT picker.
// Keep this assertion before the expensive full release suite.
check(view.includes('import { CustomDatePicker } from "@/components/DatePicker";'), 'revisão usa calendário VAULT em vez de input nativo');
check((view.match(/<CustomDatePicker\b/g) || []).length === 2, 'data inicial e final usam o mesmo calendário acessível');
check(view.includes('minDate={from}') && view.includes('maxDate={yesterday}'), 'limites de início/fim de período preservados');
check(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/gs.test(view), 'V112: sem campos nativos visíveis de data e hora');

for(const fragment of ['stock_mode','counted','Revisar doses','onlyIfPending: true','adjustStock: debit','requireRegisteredStock: debit','retroDateTimeISO','doseLogsRepository.setStatus','Confirmo que tomei cada dose selecionada','A pessoa ou conta foi alterada'])check(view.includes(fragment),`UI protege ${fragment}`);
check(view.includes('attestSchedule && (latestMed.tipo_uso === "temporario" || latestMed.status === "descontinuado")'),'rotina histórica revalidada antes de gravar');
check(!view.includes('setSelected(eligible.map('),'lote não auto-seleciona todas as doses');
check(view.includes('slot.status === "ignored"')&&view.includes('slot.status === "conflict"'),'situações especiais exigem correção individual');
check(view.includes('savedSnapshot.userId === user?.id')&&view.includes('savedSnapshot.personId === activePersonId'),'snapshot da UI isolado por conta e pessoa');
check(repo.includes('expectedCurrentStock')&&repo.includes('countedCurrentStock')&&repo.includes('getLocalTodayISO()'),'contagem atual transacional, com guard de concorrência e data de referência de hoje');
check(repo.includes('medicamentoAtualizado.estoque_quantidade = currentCount')&&repo.includes('medicamentoAtualizado.estoque_quantidade = (knownBalance'),'contagem e soma seguem caminhos distintos');
check(repo.includes('currentBalance')&&repo.includes('actual !== options.expectedCurrentStock'),'compare-and-set do estoque conferido');
check(acquisition.includes('isBackdatedAcquisition')&&acquisition.includes('useCurrentCount')&&acquisition.includes('retroReviewHref('),'link opcional oferecido só após aquisição retroativa');
check(acquisition.includes('countedCurrentStock:')&&acquisition.includes('initialStockQuantity:'),'form usa modos distintos de saldo');
check(details.includes('Revisar várias doses antigas'),'reabrir revisão sem duplicar aquisição');
check(fs.readFileSync(files[6],'utf8').includes('recebida(s) neste evento'),'quantidade historicamente recebida não é tratada como saldo atual');
check(dose.includes('onlyIfPending = false')&&dose.includes('adjustStock = true'),'reutiliza repositório canônico sem motor paralelo');
check(dose.includes('db.transaction(')&&dose.includes('enfileirarOperacao('),'dose e fila escrita em transação local');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
check(gate.includes('scripts/test-vault-m62-retro-batch.cjs'),'gate principal executará verificações M62');
console.log(`VAULT M62: ${passed} verificações de período, status, escopo, saldo, idempotência estrutural, UI e release aprovadas.`);
