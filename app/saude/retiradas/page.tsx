// app/saude/retiradas/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Pill,
  Plus,
  Search,
  XCircle,
} from "lucide-react";

import {
  useRetiradas,
} from "@/hooks/useRetiradas";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  EmptyState,
} from "@/components/EmptyState";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import type {
  Retirada,
  RetiradaStatus,
} from "@/lib/types";

type StatusFilter =
  | "todos"
  | RetiradaStatus;

function formatDate(
  value: string
): string {
  const [
    year,
    month,
    day,
  ] =
    value
      .slice(0, 10)
      .split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function statusMeta(
  status: RetiradaStatus
) {
  switch (status) {
    case "realizada":
      return {
        label:
          "Realizada",
        className:
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
      };

    case "cancelada":
      return {
        label:
          "Cancelada",
        className:
          "border-ink-muted/25 bg-surface-raised text-ink-muted",
      };

    case "nao_realizada":
      return {
        label:
          "Não realizada",
        className:
          "border-coral/25 bg-coral/10 text-coral",
      };

    default:
      return {
        label:
          "Agendada",
        className:
          "border-ice/25 bg-ice/10 text-ice",
      };
  }
}

export default function RetiradasPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    retiradas,
  } =
    useRetiradas();

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      "todos"
    );

  const hoje =
    getLocalTodayISO();

  const filtered =
    useMemo(
      () => {
        const normalized =
          search
            .trim()
            .toLocaleLowerCase(
              "pt-BR"
            );

        return [
          ...retiradas,
        ]
          .filter(
            (
              retirada
            ) =>
              status ===
                "todos" ||
              retirada.status ===
                status
          )
          .filter(
            (
              retirada
            ) => {
              if (
                !normalized
              ) {
                return true;
              }

              return [
                retirada.medicamento_nome,
                retirada.medicamento_dosagem,
                retirada.observacoes,
                retirada.data,
              ].some(
                (
                  value
                ) =>
                  String(
                    value ||
                    ""
                  )
                    .toLocaleLowerCase(
                      "pt-BR"
                    )
                    .includes(
                      normalized
                    )
              );
            }
          )
          .sort(
            (
              a,
              b
            ) => {
              if (
                a.status ===
                  "agendada" &&
                b.status !==
                  "agendada"
              ) {
                return -1;
              }

              if (
                b.status ===
                  "agendada" &&
                a.status !==
                  "agendada"
              ) {
                return 1;
              }

              const byDate =
                a.data.localeCompare(
                  b.data
                );

              if (
                byDate !==
                0
              ) {
                return byDate;
              }

              return String(
                a.horario ||
                  "23:59"
              ).localeCompare(
                String(
                  b.horario ||
                    "23:59"
                )
              );
            }
          );
      },
      [
        retiradas,
        search,
        status,
      ]
    );

  const counts =
    useMemo(
      () => ({
        total:
          retiradas.length,

        hoje:
          retiradas.filter(
            (
              retirada
            ) =>
              retirada.data ===
                hoje &&
              retirada.status ===
                "agendada"
          ).length,

        agendadas:
          retiradas.filter(
            (
              retirada
            ) =>
              retirada.status ===
                "agendada"
          ).length,

        realizadas:
          retiradas.filter(
            (
              retirada
            ) =>
              retirada.status ===
                "realizada"
          ).length,
      }),
      [
        retiradas,
        hoje,
      ]
    );

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ice">
                Agenda de medicamentos
              </p>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Retiradas
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/saude/retiradas/nova"
                );
              }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice text-void shadow-sm transition-all active:scale-95"
              aria-label="Nova retirada"
            >
              <Plus
                size={19}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              [
                "Total",
                counts.total,
              ],
              [
                "Hoje",
                counts.hoje,
              ],
              [
                "Agend.",
                counts.agendadas,
              ],
              [
                "Feitas",
                counts.realizadas,
              ],
            ].map(
              (
                [
                  label,
                  value,
                ]
              ) => (
                <div
                  key={
                    label
                  }
                  className="rounded-2xl border border-surface-border/40 bg-surface-raised px-2 py-2.5 text-center"
                >
                  <p className="font-mono text-base font-bold text-ink-primary">
                    {
                      value
                    }
                  </p>

                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-ink-muted">
                    {
                      label
                    }
                  </p>
                </div>
              )
            )}
          </div>

          <div className="relative mt-3">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar medicamento ou observação..."
              className="w-full rounded-2xl border border-surface-border bg-surface py-3 pl-10 pr-4 text-sm text-ink-primary outline-none focus:border-ice/50"
            />
          </div>

          <div className="mt-3 -mx-1 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex min-w-max gap-2 px-1">
              {[
                [
                  "todos",
                  "Todos",
                ],
                [
                  "agendada",
                  "Agendadas",
                ],
                [
                  "realizada",
                  "Realizadas",
                ],
                [
                  "nao_realizada",
                  "Não realizadas",
                ],
                [
                  "cancelada",
                  "Canceladas",
                ],
              ].map(
                (
                  [
                    key,
                    label,
                  ]
                ) => (
                  <button
                    key={
                      key
                    }
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setStatus(
                        key as StatusFilter
                      );
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${
                      status ===
                      key
                        ? "border-ice bg-ice/15 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                  >
                    {
                      label
                    }
                  </button>
                )
              )}
            </div>
          </div>
        </header>

        <section className="space-y-2.5 px-5 pt-4">
          {filtered.length ===
          0 ? (
            <EmptyState
              icon={
                Pill
              }
              title="Nenhuma retirada encontrada"
              description={
                retiradas.length ===
                0
                  ? "Cadastre uma retirada para transformar a próxima obtenção do medicamento em um compromisso real."
                  : "Tente alterar a busca ou os filtros."
              }
              actionLabel={
                retiradas.length ===
                0
                  ? "Nova retirada"
                  : undefined
              }
              onAction={
                retiradas.length ===
                0
                  ? () =>
                      router.push(
                        "/saude/retiradas/nova"
                      )
                  : undefined
              }
            />
          ) : (
            filtered.map(
              (
                retirada:
                  Retirada
              ) => {
                const meta =
                  statusMeta(
                    retirada.status
                  );

                const isToday =
                  retirada.data ===
                  hoje;

                return (
                  <button
                    type="button"
                    key={
                      retirada.id
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/retiradas/detalhes?id=${retirada.id}`
                      );
                    }}
                    className="w-full rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <Pill
                          size={19}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-bold text-ink-primary">
                            {
                              retirada.medicamento_nome ||
                              "Medicamento"
                            }
                          </h2>

                          {isToday && (
                            <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-coral">
                              Hoje
                            </span>
                          )}
                        </div>

                        {retirada.medicamento_dosagem && (
                          <p className="mt-0.5 text-[10px] text-ink-muted">
                            {
                              retirada.medicamento_dosagem
                            }
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted">
                            <Calendar
                              size={11}
                              className="text-ice"
                            />

                            {
                              formatDate(
                                retirada.data
                              )
                            }
                          </span>

                          {retirada.horario && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted">
                              <Clock
                                size={11}
                              />

                              {
                                retirada.horario
                              }
                            </span>
                          )}

                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${meta.className}`}>
                            {
                              meta.label
                            }
                          </span>
                        </div>
                      </div>

                      {retirada.status ===
                      "realizada" ? (
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-emerald-400"
                        />
                      ) : retirada.status ===
                        "nao_realizada" ? (
                        <XCircle
                          size={16}
                          className="shrink-0 text-coral"
                        />
                      ) : (
                        <Clock
                          size={16}
                          className="shrink-0 text-ice"
                        />
                      )}
                    </div>
                  </button>
                );
              }
            )
          )}
        </section>
      </main>
    </PageTransition>
  );
}
