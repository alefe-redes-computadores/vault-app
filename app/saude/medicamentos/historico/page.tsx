// app/saude/medicamentos/historico/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Pill,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  db,
} from "@/lib/db";
import {
  getLocalTodayISO,
} from "@/lib/health-utils";
import {
  buildMedicationDoseHistoryMonth,
  currentMonthKey,
  shiftMonthKey,
  type DoseHistoryDay,
} from "@/lib/medication-dose-history";
import {
  useHapticFeedback,
} from "@/lib/haptics";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function actualTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DayCell({
  day,
  selected,
  today,
  onSelect,
}: {
  day: DoseHistoryDay;
  selected: boolean;
  today: string;
  onSelect: () => void;
}) {
  const hasTaken = day.takenScheduled > 0;
  const hasIgnored = day.ignoredScheduled > 0;
  const hasMissing = day.unconfirmed > 0;
  const hasAvulsa = day.avulsas > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={"relative min-h-[58px] rounded-2xl border p-1.5 text-left transition-all active:scale-95 " +
        (selected
          ? "border-ice bg-ice/15"
          : day.inMonth
            ? "border-surface-border/50 bg-surface-raised/60"
            : "border-transparent bg-transparent opacity-30")}
      aria-label={formatDate(day.date)}
    >
      <span className={"text-[10px] font-bold " +
        (day.date === today ? "text-ice" : "text-ink-primary")}
      >
        {day.dayNumber}
      </span>

      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
        {hasTaken && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        {hasIgnored && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        {hasMissing && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
        {hasAvulsa && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
      </div>
    </button>
  );
}

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activePersonId } = useActivePersonId();
  const { trigger } = useHapticFeedback();
  const medicationId = searchParams.get("id") || "";
  const today = getLocalTodayISO();
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [selectedDate, setSelectedDate] = useState(today);

  const medication = useLiveQuery(
    async () => {
      if (!medicationId || !activePersonId) return null;
      const row = await db.medicamentos.get(medicationId);
      return row?.person_id === activePersonId ? row : null;
    },
    [medicationId, activePersonId]
  );

  const logs = useLiveQuery(
    async () => {
      if (!medicationId || !activePersonId) return [];
      const rows = await db.doseLogs
        .where("medicamento_id")
        .equals(medicationId)
        .toArray();
      return rows.filter((row) => row.person_id === activePersonId);
    },
    [medicationId, activePersonId]
  );

  const model = useMemo(
    () => medication
      ? buildMedicationDoseHistoryMonth({
          medication,
          logs: logs || [],
          monthKey,
          today,
        })
      : null,
    [medication, logs, monthKey, today]
  );

  useEffect(() => {
    if (!model) return;
    const selectedStillVisible = model.days.some((day) =>
      day.inMonth && day.date === selectedDate
    );
    if (!selectedStillVisible) {
      const firstInMonth = model.days.find((day) => day.inMonth);
      if (firstInMonth) setSelectedDate(firstInMonth.date);
    }
  }, [model, selectedDate]);

  if (medication === undefined || logs === undefined) {
    return <DetailSkeleton />;
  }

  if (!activePersonId || !medication || !model) {
    return (
      <main className="min-h-screen bg-void px-5 py-12 text-center">
        <AlertCircle size={30} className="mx-auto text-coral" />
        <h1 className="mt-4 text-lg font-bold text-ink-primary">
          Histórico indisponível
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          O medicamento não foi encontrado para a pessoa ativa.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/saude/medicamentos")}
          className="mt-5 rounded-2xl bg-ice px-4 py-3 text-sm font-bold text-void"
        >
          Voltar aos medicamentos
        </button>
      </main>
    );
  }

  const selectedDay =
    model.days.find((day) => day.date === selectedDate) || model.days[0];
  const canGoNext = monthKey < currentMonthKey();
  const unit = medication.forma_farmaceutica === "gota" ||
    String(medication.formato || "").toLocaleLowerCase("pt-BR").includes("gota")
      ? "gotas"
      : medication.estoque_unidade_medida || "unidades";

  const navigateMonth = (delta: number) => {
    trigger("vibrate");
    setMonthKey((current) => shiftMonthKey(current, delta));
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => router.replace("/saude/medicamentos/detalhes?id=" + medicationId)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted active:scale-95"
              aria-label="Voltar aos detalhes do medicamento"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ice">
                Histórico de doses
              </p>
              <h1 className="mt-1 truncate font-display text-lg font-bold text-ink-primary">
                {medication.nome}
              </h1>
              {medication.dosagem && (
                <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                  {medication.dosagem}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-4 px-4 pt-4">
          <section className="overflow-hidden rounded-[28px] border border-surface-border/60 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-ink-muted active:scale-95"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold capitalize text-ink-primary">
                  {model.monthLabel}
                </p>
                <p className="mt-0.5 text-[9px] text-ink-faint">
                  Baseado somente em registros salvos
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                disabled={!canGoNext}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-ink-muted active:scale-95 disabled:opacity-25"
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day, index) => (
                <div key={day + index} className="pb-1 text-center font-mono text-[8px] font-bold text-ink-faint">
                  {day}
                </div>
              ))}
              {model.days.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  selected={day.date === selectedDate}
                  today={today}
                  onSelect={() => {
                    trigger("vibrate");
                    setSelectedDate(day.date);
                  }}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-surface-border/50 pt-3 text-[9px] text-ink-muted">
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Tomada</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber-400" />Ignorada</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-coral" />Sem confirmação</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" />SOS / avulsa</span>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/5 p-3">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <p className="mt-2 font-mono text-lg font-bold text-emerald-400">{model.summary.taken}</p>
              <p className="text-[9px] text-ink-muted">tomadas programadas</p>
            </div>
            <div className="rounded-[20px] border border-coral/20 bg-coral/5 p-3">
              <Clock3 size={14} className="text-coral" />
              <p className="mt-2 font-mono text-lg font-bold text-coral">{model.summary.unconfirmed}</p>
              <p className="text-[9px] text-ink-muted">sem confirmação</p>
            </div>
            <div className="rounded-[20px] border border-ice/20 bg-ice/5 p-3">
              <CalendarDays size={14} className="text-ice" />
              <p className="mt-2 font-mono text-lg font-bold text-ice">
                {model.summary.adherencePercent === null ? "—" : model.summary.adherencePercent + "%"}
              </p>
              <p className="text-[9px] text-ink-muted">registros da rotina</p>
            </div>
            <div className="rounded-[20px] border border-violet-400/20 bg-violet-400/5 p-3">
              <Zap size={14} className="text-violet-400" />
              <p className="mt-2 font-mono text-lg font-bold text-violet-300">{model.summary.avulsas}</p>
              <p className="text-[9px] text-ink-muted">SOS / avulsas</p>
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-2xl border border-ice/15 bg-ice/5 p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-ice" />
            <p className="text-[9px] leading-relaxed text-ink-muted">
              “Sem confirmação” significa apenas que o Vault não encontrou um registro para o horário previsto. Isso não prova que a dose não foi tomada.
            </p>
          </div>

          <section className="rounded-[26px] border border-surface-border/60 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ice">Dia selecionado</p>
                <h2 className="mt-1 text-sm font-bold capitalize text-ink-primary">{formatDate(selectedDay.date)}</h2>
              </div>
              {selectedDay.date <= today && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      "/hoje?data=" + selectedDay.date + "&retro=1&medicamento=" + medicationId
                    );
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2 text-[9px] font-bold text-ice active:scale-95"
                >
                  <RotateCcw size={12} />
                  Revisar
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {selectedDay.expectedSlots.map((slot) => {
                const event = selectedDay.events.find((item) =>
                  item.horario === slot && item.kind !== "avulsa"
                );
                const takenTime = actualTime(event?.tomadoEm);
                return (
                  <div key={slot} className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                    <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " +
                      (event?.kind === "scheduled_taken"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : event?.kind === "scheduled_ignored"
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-coral/10 text-coral")}
                    >
                      {event?.kind === "scheduled_taken" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-ink-primary">{slot}</p>
                      <p className="mt-0.5 text-[9px] text-ink-muted">
                        {event?.kind === "scheduled_taken"
                          ? takenTime && takenTime !== slot
                            ? "Tomada registrada às " + takenTime
                            : "Tomada registrada"
                          : event?.kind === "scheduled_ignored"
                            ? "Marcada como ignorada"
                            : "Sem registro"}
                      </p>
                    </div>
                    {event?.quantidade !== undefined && (
                      <span className="text-[9px] font-semibold text-ink-muted">
                        {formatQuantity(event.quantidade)} {unit}
                      </span>
                    )}
                  </div>
                );
              })}

              {selectedDay.events
                .filter((event) =>
                  event.kind === "avulsa" ||
                  !selectedDay.expectedSlots.includes(event.horario)
                )
                .map((event, index) => (
                  <div key={event.id || event.horario + index} className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                      <Zap size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-ink-primary">{event.horario}</p>
                      <p className="mt-0.5 text-[9px] text-ink-muted">
                        {event.kind === "avulsa"
                          ? "Dose SOS / avulsa registrada"
                          : "Registro real fora da rotina reconstruída"}
                      </p>
                    </div>
                    {event.quantidade !== undefined && (
                      <span className="text-[9px] font-semibold text-violet-300">
                        {formatQuantity(event.quantidade)} {unit}
                      </span>
                    )}
                  </div>
                ))}

              {selectedDay.expectedSlots.length === 0 && selectedDay.events.length === 0 && (
                <div className="py-6 text-center">
                  <Pill size={22} className="mx-auto text-ink-faint" />
                  <p className="mt-2 text-xs font-semibold text-ink-muted">Nenhuma dose registrada neste dia</p>
                  <p className="mt-1 text-[9px] text-ink-faint">
                    {medication.tipo_uso === "sos"
                      ? "Medicamentos SOS não possuem rotina diária presumida."
                      : selectedDay.future
                        ? "Este dia ainda não chegou."
                        : "Não havia rotina conhecida para reconstruir."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {model.summary.knownQuantity > 0 && (
            <section className="rounded-[22px] border border-surface-border/50 bg-surface p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">Quantidade registrada no mês</p>
              <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                {formatQuantity(model.summary.knownQuantity)} {unit}
              </p>
              {model.summary.logsWithoutQuantity > 0 && (
                <p className="mt-1 text-[9px] text-amber-400">
                  Soma parcial: {model.summary.logsWithoutQuantity} registro(s) não possuem quantidade.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}

export default function MedicationDoseHistoryPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <HistoryContent />
    </Suspense>
  );
}
