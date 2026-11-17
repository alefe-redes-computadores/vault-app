'use client';
import { useEffect, useState } from 'react';
import { BellRing, RotateCcw } from 'lucide-react';
import { COMMITMENT_PRESETS_M3, COMMITMENT_KINDS_M3, COMMITMENT_LOCAL_EVENT_M3,
  getCommitmentOverrideM3, setCommitmentOverrideM3, type CommitmentKindM3 } from '@/lib/m3/notification-overrides';

const labels:Record<CommitmentKindM3,string>={consulta:'Consultas',exame:'Exames',retirada:'Retiradas',compra:'Aquisições planejadas'};
const friendly=(offset:number)=>offset===0?'Na hora':offset%1440===0?`${offset/1440} dia(s) antes`:
  offset%60===0?`${offset/60} hora(s) antes`:`${offset} min antes`;

/** P1: substituição LOCAL dos offsets do motor canônico; nunca agenda por si. */
export function NotificationCommitmentPreferencesM3({userId,personId}:{userId:string;personId:string}){
  const [value,setValue]=useState<Partial<Record<CommitmentKindM3,number[]|null>>>({});
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const refresh=()=>setValue(Object.fromEntries(COMMITMENT_KINDS_M3.map(kind=>[kind,getCommitmentOverrideM3(userId,personId,kind)])));
    refresh();window.addEventListener(COMMITMENT_LOCAL_EVENT_M3,refresh);
    return ()=>window.removeEventListener(COMMITMENT_LOCAL_EVENT_M3,refresh);
  },[userId,personId]);
  const change=(kind:CommitmentKindM3,offset:number)=>{
    const prior=value[kind]??[];
    const next=prior.includes(offset)?prior.filter(n=>n!==offset):[...prior,offset];
    if(next.length>4){setMessage('Escolha no máximo quatro antecedências por categoria.');return;}
    try {setCommitmentOverrideM3(userId,personId,kind,next);setMessage('Preferência local salva. O Android ainda precisa autorizar os avisos.');}
    catch(e){setMessage(e instanceof Error?e.message:'Não foi possível guardar no aparelho.');}
  };
  const reset=(kind:CommitmentKindM3)=>{
    try{setCommitmentOverrideM3(userId,personId,kind,null);setMessage('Preferência padrão restaurada.');}
    catch(e){setMessage(e instanceof Error?e.message:'Não foi possível restaurar.');}
  };
  return <section aria-label="Antecedências por compromisso" className="mt-4 rounded-3xl border border-emerald-300/20 bg-surface p-4">
    <header className="flex items-start gap-3"><BellRing className="mt-0.5 shrink-0 text-emerald-300" size={18}/><div>
      <h2 className="text-sm font-bold text-ink-primary">Antecedências por compromisso</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">Etapa M3 P1: ajustes somente neste dispositivo e para a pessoa ativa. Não são sincronizados entre aparelhos e não confirmam que uma consulta, exame ou retirada ocorreu.</p>
    </div></header>
    {!userId||!personId?<p className="mt-3 text-xs text-amber-200">Escolha uma pessoa para editar seus avisos.</p>:null}
    <div className="mt-3 space-y-3">{COMMITMENT_KINDS_M3.map(kind=>{
      const custom=value[kind]??null;
      return <div key={kind} className="rounded-2xl border border-surface-border/60 bg-void/20 p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs text-ink-primary">{labels[kind]}</strong>
          <button type="button" disabled={!userId||!personId||custom===null} onClick={()=>reset(kind)} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-[11px] text-ink-muted disabled:opacity-40"><RotateCcw size={13}/> Padrão</button>
        </div>
        <p className="mb-2 text-[10px] text-ink-muted">{custom===null?'Usando a configuração geral existente.':`${custom.length} antecedência(s) escolhida(s) neste aparelho.`}</p>
        <div className="flex flex-wrap gap-2">{COMMITMENT_PRESETS_M3.map(offset=><button key={offset} type="button" disabled={!userId||!personId} aria-pressed={custom?.includes(offset)??false} onClick={()=>change(kind,offset)} className={`min-h-11 rounded-xl border px-2.5 py-2 text-[11px] font-semibold disabled:opacity-40 ${custom?.includes(offset)?'border-emerald-300/60 bg-emerald-300/10 text-emerald-200':'border-surface-border/70 text-ink-secondary'}`}>{friendly(offset)}</button>)}</div>
      </div>;
    })}</div>
    {message?<p className="mt-3 text-[11px] text-emerald-200" role="status">{message}</p>:null}
  </section>;
}
