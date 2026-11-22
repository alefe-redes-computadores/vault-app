"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { preserveReturnTarget } from "@/lib/navigation/return-context";
import {
  ArrowLeft,
  Activity,
  CalendarClock,
  FileText,
  HeartPulse,
  Plus,
  Stethoscope,
  MessageSquareHeart,
  ChevronRight,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { ClinicalBackLinkP0 } from "@/components/saude/ClinicalBackLinkP0";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";
import { useConsultas } from "@/hooks/useConsultas";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";
import { withReturnTarget } from "@/lib/navigation/return-context";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHealthReminders } from "@/hooks/useHealthReminders";
import { healthRemindersRepository } from "@/lib/repositories/healthReminders";
import { saveHealthMeasurement } from "@/lib/repositories/healthMeasurements";
import { pdfLibraryM2 } from "@/lib/careflow-m2/pdf-library";
import { getLocalTodayISO } from "@/lib/health-utils";
import { isClockM2, isIsoDateM2 } from "@/lib/careflow-m2/domain";
import { parsePressureDraft } from "@/lib/health/pressure-input";
import { useToast } from "@/components/ToastProvider";
const input =
  "min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary focus:border-sky-300/50 outline-none";
const nowClock = () => new Date().toTimeString().slice(0, 5);
const validBP = (sys: number, dia: number) =>
  Number.isInteger(sys) &&
  Number.isInteger(dia) &&
  sys >= 30 &&
  sys <= 300 &&
  dia >= 20 &&
  dia <= 200 &&
  dia < sys;
export default function PressureCareFlowPage() {
  const router = useRouter();
  const { showToast } = useToast();
  // R6: a lista de aferições e planos está na Linha de cuidado; aqui há editor/detalhe.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.has("novo") ||
      params.has("plano") ||
      params.has("consulta") ||
      /^#careflow-(pressao|plano)-/.test(window.location.hash)
    )
      return;
    router.replace(
      preserveReturnTarget("/saude/registros?foco=pressao", params)
    );
  }, [router]);
  const { events = [], append, activePersonId, userId } = useCareFlowM2();
  const { registros = [] } = useRegistrosSaude();
  const { reminders = [] } = useHealthReminders();
  const { consultas = [] } = useConsultas();
  const [start, setStart] = useState(getLocalTodayISO()),
    [end, setEnd] = useState(getLocalTodayISO());
  const [slots, setSlots] = useState([""]),
    [planNote, setPlanNote] = useState("");
  const [editingPlan, setEditingPlan] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(""),
    [pressureDraft, setPressureDraft] = useState(""),
    [pressureHint, setPressureHint] = useState("");
  const [date, setDate] = useState(getLocalTodayISO()),
    [time, setTime] = useState(nowClock()),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [activeForm, setActiveForm] = useState<"plan" | "reading" | null>(null);
  const showPlanForm = activeForm === "plan";
  const showReadingForm = activeForm === "reading";
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setActiveForm(q.get("novo") === "1" || q.has("consulta") ? "reading" : q.get("plano") === "1" ? "plan" : null);
  }, []);
  const [consultationId, setConsultationId] = useState(""),
    [symptomId, setSymptomId] = useState("");
  type PendingContextR2 = {
    uid: string;
    pid: string;
    eventId: string;
    recordId: string;
    consultationId: string;
    symptomId: string;
    date: string;
    time: string;
  };
  const [pendingContext, setPendingContext] = useState<PendingContextR2 | null>(
    null
  );
  const appliedConsultation = useRef("");
  const liveScope = useRef({ uid: userId, pid: activePersonId || "" });
  liveScope.current = { uid: userId, pid: activePersonId || "" };
  const scopeStill = (uid: string, pid: string) =>
    liveScope.current.uid === uid && liveScope.current.pid === pid;
  const closedPlanIds = useMemo(
    () =>
      new Set(
        events
          .filter(
            (e) =>
              e.kind === "monitor_note" &&
              e.user_id === userId &&
              e.person_id === activePersonId &&
              e.payload.link === "pressure_plan_closed" &&
              e.parent_id
          )
          .map((e) => e.parent_id!)
      ),
    [events, userId, activePersonId]
  );
  const plans = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.kind === "monitor_plan" &&
            e.user_id === userId &&
            e.person_id === activePersonId &&
            !closedPlanIds.has(e.id)
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [events, userId, activePersonId, closedPlanIds]
  );
  const measurements = useMemo(
    () =>
      registros
        .filter(
          (r) =>
            r.user_id === userId &&
            r.person_id === activePersonId &&
            r.tipo === "pressao_arterial"
        )
        .sort((a, b) =>
          `${b.data}T${b.horario || "00:00"}`.localeCompare(
            `${a.data}T${a.horario || "00:00"}`
          )
        ),
    [registros, userId, activePersonId]
  );
  const ownConsultations = useMemo(
    () =>
      consultas
        .filter(
          (c) => c.id && c.user_id === userId && c.person_id === activePersonId
        )
        .sort((a, b) => b.data.localeCompare(a.data)),
    [consultas, userId, activePersonId]
  );
  const ownSymptoms = useMemo(
    () =>
      registros
        .filter(
          (r) =>
            r.id &&
            r.user_id === userId &&
            r.person_id === activePersonId &&
            r.categoria === "sintoma"
        )
        .sort((a, b) => b.data.localeCompare(a.data)),
    [registros, userId, activePersonId]
  );
  const contexts = useMemo(
    () =>
      new Map(
        events
          .filter(
            (e) =>
              e.kind === "monitor_note" &&
              e.user_id === userId &&
              e.person_id === activePersonId &&
              e.payload.link === "pressure_context_explicit" &&
              e.related_id
          )
          .map((e) => [e.related_id!, e] as const)
      ),
    [events, userId, activePersonId]
  );
  useEffect(() => {
    const id =
      new URLSearchParams(window.location.search).get("consulta") || "";
    const key = `${userId}:${activePersonId || ""}:${id}`;
    if (
      id &&
      appliedConsultation.current !== key &&
      ownConsultations.some((c) => c.id === id)
    ) {
      appliedConsultation.current = key;
      setConsultationId(id);
    }
  }, [ownConsultations, userId, activePersonId]);
  const remindersByPlan = useMemo(() => {
    const map = new Map<string, typeof reminders>();
    for (const reminder of reminders) {
      if (
        reminder.user_id !== userId ||
        reminder.person_id !== activePersonId ||
        !reminder.careflow_m2?.plan_id
      )
        continue;
      const list = map.get(reminder.careflow_m2.plan_id) || [];
      list.push(reminder);
      map.set(reminder.careflow_m2.plan_id, list);
    }
    return map;
  }, [reminders, userId, activePersonId]);
  const refs = useMemo(
    () => new Set(remindersByPlan.keys()),
    [remindersByPlan]
  );
  useEffect(() => {
    const hash = window.location.hash;
    const reading = hash.startsWith("#careflow-pressao-"),
      plan = hash.startsWith("#careflow-plano-");
    if (!reading && !plan) return;
    let id = "";
    try {
      id = decodeURIComponent(
        hash.slice(
          reading ? "#careflow-pressao-".length : "#careflow-plano-".length
        )
      );
    } catch {
      return;
    }
    if (reading && !measurements.some((r) => r.id === id)) return;
    if (plan && !plans.some((p) => p.id === id)) return;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById(
          `${reading ? "careflow-pressao-" : "careflow-plano-"}${id}`
        )
        ?.scrollIntoView({ block: "center", behavior: "auto" })
    );
    return () => cancelAnimationFrame(frame);
  }, [measurements, plans]);
  const trend = useMemo(
    () =>
      measurements
        .slice(0, 60)
        .reverse()
        .map((r) => {
          const match = /^\s*(\d+)\s*\/\s*(\d+)/.exec(
            String(r.valor_medicao || "")
          );
          return match
            ? { date: r.data, sys: Number(match[1]), dia: Number(match[2]) }
            : null;
        })
        .filter((r): r is { date: string; sys: number; dia: number } =>
          Boolean(r)
        ),
    [measurements]
  );
  const chart = useMemo(() => {
    const nums = trend.flatMap((x) => [x.sys, x.dia]),
      min = Math.max(0, Math.min(...nums) - 15),
      max = Math.max(...nums) + 15,
      span = Math.max(1, max - min);
    const toPoint = (kind: "sys" | "dia") =>
      trend
        .map(
          (x, i) =>
            `${20 + (i * 280) / Math.max(1, trend.length - 1)},${
              125 - (100 * (x[kind] - min)) / span
            }`
        )
        .join(" ");
    return {
      top: Math.round(max),
      bottom: Math.round(min),
      systolic: toPoint("sys"),
      diastolic: toPoint("dia"),
    };
  }, [trend]);
  const createPlan = async () => {
    if (!activePersonId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const clean = [...new Set(slots.filter(Boolean))].sort();
      if (
        !isIsoDateM2(start) ||
        !isIsoDateM2(end) ||
        end < start ||
        clean.length < 1 ||
        clean.length > 6 ||
        clean.some((x) => !isClockM2(x))
      )
        throw new Error("Confira datas e horários.");
      const id = crypto.randomUUID();
      await append({
        id,
        kind: "monitor_plan",
        payload: {
          start,
          end,
          slots: clean,
          note: planNote.trim(),
          origin: "patient_confirmed",
        },
      });
      setSelectedPlan(id);
      try {
        await healthRemindersRepository.createMany(
          clean.map((clock) => ({
            person_id: activePersonId,
              title: "Registrar pressão",
            body: "Registre apenas valores realmente medidos.",
            target_type: "health_record:medicao",
            target_route: "/saude/careflow/pressao?novo=1",
            time: clock,
            frequency: "daily",
            weekdays: [],
            status: "active",
            careflow_m2: { plan_id: id, start, end },
          }))
        );
        setMessage(
          `Plano salvo com ${clean.length} ${
            clean.length === 1 ? "horário" : "horários"
          }.`
        );
        showToast("Plano de pressão salvo", "success");
      } catch (e) {
        setMessage(
          `Plano preservado (ID ${id.slice(
            0,
            8
          )}), mas não foi possível criar os lembretes. Configure-os em Lembretes de Saúde. ${
            e instanceof Error ? e.message : ""
          }`
        );
      }
      setSlots([""]);
      setPlanNote("");
      setActiveForm(null);
      if (editingPlan) {
        for (const reminder of remindersByPlan.get(editingPlan) || [])
          await healthRemindersRepository.setPaused(
            reminder.id,
            activePersonId,
            true
          );
        await append({
          kind: "monitor_note",
          parent_id: editingPlan,
          payload: {
            link: "pressure_plan_closed",
            reason: "replaced_by_new_version",
            replacement_id: id,
          },
        });
        setEditingPlan("");
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível salvar o plano."
      );
    } finally {
      setBusy(false);
    }
  };
  const beginPlanEdit = (plan: (typeof plans)[number]) => {
    setEditingPlan(plan.id);
    setStart(String(plan.payload.start || getLocalTodayISO()));
    setEnd(String(plan.payload.end || getLocalTodayISO()));
    setSlots(
      Array.isArray(plan.payload.slots) ? plan.payload.slots.map(String) : [""]
    );
    setPlanNote(String(plan.payload.note || ""));
    setActiveForm("plan");
    setMessage(
      "Edite e salve: o plano atual será encerrado somente após a nova versão ser criada."
    );
  };
  const closePlan = async (planId: string) => {
    if (!activePersonId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      for (const reminder of remindersByPlan.get(planId) || [])
        await healthRemindersRepository.setPaused(
          reminder.id,
          activePersonId,
          true
        );
      await append({
        kind: "monitor_note",
        parent_id: planId,
        payload: { link: "pressure_plan_closed", reason: "patient_confirmed" },
      });
      setSelectedPlan((value) => (value === planId ? "" : value));
      setMessage(
        "Plano encerrado. Os lembretes vinculados foram pausados e as medições foram preservadas."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar o plano."
      );
    } finally {
      setBusy(false);
    }
  };
  const contextPayloadR2 = (p: PendingContextR2) => ({
    link: "pressure_context_explicit",
    source: "patient_confirmed",
    date: p.date,
    time: p.time,
    symptom_id: p.symptomId || null,
    note: "Contexto informado pela pessoa, sem relação causal presumida.",
  });
  const saveReading = async () => {
    if (!activePersonId || !userId || busy) return;
    setBusy(true);
    setMessage("");
    const scope = { uid: userId, pid: activePersonId },
      chosenConsultation = consultationId,
      chosenSymptom = symptomId;
    const readingDate = date,
      readingTime = time,
      planId = selectedPlan,
      id = crypto.randomUUID();
    try {
      if (
        chosenConsultation &&
        !ownConsultations.some((c) => c.id === chosenConsultation)
      )
        throw new Error("Consulta não pertence à pessoa ativa.");
      if (chosenSymptom && !ownSymptoms.some((r) => r.id === chosenSymptom))
        throw new Error("Sintoma não pertence à pessoa ativa.");
      const parsed = parsePressureDraft(pressureDraft);
      const sys = parsed?.systolic ?? 0,
        dia = parsed?.diastolic ?? 0;
      if (
        !validBP(sys, dia) ||
        !isIsoDateM2(readingDate) ||
        !isClockM2(readingTime)
      )
        throw new Error("Informe pressão e data/hora reais válidas.");
      await saveHealthMeasurement(scope.pid, {
        id,
        type: "pressao_arterial",
        value: sys,
        second: dia,
        date: readingDate,
        time: readingTime,
        deviceId: null,
        source: "manual",
        notes: note.trim(),
      });
      if (!scopeStill(scope.uid, scope.pid)) return; // A medição pertence ao titular inicial; nenhum vínculo em outro perfil.
      setPressureDraft("");
      setPressureHint("");
      setNote("");
      setConsultationId("");
      setSymptomId("");
      let feedback = "Medição real salva. Não há interpretação automática.";
      if (planId) {
        try {
          await append({
            kind: "monitor_reading",
            parent_id: planId,
            related_id: id,
            payload: {
              source: "manual",
              date: readingDate,
              time: readingTime,
              systolic: sys,
              diastolic: dia,
            },
          });
          feedback += " Vínculo ao plano confirmado.";
        } catch {
          feedback +=
            " Não foi possível vincular ao plano. Não registre a medição novamente.";
        }
      }
      if (chosenConsultation || chosenSymptom) {
        const p: PendingContextR2 = {
          uid: scope.uid,
          pid: scope.pid,
          eventId: crypto.randomUUID(),
          recordId: id,
          consultationId: chosenConsultation,
          symptomId: chosenSymptom,
          date: readingDate,
          time: readingTime,
        };
        try {
          await append({
            id: p.eventId,
            kind: "monitor_note",
            parent_id: p.consultationId || null,
            related_id: p.recordId,
            payload: contextPayloadR2(p),
          });
          setPendingContext(null);
          feedback += " Consulta/sintoma vinculados por sua seleção.";
        } catch {
          setPendingContext(p);
          feedback +=
            " O vínculo contextual não foi confirmado. Use Reparar vínculo, sem repetir a medição.";
        }
      }
      if (scopeStill(scope.uid, scope.pid)) setMessage(feedback);
      if (scopeStill(scope.uid, scope.pid)) {
        setActiveForm(null);
        showToast("Medição de pressão salva", "success");
      }
    } catch (e) {
      if (scopeStill(scope.uid, scope.pid))
        setMessage(
          e instanceof Error ? e.message : "Falha ao salvar a medição."
        );
    } finally {
      if (scopeStill(scope.uid, scope.pid)) setBusy(false);
    }
  };
  const repairContext = async () => {
    const p = pendingContext;
    if (!p || busy || !scopeStill(p.uid, p.pid)) return;
    if (
      events.some(
        (e) =>
          e.id === p.eventId && e.user_id === p.uid && e.person_id === p.pid
      )
    ) {
      setPendingContext(null);
      setMessage("Vínculo já registrado, sem duplicação.");
      return;
    }
    if (
      p.consultationId &&
      !ownConsultations.some((c) => c.id === p.consultationId)
    )
      return setMessage(
        "A consulta vinculada não está disponível neste perfil."
      );
    if (p.symptomId && !ownSymptoms.some((r) => r.id === p.symptomId))
      return setMessage("O sintoma não está disponível neste perfil.");
    setBusy(true);
    try {
      await append({
        id: p.eventId,
        kind: "monitor_note",
        parent_id: p.consultationId || null,
        related_id: p.recordId,
        payload: contextPayloadR2(p),
      });
      if (scopeStill(p.uid, p.pid)) {
        setPendingContext(null);
        setMessage(
          "Vínculo contextual recuperado; medição original preservada."
        );
      }
    } catch {
      if (scopeStill(p.uid, p.pid))
        setMessage(
          "Ainda não foi possível confirmar o vínculo. A medição original continua salva; não a duplique."
        );
    } finally {
      if (scopeStill(p.uid, p.pid)) setBusy(false);
    }
  };
  const archivePdf = async () => {
    if (!activePersonId || !measurements.length || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      let y = 18;
      const write = (content: string) => {
        pdf.setFontSize(9);
        for (const line of pdf.splitTextToSize(content, 174) as string[]) {
          if (y > 278) {
            pdf.addPage();
            y = 18;
          }
          pdf.text(line, 18, y);
          y += 5;
        }
        y += 2;
      };
      pdf.setFont("helvetica", "bold");
      write("VAULT / ACOMPANHAMENTO DE PRESSAO ARTERIAL");
      pdf.setFont("helvetica", "normal");
      write("Registros pessoais declarados; nao substituem avaliacao medica.");
      for (const r of measurements)
        write(
          `${r.data} ${r.horario || ""} | ${r.valor_medicao || "sem valor"} | ${
            r.observacoes || ""
          }`
        );
      const blob = pdf.output("blob");
      const freshPerson = activePersonId;
      await pdfLibraryM2.add(freshPerson, {
        title: `Pressão arterial · ${measurements.length} medições`,
        start:
          measurements[measurements.length - 1]?.data || getLocalTodayISO(),
        end: measurements[0]?.data || getLocalTodayISO(),
        origin: "clinical_report",
        blob,
      });
      setMessage(
        "PDF arquivado SOMENTE neste dispositivo. Abra a Biblioteca para localizar e compartilhar."
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao arquivar PDF.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary vault-adaptive-tail">
        <div className="mx-auto max-w-3xl space-y-4">
          <header className="flex gap-3">
            <ClinicalBackLinkP0
              fallback="/saude/careflow"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border"
            />
            <div>
              <h1 className="text-xl font-bold">Pressão arterial</h1>
              <p className="text-xs text-ink-muted">
                Planos finitos, medições reais e histórico longitudinal.
              </p>
            </div>
          </header>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/saude/registros?foco=pressao"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold text-ink-secondary"
            >
              Linha de cuidado
            </Link>
            <button
              type="button"
              aria-expanded={showPlanForm}
              onClick={() => setActiveForm(current => current === "plan" ? null : "plan")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300/40 bg-sky-300/[.07] px-3 text-xs font-bold text-sky-200"
            >
              <CalendarClock size={16} />
              {showPlanForm ? "Recolher plano" : "Novo plano de pressão"}
            </button>
            <button
              type="button"
              aria-expanded={showReadingForm}
              onClick={() => setActiveForm(current => current === "reading" ? null : "reading")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-void"
            >
              <HeartPulse size={16} />
              {showReadingForm ? "Recolher medição" : "Registrar pressão"}
            </button>
          </div>
          {showPlanForm && (
            <section className="space-y-3 rounded-3xl border border-sky-300/20 bg-surface p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <CalendarClock size={17} className="text-sky-300" />
                Novo plano de acompanhamento
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <CustomDatePicker
                  label="Início"
                  value={start}
                  onChange={setStart}
                />
                <CustomDatePicker
                  label="Fim"
                  value={end}
                  minDate={start}
                  onChange={setEnd}
                />
              </div>
              <p className="text-[11px] text-ink-muted">
                Defina somente horários orientados para este período. Depois da
                data final, os lembretes deixam de ser agendados.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {slots.map((slot, i) => (
                  <div key={i} className="min-w-0 text-xs text-ink-muted">
                    <span>Horário {i + 1}</span>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <HealthTimePicker
                        className="min-w-0 flex-1"
                        value={slot}
                        onChange={(value) =>
                          setSlots((v) =>
                            v.map((x, j) => (i === j ? value : x))
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Remover horário ${i + 1}`}
                        disabled={slots.length === 1}
                        className="min-h-11 min-w-11 rounded-xl border border-surface-border disabled:opacity-30"
                        onClick={() =>
                          setSlots((v) => v.filter((_, j) => j !== i))
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={slots.length >= 6}
                onClick={() => setSlots((v) => [...v, ""])}
                className="flex min-h-11 items-center gap-2 text-xs text-sky-300 disabled:opacity-40"
              >
                <Plus size={15} />
                Adicionar horário
              </button>
              <label className="block text-xs text-ink-muted">
                Observação do plano
                <input
                  className={`${input} mt-1`}
                  maxLength={250}
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                  placeholder="Orientação recebida, se houver"
                />
              </label>
              <button
                type="button"
                disabled={busy || !activePersonId}
                onClick={() => void createPlan()}
                className="min-h-12 w-full rounded-xl bg-emerald-300 text-sm font-bold text-void disabled:opacity-40"
              >
                Salvar plano
              </button>
            </section>
          )}
          {plans.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold">Planos e lembretes</h2>
              {plans.map((p) => (
                <article
                  id={`careflow-plano-${p.id}`}
                  key={p.id}
                  className={`rounded-2xl border p-3 text-xs ${
                    selectedPlan === p.id
                      ? "border-sky-300 bg-sky-300/10"
                      : "border-surface-border bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPlan(selectedPlan === p.id ? "" : p.id)
                    }
                    aria-pressed={selectedPlan === p.id}
                    className="w-full text-left"
                  >
                    <span className="flex items-center justify-between gap-2 font-bold">
                      <span>
                        {String(p.payload.start).split("-").reverse().join("/")}{" "}
                        a {String(p.payload.end).split("-").reverse().join("/")}
                      </span>
                      <ChevronRight size={15} />
                    </span>
                    <span className="mt-1 block text-ink-muted">
                      {Array.isArray(p.payload.slots)
                        ? p.payload.slots.join(" · ")
                        : "Sem horários"}{" "}
                      ·{" "}
                      {refs.has(p.id)
                        ? "lembretes vinculados"
                        : "conferir lembretes"}
                    </span>
                    {p.payload.note ? (
                      <span className="mt-1 block text-ink-secondary">
                        {String(p.payload.note)}
                      </span>
                    ) : null}
                  </button>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => beginPlanEdit(p)}
                      className="min-h-11 rounded-xl border border-sky-300/25 text-sky-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void closePlan(p.id)}
                      className="min-h-11 rounded-xl border border-coral/25 text-coral disabled:opacity-40"
                    >
                      Encerrar
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
          {showReadingForm && (
            <section className="space-y-3 rounded-3xl border border-emerald-300/20 bg-surface p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <HeartPulse size={17} className="text-emerald-300" />
                Registrar pressão
              </h2>
              <label className="block text-xs text-ink-muted">
                Pressão arterial (mmHg)
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${input} mt-1`}
                  value={pressureDraft}
                  onChange={(e) => {
                    setPressureDraft(
                      e.target.value.replace(/[^\d/]/g, "").slice(0, 7)
                    );
                    setPressureHint("");
                  }}
                  onBlur={() => {
                    const parsed = parsePressureDraft(pressureDraft);
                    if (parsed) {
                      setPressureDraft(parsed.display);
                      setPressureHint(
                        parsed.abbreviated
                          ? `Interpretado como ${parsed.display} mmHg`
                          : parsed.display + " mmHg"
                      );
                    } else if (pressureDraft)
                      setPressureHint(
                        "Confira o valor. Exemplo: 120/80 ou 14/9."
                      );
                  }}
                  placeholder="Ex.: 120/80 ou 14/9"
                />
                {pressureHint && (
                  <span
                    className={`mt-1 block text-[11px] ${
                      pressureHint.startsWith("Confira")
                        ? "text-coral"
                        : "text-emerald-300"
                    }`}
                  >
                    {pressureHint}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <CustomDatePicker
                  className="min-w-0 [&>label]:mb-1.5 [&>label]:text-xs [&>label]:font-normal [&>label]:text-ink-muted [&_input]:h-12 [&_input]:py-0"
                  label="Data da medição"
                  value={date}
                  onChange={setDate}
                  maxDate={getLocalTodayISO()}
                />
                <div className="min-w-0 text-xs text-ink-muted">
                  <span className="mb-1.5 block">Horário</span>
                  <HealthTimePicker
                    className="mt-1 h-12"
                    value={time}
                    onChange={setTime}
                    clearable={false}
                  />
                </div>
              </div>
              <label className="block text-xs text-ink-muted">
                Observação (opcional)
                <input
                  className={`${input} mt-1`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contexto declarado, não diagnóstico"
                />
              </label>
              <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                <div className="min-w-0 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope size={15} className="text-sky-300" />
                    Consulta relacionada (opcional)
                  </span>
                  <HealthRelationPicker
                    kind="consultation"
                    title="Vincular esta medição a uma consulta"
                    value={consultationId}
                    onValueChange={setConsultationId}
                    className={`${input} mt-1`}
                  >
                    <option value="">Nenhuma consulta</option>
                    {ownConsultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.data?.split("-").reverse().join("/")} ·{" "}
                        {c.especialidade || c.medico || "Consulta"}
                      </option>
                    ))}
                  </HealthRelationPicker>
                </div>
                <div className="min-w-0 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <MessageSquareHeart
                      size={15}
                      className="text-rose-300"
                    />
                    Sintoma observado (opcional)
                  </span>
                  <HealthRelationPicker
                    kind="symptom"
                    title="Relacionar um sintoma já registrado"
                    value={symptomId}
                    onValueChange={setSymptomId}
                    className={`${input} mt-1`}
                  >
                    <option value="">Nenhum sintoma</option>
                    {ownSymptoms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.data?.split("-").reverse().join("/")} · {r.nome}
                      </option>
                    ))}
                  </HealthRelationPicker>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted">
                Os vínculos registram contexto informado, sem presumir causa ou
                diagnóstico.
              </p>
              <p className="text-[11px] text-ink-muted">
                {selectedPlan
                  ? "Esta medição será vinculada ao plano selecionado."
                  : "Sem plano selecionado — registro será salvo na Linha de Saúde."}
              </p>
              <button
                type="button"
                disabled={busy || !activePersonId}
                onClick={() => void saveReading()}
                className="min-h-12 w-full rounded-xl bg-emerald-300 text-sm font-bold text-void disabled:opacity-40"
              >
                Salvar medição
              </button>
              {pendingContext &&
                scopeStill(pendingContext.uid, pendingContext.pid) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void repairContext()}
                    className="min-h-11 w-full rounded-xl border border-amber-300/35 bg-amber-300/[.05] px-3 text-xs font-semibold text-amber-200"
                  >
                    Reparar vínculo pendente, sem criar outra medição
                  </button>
                )}
            </section>
          )}
          {trend.length >= 2 && (
            <section className="rounded-3xl border border-surface-border bg-surface p-3">
              <h2 className="text-sm font-bold">
                Tendência registrada · {trend.length} medições
              </h2>
              <p className="mt-1 text-[10px] text-ink-muted">
                Linhas de valores informados por você, em ordem cronológica. Sem
                limite clínico automático.
              </p>
              <svg
                viewBox="0 0 320 150"
                role="img"
                aria-label="Gráfico de evolução de pressão sistólica e diastólica registradas"
                className="mt-2 w-full"
              >
                <line
                  x1="20"
                  y1="125"
                  x2="305"
                  y2="125"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                />
                <text x="1" y="18" fontSize="9" fill="currentColor">
                  {chart.top}
                </text>
                <text x="1" y="127" fontSize="9" fill="currentColor">
                  {chart.bottom}
                </text>
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chart.systolic}
                />
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chart.diastolic}
                />
              </svg>
              <p className="flex gap-4 text-[10px] text-ink-muted">
                <span className="text-sky-300">● Sistólica</span>
                <span className="text-emerald-300">● Diastólica</span>
              </p>
            </section>
          )}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Activity size={16} className="text-emerald-300" />
                Histórico de medições ({measurements.length})
              </h2>
              <button
                onClick={() => void archivePdf()}
                disabled={busy || !measurements.length}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300/30 px-3 text-xs text-emerald-300 disabled:opacity-40"
              >
                <FileText size={15} />
                Arquivar PDF local
              </button>
            </div>
            {!measurements.length && (
              <p className="text-xs text-ink-muted">
                Nenhuma medição de pressão registrada para esta pessoa.
              </p>
            )}
            {measurements.slice(0, 150).map((r) => {
              const context = r.id ? contexts.get(r.id) : undefined;
              const consultation = context?.parent_id
                ? ownConsultations.find((c) => c.id === context.parent_id)
                : undefined;
              const symptom = context?.payload.symptom_id
                ? ownSymptoms.find((s) => s.id === context.payload.symptom_id)
                : undefined;
              return (
                <article
                  id={r.id ? `careflow-pressao-${r.id}` : undefined}
                  className="scroll-mt-24 target:ring-2 target:ring-emerald-300/40 rounded-xl border border-surface-border/60 bg-surface p-3"
                  key={r.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-muted">
                      {r.data?.split("-").reverse().join("/")} ·{" "}
                      {r.horario || "Horário não informado"}
                    </span>
                    <strong className="text-sm text-ink-primary">
                      {r.valor_medicao || "Sem valor"}
                    </strong>
                  </div>
                  {(consultation || symptom) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {consultation && (
                        <Link
                          href={withReturnTarget(
                            `/saude/careflow/episodios?consulta=${encodeURIComponent(
                              consultation.id!
                            )}`,
                            `/saude/careflow/pressao#careflow-pressao-${encodeURIComponent(
                              r.id || ""
                            )}`
                          )}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-sky-300/20 px-2 text-[11px] text-sky-200"
                        >
                          <Stethoscope size={13} />
                          Consulta:{" "}
                          {consultation.especialidade || "Atendimento"}
                        </Link>
                      )}
                      {symptom && (
                        <Link
                          href={withReturnTarget(
                            `/saude/careflow/sintomas#careflow-sintoma-${encodeURIComponent(
                              symptom.id!
                            )}`,
                            `/saude/careflow/pressao#careflow-pressao-${encodeURIComponent(
                              r.id || ""
                            )}`
                          )}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300/20 px-2 text-[11px] text-rose-200"
                        >
                          <MessageSquareHeart size={13} />
                          {symptom.nome}
                        </Link>
                      )}
                    </div>
                  )}
                  {r.id && (
                    <Link
                      href={withReturnTarget(
                        `/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(
                          r.id
                        )}`,
                        `/saude/careflow/pressao#careflow-pressao-${encodeURIComponent(
                          r.id
                        )}`
                      )}
                      className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-emerald-200"
                    >
                      Abrir medição original <ChevronRight size={14} />
                    </Link>
                  )}
                </article>
              );
            })}
            {measurements.length > 150 && (
              <p className="text-xs text-ink-muted">
                Mostrando as 150 mais recentes. O relatório inclui todo o
                histórico carregado.
              </p>
            )}
          </section>
          <p className="text-[11px] leading-relaxed text-ink-muted">
            As medições são autorrelatadas e não interpretadas como diagnóstico.
            Se houver sintomas importantes ou valores preocupantes, siga a
            orientação do seu profissional de saúde.{" "}
            <span className="block pt-2">
              <Link
                href="/saude/careflow/sintomas"
                className="text-rose-200 underline"
              >
                Ver sintomas registrados separadamente
              </Link>{" "}
              — um sintoma não comprova causa de pressão.
            </span>
          </p>
          {message && (
            <p
              role="status"
              className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-xs text-amber-200"
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
