"use client";
import {createContext,useContext,useMemo,useState,useRef,type ReactNode} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {getVaultTreatmentIcon} from '@/lib/health-profile/treatment-icon';
import {TREATMENT_ICON_KEYS_R03,visualRevisionR03,readVisualIntentR03,resolveOwnedTreatmentR03,resolveTreatmentKeyR03,treatmentColorR03,type TreatmentIdentityRecordR03,type TreatmentScopeR03,type TreatmentVisualChoiceR03} from '@/lib/health-profile/treatment-preferences-r03';
import type {LucideProps} from 'lucide-react';
import {tratamentosRepository} from '@/lib/repositories/tratamentos';
const empty:readonly TreatmentIdentityRecordR03[]=[];
const IdentityContext=createContext<{scope:TreatmentScopeR03|null;records:readonly TreatmentIdentityRecordR03[]}>({scope:null,records:empty});
export function TreatmentIdentityProviderR03({children,personId}:{children:ReactNode;personId?:string|null}){
  const {user,loading:authLoading}=useAuth();const {activePersonId,persons,loading:personLoading}=useActivePersonId();
  // Only explicit validated person views override the active person; null never falls back.
  const uid=!authLoading?user?.id||'':'';
  const requested=(personId===undefined?activePersonId:personId)||'';
  const pid=!personLoading&&persons.some(p=>p.id===requested)?requested:'';
  const snapshot=useLiveQuery(async()=>({uid,pid,records:uid&&pid?(await db.tratamentos.where('[user_id+person_id]').equals([uid,pid]).toArray()).filter(t=>t.user_id===uid&&t.person_id===pid):[]}),[uid,pid]);
  const value=useMemo(()=>({scope:uid&&pid?{userId:uid,personId:pid}:null,records:snapshot?.uid===uid&&snapshot.pid===pid?snapshot.records:empty}),[uid,pid,snapshot]);
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
function useIdentity(entity:TreatmentIdentityRecordR03|null|undefined){
  const {scope,records}=useContext(IdentityContext);
  const record=resolveOwnedTreatmentR03(entity,records,scope);
  return {scope,record,selected:resolveTreatmentKeyR03(record),color:treatmentColorR03(record?.cor)};
}
/** All projected and complete records resolve through the active owned entity. */
export function TreatmentIdentityIconR03({entity,style,...props}:LucideProps&{entity?:TreatmentIdentityRecordR03|null}){
  const {selected,color}=useIdentity(entity);
  const Icon=getVaultTreatmentIcon({visual_icon:selected});
  return <Icon {...props} style={{...style,color}} aria-hidden="true"/>;
}
const LABELS:Record<TreatmentVisualChoiceR03,string>={activity:'Atividade',heart:'Cuidado',clipboard:'Acompanhamento',shield:'Proteção',calendar:'Calendário',brain:'Atenção e mente',stethoscope:'Acompanhamento clínico',target:'Alvo ou região',leaf:'Equilíbrio',waypoints:'Conexões',heartpulse:'Vitalidade',pill:'Medicamentos',unassigned:'Sem ícone específico'};
export function TreatmentIdentityPickerR03({value,color,onChange,disabled=false}:{value:TreatmentVisualChoiceR03|null;color:string;onChange:(v:TreatmentVisualChoiceR03)=>void;disabled?:boolean}){
 return <div className="mt-3 space-y-2" role="group" aria-label="Identidade visual do tratamento">
   <p className="text-xs font-semibold text-ink-primary">Ícone do tratamento</p>
   <p className="text-[11px] leading-relaxed text-ink-muted">{value===null?'Escolha um ícone ou indique que não deseja um específico.':value==='unassigned'?'Sem ícone específico. Você pode escolher um a qualquer momento.':'Escolha visual, sem alterar a informação clínica.'}</p>
   <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
    {[...TREATMENT_ICON_KEYS_R03,'unassigned' as const].map(key=>{const Icon=getVaultTreatmentIcon({visual_icon:key});return <button key={key} type="button" disabled={disabled} aria-pressed={value===key} onClick={()=>onChange(key)} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-surface-border p-2 text-left text-[11px] text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-50" style={value===key?{borderColor:color,backgroundColor:`${color}18`}:undefined}><Icon size={17} style={{color}} aria-hidden="true"/><span className="min-w-0 break-words">{LABELS[key]}</span></button>;})}
   </div>
 </div>;
}
export function TreatmentIdentityEditorR03({entity}:{entity:TreatmentIdentityRecordR03}){
  const {scope,record,selected,color}=useIdentity(entity);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const lock=useRef(false);
  async function select(value:TreatmentVisualChoiceR03){
    if(!scope||!record||typeof record.id!=='string'||lock.current||visualRevisionR03(record)===null||readVisualIntentR03(record.visual_identity_pending)?.state==='pending')return;
    lock.current=true;setBusy(true);setError('');
    try{await tratamentosRepository.updateVisualIdentity(record.id,scope.personId,value,visualRevisionR03(record)!);}catch{setError('Não foi possível salvar a identidade visual. Reabra o tratamento e tente novamente.');}finally{lock.current=false;setBusy(false);}
  }
  return <details className="mt-3 rounded-xl border border-surface-border/50 bg-surface-raised/40 px-3 py-2">
    <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-primary">Personalizar ícone do tratamento</summary>
    <TreatmentIdentityPickerR03 value={selected} color={color} disabled={!record||busy||readVisualIntentR03(record.visual_identity_pending)?.state==='pending'||visualRevisionR03(record)===null} onChange={select}/>
    {readVisualIntentR03(record?.visual_identity_pending)?.state==='pending'&&<p role="status" className="text-xs text-ink-muted">Escolha salva no aparelho; aguardando confirmação da sincronização.</p>}
    {readVisualIntentR03(record?.visual_identity_pending)?.state==='conflict'&&<p role="alert" className="text-xs text-coral">Outro aparelho alterou este ícone. Confira a identidade atual e escolha novamente se desejar.</p>}
    <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Salva no tratamento e segue a sincronização do VAULT. Não altera diagnósticos nem medicamentos.</p>
    {error&&<p role="alert" className="text-xs text-coral">{error}</p>}
  </details>;
}
