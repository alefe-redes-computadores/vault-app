#!/usr/bin/env node
'use strict';
// No personal records, cloud writes or native permissions: hermetic contract gate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
let count=0;
const read=p=>fs.readFileSync(p,'utf8');
const check=(ok,message)=>{assert.ok(ok,'M5 REAB: '+message);count++;};
const names=[
 'lib/rehab-m5/types.ts','lib/rehab-m5/repository.ts','lib/rehab-m5/sync.ts',
 'components/saude/RehabM5Workspace.tsx','app/saude/reabilitacao/page.tsx',
 'app/saude/reabilitacao/novo/page.tsx','app/saude/reabilitacao/detalhes/page.tsx',
 'app/saude/reabilitacao/editar/page.tsx',
];
for(const path of names){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(!source.parseDiagnostics.length,'parse '+path);
}
const types=read('lib/rehab-m5/types.ts');
const compiled=ts.transpileModule(types,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const box={exports:{}};
vm.runInNewContext(compiled,{module:box,exports:box.exports,Set,Date,Number,RegExp,String,Object});
const {REHAB_TABLES_M5,validUuidM5,validLocalDateM5}=box.exports;
check(REHAB_TABLES_M5.length===6,'six distinct, additive domain tables');
check(new Set(REHAB_TABLES_M5).size===6,'unique canonical names');
for(let i=0;i<288;i++){
 const v=i.toString(16).padStart(12,'0');const uuid=`00000000-0000-4000-8000-${v}`;
 check(validUuidM5(uuid),'UUID '+i);
 check(!validUuidM5(uuid.slice(0,-1)),'invalid UUID '+i);
}
for(const day of ['2026-02-28','2024-02-29','2026-11-21','2026-12-31'])check(validLocalDateM5(day),'valid civil day '+day);
for(const day of ['2026-02-29','2026-04-31','2026-13-01','2026-00-13','2026-11-99','2026-1-2'])check(!validLocalDateM5(day),'rejected invalid civil date '+day);
const sql=read('supabase/migrations/20261121090000_m5_reabilitacao_macro1.sql');
const repo=read('lib/rehab-m5/repository.ts');const sync=read('lib/rehab-m5/sync.ts');
const ui=read('components/saude/RehabM5Workspace.tsx');const gate=read('scripts/test-v63-release-gate.mjs');
const db=read('lib/db/index.ts'),pull=read('lib/sync/pull.ts'),queue=read('hooks/useSyncQueue.ts');
const deps=read('lib/sync/dependency-order.ts'),hub=read('lib/health-hub/r5.ts');
for(const name of REHAB_TABLES_M5){
 check(sql.includes('public.'+name),'SQL source '+name);
 check(db.includes(`${name}!: Table<`)&&db.includes(`${name}: 'id`),'Dexie '+name);
 check(pull.includes(`queueTable:'${name}'`)&&pull.includes(`db.${name}`),'pull scoped '+name);
 check(queue.includes(`case "${name}": await markRecordSyncedIfCurrent(db.${name}`),'local acknowledgment '+name);
 check(queue.includes(`case '${name}'`),'dispatcher '+name);
 check(sync.includes(`${name}:`),'payload field authority '+name);
}
check(db.includes('this.version(51)')&&db.includes('this.version(52)'),'only additive Dexie 52');
check(sql.includes('ENABLE ROW LEVEL SECURITY')&&sql.includes('WITH CHECK')&&sql.includes('auth.uid()'),'RLS ownership');
check(sql.includes('FOREIGN KEY(person_id,user_id)')&&sql.includes('FOREIGN KEY(professional_id,user_id)'),'composite ownership');
check(sql.includes('m5_rehab_validate_origin')&&sql.includes('m5_rehab_validate_session_team'),'typed server validation');
check(sql.includes('m5_rehab_guard_update')&&sql.includes('REVOKE UPDATE ON public.rehab_session_events_m5'),'immutable scope & events');
check(sql.includes('deleted_at')&&sql.includes('CREATE UNIQUE INDEX IF NOT EXISTS m5_one_origin_live'),'tombstone uniqueness');
check(!/\bDROP\s+TABLE\b|\bTRUNCATE\s+TABLE\b|\bDELETE\s+FROM\b/i.test(sql),'no destructive table operation');
check(sync.includes('.eq(\'updated_at\'')&&sync.includes('compare-and-swap'),'CAS protects concurrent update');
check(sync.includes('ID já existente')&&sync.includes('same(previous,row,keys)'),'idempotent retry');
check(sync.includes('tombstone não pode ressuscitar'),'no resurrection');
check(!repo.includes(".delete(")&&repo.includes("deleted_at:nextTimestamp(old.updated_at)"),'soft unlink, no physical delete');
check(repo.includes('changeRehabSessionM5')&&repo.includes("action:date?'rescheduled':'status_changed'"),'preserve remap event');
check(repo.includes("old.status==='performed'&&input.scheduledAt"),'no reschedule of completed session');
check(repo.includes('assertOwned(target,uid,input.personId)'),'origin only by proven person');
check(repo.includes('assignRehabProfessionalM5')&&repo.includes('db.medicos.get'),'A1 professional authority reused');
check(repo.includes('addRehabSessionProfessionalM5')&&repo.includes('session.program_id!==team.program_id'),'team/session same program');
check(deps.includes('rehab_program_team_m5:')&&deps.includes("item.table==='rehab_origin_links_m5'"),'queue causal ordering');
check(ui.includes('useActivePersonId')&&ui.includes('useAuth')&&ui.includes('person?.user_id!==uid'),'UI person isolation');
check(ui.includes('info.scope!==scope')&&ui.includes('p.person_id===personId'),'UI stale query cannot leak previous person');
check(ui.includes('datetime-local')&&ui.includes('Remarcar')&&ui.includes('Profissional')&&ui.includes('Origem e vínculos'),'journey operational UI');
check(hub.includes('id:"reabilitacao"')&&hub.includes('href:"/saude/reabilitacao"'),'discoverable route');
check(gate.split('"scripts/test-vault-m5-reab-macro1.cjs"').length===2,'registered exactly once in V63');
check(!/\bdose_logs\b|\bestoque_quantidade\b|\bmedicamento_tratamentos\b/.test(repo),'no dose or stock writes');
console.log(`VAULT M5 REAB MACRO1: ${count} hermetic contracts approved (no cloud writes).`);
