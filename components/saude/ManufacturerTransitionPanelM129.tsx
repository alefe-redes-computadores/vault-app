"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, CalendarDays, Palette, ShieldCheck } from "lucide-react";
import type { Medicamento, Renovacao } from "@/lib/types";
import { ManufacturerBadge } from "@/components/saude/ManufacturerBadge";
import { readManufacturerMetadata } from "@/lib/medications/manufacturer-experience";
import {
  appearanceBeforeM129, describeManufacturerChangeM129,
  findPreviousManufacturerM129, manufacturerEvidenceSummaryM129,
  readManufacturerTransitionM129, displayManufacturerStartDateM129, maskManufacturerStartDateM129,
  parseManufacturerStartDateM129, writeManufacturerTransitionM129,
  type ManufacturerAssessmentM129,
} from "@/lib/medications/manufacturer-transition-m129";

const OPTIONS: { key: ManufacturerAssessmentM129; label: string; tone: string }[] = [
  { key: "better", label: "Melhorou", tone: "text-emerald-200" },
  { key: "same", label: "Ficou igual", tone: "text-ice" },
  { key: "worse", label: "Piorou", tone: "text-amber-200" },
  { key: "unknown", label: "Ainda não sei", tone: "text-ink-secondary" },
];

export function ManufacturerTransitionPanelM129({ acquisition, history, medication, onSave }: {
  acquisition: Renovacao;
  history: readonly Renovacao[];
  medication?: Medicamento | null;
  onSave: (nextObservations: string) => Promise<void>;
}) {
  const router = useRouter();
  const manufacturer = readManufacturerMetadata(acquisition.observacoes).manufacturer || "";
  const previous = useMemo(() => findPreviousManufacturerM129(acquisition, history), [acquisition, history]);
  const change = describeManufacturerChangeM129(manufacturer, previous);
  const saved = readManufacturerTransitionM129(acquisition.observacoes, acquisition.id);
  const [startDateDisplay, setStartDateDisplay] = useState("");
  const [assessment, setAssessment] = useState<ManufacturerAssessmentM129>("unknown");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setStartDateDisplay(displayManufacturerStartDateM129(saved?.startedAt));
    setAssessment(saved?.assessment || "unknown");
    setNotes(saved?.notes || "");
    setFeedback("");
  }, [acquisition.id, acquisition.observacoes]);

  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // Data civil BR editável; conversão ISO somente após validação estrita (inclui ano bissexto).
  const startDate = parseManufacturerStartDateM129(startDateDisplay);
  const invalidDate = !!startDateDisplay && (!startDate || startDate > todayLocal || (acquisition.data_aquisicao ? startDate < acquisition.data_aquisicao : false));
  const canCompare = !!startDate && !invalidDate;

  async function persist(openAppearanceEditor = false) {
    if (saving || !acquisition.id || !manufacturer) return;
    if (invalidDate) {setFeedback("Confira a data de início: ela não pode anteceder a compra nem estar no futuro.");return;}
    if (!canCompare && assessment !== "unknown") {setFeedback("Informe quando começou a usar o produto antes de avaliar a experiência.");return;}
    if (!change.changed && assessment !== "unknown") {setFeedback("Sem outro fabricante confirmado, não é possível comparar esta troca.");return;}
    setSaving(true); setFeedback("");
    try {
      const result = writeManufacturerTransitionM129(acquisition.observacoes, {
        acquisitionId: acquisition.id,
        sourceManufacturer: manufacturer,
        ...(previous ? { priorManufacturer: previous } : {}),
        startedAt: startDate || null,
        assessment: change.changed && canCompare ? assessment : "unknown",
        notes: notes.trim().slice(0, 1000),
        recordedAt: new Date().toISOString(),
        ...(openAppearanceEditor ? { appearanceBefore: saved?.appearanceBefore || appearanceBeforeM129(medication) } :
          saved?.appearanceBefore ? { appearanceBefore: saved.appearanceBefore } : {}),
      });
      await onSave(result);
      if (openAppearanceEditor) {
        router.push(`/saude/medicamentos/editar?id=${encodeURIComponent(acquisition.medicamento_id)}&intent=basico`);
      } else setFeedback("Experiência salva no histórico desta aquisição. Nenhuma informação clínica foi alterada automaticamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o relato.");
    } finally {setSaving(false);}
  }

  if (!acquisition.data_aquisicao || !manufacturer || !acquisition.id) return null;
  return <section aria-label="Troca de fabricante e acompanhamento pessoal" className="mt-4 rounded-[24px] border border-sky-400/20 bg-sky-400/[.035] p-4">
    <div className="flex items-center gap-2"><ArrowRight size={16} className="text-sky-300"/><h3 className="text-sm font-bold text-ink-primary">Troca de laboratório</h3></div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {previous ? <ManufacturerBadge manufacturer={previous}/> : <span className="rounded-full border border-surface-border px-2 py-1 text-xs text-ink-muted">Fabricante anterior desconhecido</span>}
      <ArrowRight size={15} className="text-ink-muted"/><ManufacturerBadge manufacturer={manufacturer}/>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">{change.message}</p>
    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">O VAULT considera apenas aquisições reais autorizadas da mesma pessoa e medicamento. A compra não comprova que você iniciou o uso.</p>

    <div className="mt-4 rounded-2xl border border-surface-border/70 bg-surface p-3">
      <label htmlFor={`m129-start-${acquisition.id}`} className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><CalendarDays size={14} className="text-sky-300"/>Quando começou a usar esta aquisição?</label>
      <input id={`m129-start-${acquisition.id}`} type="text" inputMode="numeric" placeholder="DD/MM/AAAA"
        autoComplete="off" spellCheck={false} maxLength={10} aria-invalid={invalidDate}
        value={startDateDisplay} disabled={saving}
        onChange={event=>{const next=maskManufacturerStartDateM129(event.target.value);setStartDateDisplay(next);if(!next)setAssessment("unknown");setFeedback("");}}
        className="mt-2 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-sky-400"/>
      <button type="button" disabled={saving} onClick={()=>{setStartDateDisplay("");setAssessment("unknown");setFeedback("");}} className="mt-2 min-h-10 rounded-lg border border-surface-border px-3 text-xs text-ink-muted">Ainda não comecei a usar</button>
      {invalidDate && <p role="alert" className="mt-2 text-xs text-amber-300">A data deve estar entre a aquisição e hoje.</p>}
      <p className="mt-3 text-xs font-semibold text-ink-primary">Em comparação com o produto anterior, como você se sentiu?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {OPTIONS.map(option=><button key={option.key} type="button" disabled={saving||!canCompare||!change.changed}
          aria-pressed={assessment===option.key}
          onClick={()=>{setAssessment(option.key);setFeedback("");}}
          className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold ${option.tone} ${assessment===option.key?"border-sky-400/60 bg-sky-400/10":"border-surface-border/70 bg-surface-raised/50"} disabled:opacity-50`}>
          {option.label}
        </button>)}
      </div>
      <label className="mt-3 block text-xs font-semibold text-ink-primary">Observações pessoais (opcional)
        <textarea rows={3} maxLength={1000} disabled={saving} value={notes} onChange={event=>setNotes(event.target.value)}
          placeholder="Ex.: sono, atenção, disposição, efeitos percebidos. O Vault não presume que o laboratório causou a mudança."
          className="mt-2 min-h-20 w-full resize-y rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-sky-400"/>
      </label>
      <button type="button" disabled={saving||invalidDate} onClick={()=>void persist()} className="mt-3 min-h-11 w-full rounded-xl bg-sky-400 px-3 py-2 text-sm font-bold text-void disabled:opacity-50">{saving?"Salvando...":"Salvar acompanhamento pessoal"}</button>
      {feedback&&<p role="status" className="mt-2 text-xs text-sky-200">{feedback}</p>}
    </div>

    <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[.05] p-3">
      <div className="flex items-center gap-2"><BrainCircuit size={15} className="text-violet-300"/><strong className="text-xs text-ink-primary">Leitura contextual Fênix</strong></div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{manufacturerEvidenceSummaryM129(saved, previous)}</p>
      <p className="mt-1 text-[10px] text-ink-muted">Fonte: declaração sua vinculada à aquisição. Ainda não é um alerta da Central do Brain e não estabelece causalidade.</p>
    </div>

    <div className="mt-3 rounded-xl border border-surface-border p-3">
      <div className="flex items-center gap-2"><Palette size={15} className="text-ice"/><strong className="text-xs text-ink-primary">Mudou a aparência da cápsula ou comprimido?</strong></div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Você pode revisar formato, ícone e cores no editor. O VAULT guarda uma referência do ícone anterior neste evento, mas não muda nenhuma dose, concentração nem prescrição automaticamente.</p>
      {saved?.appearanceBefore && <p className="mt-2 text-[11px] text-ink-muted">Referência do ícone anterior: {saved.appearanceBefore.format} · {saved.appearanceBefore.colors.length} cor(es).</p>}
      <button type="button" disabled={saving||invalidDate} onClick={()=>void persist(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-ice/30 bg-ice/5 px-3 text-xs font-semibold text-ice"><Palette size={14}/>Revisar ícone e cores do medicamento</button>
    </div>
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Aparência não comprova identidade, intercambialidade nem efeito clínico. Em caso de dúvidas sobre a substituição, confira a embalagem e consulte o farmacêutico.</p>
  </section>;
}
