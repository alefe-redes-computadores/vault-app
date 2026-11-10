"use client";
/** Optional local check-in preference. Only previously saved mood rows are counted. */
import { useEffect,useMemo,useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulse, CalendarPlus, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { getLocalTodayISO } from "@/lib/health-utils";
const prefix="vault:m115:mood-continuity:v1:";
const key=(user:string,person:string)=>prefix+encodeURIComponent(user)+":"+encodeURIComponent(person);
const epoch=(value:string)=>/^\d{4}-\d\d-\d\d$/.test(value)?Date.parse(value+"T12:00:00Z"):NaN;
export function MoodContinuityM115({onConfigure}:{onConfigure:()=>void}){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();
  const uid=user?.id??null,pid=activePersonId;
  const [enabled,setEnabled]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{setMessage("");try{setEnabled(Boolean(uid&&pid&&localStorage.getItem(key(uid,pid))==="1"));}catch{setEnabled(false);}},[uid,pid]);
  const source=useLiveQuery(async()=>{
    if(!uid||!pid)return {uid,pid,dates:[] as string[]};
    const all=await db.registros_saude.where("person_id").equals(pid).toArray();
    return {uid,pid,dates:all.filter(row=>row.user_id===uid&&row.person_id===pid&&row.categoria==="humor"&&Number.isFinite(epoch(row.data))).map(row=>row.data)};
  },[uid,pid]);
  const matches=source?.uid===uid&&source?.pid===pid;
  const days=useMemo(()=>{
    if(!matches||!source)return null;
    const today=getLocalTodayISO(),now=epoch(today);
    if(!Number.isFinite(now))return null;
    const valid=[...new Set(source.dates)].filter(d=>epoch(d)<=now&&epoch(d)>now-30*86400000).sort();
    return {coverage:valid.length,last:valid.length?valid[valid.length-1]:null,elapsed:valid.length?Math.floor((now-epoch(valid[valid.length-1]))/86400000):null};
  },[matches,source]);
  function toggle(next:boolean){
    if(!uid||!pid)return;
    try{localStorage.setItem(key(uid,pid),next?"1":"0");setEnabled(next);setMessage(next?"Acompanhamento visual ativado só para esta pessoa e aparelho.":"Acompanhamento visual desativado.");}
    catch{setMessage("Armazenamento indisponível: preferência não salva.");}
  }
  if(!uid||!pid)return null;
  return <section className="mx-auto mt-4 max-w-xl rounded-[22px] border border-emerald-300/15 bg-surface p-4" aria-label="Continuidade voluntária de humor">
    <div className="flex gap-2"><HeartPulse size={19} className="mt-0.5 shrink-0 text-emerald-300"/><div><h2 className="text-sm font-semibold text-ink-primary">Acompanhamento de humor, se você quiser</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Consulte a frequência dos seus próprios relatos, sem avaliação do seu estado pela ausência de registros.</p></div></div>
    <label className="mt-3 flex min-h-11 items-center gap-3 text-xs text-ink-secondary"><input type="checkbox" checked={enabled} onChange={e=>toggle(e.target.checked)} className="size-5 accent-emerald-300"/>Mostrar cobertura dos meus check-ins neste aparelho</label>
    {enabled?<div className="mt-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3"><p className="text-xs text-ink-secondary">{days?`${days.coverage} dia(s) com humor informado nos últimos 30 dias`:"Consultando registros locais…"}</p>{days&&<p className="mt-1 text-[11px] text-ink-muted">{days.last?`Último registro declarado: ${days.last.split("-").reverse().join("/")}.`:"Sem registros nessa janela; isso não informa como você está se sentindo."}{days.elapsed!==null&&days.elapsed>=3?" Se fizer sentido, você pode configurar um lembrete discreto para retomar os registros.":""}</p>}<button type="button" onClick={onConfigure} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 px-3 text-xs font-bold text-emerald-200"><CalendarPlus size={15}/>Escolher horário de lembrete</button></div>:null}
    <p className="mt-2 flex gap-2 text-[10px] leading-relaxed text-ink-faint"><Info size={13} className="shrink-0"/>Nenhum lembrete é criado sozinho. Desativar não apaga registros e não altera o Brain.</p>
    {message?<p role="status" className="mt-2 text-[11px] text-emerald-200">{message}</p>:null}
  </section>;
}
