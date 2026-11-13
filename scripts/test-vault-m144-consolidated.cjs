'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
const files=['src/domain/saude/medicationNormalizers.ts','src/domain/saude/documentReconciler.ts','src/domain/saude/MedicationActionResolver.ts','src/domain/saude/contingency.ts','src/domain/saude/careEpisodes.ts','src/domain/saude/manufacturerAuthority.ts','src/domain/saude/acquisitionTruth.ts'];
let checks=0;const ok=(c,msg)=>{assert.ok(c,'M144: '+msg);checks++};
const cache=new Map();const load=file=>{if(cache.has(file))return cache.get(file).exports;const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});const m=new Module(file,module);cache.set(file,m);m.require=id=>id.startsWith('./')?load('src/domain/saude/'+id.slice(2)+'.ts'):require(id);m._compile(out.outputText,file);return m.exports};
for(const p of files){ok(fs.existsSync(p),'source '+p);ok(ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length===0,'TS parse '+p);}
const m=load(files[0]),a=load(files[2]),d=load(files[1]),c=load(files[3]),e=load(files[4]),f=load(files[5]);
for(const type of ['sos','esporadico','conforme_necessidade']){ok(m.isUsoSOSM144({tipo_uso:type}),'SOS synonym '+type);ok(!m.createsAutomaticDoseM144({tipo_uso:type,status:'ativo'}),'no auto dose '+type)}
ok(m.createsAutomaticDoseM144({tipo_uso:'continuo',status:'ativo'}),'continuous still scheduled');ok(!m.createsAutomaticDoseM144({tipo_uso:'continuo',status:'descontinuado'}),'discontinued not scheduled');
ok(m.classifyAcquisitionOriginM144({origem:'particular'})==='particular','private not SUS');ok(m.classifyAcquisitionOriginM144({origem:'sus'})==='sus','SUS distinct');
for(const [n,u,expected] of [[1,'capsula','1 cápsula'],[2,'capsula','2 cápsulas'],[1,'comprimido','1 comprimido'],[2,'comprimido','2 comprimidos'],[0,'gota','0 gotas']])ok(m.formatUnidadeFarmaceuticaM144(n,u)===expected,'plural '+expected);
ok(m.formatDiasRelativosM144(-1)==='ontem','yesterday');ok(m.formatDiasRelativosM144(-3)==='há 3 dias','past plural');ok(!m.formatDiasRelativosM144(1).includes('(s)'),'no ugly plural');
let ds=[{document_id:'doc',medicamento_id:'med',renovacao_id:'ren',user_id:'user',person_id:'person',validade_confirmada:false},{document_id:'doc',medicamento_id:'med',renovacao_id:'ren',user_id:'user',person_id:'person'},{document_id:'doc',medicamento_id:'med2',renovacao_id:'ren2',user_id:'other',person_id:'person'}];
let reconciled=d.reconcileDocumentsM144({references:ds,userId:'user',personId:'person',todayISO:'2026-11-13'});ok(reconciled.length===1&&reconciled[0].entries.length===2,'reconciles view not rows');ok(reconciled[0].state==='historico_ou_revisar','never invents validity');ok(d.reconcileDocumentsM144({references:ds,userId:'other',personId:'x',todayISO:'2026-11-13'}).length===0,'person isolation');
let med={tipo_uso:'continuo',status:'ativo',estoque_horarios:['08:00','21:00']};let due=a.medicineDueNowM144(med,[],'2026-11-13','09:00');ok(due.due&&due.future,'one due one future');
due=a.medicineDueNowM144(med,[{data:'2026-11-13',horario:'08:00',tomado_em:'2026-11-13T08:02'}],'2026-11-13','09:00');ok(!due.due&&due.future,'taken clears due immediately');
due=a.medicineDueNowM144(med,[{data:'2026-11-13',horario:'08:00',ignorado_em:'2026-11-13T08:02'}],'2026-11-13','09:00');ok(!due.due,'ignored is not unconfirmed');
ok(!a.medicineDueNowM144({tipo_uso:'sos',status:'ativo',estoque_horarios:['08:00']},[],'2026-11-13','09:00').due,'SOS no automatic pending');
ok(a.medicineDueNowM144({tipo_uso:'sos',status:'ativo'},[{data:'2026-11-13',horario:'08:00',dose_kind:'scheduled'}],'2026-11-13','09:00').due,'explicit SOS schedule respected');
const resolve=inp=>a.resolveMedicationActionM144({medication:{tipo_uso:'continuo',status:'ativo'},...inp});
ok(resolve({futureDose:true}).primaryBadge==='agendada_hoje','future neutral');ok(!resolve({futureDose:true}).isAttention,'future not attention');ok(resolve({doseNow:true,futureDose:true}).primaryBadge==='dose_agora','now wins');ok(resolve({careStage:'acquisition_planned'}).isPlanning,'planned separate');ok(resolve({careStage:'withdrawal_overdue'}).isAttention,'withdrawal overdue');ok(resolve({careStage:'stable',regulatoryAlerts:['Regulatório']}).secondaryDetails[0].kind==='regulatorio','regulatory never hidden');
ok(c.classifyBridgeM144({anchorId:'a',bridgeId:'b',startDay:'2026-11-10',endDay:'2026-11-12',id:'x',ownerId:'u',personId:'p',reason:'ruptura_estoque_ancora',notes:''},'2026-11-13')==='historica','bridge historical read-only');ok(c.returnMonitoringM144('2026-11-12','2026-11-13').canRecommendRestart===false,'no automatic restart advice');
ok(e.projectEpisodesM144([{id:'1',user_id:'u',person_id:'p',title:'Curso',startDay:'2026-11-10',endDay:'2026-11-12',kind:'ciclo_curto'}],'u','p','2026-11-13').history.length===1,'course view auto archive');
ok(f.manufacturerDisplayM144({laboratorio_etiqueta:'A',latestAcquisition:{completed:true,laboratorio:'B'}}).suggestion==='B','manufacturer discrepancy shown, no mutation');
for(const p of ['app/saude/central-m144/page.tsx','components/saude/M144ClinicalPanel.tsx']){ok(fs.existsSync(p),'UI '+p);const s=fs.readFileSync(p,'utf8');ok(ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length===0,'UI syntax '+p)}
const list=fs.readFileSync('app/saude/medicamentos/page.tsx','utf8');
ok(list.includes('VAULT_M144_LIST_ENTRY') && list.includes('/saude/central-m144'),'M144 has list entry without duplicate care engines');
ok(list.includes('// M146: a mesma regra executiva alimenta tanto o filtro como o agrupamento.'),'M146 executive unification preserved');
const filterM146=list.slice(list.indexOf('if (medicationFilter === "atencao")'),list.indexOf('if (medicationFilter === "continuos")'));
const groupM146=list.slice(list.indexOf('// M146: a mesma regra executiva'),list.indexOf('if (precisaAcao)'));
for(const segment of [filterM146,groupM146]) ok(segment.includes('medicationCareStageNeedsAttention(')&&segment.includes('brainLane === "now" || brainLane === "prepare"')&&segment.includes('reasons.some(reason'),'M146 executive attention evidence preserved in filter and group');
ok(list.includes('const todayStatus = futureScheduleOnlyM143')&&list.includes('medicationNextPendingClockM143(med, doseLogs || [], attentionClockM143)'),'M143 future doses retained untouched');
ok(list.includes('medicationListAttentionReasonsM143('),'M143 temporal reasons preserved');
const detailSource=fs.readFileSync('app/saude/medicamentos/detalhes/page.tsx','utf8');
ok(detailSource.includes('<PrescriptionAttachmentViewerM143')&&!detailSource.includes('<AttachmentPreviewM144'),'M143 pinch/zoom viewer retained without duplication');
const today=fs.readFileSync('app/hoje/page.tsx','utf8');ok(today.includes('VAULT_M144_TODAY_ENTRY'),'Today has hub entry');
const detail=fs.readFileSync('app/saude/medicamentos/detalhes/page.tsx','utf8');ok(detail.includes('VAULT_M144_DETAIL_ENTRY'),'detail has hub entry');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');ok(gate.includes('scripts/test-vault-m144-consolidated.cjs'),'release gate includes M144');ok(gate.includes('scripts/test-vault-m71-final-visual-contract.cjs'),'M71 preserved');

const acq=load('src/domain/saude/acquisitionTruth.ts');
ok(m.classifyAcquisitionOriginM144({tipo_aquisicao:'comprado'})==='particular','compra particular legada reconhecida');
ok(e.episodeProgressM144('2026-11-10','2026-11-14','2026-11-13')?.elapsed===4,'ciclo Dia 4/5 com data inclusiva');
ok(e.episodeProgressM144('2026-11-10','2026-11-14','2026-11-15')?.state==='historico','ciclo autoarquivado só na projeção');
ok(e.episodeProgressM144('2026-02-30','2026-03-02','2026-03-01')===null,'data impossível rejeitada');
const acquisitionFixtures=[
 {id:'a1',user_id:'u',person_id:'p',medicamento_id:'m',tipo_aquisicao:'sus',data:'2026-11-13',data_aquisicao:null},
 {id:'a2',user_id:'u',person_id:'p',medicamento_id:'m',tipo_aquisicao:'comprado',data_aquisicao:'2026-11-12'},
 {id:'a3',user_id:'other',person_id:'p',medicamento_id:'m',tipo_aquisicao:'sus',data_aquisicao:'2026-11-13'}
];
ok(acq.latestRecordedAcquisitionM144(acquisitionFixtures,'u','p','m','2026-11-13')?.origin==='particular','origem do evento prevalece sobre processo SUS');
ok(acq.latestRecordedAcquisitionM144([acquisitionFixtures[0]],'u','p','m','2026-11-13')===null,'data da receita não significa compra concluída');
ok(acq.latestRecordedAcquisitionM144(acquisitionFixtures,'other','p','m','2026-11-12')===null,'aquisição futura e conta alheia não vazam');
const clinicalPanel=fs.readFileSync('components/saude/M144ClinicalPanel.tsx','utf8');
ok(clinicalPanel.includes("tag:'course'")&&clinicalPanel.includes('episodeProgressM144'),'central oferece ciclo curto com contagem inclusiva');
ok(clinicalPanel.includes('eventDate')&&clinicalPanel.includes('lot'),'vacina possui data declarada e lote, sem usar hoje automaticamente');
ok(clinicalPanel.includes('latestRecordedAcquisitionM144'),'central diferencia última aquisição real de receita');
ok(clinicalPanel.includes('/saude/plano-seguranca'),'resgate SOS acessível pela central');
const centralPage=fs.readFileSync('app/saude/central-m144/page.tsx','utf8');
ok(!/\bpt-safe\b|safe-area-inset-top/.test(centralPage) && centralPage.includes('bg-void px-3.5 pb-24 pt-4'),'central M144 segue contrato V31 de safe-area superior global');

// V112: every new clinical date is typed through the masked Vault control.
// No native date/time input or visible select may enter app/components.
const nativeDateFieldM144=/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/gs;
ok(!nativeDateFieldM144.test(clinicalPanel),'V112: M144 não usa campos nativos date/time');
ok(!/<select\b[^>]*>/g.test(clinicalPanel),'V112: M144 não usa select nativo');
ok(clinicalPanel.includes('function maskDayInputM144('),'V112: máscara de datas controlada');
ok((clinicalPanel.match(/maskDayInputM144\(e\.target\.value\)/g)||[]).length===6,'V112: 6 datas passam pela máscara, sem exceção');
ok((clinicalPanel.match(/inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD"/g)||[]).length===6,'V112: teclado numérico com formato declarado');


console.log(`VAULT M144: ${checks} verificações de integração e segurança aprovadas.`);
