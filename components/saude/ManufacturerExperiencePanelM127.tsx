"use client";

import { useEffect, useState } from "react";
import { ClipboardList, ShieldCheck } from "lucide-react";
import {
  readManufacturerCheckInsM127,
  upsertManufacturerCheckInM127,
  type ManufacturerCheckInDayM127,
} from "@/lib/medications/manufacturer-checkin-m127";

const DAYS: ManufacturerCheckInDayM127[] = [1,3,7,30];
export function ManufacturerExperiencePanelM127({acquisitionId, manufacturer, observations, onSave}: {
  acquisitionId: string;
  manufacturer: string;
  observations?: string | null;
  onSave: (notes: string) => Promise<void>;
}) {
  const [day, setDay] = useState<ManufacturerCheckInDayM127>(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const checkins = readManufacturerCheckInsM127(observations, acquisitionId);
  useEffect(() => {setDay(1);setNotes("");setFeedback("");}, [acquisitionId]);
  useEffect(() => {setNotes(checkins.find(item => item.day === day)?.notes ?? "");}, [day, observations, acquisitionId]);
  async function save() {
    if (saving || !notes.trim()) {setFeedback("Descreva sua experiência antes de salvar."); return;}
    setSaving(true); setFeedback("");
    try {
      const next = upsertManufacturerCheckInM127(observations, {acquisitionId, manufacturer, day, recordedAt:new Date().toISOString(), notes:notes.trim()});
      await onSave(next);
      setFeedback("Relato salvo no histórico desta aquisição.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o relato.");
    } finally {setSaving(false);}
  }
  return <section aria-label="Relato pessoal sobre fabricante" className="mt-4 rounded-[24px] border border-violet-400/20 bg-violet-400/[.035] p-4">
    <div className="flex items-center gap-2"><ClipboardList size={16} className="text-violet-300"/><h3 className="text-sm font-bold text-ink-primary">Minha experiência com {manufacturer}</h3></div>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">Relato voluntário após a aquisição, associado somente a este evento. Selecione a etapa que deseja registrar; D1, D3, D7 e D30 não são lembretes automáticos.</p>
    <div role="group" aria-label="Etapa do relato" className="mt-3 grid grid-cols-4 gap-1.5">{DAYS.map(item => <button type="button" key={item} disabled={saving} aria-pressed={day===item} onClick={()=>setDay(item)} className={`min-h-11 rounded-xl border text-xs font-bold ${day===item?"border-violet-400/50 bg-violet-400/15 text-violet-200":"border-surface-border bg-surface text-ink-muted"}`}>D{item}{checkins.some(x=>x.day===item)?" ✓":""}</button>)}</div>
    <label className="mt-3 block text-xs font-semibold text-ink-primary">O que você percebeu?
      <textarea rows={3} maxLength={1000} value={notes} disabled={saving} onChange={event=>setNotes(event.target.value)} placeholder="Relate somente o que observou. Evite concluir causa ou equivalência entre fabricantes." className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-violet-400"/>
    </label>
    <button type="button" disabled={saving||!notes.trim()} onClick={()=>void save()} className="mt-3 min-h-11 w-full rounded-xl bg-violet-400 px-3 text-sm font-bold text-void disabled:opacity-40">{saving?"Salvando…":checkins.some(x=>x.day===day)?"Atualizar relato pessoal":"Salvar relato pessoal"}</button>
    {feedback&&<p role="status" className="mt-2 text-xs text-violet-200">{feedback}</p>}
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>O Vault não determina superioridade, bioequivalência individual nem causalidade a partir de relatos.</p>
  </section>;
}
