'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'lib/clinical-exams-m1/types.ts','lib/clinical-exams-m1/dependencies.ts',
 'lib/clinical-exams-m1/repository.ts','lib/clinical-exams-m1/sync.ts',
 'lib/db/index.ts','lib/types.ts','hooks/useSyncQueue.ts','lib/sync/pull.ts',
 'lib/sync/dependency-order.ts','scripts/test-v63-release-gate.mjs',
];
for(const p of paths){
 assert(fs.existsSync(p),`${p} não existe`);
 if(/\.tsx?$/.test(p)){
  const sf=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(sf.parseDiagnostics.length,0,`Syntax TS inválida ${p}`);
 }
}
const t=read(paths[0]),model=read('lib/db/index.ts'),sync=read('hooks/useSyncQueue.ts'),pull=read('lib/sync/pull.ts'),rep=read(paths[2]);
const tables=['exam_orders','exam_order_items','exam_sessions','exam_session_items','clinical_assets','clinical_asset_links','consultation_exam_order_links'];
assert(model.includes('this.version(49).stores('),'Dexie V49 aditivo obrigatório');
for(const table of tables){
 assert(t.includes(`'${table}'`),`Tipos sem ${table}`);
 assert(model.includes(`${table}!: Table<`),`Dexie sem ${table}`);
 assert(sync.includes(`case "${table}"`),`Push sem ${table}`);
 assert(pull.includes('CLINICAL_EXAM_TABLES_M1.map(table=>'),`Pull não cobre ${table}`);
}
assert(sync.includes('"exam_orders",\n                  "exam_order_items",\n                  "exam_sessions"'), 'ordem de push de FK não preservada');
assert(sync.includes('clinicalExamDependenciesM1(item)'), 'defer de dependências ausente');
assert(sync.includes('markRecordSyncedIfCurrent(db.exam_order_items'), 'ACK de item ausente');
assert(pull.includes('clinicalM1PullErrors.length>0'), 'pull sem fail closed');
assert(rep.includes('db.exam_sessions.add(session)')&&rep.includes('db.exam_session_items.add(link)'), 'sessões e vínculo ausentes');
assert(rep.includes('active)throw Error')&&rep.includes('!r.deleted_at'), 'sessão ativa duplicada não bloqueada localmente');
assert(rep.includes('enfileirarOperacao(')&&rep.includes("'rw'"), 'gravação offline não transacional');
assert(/db\.transaction\('rw',\s*\[\s*db\.persons,db\.consultas,db\.exam_orders,db\.exam_order_items,\s*db\.consultation_exam_order_links,db\.syncQueue,\s*\],async\(\)=>\{/.test(rep), 'Dexie exige array ao transacionar 6 tabelas; evitar TS2554 e transação incompleta');
assert(!/db\.exames\.(?:put|add|update|delete)/.test(rep)&&!/db\.careflow_events_m2\.(?:put|add|update|delete)/.test(rep),
  'repositório M1 não pode escrever em autoridades legadas');
assert(read(paths[3]).includes('nextAt<=remoteAt')&&read(paths[3]).includes("item.operation==='delete'"),
 'conflito offline/tombstones não protegidos');
assert(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m1-exames-offline.cjs'),
 'V63 não executa contrato M1');
// Run the dependency planner with controlled imports (not a mocked database).
const source=ts.transpileModule(read('lib/clinical-exams-m1/dependencies.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};
vm.runInNewContext(`(function(module,exports,require){${source}\n})`,{}, {timeout:2000})(mod,mod.exports,()=>({isClinicalExamTableM1:t=>tables.includes(t)}));
const deps=mod.exports.clinicalExamDependenciesM1;
const d=deps({table:'exam_session_items',operation:'add',payload:{id:'x',order_id:'o',exam_order_item_id:'i',session_id:'s'}});
assert.equal(d.length,3,'sessão deve depender de pedido, item e sessão');
assert(d.some(x=>x.table==='exam_orders'&&x.id==='o'),'pedido não rastreado');
assert.equal(deps({table:'clinical_asset_links',operation:'add',payload:{asset_id:'a',entity_type:'exam_order_item',entity_id:'i'}}).length,2,
 'arquivo compartilhado precisa verificar arquivo e item');
assert.equal(deps({table:'exam_order_items',operation:'delete',payload:{order_id:'o'}}).length,0,
 'delete físico não faz parte do fluxo');
console.log('M1_CONTRATOS_OK | 7 tabelas, Dexie V49, ordem FK, sync, tombstones, leitura legada preservada');
