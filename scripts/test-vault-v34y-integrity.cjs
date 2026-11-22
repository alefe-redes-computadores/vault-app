#!/usr/bin/env node
'use strict';
/** Gate V34Y: parsing TypeScript dos arquivos tocados + contratos funcionais
 * em módulos puros. Não é homologação Android nem teste de integração Supabase.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(path.resolve(p),'utf8');
const list=[
 'app/page.tsx','app/saude/careflow/page.tsx','app/saude/careflow/pressao/page.tsx',
 'app/saude/careflow/sintomas/page.tsx','app/saude/careflow/dossie/page.tsx',
 'app/saude/careflow/exames/page.tsx','app/saude/careflow/modo-medico/page.tsx',
 'app/saude/medicamentos/page.tsx','app/saude/medicamentos/detalhes/page.tsx',
 'components/saude/HealthTimePicker.tsx','components/saude/HealthRelationPicker.tsx',
 'components/saude/MedicationCareNetworkDetails.tsx',
 'components/saude/CareFlowRelationsR5.tsx',
 'components/saude/MedicationPrescriptionCard.tsx',
 'components/saude/MedicationJourneySummary.tsx',
 'components/list/ListCard.tsx','components/updates/VaultUpdateCenter.tsx',
 'hooks/useMedicationRegulatoryProfiles.ts','lib/health-intelligence/medication-care-opportunities.ts',
 'lib/m3/medical-pdf-p3.ts','lib/m3/brain-return-d3.ts'
];
const checks=[];
const failures=[];
function check(name,fn){
 try { fn(); checks.push(name); console.log('OK V34Y: '+name); }
 catch (err){
   const code=err && err.code ? String(err.code) : 'ERROR';
   failures.push({name,code});
   console.error('V34Y_CONTRATO_FALHOU | '+name+' | '+code);
 }
}
check('TypeScript parse real - 21 fontes modificadas',()=>{
 const failures=[];
 for(const p of list){const file=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   for(const e of file.parseDiagnostics){const lc=file.getLineAndCharacterOfPosition(e.start??0);failures.push(`${p}:${lc.line+1}: ${ts.flattenDiagnosticMessageText(e.messageText,' ')}`)}
 }
 assert.deepEqual(failures,[],'erros de sintaxe:\n'+failures.join('\n'));
});
const med=read('app/saude/medicamentos/page.tsx');
const home=read('app/page.tsx');
const symptoms=read('app/saude/careflow/sintomas/page.tsx');
const medical=read('app/saude/careflow/modo-medico/page.tsx');
const time=read('components/saude/HealthTimePicker.tsx');
const relation=read('components/saude/HealthRelationPicker.tsx');
const pressure=read('app/saude/careflow/pressao/page.tsx');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
check('Gaveta 360: nome e seta preservados; alvo separado e menu independente',()=>{
 assert.match(med,/data-vault-med360-entry="name"/);assert.match(med,/data-vault-med360-entry="menu"/);
 assert.match(med,/data-vault-v34x-title-hitbox/);assert.match(med,/w-fit max-w-full flex-none/);
 assert.match(med,/navigationLabel=\{`Ver detalhes de \$\{med\.nome\}`\}/);
 assert.match(med,/router\.push\(\s*`\/saude\/medicamentos\/detalhes\?id=/);
});
check('Ingrediente e receita: dados canônicos fora do alvo da Gaveta',()=>{
 assert.match(med,/kind === "active_ingredient"/);
 assert.match(med,/data-vault-v34x-receita-cadastro/);
 assert.match(med,/data-vault-v34x-receita-documento/);
 assert.match(med,/data-vault-r5-active-ingredient/);
 assert.match(detail,/data-vault-v34x-ingredient-visible/);
 assert.match(detail,/prescriptionDeclared=\{Boolean\(med\.data_receita\)\}/);
});
check('Relações: médico azul, sintoma rosa, local verde, IDs no seletor canônico',()=>{
 assert.match(relation,/kind === "doctor" \? "text-sky-300"/);
 assert.match(relation,/kind === "symptom" \? "text-rose-300"/);
 assert.match(relation,/kind === "place" \? "text-emerald-300"/);
 assert.match(relation,/kind==="doctor"\?"border-sky-400\/25 bg-sky-400\/10"/);
 assert.match(relation,/kind==="place"\?"border-emerald-400\/25 bg-emerald-400\/10"/);
 assert.match(relation,/onValueChange\(item\.id\)/);
 assert.doesNotMatch(relation,/kind === "doctor" \? "text-violet-300"/);
});
check('Horário: toda tecla atualiza estado do formulário; normalizador único no commit',()=>{
 assert.match(time,/resolveMedicationTimeDraftM4P2/);
 assert.match(time,/setDraft\(next\);onChange\(next\)/);
 assert.match(time,/className="grid size-11 shrink-0/);
 assert.match(time,/onBlur=\{commit\}/);
 assert.match(time,/onKeyDown=\{event=>\{if\(event\.key==="Enter"\)event\.currentTarget\.blur\(\);\}\}/);
});
check('Pressão: um formulário e labels data/hora alinhados',()=>{
 assert.match(pressure,/activeForm/);
 assert.doesNotMatch(pressure,/setShowPlanForm|setShowReadingForm/);
 assert.match(pressure,/\[&_input\]:h-12/);assert.match(pressure,/mb-1\.5 block/);
 assert.match(pressure,/\? "reading" : q\.get\("plano"\) === "1" \? "plan" : null/);
});
check('Sintomas: toast após persistência, reação a falha, vínculo recuperável fora do editor',()=>{
 assert(symptoms.indexOf("showSuccess('Sintoma salvo neste aparelho.')")>symptoms.indexOf('const recordId=await createRegistro('));
 assert.match(symptoms,/submitLock\.current/);assert.match(symptoms,/showError\(explanation\)/);
 assert.match(symptoms,/!composeOpen && pendingLink/);
 assert.match(symptoms,/consultBySymptom/);
 assert.match(symptoms,/setComposeOpen\(false\)/);
});
check('Sintomas: pendência não duplica registro nem cruza troca de pessoa',()=>{
 assert.match(symptoms,/submitLock\.current\|\|pendingLink/);
 assert.match(symptoms,/pendingLink\.userId!==user\?\.id/);
 assert.match(symptoms,/pendingLink\.personId!==activePersonId/);
 assert.match(symptoms,/disabled=\{busy\|\|!activePersonId\|\|Boolean\(pendingLink\)\}/);
});
check('Home: navegação por IDs e opção de relacionar sem inventar vínculo',()=>{
 assert.match(home,/primaryMedicationCareOpportunity\.treatmentHref!/);
 assert.match(home,/!primaryMedicationCareOpportunity\.treatmentHref && primaryMedicationCareOpportunity\.medicamentoId/);
 assert.match(home,/Relacionar tratamento/);assert.match(home,/encodeURIComponent\(primaryMedicationCareOpportunity\.medicamentoId\)/);assert.match(home,/return_to=\$\{encodeURIComponent/);
 assert.match(home,/<FolderHeart size=\{18\}/);
 assert.doesNotMatch(home,/className="vault-deferred-lg space-y-3"/);
});
check('Rede do medicamento: médico sem ID aponta editor existente',()=>{
 const nw=read('components/saude/MedicationCareNetworkDetails.tsx');
 assert.match(nw,/medicationId\?: string/);assert.match(nw,/doctor\.id \? action/);
 assert.match(nw,/Relacionar médico no cadastro do medicamento/);
 assert.match(detail,/medicationId=\{med\.id\}/);
});
check('Mode Médico: datas civis e ícones sem URLs inferidas',()=>{
 assert.match(medical,/humanClinicalTextV34X\(row\.detail\)/);
 assert.match(medical,/humanClinicalTextV34X\(link\)/);
 assert.match(medical,/<RelIcon size=\{14\}/);
 assert.match(medical,/Abrir registro de origem/);
});
check('Exames: vínculos reais, alvos de 44px e não outro escritor',()=>{
 const exams=read('app/saude/careflow/exames/page.tsx');const rel=read('components/saude/CareFlowRelationsR5.tsx');
 assert.match(exams,/createExamOrderM1/);assert.match(exams,/<CareFlowOrderRelationsR5/);
 assert.match(rel,/min-h-11 max-w-full/);assert.match(rel,/doctorId=ownId/);
});
check('Central Update 360 original intacta, changelog, release, Actions, expiração e build',()=>{
 const u=read('components/updates/VaultUpdateCenter.tsx');
 for(const q of ['Release certificada','Execução do GitHub Actions','Cópia temporária para testes','Verificado em:','O que mudou nesta atualização','state.installedBuild','checkedLabel','releaseRunGap']) assert(u.includes(q),q);
 assert(!u.includes('aria-label="Informações da atualização"'),'painéis da V34X não foram duplicados');
});
check('Arquitetura: gate incorpora V34, V34X, V34Y; sem modificar A8',()=>{
 const gate=read('scripts/test-v63-release-gate.mjs');
 for(const q of ['scripts/test-vault-v34-closeout.cjs','scripts/test-vault-v34x-substituta.cjs','scripts/test-vault-v34y-integrity.cjs','scripts/test-vault-a8-vaccination-360.cjs'])assert(gate.includes(q),q);
});
function loadPure(file){const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(path.resolve(file),module);m.filename=path.resolve(file);m.paths=Module._nodeModulePaths(path.dirname(m.filename));m._compile(code,m.filename);return m.exports}
check('Parser clínico de hora: conversão e horários inválidos, sem inferência',()=>{
 const {resolveMedicationTimeDraftM4P2:parse}=loadPure('lib/medications/time-draft-m4p2.ts');
 for(const [draft,expected] of [['1500','15:00'],['15:00','15:00'],['9:30','09:30'],['930','09:30'],['0','00:00'],['23:59','23:59'],['24:00',null],['99:99',null],['9:69',null]])assert.equal(parse(draft),expected,draft);
});
check('Curso temporário: fim civil da nota canônica, sem alterar DoseLogs',()=>{
 const {parseTemporaryCourseNote,temporaryCourseEnd}=loadPure('lib/health-supply/temporary-course.ts');
 const done=parseTemporaryCourseNote('Tratamento temporário · 2026-11-15 · 3 dia(s)');
 const current=parseTemporaryCourseNote('Tratamento temporário · 2026-11-22 · 3 dia(s)');
 assert(done);assert(current);
 assert.equal(temporaryCourseEnd({...done,times:['08:00']}),'2026-11-17');
 assert.equal(temporaryCourseEnd({...current,times:['08:00']}),'2026-11-24');
 assert.equal(parseTemporaryCourseNote('OTOCIRIAX no ouvido'),null);
});
check('M12: quatro rotas permanecem consultáveis num acordeão recolhido mesmo em jornada vazia',()=>{
 const journey=read('components/saude/MedicationJourneySummary.tsx');
 assert.match(journey,/prescriptionDeclared && !recorded\.length/);
 assert.match(journey,/\{remaining\.length>0 \? <details/);
 assert.doesNotMatch(journey,/remaining\.length>0 && recorded\.length>0/);
 assert.match(journey,/Outras etapas · \{remaining\.length\}/);
 assert.match(journey,/Nenhum evento registrado/);
 assert.match(journey,/icon: FileText, tone: "text-sky-300"/);
});
check('Integridade da versão funcional: app-version e package são consistentes',()=>{
 const v=JSON.parse(read('package.json')).version;
 assert(read('lib/app-version.ts').includes(`"${v}"`));
 assert.match(read('README.md'),/versionCode/);
});
if(failures.length){
 console.error(`V34Y_CONTRATOS_BLOQUEADOS | ${failures.length}/${checks.length+failures.length} falharam | ${failures.map(item=>item.name).join('; ')}`);
 process.exitCode=1;
}else{
 console.log(`V34Y_DIRIGIDOS_OK | ${checks.length}/${checks.length} verificações (sintaxe+regressão+domínio). Não substituem V63/V70/TS/APK.`);
}
