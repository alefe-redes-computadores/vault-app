'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useSharedHealthIntelligence } from '@/contexts/HealthIntelligenceContext';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useLocalDay } from '@/hooks/useLocalDay';
import { selectEpisodeActionP4 } from '@/lib/m3/clinical-episode-p4';
import { prioritizeEpisodePromptD3, contextualEpisodeHrefD3 } from '@/lib/m3/brain-return-d3';

/** No max-urgency override: just one contextually justified prompt after routine summary.
 * A dismiss is intentionally ephemeral; persistence must reuse Brain governance,
 * not create a second acknowledgements database in Home.
 */
export function ClinicalEpisodePulseP4(){
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  // Reutiliza a fotografia clínica compartilhada da Home; não duplica duas queries Dexie.
  const health=useSharedHealthIntelligence({includeAudit:false});
  const {events=[],loading}=useCareFlowM2();const today=useLocalDay();
  const [hidden,setHidden]=useState('');const [explain,setExplain]=useState(false);
  const suggestion=useMemo(()=>{
    if(!user?.id||!activePersonId||loading||health.isLoading||!health.context||health.context.userId!==user.id||health.context.personId!==activePersonId)return null;
    const owner=user.id,person=activePersonId;
    const available=health.context.consultas.filter(c=>c.id&&c.user_id===owner&&c.person_id===person&&
      c.status==='realizada'&&/^\d{4}-\d{2}-\d{2}$/.test(c.data)&&c.data<=today&&
      (Date.parse(today+'T12:00:00Z')-Date.parse(c.data+'T12:00:00Z'))<=14*86400000)
      .sort((a,b)=>b.data.localeCompare(a.data));
    if(!available.length)return null;
    const related=events.filter(e=>e.user_id===owner&&e.person_id===person);
    const byId=new Map(health.context.registrosSaude.filter(r=>r.id&&r.user_id===owner&&r.person_id===person).map(r=>[r.id!,r] as const));
    for(const consultation of available){
      const found=selectEpisodeActionP4({consultation,events:related,records:byId,userId:owner,personId:person,today});
      const ranked=prioritizeEpisodePromptD3(found,today,found?.id.startsWith('symptom:')?byId.get(found.sourceId)?.data:null);
      // Já houve registro hoje: não ressuscitar um cartão de consulta mais antiga.
      if(found&&!ranked)return null;
      if(ranked)return {...ranked,day:consultation.data,consultationId:consultation.id!};
    }
    return null;
  },[health.context,health.isLoading,events,loading,user?.id,activePersonId,today]);
  const scope=`${user?.id||''}:${activePersonId||''}:${suggestion?.id||''}`;
  if(!suggestion||hidden===scope)return null;
  return <section aria-label="Acompanhamento opcional do Brain por consulta" className="rounded-[22px] border border-sky-300/20 bg-surface/75 p-3.5">
    <div className="flex items-start gap-2.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[.07] text-sky-300"><Activity size={18}/></span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-sky-300">Brain · Acompanhamento opcional</p>
        <strong className="mt-1 block break-words text-sm text-ink-primary">{suggestion.label}</strong>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{suggestion.explanation}</p>
      </div>
      <button type="button" aria-label="Dispensar esta sugestão por enquanto" onClick={()=>setHidden(scope)} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><X size={16}/></button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href={contextualEpisodeHrefD3(suggestion.href,suggestion.consultationId)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.07] px-3 text-xs font-semibold text-sky-200">Abrir registro <ArrowUpRight size={14}/></Link>
      <Link href={`/saude/careflow/episodios?consulta=${encodeURIComponent(suggestion.consultationId)}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-secondary">Ver episódio <ArrowUpRight size={14}/></Link>
      <button type="button" aria-expanded={explain} onClick={()=>setExplain(x=>!x)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs text-ink-muted">Por quê? <ChevronDown size={14} className={explain?'rotate-180':''}/></button>
    </div>
    {explain&&<p className="mt-2 rounded-xl border border-surface-border/60 bg-void/20 p-3 text-[11px] leading-relaxed text-ink-muted">Este cartão aparece porque há um registro explícito relacionado à consulta de {suggestion.day}. Não cria pendências, não confirma uma ação e não define diagnóstico. Dispensar oculta o cartão apenas nesta sessão visual.</p>}
  </section>;
}
