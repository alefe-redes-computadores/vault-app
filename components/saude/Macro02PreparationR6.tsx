'use client';
import {macro02PreflightDiagnostic} from '@/lib/dose-premium/cutover-preflight-diagnostic';
import {useEffect,useRef,useState} from 'react';
import {readMacro02EnrollmentR5} from '@/lib/sync/macro02-enrollment-r5';
import {prepareMacro02Private,resumeMacro02Private,readMacro02PrivateStatus} from '@/lib/sync/macro02-auto-preparation';
import {macro02RecoveryDiagnostic} from '@/lib/dose-premium/recovery-export-diagnostic';
import type {Enrollment} from '@/lib/dose-premium/cutover-enrollment-authority';
import type {PreparationScope} from '@/lib/dose-premium/auto-preparation';
/** Owner requests preparation once. Resume uses the same persisted operation
 * after the operator's fence. No manual files, no client activation. */
export function Macro02PreparationR6({uid,synchronize,syncBusy}:{uid:string;synchronize:()=>Promise<boolean>;syncBusy:boolean}){
 const [enrollment,setEnrollment]=useState<Enrollment|null>(null),[saved,setSaved]=useState<PreparationScope|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[devices,setDevices]=useState(false),[ready,setReady]=useState(false);
 const alive=useRef(false),running=useRef(false),autoAttempt=useRef<string|null>(null);
 async function action(kind:'prepare'|'resume'){
  if(running.current)return;running.current=true;setBusy(true);setMessage('');setReady(false);
  try{const result=kind==='prepare'?await prepareMacro02Private(uid,synchronize):await resumeMacro02Private(uid);if(!alive.current)return;setSaved(result);setReady(kind==='prepare');setMessage(kind==='prepare'?'Cópia privada persistida e conferida. Preparação concluída; informe ao operador para iniciar a transição.':'Recibo confirmado pela recuperação autenticada. A ativação depende da conferência do operador.');}
  catch(e){if(alive.current)setMessage('Preparação interrompida. A cópia existente e os dados foram preservados. Código: '+(macro02PreflightDiagnostic(e)??macro02RecoveryDiagnostic(e)));}
  finally{running.current=false;if(alive.current)setBusy(false);}
 }
 useEffect(()=>{alive.current=true;let current=true;
  let refreshing=false;const refresh=async()=>{if(refreshing||running.current||document.visibilityState!=='visible'||!navigator.onLine)return;refreshing=true;try{const e=await readMacro02EnrollmentR5(uid);if(!current||running.current)return;setEnrollment(e);if(e.state==='premium'||e.state==='hold')return;try{const status=await readMacro02PrivateStatus(uid);if(current&&!running.current)setSaved(status);}catch(error){if(current&&!running.current){setSaved(null);setReady(false);setMessage('Cópia não conferida: '+macro02RecoveryDiagnostic(error));}}}catch{if(current&&!running.current)setEnrollment(null);}finally{refreshing=false;}};
  void refresh();const timer=window.setInterval(()=>void refresh(),8000);const onRefresh=()=>void refresh();window.addEventListener('online',onRefresh);window.addEventListener('focus',onRefresh);window.addEventListener('vault:macro02-device',onRefresh);document.addEventListener('visibilitychange',onRefresh);
  return()=>{current=false;alive.current=false;window.clearInterval(timer);window.removeEventListener('online',onRefresh);window.removeEventListener('focus',onRefresh);window.removeEventListener('vault:macro02-device',onRefresh);document.removeEventListener('visibilitychange',onRefresh);};
 },[uid]);
 useEffect(()=>{if(enrollment?.state==='frozen'&&enrollment.epoch&&saved&&!saved.completed&&!busy&&!syncBusy&&autoAttempt.current!==enrollment.epoch){autoAttempt.current=enrollment.epoch;void action('resume');}},[enrollment,saved,busy,syncBusy]);
 if(!enrollment||enrollment.state==='premium'||enrollment.state==='hold')return null;
 return <section className="mb-4 rounded-2xl border border-white/10 p-4 space-y-3"><h2 className="font-semibold">Preparar Central Premium</h2><p className="text-sm text-ink-secondary">O VAULT confere a sincronização, protege uma cópia no armazenamento privado e retoma a mesma operação automaticamente. Não exclui dados nem reenvia doses.</p>
 {enrollment.state==='legacy'&&<><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={devices} onChange={e=>setDevices(e.target.checked)} disabled={busy}/>Confirmei que os outros aparelhos conhecidos estão sincronizados e fora de uso durante a transição (ou uso apenas este aparelho).</label><button type="button" disabled={busy||syncBusy||!devices} onClick={()=>void action('prepare')} className="rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">{busy?'Preparando…':'Preparar Central Premium'}</button>{saved&&!ready&&<p className="text-xs">Cópia anterior preservada. Pressione preparar para confirmar que continua igual à base local.</p>}</>}
 {enrollment.state==='frozen'&&<><p className="text-sm">{saved?.completed?'Recibo já confirmado.':'Conta protegida para recuperação. A operação preservada será retomada.'}</p><button type="button" disabled={busy||syncBusy||!saved||saved.completed} onClick={()=>void action('resume')} className="rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">{busy?'Conferindo…':'Retomar mesma operação'}</button></>}
 {saved&&(ready||enrollment.state==='frozen')&&<div className="text-xs break-all"><p>Operação: {saved.operation_id}</p><p>SHA-256: {saved.sha256}</p></div>}{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
