"use client";
import Link from 'next/link';
import {Activity,ChevronRight,Dumbbell,Utensils} from 'lucide-react';
import {useVitalRuntime} from '@/hooks/useVitalRuntime';
import {localDay} from '@/lib/vital/validation';
import {withReturnTarget} from '@/lib/navigation/return-context';
import {sanitizeClinicalBackHrefUX360} from '@/lib/ui/clinical-a10-filter-session-ux360';
import {trainingDay,nutritionDay,activePlanVersions} from '@/lib/vital/projections';
import {useVitalWorkspace} from './VitalPrimitives';
import type {Scope} from '@/lib/vital/model';
import type {VitalRepository} from '@/lib/vital/repository';
/** Compact contextual read-only consumer. Does not contribute to clinical routine adherence. */
export function VitalContextCard({origin,day,returnTo}:{origin:'/'|'/hoje'|'/saude/fenix'|'/saude/brain-v7';day?:string;returnTo?:string}){
 const runtime=useVitalRuntime();if(runtime.loading||!runtime.scope)return null;
 return <VitalScopedContext key={`${runtime.scope.user_id}:${runtime.scope.person_id}`} repo={runtime.repo} scope={runtime.scope} day={day??localDay(new Date())} origin={sanitizeClinicalBackHrefUX360(returnTo||origin)}/>;
}
function VitalScopedContext({scope,repo,day,origin}:{scope:Scope;repo:VitalRepository;day:string;origin:string}){
 const {data,error}=useVitalWorkspace(repo,scope);if(!data||error)return null;
 const training=trainingDay(scope,day,data.workouts,data.trainingCheckins),nutrition=nutritionDay(scope,day,data.meals,data.nutritionCheckins);
 const plans=activePlanVersions(scope,day,data.nutritionPlans,data.nutritionVersions).filter(x=>x.active);
 const planned=data.workouts.filter(x=>x.day===day&&x.status==='planned').length;
 if(training.state==='unknown'&&!nutrition.meals.length&&!nutrition.checkin&&!plans.length&&!planned)return null;
 return <Link href={withReturnTarget('/saude/vital',sanitizeClinicalBackHrefUX360(origin))} className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-teal-300/20 bg-teal-300/[.04] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"><Activity size={22} className="shrink-0 text-teal-300" aria-hidden="true"/><div className="min-w-0 flex-1"><strong className="block text-sm">Vital</strong><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted"><span className="flex items-center gap-1"><Dumbbell size={14} className="text-ice" aria-hidden="true"/>{training.state==='conflict'?'Revisar registros':training.sessions.length?`${training.sessions.length} ${training.sessions.length===1?'sessão realizada':'sessões realizadas'}`:training.state==='rest'?'Descanso planejado':training.state==='absent'?'Ausência declarada':training.state==='trained'?'Treino declarado':planned?`${planned} ${planned===1?'sessão planejada':'sessões planejadas'}`:'Sem registro de treino'}</span><span className="flex items-center gap-1"><Utensils size={14} className="text-emerald-300" aria-hidden="true"/>{nutrition.meals.length?`${nutrition.meals.length} ${nutrition.meals.length===1?'refeição':'refeições'}`:plans.length?'Plano alimentar ativo':'Sem refeição registrada'}</span></div></div><ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true"/></Link>;
}
