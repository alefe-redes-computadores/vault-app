'use client';
import { Activity, Watch, CircleDot, Sparkles } from 'lucide-react';
import { FenixMark } from '@/components/saude/FenixMark';
import type { StudioSnapshotV8 } from '@/lib/health-intelligence/visual-studio-v8';
export function FenixSceneV8({snapshot}: {snapshot:StudioSnapshotV8}){
  const deviceNames=snapshot.activeDevices.filter(x=>x.kind==='watch'||x.kind==='ring');
  const coverage=snapshot.axes.reduce((a,x)=>a+x.documentedDays,0);
  return <section className="overflow-hidden rounded-[26px] border border-emerald-400/20 bg-[radial-gradient(circle_at_50%_22%,rgba(52,211,153,.12),transparent_58%),linear-gradient(160deg,#101d29,#0a111b)] p-4" aria-label="Fênix Studio · registros observados">
    <header className="flex items-center gap-3"><FenixMark size="sm"/><div><h2 className="text-sm font-bold text-ink-primary">Fênix Studio · lente de registros</h2><p className="text-[11px] text-ink-muted">Ambiente visual, não um diagnóstico</p></div></header>
    <div className="relative mx-auto my-3 grid h-52 max-w-xs place-items-center">
      <span className="pointer-events-none absolute inset-7 rounded-full border border-emerald-400/15 bg-emerald-400/[.025]"/>
      <span className="pointer-events-none absolute inset-1 rounded-full border border-dashed border-emerald-300/10"/>
      <svg viewBox="0 0 210 210" className="relative h-full w-full max-w-[220px]" aria-hidden="true">
        <defs><linearGradient id="fenixV8scene" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e1fbf1" stopOpacity=".66"/><stop offset="1" stopColor="#2dd4bf" stopOpacity=".25"/></linearGradient></defs>
        <path d="M89 55c-3-14 6-26 18-26s21 12 18 26c-1 9-7 18-18 18S90 64 89 55Z" fill="url(#fenixV8scene)" stroke="#a7f3d0" strokeOpacity=".55"/>
        <path d="M87 78c-15 0-30 13-37 29l-16 48c-3 11 10 16 15 8l27-42-2 60c0 7 7 12 13 12h40c7 0 13-5 13-12l-2-60 27 42c5 8 18 3 15-8l-16-48c-7-16-22-29-37-29Z" fill="url(#fenixV8scene)" stroke="#a7f3d0" strokeOpacity=".52" strokeWidth="1.5"/>
        <path d="M89 77c9 13 26 14 36 0" stroke="#ecfeff" strokeOpacity=".38" strokeWidth="2" fill="none"/>
        {deviceNames.some(d=>d.kind==='watch')?<><rect x="29" y="146" width="20" height="17" rx="5" fill="#0f172a" stroke="#6ee7b7" strokeWidth="2"/><rect x="34" y="150" width="10" height="9" rx="2" fill="#34d399"/></>:null}
        {deviceNames.some(d=>d.kind==='ring')?<circle cx="175" cy="155" r="8" fill="none" stroke="#fef3c7" strokeWidth="3"/>:null}
      </svg>
    </div>
    <div className="grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-xl border border-emerald-400/15 bg-emerald-300/[.04] p-3"><Activity size={15} className="mb-1 text-emerald-300"/><strong className="block text-ink-primary">{coverage} registros</strong><span className="text-ink-muted">dos quatro eixos no período (podem coincidir no dia)</span></div><div className="rounded-xl border border-emerald-400/15 bg-emerald-300/[.04] p-3"><Sparkles size={15} className="mb-1 text-emerald-300"/><strong className="block text-ink-primary">{snapshot.observedDays} dias</strong><span className="text-ink-muted">com algum registro de saúde</span></div></div>
    <div className="mt-3 space-y-1.5">{deviceNames.length?deviceNames.map((d,i)=><p key={`${d.kind}-${i}`} className="flex items-center gap-2 text-xs text-emerald-100"><span>{d.kind==='watch'?<Watch size={15}/>:<CircleDot size={15}/>}</span><span>{d.name} · cadastrado e ativo</span></p>):<p className="text-xs text-ink-muted">Nenhum relógio ou anel ativo cadastrado. A Fênix não inventa acessórios.</p>}</div>
    <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">Este cenário é uma interpretação visual da cobertura dos registros. A aparência 3D original da Fênix não foi alterada, e a ausência de dados não implica piora clínica.</p>
  </section>;
}
