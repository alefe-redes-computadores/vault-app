const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('fake-indexeddb/auto');const Dexie=require('dexie').default;
const db=new Dexie('vault-v163-stock-integrity');db.version(1).stores({medicamentos:'id,person_id,user_id',doseLogs:'id,medicamento_id,person_id,data,horario',syncQueue:'id'});
// Exercise the real upsert without loading app boot/auth infrastructure.
const source=ts.createSourceFile('db.ts',fs.readFileSync('lib/db/index.ts','utf8'),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='safeSetDoseLog');
assert(declaration);const transpiled=ts.transpileModule(declaration.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ex={};new Function('exports','db','nowIso','getLocalTodayISO','generateId',transpiled)(ex,db,()=>new Date().toISOString(),()=> '2026-10-14',()=>crypto.randomUUID());
let failQueue=false;const cache=new Map();
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,m);
 m.require=name=>{
 if(name==='@/lib/db')return {db,safeSetDoseLog:ex.safeSetDoseLog,safeUpdateMedicamento:async(id,p)=>db.medicamentos.update(id,p)};
 if(name==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:{id:'u'}},error:null})};
 if(name==='@/lib/supabase/client')return {supabase:{}};
 if(name==='@/lib/sync/enfileirarOperacao')return {enfileirarOperacao:async(table,action,row)=>{if(failQueue)throw Error('queue unavailable');await db.syncQueue.add({id:crypto.randomUUID(),table,action,row});}};
 return name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);};
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
(async()=>{
 const repo=load('lib/repositories/doseLogs.ts').doseLogsRepository;
 const med={id:'m',person_id:'p',user_id:'u',nome:'Synthetic SOS',status:'ativo',tipo_uso:'sos',estoque_quantidade:26,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1};await db.medicamentos.add(med);
 await repo.getAll('p','2026-10-15');await repo.getRecentQuantities('p','m',20);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,26,'read/open cannot lower stock');
 const id=await repo.registrarTomadaAvulsa({personId:'p',medicamentoId:'m',data:'2026-10-15',horario:'14:00',quantidade:2,doseKind:'sos'});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,24);const logs=await repo.getAll('p','2026-10-15');assert.equal(logs.length,1);assert.equal(logs[0].quantidade,2);assert.equal(logs[0].dose_kind,'sos');
 await repo.removeById({personId:'p',id});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,26,'SOS removal restores historical amount');
 failQueue=true;await assert.rejects(repo.registrarTomadaAvulsa({personId:'p',medicamentoId:'m',data:'2026-10-15',horario:'14:01',quantidade:2,doseKind:'sos'}),/queue unavailable/);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,26);assert.equal(await db.doseLogs.count(),0);failQueue=false;
 const input={personId:'p',medicamentoId:'m',data:'2026-10-15',horario:'10:00',status:'taken',quantidade:2};await Promise.all([repo.setStatus(input),repo.setStatus(input)]);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,24);assert.equal(await db.doseLogs.count(),1);await repo.setStatus({...input,status:'ignored'});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,26);
 const drops={...med,id:'drops',forma_farmaceutica:'gotas',formato:'gotas',estoque_unidade_medida:'ml',estoque_gotas_por_ml:20};await db.medicamentos.add(drops);await repo.registrarTomadaAvulsa({personId:'p',medicamentoId:'drops',data:'2026-10-15',horario:'14:02',quantidade:2,doseKind:'sos'});assert(Math.abs((await db.medicamentos.get('drops')).estoque_quantidade-25.9)<1e-8);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,26);
 const legacy=fs.readFileSync('components/saude/SOSDoseModal.tsx','utf8');assert(legacy.includes('doseLogsRepository.registrarTomadaAvulsa'));assert(!legacy.includes('safeUpdateMedicamento'));assert(!legacy.includes('safeSetDoseLog'));assert(!legacy.includes('toISOString().slice(0, 10)'));
 console.log('V163: read-only stock, 26→24 with one SOS log, reversal to26, atomic queue rollback, concurrent scheduled idempotence, taken→ignored reversal, drops/ml and legacy canonical writer passed');
})().finally(()=>db.delete()).catch(e=>{console.error(e);process.exitCode=1;});
