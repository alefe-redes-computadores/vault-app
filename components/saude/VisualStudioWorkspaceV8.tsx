'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BrainCircuit, Pill, ChevronRight, Eye, ShieldCheck, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useLocalDay } from '@/hooks/useLocalDay';
import type { Medicamento } from '@/lib/types';
import { shiftBrainDayV7, projectBrainUniversalV7 } from '@/lib/health-intelligence/brain-v7-universal';
import { projectVisualStudioV8 } from '@/lib/health-intelligence/visual-studio-v8';
import { PillStudioV8 } from './visual-studio/PillStudioV8';
import { FenixSceneV8 } from './visual-studio/FenixSceneV8';
import { AxisCheckinV8 } from './visual-studio/AxisCheckinV8';
import { ClinicalDossierV8 } from './visual-studio/ClinicalDossierV8';

const palette=['#e5e7eb','#22d3ee','#34d399','#fb7185','#a78bfa','#fbbf24','#64748b','#f8fafc'];
export function VisualStudioWorkspaceV8(){
  const {user,loading:authLoading}=useAuth();const {activePersonId}=useActivePersonId();const today=useLocalDay();
  const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
  const [selected,setSelected]=useState('');const [range,setRange]=useState<7|14|30>(14);
  const [testColors,setTestColors]=useState<string[]|null>(null);
  const [brainAnchors,setBrainAnchors]=useState<string[]>([]);const [loadedBrainScope,setLoadedBrainScope]=useState('');
  useEffect(()=>{
    let anchors:string[]=[];
    if(uid&&pid){try{const raw=localStorage.getItem(`vault:brain-v7:local:${encodeURIComponent(uid)}:${encodeURIComponent(pid)}`);const saved=raw?JSON.parse(raw):null;
      if(saved&&Array.isArray(saved.anchors))anchors=saved.anchors.filter((x:unknown):x is string=>typeof x==='string').slice(0,5);
    }catch{/* local preferences unavailable */}}
    setBrainAnchors(anchors);setLoadedBrainScope(scope);setSelected('');setTestColors(null);
  },[scope,uid,pid]);
  const data=useLiveQuery(async()=>{
    if(!uid||!pid)return null;
    try{
      const [medications,acquisitions,doseLogs,records,devices]=await Promise.all([
        db.medicamentos.where('[user_id+person_id]').equals([uid,pid]).toArray(),
        db.renovacoes.where('[user_id+person_id]').equals([uid,pid]).toArray(),
        db.doseLogs.where('[user_id+person_id+data]').between([uid,pid,shiftBrainDayV7(today,-39)],[uid,pid,today],true,true).toArray(),
        db.registros_saude.where('[user_id+person_id+data]').between([uid,pid,shiftBrainDayV7(today,-29)],[uid,pid,today],true,true).toArray(),
        db.health_devices.where('person_id').equals(pid).toArray(),
      ]);
      return {scope,medications,acquisitions,doseLogs,records,devices,error:''};
    }catch(e){return {scope,medications:[] as Medicamento[],acquisitions:[],doseLogs:[],records:[],devices:[],error:e instanceof Error?e.message:'Falha de leitura local.'};}
  },[uid,pid,today]);
  const snapshot=data?.scope===scope?data:null;
  const medicines=useMemo(()=>(snapshot?.medications||[]).filter(m=>m.id&&m.user_id===uid&&m.person_id===pid).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),[snapshot,uid,pid]);
  const chosen=medicines.find(m=>m.id===selected)||medicines[0]||null;
  const studio=useMemo(()=>projectVisualStudioV8({userId:uid,personId:pid,todayISO:today,records:snapshot?.records||[],devices:snapshot?.devices||[],rangeDays:range}),[uid,pid,today,snapshot,range]);
  const report=useMemo(()=>snapshot&&uid&&pid&&loadedBrainScope===scope?projectBrainUniversalV7({userId:uid,personId:pid,todayISO:today,nowISO:new Date().toISOString(),medications:medicines,acquisitions:snapshot.acquisitions,doseLogs:snapshot.doseLogs,records:snapshot.records,anchorMedicationIds:brainAnchors}):null,[snapshot,uid,pid,today,medicines,brainAnchors,loadedBrainScope,scope]);
  const preview=chosen?{...chosen,cores:testColors||chosen.cores}:null;
  const ready=Boolean(uid&&pid&&snapshot&&!snapshot.error);
  return <main className="min-h-[100dvh] bg-void px-3.5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary"><div className="mx-auto max-w-xl space-y-4">
    <header className="flex items-center gap-3"><Link href="/saude/brain-v7" aria-label="Voltar ao Brain V7" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-emerald-300">VAULT · V8 · VISUAL STUDIO</p><h1 className="font-display text-2xl font-bold">Fênix & PillStudio</h1><p className="text-xs text-ink-muted">Aparência, evidências e resumo clínico</p></div><Sparkles size={24} className="text-emerald-300"/></header>
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.035] p-3 text-xs leading-relaxed text-ink-muted"><div className="flex items-center gap-2 font-bold text-emerald-200"><ShieldCheck size={16}/>Visual fiel ao cadastro, dados com origem</div><p className="mt-1">Prévia 3D-SVG ilustrativa, sem inventar ingredientes. A Fênix usa dispositivos realmente cadastrados; métricas ausentes ficam ausentes. Nenhum cálculo modifica doses ou estoque.</p></section>
    {authLoading?<p role="status" className="text-xs text-ink-muted">Restaurando sessão…</p>:!uid?<p role="status" className="text-xs text-ink-muted">Entre na sua conta.</p>:!pid?<p role="status" className="text-xs text-ink-muted">Selecione uma pessoa.</p>:data===undefined||!snapshot?<p role="status" className="text-xs text-ink-muted">Consultando dados desta pessoa…</p>:snapshot.error?<p role="alert" className="rounded-xl border border-rose-300/20 p-3 text-xs text-rose-300">{snapshot.error}</p>:<>
      <section className="rounded-[25px] border border-surface-border bg-surface/80 p-4"><div className="flex items-center gap-2"><Pill size={18} className="text-emerald-300"/><h2 className="text-sm font-bold text-ink-primary">PillStudio · prévia da apresentação</h2></div><p className="mt-2 text-xs text-ink-muted">Selecione um medicamento. O formato e as cores iniciais vêm do cadastro, não da bula ou de suposições.</p>
        {medicines.length?<><div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Medicamentos da pessoa">{medicines.slice(0,60).map(m=><button key={m.id} type="button" onClick={()=>{setSelected(m.id!);setTestColors(null);}} aria-pressed={chosen?.id===m.id} className={`min-h-11 shrink-0 max-w-[190px] truncate rounded-xl border px-3 text-xs font-semibold ${chosen?.id===m.id?'border-emerald-300/40 bg-emerald-400/10 text-emerald-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{m.nome}</button>)}</div>
        {preview&&<><div className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 mt-2 rounded-3xl border border-surface-border bg-void/95 p-2 backdrop-blur-xl"><PillStudioV8 medication={preview} large/><p className="mt-2 text-center text-xs font-semibold text-ink-primary">{chosen?.nome} {chosen?.dosagem||''}</p><p className="text-center text-[11px] text-ink-muted">{testColors?'Cores de comparação ainda não salvas':'Formato e cores do cadastro atual'}</p></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Comparar cores ilustrativas">{palette.map(color=><button key={color} type="button" onClick={()=>setTestColors([color,chosen?.cores?.[1]||color])} aria-label={`Prévia de cor ${color}`} aria-pressed={Boolean(testColors?.[0]===color)} className={`grid size-11 shrink-0 place-items-center rounded-full border-2 ${testColors?.[0]===color?'border-emerald-300':'border-surface-border'}`}><span className="size-7 rounded-full border border-white/20" style={{backgroundColor:color}}/></button>)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setTestColors(null)} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-secondary">Voltar às cores reais</button><Link href={`/saude/medicamentos/editar?id=${encodeURIComponent(chosen!.id!)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-200">Editar cadastro <ChevronRight size={14}/></Link></div><p className="mt-2 text-[11px] text-ink-muted">O comparador de paleta não altera o medicamento. A aparência só é persistida pelo formulário oficial de edição.</p></>}
        </>:<p className="mt-3 text-xs text-ink-muted">Nenhum medicamento cadastrado para esta pessoa.</p>}
      </section>
      <FenixSceneV8 snapshot={studio}/>
      <section className="rounded-[25px] border border-surface-border bg-surface/80 p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Eye size={16} className="text-sky-300"/>Eixos observados</h2><div className="flex gap-1">{([7,14,30] as const).map(n=><button key={n} type="button" aria-pressed={range===n} onClick={()=>setRange(n)} className={`min-h-10 rounded-lg border px-2 text-xs ${range===n?'border-sky-300/40 bg-sky-300/10 text-sky-200':'border-surface-border text-ink-muted'}`}>{n}d</button>)}</div></div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Cada barra corresponde a um dia registrado; dias sem informação não são contados como zero nem preenchidos artificialmente.</p>
        <div className="mt-4 space-y-3">{studio.axes.map(axis=><div key={axis.kind}><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-ink-primary">{axis.label}</span><span className="text-ink-muted">{axis.documentedDays} dia(s) · {axis.latest?`${axis.latest.value}/10`:'—'}</span></div><div className="mt-2 flex h-12 items-end gap-1 overflow-x-auto border-b border-surface-border pb-0.5" role="img" aria-label={`${axis.label}: ${axis.points.map(p=>`${p.day} ${p.value}/10`).join(', ')||'sem observações'}`}>{axis.points.length?axis.points.map(p=><span key={p.day} title={`${p.day}: ${p.value}/10`} className="w-3 min-w-3 rounded-t bg-sky-300/65" style={{height:`${Math.max(4,p.value*9)}%`}}/>):<span className="self-center text-[11px] text-ink-muted">Sem registros neste intervalo</span>}</div></div>)}</div>
        {studio.vitals.length>0&&<div className="mt-4 flex flex-wrap gap-2">{studio.vitals.map(v=><span key={v.tipo} className="rounded-xl border border-surface-border px-2 py-1 text-[11px] text-ink-muted">{v.tipo}: {v.value} · {v.source} {v.deviceName?`· ${v.deviceName}`:''}</span>)}</div>}
      </section>
      <AxisCheckinV8 snapshot={studio} today={today} enabled={ready}/>
      <ClinicalDossierV8 brain={report} studio={studio} medications={medicines} userId={uid} personId={pid}/>
      <div className="flex flex-wrap gap-2"><Link href="/saude/brain-v7" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/25 px-3 text-xs font-semibold text-violet-200"><BrainCircuit size={15}/>Dossiê completo Brain V7</Link><Link href="/saude/pharmalens" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-secondary">PharmaLens</Link></div>
    </>}
  </div></main>;
}
