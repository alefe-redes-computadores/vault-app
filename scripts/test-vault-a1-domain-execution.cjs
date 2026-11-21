'use strict';
/** Real execution of A1's TypeScript repository with a minimal in-memory Dexie contract.
 * No real account, clinical data, SQL writes, stock or network involved. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {webcrypto}=require('node:crypto');
function moduleJs(file,dependencies){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};const scope={module,exports:module.exports,crypto:webcrypto,Date,require:(s)=>{
  if(!Object.prototype.hasOwnProperty.call(dependencies,s))throw Error(`Dependency not allowed in test: ${s}`);
  return dependencies[s];
 }};
 vm.runInNewContext(js,scope,{filename:file});return module.exports;
}
class Table{
 constructor(items=[]){this.items=new Map(items.map(x=>[x.id,x]));}
 get(id){return Promise.resolve(this.items.get(id));}
 add(row){if(this.items.has(row.id))throw Error('duplicate id');this.items.set(row.id,structuredClone(row));return Promise.resolve(row.id);}
 where(field){const table=this;return {equals(value){let result=[...table.items.values()].filter(x=>x[field]===value);return {toArray:async()=>structuredClone(result),filter(fn){result=result.filter(fn);return {toArray:async()=>structuredClone(result),first:async()=>structuredClone(result[0])}},first:async()=>structuredClone(result[0])}}}}
}
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const med={id:'m',user_id:uid,person_id:pid,nome:'Exemplo'};
const db={
 tratamentos:new Table([{id:'t',user_id:uid,person_id:pid,nome:'Acompanhamento'}]),
 medicos:new Table([{id:'p',user_id:uid,nome:'Profissional de exemplo'}]),
 renovacoes:new Table([
  {id:'rx1',user_id:uid,person_id:pid,medicamento_id:'m',data:'2024-01-01',quantidade:null,preco:null,tipo_aquisicao:null,data_aquisicao:null},
  {id:'rx2',user_id:uid,person_id:pid,medicamento_id:'m',data:'2024-02-01',quantidade:null,preco:null,tipo_aquisicao:null,data_aquisicao:null},
  {id:'rx3',user_id:uid,person_id:pid,medicamento_id:'m',data:'2024-02-01',quantidade:null,preco:null,tipo_aquisicao:null,data_aquisicao:null},
  {id:'rx4',user_id:uid,person_id:pid,medicamento_id:'m',data:'2024-02-01',quantidade:null,preco:null,tipo_aquisicao:null,data_aquisicao:null},
  {id:'buy',user_id:uid,person_id:pid,medicamento_id:'m',data:'2024-03-01',quantidade:10,preco:20,tipo_aquisicao:'comprado',data_aquisicao:'2024-03-01'}
 ]),
 medicamentos:new Table([med]),
 fornecimentos:new Table([{id:'s',user_id:uid,person_id:pid,titulo:'Fornecimento de exemplo'}]),
 farmacias:new Table([{id:'f',user_id:uid,nome:'Farmácia'}]),
 locais:new Table([{id:'l',user_id:uid,nome:'Clínica'}]),
 a1_treatment_phases:new Table(),a1_prescription_links:new Table(),a1_supply_locations:new Table(),syncQueue:new Table(),
 transaction:async (_mode,_tables,fn)=>fn()
};
const types=moduleJs('lib/clinical-a1/types.ts',{});
const queue=[];
const r=moduleJs('lib/clinical-a1/repository.ts',{
 '@/lib/db':{db},
 '@/lib/sync/enfileirarOperacao':{enfileirarOperacao:async(table,operation,row)=>{queue.push({table,operation,row});},solicitarProcessamentoSync:()=>{}},
 '@/lib/health-supply/renewal-event':{isPrescriptionOnly:e=>!e.tipo_aquisicao&&!e.data_aquisicao&&e.quantidade==null&&e.preco==null},
 '@/lib/health-supply/a3-historical-locations':moduleJs('lib/health-supply/a3-historical-locations.ts',{}),
 './types':types
}).clinicalA1Repository;
async function rejected(action,contains){await assert.rejects(action,e=>String(e.message).includes(contains));}
(async()=>{
 await r.recordPhase({userId:uid,personId:pid,treatmentId:'t',tipo:'pausa',data:'2024-02-20',origem:'relato_pessoal',professionalId:'p',titulo:'Pausa informada'});
 assert.equal(db.a1_treatment_phases.items.size,1);
 await rejected(()=>r.recordPhase({userId:uid,personId:'outro',treatmentId:'t',tipo:'inicio',data:'2024-02-20',origem:'relato_pessoal',titulo:'Vínculo indevido'}),'outra pessoa');
 await rejected(()=>r.recordPhase({userId:uid,personId:pid,treatmentId:'t',tipo:'pausa',data:'9999-12-31',origem:'relato_pessoal',titulo:'Registro futuro'}),'não realizado');
 await r.linkPrescriptions({userId:uid,personId:pid,medicationId:'m',previousId:'rx1',currentId:'rx2',tipo:'renovacao',origem:'documento_revisado'});
 assert.equal(db.a1_prescription_links.items.size,1);
 await rejected(()=>r.linkPrescriptions({userId:uid,personId:pid,medicationId:'m',previousId:'rx1',currentId:'rx2',tipo:'renovacao',origem:'relato_pessoal'}),'já possui vínculo');
 await rejected(()=>r.linkPrescriptions({userId:uid,personId:pid,medicationId:'m',previousId:'rx2',currentId:'buy',tipo:'renovacao',origem:'relato_pessoal'}),'apenas receitas');
 await r.linkPrescriptions({userId:uid,personId:pid,medicationId:'m',previousId:'rx3',currentId:'rx4',tipo:'renovacao',origem:'relato_pessoal'});
 await rejected(()=>r.linkPrescriptions({userId:uid,personId:pid,medicationId:'m',previousId:'rx4',currentId:'rx3',tipo:'renovacao',origem:'relato_pessoal'}),'formaria um ciclo');
 await r.registerSupplyLocation({userId:uid,personId:pid,processId:'s',farmaciaId:'f',startOn:'2024-04-05',origem:'relato_pessoal'});
 assert.equal(db.a1_supply_locations.items.size,1);
 await rejected(()=>r.registerSupplyLocation({userId:uid,personId:pid,processId:'s',farmaciaId:'f',startOn:'2024-04-05',origem:'relato_pessoal'}),'Já existe');
 await rejected(()=>r.registerSupplyLocation({userId:uid,personId:pid,processId:'s',farmaciaId:'f',localId:'l',startOn:'2024-04-06',origem:'relato_pessoal'}),'não ambos');
 assert.deepEqual([...db.medicamentos.items.values()],[med]);
 assert.equal(queue.length,4);assert.deepEqual(queue.map(q=>q.table),['a1_treatment_phases','a1_prescription_links','a1_prescription_links','a1_supply_locations']);
 assert(types.validCivilDate('2024-02-29')&&!types.validCivilDate('2026-02-30'));
 console.log('VAULT_A1_DOMINIO_EXECUCAO_OK | 4 transações+fila | isolamento/duplicata/ciclos/data/aquisição+estoque intacto');
})().catch(e=>{console.error(e);process.exitCode=1});
