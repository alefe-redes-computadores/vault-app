'use client';
import {useEffect,useRef,useState} from 'react';
import {readMacro02EnrollmentR5} from '@/lib/sync/macro02-enrollment-r5';
import {exportAuthenticatedMacro02RecoveryImage,restoreAuthenticatedMacro02RecoveryImage} from '@/lib/sync/macro02-operational-recovery';
import {Capacitor} from '@capacitor/core';
import {Directory,Encoding,Filesystem} from '@capacitor/filesystem';
import {macro02RecoveryDiagnostic,verifyMacro02SavedBytes} from '@/lib/dose-premium/recovery-export-diagnostic';
import type {Enrollment} from '@/lib/dose-premium/cutover-enrollment-authority';
/** Explicit owner-mediated recovery. The file is private local evidence, not
 * an upload or automatic recovery/activation command. */
export function Macro02PreparationR6({uid}:{uid:string}){
 const [enrollment,setEnrollment]=useState<Enrollment|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[digest,setDigest]=useState(''),[operation,setOperation]=useState(''),[file,setFile]=useState<File|null>(null);
 const alive=useRef(false),running=useRef(false);
 useEffect(()=>{alive.current=true;let current=true;const refresh=()=>void readMacro02EnrollmentR5(uid).then(e=>{if(current)setEnrollment(e);},()=>{if(current)setEnrollment(null);});refresh();window.addEventListener('online',refresh);window.addEventListener('vault:macro02-device',refresh);return()=>{current=false;alive.current=false;window.removeEventListener('online',refresh);window.removeEventListener('vault:macro02-device',refresh);};},[uid]);
 async function run(fn:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setMessage('');try{await fn();}catch(e){if(alive.current)setMessage('Conferência interrompida. Preserve a cópia original, o código da operação e os registros locais. Não repita com outro código. Diagnóstico: '+macro02RecoveryDiagnostic(e));}finally{running.current=false;if(alive.current)setBusy(false);}}
 async function exportImage(){return run(async()=>{
  const image=await exportAuthenticatedMacro02RecoveryImage(uid);if(!alive.current)return;
  if(Capacitor.isNativePlatform()){
   // Explicit local export to a unique document, never a network upload.
   const filename='vault-macro02-recuperacao-'+crypto.randomUUID()+'.json';
   try{
    await Filesystem.writeFile({path:filename,directory:Directory.Documents,encoding:Encoding.UTF8,data:image.bytes});
    const read=await Filesystem.readFile({path:filename,directory:Directory.Documents,encoding:Encoding.UTF8});
    verifyMacro02SavedBytes(image.bytes,read.data);
   }catch(e){throw Error('M02_RECOVERY_NATIVE_FILE_'+(e instanceof Error&&e.message==='M02_RECOVERY_FILE_VERIFY'?'VERIFY':'IO'));}
   if(!alive.current)return;
   setDigest(image.sha256);setMessage('Cópia salva e conferida em Documentos: '+filename+'. Guarde em local protegido; não compartilhe.');
   return;
  }
  const url=URL.createObjectURL(new Blob([image.bytes],{type:'application/json'}));
  try{const a=document.createElement('a');a.href=url;a.download='vault-macro02-recuperacao.json';document.body.append(a);a.click();a.remove();setDigest(image.sha256);setMessage('Cópia privada gerada. Confirme que foi salva e guarde o SHA-256 separadamente. Não compartilhe este arquivo.');}finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
 });}
 async function restoreImage(){return run(async()=>{if(!file||file.size>25*1024*1024||!enrollment?.epoch||enrollment.state!=='frozen'||!/^[a-f0-9]{64}$/.test(digest)||!/^[a-f0-9-]{36}$/.test(operation))throw Error('M02_R6_RECOVERY_FORM');const fresh=await readMacro02EnrollmentR5(uid);if(fresh.state!=='frozen'||!fresh.epoch||fresh.epoch!==enrollment.epoch||!alive.current)throw Error('M02_R6_RECOVERY_FENCE');const result=await restoreAuthenticatedMacro02RecoveryImage({uid,epoch:fresh.epoch,operationId:operation,backupText:await file.text(),expectedSourceSha256:digest});if(alive.current)setMessage(`Conferência local concluída e recibo confirmado (${result.receipt.added} registro(s) recuperado(s)). Nenhuma operação foi reenviada. Aguarde somente a revisão do recibo pelo procedimento de ativação.`);});}
 if(!enrollment||enrollment.state==='premium'||enrollment.state==='hold')return null;
 return <section className="mb-4 rounded-2xl border border-white/10 p-4 space-y-3"><h2 className="font-semibold">Preparação da Central de Doses</h2><p className="text-sm text-ink-secondary">Guarde uma cópia privada e integral antes da transição. O arquivo JSON não é cifrado: mantenha-o em local protegido, sem compartilhamento. A restauração acrescenta somente fatos comprovados; não recalcula doses, não exclui registros e não confirma a fila.</p><button type="button" disabled={busy} onClick={()=>void exportImage()} className="rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">Gerar cópia privada</button>{digest&&<p className="break-all text-xs">SHA-256: {digest}</p>}{enrollment.state==='frozen'&&<div className="space-y-3"><p className="text-sm">Conta protegida para conferência. Use o mesmo identificador em todas as tentativas desta operação.</p><label className="block text-sm">Identificador da operação<input className="block w-full rounded-lg border border-white/20 bg-transparent p-2" value={operation} onChange={e=>setOperation(e.target.value.trim())} disabled={busy} autoComplete="off" /></label><button type="button" disabled={busy||!!operation} onClick={()=>setOperation(crypto.randomUUID())} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50">Gerar identificador uma vez</button><label className="block text-sm">SHA-256 da cópia original<input className="block w-full rounded-lg border border-white/20 bg-transparent p-2" value={digest} onChange={e=>setDigest(e.target.value.trim())} disabled={busy} autoComplete="off" /></label><label className="block text-sm">Arquivo privado original<input type="file" accept="application/json,.json" className="block w-full" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)} /></label><button type="button" disabled={busy||!file||!operation||!digest} onClick={()=>void restoreImage()} className="rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">Conferir e recuperar fatos comprovados</button></div>}{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
