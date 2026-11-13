'use strict';
/* Smoke + regression contracts for universal observational engines. No patient data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let checks=0;
function ok(cond,name){assert.ok(cond,`BrainV7: ${name}`);console.log(`✓ BrainV7 ${++checks}: ${name}`);}
function load(p,deps={}){
  const source=read(p),compiled=ts.transpileModule(source,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.equal(compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length||0,0,p);
  const mod=new Module(p,module);mod.filename=path.join(root,p);mod.paths=module.paths;
  mod.require=id=>{if(Object.hasOwn(deps,id))return deps[id];throw Error(`Unexpected dependency ${id} in ${p}`);};
  mod._compile(compiled.outputText,mod.filename);return mod.exports;
}
const pure='lib/health-intelligence/brain-v7-universal.ts';
const dossierPath='lib/health-intelligence/brain-v7-dossier.ts';
const ui='components/saude/BrainV7UniversalConsole.tsx';
const route='app/saude/brain-v7/page.tsx';
for(const p of [pure,dossierPath,ui,route]){
  const s=read(p);const isTsx=p.endsWith('tsx');const parsed=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,isTsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(parsed.parseDiagnostics.length===0,`sintaxe ${p}`);
}
const core=load(pure);
const readManufacturerMetadata=(notes)=>{
 const x=String(notes||'').split('\n').find(x=>x.startsWith('[VAULT:PRODUTO]'));
 try{return x?JSON.parse(x.slice('[VAULT:PRODUTO]'.length)):{}}catch{return {}}
};
const dossier=load(dossierPath,{'./brain-v7-universal':core,'@/lib/medications/manufacturer-experience':{readManufacturerMetadata}});
const {projectBrainUniversalV7,shiftBrainDayV7,validBrainDayV7}=core;
const today='2026-11-13';const now='2026-11-13T15:00:00.000Z';
const med=(id,name,opts={})=>({id,nome:name,dosagem:'10 mg',user_id:'u1',person_id:'p1',tipo_uso:'continuo',status:'ativo',...opts});
const log=(id,medicine,date,opts={})=>({id,medicamento_id:medicine,data:date,user_id:'u1',person_id:'p1',horario:'08:00',...opts});
const rec=(id,date,type,opts={})=>({id,data:date,tipo:type,user_id:'u1',person_id:'p1',categoria:'outro',nome:'Registro',horario:'09:00',...opts});
const fixture={userId:'u1',personId:'p1',todayISO:today,nowISO:now,anchorMedicationIds:['base'],medications:[
  med('base','Base contínua',{observacoes:'Anotação pessoal'}),
  med('alternative','Substituto'),
  med('old','Antigo',{status:'descontinuado',data_descontinuacao:'2026-11-01',motivo_descontinuacao:'Intolerância declarada',substituido_por_id:'alternative',historico_dosagens:[{dosagem_antiga:'5mg',data_mudanca:'2026-10-01',medico_responsavel:'Sem identificação'}]}),
  med('foreign','Outro paciente',{person_id:'p2'}),
 ],doseLogs:[
 log('a','base','2026-11-06',{ignorado_em:'2026-11-06T08:00:00Z',motivo:'sem_estoque'}),
 log('b','base','2026-11-07',{tomado_em:'2026-11-07T08:00:00Z'}),
 log('b','base','2026-11-07',{tomado_em:'2026-11-07T08:00:00Z'}),
 log('c','base','2026-11-12',{ignorado_em:'2026-11-12T08:00:00Z'}),
 log('d','base','2026-11-13',{tomado_em:'2026-11-13T07:00:00Z',dose_kind:'sos'}),
 log('e','alternative','2026-11-13',{tomado_em:'2026-11-13T15:00:01Z',dose_kind:'extra'}),
 log('f','alternative','2026-11-12',{tomado_em:'2026-11-12T14:59:00Z',dose_kind:'sos'}),
 log('g','foreign','2026-11-12',{tomado_em:'2026-11-12T18:00:00Z',dose_kind:'sos',person_id:'p2'}),
 log('h','base','2026-11-10',{motivo:'sem_estoque'}),
 ],records:[
 rec('r1','2026-11-13','eixo_somatico_dor',{intensidade:7}),
 rec('r2','2026-11-13','eixo_volitivo_energia',{intensidade:3}),
 rec('r3','2026-11-12','eixo_autonomico_apetite',{intensidade:8}),
 rec('r4','2026-11-11','sono',{inicio_em:'2026-11-10T23:00:00Z',fim_em:'2026-11-11T07:00:00Z'}),
 rec('r5','2026-11-12','treino_forca',{source:'manual'}),
 rec('r6','2026-11-13','eixo_afetivo_humor',{intensidade:11}),
 rec('r7','2026-11-13','eixo_somatico_dor',{intensidade:5,person_id:'p2'}),
 ],acquisitions:[
 {id:'ac1',user_id:'u1',person_id:'p1',medicamento_id:'base',tipo_aquisicao:'comprado',data:'2026-11-03',data_aquisicao:'2026-11-03',preco:42,observacoes:'[VAULT:PRODUTO]{"manufacturer":"Lab A"}'},
 {id:'ac2',user_id:'u1',person_id:'p1',medicamento_id:'old',tipo_aquisicao:'sus',data:'2026-11-01',data_aquisicao:'2026-11-01'},
 {id:'ac3',user_id:'u1',person_id:'p1',medicamento_id:'base',tipo_aquisicao:'comprado',data:'2026-11-20',data_aquisicao:'2026-11-20',preco:90},
 {id:'ac4',user_id:'u1',person_id:'p2',medicamento_id:'base',tipo_aquisicao:'comprado',data:'2026-11-07',data_aquisicao:'2026-11-07',preco:1000},
 ]};
const r=projectBrainUniversalV7(fixture);
ok(r.authorized===true&&r.medicationCount===3,'isolamento de conta e pessoa nos medicamentos');
ok(r.anchors.length===1&&r.anchors[0].medicationName==='Base contínua','âncora opcional, somente em medicamento contínuo do perfil');
ok(r.anchors[0].taken===2,'deduplicação de logs por ID');
ok(r.anchors[0].explicitlyIgnored===2,'dose ignorada não é classificada tomada');
ok(r.anchors[0].confirmedOutOfStock===1,'falta de estoque requer motivo confirmado');
ok(r.anchors[0].returnDay==='2026-11-07','retomada após lacuna explícita pode ser descrita');
ok(r.axes.find(x=>x.kind==='somatico')?.value===7,'eixo somático descarta outra pessoa');
ok(r.axes.find(x=>x.kind==='afetivo')?.value===null,'intensidade inválida não integra eixo');
ok(r.sleep.observedDays===1&&r.sleep.lastWakeAt==='2026-11-11T07:00:00Z','despertar exige episódio de sono com início e fim reais');
ok(r.lifestyle.length===1&&r.lifestyle[0].label==='Treino de força','contexto de vida somente com registro explícito');
ok(r.rescue.takenIn24h===1,'SOS usa timestamp real, ignora futuro e fora das 24h');
ok(r.rescue.byMedication[0].medicationId==='base','contagem SOS vinculada ao medicamento, não classifica sedativos por nome');
ok(r.supply.purchasedEvents===1&&r.supply.paidTotal===42&&r.supply.freeOrSusEvents===1,'SUS separado de compra e futuro sem somar');
ok(r.transitions.length===1&&r.transitions[0].replacementName==='Substituto','transição por vínculo explícito, sem concluir washout');
ok(r.history.some(x=>x.medicationName==='Antigo'&&x.dosageChanges===1),'preserva linha histórica de dose sem reinterpretar dose segura');
ok(r.documentation.ignoredWithoutReason14===1,'mantém ausência de motivo como dado incompleto');
ok(r.limitations.some(x=>x.includes('tolerância')),'alertas não substituídos por histórico de tolerância');
ok(shiftBrainDayV7('2026-03-01',-1)==='2026-02-28'&&!validBrainDayV7('2026-02-30'),'calendário civil estrito');
ok(projectBrainUniversalV7({...fixture,userId:''}).authorized===false,'sem identidade válida não há projeção');
ok(projectBrainUniversalV7({...fixture,anchorMedicationIds:['old','foreign']}).anchors.length===0,'medicamento descontinuado não é âncora ativa');
const text=dossier.prepareBrainV7Dossier({report:r,userId:'u1',personId:'p1',medications:fixture.medications,acquisitions:fixture.acquisitions,
  rationales:[{id:'n1',medicationId:'base',recordedAt:now,source:'relato_pessoal',note:'Histórico informado sem validação'},
    {id:'n2',medicationId:'foreign',recordedAt:now,source:'documento_referido',note:'Segredo de outro perfil'}]});
ok(text.includes('VAULT — DOSSIÊ OBSERVACIONAL'),'dossiê estruturado');
ok(text.includes('Lab A')&&!text.includes('Segredo de outro perfil'),'identidade fabricante de aquisição autorizada e isolamento de justificativas');
ok(!text.includes('R$ 1000')&&!text.includes('R$ 90'),'eventos futuros e de outra pessoa não contam custos');
ok(text.includes('NÃO foram silenciados')&&text.includes('não comprovam segurança'),'dossiê nunca suprime alertas regulatórios');
ok(dossier.prepareBrainV7Dossier({...fixture,report:{...r,authorized:false},rationales:[]}).includes('indisponíveis'),'nenhum dossiê sem autorização');
const consoleSource=read(ui);
ok(consoleSource.includes("'[user_id+person_id+data]'")&&consoleSource.includes("'[user_id+person_id]'"),'queries Dexie indexadas por pessoa e conta');
ok(consoleSource.includes('localStorage.setItem')&&consoleSource.includes('encodeURIComponent(uid)'),'âncora e contexto locais com namespace por pessoa');
ok(consoleSource.includes("await import('jspdf')")&&consoleSource.includes('navigator.clipboard.writeText'),'PDF local e cópia voluntária');
ok(!/supabase\.from\(|db\.medicamentos\.put\(|db\.doseLogs\.put\(/.test(consoleSource),'nenhuma mutação clínica ou remota');
ok(consoleSource.includes('não reduz alertas')&&consoleSource.includes('não comprova estabilidade farmacológica'),'avisos conservadores visíveis');
const app=read(route);ok(app.includes('BrainV7UniversalConsole'),'rota funcional expõe console');
const pl=read('components/saude/PharmaLensWorkspaceV7.tsx');
ok(pl.includes('/saude/brain-v7')&&pl.includes('Brain V7'),'atalho acessível por PharmaLens');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-brain-v7-universal.cjs"'),'suite incluída no gate global, não opcional');

// Boundary tests: no extrapolation beyond recorded evidence.
const noAnchor=projectBrainUniversalV7({...fixture,anchorMedicationIds:[]});
ok(noAnchor.anchors.length===0,'nenhuma âncora escolhida por algoritmo ou nome comercial');
const allUnconfirmed=projectBrainUniversalV7({...fixture,doseLogs:[],anchorMedicationIds:['base']});
ok(allUnconfirmed.anchors[0].taken===0&&allUnconfirmed.anchors[0].explicitlyIgnored===0&&allUnconfirmed.anchors[0].warnings.some(w=>w.includes('não comprova interrupção')),'sem log não é não adesão inferida');
const foreignOnly=projectBrainUniversalV7({...fixture,doseLogs:[log('foreign2','base','2026-11-13',{user_id:'other',tomado_em:now})]});
ok(foreignOnly.anchors[0].taken===0&&foreignOnly.rescue.takenIn24h===0,'conta estranha não contamina tomada nem SOS');
const futureOnly=projectBrainUniversalV7({...fixture,doseLogs:[log('future','base','2026-11-14',{tomado_em:'2026-11-14T10:00:00Z',dose_kind:'sos'})]});
ok(futureOnly.documentation.doseDays14===0&&futureOnly.rescue.takenIn24h===0,'dia futuro não gera evidência retrospectiva');
const emptySleep=projectBrainUniversalV7({...fixture,records:[rec('n','2026-11-13','sono',{fim_em:'2026-11-13T07:00:00Z'})]});
ok(emptySleep.sleep.observedDays===0&&!emptySleep.sleep.lastWakeAt,'sem início de sono não se presume despertar biológico');
const badDate=projectBrainUniversalV7({...fixture,todayISO:'2026-02-30'});
ok(!badDate.authorized,'data civil impossível recusa relatório');
const noMoney=projectBrainUniversalV7({...fixture,acquisitions:[{id:'x',user_id:'u1',person_id:'p1',medicamento_id:'base',tipo_aquisicao:'comprado',data:'2026-11-01',data_aquisicao:'2026-11-01'}]});
ok(noMoney.supply.purchasedEvents===1&&noMoney.supply.amountUnreportedEvents===1&&noMoney.supply.paidTotal===0,'preço ausente não é receita ou economia presumida');
const invalidValue=projectBrainUniversalV7({...fixture,records:[rec('neg','2026-11-12','eixo_somatico_dor',{intensidade:-5})]});
ok(invalidValue.axes.every(a=>a.value===null),'fenótipo recusa intensidade fora de 0 a 10');
const importedStatement=projectBrainUniversalV7({...fixture,medications:fixture.medications.map(m=>m.id==='base'?{...m,observacoes:'Tolerância alta declarada, sem confirmação'}:m)});
ok(importedStatement.anchors[0].taken===r.anchors[0].taken&&importedStatement.rescue.takenIn24h===r.rescue.takenIn24h,'anotação de tolerância não altera contadores ou regras');
const tooLongSecret=dossier.prepareBrainV7Dossier({report:r,userId:'u1',personId:'p1',medications:fixture.medications,acquisitions:fixture.acquisitions,rationales:[{id:'x',medicationId:'base',recordedAt:now,source:'relato_pessoal',note:'x'.repeat(1201)}]});
ok(!tooLongSecret.includes('x'.repeat(100)),'justificativa malformada excedente não entra no dossiê');
ok(!consoleSource.includes('ALTER TABLE')&&!consoleSource.includes('prescricao_override'),'UI não cria migração nem substitui autorização médica');

ok(consoleSource.includes('Confirmar exclusão local')&&consoleSource.includes('removeRationale'),'anotações pessoais têm exclusão explícita com confirmação');
console.log(`BRAIN V7 MACRO: ${checks} verificações aprovadas | sem sobrescrever alertas, doses ou dados clínicos`);
