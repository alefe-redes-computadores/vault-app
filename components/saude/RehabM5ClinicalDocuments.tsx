'use client';
/** No new file authority: reuse M3 authenticated clinical assets, content-hash and native cache. */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, FolderLock, Upload, ExternalLink, Link2Off } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { registerClinicalAssetM3, openClinicalAssetBlobM3, unlinkClinicalAssetM3 } from '@/lib/clinical-exams-m3/repository';
export function RehabM5ClinicalDocuments({programId,sessionId}:{programId:string;sessionId?:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [file,setFile]=useState<File|null>(null),[role,setRole]=useState<'protocol'|'supporting'>('supporting');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirmLink,setConfirmLink]=useState('');
 const records=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,assets:[],links:[]};
  const [person,program,session,links,assets]=await Promise.all([db.persons.get(pid),db.rehab_programs_m5.get(programId),sessionId?db.rehab_sessions_m5.get(sessionId):Promise.resolve(null),
   db.clinical_asset_links.where('person_id').equals(pid).toArray(),db.clinical_assets.where('person_id').equals(pid).toArray()]);
  if(person?.user_id!==uid||program?.user_id!==uid||program.person_id!==pid||program.deleted_at||(sessionId&&(!session||session.program_id!==programId||session.person_id!==pid||session.user_id!==uid||session.deleted_at)))return {scope,assets:[],links:[]};
  const valid=links.filter(l=>l.user_id===uid&&l.person_id===pid&&!l.deleted_at&&l.entity_type===(sessionId?'rehab_session':'rehab_program')&&l.entity_id===(sessionId||programId));
  const ids=new Set(valid.map(l=>l.asset_id));
  return {scope,links:valid,assets:assets.filter(a=>a.user_id===uid&&a.person_id===pid&&!a.deleted_at&&ids.has(a.id))};
 },[uid,pid,programId,sessionId]);
 if(!records||records.scope!==scope)return null;
 const upload=async()=>{
  if(!file||!pid||!programId||busy)return;setBusy(true);setMessage('');
  try{const result=await registerClinicalAssetM3({personId:pid,file,targets:[sessionId?{entity_type:'rehab_session',entity_id:sessionId}:{entity_type:'rehab_program',entity_id:programId}],role});
   setMessage(result.uploaded?'Documento privado registrado.':'Documento salvo; envio privado ainda pendente.');setFile(null);
  }catch(e){setMessage(e instanceof Error?e.message:'Arquivo indisponível.');}finally{setBusy(false);}
 };
 const open=async(id:string)=>{
  try{const blob=await openClinicalAssetBlobM3(pid,id);const url=URL.createObjectURL(blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.download='documento-clinico';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(e){setMessage(e instanceof Error?e.message:'Arquivo não disponível neste dispositivo.');}
 };
 return <section className="space-y-3 rounded-[20px] border border-teal-300/20 bg-surface-raised/70 p-4 text-ink-primary" aria-label="Documentos privados">
  <h2 className="flex items-center gap-2 text-sm font-bold"><FolderLock className="text-teal-300" size={18}/> {sessionId?'Documentos da sessão':'Documentos privados do ciclo'}</h2>
  <p className="text-[11px] text-ink-muted">Anexos protegidos por pessoa e conta. Um documento pode manter diversos vínculos sem ser duplicado.</p>
  {records.assets.map(a=>{const link=records.links.find(l=>l.asset_id===a.id);
   return <div key={a.id} className="space-y-2 rounded-xl border border-surface-border p-2.5">
    <button type="button" onClick={()=>void open(a.id)} className="flex min-h-11 w-full items-center gap-2 text-left text-xs">
      <FileText size={17} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 break-words">{a.filename||'Arquivo clínico'}</span><ExternalLink size={15}/></button>
    {link&&<div className="flex flex-wrap items-center gap-2">
     {confirmLink===link.id?<><p className="w-full text-[11px] text-amber-200">Desvincular apenas deste registro? O arquivo original e outros vínculos serão preservados.</p>
       <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-amber-300/40 px-3 text-xs text-amber-100" onClick={()=>void (async()=>{
        if(busy)return;setBusy(true);setMessage('');try{await unlinkClinicalAssetM3(pid,link.id);setConfirmLink('');setMessage('Vínculo removido; o documento original permanece preservado.');}
        catch(e){setMessage(e instanceof Error?e.message:'Não foi possível desvincular.');}finally{setBusy(false);}})()}>Confirmar desvinculação</button>
       <button type="button" className="min-h-11 rounded-xl border border-surface-border px-3 text-xs" onClick={()=>setConfirmLink('')}>Cancelar</button></>:
       <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-muted" onClick={()=>setConfirmLink(link.id)}><Link2Off size={15}/> Desvincular deste registro</button>}
    </div>}
   </div>})}
  <label className="block text-xs font-semibold">Anexar guia, laudo ou protocolo
   <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block min-h-11 w-full text-xs text-ink-muted"/></label>
  <HealthRelationPicker title="Natureza do documento" kind="status" value={role}
   onValueChange={value=>setRole(value as 'protocol'|'supporting')}
   className="min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 text-xs">
    <option value="supporting">Documento de apoio</option>
    <option value="protocol">Protocolo informado pelo profissional</option>
  </HealthRelationPicker>
  <button type="button" disabled={!file||busy} onClick={()=>void upload()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/40 px-3 text-sm font-semibold text-teal-200 disabled:opacity-40">
   <Upload size={17}/> {busy?'Registrando…':'Anexar com segurança'}</button>
  {message&&<p role="status" className="text-xs text-ink-muted">{message}</p>}
 </section>;
}
