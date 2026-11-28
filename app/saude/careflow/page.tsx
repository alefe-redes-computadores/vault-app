'use client';
import { ClinicalEpisodePulseP4 } from "@/components/home/ClinicalEpisodePulseP4";
import Link from 'next/link';
import {Activity,FileArchive,FlaskConical,HeartPulse,MessageSquareHeart,Brain,Stethoscope,GitBranch,ChevronRight,ShieldCheck,BookOpenCheck,BedDouble,Accessibility} from 'lucide-react';
import {PageTransition} from '@/components/PageTransition';
import {ClinicalBackLinkP0} from '@/components/saude/ClinicalBackLinkP0';
import {withReturnTarget} from '@/lib/navigation/return-context';
import {useCareFlowM2} from '@/hooks/useCareFlowM2';
import {useRegistrosSaude} from '@/hooks/useRegistrosSaude';
import {useAuth} from '@/hooks/useAuth';
import { TreatmentContinuityA4 } from '@/components/saude/TreatmentContinuityA4';
import { VaccinationAccessA8 } from '@/components/saude/VaccinationAccessA8';
import { A9ReadOnlySummary360 } from '@/components/saude/A9ReadOnlySummary360';
const areas=[
 {href:'/saude/linha-clinica',title:'Linha Clínica',description:'Fatos de todos os módulos, vínculos reais e histórico',icon:Activity,tone:'text-emerald-300'},
 {href:'/saude/careflow/modo-medico',title:'Modo Médico',description:'Conferir informações para a consulta',icon:Stethoscope,tone:'text-emerald-200'},
 {href:'/saude/careflow/episodios',title:'Atendimentos',description:'Consultas e vínculos reais',icon:GitBranch,tone:'text-sky-300'},
 {href:'/saude/careflow/dossie',title:'Dossiê clínico',description:'Histórico e exportação privada',icon:FileArchive,tone:'text-amber-300'},
 {href:'/saude/careflow/linha-do-tempo',title:'Evolução clínica',description:'Doses, sintomas e medições',icon:Activity,tone:'text-sky-300'},
 {href:'/saude/careflow/exames',title:'Pedidos de exames',description:'Pedidos agrupados, integrados a Exames e Laudos',icon:FlaskConical,tone:'text-emerald-300'},
 {href:'/saude/careflow/pressao',title:'Planos de pressão',description:'Medições na Linha de cuidado; plano e contexto aqui',icon:HeartPulse,tone:'text-rose-300'},
 {href:'/saude/careflow/relatorios',title:'PDFs clínicos',description:'Documentos privados arquivados',icon:FileArchive,tone:'text-amber-300'},
 {href:'/saude/careflow/sintomas',title:'Sintomas e evolução',description:'Mesmos relatos da Linha de cuidado',icon:MessageSquareHeart,tone:'text-rose-300'},
];
import {VitalEvidencePanel} from '@/components/vital/VitalEvidencePanel';
export default function CareFlowDashboard(){
 const {events=[],activePersonId}=useCareFlowM2(),{registros=[]}=useRegistrosSaude(),{user}=useAuth();
 const own=events.filter(e=>e.user_id===user?.id&&e.person_id===activePersonId);
 const requests=own.filter(e=>e.kind==='exam_order').length;
 const symptoms=registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.categoria==='sintoma').length;
 const readings=registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.tipo==='pressao_arterial').length;
 const metrics=[{label:'Pedidos de exame',count:requests,href:'/saude/careflow/exames',icon:FlaskConical},{label:'Relatos de sintomas',count:symptoms,href:'/saude/careflow/sintomas',icon:MessageSquareHeart},{label:'Pressão medida',count:readings,href:'/saude/careflow/pressao',icon:HeartPulse}];
 const primary=areas[0],otherGroups=[{label:'Consulta e documentos',cards:[areas[1],areas[3],areas[7]]},{label:'Registros e evolução',cards:[areas[2],areas[4],areas[5],areas[6]]},{label:'Relatos',cards:[areas[8]]}];
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4">
  <header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/minha-saude" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface" aria-label="Voltar à origem do CareFlow"/><div className="min-w-0"><h1 className="text-xl font-bold">Acompanhamento clínico</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Uma porta de entrada para seus registros e consultas.</p></div></header>
  <VitalEvidencePanel origin="/saude/careflow"/>
  <ClinicalEpisodePulseP4 returnTo="/saude/careflow" />
  <Link href={withReturnTarget(primary.href,'/saude/careflow')} className="flex min-h-20 items-center gap-3 rounded-[22px] border border-emerald-300/25 bg-emerald-300/[.07] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200"><Activity size={23}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-bold">Linha Clínica</strong><span className="mt-1 block text-xs text-ink-muted">Fatos e registros de todos os módulos</span></span><ChevronRight size={18} className="shrink-0 text-emerald-300"/></Link>
  <Link href={withReturnTarget('/saude/jornada','/saude/careflow')} className="flex min-h-12 items-center gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/[.045] p-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><GitBranch size={18} className="shrink-0 text-sky-300"/><span className="min-w-0 flex-1"><strong className="block text-sm">Jornada Clínica</strong><span className="mt-1 block text-ink-muted">Cirurgias, consultas e laudos ligados por IDs reais</span></span><ChevronRight size={17} className="shrink-0 text-sky-300"/></Link>
  <div className="grid gap-2 min-[360px]:grid-cols-2"><Link href={withReturnTarget('/saude/cirurgias/jornada','/saude/careflow')} className="flex min-h-12 items-center gap-2 rounded-xl border border-surface-border bg-surface p-3 text-xs font-semibold"><HeartPulse size={17} className="text-rose-300"/>Jornada Cirúrgica<ChevronRight size={16} className="ml-auto"/></Link><Link href={withReturnTarget('/saude/internacoes','/saude/careflow')} className="flex min-h-12 items-center gap-2 rounded-xl border border-surface-border bg-surface p-3 text-xs font-semibold"><BedDouble size={17} className="text-sky-300" aria-hidden="true"/>Internações<ChevronRight size={16} className="ml-auto"/></Link><Link href={withReturnTarget('/saude/reabilitacao','/saude/careflow')} className="flex min-h-12 items-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/[.045] p-3 text-xs font-semibold min-[360px]:col-span-2"><Accessibility size={17} className="text-teal-300" aria-hidden="true"/>Reabilitação<ChevronRight size={16} className="ml-auto"/></Link></div>
  {metrics.some(m=>m.count>0)&&<p className="text-xs text-ink-muted">{metrics.filter(m=>m.count>0).map(m=>`${m.count} ${m.label.toLocaleLowerCase('pt-BR')}`).join(' · ')}</p>}
  {otherGroups.map(group=><section key={group.label} aria-label={group.label} className="space-y-2"><h2 className="text-[11px] font-bold uppercase tracking-[.13em] text-ink-muted">{group.label}</h2><div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">{group.cards.map(({href,title,description,icon:Icon,tone},index)=><Link key={href} href={withReturnTarget(href,'/saude/careflow')} aria-label={title==='Modo Médico'?'Modo Médico · Conferir informações para a consulta':undefined} className={`flex min-h-[72px] min-w-0 items-center gap-2.5 rounded-2xl border border-surface-border/70 bg-surface p-3 transition-colors active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${group.cards.length%2===1&&index===group.cards.length-1?'min-[360px]:col-span-2':''}`}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-void/50"><Icon size={19} className={tone}/></span><span className="min-w-0 flex-1"><strong className="block break-words text-xs font-bold">{title}</strong><span className="mt-0.5 block break-words text-[11px] leading-snug text-ink-muted">{description}</span></span><ChevronRight size={15} className="shrink-0 text-ink-muted"/></Link>)}</div></section>)}
  <TreatmentContinuityA4 context="careflow" maxItems={3} />
  <VaccinationAccessA8 context="careflow" />
  <A9ReadOnlySummary360 context="careflow" />
  <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={15} className="shrink-0 text-emerald-300"/>O acompanhamento clínico exibe somente dados declarados ou conferidos. Ausência de registro não prova ausência de evento. Nenhum dado é compartilhado automaticamente.</p>
 </div></main></PageTransition>;
}
