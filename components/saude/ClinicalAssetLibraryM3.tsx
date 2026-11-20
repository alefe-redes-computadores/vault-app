'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileLock2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { ClinicalAssetViewerM3 } from './ClinicalAssetViewerM3';
import { projectAssetSummaryM3 } from '@/lib/clinical-exams-m3/policy';
/** Extension of the existing Document archive; it is not an independent Document repository. */
export function ClinicalAssetLibraryM3(){
 const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
 const scope=useLiveQuery(async()=>{
  if(!uid||!pid)return null;
  const [assets,links]=await Promise.all([
   db.clinical_assets.where('person_id').equals(pid).toArray(),
   db.clinical_asset_links.where('person_id').equals(pid).toArray(),
  ]);
  return {assets:assets.filter(a=>a.user_id===uid&&a.person_id===pid&&!a.deleted_at),summary:projectAssetSummaryM3(assets,links,uid,pid)};
 },[uid,pid]);
 if(!pid||!scope?.assets.length)return null;
 return <section className="mx-4 mb-3 space-y-2 rounded-2xl border border-amber-300/20 bg-surface/60 p-3 sm:mx-5" aria-label="Laudos privados vinculados aos exames">
  <header className="flex items-center gap-2"><FileLock2 size={18} className="text-amber-300"/><div><h2 className="text-sm font-bold text-ink-primary">Laudos privados dos exames</h2><p className="text-[11px] text-ink-muted">{scope.summary.assets} arquivos físicos · {scope.summary.links} vínculos reais · {scope.summary.pending} envios pendentes</p></div></header>
  <details><summary className="cursor-pointer rounded-xl border border-surface-border/60 px-3 py-3 text-xs font-semibold">Abrir laudos do acervo privado</summary><div className="mt-3 space-y-3">{scope.assets.map(asset=><ClinicalAssetViewerM3 key={asset.id} personId={pid} asset={asset}/>)}</div></details>
  <p className="text-[11px] text-ink-muted">O acervo tradicional continua funcionando. Arquivos clínicos novos usam o mesmo contexto de pessoa, mas permanecem no bucket privado.</p>
 </section>;
}
