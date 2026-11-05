#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const touched=[
 'lib/health-intelligence/hydration-reference.ts','lib/health-intelligence/hydration-insights.ts',
 'lib/health-intelligence/treatment-link-review.ts','lib/health-reminders/interval-plan.ts',
 'lib/health-intelligence/context.ts','lib/health-insights.ts','components/saude/HydrationPanel.tsx',
 'app/saude/lembretes/page.tsx','app/page.tsx','components/health-intelligence/VaultBrainCommand.tsx',
 'lib/health-intelligence/vault-brain-commands.ts','app/saude/tratamentos/page.tsx',
 'lib/treatment-detail-relations.ts','app/saude/tratamentos/detalhes/page.tsx'
];
let count=0;
const ok=(v,msg)=>{assert.ok(v,msg);count++;console.log('✓ M70 '+msg)};
for(const file of touched){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,'TS/TSX syntax '+file);
}
function load(file,stubs={}){
 const filename=path.join(root,file),code=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
 m.require=id=>{if(Object.hasOwn(stubs,id))return stubs[id];throw Error('M70 unexpected import '+id+' in '+file)};
 m._compile(code,filename);return m.exports;
}
const interval=load('lib/health-reminders/interval-plan.ts');
const plan=interval.expandReminderInterval('09:00','21:00',3);
ok(plan.join(',')==='09:00,12:00,15:00,18:00,21:00','9–21 every 3 hours is exactly five slots');
for(const args of [['22:00','07:00',3],['09:00','21:00',0],['09:00','21:00',7],['10:00','10:00',1]])assert.throws(()=>interval.expandReminderInterval(...args));
ok(true,'invalid interval and overnight windows are rejected');
const reference=load('lib/health-intelligence/hydration-reference.ts');
const estimate=reference.estimateHydrationReference(70,175);
ok(estimate?.middleMl===2100&&estimate?.lowerMl===1750&&estimate?.upperMl===2450&&estimate?.heightCm===175,'weight reference is approximate and bounded; height contextual');
ok(reference.estimateHydrationReference(null)===null&&reference.estimateHydrationReference(8)===null,'missing/implausible weight does not produce a target');
const records=['2026-11-02','2026-11-03','2026-11-04'].map(data=>({data,tipo:'agua',valor_numerico:700,unidade_medida:'ml'}));
let pattern=reference.hydrationRecordedPattern(records,'2026-11-05',2100);
ok(pattern.dayCount===3&&pattern.averageMl===700&&pattern.level==='very_low','low registered volumes produce observational level');
pattern=reference.hydrationRecordedPattern(records.slice(0,2),'2026-11-05',2100);
ok(pattern.level==='insufficient','two recorded days do not imply insufficient intake');
pattern=reference.hydrationRecordedPattern(records,'2026-11-05',0);
ok(pattern.level==='insufficient','unknown reference never infers intake');
const treatment=load('lib/health-intelligence/treatment-link-review.ts');
const tt={id:'t',user_id:'u',person_id:'p',cid_ids:['c1'],medicamento_ids:['legacy']};
const med=(id,more={})=>({id,nome:id,user_id:'u',person_id:'p',tratamento_ids:[],cid_ids:[],...more});
const checked=treatment.inspectTreatmentMedicationLinks(tt,[med('confirmed',{tratamento_ids:['t']}),med('legacy'),med('candidate',{cid_ids:['c1']}),med('foreign',{user_id:'other',tratamento_ids:['t'],cid_ids:['c1']}),med('person',{person_id:'other',cid_ids:['c1']})]);
ok(checked.confirmed.length===1&&checked.reverseLegacy.length===1&&checked.cidCandidates.length===1,'forward, reverse and CID links have separate authority');
ok(!checked.confirmed.concat(checked.reverseLegacy,checked.cidCandidates).some(x=>x.id==='foreign'||x.id==='person'),'different owner and person never leak into suggestions');
const hydration=load('lib/health-intelligence/hydration-insights.ts',{'@/lib/health-intelligence/hydration-reference':reference});
const insights=hydration.buildHydrationInsights(records,'2026-11-05',{goalMl:2100,reference:estimate});
ok(insights.some(x=>x.id.includes('hidratacao-referencia')&&x.evidencias.some(e=>e.includes('3/7 dias'))),'Brain emits evidence and coverage for 3-day pattern');
ok(insights.every(x=>!(/\bvoce esta desidratado\b/i.test(x.mensagem))),'Brain never declares dehydration from missing or sparse records');
ok(hydration.buildHydrationInsights([],'2026-11-05',{goalMl:2100,reference:estimate}).length===0,'no water record means no consumption verdict');
const search=read('lib/health-intelligence/vault-brain-commands.ts');
const component=read('components/health-intelligence/VaultBrainCommand.tsx');
ok(search.includes('credentials = owned(')&&search.includes('bankCards = owned(')&&search.includes('vaults = owned('),'private records are restricted to owner/person');
ok(!search.includes('password_encrypted')&&!search.includes('card_number_encrypted')&&!search.includes('cvv_encrypted')&&!search.includes('decryptPassword'),'search never indexes secrets');
ok(component.includes('useLiveQuery')&&component.includes('if (!open || !data.userId || !data.personId) return null'),'Personal search only queries while open');
ok(component.includes('credentials: privateReady ?')&&component.includes('bankCards: privateReady ?')&&component.includes('vaults: privateReady ?'),'Search passes only owner-scoped metadata');
ok(read('components/health-intelligence/VaultBrainCommand.tsx').includes('Financeiro')&&read('components/health-intelligence/VaultBrainCommand.tsx').includes('Saúde'),'results show section labels');
const reminders=read('app/saude/lembretes/page.tsx');
ok(reminders.includes('expandReminderInterval(time, endTime, intervalHours)')&&reminders.includes('await createReminders(times.map(at => ({ ...data, time: at })))'),'every interval slot is an ordinary synchronized reminder');
ok(read('lib/health-reminders/scheduler.ts').includes('MAX_PENDING = 60')&&read('lib/health-reminders/scheduler.ts').includes('reconcileVaultNotificationSet'),'native notification cap and canonical reconciliation remain');
ok(read('app/saude/tratamentos/detalhes/page.tsx').includes('possibleMedications.map(') && read('lib/treatment-detail-relations.ts').includes('possibleMedications'),'treatment detail offers explicit review rather than automatic association');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m69-premium-closure.cjs')&&gate.includes('scripts/test-vault-m70-video-functional-360.cjs'),'M69 and M70 are both in permanent release gate');
console.log(`VAULT M70: ${count} functional and structural assertions passed`);
