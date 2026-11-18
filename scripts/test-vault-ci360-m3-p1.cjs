/* M3 P1 — contratos executáveis: dados, formatos e integrações sem writes clínicas. */
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const ts=require('typescript');
const root=process.cwd();let checks=0;
const ok=(predicate,message)=>{assert.ok(predicate,message);checks++};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function compile(p,dependencies={},windowFake=undefined){
  const result=ts.transpileModule(read(p),{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}});
  const mod={exports:{}};const context={module:mod,exports:mod.exports,
    require:(id)=>{if(id in dependencies)return dependencies[id];throw Error('Módulo não autorizado no teste puro: '+id);},
    window:windowFake, CustomEvent:function CustomEvent(type){this.type=type;},console,Date,Set,Map};
  vm.runInNewContext(result.outputText,context,{filename:p,timeout:3000});return mod.exports;
}
const catalog=compile('lib/medications/catalog-presentation.ts');
for(const label of ['COM SUB-LING','COM SUB LING','com sublingual','COMP SUB-LING']){
  ok(catalog.inferVaultFormatFromOfficialPresentation(label)==='sublingual','Apresentação '+label);
  ok(catalog.formatMatchesCatalog('sublingual',[label])===true,'Equivalência de texto '+label);
}
ok(catalog.formatMatchesCatalog('sublingual',['SUSP OR'])===false,'Sem equivalência de suspensão');
ok(catalog.formatMatchesCatalog('capsula',['COM SUB-LING'])===false,'Não converter sublingual em cápsula');
const colors=compile('lib/medications/identity-color-selection.ts');
ok(colors.toggleMedicationIdentityColor([], '#FFFFFF','comprimido').length===1,'Uma cor para comprimido');
ok(colors.toggleMedicationIdentityColor(['#FFFFFF'],'#FFFFFF','comprimido').length===0,'Desmarcar cor comum');
ok(colors.toggleMedicationIdentityColor(['#FFFFFF','#000000'],'#EF4444','gota').join(',')==='#EF4444','Cores antigas não são apagadas automaticamente, só ao editar');
ok(colors.toggleMedicationIdentityColor(['#FFFFFF'],'#000000','capsula').length===2,'Cápsula permite duas cores');
ok(colors.toggleMedicationIdentityColor(['#FFFFFF','#000000'],'#EF4444').length===2,'Assinatura histórica preservada');
const storage=new Map(),events=[];
const fake={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},dispatchEvent:e=>events.push(e.type)};
const offsets=compile('lib/m3/notification-overrides.ts',{},fake);
ok(offsets.getEventOffsetsM3({userId:'U1',personId:'P1',kind:'consulta',fallback:[1440]}).join(',')==='1440','Fallback canônico');
offsets.setCommitmentOverrideM3('U1','P1','consulta',[60,1440,60]);
ok(offsets.getEventOffsetsM3({userId:'U1',personId:'P1',kind:'consulta',fallback:[2880]}).join(',')==='1440,60','Overrides ordenados sem duplicar');
ok(offsets.getEventOffsetsM3({userId:'U1',personId:'P2',kind:'consulta',fallback:[2880]}).join(',')==='2880','Isolamento entre pessoas');
ok(offsets.getEventOffsetsM3({userId:'U2',personId:'P1',kind:'consulta',fallback:[2880]}).join(',')==='2880','Isolamento entre contas');
ok(events.includes('vault:health-reminders-reconcile'),'Reconciliar sem executar disparo');
let bad=false;try{offsets.setCommitmentOverrideM3('U1','P1','exame',[999999]);}catch{bad=true;}ok(bad,'Bloquear antecedentes inválidos');
offsets.setCommitmentOverrideM3('U1','P1','consulta',null);
ok(offsets.getCommitmentOverrideM3('U1','P1','consulta')===null,'Restaura canônico');
const domain={isIsoDateM2:value=>/^\d{4}-\d\d-\d\d$/.test(value)};
const t=compile('lib/m3/careflow-timeline.ts',{'@/lib/careflow-m2/domain':domain});
const fixture=[
  {id:'1',user_id:'U1',person_id:'P1',kind:'exam_order',parent_id:null,related_id:null,payload:{title:'Exames do acompanhamento',date:'2026-11-17'},created_at:'2026-11-18T12:00:00Z'},
  {id:'2',user_id:'U1',person_id:'P2',kind:'exam_result',parent_id:'1',related_id:'1',payload:{result:'segredo'},created_at:'2026-11-18T13:00:00Z'},
  {id:'3',user_id:'U2',person_id:'P1',kind:'monitor_reading',parent_id:'x',related_id:'x',payload:{result:'outra conta'},created_at:'2026-11-18T13:00:00Z'}
];
const timeline=t.buildCareFlowTimelineM3(fixture,'U1','P1');
ok(timeline.length===1,'Dossiê não cruza titulares');
ok(timeline[0].title==='Exames do acompanhamento','Preserva título fonte');
ok(timeline[0].dateSource==='evento','Data do evento distinta do cadastro');
const linkedEvent={id:'note-linked',user_id:'U1',person_id:'P1',kind:'monitor_note',parent_id:'c1',related_id:'symptom-1',payload:{link:'consultation_to_existing_symptom'},created_at:'2026-11-18T12:00:00Z'};
const relatedSymptom={id:'symptom-1',user_id:'U1',person_id:'P1',nome:'Zumbido',data:'2026-11-17',horario:'09:00',intensidade:5};
const linkedRows=t.buildCareFlowTimelineM3([linkedEvent],'U1','P1',[relatedSymptom]);
ok(linkedRows.length===1&&linkedRows[0].title.includes('Zumbido')&&linkedRows[0].date==='2026-11-17'&&linkedRows[0].dateSource==='evento'&&linkedRows[0].details.includes('Intensidade 5/10'),'M3 P1: sintoma associado tem data e relato de fonte real');
const wrongOwnerRows=t.buildCareFlowTimelineM3([linkedEvent],'U1','P1',[{...relatedSymptom,user_id:'U2'}]);
ok(wrongOwnerRows.length===1&&!wrongOwnerRows[0].title.includes('Zumbido')&&!wrongOwnerRows[0].details.includes('Intensidade 5/10'),'M3 P1: sintoma de outra conta nao hidrata a consulta');
const date=read('components/DatePicker.tsx');ok(date.includes('document.addEventListener("keydown", onEscape)'),'Escape em calendário compartilhado');ok(date.includes('onClickOutside={() => setCalendarOpen(false)}'),'Toque fora preservado');ok(date.includes('shouldCloseOnSelect'),'Seleção fecha');
const eventSource=read('lib/health-reminders/event-scheduler.ts');ok(eventSource.includes('getEventOffsetsM3({userId:event.userId,personId:event.personId'),'Scheduler canônico usa preferência local por titular');
ok(eventSource.includes('reconcileVaultNotificationSet(notifications, owns)'),'Reconciliação nativa preservada');
const render=read('components/saude/visual-studio/PillStudioV8.tsx');ok(render.includes("p.kind==='sublingual'"),'PillStudio sublingual');
const icon=read('components/saude/MedicationFormatIcon.tsx');ok(icon.includes('p.kind === "sublingual"'),'Ícone farmacêutico sublingual');
const novo=read('app/saude/medicamentos/novo/page.tsx'),editar=read('app/saude/medicamentos/editar/page.tsx');
for(const source of [novo,editar]){ok(source.includes('toggleMedicationIdentityColor(previous, hex, formato)'),'Regra compartilhada Novo/Editar');ok(source.includes('maxColors={formato === "capsula" ? 2 : 1}'),'Paleta por formato');}
const dossier=read('app/saude/careflow/dossie/page.tsx');ok(dossier.includes('makeCareFlowTimelinePdfM3'),'Dossiê com PDF local');ok(dossier.includes('pdfLibraryM2.add'),'Biblioteca existente usada');
const m2=read('app/saude/careflow/page.tsx');ok(m2.includes("href:'/saude/careflow/dossie'"),'Acesso ao dossiê pelo CareFlow');
const gate=read('scripts/test-v63-release-gate.mjs');ok(gate.includes('scripts/test-vault-ci360-m3-p1.cjs'),'Registro no gate real');
const preload=read('scripts/vault-m2-test-alias-preload.cjs');
for(const alias of ['@/lib/careflow-m2/reminder-window','@/lib/careflow-m2/withdrawal-coherence','@/lib/m3/notification-overrides'])ok(preload.includes(alias),'Resolver de testes carrega fonte real: '+alias);
ok(gate.includes('vaultM2TestPreload')&&gate.includes('spawnSync(process.execPath'),'V63 mantem preloader e gate canônico');
console.log(`M3 P1 — ${checks} garantias executáveis APROVADAS`);
