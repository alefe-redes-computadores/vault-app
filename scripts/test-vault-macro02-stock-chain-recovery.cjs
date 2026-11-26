#!/usr/bin/env node
'use strict';
// Real pure contracts and causal snapshots. PostgreSQL/Dexie/physical QA separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'vault-macro02-chain-'));
try{
 const sources=fs.readdirSync(path.join(root,'lib/dose-premium')).filter(f=>f.endsWith('.ts')).map(f=>path.join(root,'lib/dose-premium',f));const tsc=process.env.VAULT_TSC_JS||path.join(root,'node_modules/typescript/lib/tsc.js'),args=['--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',out,...sources];assert.equal(cp.spawnSync(fs.existsSync(tsc)?process.execPath:'tsc',fs.existsSync(tsc)?[tsc,...args]:args,{stdio:'inherit'}).status,0);
 const {parseStockAtomicIntent,parseAtomicIntent,atomicQueueKey,medicationPending,assertAtomicAck,nextAtomicPosition}=require(path.join(out,'atomic-envelope.js'));
 const {validateMacro02Backup}=require(path.join(out,'backup-contract.js')), {captureStockCount}=require(path.join(out,'stock-cycle.js')), {acquisitionWire,withdrawalReceiptWire}=require(path.join(out,'acquisition-wire.js')), {observedStockContext}=require(path.join(out,'stock-context.js'));
 const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;const u=uuid(1),p=uuid(2),m=uuid(3),day='2026-11-25',t=n=>`${day}T${String(n).padStart(2,'0')}:00:00Z`,scope={user_id:u,person_id:p,medicationId:m};
 const med=(n,cycle,at)=>({id:m,user_id:u,person_id:p,estoque_quantidade:n,estoque_ciclo_id:cycle,estoque_unidade_medida:'comprimidos',estoque_data_referencia:day,updated_at:t(at)});
 const a=med(10,uuid(4),8),b=med(9,uuid(4),9),c=med(6,uuid(5),10),d=med(8,uuid(5),11);
 const dose={id:uuid(6),user_id:u,person_id:p,medicamento_id:m,data:day,horario:'08:00',quantidade:1,tomado_em:t(9),dose_kind:'scheduled',unidade_dose:'tablet',unidade_dose_rotulo:null,fonte_unidade:'declared',created_at:t(9),updated_at:t(9),estoque_movimento:{state:'applied',receipt:{...scope,doseId:uuid(6),basis:uuid(4),unit:'tablet',amount:1,appliedAt:t(9)}}};
 const st=row=>observedStockContext(row,scope),common=(before,after,operationId,sequence,predecessor)=>({operationId,sequence,predecessor,stockBefore:st(before),stockAfter:st(after),stockRevisionBefore:before.updated_at,stockRevisionAfter:after.updated_at,stockReferenceAfter:day});
 const i1=parseAtomicIntent({version:1,...common(a,b,uuid(10),1,null),previous:null,after:dose,delta:1});
 const count=(before,after,op,seq,pred)=>({version:2,mode:'count',...common(before,after,op,seq,pred),previous:null,after:null,beforeCount:captureStockCount(before),afterCount:captureStockCount(after),acquisition:null,countedCurrentStock:after.estoque_quantidade,initialStockQuantity:null});
 const i2=parseStockAtomicIntent(count(b,c,uuid(11),2,uuid(10)));
 const acq=acquisitionWire({id:uuid(7),user_id:u,person_id:p,medicamento_id:m,data:day,data_aquisicao:day,quantidade:2,created_at:t(11),updated_at:t(11)});
 const w0=withdrawalReceiptWire({id:uuid(8),user_id:u,person_id:p,medicamento_id:m,status:'agendada',updated_at:t(8)}),w1={...w0,status:'realizada',renovacao_realizada_id:acq.id,quantidade_retirada:2,realizada_em:t(11),updated_at:t(11)};
 const i3=parseStockAtomicIntent({version:2,mode:'acquisition',...common(c,d,uuid(12),3,uuid(11)),previous:null,after:null,beforeCount:captureStockCount(c),afterCount:captureStockCount(d),acquisition:acq,countedCurrentStock:null,initialStockQuantity:null,medicationPatch:{tipo_aquisicao:'comprado'},withdrawalId:w0.id,withdrawalBefore:w0,withdrawalAfter:w1});
 const queue=(i)=>({table:i.version===1?'doseLogs':i.mode==='acquisition'?'renovacoes':'medicamentos',operation:'update',chave:atomicQueueKey(i),payload:{...(i.version===1?i.after:i.mode==='acquisition'?i.acquisition:{id:m,user_id:u,person_id:p}),macro02_atomic:i}});
 const rows=[i1,i2,i3].map(queue);const ack={version:2,operationId:i3.operationId,stock:i3.stockAfter,stockRevision:i3.stockRevisionAfter,stockReference:day,stockSnapshot:i3.afterCount,acquisition:acq,medicationPatch:i3.medicationPatch,withdrawal:w1};let n=0;function check(label,f){f();n++;console.log('PASS '+label);}
 check('dose, recount and acquisition share a single ordered chain',()=>assert.deepEqual(medicationPending(rows.toReversed(),scope).map(i=>i.operationId),[uuid(10),uuid(11),uuid(12)]));
 check('old dose receipt survives cycle rotation; chain starts from verified latest count',()=>{assert.equal(i1.after.estoque_movimento.receipt.basis,uuid(4));assert.equal(i3.stockAfter.basis,uuid(5));assert.deepEqual(nextAtomicPosition(rows,st(d),d.updated_at),{sequence:4,predecessor:uuid(12)});});
 check('broken causal predecessor rejected',()=>assert.throws(()=>medicationPending([rows[0],rows[2]],scope)));
 check('count cannot change conversion or reuse cycle',()=>{assert.throws(()=>parseStockAtomicIntent({...i2,afterCount:{...i2.afterCount,estoque_gotas_por_ml:30}}));assert.throws(()=>parseStockAtomicIntent(count(b,{...c,estoque_ciclo_id:b.estoque_ciclo_id},uuid(11),2,uuid(10))));});
 check('acquisition with unknown balance preserves unknown rather than zero',()=>{const before=med(null,null,8),after=med(null,null,11);const v={...i3,...common(before,after,uuid(20),1,null),beforeCount:captureStockCount(before),afterCount:captureStockCount(after),withdrawalId:null,withdrawalBefore:null,withdrawalAfter:null};assert.equal(parseStockAtomicIntent(v).stockAfter.balance,null);assert.throws(()=>parseStockAtomicIntent({...v,stockAfter:st({...after,estoque_quantidade:2}),afterCount:captureStockCount({...after,estoque_quantidade:2})}));});
 check('no silent acquisition balance discrepancy',()=>assert.throws(()=>parseStockAtomicIntent({...i3,stockAfter:st({...d,estoque_quantidade:7}),afterCount:captureStockCount({...d,estoque_quantidade:7})})));
 check('withdrawal scoped to same medication and exact acquisition',()=>{assert.throws(()=>parseStockAtomicIntent({...i3,withdrawalAfter:{...w1,person_id:uuid(999)}}));assert.throws(()=>parseStockAtomicIntent({...i3,withdrawalAfter:{...w1,renovacao_realizada_id:uuid(999)}}));});
 check('stock ACK must include actual withdrawal, acquisition and metadata',()=>{assert.equal(assertAtomicAck(i3,ack),ack);for(const bad of [{withdrawal:null},{acquisition:{...acq,quantidade:4}},{medicationPatch:{}},{stockSnapshot:{...i3.afterCount,estoque_ciclo_id:uuid(9)}}])assert.throws(()=>assertAtomicAck(i3,{...ack,...bad}));});
 const backup={userId:u,persons:[{id:p,user_id:u}],medications:[d],doses:[dose],acquisitions:[acq],withdrawals:[w1],queue:rows};
 check('backup retains exact intents without replaying movements',()=>{const x=validateMacro02Backup(backup);assert.equal(x.mode,'evidence_only_no_replay');assert.equal(x.pendingCount,3);assert.deepEqual(x.pending,rows);});
 check('backup rejects missing dose, acquisition, and changed balance',()=>{for(const bad of [{doses:[]},{acquisitions:[]},{withdrawals:[]},{medications:[c]},{persons:[]}])assert.throws(()=>validateMacro02Backup({...backup,...bad}));});
 check('foreign account queue never exported',()=>{const q={...rows[0],payload:{...rows[0].payload,user_id:uuid(999)}};assert.equal(validateMacro02Backup({...backup,queue:[...rows,q]}).pendingCount,3);});
 const adjusted={...d,estoque_ciclo_id:null,estoque_unidade_medida:'mL',estoque_gotas_por_ml:20,estoque_quantidade:5,updated_at:t(12)};
 const change={version:2,mode:'adjustment',...common(d,adjusted,uuid(14),4,uuid(12)),previous:null,after:null,beforeCount:captureStockCount(d),afterCount:captureStockCount(adjusted),acquisition:null,countedCurrentStock:null,initialStockQuantity:null};
 check('unit adjustment is a causal event and invalidates, never creates, a cycle',()=>{const i4=parseStockAtomicIntent(change);assert.equal(i4.stockAfter.unit,'ml');assert.equal(i4.stockAfter.basis,'');assert.equal(medicationPending([...rows,queue(i4)],scope).length,4);assert.equal(atomicQueueKey(i4),`medicamentos:${m}:macro02:${uuid(14)}`);});
 check('adjustment rejects cycle reuse, bogus conversion and injected acquisition',()=>{for(const bad of [{stockAfter:{...change.stockAfter,basis:uuid(5)},afterCount:{...change.afterCount,estoque_ciclo_id:uuid(5)}},{afterCount:{...change.afterCount,estoque_gotas_por_ml:0}},{acquisition:acq},{countedCurrentStock:5}])assert.throws(()=>parseStockAtomicIntent({...change,...bad}));});
 const recover=require(path.join(out,'backup-recovery.js')), exported=validateMacro02Backup(backup);
 const file={version:'3.0',user_id:u,persons:backup.persons,medicamentos:backup.medications,dose_logs:backup.doses,renovacoes:backup.acquisitions,retiradas:backup.withdrawals,macro02_recovery:exported};
 check('backup recovery reuses exact original pending IDs only',()=>{const read=recover.readMacro02RecoveryFile(file,u);assert.deepEqual(read.pending,rows);assert.deepEqual(recover.planMacro02QueueRecovery({...backup,queue:[rows[2]]},read.pending),rows.slice(0,2));assert.deepEqual(recover.planMacro02QueueRecovery(backup,read.pending),[]);});
 check('backup recovery rejects cross-account, divergent stock, newer pending and synced local state',()=>{assert.throws(()=>recover.readMacro02RecoveryFile(file,uuid(90)));assert.throws(()=>recover.planMacro02QueueRecovery({...backup,medications:[c],queue:[]},rows));assert.throws(()=>recover.planMacro02QueueRecovery({...backup,queue:[{...rows[2],chave:'new'}]},rows));assert.throws(()=>recover.planMacro02QueueRecovery({...backup,medications:[{...d,synced:true}],queue:[]},rows));assert.throws(()=>recover.planMacro02QueueRecovery({...backup,doses:[],queue:[]},rows));});
 check('import rejects duplicate and foreign clinical identities before planning',()=>{
  for(const key of ['persons','medicamentos','dose_logs','renovacoes','retiradas']){
   const row=file[key][0];assert.throws(()=>recover.readMacro02RecoveryFile({...file,[key]:[...file[key],{...row}]},u),/Identidade duplicada/);
   assert.throws(()=>recover.readMacro02RecoveryFile({...file,[key]:[...file[key],{...row,id:uuid(91),user_id:uuid(99)}]},u),/fora da conta/);
   assert.throws(()=>recover.readMacro02RecoveryFile({...file,[key]:[...file[key],{...row,id:undefined}]},u),/Identidade duplicada/);
  }
 });
 check('legacy historical fact without person or live medication remains readable',()=>{
  const legacy={id:uuid(92),user_id:u,medicamento_id:uuid(93),data:day,horario:'12:00'};
  assert.equal(recover.readMacro02RecoveryFile({...file,dose_logs:[...file.dose_logs,legacy]},u).pendingCount,3);
 });
 assert.equal(cp.spawnSync(process.execPath,[path.join(__dirname,'macro02-tests/receipt-recovery.cjs'),out],{stdio:'inherit'}).status,0,'Macro02 receipt import classification failed');
 for(const name of ['account-authority','transaction-routing','authority-session'])assert.equal(cp.spawnSync(process.execPath,[path.join(__dirname,'macro02-tests',name+'.cjs'),name==='authority-session'?out:path.join(out,'account-authority.js')],{stdio:'inherit'}).status,0,'Macro02 authority contract failed: '+name);
 assert.equal(cp.spawnSync(process.execPath,[path.join(__dirname,'macro02-tests/r2-transport.cjs'),out],{stdio:'inherit'}).status,0,'Macro02 R2 transport failed');
 console.log('MACRO02_STOCK_CHAIN_RECOVERY_PASS='+n);
}finally{fs.rmSync(out,{recursive:true,force:true});}
