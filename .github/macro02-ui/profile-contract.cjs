'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.argv[2]||process.cwd(),ts=require(require.resolve('typescript',{paths:[root]}));
const file=process.argv[3]||path.join(root,'components/Providers.tsx');
const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length,0);
const decls=new Map();let effect;
function walk(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))decls.set(n.name.text,n);if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes('router.replace("/onboarding")')){assert(!effect);effect=n.arguments[0].getText(tree);}ts.forEachChild(n,walk);}
walk(tree);assert(effect);const init=name=>{const d=decls.get(name);assert(d?.initializer,name);return d.initializer.getText(tree);};
const make=(user,result,pullDoneOwner,isOnline,loading=false,pathname='/hoje',db={})=>{
 const routes=[];let query,deps;const useLiveQuery=(f,d)=>{query=f;deps=d;return result;};
 const fn=new Function('user','pullDoneOwner','isOnline','loading','pathname','router','db','useLiveQuery',`const profileOwner=${init('profileOwner')};const ownedPersonResult=${init('ownedPersonResult')};const ownedPersonCount=${init('ownedPersonCount')};const isPullDone=${init('isPullDone')};(${effect})();return {ownedPersonCount,isPullDone};`);
 const r=fn(user,pullDoneOwner,isOnline,loading,pathname,{replace:p=>routes.push(p)},db,useLiveQuery);return {...r,routes,query,deps};
};
const A={id:'a'},B={id:'b'},r=(owner,count)=>({owner,count});
(async()=>{
 assert.deepEqual(make(null,undefined,null,false).routes,[]);
 assert.equal(await make(null,undefined,null,false).query(),undefined,'anonymous boot must not yield zero');
 const priorAnon=make(A,0,null,false);assert.equal(priorAnon.ownedPersonCount,undefined);assert.deepEqual(priorAnon.routes,[]);
 const hydration=make(A,undefined,null,false);assert.equal(hydration.ownedPersonCount,undefined);assert.deepEqual(hydration.routes,[]);
 const stale=make(B,r('a',0),'a',false);assert.equal(stale.ownedPersonCount,undefined);assert.equal(stale.isPullDone,false);assert.deepEqual(stale.routes,[]);
 const staleOnline=make(B,r('b',0),'a',true);assert.equal(staleOnline.isPullDone,false);assert.deepEqual(staleOnline.routes,[]);
 const offline=make(A,r('a',1),null,false);assert.equal(offline.ownedPersonCount,1);assert.deepEqual(offline.routes,[]);
 assert.deepEqual(make(A,r('a',0),null,true).routes,[]);
 assert.deepEqual(make(A,r('a',0),'a',true).routes,['/onboarding']);
 assert.deepEqual(make(A,r('a',0),null,false).routes,['/onboarding'],'existing confirmed local-empty offline policy preserved');
 assert.deepEqual(make(A,r('a',1),null,false,false,'/onboarding').routes,['/']);
 assert.deepEqual(make(A,r('a',0),'a',true,true).routes,[]);
 let release,called;const db={persons:{where:key=>{assert.equal(key,'user_id');return {equals:id=>{called=id;return {count:()=>new Promise(res=>{release=res;})}}}}}};
 const current=make(A,undefined,null,false,false,'/hoje',db);assert.deepEqual(current.deps,['a']);const pending=current.query();assert.equal(called,'a');assert.deepEqual(make(B,undefined,null,false).routes,[]);release(0);const late=await pending;assert.deepEqual(late,r('a',0));assert.deepEqual(make(B,late,'a',false).routes,[]);
 console.log('PROFILE_BOOT_DIRECTED_PASS=13; scoped query, delayed owner switch, online/offline/confirmed-empty and existing-profile paths');
 console.log('MACRO02_OFFLINE_PROFILE_SCOPE_REGRESSION_PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
