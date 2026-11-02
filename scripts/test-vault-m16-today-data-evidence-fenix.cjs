#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let total=0;
const ok=(value,message)=>{assert.ok(value,'M16: '+message);total++;};
const files=['app/hoje/page.tsx','hooks/useTodayOwnerData.ts','lib/today/retro-review-projection.ts','components/hoje/TodayRetroReviewPanel.tsx','components/saude/HealthAvatar.tsx','lib/health-profile/avatar-visibility-policy.ts'];
for(const file of files){const sf=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(sf.parseDiagnostics.length===0,'TS/TSX syntax '+file);}
const today=read(files[0]),hook=read(files[1]),projection=read(files[2]),panel=read(files[3]),avatar=read(files[4]),policy=read(files[5]);
ok(today.includes('useTodayOwnerData({')&&!today.includes('useLiveQuery')&&!today.includes('db.doseLogs'),'Hoje delegates owner-scoped Dexie reads');
ok(hook.includes('[user_id+person_id+data]')&&hook.includes('dayData?.userId === userId')&&hook.includes('historyData?.userId === userId'),'owner and date scope survive live-query refreshes');
ok(today.includes('buildTodayRetroReviewSummary({')&&today.includes('<TodayRetroReviewPanel'),'retro projection and visual panel extracted');
ok(projection.includes('Ausência de confirmação')&&panel.includes('Ausência de confirmação não comprova tomada nem esquecimento'),'Brain evidence never infers adherence');
ok(panel.includes('summary.confidence === "limited"')&&panel.includes('Nada é confirmado automaticamente'),'evidence limit and non-mutation boundary are visible');
ok(avatar.includes("matchMedia('(prefers-reduced-motion: reduce)')")&&avatar.includes('O modo reduzido mantém a prévia em ilustração')&&policy.includes('!input.reducedMotion'),'Fenix compact WebGL respects reduced-motion and battery context');
ok(today.includes('await marcarDose(')&&today.includes('partitionDoseBatchByStock(')&&today.includes('setIsBatchTimeModalOpen'),'dose and stock authority remain on canonical handlers');
ok(!/\b(fetch\(|supabase|\bdb\.|localStorage|\.put\(|\.add\(|\.update\()/.test(projection+'\n'+panel),'new Brain projection and panel are pure');

function load(file,imports={}){const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(file,module);m.require=id=>{if(id in imports)return imports[id];throw Error('M16 unexpected import '+id)};m._compile(compiled,file);return m.exports;}
const addDays=(day,delta)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+delta);return date.toISOString().slice(0,10);};
const build=load(files[2],{'@/lib/health-utils':{addDaysToLocalDate:addDays}}).buildTodayRetroReviewSummary;
const medication={id:'m1',nome:'A',estoque_horarios:['08:00','20:00'],created_at:'2026-10-30T10:00:00Z'};
const base={enabled:true,medicationId:'m1',medications:[medication],renewals:[],personId:'p1',today:'2026-11-02'};
const summary=build({...base,doseLogs:[{medicamento_id:'m1',person_id:'p1',data:'2026-10-30',horario:'08:00'}]});
ok(summary.totalSlots===6&&summary.confirmedSlots===1&&summary.pendingSlots===5,'calendar slots and confirmations are counted deterministically');
ok(summary.pendingDates.join(',')==='2026-10-30,2026-10-31,2026-11-01','pending dates are unique and ordered');
ok(build({...base,medications:[{...medication,estoque_horarios:[]}],doseLogs:[]}).confidence==='limited','missing schedule reports limited evidence');
ok(build({...base,doseLogs:[{medicamento_id:'m1',person_id:'other',data:'2026-10-30',horario:'08:00'}]}).confirmedSlots===0,'another person never confirms the slot');
ok(build({...base,enabled:false,doseLogs:[]})===null,'disabled retro review performs no projection');
const can=load(files[5]).canMountAvatar3D,view={ready:true,expanded:true,mode:'3d',documentVisible:true,unavailable:false,size:'compact',previewVisible:true};
ok(can(view)&&!can({...view,reducedMotion:true}),'reduced motion blocks compact WebGL preview');
ok(can({...view,size:'expanded',previewVisible:false,reducedMotion:true}),'explicit expanded 3D remains available');
console.log(`VAULT M16: ${total} structural/behavioral checks passed`);
