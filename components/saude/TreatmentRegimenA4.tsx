"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, CalendarDays, CheckCircle2, ChevronDown, History, Loader2, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";
import { clinicalA1Repository } from "@/lib/clinical-a1/repository";
import { a1DateBR, a1Today, type A1PhaseKind, type A1Source } from "@/lib/clinical-a1/types";
import { a4History, a4PhaseKindLabel, a4PhaseSourceLabel, a4RecordedSummary } from "@/lib/treatment-a4/regimen";
import type { Consulta, Document, Medico, Medicamento } from "@/lib/types";

type Props = {
  treatmentId: string;
  userId: string;
  personId: string;
  medications: Medicamento[];
  doctors: Medico[];
  consultations: Consulta[];
  documents: Document[];
};

const KINDS: readonly { value:A1PhaseKind; label:string }[] = [
  {value:"inicio",label:"Início informado"},
  {value:"ajuste",label:"Alteração do regime"},
  {value:"pausa",label:"Pausa informada"},
  {value:"retomada",label:"Retomada informada"},
  {value:"conclusao",label:"Encerramento informado"},
];
const NATURES = [{value:"nao_informado",label:"Não informado"},{value:"temporario",label:"Temporário"},{value:"continuo",label:"Contínuo"}] as const;
const SOURCES: readonly {value:A1Source;label:string}[] = [
  {value:"relato_pessoal",label:"Meu relato"},
  {value:"orientacao_profissional",label:"Orientação profissional informada"},
  {value:"documento_revisado",label:"Documento consultado"},
];
const LATERALITIES = [
  {value:"",label:"Não informada"},
  {value:"esquerda",label:"Esquerda"},
  {value:"direita",label:"Direita"},
  {value:"bilateral",label:"Bilateral"},
  {value:"nao_aplicavel",label:"Não se aplica"},
] as const;
const field = "w-full min-h-11 rounded-2xl border border-surface-border/60 bg-surface-raised px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-emerald-400/60";
const label = "mb-1.5 block text-xs font-semibold text-ink-primary";

export function TreatmentRegimenA4({treatmentId,userId,personId,medications,doctors,consultations,documents}: Props) {
  const {trigger} = useHapticFeedback();
  const {showToast}=useToast();
  const formDetails=useRef<HTMLDetailsElement|null>(null);
  const [kind,setKind] = useState<A1PhaseKind>("ajuste");
  const [nature,setNature] = useState<"temporario"|"continuo"|"nao_informado">("nao_informado");
  const [source,setSource] = useState<A1Source>("relato_pessoal");
  const [date,setDate] = useState("");
  const [title,setTitle] = useState("");
  const [notes,setNotes] = useState("");
  const [medicationId,setMedicationId] = useState("");
  const [doctorId,setDoctorId] = useState("");
  const [consultationId,setConsultationId] = useState("");
  const [documentId,setDocumentId] = useState("");
  const [dose,setDose] = useState("");
  const [frequency,setFrequency] = useState("");
  const [times,setTimes] = useState("");
  const [route,setRoute] = useState("");
  const [side,setSide] = useState("");
  const [bodySite,setBodySite] = useState("");
  const [plannedEnd,setPlannedEnd] = useState("");
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  // Never carry draft associations to another account, person or treatment.
  useEffect(() => {
    setMedicationId("");setDoctorId("");setConsultationId("");setDocumentId("");
    setDose("");setFrequency("");setTimes("");setRoute("");setSide("");
    setBodySite("");setPlannedEnd("");setTitle("");setNotes("");
    setKind("ajuste");setNature("nao_informado");setSource("relato_pessoal");setDate("");setError("");setSuccess("");
  },[treatmentId,userId,personId]);

  const events = useLiveQuery(async () => {
    if (!treatmentId || !userId || !personId) return [];
    return db.a1_treatment_phases.where("tratamento_id").equals(treatmentId).filter(row =>
      row.user_id === userId && row.person_id === personId && !row.deleted_at
    ).toArray();
  },[treatmentId,userId,personId]);
  const history = useMemo(() => a4History(events ?? [],userId,personId,treatmentId),[events,userId,personId,treatmentId]);
  const scopedMedications = useMemo(() => medications.filter(m=>Boolean(m.id) && m.user_id===userId && m.person_id===personId),[medications,userId,personId]);
  const scopedConsultations = useMemo(() => consultations.filter(c=>Boolean(c.id) && c.user_id===userId && c.person_id===personId),[consultations,userId,personId]);
  const scopedDocuments = useMemo(() => documents.filter(d=>Boolean(d.id) && d.user_id===userId && d.person_id===personId),[documents,userId,personId]);
  const scopedDoctors = useMemo(() => doctors.filter(m=>Boolean(m.id) && m.user_id===userId),[doctors,userId]);
  const kindIsRegimen = kind==="inicio" || kind==="ajuste" || kind==="retomada";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);setError("");setSuccess("");
    try {
      if (!userId || !personId || !treatmentId) throw new Error("Selecione uma pessoa válida para registrar.");
      if (!date) throw new Error("Informe a data efetiva do fato; não será preenchida automaticamente.");
      const hasStructuredRegimen = Boolean(nature!=="nao_informado" || medicationId || dose.trim() || frequency.trim() || times.trim() || route.trim() || side || bodySite.trim() || plannedEnd || consultationId || documentId);
      if (kindIsRegimen && !hasStructuredRegimen && !notes.trim()) throw new Error("Informe a mudança declarada ou descreva-a em observações.");
      const id = await clinicalA1Repository.recordPhase({
        userId,personId,treatmentId,tipo:kind,data:date,origem:source,
        professionalId:doctorId || null,titulo:title,observacoes:notes,
        regimeA4: hasStructuredRegimen ? {
          versao:1,natureza:nature,medicamento_id:medicationId || null,dose_texto:dose || null,
          frequencia_texto:frequency || null,
          horarios:times.split(/[;,\n]/).map(v=>v.trim()).filter(Boolean),
          via:route || null,lateralidade:side ? side as "esquerda"|"direita"|"bilateral"|"nao_aplicavel" : null,
          local_anatomico:bodySite || null,fim_previsto:plannedEnd || null,
          consulta_id:consultationId || null,documento_id:documentId || null,
        } : null,
      });
      setSuccess(`Mudança registrada localmente (${id.slice(0,8)}). A sincronização pode continuar pendente.`);
      setTitle("");setNotes("");setDose("");setFrequency("");setTimes("");setRoute("");setSide("");
      setBodySite("");setPlannedEnd("");setMedicationId("");setDoctorId("");setConsultationId("");setDocumentId("");
       formDetails.current?.removeAttribute('open');
       showToast('Mudança registrada; os fatos anteriores foram preservados.','success');
       trigger("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a mudança de tratamento.");
       showToast(cause instanceof Error ? cause.message : 'Não foi possível registrar a mudança.','error');
       trigger("error");
    } finally { setSaving(false); }
  }

  return <section id="tratamento-regimes" className="vault-deferred scroll-mt-24 rounded-[28px] border border-surface-border bg-surface/80 p-4 sm:p-5" aria-label="Histórico versionado do tratamento">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink-muted"><History size={19}/></div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold text-ink-primary">Regime e mudanças do tratamento</h2>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Fases registradas por data, origem e vínculo real. Este histórico não altera doses tomadas, estoque, receita ou status do tratamento automaticamente.</p>
      </div>
    </div>
    <p className="mt-3 rounded-2xl border border-surface-border/70 bg-surface-raised/30 px-3 py-2 text-xs leading-5 text-ink-primary" role="note">{a4RecordedSummary(history)}</p>
    <div className="mt-3 space-y-2">
      {history.length===0 ? <p className="text-xs text-ink-muted">Nenhuma fase registrada. Você pode documentar um fato sem assumir que o tratamento foi iniciado ou encerrado automaticamente.</p> : history.map(({item,nextRecordedDate,isLatestRecorded}) => {
        const s=item.regime_a4;
        const medicine=scopedMedications.find(m=>m.id===s?.medicamento_id);
        const doctor=scopedDoctors.find(m=>m.id===item.profissional_id);
        return <article key={item.id} className="rounded-2xl border border-surface-border/50 bg-surface-raised px-3.5 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-semibold text-ink-primary">{item.titulo}</p><p className="mt-1 text-xs text-ink-muted">{a4PhaseKindLabel(item.tipo)} · {a1DateBR(item.data_efetiva)}</p></div>
            {isLatestRecorded?<span className="rounded-full border border-surface-border px-2 py-1 text-[10px] text-ink-muted">Último registro</span>:null}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{a4PhaseSourceLabel(item.origem)}{doctor?` · ${doctor.nome}`:""}{nextRecordedDate?` · Registro posterior em ${a1DateBR(nextRecordedDate)}`:""}</p>
          {s ? <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink-primary">
            <span className="rounded-lg bg-surface px-2 py-1 text-ink-muted">{s.natureza==="continuo"?"Contínuo declarado":s.natureza==="temporario"?"Temporário declarado":"Duração não informada"}</span>
            {medicine?<Link href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(medicine.id||"")}`} className="rounded-lg bg-emerald-400/10 px-2 py-1 text-emerald-200 underline-offset-2 focus-visible:underline">{medicine.nome}</Link>:s.medicamento_id?<span className="rounded-lg border border-amber-400/20 px-2 py-1 text-amber-200">Medicamento vinculado indisponível nesta pessoa</span>:null}
            {[s.dose_texto,s.frequencia_texto,s.via,s.local_anatomico,...s.horarios].filter(Boolean).map((value,i)=><span key={`${item.id}-${i}`} className="rounded-lg bg-void/70 px-2 py-1">{value}</span>)}
            {s.lateralidade&&s.lateralidade!=="nao_aplicavel"?<span className="rounded-lg bg-void/70 px-2 py-1">{s.lateralidade}</span>:null}
            {s.fim_previsto?<span className="rounded-lg border border-amber-400/20 px-2 py-1 text-amber-200">Revisão/fim previsto: {a1DateBR(s.fim_previsto)} · não confirmado</span>:null}
            {s.consulta_id?<span className="rounded-lg border border-sky-400/20 px-2 py-1 text-sky-200">Consulta vinculada</span>:null}
            {s.documento_id?<span className="rounded-lg border border-amber-400/20 px-2 py-1 text-amber-200">Documento vinculado</span>:null}
          </div>:null}
          {s?.fim_previsto?<p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Revisão prevista não cria alerta automaticamente. <Link href="/saude/lembretes" className="font-semibold text-ink-muted underline underline-offset-2">Configurar um lembrete voluntariamente</Link>.</p>:null}
          {item.observacoes?<p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-ink-muted">{item.observacoes}</p>:null}
          {!item.synced?<p className="mt-2 text-[11px] text-amber-200">Pendente de sincronização — registro local preservado</p>:null}
        </article>;
      })}
    </div>

    <details ref={formDetails} className="mt-4 rounded-2xl border border-surface-border bg-surface-raised/35 group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        <span className="flex items-center gap-2"><Activity size={17}/>Registrar mudança real</span><ChevronDown className="group-open:rotate-180 transition-transform" size={17}/>
      </summary>
      <form onSubmit={submit} className="space-y-4 border-t border-surface-border/70 px-4 pb-4 pt-4">
        <p className="text-xs leading-5 text-ink-muted">Novo registro é histórico e aditivo. Não modifica a prescrição médica nem gera lembretes ou tomadas automaticamente.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className={label}>Tipo de registro</span><HealthRelationPicker title="Tipo de evento" value={kind} onValueChange={v=>setKind(v as A1PhaseKind)} className={field}>{KINDS.map(k=><option value={k.value} key={k.value}>{k.label}</option>)}</HealthRelationPicker></div>
          <div><span className={label}>Origem declarada</span><HealthRelationPicker title="Origem do registro" value={source} onValueChange={v=>setSource(v as A1Source)} className={field}>{SOURCES.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</HealthRelationPicker></div>
          <div><label className={label}>Data efetiva do fato</label><CustomDatePicker value={date} onChange={setDate} className={field}/></div>
          <div><label htmlFor="a4-phase-title" className={label}>Título do fato</label><input id="a4-phase-title" required minLength={3} maxLength={110} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: ajuste informado na consulta" className={field}/></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className={label}>Duração declarada</span><HealthRelationPicker title="Natureza do regime" kind="status" value={nature} onValueChange={v=>setNature(v as "temporario"|"continuo"|"nao_informado")} className={field}>{NATURES.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</HealthRelationPicker></div>
          <div><span className={label}>Medicamento deste regime (se houver)</span><HealthRelationPicker title="Medicamento registrado" medications={scopedMedications} value={medicationId} onValueChange={setMedicationId} className={field}><option value="">Sem medicamento específico</option>{scopedMedications.map(m=><option key={m.id} value={m.id}>{m.nome}{m.dosagem?` · ${m.dosagem}`:""}</option>)}</HealthRelationPicker></div>
          <div><span className={label}>Profissional relacionado (opcional)</span><HealthRelationPicker title="Profissional" kind="doctor" value={doctorId} onValueChange={setDoctorId} className={field}><option value="">Não vinculado</option>{scopedDoctors.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</HealthRelationPicker></div>
          <div><span className={label}>Consulta relacionada (opcional)</span><HealthRelationPicker title="Consulta" kind="consultation" value={consultationId} onValueChange={setConsultationId} className={field}><option value="">Nenhuma consulta</option>{scopedConsultations.map(c=><option key={c.id} value={c.id}>{c.data?`Consulta ${a1DateBR(c.data)}`:`Consulta ${c.id}`}</option>)}</HealthRelationPicker></div>
          <div><span className={label}>Documento relacionado (opcional)</span><HealthRelationPicker title="Documento" value={documentId} onValueChange={setDocumentId} className={field}><option value="">Nenhum documento</option>{scopedDocuments.map(d=><option key={d.id} value={d.id}>{d.title || `Documento ${d.id}`}</option>)}</HealthRelationPicker></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="a4-dose" className={label}>Dose informada</label><input id="a4-dose" value={dose} maxLength={90} onChange={e=>setDose(e.target.value)} placeholder="Somente o que foi informado" className={field}/></div>
          <div><label htmlFor="a4-frequency" className={label}>Frequência informada</label><input id="a4-frequency" value={frequency} maxLength={120} onChange={e=>setFrequency(e.target.value)} placeholder="Ex.: conforme documento" className={field}/></div>
          <div><label htmlFor="a4-times" className={label}>Horários informados</label><input id="a4-times" value={times} onChange={e=>setTimes(e.target.value)} placeholder="08:00, 20:00" className={field}/><p className="mt-1 text-[11px] text-ink-muted">Somente horários conhecidos; separados por vírgula.</p></div>
          <div><label htmlFor="a4-route" className={label}>Via informada</label><input id="a4-route" value={route} maxLength={80} onChange={e=>setRoute(e.target.value)} placeholder="Se constar no registro" className={field}/></div>
          <div><span className={label}>Lateralidade, quando aplicável</span><HealthRelationPicker title="Lateralidade" value={side} onValueChange={setSide} className={field}>{LATERALITIES.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</HealthRelationPicker></div>
          <div><label htmlFor="a4-site" className={label}>Região ou local informado</label><input id="a4-site" value={bodySite} maxLength={100} onChange={e=>setBodySite(e.target.value)} placeholder="Se pertinente" className={field}/></div>
          <div><label className={label}>Revisão ou fim previsto (não é conclusão)</label><CustomDatePicker value={plannedEnd} onChange={setPlannedEnd} className={field}/></div>
        </div>
        <div><label htmlFor="a4-notes" className={label}>Observações factuais</label><textarea id="a4-notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Descreva o que foi informado e por quem, sem presumir uma orientação médica." className={field+" resize-y"}/></div>
        <div className="flex items-start gap-2 rounded-xl bg-void/70 p-3 text-xs leading-5 text-ink-muted"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-300"/><span>Registro associado à pessoa ativa. Salvar aqui não altera medicamentos, logs de dose, estoque ou status do tratamento. A origem é uma declaração, não uma prescrição validada automaticamente.</span></div>
        {error?<p className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-3 text-xs text-rose-200" role="alert">{error}</p>:null}
        {success?<p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3 text-xs text-emerald-200" role="status"><CheckCircle2 size={16}/>{success}</p>:null}
        <button disabled={saving||!userId||!personId} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400 px-4 text-sm font-semibold text-void active:scale-[.99] disabled:opacity-50">{saving?<Loader2 size={17} className="animate-spin"/>:<CalendarDays size={17}/>} {saving?"Registrando…":"Registrar fase no histórico"}</button>
      </form>
    </details>
  </section>;
}
