"use client";
import {useEffect,useState} from 'react';
import {History} from 'lucide-react';
import type {DraftStorage} from '@/hooks/useVitalDraft';
import type {DraftKind,DraftRecord} from '@/lib/vital/drafts';
import type {Scope} from '@/lib/vital/model';
import {button,panel,useVitalAction} from './VitalPrimitives';
export function VitalDraftRecovery<T>({storage,scope,kind,validate,onRecover,disabled=false}:{storage:DraftStorage;scope:Scope;kind:DraftKind;validate:(v:unknown)=>T;onRecover:(record:DraftRecord,value:T)=>void;disabled?:boolean}){
 const [rows,setRows]=useState<Awaited<ReturnType<DraftStorage['list']>>>([]),[error,setError]=useState(false);const action=useVitalAction();
 useEffect(()=>{let active=true;storage.list(scope,kind).then(r=>{if(active){setRows(r.sort((a,b)=>b.updated_at-a.updated_at));setError(false);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[storage,scope.user_id,scope.person_id,kind,disabled]);
 if(disabled||!rows.length&&!error)return null;
 return <section className={`${panel} space-y-2`}><h2 className="flex items-center gap-2 font-semibold"><History size={18}/> Rascunhos neste dispositivo</h2>{error&&<p role="alert" className="text-sm text-coral">Não foi possível consultar os rascunhos.</p>}{rows.map(r=><button key={r.id} type="button" disabled={action.busy} className={`${button} w-full text-left`} onClick={()=>action.run(async()=>{const result=await storage.load(scope,r.id,kind,validate);if(!result)throw Error('Rascunho expirou ou não está disponível.');return result;},'Rascunho recuperado',x=>onRecover(x.record,x.value))}>Retomar · {new Date(r.updated_at).toLocaleString('pt-BR')}</button>)}</section>;
}
