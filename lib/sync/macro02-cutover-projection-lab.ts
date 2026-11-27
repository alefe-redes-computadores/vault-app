import {inspectMacro02ProjectedCutoverLab} from '@/lib/dose-premium/cutover-projection-lab';
import {readMacro02ServerCutoverLab} from '@/lib/sync/macro02-cutover-fence';
import {readMacro02CutoverLocal} from '@/lib/sync/macro02-cutover-local';

/** Laboratory-only adapter. Do not call during ordinary pull or startup.
 * Uses authenticated remote read and an actual VaultDB read transaction;
 * never dispatches queue, restores rows or grants clinical authority. */
export function inspectMacro02VaultProjectedCutoverLab(uid:string,epoch:string,assertSession:()=>void){
 return inspectMacro02ProjectedCutoverLab({
  assertSession,
  readRemote:()=>readMacro02ServerCutoverLab(uid,epoch,assertSession),
  readLocal:()=>readMacro02CutoverLocal(uid,assertSession),
 },uid,epoch);
}
