"use client";
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {X} from 'lucide-react';
import {type AvatarBodyContext,type AvatarBodyPart} from '@/lib/health-profile/avatar-body';
import { AvatarMoodEvidence } from './AvatarMoodEvidence';
import { AvatarSurgeryAgenda } from './AvatarSurgeryAgenda';
export function AvatarBodyEvidence({part,context,onClose,onWeight,onEquipment,surgeryMarkerKey,onShowAllSurgeries}:{part:AvatarBodyPart;context:AvatarBodyContext;surgeryMarkerKey?:string|null;onShowAllSurgeries?:()=>void;onClose:()=>void;onWeight:()=>void;onEquipment:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  const dialog=ref.current,active=document.activeElement;
  if(active instanceof HTMLElement&&active!==document.body&&!dialog?.contains(active))returnFocus.current=active;
  dialog?.showModal();
  return()=>{dialog?.close();if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});};
 },[]);
 const date=(v:string)=>v.split('-').reverse().join('/');
 return createPortal(<dialog ref={ref} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-label="Registros representados no avatar" onCancel={event=>{event.preventDefault();onClose();}} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border border-surface-border bg-surface p-5 text-ink-primary backdrop:bg-black/70">
 <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface pb-3"><h2 className="text-sm font-semibold">{part==='mood'?'Humor informado':part==='weight'?'Variação registrada de peso':part==='surgery'?'Cirurgias · seus registros':'Equipamentos representados'}</h2><button autoFocus type="button" onClick={onClose} aria-label="Fechar contexto do avatar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised"><X size={18}/></button></header>
 {part==='mood'?<AvatarMoodEvidence context={context}/>:null}
 {part==='weight'?<div className="mt-3 space-y-3"><p className="text-xs leading-relaxed text-ink-muted">{context.weight?`${context.weight.previous.valor_numerico} kg em ${date(context.weight.previous.data)} → ${context.weight.current.valor_numerico} kg em ${date(context.weight.current.data)}. Variação: ${context.weight.delta>0?'+':''}${context.weight.delta.toLocaleString('pt-BR')} kg.`:'São necessárias duas medições válidas em kg para comparar.'} O sinal positivo ou negativo indica apenas aumento ou redução registrados; não informa composição corporal, distribuição de gordura ou se a mudança é boa ou ruim.</p><button type="button" onClick={onWeight} className="min-h-11 w-full rounded-xl bg-emerald-400/10 p-3 text-xs text-emerald-300">Ver histórico de peso ›</button></div>:null}
 {part==='surgery'?<AvatarSurgeryAgenda context={context} markerKey={surgeryMarkerKey} onShowAll={onShowAllSurgeries}/>:null}
 {part==='equipment'?<div className="mt-3 space-y-3"><p className="text-xs text-ink-muted">Tala e munhequeira aparecem somente quando cadastradas como equipamento ativo, com lado informado. A representação não confirma prescrição nem recuperação.</p>{context.supports.map(d=><p key={d.id} className="text-xs">{d.name} · lado {d.side==='right'?'direito':'esquerdo'}</p>)}<button type="button" onClick={onEquipment} className="min-h-11 w-full rounded-xl bg-amber-400/10 p-3 text-xs text-amber-300">Cadastrar equipamento existente ›</button></div>:null}
 </dialog>,document.body);
}
