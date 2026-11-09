#!/usr/bin/env node
"use strict";
/* M101 P2: prova hermética de contratos e normalização; não compila Kotlin nem lê dados do aparelho. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let count=0;
const check=(ok,label)=>{assert.ok(ok,`M101 P2: ${label}`);console.log(`OK ${++count}: ${label}`);};
const read=p=>fs.readFileSync(p,'utf8');
const load=(p,mocks={})=>{
 const source=read(p);
 const ast=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 check(ast.parseDiagnostics.length===0,`sintaxe TS ${p}`);
 const result=ts.transpileModule(source,{fileName:p,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 check(!(result.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error),`transpilação ${p}`);
 const mod=new Module(path.resolve(p),module);mod.filename=path.resolve(p);
 mod.require=id=>Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:require(id);
 mod._compile(result.outputText,mod.filename);
 return mod.exports;
};
const types=load('lib/health-profile/types.ts');
const metric=load('lib/health-profile/metrics.ts');
const connectTypes=load('lib/health-connect/types.ts');
check(connectTypes.CONNECT_METRICS.length===7,'exatamente 6 métricas antigas + passos');
check(new Set(connectTypes.CONNECT_METRICS).size===7,'tipos canônicos não duplicados');
check(connectTypes.CONNECT_METRICS.includes('passos') && connectTypes.CONNECT_METRICS.includes('caminhada'),'passos não substituem caminhada');
check(types.METRICS.passos.unit==='passos' && types.METRICS.passos.category==='habito','unidade separada de duração de caminhada');
metric.validateMetric('passos',1);metric.validateMetric('passos',11000);
for(const bad of [0,-1,1.5,NaN,Infinity,150001])assert.throws(()=>metric.validateMetric('passos',bad));
check(true,'passos são total inteiro, positivo e dentro do limite');
metric.validateMetric('pressao_arterial',120,80);metric.validateMetric('sono',480);metric.validateMetric('caminhada',45);
check(true,'métricas anteriores preservam validação');
const normalize=load('lib/health-connect/normalize.ts',{
  '@/lib/health-profile/types':{METRICS:types.METRICS},
  '@/lib/health-profile/metrics':metric,
  './types':{SAMSUNG_ORIGIN:connectTypes.SAMSUNG_ORIGIN}
}).normalizeConnectRecord;
const time=new Date(Date.now()-3600_000).toISOString();
const raw={id:'daily-2026-11-09',origin:connectTypes.SAMSUNG_ORIGIN,type:'passos',time,value:8423,dailyTotal:true};
const record=normalize(raw);
check(record.nome==='Passos · total diário' && record.valor_numerico===8423 && record.valor_medicao==='8423 passos','total diário com valor e unidade verdadeiros');
check(record.source_record_id.includes('passos:daily-') && record.categoria==='habito','identidade de origem e categoria preservadas');
check(record.duracao_minutos===undefined && record.inicio_em===null && record.fim_em===null,'passos não viram caminhada nem intervalo inventado');
check(record.observacoes.includes('sem identificação automática do aparelho'),'não atribui relógio/anel sem prova');
assert.throws(()=>normalize({...raw,origin:'outro.app'}));
assert.throws(()=>normalize({...raw,dailyTotal:false}));
assert.throws(()=>normalize({...raw,dailyTotal:undefined}));
assert.throws(()=>normalize({...raw,type:'caminhada'}));
assert.throws(()=>normalize({...raw,value:0}));
assert.throws(()=>normalize({...raw,value:1.2}));
assert.throws(()=>normalize({...raw,time:new Date(Date.now()+3600_000).toISOString()}));
check(true,'origem, tipo, total explícito, valor e tempo inválidos rejeitados');
const kotlin=read('native/health-connect/VaultHealthConnectPlugin.kt');
check(kotlin.includes('"passos" to StepsRecord::class') && kotlin.includes('if("passos" in allowed)'), 'Kotlin expõe novo tipo somente se autorizado');
check(kotlin.includes('StepsRecord.COUNT_TOTAL') && kotlin.includes('hc.aggregate('),'Android usa agregação, não soma de registros');
check(kotlin.includes('dataOriginFilter = setOf(DataOrigin(origin))') && kotlin.includes('"com.sec.android.app.shealth"'),'leitura filtra origem Samsung');
check(kotlin.includes('total != null && total > 0L') && kotlin.includes('"dailyTotal",true'),'nenhum registro/zero sintético para dia sem leitura');
check(!/insertRecords\(|updateRecords\(|deleteRecords\(/.test(kotlin),'sem escrita em Health Connect');
check(kotlin.includes('"sono" to SleepSessionRecord::class') && kotlin.includes('"frequencia_cardiaca" to HeartRateRecord::class'),'tipos legados mantidos');
const android=read('scripts/patch-android-health-connect-v113.mjs');
check(android.includes('"READ_STEPS"') && !android.includes('"WRITE_STEPS"'),'manifest nativo solicita só leitura de passos');
const v113=read('scripts/test-v113-health-connect.mjs');
check(v113.includes('.length,7)') && v113.includes('READ_STEPS'),'V113 exige sete permissões em vez de relaxar teste');
check(read('native/health-connect/PermissionsRationaleActivity.kt').includes('total diário de passos'),'rationale Android reflete acesso real');
check(!read('lib/health-connect/evidence-m100.ts').includes('["Passos", "HRV"'),'aviso legado deixa de classificar passos como indisponível');
check(read('lib/health-connect/evidence-m100.ts').includes('"HRV"'),'HRV continua explicitamente indisponível');
check(read('lib/health-profile/dashboard-index.ts').includes('"caminhada", "passos"'),'passos entram na projeção da Minha Saúde');
check(read('lib/health-records.ts').includes('tipo: "passos"'),'identidade de hábito registrada no catálogo');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.includes('"scripts/test-vault-m101-p2-native-steps.cjs"')&&gate.includes('"scripts/test-vault-m101-p1-connect-coverage.cjs"'),'M101 P2 integra gate mantendo P1');
check(read('components/saude/HealthConnectPanel.tsx').includes('Passos são totais diários'),'interface comunica total diário e ausência de dados');
console.log(`M101 P2: ${count} garantias aprovadas; compilar APK e testar Health Connect físico permanecem obrigatórios.`);
