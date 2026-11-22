const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const pressure=read('app/saude/careflow/pressao/page.tsx');
const symptoms=read('app/saude/careflow/sintomas/page.tsx');
const returnProjection=read('lib/m3/brain-return-d3.ts');
const dossier=read('app/saude/careflow/dossie/page.tsx');
const medicines=read('app/saude/medicamentos/page.tsx');
const time=read('components/saude/HealthTimePicker.tsx');
const m17=read('scripts/test-vault-m17-today-dose-performance.cjs');
const checks=[
 ['pressão usa uma autoridade visual',()=>{assert.match(pressure,/activeForm.*"plan" \| "reading" \| null/);assert.doesNotMatch(pressure,/setShowPlanForm|setShowReadingForm/)}],
 ['query conflitante escolhe medição',()=>assert.match(pressure,/q\.get\("novo"\).*\|\| q\.has\("consulta"\) \? "reading" : q\.get\("plano"\)/)],
 ['sintoma tem trava síncrona',()=>assert.match(symptoms,/submitLock\.current/)],
 ['sintoma preserva vínculos',()=>{assert.doesNotMatch(symptoms,/setNote\(''\);setMedication\(''\);setConsultation\(''\)/);assert.match(symptoms,/setNote\(''\);dateEdited/)}],
 ['retorno humaniza origem',()=>{assert.match(returnProjection,/health_record:'Registro de saúde'/);assert.match(returnProjection,/source:humanReturnSourceD3/)}],
 ['dossiê tem CTA esmeralda',()=>{assert.match(dossier,/bg-emerald-300 px-3 font-semibold/);assert.doesNotMatch(dossier,/text-violet|bg-violet|border-violet/)}],
 ['controles tocados têm 44px',()=>{assert.doesNotMatch(dossier,/min-h-10/);assert.match(medicines,/sticky top-20/)}],
 ['horário reutiliza parser canônico',()=>assert.match(time,/resolveMedicationTimeDraftM4P2\(raw\)/)],
 ['M17 agrupa alternativas',()=>assert.match(m17,/&& \(p15\.includes\('scope=.*\|\| p15\.includes\('scope=/)],
];
for(const [name,run] of checks){run();console.log(`✓ ${name}`)}
console.log(`VAULT V34 FECHAMENTO: ${checks.length} contratos específicos OK`);
