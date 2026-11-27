'use strict';
const path=require('node:path');const root=process.cwd();const esbuild=require(process.env.ESBUILD_MODULE);
const entry=String.raw`
import {db} from '@/lib/db';
import {exportAllData} from '@/lib/export';
import {renovacoesRepository} from '@/lib/repositories/renovacoes';
import {CUTOVER_TABLES} from '@/lib/dose-premium/cutover-recovery';
import {getLocalTodayISO} from '@/lib/health-utils';
const uid='00000000-0000-4000-8000-000000000001',pid='00000000-0000-4000-8000-000000000002',second='00000000-0000-4000-8000-000000000204';
window.__vaultLab={
 seed:async(snapshot,settings)=>{
  await db.open();if(snapshot.account_id!==uid||snapshot.format!=='macro02-active-snapshot-r5'||!snapshot.complete)throw Error('LAB_SNAPSHOT');
  if(await db.persons.count()||await db.syncQueue.count()||await db.table('macro02_device_enrollment').count())throw Error('LAB_NOT_EMPTY');
  await db.transaction('rw',[...CUTOVER_TABLES.map(t=>db.table(t)),db.settings],async()=>{
   for(const t of CUTOVER_TABLES){const rows=snapshot.rows[t];if(!Array.isArray(rows))throw Error('LAB_MISSING_TABLE');const local=rows.map(row=>{const r={...row,synced:true};if(t==='persons'){r.isDefault=row.is_default===true;delete r.is_default;}if(t==='medicamentos'){r.tratamento_ids=snapshot.rows.medicamento_tratamentos.filter(j=>j.medicamento_id===row.id).map(j=>j.tratamento_id).sort();}return r;});await db.table(t).bulkAdd(local);}
   await db.settings.add({...settings,synced:true});
  });
 },
 state:async()=>({meds:await db.medicamentos.toArray(),doses:await db.doseLogs.toArray(),queue:await db.syncQueue.toArray(),rx:await db.renovacoes.toArray(),device:await db.table('macro02_device_enrollment').get(uid)}),
 unquantified:async()=>renovacoesRepository.create({person_id:pid,medicamento_id:second,data:getLocalTodayISO(),data_aquisicao:getLocalTodayISO(),tipo_aquisicao:'sus',quantidade:null,observacoes:'QA synthetic unquantified'},{somenteAquisicao:true}),
 backup:async()=>exportAllData(uid),
};
`;
esbuild.build({stdin:{contents:entry,resolveDir:root,sourcefile:'vault-r10-ui-bootstrap.ts',loader:'ts'},bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:process.env.BOOTSTRAP_BUNDLE,tsconfig:path.join(root,'tsconfig.json'),nodePaths:[path.join(root,'node_modules')],define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify('http://127.0.0.1:4173'),'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':JSON.stringify('ci-synthetic-not-a-production-key'),'process.env.NODE_ENV':JSON.stringify('production')}}).then(()=>console.log('UI_BOOTSTRAP_BUNDLE_OK')).catch(e=>{console.error(e);process.exitCode=1});
