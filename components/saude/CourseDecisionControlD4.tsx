"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ClipboardCheck, AlertTriangle, PencilLine, ShieldCheck } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import { appendCourseDecisionD4, type CourseDecisionD4 } from "@/lib/clinical/episode-m1";
import { latestCourseDecisionD4, courseDecisionSummaryD4 } from "@/lib/clinical/course-decision-view-d4";
import type { Medicamento, DoseLog } from "@/lib/types";

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
export function CourseDecisionControlD4({ med, personId, courseKey, from, through, doseLogs }: {
  med: Medicamento; personId: string; courseKey: string; from: string; through: string; doseLogs: DoseLog[];
}) {
  const { user } = useAuth();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const locked = useRef(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CourseDecisionD4["tipo"]>("conclusao_relatada");
  const [date, setDate] = useState(localDay);
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<CourseDecisionD4 | null>(null);
  const pendingIntent = useRef<CourseDecisionD4 | null>(null);
  useEffect(() => { setOpen(false); setLastSaved(null); setAcknowledged(false); pendingIntent.current = null; }, [med.id, personId, courseKey]);
  if (!med.id || !med.user_id || !user || med.user_id !== user.id || med.person_id !== personId ||
      !courseKey.startsWith(`${med.id}|`)) return null;
  const stored = latestCourseDecisionD4(med.contexto_clinico_m1, courseKey);
  const current = lastSaved?.course_key === courseKey ? lastSaved : stored;
  const storedHistory = (med.contexto_clinico_m1?.decisoes_d4 ?? []).filter(x => x.course_key === courseKey);
  const history = lastSaved?.course_key === courseKey && !storedHistory.some(x => x.id === lastSaved.id)
    ? [...storedHistory, lastSaved] : storedHistory;
  const relevant = doseLogs.filter(x => x.user_id === med.user_id && x.person_id === personId &&
    x.medicamento_id === med.id && x.dose_kind === "planned" && `${med.id}|${x.motivo ?? ""}` === courseKey);
  const pending = relevant.filter(x => !x.tomado_em && !x.ignorado_em).length;
  const conflict = relevant.some(x => Boolean(x.tomado_em && x.ignorado_em)) ||
    new Set(relevant.map(x => `${x.data}|${x.horario}`)).size !== relevant.length;
  const sameDay = localDay();
  const inPast = through < sameDay;

  async function submit() {
    if (saving || locked.current || !acknowledged) return;
    locked.current = true;
    setSaving(true);
    try {
      if (!med.id || !user || med.user_id !== user.id || med.person_id !== personId) throw Error("Confirme a pessoa ativa.");
      if (conflict) throw Error("Confira primeiro os horários conflitantes deste período.");
      const fresh = await db.medicamentos.get(med.id);
      if (!fresh || fresh.user_id !== user.id || fresh.person_id !== personId) throw Error("Conta ou pessoa ativa mudou.");
      const last = latestCourseDecisionD4(fresh.contexto_clinico_m1, courseKey);
      // ID estável para repetir a mesma intenção após falha ou perda de resposta.
      const item: CourseDecisionD4 = pendingIntent.current ?? {
        id: crypto.randomUUID(), course_key: courseKey, tipo: kind, data_evento: date,
        nota: note.trim(), fonte: "relato_usuario", registrado_em: new Date().toISOString(),
        ...(last ? { substitui_id: last.id } : {}),
      };
      pendingIntent.current = item;
      const next = appendCourseDecisionD4(fresh.contexto_clinico_m1, item, med.id, localDay());
      await medicamentosRepository.update(med.id, personId, { contexto_clinico_m1: next });
      setLastSaved(item);
      setOpen(false);
      setAcknowledged(false);
      pendingIntent.current = null;
      trigger("vibrate");
      showToast("Declaração registrada. Agenda e estoque permanecem inalterados.", "success");
    } catch (e) {
      trigger("error");
      showToast(e instanceof Error ? e.message : "Não foi possível registrar a declaração.", "error");
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return <div className="mt-2 rounded-xl border border-surface-border/50 bg-surface-raised/40 p-2.5" aria-label="Declaração sobre o tratamento">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-primary"><ClipboardCheck size={15} aria-hidden="true"/>Situação informada do período</p>
    <p className="mt-1 text-[11px] text-ink-muted" role="status">{courseDecisionSummaryD4(current)}</p>
    {current?.nota && <p className="mt-1 whitespace-pre-wrap text-[11px] text-ink-muted">{current.nota}</p>}
    {history.length > 1 && <details className="mt-2 rounded-lg border border-surface-border/60 p-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-[11px] text-violet-200">Histórico das {history.length} declarações</summary>
      <ol className="list-inside list-decimal space-y-1 text-[11px] text-ink-muted">
        {history.map(entry => <li key={entry.id}>{courseDecisionSummaryD4(entry)}{entry.substitui_id ? " (retificação)" : ""}</li>)}
      </ol>
    </details>}
    <p className="mt-1 text-[10px] text-ink-muted">{pending} horário(s) ainda sem decisão. O registro não apaga doses nem interrompe alertas.</p>
    {conflict && <p role="alert" className="mt-1 flex gap-1 text-[11px] text-amber-200"><AlertTriangle size={14} aria-hidden="true"/>Há horários conflitantes. Corrija antes de declarar a situação.</p>}
    <button type="button" disabled={conflict} aria-expanded={open} onClick={() => {
      setOpen(x => !x); setAcknowledged(false); pendingIntent.current = null;
    }} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-300/25 px-3 text-xs font-semibold text-violet-200 disabled:opacity-50">
      {current ? <PencilLine size={15} aria-hidden="true"/> : <ClipboardCheck size={15} aria-hidden="true"/>}
      {current ? "Retificar minha declaração" : "Registrar conclusão ou interrupção"}
    </button>
    {open && <div className="mt-2 space-y-3 rounded-xl border border-violet-300/15 bg-surface/70 p-3">
      <p className="text-[11px] text-ink-muted">Registre somente o que aconteceu. Isso não representa orientação médica, alta, alteração da receita ou suspensão automática de doses.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Tipo de declaração">
        {(["conclusao_relatada","interrupcao_relatada"] as const).map(value => <button key={value} type="button" aria-pressed={kind===value}
          onClick={() => {setKind(value);setAcknowledged(false);pendingIntent.current=null;}}
          className={`min-h-11 rounded-lg border px-2 text-left text-xs font-semibold ${kind===value?"border-violet-300/50 bg-violet-300/10 text-violet-200":"border-surface-border/60 text-ink-muted"}`}>
          {value === "conclusao_relatada" ? "Concluí o período" : "Interrompi o período"}
        </button>)}
      </div>
      <label className="block text-xs text-ink-secondary">Data em que aconteceu
        <CustomDatePicker value={date} onChange={(next: string) => {setDate(next);pendingIntent.current=null;}} className="mt-1"/>
      </label>
      <label className="block text-xs text-ink-secondary">Observação pessoal (opcional)
        <textarea value={note} maxLength={500} onChange={(e: ChangeEvent<HTMLTextAreaElement>)=>{setNote(e.target.value);pendingIntent.current=null;}} rows={2}
          placeholder="O que aconteceu, conforme seu relato" className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary"/>
      </label>
      {!inPast && <p className="text-[11px] text-amber-200">O prazo informado ainda não terminou. Uma declaração antecipada não muda o plano prescrito.</p>}
      <label className="flex min-h-11 items-start gap-2 text-[11px] leading-relaxed text-ink-secondary">
        <input type="checkbox" checked={acknowledged} onChange={(e: ChangeEvent<HTMLInputElement>)=>setAcknowledged(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-violet-400"/>
        Confirmo que esta é uma informação minha. Entendo que a agenda, os lembretes, as doses pendentes e o estoque não serão alterados automaticamente.
      </label>
      <button type="button" disabled={!acknowledged||saving||!date||date<from||date>sameDay} onClick={submit}
        className="min-h-11 w-full rounded-xl bg-violet-300/15 px-3 text-xs font-bold text-violet-200 disabled:opacity-50">
        {saving ? "Registrando..." : current ? "Salvar retificação com histórico" : "Salvar minha declaração"}
      </button>
      <p className="flex items-center gap-1 text-[10px] text-ink-muted"><ShieldCheck size={13} aria-hidden="true"/> A ação não altera a prescrição nem modifica dados antigos.</p>
    </div>}
  </div>;
}
