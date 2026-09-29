"use client";
// VAULT_CLINICAL_TIMELINE_V67
// Camada de leitura: não duplica nem persiste eventos clínicos.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Filter,
  History,
  Search,
} from "lucide-react";

import { PageTransition } from "@/components/PageTransition";
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
import type {
  ClinicalTimelineEvent,
  ClinicalTimelineEventType,
} from "@/lib/health-intelligence/clinical-timeline-v4";

const TYPE_LABEL: Record<ClinicalTimelineEventType, string> = {
  dose: "Dose",
  health_record: "Registro",
  appointment: "Consulta",
  exam: "Exame",
  pickup: "Retirada",
  renewal: "Receita / renovação",
  treatment: "Tratamento",
};

const FILTERS: Array<{ value: "all" | ClinicalTimelineEventType; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "appointment", label: "Consultas" },
  { value: "exam", label: "Exames" },
  { value: "treatment", label: "Tratamentos" },
  { value: "renewal", label: "Receitas" },
  { value: "pickup", label: "Retiradas" },
  { value: "health_record", label: "Registros" },
  { value: "dose", label: "Doses" },
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function routeFor(event: ClinicalTimelineEvent): string | null {
  if (!event.entityId) return null;
  const id = encodeURIComponent(event.entityId);
  switch (event.entityType) {
    case "consulta": return `/saude/consultas/detalhes?id=${id}`;
    case "exame": return `/saude/exames/detalhes?id=${id}`;
    case "retirada": return `/saude/retiradas/detalhes?id=${id}`;
    case "renovacao": return `/saude/renovacao/detalhes?id=${id}`;
    case "tratamento": return `/saude/tratamentos/detalhes?id=${id}`;
    case "registro": return `/saude/registros/detalhes?id=${id}`;
    case "medicamento": return `/saude/medicamentos/detalhes?id=${id}`;
    default: return null;
  }
}

export default function ClinicalTimelinePage() {
  const router = useRouter();
  const health = useHealthIntelligence();
  const [type, setType] = useState<"all" | ClinicalTimelineEventType>("all");
  const [period, setPeriod] = useState<30 | 90 | 3650>(90);
  const [query, setQuery] = useState("");

  const events = useMemo(() => {
    const timeline = health.brainV4?.timeline ?? [];
    const now = Date.now();
    const cutoff = now - period * 86_400_000;
    const needle = query.trim().toLocaleLowerCase("pt-BR");

    return [...timeline]
      .reverse()
      .filter((event) => type === "all" || event.type === type)
      .filter((event) => {
        if (period === 3650) return true;
        const time = new Date(`${event.date}T12:00:00`).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .filter((event) => {
        if (!needle) return true;
        return `${event.label} ${TYPE_LABEL[event.type]} ${event.source}`
          .toLocaleLowerCase("pt-BR")
          .includes(needle);
      });
  }, [health.brainV4?.timeline, period, query, type]);

  const groups = useMemo(() => {
    const map = new Map<string, ClinicalTimelineEvent[]>();
    for (const event of events) {
      const current = map.get(event.date) ?? [];
      current.push(event);
      map.set(event.date, current);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-4 pb-32 pt-6 text-ink-primary">
        <header className="mx-auto flex max-w-2xl items-start gap-3">
          <button
            type="button"
            onClick={() => router.replace("/inteligencia/saude")}
            className="rounded-2xl border border-surface-border bg-surface p-3 text-ink-muted"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ice">
              HISTÓRICO CLÍNICO
            </p>
            <h1 className="text-2xl font-bold">Linha do tempo</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Uma leitura cronológica dos dados já registrados no Vault. Nenhum evento novo é criado aqui.
            </p>
          </div>
        </header>

        <section className="mx-auto mt-5 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no histórico"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
              aria-label="Buscar na linha do tempo"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {([30, 90, 3650] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] ${
                  period === value
                    ? "border-ice/30 bg-ice/10 text-ice"
                    : "border-surface-border text-ink-muted"
                }`}
              >
                {value === 3650 ? "Todo histórico" : `${value} dias`}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <Filter size={14} className="shrink-0 text-ink-faint" />
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setType(filter.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] ${
                  type === filter.value
                    ? "bg-surface-raised text-ink-primary"
                    : "text-ink-muted"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-5 max-w-2xl">
          {health.isLoading ? (
            <div className="rounded-[26px] border border-surface-border bg-surface p-6 text-sm text-ink-muted">
              Organizando seu histórico…
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-surface-border p-8 text-center">
              <History className="mx-auto text-ink-faint" />
              <p className="mt-3 text-sm font-semibold">Nenhum evento neste recorte</p>
              <p className="mt-1 text-xs text-ink-muted">Mude o período, filtro ou busca para ampliar a linha do tempo.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([date, dayEvents]) => (
                <div key={date}>
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays size={14} className="text-ice" />
                    <h2 className="text-xs font-semibold capitalize text-ink-muted">{formatDate(date)}</h2>
                  </div>
                  <div className="space-y-2 border-l border-surface-border/70 pl-3">
                    {dayEvents.map((event) => {
                      const href = routeFor(event);
                      const content = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{event.label}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-faint">
                                {TYPE_LABEL[event.type]}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-ink-faint">
                              {event.occurredAt.slice(11, 16) === "12:00" ? "" : event.occurredAt.slice(11, 16)}
                            </span>
                          </div>
                        </>
                      );

                      return href ? (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => router.push(href)}
                          className="relative w-full rounded-2xl border border-surface-border bg-surface p-4 text-left active:scale-[0.99]"
                        >
                          <span className="absolute -left-[17px] top-5 h-2 w-2 rounded-full bg-ice" />
                          {content}
                        </button>
                      ) : (
                        <div key={event.id} className="relative rounded-2xl border border-surface-border bg-surface p-4">
                          <span className="absolute -left-[17px] top-5 h-2 w-2 rounded-full bg-ice/60" />
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto mt-6 max-w-2xl rounded-2xl border border-surface-border bg-surface/60 p-4 text-[10px] leading-relaxed text-ink-muted">
          A linha do tempo reúne registros existentes para facilitar leitura e contexto. Relações próximas no tempo não significam causa e não substituem avaliação profissional.
        </section>
      </main>
    </PageTransition>
  );
}
