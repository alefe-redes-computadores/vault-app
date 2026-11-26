#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const read=x=>fs.readFileSync(x,'utf8');
const sources=[
'lib/consultations/consultation-medication-evidence-p6.ts',
'lib/health-intelligence/clinical-longitudinal-evidence-p6.ts',
'lib/health-intelligence/clinical-document-review-p6.ts',
'lib/health-intelligence/withdrawal-evidence-p6.ts',
'components/saude/ConsultationMedicationSelectorP6.tsx',
'components/saude/ConsultationVoicesEditorP6.tsx',
'components/saude/ConsultationRelationsViewP6.tsx',
'components/saude/ClinicalLongitudinalReportP6.tsx',
'app/saude/consultas/editar/page.tsx','app/saude/consultas/detalhes/page.tsx',
'app/saude/medicamentos/page.tsx','app/saude/registros/relatorio/page.tsx',
'lib/repositories/consultas.ts','hooks/useSyncQueue.ts','lib/types.ts'];
let n=0;const ok=(name,fn)=>{fn();console.log(`✓ CI360 P6 ${++n}: ${name}`)};
for(const p of sources){ok('Parse TypeScript '+p,()=>{
 const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,p+': '+ast.parseDiagnostics.map(x=>x.messageText));
});}
function pure(p){const js=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(p,module);m.require=id=>id==='../dose-slot-authority'?require('./vault-macro02-test-pure-loader.cjs').loadMacro02Pure(id):require(id);m._compile(js,p);return m.exports;}
const links=pure(sources[0]);const observe=pure(sources[1]);const docs=pure(sources[2]);
const owner={user_id:'conta1',person_id:'p1'};
const m1={id:'m1',nome:'Metadona',dosagem:'10 mg',...owner};
const m2={id:'m2',nome:'Outro',dosagem:'20 mg',...owner};
const mOther={id:'m3',nome:'Sigiloso',dosagem:'x',user_id:'conta2',person_id:'p1'};
const mPerson={id:'m4',nome:'Pessoa B',dosagem:'x',user_id:'conta1',person_id:'p2'};
const all=[m1,m2,mOther,mPerson];
const chosen=xs=>links.safeConsultationMedicationIdsP6(xs,owner,all);
ok('Aceita dois medicamentos explicitamente vinculados',()=>assert.deepEqual(chosen(['m1','m2']),['m1','m2']));
ok('Deduplica IDs sem inventar relação',()=>assert.deepEqual(chosen(['m1','m1','m2']),['m1','m2']));
ok('Isola conta diferente com mesma pessoa',()=>assert.deepEqual(chosen(['m3']),[]));
ok('Isola pessoa diferente com mesma conta',()=>assert.deepEqual(chosen(['m4']),[]));
ok('Legado sem titular nunca prova vínculo',()=>assert.deepEqual(links.safeConsultationMedicationIdsP6(['m1'],{user_id:'conta1',person_id:undefined},all),[]));
ok('IDs inexistentes não podem ser gravados',()=>assert.deepEqual(chosen(['fake','m1']),['m1']));
ok('Relação direta vem da consulta, não do tratamento',()=>assert.deepEqual(links.consultationMedicationEvidenceP6({...owner,medicamento_ids:['m1']},all),[{id:'m1',nome:'Metadona',dosagem:'10 mg',source:'consultation_explicit'}]));
ok('Sem vínculo explícito nenhuma coincidência de data liga medicamento',()=>assert.deepEqual(links.consultationMedicationEvidenceP6({...owner},all),[]));
ok('Três narrativas preservam fonte independente',()=>assert.deepEqual(links.consultationThreeVoicesP6({percepcao_paciente:' senti dor ',orientacao_profissional:' voltar ',proximos_passos:' marcar retorno '}),{personal:'senti dor',professional:'voltar',followUp:'marcar retorno'}));
ok('Sugestão rejeitada não reaparece',()=>assert.deepEqual(links.proposedConsultationLinksP6({suggestions:['m1','m2'],accepted:[],rejected:['m1'],owner,medications:all}),['m2']));
ok('Sugestão já aceita não é repetida',()=>assert.deepEqual(links.proposedConsultationLinksP6({suggestions:['m1'],accepted:['m1'],rejected:[],owner,medications:all}),[]));
ok('Sem consentimento sugestão não é persistência',()=>assert(!/db\.|supabase|\.put\(/.test(read(sources[0]))));
const base={owner,today:'2026-11-16',days:30,doses:[],symptoms:[],consultations:[],medications:[m1],withdrawals:[],acquisitions:[]};
const d=(id,data,extra={})=>({id,user_id:'conta1',person_id:'p1',medicamento_id:'m1',data,horario:'10:00',...extra});
const between=xs=>observe.clinicalLongitudinalEvidenceP6({...base,...xs});
ok('Janela 30 dias tem datas legíveis',()=>{let a=between({});assert.equal(a.start,'2026-10-18');assert.equal(a.end,'2026-11-16')});
ok('Dose tomada precisa confirmação',()=>assert.equal(between({doses:[d('1','2026-11-16',{tomado_em:'2026-11-16T10:00:00Z'})]}).taken,1));
ok('Dose ignorada declarada separada',()=>assert.equal(between({doses:[d('1','2026-11-16',{ignorado_em:'2026-11-16T10:00:00Z'})]}).ignored,1));
ok('Dose sem registro não vira ignorada',()=>assert.equal(between({doses:[d('1','2026-11-16')]}).ignored,0));
ok('Dose futura fora da janela não é contada',()=>assert.equal(between({doses:[d('1','2026-11-17',{tomado_em:'a'})]}).taken,0));
ok('Conta externa não vaza dosagens',()=>assert.equal(between({doses:[d('1','2026-11-16',{user_id:'conta2',tomado_em:'a'})]}).taken,0));
ok('Pessoa externa não vaza dosagens',()=>assert.equal(between({doses:[d('1','2026-11-16',{person_id:'p2',tomado_em:'a'})]}).taken,0));
ok('SOS contado somente se tomado',()=>assert.equal(between({doses:[d('1','2026-11-16',{dose_kind:'sos',tomado_em:'2026-11-16T10:00:00Z'}),d('2','2026-11-16',{dose_kind:'sos'})]}).extra,1));
ok('Eventos sem registro são desconhecidos, nunca zero aderência',()=>assert.equal(between({}).missingLogState,'unknown'));
ok('Falta de pessoa bloqueia relatório',()=>assert.equal(observe.clinicalLongitudinalEvidenceP6({...base,owner:{user_id:'conta1',person_id:''}}).scoped,false));
ok('Retirada realizada no passado entra como fato',()=>assert.equal(between({withdrawals:[{...owner,id:'r1',medicamento_id:'m1',status:'realizada',data:'2026-11-10'}]}).withdrawalsCompleted,1));
ok('Retirada agendada não vira recebimento',()=>assert.equal(between({withdrawals:[{...owner,id:'r1',medicamento_id:'m1',status:'agendada',data:'2026-11-10'}]}).withdrawalsCompleted,0));
ok('Aquisição sem tipo não vira compra',()=>assert.equal(between({acquisitions:[{...owner,id:'a1',medicamento_id:'m1',data:'2026-11-10'}]}).acquisitions,0));
ok('Aquisição confirmada conta fato sem estoque',()=>assert.equal(between({acquisitions:[{...owner,id:'a1',medicamento_id:'m1',data:'2026-11-10',tipo_aquisicao:'sus'}]}).acquisitions,1));
ok('Dossiê não se declara diagnóstico ou causalidade',()=>assert(between({}).limitations.join(' ').includes('causalidade')));
ok('Temporário futuro não vira dose tomada',()=>assert.equal(observe.temporaryCourseWindowP6({start:'2026-11-17',end:'2026-11-20',today:'2026-11-16'}).state,'future'));
ok('Temporário após fim preserva prescrição',()=>assert.equal(observe.temporaryCourseWindowP6({start:'2026-11-01',end:'2026-11-03',today:'2026-11-16'}).state,'after_window'));
ok('Temporário sem fim permanece desconhecido',()=>assert.equal(observe.temporaryCourseWindowP6({start:'2026-11-01',today:'2026-11-16'}).state,'unknown'));
ok('Sem denominador da agenda faltas desconhecidas',()=>assert.equal(observe.clinicalEvidenceCompletenessP6({records:0}).missing,null));
ok('Lacuna calculável não se transforma em ignorada',()=>assert.equal(observe.clinicalEvidenceCompletenessP6({records:3,scheduledSlots:5}).missing,2));
ok('Documento manual não declara OCR real',()=>assert(docs.documentReviewStateP6({kind:'receita',extraction:'manual',confirmed:false,userId:'a',personId:'p'}).label.includes('manual')));
ok('Documento não registra estoque',()=>assert.equal(docs.documentReviewStateP6({kind:'receita',extraction:'verified_ocr',confirmed:true,sourceId:'x',userId:'a',personId:'p'}).mayRegisterStock,false));
ok('Documento não cria receita automaticamente',()=>assert.equal(docs.documentReviewStateP6({kind:'receita',extraction:'verified_ocr',confirmed:true,sourceId:'x',userId:'a',personId:'p'}).mayCreatePrescription,false));
ok('Documento de outra pessoa não vincula',()=>assert.equal(docs.verifiedEvidenceReferenceP6({userId:'a',personId:'p',sourceUserId:'a',sourcePersonId:'q',sourceId:'d'}),false));
ok('Confirmação e fonte autorizam apenas referência',()=>assert.equal(docs.documentReviewStateP6({kind:'receita',extraction:'manual',confirmed:true,sourceId:'d',userId:'a',personId:'p'}).mayLink,true));
const medicine=read('app/saude/medicamentos/page.tsx');
ok('Medicamentos usam evidência P6 escopada',()=>assert(medicine.includes('withdrawalEvidenceByMedicationP6')));
ok('CTA concluído não é ressuscitado',()=>assert(medicine.includes('navigationP6.kind === "completed" ? null')));
ok('Conflito fica em conferência',()=>assert(medicine.includes('navigationP6.kind === "review"')));
ok('Planejamento do Brain concluído não move card',()=>assert(medicine.includes('!staleClosedBrainP6')));
ok('Motor mantém autoridade de estoque sem inventar recebimento',()=>assert(medicine.includes('getClinicalStockSnapshot')&&!/createMedication\(\s*\{/.test(read(sources[3]))));
const edit=read('app/saude/consultas/editar/page.tsx');const details=read('app/saude/consultas/detalhes/page.tsx');
ok('Consulta edita medicamentos independentemente',()=>assert(edit.includes('ConsultationMedicationSelectorP6')));
ok('Consulta edita três narrativas',()=>assert(edit.includes('ConsultationVoicesEditorP6')));
ok('Consulta detalhes mostra vínculos explícitos',()=>assert(details.includes('ConsultationRelationsViewP6')));
ok('Repository valida pessoa e conta antes de gravar',()=>assert(read('lib/repositories/consultas.ts').includes('med.person_id!==personId')&&read('lib/repositories/consultas.ts').includes('current.user_id!==ownerP6.id')));
ok('Sincronização de consulta transporta novos campos',()=>assert(read('hooks/useSyncQueue.ts').includes('medicamento_ids: consulta.medicamento_ids ?? []')));
ok('Relatório só imprime após clique original',()=>assert(read('app/saude/registros/relatorio/page.tsx').includes('onClick={() => window.print()}')));
ok('Resumo longitudinal permite optar pelo conteúdo',()=>assert(read('components/saude/ClinicalLongitudinalReportP6.tsx').includes('Incluir dossiê no PDF')));
ok('Plano de Segurança voluntário não envia para terceiros',()=>assert(!/fetch\(|sendMessage|sendSMS|sendWhatsapp/i.test(read('components/saude/ConsultationRelationsViewP6.tsx'))));
ok('Nova rota da Fênix reutiliza a superfície real',()=>assert(read('components/saude/ConsultationRelationsViewP6.tsx').includes('/saude/minha-saude#meu-avatar')));
ok('Tarja regulatória P7 mantida',()=>assert(medicine.includes('railSize="label"')));
ok('Sem botão antigo de data/hora nativo nesta UI clínica',()=>assert(!/type="(?:date|time)"/.test(read('components/saude/ConsultationVoicesEditorP6.tsx'))));
ok('V63 preserva todos os contratos e registra P6',()=>{const s=read('scripts/test-v63-release-gate.mjs');assert.equal(s.split('scripts/test-vault-ci360-p6-consolidated.cjs').length-1,1);assert(s.includes('test-vault-m153-p7-r4-ux.cjs'))});
console.log(`CI360 P6: ${n} contratos integrados/factuais aprovados. Sem escrita clínica automática.`);
