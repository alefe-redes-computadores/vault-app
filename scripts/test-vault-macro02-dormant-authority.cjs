#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'macro02-dormant-'));
try{
 const src=path.join(root,'lib/dose-premium'),files=fs.readdirSync(src).filter(n=>n.endsWith('.ts')).map(n=>path.join(src,n));
 const tsc=process.env.VAULT_TSC_JS||path.join(root,'node_modules/typescript/lib/tsc.js');
 assert.equal(cp.spawnSync(process.execPath,[tsc,'--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',out,...files],{stdio:'inherit'}).status,0);
 for(const name of ['account-authority','authority-session','dormant-release-authority','r2-transport','receipt-recovery','transaction-routing'])assert.equal(cp.spawnSync(process.execPath,[path.join(__dirname,'macro02-tests',name+'.cjs'),['account-authority','transaction-routing'].includes(name)?path.join(out,'account-authority.js'):out],{stdio:'inherit'}).status,0,name);
 const {inspectClinicalBackupEvidence}=require(path.join(out,'clinical-backup-evidence.js'));
 const user_id='account-a',row={id:'queue-a',table:'doseLogs',operation:'update',chave:'dose:a',payload:{user_id,id:'dose-a',person_id:'person-a'}},raw={user_id,macro02_clinical_outbox:{version:1,user_id,mode:'evidence_only_no_replay',rows:[row]}};
 assert.equal(inspectClinicalBackupEvidence(raw,user_id,[]).legacy,1);
 assert.equal(inspectClinicalBackupEvidence(raw,user_id,[]).allowsMutation,false);
 assert.equal(inspectClinicalBackupEvidence({user_id},user_id,[]).complete,false);
 for(const rows of [[row,row],[{...row,payload:{...row.payload,user_id:'other'}}],[{...row,table:'credentials'}],[{...row,payload:{...row.payload,macro02_atomic:{}}}]])assert.throws(()=>inspectClinicalBackupEvidence({...raw,macro02_clinical_outbox:{...raw.macro02_clinical_outbox,rows}},user_id,[]));
 console.log('MACRO02_CLINICAL_OUTBOX_EVIDENCE=7 PASS');
 // Verify that the actual dormant selector resolves to the real legacy UI, and
 // the Premium source remains available for a separately certified activation.
 const ts=require('typescript');
 for(const [rel,exported,legacy] of [['app/hoje/page.tsx','HojePage','DormantHojePage'],['components/saude/QuickDoseModal.tsx','QuickDoseModal','DormantQuickDoseModal'],['components/saude/SOSDoseModal.tsx','SOSDoseModal','DormantSOSDoseModal'],['components/PendingDosesModal.tsx','PendingDosesModal','DormantPendingDosesModal'],['app/saude/medicamentos/revisao-retroativa/page.tsx','RetroBatchReviewPage','DormantRetroBatchReviewPage']]){
  const text=fs.readFileSync(path.join(root,rel),'utf8');const ast=ts.createSourceFile(rel,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(ast.parseDiagnostics.length,0,rel);
  assert(text.includes('useMacro02ModeR5'),rel);assert(text.includes('<'+legacy),rel);assert(text.includes('Premium'),rel);assert(text.includes("mode==='premium'"),rel);assert(text.includes('Macro02AuthorityHoldR5'),rel);
 }
 assert.equal(require(path.join(out,'dormant-release-authority.js')).MACRO02_PREMIUM_UI_ENABLED,false);
 console.log('MACRO02_ACCOUNT_UI_SELECTOR_STATIC=5 PASS (not browser QA)');
 console.log('MACRO02_DORMANT_AUTHORITY_GATE_OK');
}finally{fs.rmSync(out,{recursive:true,force:true});}
