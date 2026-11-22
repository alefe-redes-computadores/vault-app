'use client';
/** M3 is the sole private-file owner; this is only a factual target picker. */
import {useEffect,useRef,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {FileText,FolderLock,Link2Off,Upload,ExternalLink} from 'lucide-react';
import {db} from '@/lib/db';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {registerClinicalAssetM3,openClinicalAssetBlobM3,unlinkClinicalAssetM3} from '@/lib/clinical-exams-m3/repository';
import type {ClinicalAssetLinkM1} from '@/lib/clinical-exams-m1/types';
export type SurgicalDocumentTargetA7M5=Extract<ClinicalAssetLinkM1['entity_type'],'surgery_event'|'surgical_intent'|'rehab_milestone'>;
export function ClinicalFactDocumentsA7M5({type,entityId}:{type:SurgicalDocumentTargetA7M5;entityId:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),toast=useToast(),{trigger}=useHapticFeedback();
 const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}:${type}:${entityId}`;
 const [expanded,setExpanded]=useState(false),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{setExpanded(false);setFile(null);setConfirm('')},[scope,type,entityId]);
 const data=useLiveQuery(async()=>{
  if(!uid||!pid||!entityId)return null;
  const person=await db.persons.get(pid);if(person?.user_id!==uid)return null;
  const table=type==='surgery_event'?db.surgery_journey_events_a7:type==='surgical_intent'?db.surgical_intents_a7m5:db.rehab_milestones_m5;
  const record=await table.get(entityId);if(!record||record.user_id!==uid||record.person_id!==pid||record.deleted_at)return null;
  const [links,assets]=await Promise.all([db.clinical_asset_links.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.clinical_assets.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
  const valid=links.filter(l=>!l.deleted_at&&l.entity_type===type&&l.entity_id===entityId);
  return {scope,links:valid,assets:assets.filter(a=>!a.deleted_at&&valid.some(l=>l.asset_id===a.id))};
 },[uid,pid,entityId,type]);
 const label=type==='surgery_event'?'Documentos do fato cirúrgico':type==='surgical_intent'?'Documentos do encaminhamento':'Documentos do marco de reabilitação';
 const upload=async()=>{if(inFlight.current||!file)return;inFlight.current=true;setBusy(true);
  try{const result=await registerClinicalAssetM3({personId:pid,file,targets:[{entity_type:type,entity_id:entityId}],role:'supporting'});
   trigger('vibrate');toast.showSuccess(result.uploaded?'Documento privado anexado.':'Documento salvo localmente; envio ainda pendente.');setFile(null);
  }catch(e){toast.showError(e instanceof Error?e.message:'Não foi possível anexar o documento');}finally{inFlight.current=false;setBusy(false);}
 };
 const open=async(id:string)=>{try{const blob=await openClinicalAssetBlobM3(pid,id);const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='documento-clinico';a.rel='noopener noreferrer';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){toast.showError(e instanceof Error?e.message:'Arquivo indisponível');}};
 const unlink=async(id:string)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);
  try{await unlinkClinicalAssetM3(pid,id);trigger('vibrate');toast.showSuccess('Vínculo privado encerrado; arquivo original preservado.');setConfirm('');}
  catch(e){toast.showError(e instanceof Error?e.message:'Não foi possível desvincular');}finally{setBusy(false);inFlight.current=false;}
 };
 if(!data||data.scope!==scope)return null;
 return <div className="min-w-0 space-y-2">
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-emerald-200"><FolderLock size={16}/>{label}{data.assets.length?` · ${data.assets.length}`:''}</button>
  {expanded&&<div className="space-y-3 rounded-xl border border-surface-border/60 bg-surface/80 p-3">
   {data.assets.map(a=>{const l=data.links.find(x=>x.asset_id===a.id);
    return <div key={a.id} className="min-w-0 space-y-1 rounded-xl border border-surface-border/60 p-2.5">
     <button type="button" onClick={()=>void open(a.id)} className="flex min-h-11 w-full min-w-0 items-center gap-2 text-left text-xs"><FileText size={16} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 break-words">{a.filename}</span><ExternalLink size={15}/></button>
     {l&&<>{confirm===l.id?<div className="space-y-2"><p className="text-[11px] text-amber-200">Desvincular somente deste fato? Outros vínculos e o arquivo original permanecem.</p><div className="flex gap-2"><button disabled={busy} onClick={()=>void unlink(l.id)} className="min-h-11 flex-1 rounded-xl border border-amber-300/30 px-3 text-xs">Confirmar</button><button onClick={()=>setConfirm('')} className="min-h-11 flex-1 rounded-xl border border-surface-border px-3 text-xs">Cancelar</button></div></div>:<button type="button" onClick={()=>setConfirm(l.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-muted"><Link2Off size={15}/>Desvincular</button>}</>}
    </div>})}
   <label className="block text-xs font-semibold text-ink-secondary">Anexar PDF ou imagem privada<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 min-h-11 w-full text-xs" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
   <button type="button" disabled={!file||busy} onClick={()=>void upload()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/35 text-xs font-semibold text-emerald-200 disabled:opacity-40"><Upload size={16}/>{busy?'Anexando…':'Anexar ao registro existente'}</button>
   <p className="text-[11px] text-ink-muted">Um arquivo M3 privado por hash, múltiplos vínculos possíveis. Sem URL pública.</p>
  </div>}
 </div>;
}
