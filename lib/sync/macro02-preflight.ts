import {supabase} from '@/lib/supabase/client';
import {CUTOVER_TABLES,cutoverCanonical,type CutoverTable} from '@/lib/dose-premium/cutover-recovery';
import {MACRO02_R3_REMOTE_COLUMNS,normalizeMacro02LocalForComparison,normalizeMacro02RemoteForComparison,readMacro02ExactRecoveryImage} from '@/lib/dose-premium/cutover-storage-codec';
import {previewMacro02UnfencedComparison} from '@/lib/dose-premium/cutover-projection-lab';
import {Macro02PreflightError,type AuditItem} from '@/lib/dose-premium/cutover-preflight-diagnostic';
const blocked=(category:string,table='GLOBAL'):never=>{throw new Macro02PreflightError([{table,category,count:1}]);};
/** Ordinary authenticated paginated SELECTs only. No RPC, freeze, claim,
 * receipt, sync mutation or clinical writer. Results remain on the device. */
export async function preflightMacro02BeforeFreeze(uid:string,bytes:string,guard:()=>void):Promise<void>{
 const check=async()=>{guard();const {data,error}=await supabase.auth.getUser();guard();if(error||data.user?.id!==uid)blocked('AUTH_CHANGED');};
 const read=async(table:CutoverTable)=>{
  const remote=table==='doseLogs'?'dose_logs':table;
  const rows:Record<string,unknown>[]=[];let expected:number|null=null;
  while(true){guard();let query=supabase.from(remote).select('*',{count:'exact'});if(table!=='medicamento_tratamentos')query=query.eq('user_id',uid);
   const {data,error,count}=await query.order('id',{ascending:true}).range(rows.length,rows.length+199);guard();
   if(error||!Array.isArray(data)||count===null||!Number.isSafeInteger(count)||count<0||count>100000||expected!==null&&expected!==count)return blocked('REMOTE_READ',table);
   expected=count;rows.push(...data);if(rows.length===expected)return rows;if(!data.length||rows.length>expected)return blocked('REMOTE_READ',table);
  }
 };
 const snapshot=async()=>{await check();const entries=await Promise.all(CUTOVER_TABLES.map(async table=>[table,await read(table)] as const));await check();return Object.fromEntries(entries);};
 const local=normalizeMacro02LocalForComparison(readMacro02ExactRecoveryImage(JSON.parse(bytes),uid));
 const first=await snapshot(),second=await snapshot();guard();if(cutoverCanonical(first)!==cutoverCanonical(second))blocked('REMOTE_CHANGED');
 const normalized=normalizeMacro02RemoteForComparison({rows:first});
 const diagnosticFields=Object.fromEntries(CUTOVER_TABLES.map(t=>[t,[...MACRO02_R3_REMOTE_COLUMNS[t].split(','),'synced','isDefault','visual_icon_expanded']]));
 const preview=previewMacro02UnfencedComparison(normalized.rows,local,diagnosticFields);
 if(preview.blockers.length){
  const items:AuditItem[]=[...preview.differences,...preview.dependencies.local,...preview.dependencies.remote];
  const counts:Record<string,number>={UNOWNED_QUEUE:preview.counts.omittedUnowned,UNSCOPED_ROWS:preview.counts.unscopedRows,EXTERNAL_DEPENDENCY_QUEUE:preview.counts.externalDependencyQueue,PENDING_QUEUE:preview.counts.legacy+preview.counts.premium+preview.counts.unclassified+preview.counts.dependency,MISSING_DEPENDENCY:preview.counts.missingDependencies};
  for(const category of preview.blockers){if(!items.some(i=>i.category===category)&&!(category==='MISSING_DEPENDENCY'&&items.some(i=>i.category==='MISSING_REQUIRED')))items.push({table:'GLOBAL',category,count:counts[category]??1});}
  throw new Macro02PreflightError(items);
 }
 await check();
}
