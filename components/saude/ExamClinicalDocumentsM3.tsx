'use client';
/** M3 document workflow inside the existing canonical exam order; never creates a second order. */
import { useEffect,useMemo,useRef,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FilePlus2, FileCheck2, ShieldCheck, Unlink, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import type { ClinicalAssetM1,ClinicalAssetLinkM1 } from '@/lib/clinical-exams-m1/types';
import { registerClinicalAssetM3,unlinkClinicalAssetM3 } from '@/lib/clinical-exams-m3/repository';
import { ClinicalAssetViewerM3 } from './ClinicalAssetViewerM3';

type Item={id:string;name:string;status:string};
type Session={id:string;label:string;itemIds:string[]};
const field='min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary';
export function ExamClinicalDocumentsM3({orderId,items,sessions}:{orderId:string;items:readonly Item[];sessions:readonly Session[]}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
 const [file,setFile]=useState<File|null>(null),[role,setRole]=useState<'request'|'result'|'supporting'>('result');
 const [selected,setSelected]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const stableIntent=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{setSelected([]);setFile(null);setConfirmed(false);setMessage('');stableIntent.current=null;},[uid,pid,orderId]);
 const list=useLiveQuery(async()=>{
  if(!uid||!pid||!orderId)return {assets:[] as ClinicalAssetM1[],links:[] as ClinicalAssetLinkM1[]};
  const [assets,links,order]=await Promise.all([
    db.clinical_assets.where('person_id').equals(pid).toArray(),
    db.clinical_asset_links.where('person_id').equals(pid).toArray(),
    db.exam_orders.get(orderId)
  ]);
  if(!order||order.user_id!==uid||order.person_id!==pid||order.deleted_at)return {assets:[],links:[]};
  const itemIds=new Set(items.map(item=>item.id));const sessionIds=new Set(sessions.map(s=>s.id));
  const relevant=links.filter(l=>l.user_id===uid&&l.person_id===pid&&!l.deleted_at&&(
     (l.entity_type==='exam_order'&&l.entity_id===orderId)||
     (l.entity_type==='exam_order_item'&&itemIds.has(l.entity_id))||
     (l.entity_type==='exam_session'&&sessionIds.has(l.entity_id))));
  const assetIds=new Set(relevant.map(x=>x.asset_id));
  return {assets:assets.filter(a=>a.user_id===uid&&a.person_id===pid&&!a.deleted_at&&assetIds.has(a.id)),links:relevant};
 },[uid,pid,orderId,items.map(x=>x.id).join('|'),sessions.map(x=>x.id).join('|')]);
 const targetIds=useMemo(()=>new Set(items.map(x=>x.id)),[items]);
 const candidates=role==='result'?selected.filter(id=>targetIds.has(id)):[];
 const canSubmit=Boolean(pid&&uid&&file&&confirmed&&(role!=='result'||candidates.length>0)&&!busy);
 const attach=async()=>{
  if(!canSubmit||!file)return;
  setBusy(true);setMessage('');
  try{
    const targets=role==='result'?candidates.map(id=>({entity_type:'exam_order_item' as const,entity_id:id})):[{entity_type:'exam_order' as const,entity_id:orderId}];
    if(role==='result'&&!window.confirm(`Vincular este laudo a ${targets.length} exame(s) selecionado(s)? Nenhum resultado será interpretado automaticamente.`))return;
    const key=JSON.stringify([uid,pid,orderId,file.name,file.size,file.lastModified,role,targets]);
    if(stableIntent.current?.key!==key)stableIntent.current={key,id:crypto.randomUUID()};
    const outcome=await registerClinicalAssetM3({personId:pid,file,targets,role,intentId:stableIntent.current.id});
    setMessage(outcome.uploaded?`${outcome.links} vínculo(s) registrado(s). Documento privado sincronizado.`:`${outcome.links} vínculo(s) salvo(s). ${outcome.message}`);
    if(outcome.uploaded){setFile(null);setConfirmed(false);setSelected([]);stableIntent.current=null;}
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível vincular o arquivo.');}
  finally{setBusy(false);}
 };
 return <section className="space-y-3 rounded-2xl border border-amber-300/20 bg-surface p-4" aria-label="Laudos e documentos do pedido">
  <header className="flex items-center gap-2"><FileCheck2 size={19} className="text-amber-300"/><div><h2 className="text-sm font-bold">Laudos e documentos privados</h2><p className="text-[11px] text-ink-muted">Uma cópia física, vários vínculos explícitos · sem diagnóstico automático</p></div></header>
  <div className="space-y-2 rounded-xl border border-surface-border/60 p-3">
   <label className="block text-xs font-semibold">Selecionar PDF ou imagem (até 12 MB)
    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="Escolher laudo ou pedido" className={`${field} mt-1 block py-2.5`} onChange={e=>{setFile(e.target.files?.[0]||null);setConfirmed(false);stableIntent.current=null;}}/></label>
   <fieldset className="space-y-2"><legend className="text-xs font-semibold">Finalidade do documento</legend>
    <div className="flex flex-wrap gap-2">{([['request','Pedido médico'],['result','Laudo / resultado'],['supporting','Anexo complementar']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={role===id} onClick={()=>{setRole(id);setConfirmed(false);}} className={`min-h-11 rounded-xl border px-3 text-xs ${role===id?'border-amber-300 bg-amber-300/10 text-amber-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>
   </fieldset>
   {role==='result'&&<div className="space-y-2 rounded-xl border border-surface-border/50 p-2">
    <p className="text-xs font-semibold">Selecionar exatamente quais exames constam deste laudo</p>
    <div className="flex flex-wrap gap-1.5"><button type="button" className="min-h-11 rounded-lg border border-surface-border px-2.5 text-[11px]" onClick={()=>setSelected(items.filter(x=>['collected','result_pending','result_received'].includes(x.status)).map(x=>x.id))}>Todos coletados / com resultado</button>
     {sessions.map(s=><button type="button" key={s.id} className="min-h-11 rounded-lg border border-surface-border px-2.5 text-[11px]" onClick={()=>setSelected(s.itemIds.filter(id=>targetIds.has(id)))}>{s.label}</button>)}
     <button type="button" className="min-h-11 rounded-lg border border-surface-border px-2.5 text-[11px]" onClick={()=>setSelected([])}>Limpar</button></div>
    <div className="max-h-56 space-y-1 overflow-y-auto">{items.map(item=><label key={item.id} className="flex min-h-10 items-center gap-2 border-b border-surface-border/30 p-1 text-xs"><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,item.id]:prev.filter(id=>id!==item.id))}/><span className="min-w-0 break-words">{item.name} · <span className="text-ink-muted">{item.status}</span></span></label>)}</div>
    <p className="text-[11px] text-amber-200">{candidates.length} exame(s) selecionado(s). O arquivo não altera o estado clínico dos itens.</p>
   </div>}
   <label className="flex min-h-11 items-start gap-2 text-xs"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Conferi o arquivo e os vínculos com o pedido real; autorizo o armazenamento privado.</label>
   <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-3 text-sm font-bold text-void disabled:opacity-40" disabled={!canSubmit} onClick={()=>void attach()}><FilePlus2 size={17}/>{busy?'Salvando e conferindo…':'Salvar um arquivo e vincular'}</button>
   <p className="text-[11px] text-ink-muted">No APK, o PDF pode ser preservado offline no armazenamento privado do aplicativo. No PWA, se o upload falhar, mantenha o original e selecione-o novamente.</p>
  </div>
  {message&&<p role="status" className="rounded-xl bg-amber-300/[.06] p-3 text-xs text-amber-200">{message}</p>}
  <div className="space-y-3">{!list?.assets.length?<p className="text-xs text-ink-muted">Nenhum arquivo privado vinculado a este pedido.</p>:list.assets.map(asset=><div key={asset.id} className="space-y-2">
   <ClinicalAssetViewerM3 personId={pid} asset={asset}/>
   <div className="flex flex-wrap items-center gap-1.5">{list.links.filter(l=>l.asset_id===asset.id).map(l=><div key={l.id} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-surface-border/50 px-2 text-[11px]">
    <span className="max-w-[170px] truncate">{l.entity_type==='exam_order'?'Pedido médico':items.find(x=>x.id===l.entity_id)?.name||'Sessão'}</span>
    <button type="button" className="grid size-9 place-items-center text-rose-300" aria-label="Desvincular sem apagar o arquivo" onClick={()=>{
      if(!window.confirm('Remover somente este vínculo? O arquivo será preservado para os outros exames.'))return;
      void unlinkClinicalAssetM3(pid,l.id).then(()=>setMessage('Vínculo removido. O arquivo compartilhado foi preservado.')).catch(e=>setMessage(e instanceof Error?e.message:'Falha ao desvincular.'));
    }}><Unlink size={14}/></button></div>)}</div>
  </div>)}
  </div>
  <p className="flex items-start gap-1 text-[11px] text-ink-muted"><ShieldCheck size={14}/> Nenhum botão desta tela executa exclusão física do PDF compartilhado no servidor.</p>
 </section>;
}
