'use client';
import { useMemo,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check,ChevronDown,Link2,RefreshCw,X } from 'lucide-react';
import type { Consulta,Medicamento } from '@/lib/types';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { consultasRepository } from '@/lib/repositories/consultas';
import { applyLinkReviewDecisionP6R2,historicalLinkCandidatesP6R2 } from '@/lib/consultations/clinical-link-review-p6p2r2';

type Props={consultation:Consulta;medications:readonly Medicamento[]};
export function ConsultationLinkReviewP6P2R2({consultation,medications}:Props){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();
  const [open,setOpen]=useState(false),[manual,setManual]=useState(false),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const id=consultation.id||'';
  const current=useLiveQuery(()=>id?db.consultas.get(id):undefined,[id]);
  const valid=!!user?.id&&!!activePersonId&&!!id&&consultation.user_id===user.id&&consultation.person_id===activePersonId&&current?.user_id===user.id&&current?.person_id===activePersonId;
  const owned=useMemo(()=>medications.filter(m=>m.id&&m.user_id===user?.id&&m.person_id===activePersonId),[medications,user?.id,activePersonId]);
  const candidate=useMemo(()=>current&&valid?historicalLinkCandidatesP6R2(current,owned):[],[current,valid,owned]);
  const linked=new Set(current?.medicamento_ids||[]),rejected=new Set(current?.revisao_vinculos_rejeitados||[]);
  const manualOptions=owned.filter(m=>!linked.has(m.id!)&&!rejected.has(m.id!)&&!candidate.some(c=>c.id===m.id)&&(`${m.nome} ${m.dosagem||''}`).toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))).slice(0,15);
  async function decide(m:Medicamento,action:'accept'|'reject'){
    if(!valid||!current||busy)return;
    setBusy(true);setError('');
    try{
      const fields=applyLinkReviewDecisionP6R2({consultation:current,medication:m,action});
      await consultasRepository.update(id,activePersonId!,fields);
    }catch(e){setError(e instanceof Error?e.message:'Falha ao registrar decisão; nenhuma alteração foi confirmada.');}
    finally{setBusy(false);}
  }
  if(!valid)return null;
  return <section aria-label="Revisão humana de vínculos históricos" className="rounded-[22px] border border-sky-300/20 bg-sky-300/[.035] p-3.5">
    <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 text-left" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className="flex items-center gap-2"><Link2 size={17} className="text-sky-300"/><span className="text-sm font-semibold">Revisar vínculos históricos</span></span>
      <span className="flex items-center gap-2 text-xs text-ink-muted">{candidate.length} sugestão{candidate.length===1?'':'ões'}<ChevronDown size={16} className={open?'rotate-180 transition-transform':'transition-transform'}/></span>
    </button>
    {open&&<div className="space-y-3 border-t border-surface-border/40 pt-3">
      <p className="text-xs leading-relaxed text-ink-muted">Sugestões são baseadas apenas em tratamento explicitamente vinculado aos dois cadastros. Não comprovam que o medicamento foi discutido na consulta. Aceitar ou rejeitar exige seu toque.</p>
      {candidate.map(c=>{const med=owned.find(m=>m.id===c.id);return med?<div key={c.id} className="rounded-xl border border-surface-border/50 bg-surface p-3">
        <p className="break-words text-xs font-semibold">{med.nome}</p><p className="mt-1 text-[11px] text-ink-muted">Tratamento cadastrado em comum · vínculo ainda não confirmado</p>
        <div className="mt-2 grid grid-cols-2 gap-2"><button disabled={busy} onClick={()=>void decide(med,'accept')} className="flex min-h-11 items-center justify-center gap-1 rounded-lg bg-emerald-400/15 px-2 text-xs text-emerald-200 disabled:opacity-50"><Check size={15}/>Vincular</button><button disabled={busy} onClick={()=>void decide(med,'reject')} className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-surface-border px-2 text-xs text-ink-secondary disabled:opacity-50"><X size={15}/>Não vincular</button></div>
      </div>:null})}
      {!candidate.length&&<p className="text-xs text-ink-muted">Sem sugestões novas baseadas em vínculos existentes. Nenhuma relação será inferida pelo nome ou pela data.</p>}
      <button type="button" onClick={()=>setManual(v=>!v)} className="min-h-11 text-xs font-semibold text-sky-300" aria-expanded={manual}>Escolher outro medicamento manualmente</button>
      {manual&&<div className="space-y-2"><label className="block text-xs text-ink-secondary">Buscar nesta pessoa<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Medicamento" className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 text-sm"/></label>
        {manualOptions.map(m=><div key={m.id} className="flex items-center gap-2 rounded-xl border border-surface-border/40 bg-surface p-2"><span className="min-w-0 flex-1 break-words text-xs">{m.nome}</span><button disabled={busy} className="min-h-11 rounded-lg bg-sky-400/15 px-3 text-xs font-semibold text-sky-200" onClick={()=>void decide(m,'accept')}>Vincular</button><button disabled={busy} className="min-h-11 rounded-lg px-2 text-xs text-ink-muted" onClick={()=>void decide(m,'reject')}>Descartar</button></div>)}
        {!manualOptions.length&&<p className="text-[11px] text-ink-muted">Nenhum candidato manual disponível.</p>}
      </div>}
      <p className="text-[11px] text-ink-muted">{rejected.size} vínculo(s) rejeitado(s) nesta consulta. As decisões são registradas localmente e entram na sincronização existente; pendência offline não significa envio confirmado.</p>
      {error&&<p role="alert" className="rounded-lg border border-amber-400/20 p-2 text-xs text-amber-200">{error}</p>}
      {busy&&<p role="status" className="flex gap-2 text-xs text-sky-200"><RefreshCw size={14} className="animate-spin"/>Salvando decisão…</p>}
    </div>}
  </section>;
}
