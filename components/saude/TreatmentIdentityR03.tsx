"use client";
import {createContext,useContext,useMemo,useState,useRef,type ReactNode} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {getVaultTreatmentIcon} from '@/lib/health-profile/treatment-icon';
import {canWriteTreatmentChoiceR03,validTreatmentChoiceR03,visualRevisionR03,readVisualIntentR03,resolveOwnedTreatmentR03,resolveTreatmentKeyR03,treatmentColorR03,type TreatmentIdentityRecordR03,type TreatmentScopeR03,type TreatmentVisualChoiceR03} from '@/lib/health-profile/treatment-preferences-r03';
import type {LucideProps} from 'lucide-react';
import {TREATMENT_VISUAL_LIBRARY,CATEGORIES,searchTreatmentVisualIcons,suggestTreatmentVisualIcons} from '@/lib/health-profile/treatment-visual-library-ux360';
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
  return <Icon {...props} data-vault-treatment-icon={selected} style={{...style,color}} aria-hidden="true"/>;
}
/** One form-only picker. Searching never changes a selection or submits CAS. */
export function TreatmentIdentityPickerR03({value,color,title='',onChange,disabled=false}:{value:TreatmentVisualChoiceR03|null;color:string;title?:string;onChange:(v:TreatmentVisualChoiceR03)=>void;disabled?:boolean}){
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<(typeof CATEGORIES)[number]|undefined>();
 const [showLibrary,setShowLibrary]=useState(false);
 const suggestions=suggestTreatmentVisualIcons(title,6);
 const results=searchTreatmentVisualIcons(query,category);
 const chosen=TREATMENT_VISUAL_LIBRARY.find(item=>item.key===value);
 const Preview=getVaultTreatmentIcon({visual_icon:value});
 const renderChoice=(item:(typeof TREATMENT_VISUAL_LIBRARY)[number],prefix:string)=>{
   const key=validTreatmentChoiceR03(item.key);
   const available=!!key&&canWriteTreatmentChoiceR03(key);
   const Icon=getVaultTreatmentIcon({visual_icon:item.key});
   return <button key={`${prefix}:${item.key}`} type="button" disabled={disabled||!available} aria-pressed={value===item.key} aria-label={`${item.label}${available?'':' · aguarda compatibilidade de sincronização'}`} data-vault-treatment-choice={item.key} onClick={()=>{if(key&&available&&!disabled)onChange(key);}} className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface-raised/55 px-2 py-2 text-center text-xs leading-snug text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:cursor-not-allowed disabled:opacity-60 [overflow-wrap:normal]" style={value===item.key?{borderColor:color,backgroundColor:`${color}18`}:undefined}><Icon size={21} style={{color}} aria-hidden="true"/><span>{item.label}</span>{!available&&<span className="text-[10px] font-normal text-ink-secondary">Em preparação</span>}</button>;
 };
 return <div className="space-y-3 rounded-2xl border border-surface-border/70 bg-surface-raised/35 p-3" role="group" aria-label="Identidade visual do tratamento" data-vault-treatment-picker>
   <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl border" style={{color,borderColor:`${color}55`,backgroundColor:`${color}15`}}><Preview size={23} aria-hidden="true"/></span><div className="min-w-0"><p className="text-sm font-semibold text-ink-primary">Identidade visual</p><p className="text-xs text-ink-secondary" data-vault-treatment-selected>{chosen?.label??(value==='unassigned'?'Sem ícone específico':'Nenhuma escolha ainda')}</p><p className="text-[11px] text-ink-muted">Apenas aparência, sem alterar dados clínicos.</p></div></div>
   {suggestions.length>0&&<div data-vault-treatment-suggestions><p className="mb-2 text-xs font-semibold text-ink-secondary">Sugestões pelo nome digitado</p><div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">{suggestions.map(item=>renderChoice(item,'suggested'))}</div></div>}
   <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={disabled} aria-pressed={value==='unassigned'} onClick={()=>onChange('unassigned')} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${value==='unassigned'?'border-ice/50 bg-ice/10 text-ice':'border-surface-border text-ink-secondary'}`}>Sem ícone específico</button><button type="button" aria-expanded={showLibrary} onClick={()=>setShowLibrary(v=>!v)} className="min-h-11 rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">{showLibrary?'Recolher biblioteca':'Escolher na biblioteca'}</button></div>
   {showLibrary&&<div className="space-y-3 border-t border-surface-border/60 pt-3"><label className="block text-xs font-semibold text-ink-primary">Pesquisar ícones<input aria-label="Pesquisar ícones" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: sono, cérebro, cuidado…" className="mt-1.5 min-h-11 w-full rounded-xl border border-surface-border bg-void px-3 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"/></label>
   <div className="flex min-w-0 flex-wrap gap-1.5" role="group" aria-label="Categorias de ícones">{[undefined,...CATEGORIES].map(c=><button key={c??'all'} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)} className={`min-h-11 rounded-xl border px-2.5 text-[11px] font-semibold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${category===c?'border-ice/40 bg-ice/10 text-ice':'border-surface-border text-ink-secondary'}`}>{c??'Todas'}</button>)}</div>
   {results.length===0?<p role="status" className="text-xs text-ink-secondary">Nenhum ícone encontrado. Experimente outro termo.</p>:<div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 min-[600px]:grid-cols-4">{results.map(item=>renderChoice(item,'library'))}</div>}
   <p className="text-[11px] leading-relaxed text-ink-secondary">Ícones em preparação dependem da ampliação segura da sincronização. Suas escolhas existentes continuam disponíveis.</p></div>}
 </div>;
}
export function TreatmentIdentityEditorR03({entity}:{entity:TreatmentIdentityRecordR03}){
  const {scope,record,selected,color}=useIdentity(entity);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const lock=useRef(false);
  async function select(value:TreatmentVisualChoiceR03){
    if(!canWriteTreatmentChoiceR03(value)||!scope||!record||typeof record.id!=='string'||lock.current||visualRevisionR03(record)===null||readVisualIntentR03(record.visual_identity_pending)?.state==='pending')return;
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
