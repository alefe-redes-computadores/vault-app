const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));m.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);m._compile(ts.transpileModule(read(filename),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}

const {summarizePersonalVault,belongsToActiveVault}=load('lib/personal-vault-overview.ts');
const base={created_at:'',updated_at:'',synced:true};
const credentials=[{...base,id:'c1',user_id:'u',person_id:'p',title:'A',password_encrypted:'x',category:'outros'},{...base,id:'c2',user_id:'u',person_id:'other',title:'B',password_encrypted:'x',category:'outros'},{...base,id:'c3',user_id:'foreign',person_id:'p',title:'C',password_encrypted:'x',category:'outros'}];
const cards=[{...base,id:'card',user_id:'u',person_id:'p',title:'Card',bank_name:'Bank',type:'cartao_credito'},{...base,id:'account',user_id:'u',person_id:'p',title:'Account',bank_name:'Bank',type:'conta_digital'},{...base,id:'foreign-card',user_id:'u',person_id:'other',title:'Other',bank_name:'Bank',type:'cartao_debito'}];
const documents=[{...base,id:'d1',user_id:'u',person_id:'p',title:'Fav',is_favorite:true},{...base,id:'d2',user_id:'u',person_id:'p',title:'Normal',is_favorite:false},{...base,id:'d3',user_id:'u',person_id:'other',title:'Other',is_favorite:true}];
assert.deepEqual(summarizePersonalVault('u','p',credentials,cards,documents),{credentials:1,cards:1,accounts:1,favoriteDocuments:1,total:4});
assert.equal(belongsToActiveVault({user_id:'u',person_id:'p'},'u','p'),true);
assert.equal(belongsToActiveVault({user_id:'u',person_id:'other'},'u','p'),false);

const db=read('lib/db/index.ts');
assert(db.includes('this.version(43).stores({'));
for(const table of ['documents','medicamentos','credentials','bankCards']) assert(new RegExp(`${table}:[\\s\\S]{0,220}\\[user_id\\+person_id\\]`).test(db),`${table} needs owner compound index`);

const more=read('app/mais/page.tsx');
assert(more.includes('db.medicamentos.where("[user_id+person_id]").equals(owner)'));
assert(more.includes('db.documents.where("[user_id+person_id]").equals(owner)'));
assert(more.includes('db.credentials.where("[user_id+person_id]").equals(owner)'));
assert(more.includes('db.bankCards.where("[user_id+person_id]").equals(owner)'));
assert(!more.includes('() => db.medicamentos.toArray()'),'Mais must not load every person medication');
assert(!more.includes('() => db.documents.toArray()'),'Mais must not load every person document');
assert(!more.includes('window.location.reload()'),'reactive sync must not force a reload');
assert(more.includes('Selecione uma pessoa antes de ativar os lembretes.'));
assert(more.includes('{vaultOverview.total} itens desta pessoa'));

const cardHook=read('hooks/usePaginatedCards.ts'),credentialHook=read('hooks/usePaginatedCredentials.ts');
assert(cardHook.includes('.where("[user_id+person_id]")'));
assert(credentialHook.includes('.where("[user_id+person_id]")'));
assert(read('app/contas/page.tsx').includes('includeLegacyWithoutPerson:'));

const avatar=read('components/saude/HealthAvatar3D.tsx');
for(const marker of ['V205: a faixa inferior','const capBand=','const brim=','const earHook=','const nosePad=','const gripKnuckle=']) assert(avatar.includes(marker),`avatar marker missing: ${marker}`);
assert(!avatar.includes('requestAnimationFrame(animate)'));

for(const file of ['app/mais/page.tsx','components/saude/HealthAvatar3D.tsx','hooks/usePaginatedCards.ts','hooks/usePaginatedCredentials.ts']){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,`syntax error: ${file}`);
}
console.log('V205 OK: person-scoped vault, notification source isolation, compound indexes, reactive sync and static avatar refinements');

assert(more.includes('activeVaultData?.userId === user.id && activeVaultData?.personId === activePersonId'),'pending live query must not expose previous owner data');
assert(more.includes('!activePersonId || !vaultDataReady'),'notification activation must wait for the matching context');
assert(cardHook.includes('row.user_id === user?.id'));
assert(credentialHook.includes('row.user_id === user?.id'));
assert(avatar.includes('materials.capShade.color.set(value.hatColor).multiplyScalar(.58)'));

// Exercise the additive index upgrade against real IndexedDB semantics.
(async()=>{
 require('fake-indexeddb/auto');
 if(typeof globalThis.CustomEvent==='undefined')globalThis.CustomEvent=class CustomEvent extends Event{};
 const Dexie=require('dexie');
 const match=db.match(/this.version\(43\).stores\((\{[\s\S]*?\})\);/);
 assert(match,'V43 schema missing');
 const schema=Function('return ('+match[1]+')')();
 const previous=Object.fromEntries(Object.entries(schema).map(([key,value])=>[key,value.replace(', [user_id+person_id]','')]));
 const name='vault-v205-test-'+process.pid;
 const before=new Dexie(name);before.version(42).stores(previous);await before.open();
 for(const key of Object.keys(schema))await before.table(key).bulkPut([{id:'owned',user_id:'u',person_id:'p'},{id:'other',user_id:'u',person_id:'q'},{id:'legacy',user_id:'u'},{id:'foreign',user_id:'v',person_id:'p'}]);
 before.close();
 const after=new Dexie(name);after.version(43).stores(schema);await after.open();
 try{
  for(const key of Object.keys(schema)){
   assert.equal(await after.table(key).count(),4,'upgrade lost data: '+key);
   assert.deepEqual((await after.table(key).where('[user_id+person_id]').equals(['u','p']).toArray()).map(row=>row.id),['owned']);
   assert.equal(await after.table(key).where('user_id').equals('u').count(),3,'old index lost');
  }
 }finally{after.close();await Dexie.delete(name);}
 console.log('V205 IndexedDB: V42→V43 preserves records, legacy rows and previous indexes; compound owner query isolates users and persons');
})().catch(error=>{console.error(error);process.exitCode=1;});
