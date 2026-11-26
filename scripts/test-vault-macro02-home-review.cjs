#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'vault-m02-home-'));
const tsc=process.env.VAULT_TSC_JS||path.join(root,'node_modules/typescript/lib/tsc.js');
const args=['--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',dir,path.join(root,'lib/dose-premium/home-review.ts'),path.join(root,'lib/dose-premium/review-intent.ts')];
assert.equal(cp.spawnSync(fs.existsSync(tsc)?process.execPath:'tsc',fs.existsSync(tsc)?[tsc,...args]:args,{stdio:'inherit'}).status,0);
(async()=>{try {
 const x=require(path.join(dir,'home-review.js')),units=require(path.join(dir,'historical-unit.js'));
 const scope={user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-25',horario:'08:00'};
 const row={...scope,id:'one',dose_kind:'planned',quantidade:2,updated_at:'2026-11-25T12:00:00Z'};
 const capture=(rows=[],quantity=4)=>x.captureHomeDoseReview(scope,rows,quantity);
 const empty=capture(),known=capture([{...row,...units.declareDoseUnit('drop','documented')}]);
 let n=0;const check=(s,fn)=>{fn();n++;console.log('PASS '+s);};
 check('empty slot explicit scope and suggestion only',()=>{assert.equal(empty.expected,null);assert.equal(empty.suggestedQuantity,4);assert.equal(x.initialHomeDoseDraft(empty).quantity,'');});
 check('overlapping live reads deduplicate only identical ID snapshot',()=>{const r=capture([row,{...row,synced:true}]);assert.equal(r.blocked,null);assert.equal(r.expected.id,'one');assert.equal(r.suggestedQuantity,2);});
 check('same ID with differing factual snapshot is not deduplicated',()=>assert.match(capture([row,{...row,quantidade:3}]).blocked,/mudaram/));
 check('two programmed rows never collapse',()=>assert.match(capture([row,{...row,id:'two'}]).blocked,/duplicados/));
 check('independent SOS or extra never selected',()=>{assert.equal(capture([{...row,dose_kind:'sos'},{...row,id:'x',dose_kind:'extra'}]).expected,null);});
 check('another owner or patient never appears',()=>{assert.equal(capture([{...row,user_id:'other'},{...row,id:'two',person_id:'other'}]).expected,null);});
 check('resolved or malformed records block review',()=>{assert.match(capture([{...row,tomado_em:'2026-11-25T12:00:00Z'}]).blocked,/revisada/);assert.match(capture([{...row,id:undefined}]).blocked,/identidade/);});
 check('legacy missing amount does not fall back to current settings',()=>assert.equal(capture([{...row,quantidade:undefined}],9).suggestedQuantity,null));
 check('known documented unit is retained, not redeclared',()=>{const d={...x.initialHomeDoseDraft(known),quantity:'2,5',code:'tablet'};const v=x.prepareHomeDoseConfirmation(known,d,false,false);assert.equal(v.quantity,2.5);assert.equal(v.unit.unidade_dose,'drop');assert.equal(v.unit.fonte_unidade,'documented');});
 check('no guessed quantity or unit, strict numeric syntax',()=>{for(const quantity of ['', 'NaN','-2','2e1','0','2.3.4'])assert.throws(()=>x.prepareHomeDoseConfirmation(empty,{...x.initialHomeDoseDraft(empty),quantity,code:'drop',unitReviewed:true},false,false));assert.throws(()=>x.prepareHomeDoseConfirmation(empty,{...x.initialHomeDoseDraft(empty),quantity:'1'},false,false),/unidade/);});
 check('unknown unit only with explicitly historical individual review',()=>{const d={...x.initialHomeDoseDraft(empty),quantity:'1',unitReviewed:true,noStock:true};assert.equal(x.prepareHomeDoseConfirmation(empty,d,false,false).adjustStock,false);assert.throws(()=>x.prepareHomeDoseConfirmation(empty,{...d,noStock:false},false,false));assert.throws(()=>x.prepareHomeDoseConfirmation(empty,d,false,true));});
 check('older slot preserves history only; no retrospective debit',()=>{const d={...x.initialHomeDoseDraft(empty),quantity:'1',code:'tablet',unitReviewed:true};assert.equal(x.prepareHomeDoseConfirmation(empty,d,true,false).adjustStock,false);});
 check('batch rejects individual stock opt-out',()=>assert.throws(()=>x.prepareHomeDoseConfirmation(empty,{...x.initialHomeDoseDraft(empty),quantity:'1',code:'tablet',unitReviewed:true,noStock:true},false,true)));
 check('switching owner person day or slot rejects frozen action',()=>{const slot={medicamentoId:'m',data:scope.data,horario:scope.horario};x.assertHomeReviewScope(empty,scope,slot);for(const change of [{user_id:'other'},{person_id:'other'}])assert.throws(()=>x.assertHomeReviewScope(empty,{...scope,...change},slot));assert.throws(()=>x.assertHomeReviewScope(empty,scope,{...slot,horario:'09:00'}));});
 check('sync metadata does not reset draft, changed quantity does',()=>{assert.equal(x.homeReviewKey(capture([row])),x.homeReviewKey(capture([{...row,synced:true}])));assert.notEqual(x.homeReviewKey(capture([row])),x.homeReviewKey(capture([{...row,quantidade:3}])));});
 check('linear index isolates slots by complete scope',()=>{const index=x.indexHomeReviewRows([row,{...row,id:'two',user_id:'other'},{...row,id:'three',horario:'09:00'}]);assert.deepEqual(x.rowsForHomeReview(index,scope),[row]);});
 check('real Home and modal wired to existing writer, scoped snapshots and frozen batch',()=>{const home=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'),modal=fs.readFileSync(path.join(root,'components/PendingDosesModal.tsx'),'utf8');assert(home.includes('assertHomeReviewScope(dose.review,scope,dose)'));assert(home.includes('expected:dose.review.expected,onlyIfPending:true'));assert(home.includes('unit:resolution.confirmation?.unit'));assert(home.includes('!MACRO02_PREMIUM_UI_ENABLED&&resolution.confirmation'));assert(modal.includes('reviewed=bulkTargets.map'));assert(modal.includes('setBulkTargets(availableDoses.map'));assert(modal.includes('prepareHomeDoseConfirmation(resolvedDose.review'));assert(modal.includes('failures.join'));});
 // Execute the actual Home event handler, not an independently rewritten approximation.
 const ts=require(process.env.VAULT_TYPESCRIPT||'typescript');
 const source=ts.createSourceFile('page.tsx',fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;function find(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='handleResolveDosePendente')handler=node.initializer;ts.forEachChild(node,find);}find(source);assert(handler);
 const compiled=ts.transpileModule('const handle='+handler.getText(source)+';return handle;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const actualTime=require(path.join(dir,'review-intent.js')).civilDoseInstant;
 const slot={medicamentoId:'m',data:scope.data,horario:scope.horario,review:empty};
 const actualUnit=units.declareDoseUnit('tablet','declared'),actualAt='2026-11-25T12:00:00Z';
 const confirmed={kind:'now',confirmedAt:actualAt,confirmation:{quantity:2,unit:actualUnit,adjustStock:true},requireRegisteredStock:true};
 function setup({savedPatch={},lock=false,foreign=false,fail=false,premium=true}={}){
  const writes=[],feedback=[],processing=[],lockRef={current:lock},scopeRef={current:foreign?{...scope,person_id:'foreign'}:scope};
  const repo={setStatus:async input=>{writes.push(input);if(fail)throw Error('write failed');return 'new';},getById:async()=>({id:'new',...scope,quantidade:2,...actualUnit,tomado_em:actualAt,...savedPatch})};
  const h=new Function('doseResolutionLockRef','setProcessandoDoseId','homeDoseScopeRef','assertHomeReviewScope','doseLogsRepository','civilDoseInstant','readDoseUnit','trigger','console','MACRO02_PREMIUM_UI_ENABLED','hoje',compiled)(lockRef,v=>processing.push(v),scopeRef,x.assertHomeReviewScope,repo,actualTime,units.readDoseUnit,v=>feedback.push(v),{error(){}},premium,scope.data);
  return {h,writes,feedback,processing,lockRef};
 }
 async function behavior(label,fn){await fn();n++;console.log('PASS '+label);}
 await behavior('Home actual handler confirms only matching readback',async()=>{const a=setup();await a.h(slot,confirmed);assert.equal(a.writes.length,1);assert.equal(a.writes[0].expected,null);assert.equal(a.writes[0].requireRegisteredStock,true);assert.deepEqual(a.feedback,['success']);assert.equal(a.lockRef.current,false);assert.equal(a.processing.at(-1),null);});
 await behavior('Home actual handler rejects contradictory or wrong-identity readback',async()=>{for(const savedPatch of [{id:'wrong'},{person_id:'other'},{quantidade:3},{tomado_em:'2026-11-25T13:00:00Z'},{unidade_dose:'drop'}]){const a=setup({savedPatch});await assert.rejects(a.h(slot,confirmed),/conferência/);assert.deepEqual(a.feedback,['error']);assert.equal(a.lockRef.current,false);}});
 await behavior('Home actual handler rejects overlap before writing and never emits success',async()=>{const a=setup({lock:true});await assert.rejects(a.h(slot,confirmed),/andamento/);assert.equal(a.writes.length,0);assert.equal(a.feedback.length,0);assert.equal(a.lockRef.current,true);});
 await behavior('Home actual handler rejects profile change and releases lock',async()=>{const a=setup({foreign:true});await assert.rejects(a.h(slot,confirmed),/Pessoa ou dose mudou/);assert.equal(a.writes.length,0);assert.equal(a.lockRef.current,false);});
 await behavior('Home actual handler propagates stock constraint and verifies no-take',async()=>{const a=setup({savedPatch:{tomado_em:undefined,ignorado_em:actualAt,motivo:'sem_estoque'}});await a.h(slot,{kind:'ignored',motivo:'sem_estoque',requireKnownEmptyStock:true});assert.equal(a.writes[0].requireKnownEmptyStock,true);assert.equal(a.writes[0].onlyIfPending,true);assert.equal(a.writes[0].adjustStock,false);assert.deepEqual(a.feedback,['success']);});
 await behavior('Home actual handler releases lock on writer failure without success',async()=>{const a=setup({fail:true});await assert.rejects(a.h(slot,confirmed),/write failed/);assert.deepEqual(a.feedback,['error']);assert.equal(a.lockRef.current,false);});
 await behavior('dormant actual Home handler writes legacy without fabricating a unit',async()=>{const a=setup({premium:false,savedPatch:{unidade_dose:undefined,unidade_dose_rotulo:undefined,fonte_unidade:undefined}});await a.h(slot,{kind:'now',confirmedAt:actualAt});assert.equal(a.writes[0].unit,undefined);assert.equal(a.writes[0].expected,null);assert.deepEqual(a.feedback,['success']);});
 await behavior('dormant actual Home handler refuses rather than drops explicit Premium declarations',async()=>{const a=setup({premium:false});await assert.rejects(a.h(slot,confirmed),/dormente/);assert.equal(a.writes.length,0);});
 console.log('MACRO02_HOME_REVIEW_PASS='+n);
}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
