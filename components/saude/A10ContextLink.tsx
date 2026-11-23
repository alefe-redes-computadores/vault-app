import Link from 'next/link';
import {Activity,ArrowUpRight} from 'lucide-react';
/** Accessible entry to a single canonical longitudinal reader, not another dashboard. */
export function A10ContextLink({context='health',compact=false}:{context?:'home'|'today'|'careflow'|'medical'|'pharma'|'health';compact?:boolean}){
 const from:Record<string,string>={home:'/',today:'/hoje',careflow:'/saude/careflow',medical:'/saude/careflow/modo-medico',pharma:'/saude/pharmalens',health:'/saude/minha-saude'};
 const url='/saude/linha-clinica?return_to='+encodeURIComponent(from[context]);
 return <Link href={url} aria-label="Abrir linha clínica integrada" className={'flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] px-3 py-2 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 '+(compact?'w-full':'w-full')}>
  <Activity size={18} className="shrink-0 text-emerald-300" aria-hidden="true"/><span className="min-w-0 flex-1">Linha clínica integrada <span className="font-normal text-ink-muted">· fatos por pessoa</span></span><ArrowUpRight size={16} className="shrink-0 text-emerald-300" aria-hidden="true"/>
 </Link>;
}
