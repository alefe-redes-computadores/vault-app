"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";
import { CustomDatePicker } from "@/components/DatePicker";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileText, History, MapPin, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { isPrescriptionOnly } from "@/lib/health-supply/renewal-event";
import { clinicalA1Repository } from "@/lib/clinical-a1/repository";
import { safeReturnTarget } from "@/lib/navigation/return-context";
import { a1DateBR, a1Today, type A1PhaseKind, type A1Source, type A1TreatmentPhase, type A1PrescriptionLink, type A1SupplyLocation } from "@/lib/clinical-a1/types";

const inputStyle="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised px-3 py-2.5 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60";
const cardStyle="rounded-[24px] border border-surface-border/60 bg-surface p-4";
const A1_SRC:[A1Source,string][]= [["relato_pessoal","Relato pessoal"],["orientacao_profissional","Orientação informada pelo profissional"],["documento_revisado","Documento conferido por mim"]];
const PHASES:[A1PhaseKind,string][]=[["inicio","Início declarado"],["ajuste","Mudança declarada"],["pausa","Pausa declarada"],["retomada","Retomada declarada"],["conclusao","Conclusão declarada"]];
const AREAS=[{id:"fases" as const,title:"Fases",description:"Evolução dos tratamentos",icon:Activity},
 {id:"receitas" as const,title:"Receitas",description:"Versões existentes",icon:FileText},
 {id:"locais" as const,title:"Fornecimento",description:"Locais por data",icon:MapPin}];
type Area=typeof AREAS[number]["id"];
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block min-w-0 text-xs font-semibold text-ink-muted">{label}{children}</label>}
function Status({synced}:{synced?:boolean}){const Icon=synced?CheckCircle2:Clock3;return <span role="status" className={`inline-flex shrink-0 items-center gap-1 text-[11px] ${synced?"text-emerald-300":"text-amber-300"}`}><Icon size={12}/>{synced?"Sincronizado":"Aguardando sincronização"}</span>}
/** Seletor padrão VAULT: modal de busca acessível, sem controle nativo visível. */
function A1Choice({label,value,onChange,children,kind}:{
 label:string;value:string;onChange:(v:string)=>void;children:ReactNode;
 kind?:"doctor"|"place"|"pharmacy"|"hospital"|"consultation"|"symptom"|"status";
}){
 return <div className="min-w-0"><p className="text-xs font-semibold text-ink-muted">{label}</p>
  <HealthRelationPicker title={label} value={value} onValueChange={onChange} kind={kind} className={inputStyle}>{children}</HealthRelationPicker>
 </div>;
}
function SourceSelect({value,onChange}:{value:A1Source;onChange:(x:A1Source)=>void}){
 return <A1Choice label="Fonte da informação" value={value} onChange={x=>onChange(x as A1Source)} kind="status">
  {A1_SRC.map(([key,title])=><option key={key} value={key}>{title}</option>)}
 </A1Choice>;
}
function Loading(){return <main className="min-h-dvh bg-void p-6 text-sm text-ink-muted">Carregando os registros da pessoa ativa…</main>}

export default function EngenhariaClinicaPage(){
 const {user,loading:authLoading}=useAuth();const {activePersonId}=useActivePersonId();const {trigger}=useHapticFeedback();const toast=useToast();
 const [area,setArea]=useState<Area>("fases");const [busy,setBusy]=useState(false);const lock=useRef(false);
 const [backTarget,setBackTarget]=useState("/saude");
 const [treatmentId,setTreatmentId]=useState("");const [phaseType,setPhaseType]=useState<A1PhaseKind>("ajuste");const [phaseDate,setPhaseDate]=useState(a1Today());const [title,setTitle]=useState("");const [professionalId,setProfessionalId]=useState("");const [phaseNote,setPhaseNote]=useState("");const [phaseSource,setPhaseSource]=useState<A1Source>("relato_pessoal");
 const [medicationId,setMedicationId]=useState("");const [previousId,setPreviousId]=useState("");const [currentId,setCurrentId]=useState("");const [rxType,setRxType]=useState<"renovacao"|"substituicao">("renovacao");const [rxNote,setRxNote]=useState("");const [rxSource,setRxSource]=useState<A1Source>("documento_revisado");
 const [processId,setProcessId]=useState("");const [placeKind,setPlaceKind]=useState<"farmacia"|"local">("farmacia");const [placeId,setPlaceId]=useState("");const [placeDate,setPlaceDate]=useState(a1Today());const [placeNote,setPlaceNote]=useState("");const [placeSource,setPlaceSource]=useState<A1Source>("relato_pessoal");
 useEffect(()=>{
   const params=new URLSearchParams(window.location.search);
   const option=params.get("area");if(AREAS.some(x=>x.id===option))setArea(option as Area);
   setBackTarget(safeReturnTarget(params.get("return_to"),"/saude"));
   setTreatmentId(params.get("tratamento_id")||"");
   setMedicationId(params.get("medicamento_id")||"");
   setProcessId(params.get("fornecimento_id")||"");
 },[]);
 const rows=useLiveQuery(async()=>{
  if(!user?.id||!activePersonId)return null;
  const [treatments,renovations,medicines,supplies,pharmacies,locations,professionals,phases,rxLinks,sites]=await Promise.all([
   db.tratamentos.where("person_id").equals(activePersonId).toArray(),
   db.renovacoes.where("person_id").equals(activePersonId).toArray(),
   db.medicamentos.where("person_id").equals(activePersonId).toArray(),
   db.fornecimentos.where("person_id").equals(activePersonId).toArray(),
   db.farmacias.where("user_id").equals(user.id).toArray(),
   db.locais.where("user_id").equals(user.id).toArray(),
   db.medicos.where("user_id").equals(user.id).toArray(),
   db.a1_treatment_phases.where("person_id").equals(activePersonId).toArray(),
   db.a1_prescription_links.where("person_id").equals(activePersonId).toArray(),
   db.a1_supply_locations.where("person_id").equals(activePersonId).toArray()]);
  const own=<T extends {user_id:string;person_id?:string;deleted_at?:string|null}>(items:T[])=>items.filter(r=>r.user_id===user.id&&r.person_id===activePersonId&&!r.deleted_at);
  return {treatments:own(treatments),renovations:own(renovations),medicines:own(medicines),supplies:own(supplies),pharmacies,locations,professionals,
   phases:own(phases).sort((a,b)=>b.data_efetiva.localeCompare(a.data_efetiva)),
   rxLinks:own(rxLinks).sort((a,b)=>b.created_at.localeCompare(a.created_at)),
   sites:own(sites).sort((a,b)=>b.inicio_vigencia.localeCompare(a.inicio_vigencia))};
 },[user?.id,activePersonId]);
 const rxEvents=useMemo(()=>rows?.renovations.filter(e=>e.medicamento_id===medicationId&&isPrescriptionOnly(e)).sort((a,b)=>b.data.localeCompare(a.data))||[],[rows,medicationId]);
 const chosenPhase=rows?.treatments.find(x=>x.id===treatmentId);
 const chosenMedicine=rows?.medicines.find(x=>x.id===medicationId);
 async function commit(action:()=>Promise<string>, message:string){
  if(lock.current||busy)return;lock.current=true;setBusy(true);trigger("vibrate");
  try {await action();trigger("success");toast.showSuccess(`${message} no aparelho. Sincronização solicitada.`);}catch(error){trigger("error");toast.showError(error instanceof Error?error.message:"Não foi possível salvar. Nenhum registro foi criado.");}finally{lock.current=false;setBusy(false)}
 }
 async function savePhase(){await commit(async()=>{const id=await clinicalA1Repository.recordPhase({userId:user!.id,personId:activePersonId!,treatmentId,tipo:phaseType,data:phaseDate,origem:phaseSource,professionalId:professionalId||null,titulo:title,observacoes:phaseNote});setTitle("");setPhaseNote("");return id},"Fase registrada")}
 async function saveRx(){await commit(async()=>{const id=await clinicalA1Repository.linkPrescriptions({userId:user!.id,personId:activePersonId!,medicationId,previousId,currentId,tipo:rxType,origem:rxSource,observacoes:rxNote});setRxNote("");setPreviousId("");setCurrentId("");return id},"Relação entre receitas registrada")}
 async function saveSupply(){await commit(async()=>{const id=await clinicalA1Repository.registerSupplyLocation({userId:user!.id,personId:activePersonId!,processId,farmaciaId:placeKind==="farmacia"?placeId:null,localId:placeKind==="local"?placeId:null,startOn:placeDate,origem:placeSource,observacoes:placeNote});setPlaceNote("");setPlaceId("");return id},"Local registrado")}
 if(authLoading||rows===undefined)return <Loading/>;
 if(!user?.id||!activePersonId||!rows)return <main className="min-h-dvh bg-void px-5 header-safe-top"><p className="py-10 text-ink-muted">Selecione uma pessoa e entre na conta para acessar seus registros.</p><Link href="/saude" className="text-sky-300 underline">Voltar para Saúde</Link></main>;
 const getProfessional=(id:string|null)=>rows.professionals.find(x=>x.id===id)?.nome||"Profissional não informado";
 const getMed=(id:string)=>rows.medicines.find(x=>x.id===id)?.nome||"Medicamento histórico";
 const getProcess=(id:string)=>rows.supplies.find(x=>x.id===id)?.titulo||"Processo histórico";
 const getPlace=(x:A1SupplyLocation)=>x.farmacia_id?rows.pharmacies.find(v=>v.id===x.farmacia_id)?.nome||"Farmácia histórica":rows.locations.find(v=>v.id===x.local_id)?.nome||"Local histórico";
 return <main className="min-h-dvh bg-void pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-ink-primary">
  <header className="header-safe-top border-b border-surface-border/40 bg-void px-5 pb-5 pt-3"><div className="mx-auto max-w-3xl">
   <Link href={backTarget} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted"><ArrowLeft size={17}/> Voltar</Link>
   <div className="mt-2 flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-400/10 text-violet-200"><ShieldCheck size={22}/></div><div><h1 className="font-display text-xl font-semibold">Engenharia Clínica 360</h1><p className="text-xs text-ink-muted">Registros relacionais, sem alterar doses nem estoque</p></div></div>
  </div></header>
  <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4 sm:px-6">
   <nav aria-label="Áreas clínicas" className="grid grid-cols-3 gap-2">{AREAS.map(x=>{const Icon=x.icon;return <button key={x.id} type="button" aria-pressed={area===x.id} onClick={()=>{trigger("vibrate");setArea(x.id)}} className={`min-h-[68px] rounded-2xl border p-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 ${area===x.id?"border-violet-400/60 bg-violet-400/15 text-violet-200":"border-surface-border/60 bg-surface text-ink-muted"}`}><Icon size={18} className="mx-auto mb-1"/><span className="block text-[11px] font-semibold">{x.title}</span></button>})}</nav>
   {area==="fases"&&<>
    <section className={cardStyle}><div className="flex items-center gap-2"><Activity className="text-violet-300" size={19}/><h2 className="font-semibold">Evolução dos tratamentos</h2></div><p className="mt-1 text-xs leading-relaxed text-ink-muted">Registre mudanças que aconteceram. Um relato não altera a prescrição, a dose nem a situação canônica do tratamento.</p>
     <div className="mt-4 space-y-3"><A1Choice label="Tratamento existente" value={treatmentId} onChange={setTreatmentId}><option value="">Selecionar tratamento</option>{rows.treatments.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</A1Choice>
      {chosenPhase&&<p className="text-xs text-ink-muted">Situação do tratamento: {chosenPhase.status} (não será alterada por este registro)</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><A1Choice label="Fato declarado" value={phaseType} onChange={(x)=>setPhaseType(x as A1PhaseKind)} kind="status">{PHASES.map(([key,name])=><option key={key} value={key}>{name}</option>)}</A1Choice><CustomDatePicker label="Data efetiva" value={phaseDate} maxDate={a1Today()} onChange={setPhaseDate} required/></div>
      <Field label="Título factual"><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={110} placeholder="O que mudou, segundo seu registro?" className={inputStyle}/></Field>
      <A1Choice label="Profissional relacionado (opcional)" value={professionalId} onChange={setProfessionalId}><option value="">Não informado</option>{rows.professionals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</A1Choice>
      <SourceSelect value={phaseSource} onChange={setPhaseSource}/>
      <Field label="Observações (opcional)"><textarea rows={3} value={phaseNote} onChange={e=>setPhaseNote(e.target.value)} maxLength={1000} placeholder="Fonte, circunstâncias e contexto, sem inferir efeito ou diagnóstico" className={inputStyle}/></Field>
      <button type="button" disabled={busy||!treatmentId||title.trim().length<3||!phaseDate} onClick={()=>void savePhase()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 font-semibold text-slate-950 disabled:opacity-40"><Plus size={18}/> Registrar evolução</button>
      {!rows.treatments.length&&<Link href="/saude/tratamentos/novo" className="inline-block text-xs text-violet-300 underline">Cadastrar tratamento</Link>}
     </div>
    </section><section className={cardStyle}><h3 className="flex items-center gap-2 font-semibold"><History size={17}/> Histórico declarado</h3>
      <div className="mt-3 space-y-2">{!rows.phases.length&&<p className="text-sm text-ink-muted">Nenhuma fase declarada. Não existem alterações presumidas.</p>}
      {rows.phases.map((x:A1TreatmentPhase)=><div key={x.id} className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{x.titulo}</p><Status synced={x.synced}/></div><p className="mt-1 text-xs text-ink-muted">{a1DateBR(x.data_efetiva)} · {PHASES.find(v=>v[0]===x.tipo)?.[1]} · {rows.treatments.find(t=>t.id===x.tratamento_id)?.nome||"Tratamento histórico"}</p>{x.profissional_id&&<p className="mt-1 text-xs text-ink-muted">{getProfessional(x.profissional_id)}</p>}{x.observacoes&&<p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{x.observacoes}</p>}</div>)}</div>
    </section></>}
   {area==="receitas"&&<><section className={cardStyle}><h2 className="flex items-center gap-2 font-semibold"><FileText size={19} className="text-amber-300"/> Relações entre receitas reais</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Vincule duas receitas já existentes do mesmo medicamento. Isso não emite receita, não registra compra e não altera o estoque.</p>
    <div className="mt-4 space-y-3"><A1Choice label="Medicamento" value={medicationId} onChange={(x)=>{setMedicationId(x);setPreviousId("");setCurrentId("")}}><option value="">Selecionar medicamento</option>{rows.medicines.map(x=><option key={x.id} value={x.id}>{x.nome} · {x.dosagem}</option>)}</A1Choice>
     <A1Choice label="Receita anterior" value={previousId} onChange={setPreviousId}><option value="">Selecionar registro anterior</option>{rxEvents.map(x=><option key={x.id} value={x.id}>{a1DateBR(x.data)} · {x.medicamento_nome||chosenMedicine?.nome||"Receita"}</option>)}</A1Choice>
     <A1Choice label="Receita atual" value={currentId} onChange={setCurrentId}><option value="">Selecionar registro atual</option>{rxEvents.map(x=><option key={x.id} value={x.id}>{a1DateBR(x.data)} · {x.medicamento_nome||chosenMedicine?.nome||"Receita"}</option>)}</A1Choice>
     <A1Choice label="Relação declarada" value={rxType} onChange={(x)=>setRxType(x as "renovacao"|"substituicao")} kind="status"><option value="renovacao">Renovação</option><option value="substituicao">Substituição</option></A1Choice>
     <SourceSelect value={rxSource} onChange={setRxSource}/><Field label="Contexto (opcional)"><textarea className={inputStyle} rows={2} maxLength={1000} value={rxNote} onChange={e=>setRxNote(e.target.value)} placeholder="O que fundamenta esta relação?"/></Field>
     <button type="button" disabled={busy||!medicationId||!currentId||!previousId||previousId===currentId} onClick={()=>void saveRx()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 font-semibold text-slate-950 disabled:opacity-40"><Plus size={18}/> Vincular versões existentes</button>
     <Link href="/saude/renovacao/nova-receita" className="inline-flex min-h-10 items-center text-xs text-amber-300 underline">Registrar nova receita pela autoridade existente</Link>
    </div></section><section className={cardStyle}><h3 className="flex items-center gap-2 font-semibold"><History size={17}/> Histórico de relações</h3><div className="mt-3 space-y-2">{!rows.rxLinks.length&&<p className="text-sm text-ink-muted">Nenhuma relação de versões registrada.</p>}
     {rows.rxLinks.map((x:A1PrescriptionLink)=><div key={x.id} className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{getMed(x.medicamento_id)}</p><Status synced={x.synced}/></div><p className="mt-1 text-xs text-ink-muted">{x.tipo==="renovacao"?"Renovação":"Substituição"} · {a1DateBR(rows.renovations.find(r=>r.id===x.renovacao_anterior_id)?.data||"")} → {a1DateBR(rows.renovations.find(r=>r.id===x.renovacao_atual_id)?.data||"")}</p>{x.observacoes&&<p className="mt-2 text-xs text-ink-muted">{x.observacoes}</p>}</div>)}</div></section></>}
   {area==="locais"&&<><section className={cardStyle}><h2 className="flex items-center gap-2 font-semibold"><MapPin size={19} className="text-emerald-300"/> Histórico de locais de fornecimento</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Registre onde um fornecimento deve ocorrer a partir da data informada. Retiradas passadas preservam a origem original.</p>
      <div className="mt-4 space-y-3"><A1Choice label="Processo de fornecimento" value={processId} onChange={setProcessId}><option value="">Selecionar processo</option>{rows.supplies.map(x=><option key={x.id} value={x.id}>{x.titulo}</option>)}</A1Choice>
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><A1Choice label="Tipo de local" value={placeKind} onChange={(x)=>{setPlaceKind(x as "farmacia"|"local");setPlaceId("")}} kind="status"><option value="farmacia">Farmácia</option><option value="local">Local de saúde</option></A1Choice><CustomDatePicker label="Início declarado" value={placeDate} onChange={setPlaceDate} required/></div>
       <A1Choice label={placeKind==="farmacia"?"Farmácia existente":"Local existente"} value={placeId} onChange={setPlaceId}><option value="">Selecionar local</option>{(placeKind==="farmacia"?rows.pharmacies:rows.locations).map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</A1Choice>
       <SourceSelect value={placeSource} onChange={setPlaceSource}/><Field label="Observação de vigência (opcional)"><textarea rows={2} className={inputStyle} maxLength={1000} value={placeNote} onChange={e=>setPlaceNote(e.target.value)} placeholder="Informação fornecida pelo local ou pelo processo"/></Field>
       <button type="button" disabled={busy||!processId||!placeId||!placeDate} onClick={()=>void saveSupply()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 font-semibold text-slate-950 disabled:opacity-40"><Plus size={18}/> Registrar local e vigência</button>
       <Link href="/saude/fornecimento" className="inline-flex min-h-10 items-center text-xs text-emerald-300 underline">Abrir processos e retiradas existentes</Link>
      </div></section><section className={cardStyle}><h3 className="flex items-center gap-2 font-semibold"><History size={17}/> Histórico preservado</h3><div className="mt-3 space-y-2">{!rows.sites.length&&<p className="text-sm text-ink-muted">Nenhum local com vigência declarado.</p>}{rows.sites.map((x:A1SupplyLocation)=><div key={x.id} className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{getPlace(x)}</p><Status synced={x.synced}/></div><p className="mt-1 text-xs text-ink-muted">{getProcess(x.fornecimento_id)} · Desde {a1DateBR(x.inicio_vigencia)}</p>{x.observacoes&&<p className="mt-2 text-xs text-ink-muted">{x.observacoes}</p>}</div>)}</div></section></>}
   <section className="rounded-2xl border border-sky-400/20 bg-sky-400/[.035] p-3 text-xs leading-relaxed text-ink-muted"><div className="flex items-center gap-2 text-sky-300"><CheckCircle2 size={16}/><strong>Dados reais, origens preservadas</strong></div><p className="mt-1">Nenhuma ação desta central cria doses, altera saldo, confirma aquisição ou registra prescrição automaticamente. Os vínculos usam IDs e pertencem à pessoa ativa.</p></section>
  </div>
 </main>;
}
