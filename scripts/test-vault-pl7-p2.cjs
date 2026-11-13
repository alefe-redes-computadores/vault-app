#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let n=0;
const ok=(value,label)=>{assert.ok(value,`PL7-P2: ${label}`);console.log(`✓ PL7-P2 ${++n}: ${label}`);};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const newFiles=[
 'lib/health-intelligence/pharmalens-observation-v7.ts',
 'lib/health-intelligence/pharmalens-brief-v7.ts',
 'components/saude/PharmaLensMedicationEntryV7.tsx',
 'components/saude/PharmaLensObservationPanelV7.tsx',
 'components/saude/PharmaLensWorkspaceV7.tsx',
 'app/saude/pharmalens/page.tsx',
];
for(const p of newFiles){const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,`${p}: sintaxe TS/TSX`);}
for(const p of ['app/saude/minha-saude/page.tsx','app/saude/medicamentos/detalhes/page.tsx']){
 const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(!parsed.parseDiagnostics.length,`${p}: sintaxe TSX preservada`);
}
const load=p=>{
 const raw=read(p);const compiled=ts.transpileModule(raw,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length||0,0,`${p}: falha de transpile`);
 const m=new Module(p,module);m.filename=path.join(root,p);m.paths=module.paths;m._compile(compiled.outputText,m.filename);return m.exports;
};
const {buildPharmaLensObservationsV7}=load('lib/health-intelligence/pharmalens-observation-v7.ts');
const {makePharmaLensConsultationBriefV7}=load('lib/health-intelligence/pharmalens-brief-v7.ts');
const base={
 userId:'owner',personId:'p1',medicationId:'med',rangeDays:30,todayISO:'2026-11-13',
 report:{medicationId:'med',cycles:[
 {acquisitionId:'a-old',manufacturer:'Lab A',startedAt:'2026-10-25',acquiredAt:'2026-10-22',issues:[],checkIns:[],perceivedChange:'same'},
 {acquisitionId:'a-new',manufacturer:'Lab B',startedAt:'2026-11-05',acquiredAt:'2026-11-04',issues:[],checkIns:[{day:1}],perceivedChange:'better'},
 {acquisitionId:'a-missing',manufacturer:'Lab C',startedAt:null,acquiredAt:'2026-11-10',issues:['inicio_uso_nao_confirmado'],checkIns:[],perceivedChange:null},
 ]},
 medications:[{id:'med',user_id:'owner',person_id:'p1',tipo_uso:'continuo'},{id:'other',user_id:'owner',person_id:'p1',tipo_uso:'continuo'},{id:'extra',user_id:'owner',person_id:'p1',tipo_uso:'esporadico'}],
 doseLogs:[
 {id:'1',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-11-06',tomado_em:'2026-11-06T08:00:00Z',dose_kind:'scheduled'},
 {id:'1',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-11-06',tomado_em:'2026-11-06T08:00:00Z',dose_kind:'scheduled'},
 {id:'2',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-11-06',tomado_em:'2026-11-06T23:00:00Z',dose_kind:'sos'},
 {id:'3',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-11-07',ignorado_em:'2026-11-07T08:00:00Z',motivo:'sem_estoque'},
 {id:'4',user_id:'owner',person_id:'p1',medicamento_id:'other',data:'2026-11-07',ignorado_em:'2026-11-07T08:00:00Z',motivo:'sem_estoque'},
 {id:'5',user_id:'owner',person_id:'p1',medicamento_id:'other',data:'2026-11-08',ignorado_em:'2026-11-08T08:00:00Z',motivo:'outro'},
 {id:'6',user_id:'owner',person_id:'p1',medicamento_id:'extra',data:'2026-11-08',ignorado_em:'2026-11-08T08:00:00Z',motivo:'sem_estoque'},
 {id:'7',user_id:'owner',person_id:'p2',medicamento_id:'other',data:'2026-11-09',ignorado_em:'2026-11-09T08:00:00Z',motivo:'sem_estoque'},
 {id:'8',user_id:'intruder',person_id:'p1',medicamento_id:'med',data:'2026-11-09',tomado_em:'2026-11-09T08:00:00Z'},
 {id:'9',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-10-26',tomado_em:'2026-10-26T08:00:00Z'},
 {id:'10',user_id:'owner',person_id:'p1',medicamento_id:'med',data:'2026-11-11'},
 ],
 healthRecords:[
 {id:'h1',user_id:'owner',person_id:'p1',data:'2026-11-07',tipo:'sono',source:'health_connect'},
 {id:'h2',user_id:'owner',person_id:'p1',data:'2026-11-07',tipo:'frequencia_cardiaca',source:'health_connect'},
 {id:'h3',user_id:'owner',person_id:'p2',data:'2026-11-07',tipo:'sono',source:'health_connect'},
 {id:'h4',user_id:'owner',person_id:'p1',data:'2026-11-08',tipo:'frequencia_cardiaca',source:'manual'},
 ]
};
const rows=buildPharmaLensObservationsV7(base);
ok(rows.entries.length===3,'ciclos da aquisição preservados');
const old=rows.entries[0], b=rows.entries[1], missing=rows.entries[2];
ok(old.through==='2026-11-04'&&b.from==='2026-11-05','trocas com início declarado não contam dias duplos');
ok(b.takenScheduled===1 && b.takenRescue===1 && b.explicitlyIgnored===1,'doses tomadas, SOS e ignoradas estritamente distintas, sem duplicata');
ok(b.concomitantIgnoredDays===2 && b.confirmedOtherStockGapDays===1,'confounder de outro medicamento contínuo somente com motivo registrado');
ok(b.healthRecordDays===2 && b.healthConnectRecordDays===2 && b.sleepRecordDays===1 && b.heartRateRecordDays===2,'saúde e Health Connect descritos sem atribuir causalidade');
ok(missing.observedDays===0 && missing.missingStart,'aquisição sem início não recebe evidências por suposição');
ok(!b.limitations.some(x=>x.includes('pico plasmático')),'não inventa janela de pico plasmático');
const week=buildPharmaLensObservationsV7({...base,rangeDays:7});
ok(week.entries[0].observedDays===0 && week.entries[1].from==='2026-11-07','janela 7 dias trunca apenas os períodos observados');
const overlap=buildPharmaLensObservationsV7({...base,report:{...base.report,cycles:[...base.report.cycles,{acquisitionId:'same-day',manufacturer:'Lab D',startedAt:'2026-11-05',acquiredAt:'2026-11-05',issues:[],checkIns:[]}]}});
ok(overlap.entries[1].observedDays===0&&overlap.entries[3].observedDays===0,'ambiguidade de início simultâneo impede associação indevida');
const invalid=buildPharmaLensObservationsV7({...base,userId:'',report:base.report});
ok(invalid.entries.length===0,'sem conta autoritativa não há relatório');
const brief=makePharmaLensConsultationBriefV7({medicationName:'Medicamento de teste',report:base.report,observations:rows,generatedOn:base.todayISO});
ok(brief.includes('melhora percebida')&&brief.includes('não demonstram melhor eficácia')&&brief.includes('Não alterar dose'),'relatório clínico descritivo sem promessa de eficácia');
ok(!brief.includes('2026-11-09T08:00:00Z'),'não expõe registros privados nem logs crus');
const d=read('app/saude/medicamentos/detalhes/page.tsx'),f=read('app/saude/minha-saude/page.tsx');
ok(d.includes('PharmaLensMedicationEntryV7')&&d.includes('id="pharmalens-v7"')&&d.includes('activePersonId === med.person_id'),'integração escopada na tela de detalhes');
ok(f.includes('VAULT_PL7_P2_FENIX_LINK')&&f.includes("goFromHealth('/saude/pharmalens')"),'Fênix abre PharmaLens pelo fluxo real de navegação');
const route=read('app/saude/pharmalens/page.tsx'),workspace=read('components/saude/PharmaLensWorkspaceV7.tsx');
ok(route.includes('<Suspense')&&route.includes('<PharmaLensWorkspaceV7'),'rota usa Suspense por SearchParams');
ok(workspace.includes("'[user_id+person_id+data]'")&&workspace.includes("'[user_id+person_id]'"),'Dexie lê índices por conta e pessoa');
ok(workspace.includes('navigator.clipboard.writeText(brief)')&&workspace.includes('readOnly')&&workspace.includes('aria-pressed'),'resumo privado e UX acessível');
ok(!/\.put\(|\.add\(|\.delete\(|\.update\(|\.bulkPut\(|supabase\.from\(/.test(workspace),'PharmaLens só observa os dados, sem mutações');
const p1=read('lib/health-intelligence/pharmalens-v7.ts');
ok(p1.includes('buildPharmaLensReportV7')&&p1.includes('observacional_sem_causalidade'),'motor PL7-P1 canônico disponível');
console.log(`PL7-P2: ${n} gates de integração, privacidade, fronteiras, dados e UX aprovados.`);
