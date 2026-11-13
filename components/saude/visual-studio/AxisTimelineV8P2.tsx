'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, Info, Eye } from 'lucide-react';
import type { StudioSnapshotV8 } from '@/lib/health-intelligence/visual-studio-v8';
import { projectAxisCalendarV8P2 } from '@/lib/health-intelligence/visual-studio-v8p2';

export function AxisTimelineV8P2({snapshot,range}:{snapshot:StudioSnapshotV8;range:7|14|30}){
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const grids=useMemo(()=>snapshot.axes.map(axis=>projectAxisCalendarV8P2(snapshot,axis,range)),[snapshot,range]);
  const dayInWindow=grids[0]?.days.some(x=>x.day===selectedDay);
  const inspectedDay=dayInWindow?selectedDay:null;
  return <div className="mt-4 space-y-4" aria-label="Linha do tempo dos quatro eixos">
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><Info size={15} className="shrink-0 text-sky-300"/>Cada coluna é um dia do período. A borda pontilhada significa SEM REGISTRO — nunca valor zero. Toque numa coluna para conferir o dia, horário e origem do relato.</p>
    {grids.map(grid=><div key={grid.kind} className="rounded-2xl border border-surface-border/65 bg-void/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><h3 className="font-bold text-ink-primary">{grid.label}</h3><span className="text-ink-muted">{grid.recordedDays}/{range} dias · {grid.latest?`${grid.latest.value}/10`:'sem dado'}</span></div>
      <div className="mt-2 flex items-end gap-[3px] overflow-x-auto pb-2" role="group" aria-label={`Inspecionar dias: ${grid.label}`}>
        {grid.days.map(cell=><button key={cell.day} type="button" onClick={()=>setSelectedDay(cell.day)} aria-pressed={inspectedDay===cell.day} aria-label={`${cell.day}: ${cell.recorded?`${cell.value} de 10, registro presente`:'sem registro'}`} title={`${cell.day}: ${cell.recorded?`${cell.value}/10`:'sem registro'}`} className={`relative flex h-14 min-w-[12px] flex-1 items-end justify-center overflow-hidden rounded-t border ${cell.recorded?'border-sky-400/25 bg-sky-400/[.035]':'border-dashed border-surface-border/70 bg-transparent'} ${inspectedDay===cell.day?'outline outline-2 outline-emerald-300 outline-offset-1':''}`}>
          {cell.recorded?<span className="w-full rounded-t bg-sky-300/75" style={{height:`${Math.max(3,(cell.value??0)*9)}%`}}/>:<span className="mb-1 h-[2px] w-1 bg-ink-muted/40"/>}
        </button>)}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-[10px] text-ink-muted"><span>{grid.missingDays} dia(s) sem registro</span><span>Mediana documentada: {grid.median===null?'—':`${grid.median}/10`}</span></div>
      {inspectedDay&&<div className="mt-2 flex items-start gap-2 rounded-xl border border-surface-border/70 bg-surface/50 p-2 text-[11px]"><Eye size={14} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-ink-muted">{inspectedDay.split('-').reverse().join('/')}: {grid.days.find(x=>x.day===inspectedDay)?.recorded?`${grid.days.find(x=>x.day===inspectedDay)?.value}/10 · horário ${grid.days.find(x=>x.day===inspectedDay)?.time||'não informado'} · origem ${grid.days.find(x=>x.day===inspectedDay)?.source||'não informada'}`:'nenhuma observação registrada neste eixo.'}</p></div>}
    </div>)}
    <p className="flex items-start gap-2 text-[11px] text-ink-muted"><CalendarDays size={14} className="shrink-0 text-sky-300"/>Valores são percepções relatadas; não representam diagnóstico nem efeito de medicamento. Dor alta indica mais dor, enquanto valores altos nos demais eixos indicam maior função percebida.</p>
  </div>;
}
