'use client';
import Link from 'next/link';
import { ArrowLeft, Activity, BookOpenCheck, FileArchive, FlaskConical, HeartPulse, MessageSquareHeart, ShieldCheck, Brain, Stethoscope, GitBranch } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import {ClinicalBackLinkP0} from '@/components/saude/ClinicalBackLinkP0';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { useAuth } from '@/hooks/useAuth';
import { useRetiradas } from '@/hooks/useRetiradas';
import { withdrawalConflictsM2 } from '@/lib/careflow-m2/withdrawal-coherence';
const areas=[
  {href:'/saude/careflow/modo-medico',title:'Modo Médico',description:'Resumo para consulta e PDF privado',icon:Stethoscope,tone:'text-emerald-200'},
  {href:'/saude/careflow/episodios',title:'Atendimentos',description:'Consultas e fatos relacionados',icon:GitBranch,tone:'text-sky-300'},
  {href:'/saude/careflow/linha-do-tempo',title:'Evolução clínica',description:'Histórico com fontes e datas',icon:Brain,tone:'text-emerald-300'},
  {href:'/saude/careflow/dossie',title:'Dossiê clínico',description:'Histórico para consultar e exportar',icon:FileArchive,tone:'text-violet-300'},
  {href:'/saude/careflow/exames',title:'Pedidos e exames',description:'Itens conferidos e resultados',icon:FlaskConical,tone:'text-emerald-300'},
  {href:'/saude/careflow/pressao',title:'Pressão arterial',description:'Medições e acompanhamento',icon:HeartPulse,tone:'text-sky-300'},
  {href:'/saude/careflow/sintomas',title:'Sintomas',description:'Relatos e evolução por data',icon:MessageSquareHeart,tone:'text-violet-300'},
  {href:'/saude/careflow/relatorios',title:'PDFs clínicos',description:'Arquivos e exportações locais',icon:FileArchive,tone:'text-amber-300'},
];
export default function CareFlowDashboard(){const {events=[],activePersonId}=useCareFlowM2();const {registros=[]}=useRegistrosSaude();const {user}=useAuth();const {retiradas=[]}=useRetiradas();
  const conflicts=withdrawalConflictsM2(retiradas).filter(c=>retiradas.some(r=>r.id===c.pendingId&&r.person_id===activePersonId&&r.user_id===user?.id));
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/minha-saude" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border" aria-label="Voltar à origem do CareFlow"/><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">VAULT · Acompanhamento</p><h1 className="text-xl font-bold">Acompanhamento clínico</h1><p className="mt-1 text-xs text-ink-muted">Consultas, sintomas, exames e histórico.</p></div></header>
    <section className="grid grid-cols-2 gap-2"><div className="rounded-2xl border border-surface-border bg-surface p-3"><Activity size={17} className="text-sky-300"/><strong className="mt-1 block text-lg">{events.filter(e=>e.kind==='exam_order').length}</strong><span className="text-[10px] text-ink-muted">Pedidos vinculados</span></div><div className="rounded-2xl border border-surface-border bg-surface p-3"><BookOpenCheck size={17} className="text-emerald-300"/><strong className="mt-1 block text-lg">{registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.tipo==='pressao_arterial').length}</strong><span className="text-[10px] text-ink-muted">Medições reais de pressão</span></div></section>
    <section className="space-y-2">{areas.map(({href,title,description,icon:Icon,tone})=><Link key={href} href={withReturnTarget(href,"/saude/careflow")} className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-surface-border/70 bg-surface p-3 transition-colors active:bg-surface-raised"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-void/30"><Icon size={20} className={tone}/></span><span className="min-w-0"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">{description}</span></span></Link>)}</section>
    {conflicts.length>0&&<Link href={`/saude/retiradas?review=${encodeURIComponent(conflicts[0].pendingId)}`} className="flex gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-3"><ShieldCheck size={18} className="shrink-0 text-amber-300"/><span className="text-xs text-amber-200">{conflicts.length} vínculo(s) de retirada precisam de conferência: agendamento e conclusão no mesmo ciclo e data. Nada foi alterado.</span></Link>}
    <p className="text-[11px] leading-relaxed text-ink-muted">O CareFlow guarda apenas dados declarados ou conferidos. Texto de OCR não confirma marcas, valores, prescrições ou diagnósticos.</p>
  </div></main></PageTransition>;
}
