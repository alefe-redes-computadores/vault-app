'use client';
import { useState } from 'react';
import { Check, HeartPulse, ShieldCheck } from 'lucide-react';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { AXES_V8, isAxisValueV8, type StudioSnapshotV8 } from '@/lib/health-intelligence/visual-studio-v8';

export function AxisCheckinV8({snapshot,today,enabled}:{snapshot:StudioSnapshotV8;today:string;enabled:boolean}){
  const {createRegistro}=useRegistrosSaude();
  const [values,setValues]=useState<Record<string,number>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [feedback,setFeedback]=useState('');
  async function save(kind:typeof AXES_V8[number]){
    if(!enabled||busy||!snapshot.authorized||snapshot.day!==today||!isAxisValueV8(values[kind.kind]))return;
    setBusy(kind.kind);setFeedback('');
    try{
      const now=new Date();const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      await createRegistro({categoria:kind.categoria,tipo:kind.tipo,nome:kind.title,intensidade:values[kind.kind],data:today,horario:time,
        source:'manual',contexto:'Check-in multidimensional VAULT V8; escala subjetiva 0–10',observacoes:(notes[kind.kind]||'').trim().slice(0,300)});
      setValues(v=>{const n={...v};delete n[kind.kind];return n;});setNotes(v=>({...v,[kind.kind]:''}));setFeedback(`${kind.title}: registro criado e sincronização solicitada.`);
    }catch(e){setFeedback(e instanceof Error?`Não foi possível salvar: ${e.message}`:'Não foi possível salvar o registro.');}
    finally{setBusy(null);}
  }
  return <section className="rounded-[25px] border border-sky-400/20 bg-surface/80 p-4" aria-labelledby="v8-axes-heading">
    <div className="flex items-center gap-2"><HeartPulse size={18} className="text-sky-300"/><h2 id="v8-axes-heading" className="text-sm font-bold text-ink-primary">Check-in de quatro eixos</h2></div>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">Cada eixo gera um registro próprio no Diário, associado à pessoa ativa. Nada é salvo enquanto você não confirmar. Dor alta significa mais dor; nos demais eixos, números altos indicam maior preservação da função percebida.</p>
    <div className="mt-4 space-y-3">{AXES_V8.map(axis=>{
      const current=values[axis.kind];const series=snapshot.axes.find(s=>s.kind===axis.kind);
      return <div key={axis.kind} className="rounded-2xl border border-surface-border/80 bg-surface-raised/60 p-3">
        <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-ink-primary">{axis.title}</h3><span className="rounded-full bg-void/60 px-2 py-1 font-mono text-xs text-sky-200">{current===undefined?'—':`${current}/10`}</span></div>
        <p className="mt-1 text-[11px] text-ink-muted">Último: {series?.latest?`${series.latest.value}/10 em ${series.latest.day}`:'sem registro'}</p>
        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={`${axis.title}: intensidade de zero a dez`}>{Array.from({length:11},(_,value)=><button key={value} type="button" disabled={!enabled||Boolean(busy)} aria-pressed={current===value} onClick={()=>setValues(v=>({...v,[axis.kind]:value}))} className={`grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-semibold ${current===value?'border-sky-300/70 bg-sky-300/20 text-sky-100':'border-surface-border bg-void/40 text-ink-muted'}`}>{value}</button>)}</div>
        <div className="mt-1 flex justify-between gap-3 text-[10px] text-ink-muted"><span>{axis.low}</span><span className="text-right">{axis.high}</span></div>
        <label className="mt-3 block text-[11px] text-ink-muted">Contexto opcional (até 300 caracteres)<textarea rows={2} maxLength={300} disabled={!enabled||Boolean(busy)} value={notes[axis.kind]||''} onChange={e=>setNotes(s=>({...s,[axis.kind]:e.target.value}))} placeholder="Ex.: noite de sono, alimentação, dor ao acordar…" className="mt-1 w-full resize-y rounded-xl border border-surface-border bg-void/60 px-3 py-2 text-xs text-ink-primary"/></label>
        <button type="button" onClick={()=>void save(axis)} disabled={!enabled||Boolean(busy)||!isAxisValueV8(current)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 text-xs font-semibold text-sky-200 disabled:opacity-40"><Check size={15}/>{busy===axis.kind?'Salvando…':'Salvar somente este eixo'}</button>
      </div>;
    })}</div>
    {feedback&&<p role="status" className="mt-3 rounded-xl border border-surface-border bg-void/60 p-2 text-xs text-ink-secondary">{feedback}</p>}
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={15} className="shrink-0 text-emerald-300"/>Os registros passam pela validação de autenticação e pessoa do repositório canônico; não alteram posologia, dose, estoque ou alertas.</p>
  </section>;
}
