'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { ClinicalAssetViewerM3 } from './ClinicalAssetViewerM3';
/** Consultation and linked orders remain the authorities; show assets only through explicit links. */
export function ClinicalConsultationAssetsM3({consultationId}:{consultationId:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
 const rows=useLiveQuery(async()=>{
  if(!uid||!pid||!consultationId)return [];
  const consultation=await db.consultas.get(consultationId);
  if(!consultation||consultation.user_id!==uid||consultation.person_id!==pid)return [];
  const [associations,assets,links,items,sessions]=await Promise.all([
    db.consultation_exam_order_links.where('person_id').equals(pid).toArray(),
    db.clinical_assets.where('person_id').equals(pid).toArray(),
    db.clinical_asset_links.where('person_id').equals(pid).toArray(),
    db.exam_order_items.where('person_id').equals(pid).toArray(),
    db.exam_sessions.where('person_id').equals(pid).toArray(),
  ]);
  const orderIds=new Set(associations.filter(l=>l.user_id===uid&&l.person_id===pid&&l.consultation_id===consultationId&&!l.deleted_at).map(l=>l.order_id));
  const itemIds=new Set(items.filter(i=>i.user_id===uid&&i.person_id===pid&&!i.deleted_at&&orderIds.has(i.order_id)).map(i=>i.id));
  const sessionIds=new Set(sessions.filter(s=>s.user_id===uid&&s.person_id===pid&&!s.deleted_at&&orderIds.has(s.order_id)).map(s=>s.id));
  const assetIds=new Set(links.filter(l=>l.user_id===uid&&l.person_id===pid&&!l.deleted_at&&(
    (l.entity_type==='consultation'&&l.entity_id===consultationId)||
    (l.entity_type==='exam_order'&&orderIds.has(l.entity_id))||
    (l.entity_type==='exam_order_item'&&itemIds.has(l.entity_id))||
    (l.entity_type==='exam_session'&&sessionIds.has(l.entity_id)))).map(l=>l.asset_id));
  return assets.filter(a=>a.user_id===uid&&a.person_id===pid&&!a.deleted_at&&assetIds.has(a.id));
 },[uid,pid,consultationId]);
 if(!rows?.length)return null;
 return <section className="mt-3 space-y-3 rounded-xl border border-amber-300/20 bg-surface p-3" aria-label="Laudos privados da consulta e pedidos relacionados">
  <h3 className="flex items-center gap-2 text-xs font-bold text-ink-primary"><FileText size={16} className="text-amber-300"/>Laudos privados vinculados ({rows.length})</h3>
  {rows.map(asset=><ClinicalAssetViewerM3 key={asset.id} asset={asset} personId={pid}/>)}
  <p className="text-[11px] text-ink-muted">Vínculos explícitos com a consulta ou pedido relacionado. Datas semelhantes não geram associações.</p>
 </section>;
}
