#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
function ok(value,description){assert.ok(value,'M20 '+description);n++;console.log('✓ M20 '+description)}
const paths=['lib/repositories/doseLogs.ts','hooks/useDoseLogs.ts','app/hoje/page.tsx','scripts/test-v63-release-gate.mjs'];
for(const file of paths){const s=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(s.parseDiagnostics.length===0,'TS/TSX syntax '+file)}
const repo=read(paths[0]),hook=read(paths[1]),today=read(paths[2]),gate=read(paths[3]);
ok(repo.includes('where("[user_id+person_id+data]").equals([ownerUserId, safePersonId, safeDate])'),'indexed owner/person/day equality');
ok(repo.includes('where("[user_id+person_id]").equals([ownerUserId, safePersonId])'),'complete history also supports optional owner index');
ok(repo.includes('ownerUserId !== undefined && !ownerUserId.trim()')&&repo.includes('ownerUserId === undefined && safeDate'),'no unscoped read during explicit owner wait');
ok(hook.includes('doseLogsLive.personId === activePersonId')&&hook.includes('doseLogsLive.date === targetDate')&&hook.includes('doseLogsLive.ownerId === ownerUserId'),'async snapshot identity guarded on all three dimensions');
ok(today.includes('user?.id ?? null')&&today.includes('} = useDoseLogs('),'Hoje opts in to fail-closed account scope');
ok(today.includes('useTodayOwnerData({')&&today.includes('historicoDosesCompleto')&&today.includes('partitionDoseBatchByStock('),'historical evidence, stock and owner context preserved');
ok(gate.includes('scripts/test-vault-m20-owner-day-dose-read.cjs')&&gate.includes('scripts/test-vault-m19-today-projection-hotpath.cjs'),'new contract registered without dropping M19');
// Execute real repository getAll with an indexed fake Dexie collection, not a copy.
const mockRows=[
{id:'b',user_id:'u1',person_id:'p1',data:'2026-11-02',horario:'20:00'},
{id:'a',user_id:'u1',person_id:'p1',data:'2026-11-02',horario:'08:00'},
{id:'x',user_id:'u2',person_id:'p1',data:'2026-11-02',horario:'08:00'},
{id:'y',user_id:'u1',person_id:'p2',data:'2026-11-02',horario:'08:00'},
{id:'z',user_id:'u1',person_id:'p1',data:'2026-11-01',horario:'08:00'},
];
const reads=[];const doseLogs={where(index){return {equals(key){reads.push({index,key});let rows=mockRows.filter(row=>{
 if(index==='[user_id+person_id+data]')return row.user_id===key[0]&&row.person_id===key[1]&&row.data===key[2];
 if(index==='[user_id+person_id]')return row.user_id===key[0]&&row.person_id===key[1];
 if(index==='person_id')return row.person_id===key;
 throw Error('Unexpected index '+index);
 });return {toArray:async()=>rows.slice(),and(fn){return {toArray:async()=>rows.filter(fn)}}};}};}};
function load(file,mocks){const m=new Module(file,module);m.require=id=>{
 if(Object.prototype.hasOwnProperty.call(mocks,id))return mocks[id];return {};
};m._compile(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;}
const db={doseLogs},repoMod=load(paths[0],{'@/lib/db':{db},'@/lib/health-utils':{getLocalTodayISO:()=> '2026-11-02'}}).doseLogsRepository;
(async()=>{
 let result=await repoMod.getAll('p1','2026-11-02','u1');
 ok(result.map(x=>x.id).join(',')==='a,b'&&reads.at(-1).index==='[user_id+person_id+data]','Hoje reads only own day, sorted, with compound index');
 result=await repoMod.getAll('p1',undefined,'u1');
 ok(result.map(x=>x.id).join(',')==='z,a,b'&&reads.at(-1).index==='[user_id+person_id]','optional owner full history retains older dates');
 const before=reads.length;
 result=await repoMod.getAll('p1','2026-11-02','');
 ok(result.length===0&&reads.length===before,'empty explicit owner triggers no database scan');
 result=await repoMod.getAll('p1','2026-11-02');
 ok(result.map(x=>x.id).join(',')==='a,x,b'&&reads.at(-1).index==='person_id','legacy caller retains previous read semantics');
 // Simulate Dexie previous-result retention across user, person and day changes.
 let personId='p1',live;
 const useDoseLogs=load(paths[1],{
  'react':{useCallback:fn=>fn},
  'dexie-react-hooks':{useLiveQuery:()=>live},
  '@/lib/repositories/doseLogs':{doseLogsRepository:repoMod},
  './useActivePersonId':{useActivePersonId:()=>({activePersonId:personId})},
  '@/lib/health-utils':{getLocalTodayISO:()=> '2026-11-02'}
 }).useDoseLogs;
 live={ownerId:'u1',personId:'p1',date:'2026-11-02',rows:mockRows.slice(0,2)};
 ok(useDoseLogs('2026-11-02','u1').doseLogs.length===2,'matching owner receives own day rows');
 ok(useDoseLogs('2026-11-02','u2').doseLogs.length===0,'stale snapshot not exposed on account switch');
 personId='p2';ok(useDoseLogs('2026-11-02','u1').doseLogs.length===0,'stale snapshot not exposed on person switch');
 personId='p1';ok(useDoseLogs('2026-11-03','u1').doseLogs.length===0,'stale snapshot not exposed on date switch');
 ok(useDoseLogs('2026-11-02',null).doseLogs.length===0,'auth pending does not reveal prior account rows');
 ok(useDoseLogs('2026-11-02',null).isLoading===true,'auth pending does not report stale query ready');
 ok(useDoseLogs('2026-11-02').doseLogs.length===2,'legacy consumer remains compatible without owner option');
 console.log('VAULT M20:',n,'checks approved; no changes to stock, sync or historical evidence');
})().catch(e=>{console.error(e);process.exitCode=1});
