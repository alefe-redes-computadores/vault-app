const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('fake-indexeddb/auto');
const Dexie=require('dexie').default,db=new Dexie('vault-v138-isolated-context');
const tables=['persons','medicamentos','doseLogs','renovacoes','tratamentos','registros_saude','consultas','exames','cirurgias','cids','documents','retiradas','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos'];
db.version(1).stores(Object.fromEntries(tables.map(name=>[name,'id,person_id,user_id,[user_id+person_id]'])));
const cache=new Map();
const hookState={user:{id:"u"},person:"p",loaded:null};
function load(file){
 const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;
 const mod=new Module(filename,module);cache.set(filename,mod);mod.paths=Module._nodeModulePaths(path.dirname(filename));
 mod.require=name=>{
 if(filename.endsWith('/hooks/useHealthIntelligence.ts')){
  const mocks={react:{useMemo:fn=>fn()},'dexie-react-hooks':{useLiveQuery:()=>hookState.loaded},'@/hooks/useAuth':{useAuth:()=>({user:hookState.user})},'@/hooks/useActivePersonId':{useActivePersonId:()=>({activePersonId:hookState.person})},'@/lib/health-insights':{gerarInsightsSaude:c=>[{id:c.personId}],validarHealthInsightContext:()=>null},'@/lib/health-utils':{getLocalTodayISO:()=>"2026-10-14"},'@/lib/health-intelligence/context':{},'@/lib/health-intelligence/select-highlights':{selectHealthHighlights:x=>x},'@/lib/health-intelligence/brain-v4':{buildBrainV4Snapshot:()=>null,replayBrainV4:()=>[]},'@/lib/health-intelligence/contextual':{selectContextualHealthInsights:x=>x},'@/lib/health-intelligence/context-coverage':{documentedDayCount:()=>0},'@/hooks/useHealthExperienceFeedback':{useHealthExperienceFeedback:()=>({feedback:[],sendFeedback:()=>{}})},'@/lib/health-intelligence/feedback-v4':{selectExperienceInsightsV4:x=>x}};
  if(name in mocks)return mocks[name];
 }
 return name==='@/lib/db'?{db}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);return mod.exports;
}
(async()=>{
 const {reconcileBrainV5,brainV5Key}=load('lib/health-intelligence/brain-v5.ts');
 const insight={id:'active-old',kind:'alert',categoria:'medicamentos',entidadeTipo:'medicamento',entidadeId:'m',titulo:'Registro pendente',mensagem:'Confira o registro',urgencia:'baixa',confianca:'alta',amostra:1,evidencias:['A','B']};
 const first=reconcileBrainV5('p',[insight],[],'2025-01-01T00:00:00Z')[0];
 const history=Array.from({length:1200},(_,i)=>({...first,key:'resolved-'+i,state:'resolved',last_detected_at:'2026-10-14T00:00:00Z'}));
 const foreign={...first,person_id:'other',key:'other'};
 const result=reconcileBrainV5('p',[insight],[first,...history,foreign],'2026-10-14T00:00:00Z');
 assert(result.some(x=>x.key===brainV5Key('p',insight)&&x.state==='active'),'old active alert preserved over recent resolved history');
 assert(result.includes(foreign));assert.equal(result.filter(x=>x.person_id==='p').length,1200);
 const partial=reconcileBrainV5('p',[],[first],undefined,{complete:false});assert.equal(partial[0].state,'active');
 assert.equal(reconcileBrainV5('p',[],[first])[0].state,'resolved');
 const repeat=reconcileBrainV5('p',[{...insight,evidencias:['B','A','A']}],[first])[0];assert.equal(repeat.occurrences,1);
 const many=Array.from({length:1201},(_,i)=>({...first,key:brainV5Key('p',{...insight,id:String(i)}),insight_id:String(i)}));
 assert.equal(reconcileBrainV5('p',[],many,undefined,{complete:false}).length,1201,'active records are never silently pruned');
 await db.persons.add({id:'p',user_id:'u'});
 for(const name of tables.filter(x=>x!=='persons'))await db[name].bulkAdd([{id:name+'-owned',person_id:'p',user_id:'u'},{id:name+'-foreign',person_id:'p',user_id:'other'},{id:name+'-person',person_id:'q',user_id:'u'}]);
 const {loadHealthInsightContext}=load('lib/health-intelligence/context.ts');
 const context=await loadHealthInsightContext('p','2026-10-14','u');
 for(const value of Object.values(context)){if(Array.isArray(value)){assert.equal(value.length,1);assert.equal(value[0].user_id,'u');}}
 for(const value of Object.values(context.fornecimento)){assert.equal(value.length,1);assert.equal(value[0].user_id,'u');}
 await assert.rejects(loadHealthInsightContext('p',undefined,'other'),/conta atual/);
 const {avatarLayout}=load('lib/health-profile/avatar.ts');
 const device={id:'watch',name:'Relógio',active:true,side:'right',kind:'watch',color:'#a78bfa',updated_at:'2026-10-14'};
 const layout=avatarLayout([device,{...device,id:'archived',active:false},{...device,id:'old',updated_at:'2026-01-01'}]);
 assert.equal(layout.slots.length,1);assert.equal(layout.slots[0].device.id,'watch');assert.equal(layout.slots[0].count,2);assert.equal(layout.phoneSide,'left');
 const {useHealthIntelligence}=load('hooks/useHealthIntelligence.ts');
 hookState.loaded={userId:'u',personId:'p',context,error:null};
 assert.equal(useHealthIntelligence().insights.length,1);
 hookState.person='q';assert.equal(useHealthIntelligence().context,null);assert.equal(useHealthIntelligence().insights.length,0);assert.equal(useHealthIntelligence().isLoading,true);
 hookState.person='p';hookState.user={id:'other'};assert.equal(useHealthIntelligence().context,null);
 hookState.loaded={userId:'other',personId:'p',context:null,error:'Unavailable'};assert.equal(useHealthIntelligence().isLoading,false);assert.equal(useHealthIntelligence().error,'Unavailable');
 hookState.user=null;hookState.person=null;hookState.loaded=null;assert.equal(useHealthIntelligence().context,null);assert.equal(useHealthIntelligence().error,null);assert.equal(useHealthIntelligence().isLoading,false);
 console.log('V138: account/person context, incomplete reconciliation, active retention, idempotence and avatar device layout OK');
 await db.delete();
})().catch(async error=>{console.error(error);await db.delete();process.exitCode=1;});
