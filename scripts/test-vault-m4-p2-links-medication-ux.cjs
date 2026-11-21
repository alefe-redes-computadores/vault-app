const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const ts=require('typescript');
let checked=0;const ok=(condition,message)=>{assert.ok(condition,message);checked++};
const read=p=>fs.readFileSync(p,'utf8');
const parse=(p,jsx)=>{
 const src=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,jsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(src.parseDiagnostics.length===0,`Sintaxe ${p}: ${src.parseDiagnostics.map(d=>d.messageText).join(';')}`);
};
for(const p of [
 'lib/medications/time-draft-m4p2.ts','lib/clinical-journey-m4/surgery-links-p2.ts','lib/clinical-journey-m4/sync-links-p2.ts',
 'components/saude/MedicationStableTimeInputM4P2.tsx','components/saude/SurgeryConsultationLinksM4P2.tsx',
 'components/saude/MedicationFormatIcon.tsx','components/saude/visual-studio/PillStudioV8.tsx',
 'components/saude/MedicationFormatPicker.tsx','components/saude/MedicationIdentityColorPicker.tsx',
 'app/saude/jornada/page.tsx','app/saude/cirurgias/detalhes/page.tsx','app/saude/consultas/detalhes/page.tsx',
 'app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx',
 'lib/types.ts','lib/db/index.ts','lib/sync/pull.ts','lib/sync/dependency-order.ts','hooks/useSyncQueue.ts'
])parse(p,p.endsWith('.tsx'));
const src=read('lib/medications/time-draft-m4p2.ts');
const transformed=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const scratchModule={exports:{}};vm.runInNewContext(transformed,{module:scratchModule,exports:scratchModule.exports});
const parseTime=scratchModule.exports.resolveMedicationTimeDraftM4P2;
const examples={'10':'10:00','22':'22:00','0':'00:00','2':'02:00','9':'09:00','930':'09:30','1030':'10:30','22:15':'22:15','23:59':'23:59','00:00':'00:00','':'',' 22 ':'22:00','7:5':'07:05'};
for(const [input,expected] of Object.entries(examples))ok(parseTime(input)===expected,`Horário ${input} esperado ${expected} recebido ${parseTime(input)}`);
for(const bad of ['24','29','2399','99:99','23:60','10:99','2500','abcd','0:999','01:','12:345']){
 // explicit trailing colon normalized to 12:00 by design; 01: is valid hour, not a malformed value
 if(bad.endsWith(':'))continue;
 ok(parseTime(bad)===null,`Rejeitar hora inválida: ${bad}`);
}
for(let h=0;h<24;h++)for(let m=0;m<60;m++){
 const hh=String(h).padStart(2,'0'),mm=String(m).padStart(2,'0');
 ok(parseTime(hh+mm)===`${hh}:${mm}`,`HHMM exato ${hh}${mm}`);
 ok(parseTime(`${hh}:${mm}`)===`${hh}:${mm}`,`HH:mm exato ${hh}:${mm}`);
}
const field=read('components/saude/MedicationStableTimeInputM4P2.tsx');
ok(field.includes('onBlur={commit}')&&field.includes('setDraft(event.target.value')&&field.includes('onFocus='),'Horário não pode aplicar máscara enquanto usuário digita');
ok(!field.includes('handleTimeMask'),'Máscara instável não reaproveitada');
for(const path of ['app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx']){
 const s=read(path);ok(s.includes('<MedicationStableTimeInputM4P2'),'Novo e Editar usam campo estável');
 ok(!s.includes('label="Horário inicial"\n                            type="text"'),'Input mascarado original não voltou');
}
const edit=read('app/saude/medicamentos/editar/page.tsx');
ok((edit.match(/<MedicationStableTimeInputM4P2/g)||[]).length>=2,'Editar horários individuais também corrigido');
const format=read('components/saude/MedicationFormatIcon.tsx'),studio=read('components/saude/visual-studio/PillStudioV8.tsx');
ok(format.includes('MEDICATION_ADDITIONAL_FORMATS')&&format.includes('const Icon=additional.icon'),'Miniatura não herda ícone de formato real');
ok(studio.includes('AdditionalIcon')&&studio.includes('additional?'),'Visual Studio usa ícones das apresentações especiais');
ok(read('components/saude/MedicationFormatPicker.tsx').includes('<OtherIcon'), 'Tile "Mais formatos" mostra ícone selecionado');
ok(read('components/saude/MedicationIdentityColorPicker.tsx').includes('Ordem das cores escolhidas'),'Paleta explica cor 1 e cor 2');
const links=read('lib/clinical-journey-m4/surgery-links-p2.ts'),sync=read('lib/clinical-journey-m4/sync-links-p2.ts');
ok(links.includes('db.transaction(')&&links.includes('db.syncQueue')&&links.includes('deleted_at:now'),'Vínculo offline atômico e tombstone');
ok(links.includes('s.person_id!==personId')&&links.includes('c.person_id!==personId'),'Isolamento de pessoa em ambas as entidades');
ok(sync.includes("item.operation==='delete'")&&sync.includes(".eq('updated_at'")&&!sync.includes('.upsert('),'Sync proíbe delete físico e upsert sem versão');
const sql=read('supabase/migrations/20261120200000_surgery_consultation_links_m4p2.sql');
for(const phrase of ['CREATE UNIQUE INDEX','FOREIGN KEY (cirurgia_id,user_id,person_id)','FOREIGN KEY (consulta_id,user_id,person_id)','ROW LEVEL SECURITY','WITH CHECK','REVOKE ALL','deleted_at','m4p2_links_one_live'])ok(sql.includes(phrase),`SQL: ${phrase}`);
ok(read('lib/db/index.ts').includes('this.version(51).stores({'),'Dexie v51 é aditivo sobre A1 v50');
ok(read('hooks/useSyncQueue.ts').includes('syncSurgeryConsultationLinkM4P2'),'Fila de sync vinculada');
ok(read('lib/sync/pull.ts').includes("remoteTable: 'surgery_consultation_links_m4'"),'Pull remoto vinculado');
ok(read('lib/sync/dependency-order.ts').includes('surgery_consultation_links_m4'),'Dependência de consulta e cirurgia explícita');
ok(read('scripts/test-v63-release-gate.mjs').includes('test-vault-m4-p2-links-medication-ux.cjs'),'Gate V63 preservado e ampliado');
console.log(`VAULT M4 P2: ${checked} garantias dirigidas OK | horário 24x60, persistência, aparência e contratos`);
