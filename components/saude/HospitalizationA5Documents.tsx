'use client';
/** One M3 storage authority: episode, event and discharge targets are typed and person scoped. */
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, FolderLock, Upload, ExternalLink, Link2Off } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useToast } from '@/components/ToastProvider';
import { registerClinicalAssetM3, openClinicalAssetBlobM3, unlinkClinicalAssetM3 } from '@/lib/clinical-exams-m3/repository';
import type { ClinicalAssetLinkM1 } from '@/lib/clinical-exams-m1/types';
type TargetType=Extract<ClinicalAssetLinkM1['entity_type'],'hospitalization'|'hospitalization_event'|'hospitalization_discharge'>;
type Target={entity_type:TargetType;entity_id:string;label:string};
export function HospitalizationA5Documents({hospitalizationId}:{hospitalizationId:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const {showToast}=useToast();const fileInput=useRef<HTMLInputElement|null>(null);
 const [file,setFile]=useState<File|null>(null),[role,setRole]=useState<'protocol'|'supporting'>('supporting');
 const [targetValue,setTargetValue]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirmLink,setConfirmLink]=useState('');
 const records=useLiveQuery(async()=>{
  const empty={scope,assets:[],links:[],targets:[] as Target[]};
  if(!uid||!pid||!hospitalizationId)return empty;
  const [person,episode,events,discharges,links,assets]=await Promise.all([
   db.persons.get(pid),db.hospitalizations_a5.get(hospitalizationId),
   db.hospitalization_events_a5.where('hospitalization_id').equals(hospitalizationId).toArray(),
   db.hospitalization_discharge_a5.where('hospitalization_id').equals(hospitalizationId).toArray(),
   db.clinical_asset_links.where('person_id').equals(pid).toArray(),
   db.clinical_assets.where('person_id').equals(pid).toArray(),
  ]);
  if(person?.user_id!==uid||episode?.user_id!==uid||episode.person_id!==pid||episode.deleted_at)return empty;
  const targets:Target[]=[{entity_type:'hospitalization',entity_id:hospitalizationId,label:'Episódio de internação'}];
  for(const e of events){if(e.user_id===uid&&e.person_id===pid&&!e.deleted_at)targets.push({entity_type:'hospitalization_event',entity_id:e.id,label:`Diário · ${e.summary.slice(0,70)}`});}
  for(const e of discharges){if(e.user_id===uid&&e.person_id===pid&&!e.deleted_at)targets.push({entity_type:'hospitalization_discharge',entity_id:e.id,label:'Alta ou saída documentada'});}
  const allowed=new Set(targets.map(t=>`${t.entity_type}:${t.entity_id}`));
  const valid=links.filter(l=>l.user_id===uid&&l.person_id===pid&&!l.deleted_at&&allowed.has(`${l.entity_type}:${l.entity_id}`));
  const ids=new Set(valid.map(l=>l.asset_id));
  return {scope,links:valid,targets,assets:assets.filter(a=>a.user_id===uid&&a.person_id===pid&&!a.deleted_at&&ids.has(a.id))};
 },[uid,pid,hospitalizationId]);
 if(!records||records.scope!==scope)return null;
 const selected=records.targets.find(t=>`${t.entity_type}:${t.entity_id}`===targetValue)||records.targets[0];
 const upload=async()=>{
  if(!file||!pid||!selected||busy)return;setBusy(true);setMessage('');
  try{const result=await registerClinicalAssetM3({personId:pid,file,targets:[{entity_type:selected.entity_type,entity_id:selected.entity_id}],role});
   const msg=result.uploaded?'Documento privado registrado.':'Documento salvo; envio privado ainda pendente.';setMessage(msg);showToast(msg,'success');setFile(null);if(fileInput.current)fileInput.current.value='';
  }catch(e){const msg=e instanceof Error?e.message:'Arquivo indisponível.';setMessage(msg);showToast(msg,'error');}finally{setBusy(false);}
 };
 const open=async(id:string)=>{
  try{const blob=await openClinicalAssetBlobM3(pid,id);const url=URL.createObjectURL(blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.download='documento-clinico';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(e){setMessage(e instanceof Error?e.message:'Arquivo não disponível neste dispositivo.');}
 };
 return <section className="space-y-3 rounded-[20px] border border-surface-border/75 bg-surface-raised/70 p-4 text-ink-primary" aria-label="Documentos privados">
  <h2 className="flex items-center gap-2 text-sm font-bold"><FolderLock className="text-emerald-300" size={18}/>Documentos privados</h2>
  <p className="text-[11px] text-ink-muted">Arquivos da internação, do diário ou da alta, sempre vinculados por identidade real. Um mesmo arquivo pode ter vários vínculos sem ser duplicado.</p>
  {records.links.length===0?<p className="text-xs text-ink-muted">Nenhum documento vinculado à internação ainda.</p>:records.links.map(link=>{
   const a=records.assets.find(asset=>asset.id===link.asset_id);if(!a)return null;
   const target=records.targets.find(x=>x.entity_type===link.entity_type&&x.entity_id===link.entity_id);
   return <div key={link.id} className="space-y-2 rounded-xl border border-surface-border p-2.5">
    <button type="button" onClick={()=>void open(a.id)} className="flex min-h-11 w-full items-center gap-2 text-left text-xs">
     <FileText size={17} className="shrink-0 text-emerald-300"/><span className="min-w-0 flex-1 break-words">{a.filename||'Arquivo clínico'}</span><ExternalLink size={15}/></button>
    <p className="break-words text-[11px] text-ink-muted">{target?.label||'Vínculo documentado'}</p>
    <div className="flex flex-wrap items-center gap-2">
     {confirmLink===link.id?<><p className="w-full text-[11px] text-amber-200">Remover só este vínculo? O arquivo original e os outros vínculos permanecem preservados.</p>
      <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-amber-300/40 px-3 text-xs text-amber-100" onClick={()=>void (async()=>{
       if(busy)return;setBusy(true);setMessage('');try{await unlinkClinicalAssetM3(pid,link.id);setConfirmLink('');setMessage('Vínculo removido; o documento original foi preservado.');}
       catch(e){setMessage(e instanceof Error?e.message:'Não foi possível desvincular.');}finally{setBusy(false);}})()}>Confirmar</button>
      <button type="button" className="min-h-11 rounded-xl border border-surface-border px-3 text-xs" onClick={()=>setConfirmLink('')}>Cancelar</button></>:
      <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-muted" onClick={()=>setConfirmLink(link.id)}><Link2Off size={15}/>Desvincular deste registro</button>}
    </div>
   </div>})}
  <label className="block text-xs font-semibold">Anexar guia, laudo ou protocolo
   <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block min-h-11 w-full text-xs text-ink-muted"/></label>
  <fieldset className="min-w-0 space-y-1"><legend className="text-xs font-semibold text-ink-muted">Vincular a qual fato?</legend>
   <HealthRelationPicker title="Episódio, evento ou alta" value={`${selected?.entity_type||'hospitalization'}:${selected?.entity_id||hospitalizationId}`}
    onValueChange={setTargetValue} className="min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 text-xs">
    {records.targets.map(t=><option key={`${t.entity_type}:${t.entity_id}`} value={`${t.entity_type}:${t.entity_id}`}>{t.label}</option>)}
   </HealthRelationPicker>
  </fieldset>
  <fieldset className="min-w-0 space-y-1"><legend className="text-xs font-semibold text-ink-muted">Natureza do documento</legend>
   <HealthRelationPicker title="Natureza do documento" kind="status" value={role}
    onValueChange={value=>setRole(value as 'protocol'|'supporting')}
    className="min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 text-xs">
    <option value="supporting">Documento de apoio</option><option value="protocol">Protocolo informado</option>
   </HealthRelationPicker>
  </fieldset>
  <button type="button" disabled={!file||busy||!selected} onClick={()=>void upload()}
   className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-sm font-bold text-void disabled:opacity-40">
   <Upload size={17}/>{busy?'Registrando…':'Anexar com segurança'}</button>
  {message&&<p role="status" className="text-xs text-ink-muted">{message}</p>}
 </section>;
}
