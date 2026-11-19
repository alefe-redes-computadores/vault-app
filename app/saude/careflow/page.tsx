'use client';
import Link from 'next/link';
import {Activity,FileArchive,FlaskConical,HeartPulse,MessageSquareHeart,Brain,Stethoscope,GitBranch,ChevronRight,ShieldCheck,BookOpenCheck} from 'lucide-react';
import {PageTransition} from '@/components/PageTransition';
import {ClinicalBackLinkP0} from '@/components/saude/ClinicalBackLinkP0';
import {withReturnTarget} from '@/lib/navigation/return-context';
import {useCareFlowM2} from '@/hooks/useCareFlowM2';
import {useRegistrosSaude} from '@/hooks/useRegistrosSaude';
import {useAuth} from '@/hooks/useAuth';
const areas=[
 {href:'/saude/careflow/modo-medico',title:'Modo Médico',description:'Conferir informações para a consulta',icon:Stethoscope,tone:'text-emerald-200'},
 {href:'/saude/careflow/episodios',title:'Atendimentos',description:'Consultas e vínculos reais',icon:GitBranch,tone:'text-sky-300'},
 {href:'/saude/careflow/linha-do-tempo',title:'Evolução clínica',description:'Doses, sintomas e medições',icon:Brain,tone:'text-violet-300'},
 {href:'/saude/careflow/dossie',title:'Dossiê clínico',description:'Histórico e exportação privada',icon:FileArchive,tone:'text-amber-300'},
 {href:'/saude/careflow/exames',title:'Pedidos e exames',description:'Pedidos, itens e resultados',icon:FlaskConical,tone:'text-emerald-300'},
 {href:'/saude/careflow/pressao',title:'Pressão arterial',description:'Aferições informadas',icon:HeartPulse,tone:'text-rose-300'},
 {href:'/saude/careflow/sintomas',title:'Sintomas',description:'Relatos por data e intensidade',icon:MessageSquareHeart,tone:'text-violet-300'},
 {href:'/saude/careflow/relatorios',title:'PDFs clínicos',description:'Documentos privados arquivados',icon:FileArchive,tone:'text-amber-300'},
];
export default function CareFlowDashboard(){
 const {events=[],activePersonId}=useCareFlowM2(),{registros=[]}=useRegistrosSaude(),{user}=useAuth();
 const own=events.filter(e=>e.user_id===user?.id&&e.person_id===activePersonId);
 const requests=own.filter(e=>e.kind==='exam_order').length;
 const symptoms=registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.categoria==='sintoma').length;
 const readings=registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.tipo==='pressao_arterial').length;
 const metrics=[{label:'Pedidos de exame',count:requests,href:'/saude/careflow/exames',icon:FlaskConical},{label:'Relatos de sintomas',count:symptoms,href:'/saude/careflow/sintomas',icon:MessageSquareHeart},{label:'Pressão medida',count:readings,href:'/saude/careflow/pressao',icon:HeartPulse}];
 const primary=areas[0],otherGroups=[{label:'Consulta e documentos',cards:[areas[1],areas[3],areas[7]]},{label:'Registros e evolução',cards:[areas[2],areas[4],areas[5],areas[6]]}];
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4">
  <header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/minha-saude" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface" aria-label="Voltar à origem do CareFlow"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Saúde · Acompanhamento</p><h1 className="text-xl font-bold">Acompanhamento clínico</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Uma porta de entrada para seus registros e consultas.</p></div></header>
  <Link href={withReturnTarget(primary.href,'/saude/careflow')} className="flex min-h-20 items-center gap-3 rounded-[22px] border border-emerald-300/25 bg-emerald-300/[.07] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200"><Stethoscope size={23}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-bold">Modo Médico 360</strong><span className="mt-1 block text-xs text-ink-muted">Resumo revisável, períodos e PDF para consulta</span></span><ChevronRight size={18} className="shrink-0 text-emerald-300"/></Link>
  {metrics.some(m=>m.count>0)&&<section aria-label="Resumo do acompanhamento" className="flex flex-wrap gap-2">{metrics.filter(m=>m.count>0).map(({label,count,href,icon:Icon})=><Link key={href} href={withReturnTarget(href,'/saude/careflow')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/70 bg-surface px-3 py-2 text-xs"><Icon size={15} className="text-sky-300"/><strong className="tabular-nums">{count}</strong><span className="text-ink-muted">{label}</span><ChevronRight size={14}/></Link>)}</section>}
  {otherGroups.map(group=><section key={group.label} aria-label={group.label} className="space-y-2"><h2 className="text-[11px] font-bold uppercase tracking-[.13em] text-ink-muted">{group.label}</h2><div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">{group.cards.map(({href,title,description,icon:Icon,tone})=><Link key={href} href={withReturnTarget(href,'/saude/careflow')} className="flex min-h-[86px] min-w-0 items-start gap-2.5 rounded-2xl border border-surface-border/70 bg-surface p-3 transition-colors active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-void/50"><Icon size={19} className={tone}/></span><span className="min-w-0 flex-1"><strong className="block break-words text-xs font-bold">{title}</strong><span className="mt-1 block break-words text-[11px] leading-snug text-ink-muted">{description}</span></span></Link>)}</div></section>)}
  <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={15} className="shrink-0 text-emerald-300"/>O acompanhamento clínico exibe somente dados declarados ou conferidos. Ausência de registro não prova ausência de evento. Nenhum dado é compartilhado automaticamente.</p>
 </div></main></PageTransition>;
}
