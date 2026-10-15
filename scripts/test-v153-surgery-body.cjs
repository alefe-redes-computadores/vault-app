const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('fake-indexeddb/auto');const Dexie=require('dexie').default;
const db=new Dexie('vault-v153-isolated-surgery');db.version(1).stores({persons:'id,user_id',cirurgias:'id,person_id,user_id',syncQueue:'id,chave'});
let userId='u',failQueue=false;const cache=new Map();
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,m);m.require=name=>{
 if(name==='@/lib/db')return {db};
 if(name==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:userId?{id:userId}:null}})};
 return name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);};m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}

(async()=>{
 const anatomy=load('lib/surgery-body.ts'),{normalizeSurgeryBody:normalize,surgeryBodyLabel:label}=anatomy;
 assert.deepEqual(normalize({}),{regiao_corporal:null,lateralidade:null});
 assert.deepEqual(normalize({regiao_corporal:'punho',lateralidade:'esquerda'}),{regiao_corporal:'punho',lateralidade:'esquerda'});
 assert.deepEqual(normalize({},{regiao_corporal:'punho',lateralidade:'esquerda'}),{regiao_corporal:'punho',lateralidade:'esquerda'});
 assert.deepEqual(normalize({regiao_corporal:null},{regiao_corporal:'punho',lateralidade:'esquerda'}),{regiao_corporal:null,lateralidade:null});
 assert.deepEqual(normalize({regiao_corporal:'joelho'},{regiao_corporal:'punho',lateralidade:'esquerda'}),{regiao_corporal:'joelho',lateralidade:null});
 assert.throws(()=>normalize({lateralidade:'direita'}),/Selecione a região/);
 assert.throws(()=>normalize({regiao_corporal:'inventada'}),/região/);
 assert.throws(()=>normalize({regiao_corporal:'punho',lateralidade:'__proto__'}),/lado/);
 assert.equal(anatomy.readSurgeryRegion('__proto__'),null);
 assert.equal(label({regiao_corporal:'punho',lateralidade:'esquerda'}),'Punho · lado esquerdo');
 assert.equal(label({regiao_corporal:'olho',lateralidade:'bilateral'}),'Olho · ambos os lados');
 assert.equal(label({regiao_corporal:'punho'}),'Punho · lado não informado');assert.equal(label({}),null);

 await db.persons.bulkAdd([{id:'p',user_id:'u'},{id:'foreign-person',user_id:'v'}]);
 db.syncQueue.hook('creating',()=>{if(failQueue)throw new Error('queue unavailable');});
 db.syncQueue.hook('updating',()=>{if(failQueue)throw new Error('queue unavailable');});
 const migration=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_vault_surgery_body_location_v153.sql'));assert(migration);const sql=fs.readFileSync('supabase/migrations/'+migration,'utf8');
 for (const [field,values] of [['regiao_corporal',Object.keys(anatomy.SURGERY_REGIONS)],['lateralidade',Object.keys(anatomy.SURGERY_SIDES)]]) {const found=sql.match(new RegExp(field+' IN \\(([^)]+)\\)'));assert(found,field);assert.deepEqual(found[1].split(',').map(x=>x.trim().replaceAll("'",'')),values);}
 const repo=load('lib/repositories/cirurgias.ts').cirurgiasRepository;
 const input={person_id:'p',procedimento:'Procedimento informado',data:'2026-10-20',status:'agendada',observacoes:'Orientação original'};
 const id=await repo.create({...input,regiao_corporal:'punho',lateralidade:'esquerda'});
 let row=await db.cirurgias.get(id),queue=await db.syncQueue.where('chave').equals('cirurgias:'+id).first();
 assert.equal(row.lateralidade,'esquerda');assert.equal(queue.payload.regiao_corporal,'punho');assert.equal(queue.payload.user_id,'u');assert.equal(queue.payload.synced,undefined);
 await db.syncQueue.clear(); // Simulate a completed initial sync; update must work without merging a previous add.
 await repo.update(id,'p',{lateralidade:'direita'});
 queue=await db.syncQueue.where('chave').equals('cirurgias:'+id).first();
 assert.equal(queue.operation,'update');assert.equal(queue.payload.procedimento,input.procedimento);assert.equal(queue.payload.data,input.data);assert.equal(queue.payload.user_id,'u');assert.equal(queue.payload.person_id,'p');assert.equal(queue.payload.lateralidade,'direita');
 await repo.update(id,'p',{status:'realizada'});assert.equal((await db.cirurgias.get(id)).regiao_corporal,'punho');
 await repo.update(id,'p',{regiao_corporal:null});row=await db.cirurgias.get(id);queue=await db.syncQueue.where('chave').equals('cirurgias:'+id).first();
 assert.equal(row.regiao_corporal,null);assert.equal(row.lateralidade,null);assert.equal(queue.payload.regiao_corporal,null);assert.equal(queue.payload.lateralidade,null);assert.equal(row.observacoes,input.observacoes);
 await assert.rejects(repo.create({...input,person_id:'foreign-person'}),/Pessoa não pertence/);
 await db.cirurgias.add({...row,id:'corrupt-owner',user_id:'v'});assert.equal(await repo.getById('corrupt-owner','p'),undefined);assert.equal((await repo.getAll('p')).length,1);
 userId='v';await assert.rejects(repo.update(id,'p',{lateralidade:'esquerda'}),/Pessoa não pertence/);await assert.rejects(repo.delete(id,'p'),/Pessoa não pertence/);userId='u';
 failQueue=true;await assert.rejects(repo.update(id,'p',{regiao_corporal:'punho',lateralidade:'esquerda'}),/queue unavailable/);assert.equal((await db.cirurgias.get(id)).regiao_corporal,null);await assert.rejects(repo.create({...input,regiao_corporal:'olho',lateralidade:'bilateral'}),/queue unavailable/);assert.equal(await db.cirurgias.count(),2);failQueue=false;
 userId='';await assert.rejects(repo.getById(id,'p'),/não autenticado/);userId='u';

 // Execute the actual surgery worker closure with a capturing Supabase client.
 const source=ts.createSourceFile('worker.ts',fs.readFileSync('hooks/useSyncQueue.ts','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let initializer;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='syncCirurgia')initializer=n.initializer.getText(source);ts.forEachChild(n,visit);}visit(source);assert(initializer);
 let pushed,remoteError=null;
 const client={from:table=>{assert.equal(table,'cirurgias');return {upsert:async payload=>{pushed=payload;return {error:remoteError};}};}};
 const code=ts.transpileModule('const sync = '+initializer,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+';return sync;';
 const sync=new Function('requireSupabase','requirePersonId','requirePayloadId',code)(()=>client,p=>{if(!p)throw Error('missing person');return p;},item=>item.payload.id);
 await sync(queue);assert.equal(pushed.regiao_corporal,null);assert.equal(pushed.lateralidade,null);assert.equal(pushed.procedimento,input.procedimento);
 await sync({...queue,payload:{...queue.payload,regiao_corporal:'punho',lateralidade:'esquerda'}});assert.equal(pushed.lateralidade,'esquerda');
 const legacy={...queue.payload};delete legacy.regiao_corporal;delete legacy.lateralidade;await sync({...queue,payload:legacy});assert(!Object.hasOwn(pushed,'regiao_corporal'));assert(!Object.hasOwn(pushed,'lateralidade'));
 remoteError={message:'simulated failure'};await assert.rejects(sync(queue),/simulated failure/);
 console.log('V153: optional anatomy/laterality validation, create/edit/clear, real Dexie repository and queue merge, complete update snapshot, account ownership and rollback, real worker field serialization/null/legacy/error passed.');
})().finally(()=>db.delete()).catch(error=>{console.error(error);process.exitCode=1;});
