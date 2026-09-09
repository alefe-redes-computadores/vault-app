// app/saude/retiradas/detalhes/page.tsx
"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  MapPin,
  Pill,
  Store,
  Stethoscope,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  useRetiradas,
} from "@/hooks/useRetiradas";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useToast,
} from "@/components/ToastProvider";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

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

  return year &&
    month &&
    day
    ? `${day}/${month}/${year}`
    : value;
}

function DetalhesRetiradaContent() {
  const router =
    useRouter();

  const params =
    useSearchParams();

  const id =
    params.get(
      "id"
    );

  const {
    retiradas,
    updateRetirada,
    deleteRetirada,
  } =
    useRetiradas();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    farmacias = [],
  } =
    useFarmacias();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  const {
    showToast,
  } =
    useToast();

  const {
    trigger,
  } =
    useHapticFeedback();

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    showDelete,
    setShowDelete,
  ] =
    useState(false);

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    showReschedule,
    setShowReschedule,
  ] =
    useState(false);

  const [
    rescheduleDate,
    setRescheduleDate,
  ] =
    useState("");

  const [
    rescheduleTime,
    setRescheduleTime,
  ] =
    useState("");

  const [
    rescheduleReason,
    setRescheduleReason,
  ] =
    useState("");

  const retirada =
    useMemo(
      () =>
        retiradas.find(
          (
            item
          ) =>
            item.id ===
            id
        ),
      [
        retiradas,
        id,
      ]
    );

  if (
    !retirada
  ) {
    return (
      <main className="min-h-screen bg-void px-5 pt-20 text-center">
        <p className="text-sm font-semibold text-ink-primary">
          Retirada não encontrada.
        </p>

        <button
          type="button"
          onClick={() =>
            router.replace(
              "/saude/retiradas"
            )
          }
          className="mt-4 text-sm font-semibold text-ice"
        >
          Voltar às retiradas
        </button>
      </main>
    );
  }

  const medico =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        retirada.medico_id
    );

  const farmacia =
    farmacias.find(
      (
        item
      ) =>
        item.id ===
        retirada.farmacia_id
    );

  const hospital =
    hospitais.find(
      (
        item
      ) =>
        item.id ===
        retirada.hospital_id
    );

  const local =
    locais.find(
      (
        item
      ) =>
        item.id ===
        retirada.local_id
    );

  const openReschedule =
    () => {
      setRescheduleDate(
        retirada.data
      );

      setRescheduleTime(
        retirada.horario ||
        ""
      );

      setRescheduleReason(
        ""
      );

      setShowReschedule(
        true
      );
    };

  const handleReschedule =
    async () => {
      if (
        processing ||
        !rescheduleDate
      ) {
        return;
      }

      setProcessing(
        true
      );

      try {
        const timestamp =
          new Date()
            .toISOString();

        const history = [
          ...(
            retirada.reagendamentos ||
            []
          ),

          {
            data_anterior:
              retirada.data,

            horario_anterior:
              retirada.horario ||
              null,

            nova_data:
              rescheduleDate,

            novo_horario:
              rescheduleTime ||
              null,

            motivo:
              rescheduleReason.trim() ||
              null,

            reagendada_em:
              timestamp,
          },
        ];

        await updateRetirada(
          retirada.id!,
          {
            data:
              rescheduleDate,

            horario:
              rescheduleTime ||
              null,

            status:
              "agendada",

            reagendamentos:
              history,
          }
        );

        trigger(
          "success"
        );

        showToast(
          "Retirada reagendada",
          "success"
        );

        setShowReschedule(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "[DetalhesRetirada reschedule]",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao reagendar retirada",
          "error"
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  const updateStatus =
    async (
      status:
        "realizada" |
        "cancelada" |
        "nao_realizada"
    ) => {
      if (
        processing
      ) {
        return;
      }

      setProcessing(
        true
      );

      try {
        await updateRetirada(
          retirada.id!,
          {
            status,

            realizada_em:
              status ===
              "realizada"
                ? new Date()
                    .toISOString()
                : null,
          }
        );

        trigger(
          status ===
          "realizada"
            ? "success"
            : "vibrate"
        );

        showToast(
          status ===
          "realizada"
            ? "Retirada marcada como realizada"
            : status ===
                "cancelada"
              ? "Retirada cancelada"
              : "Retirada marcada como não realizada",
          status ===
          "realizada"
            ? "success"
            : "info"
        );
      } catch (
        error
      ) {
        console.error(
          "[DetalhesRetirada]",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao atualizar retirada",
          "error"
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  const handleDelete =
    async () => {
      if (
        deleting
      ) {
        return;
      }

      setDeleting(
        true
      );

      try {
        await deleteRetirada(
          retirada.id!
        );

        trigger(
          "success"
        );

        showToast(
          "Retirada excluída",
          "success"
        );

        router.replace(
          "/saude/retiradas"
        );
      } catch (
        error
      ) {
        console.error(
          "[DetalhesRetirada delete]",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao excluir retirada",
          "error"
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  const info = [
    medico
      ? {
          icon:
            Stethoscope,
          label:
            "Médico",
          value:
            medico.nome,
        }
      : null,

    farmacia
      ? {
          icon:
            Store,
          label:
            "Farmácia",
          value:
            farmacia.nome,
        }
      : null,

    hospital
      ? {
          icon:
            Building2,
          label:
            "Hospital",
          value:
            hospital.nome,
        }
      : null,

    local
      ? {
          icon:
            MapPin,
          label:
            "Local",
          value:
            local.nome,
        }
      : null,
  ].filter(
    Boolean
  ) as Array<{
    icon: typeof Store;
    label: string;
    value: string;
  }>;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                router.replace(
                  "/saude/retiradas"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-ink-primary"
            >
              <ArrowLeft
                size={17}
              />
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/saude/retiradas/editar?id=${retirada.id}`
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-ice/25 bg-ice/10 text-ice"
              >
                <Edit3
                  size={16}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    true
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-coral/25 bg-coral/10 text-coral"
              >
                <Trash2
                  size={16}
                />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          <div className="rounded-[28px] border border-ice/20 bg-gradient-to-br from-ice/10 via-surface to-surface p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Pill
                  size={21}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ice">
                  Retirada de medicamento
                </p>

                <h1 className="mt-1 truncate font-display text-xl font-bold text-ink-primary">
                  {
                    retirada.medicamento_nome ||
                    "Medicamento"
                  }
                </h1>

                {retirada.medicamento_dosagem && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {
                      retirada.medicamento_dosagem
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-ink-muted">
                  <Calendar
                    size={12}
                    className="text-ice"
                  />
                  Data
                </div>

                <p className="mt-1 font-mono text-sm font-bold text-ink-primary">
                  {
                    formatDate(
                      retirada.data
                    )
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-ink-muted">
                  <Clock
                    size={12}
                    className="text-ice"
                  />
                  Horário
                </div>

                <p className="mt-1 font-mono text-sm font-bold text-ink-primary">
                  {
                    retirada.horario ||
                    "Não informado"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Status
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 text-[10px] font-bold uppercase text-ice">
                {
                  retirada.status.replace(
                    "_",
                    " "
                  )
                }
              </span>

              <span className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-[10px] font-bold uppercase text-ink-muted">
                {
                  retirada.tipo
                }
              </span>
            </div>
          </div>

          {info.length >
            0 && (
            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ice">
                Vínculos
              </p>

              <div className="space-y-2">
                {info.map(
                  (
                    item
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <div
                        key={
                          item.label
                        }
                        className="flex items-center gap-3 rounded-2xl bg-surface-raised px-3.5 py-3"
                      >
                        <Icon
                          size={15}
                          className="text-ice"
                        />

                        <div>
                          <p className="text-[9px] uppercase tracking-wide text-ink-faint">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-ink-primary">
                            {
                              item.value
                            }
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {(retirada.quantidade_prevista !==
            null &&
            retirada.quantidade_prevista !==
              undefined) ||
          retirada.exige_nova_receita ||
          retirada.observacoes ? (
            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ice">
                Planejamento
              </p>

              {retirada.quantidade_prevista !==
                null &&
                retirada.quantidade_prevista !==
                  undefined && (
                <p className="mt-3 text-xs text-ink-muted">
                  Quantidade prevista:{" "}
                  <strong className="text-ink-primary">
                    {
                      retirada.quantidade_prevista
                    }
                  </strong>
                </p>
              )}

              {retirada.exige_nova_receita && (
                <p className="mt-2 text-xs text-amber-300">
                  Marcada como exigindo nova receita.
                </p>
              )}

              {retirada.observacoes && (
                <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">
                  {
                    retirada.observacoes
                  }
                </p>
              )}
            </div>
          ) : null}

          {retirada.status ===
            "agendada" && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  openReschedule
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/25 bg-ice/10 px-4 py-3.5 text-sm font-bold text-ice disabled:opacity-50"
              >
                <Clock
                  size={17}
                />
                Reagendar
              </button>

              <button
                type="button"
                disabled={
                  processing
                }
                onClick={() =>
                  updateStatus(
                    "realizada"
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-void disabled:opacity-50"
              >
                <CheckCircle2
                  size={17}
                />
                Marcar como realizada
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    updateStatus(
                      "nao_realizada"
                    )
                  }
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-coral/25 bg-coral/10 px-3 py-3 text-[10px] font-bold text-coral disabled:opacity-50"
                >
                  <XCircle
                    size={14}
                  />
                  Não realizada
                </button>

                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    updateStatus(
                      "cancelada"
                    )
                  }
                  className="rounded-2xl border border-surface-border bg-surface-raised px-3 py-3 text-[10px] font-bold text-ink-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {retirada.reagendamentos &&
            retirada.reagendamentos.length >
              0 && (
            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ice">
                Histórico de reagendamentos
              </p>

              <div className="mt-3 space-y-2">
                {retirada.reagendamentos
                  .slice()
                  .reverse()
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.reagendada_em +
                          "-" +
                          index
                        }
                        className="rounded-2xl border border-surface-border/40 bg-surface-raised px-3.5 py-3"
                      >
                        <p className="text-[10px] font-semibold text-ink-primary">
                          {formatDate(
                            item.data_anterior
                          )}
                          {item.horario_anterior
                            ? ` · ${item.horario_anterior}`
                            : ""}
                          {" → "}
                          {formatDate(
                            item.nova_data
                          )}
                          {item.novo_horario
                            ? ` · ${item.novo_horario}`
                            : ""}
                        </p>

                        {item.motivo && (
                          <p className="mt-1 text-[9px] leading-relaxed text-ink-muted">
                            {
                              item.motivo
                            }
                          </p>
                        )}
                      </div>
                    )
                  )}
              </div>
            </div>
          )}

          {retirada.status ===
            "realizada" && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/saude/renovacao/nova?medicamento_id=${retirada.medicamento_id}`
                )
              }
              className="w-full rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3.5 text-sm font-bold text-emerald-400"
            >
              Registrar aquisição / estoque
            </button>
          )}
        </section>

        {showReschedule && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => {
              if (
                !processing
              ) {
                setShowReschedule(
                  false
                );
              }
            }}
          >
            <div
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
              className="w-full max-w-md rounded-[28px] border border-surface-border bg-surface p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ice">
                    Reagendar retirada
                  </p>

                  <h3 className="mt-1 text-base font-bold text-ink-primary">
                    {
                      retirada.medicamento_nome ||
                      "Medicamento"
                    }
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    setShowReschedule(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-ink-muted disabled:opacity-40"
                >
                  <XCircle
                    size={16}
                  />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
                <p className="text-[10px] leading-relaxed text-ink-muted">
                  O compromisso atual será movido para a nova data. O Vault preservará a data anterior no histórico.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Nova data
                  </span>

                  <input
                    type="date"
                    value={
                      rescheduleDate
                    }
                    onChange={(
                      event
                    ) =>
                      setRescheduleDate(
                        event.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Horário
                  </span>

                  <input
                    type="time"
                    value={
                      rescheduleTime
                    }
                    onChange={(
                      event
                    ) =>
                      setRescheduleTime(
                        event.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Motivo
                </span>

                <textarea
                  value={
                    rescheduleReason
                  }
                  onChange={(
                    event
                  ) =>
                    setRescheduleReason(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Ex.: medicamento ainda não chegou; pediram para voltar em 2 dias."
                  className="mt-1.5 w-full resize-none rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    setShowReschedule(
                      false
                    )
                  }
                  className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-xs font-semibold text-ink-muted disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    processing ||
                    !rescheduleDate
                  }
                  onClick={
                    handleReschedule
                  }
                  className="rounded-2xl bg-ice px-4 py-3 text-xs font-bold text-void disabled:opacity-40"
                >
                  {processing
                    ? "Salvando..."
                    : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={
            showDelete
          }
          onClose={() =>
            setShowDelete(
              false
            )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir retirada"
          message="Excluir este compromisso de retirada?"
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesRetiradaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void" />
      }
    >
      <DetalhesRetiradaContent />
    </Suspense>
  );
}
