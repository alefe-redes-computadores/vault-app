'use client';
import { Activity, HeartPulse, Info, Watch } from 'lucide-react';
import type { StudioSnapshotV8 } from '@/lib/health-intelligence/visual-studio-v8';
import { projectVitalsProvenanceV8P2 } from '@/lib/health-intelligence/visual-studio-v8p2';
const labels={frequencia_cardiaca:'Frequência cardíaca',hrv_rmssd:'Variabilidade da frequência cardíaca',sono:'Sono registrado'} as const;

export function WearableEvidenceV8P2({snapshot}:{snapshot:StudioSnapshotV8}){
  const measures=projectVitalsProvenanceV8P2(snapshot);
  const active=snapshot.authorized?snapshot.activeDevices.filter(x=>x.kind==='watch'||x.kind==='ring'):[];
  return <section className="rounded-[25px] border border-emerald-400/15 bg-surface/80 p-4" aria-label="Fênix: origem dos dados do relógio ou anel">
    <header className="flex items-center gap-2"><HeartPulse size={17} className="text-emerald-300"/><h2 className="text-sm font-bold text-ink-primary">Fênix · evidência dos dispositivos</h2></header>
    <p className="mt-2 text-xs text-ink-muted">Cadastro de relógio e anel é separado da origem de cada medição. O VAULT nunca atribui uma leitura a um aparelho por suposição.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{active.length?active.map((d,i)=><div key={`${d.kind}-${d.name}-${i}`} className="flex items-start gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.03] p-3 text-xs"><Watch size={14} className="mt-0.5 shrink-0 text-emerald-300"/><p className="min-w-0 break-words"><strong className="text-ink-primary">{d.name}</strong><span className="block text-[11px] text-ink-muted">{d.kind==='watch'?'Relógio':'Anel'} cadastrado e ativo · não comprova coleta recente</span></p></div>):<p className="rounded-xl border border-surface-border p-3 text-xs text-ink-muted">Sem relógio/anel ativo. A Fênix não cria leituras artificiais.</p>}</div>
    <div className="mt-3 space-y-2">{measures.length?measures.map(m=><div key={m.key} className="flex min-w-0 items-start gap-3 rounded-xl border border-surface-border/65 bg-void/35 p-3 text-xs"><Activity size={15} className="mt-0.5 shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="font-semibold text-ink-primary">{labels[m.key]} · {m.value}</p><p className="mt-1 break-words text-[11px] text-ink-muted">{m.day.split('-').reverse().join('/')} · fonte: {m.source}</p><p className="mt-1 text-[11px] text-ink-muted">{m.hasLinkedDevice?`Aparelho vinculado: ${m.deviceName}`:'Nenhum aparelho associado a esta medição'}</p></div></div>):<p className="text-xs text-ink-muted">Sem medidas elegíveis no período. Isso não indica sinais vitais normais nem ausência de risco.</p>}</div>
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><Info size={14} className="mt-0.5 shrink-0"/>Os dados não excluem toxicidade ou interação, e frequência cardíaca/HRV isoladas não comprovam segurança de uma dose.</p>
  </section>;
}
