// app/saude/renovacao/nova-receita/page.tsx
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
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  Save,
  Stethoscope,
} from "lucide-react";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  calcularDataValidadeReceita,
} from "@/lib/health-insights";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  Button,
} from "@/components/ui/Button";

import {
  TextArea,
} from "@/components/ui/TextArea";

function NovaReceitaContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    addRenovacao,
  } =
    useRenovacoes();

  const medicamentoIdParam =
    searchParams.get(
      "medicamento_id"
    ) ||
    "";

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentos
          .filter(
            (
              medicamento
            ) =>
              medicamento.status !==
                "descontinuado" &&
              (
                !activePersonId ||
                medicamento.person_id ===
                  activePersonId
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
          ),
      [
        medicamentos,
        activePersonId,
      ]
    );

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      medicamentoIdParam
    );

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    dataReceita,
    setDataReceita,
  ] =
    useState(
      getLocalTodayISO()
    );

  const [
    proximaRenovacao,
    setProximaRenovacao,
  ] =
    useState(
      ""
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const selectedMedicamento =
    useMemo(
      () =>
        medicamentosAtivos.find(
          (
            medicamento
          ) =>
            medicamento.id ===
            medicamentoId
        ),
      [
        medicamentosAtivos,
        medicamentoId,
      ]
    );

  useEffect(
    () => {
      if (
        !selectedMedicamento
      ) {
        setMedicoId(
          ""
        );

        setProximaRenovacao(
          ""
        );

        return;
      }

      setMedicoId(
        selectedMedicamento.medico_id ||
        ""
      );

      const next =
        calcularDataValidadeReceita(
          dataReceita,
          selectedMedicamento.tipo_receita ||
            30
        );

      setProximaRenovacao(
        next ||
        ""
      );
    },
    [
      selectedMedicamento,
      dataReceita,
    ]
  );

  const handleSave =
    async () => {
      if (
        saving
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        return;
      }

      if (
        !selectedMedicamento?.id
      ) {
        trigger(
          "error"
        );

        return;
      }

      setSaving(
        true
      );

      try {
        await addRenovacao(
          {
            medicamento_id:
              selectedMedicamento.id,

            document_id:
              selectedMedicamento.document_id ||
              undefined,

            medico_id:
              medicoId ||
              undefined,

            /*
             * Este evento NÃO é uma aquisição.
             *
             * O repository preserva estoque, farmácia e
             * retirada atual do medicamento.
             */
            tipo_aquisicao:
              undefined,

            quantidade:
              undefined,

            preco:
              undefined,

            data:
              dataReceita,

            data_aquisicao:
              undefined,

            observacoes:
              observacoes.trim() ||
              undefined,
          },
          {
            somenteReceita:
              true,

            proximaRenovacao:
              proximaRenovacao ||
              null,
          }
        );

        trigger(
          "success"
        );

        router.replace(
          "/saude/renovacao"
        );
      } catch (
        error
      ) {
        console.error(
          "[NovaReceita] Falha ao registrar receita:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-10">
        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.replace(
                  "/saude/renovacao"
                );
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText
                  size={
                    14
                  }
                  className="text-violet-300"
                />

                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-violet-300">
                  Prescrição
                </p>
              </div>

              <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                Renovar somente a receita
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          <div className="rounded-[26px] border border-violet-400/20 bg-violet-400/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                <FileText
                  size={
                    17
                  }
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-ink-primary">
                  Só a nova prescrição
                </p>

                <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                  Use quando a receita foi renovada, mas você ainda não comprou nem retirou o medicamento. O estoque e a aquisição atual não serão alterados.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Pill
                  size={
                    13
                  }
                  className="text-amber-400"
                />

                Medicamento
              </label>

              <select
                value={
                  medicamentoId
                }
                onChange={
                  (
                    event
                  ) =>
                    setMedicamentoId(
                      event.target.value
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              >
                <option value="">
                  Selecione um medicamento
                </option>

                {medicamentosAtivos.map(
                  (
                    medicamento
                  ) => (
                    <option
                      key={
                        medicamento.id
                      }
                      value={
                        medicamento.id
                      }
                    >
                      {medicamento.nome}
                      {medicamento.dosagem
                        ? ` · ${medicamento.dosagem}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Calendar
                  size={
                    13
                  }
                  className="text-ice"
                />

                Data da nova receita
              </label>

              <input
                type="date"
                value={
                  dataReceita
                }
                onChange={
                  (
                    event
                  ) =>
                    setDataReceita(
                      event.target.value
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Stethoscope
                  size={
                    13
                  }
                  className="text-sky-400"
                />

                Médico
              </label>

              <select
                value={
                  medicoId
                }
                onChange={
                  (
                    event
                  ) =>
                    setMedicoId(
                      event.target.value
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              >
                <option value="">
                  Sem médico vinculado
                </option>

                {medicos.map(
                  (
                    medico
                  ) => (
                    <option
                      key={
                        medico.id
                      }
                      value={
                        medico.id
                      }
                    >
                      {medico.nome}
                      {medico.especialidade
                        ? ` · ${medico.especialidade}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {selectedMedicamento && (
            <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={
                    17
                  }
                  className="mt-0.5 shrink-0 text-emerald-400"
                />

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-primary">
                    O que será atualizado
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                    A receita atual de{" "}
                    <strong className="text-ink-primary">
                      {selectedMedicamento.nome}
                    </strong>{" "}
                    passa a ser a de{" "}
                    {dataReceita
                      .split(
                        "-"
                      )
                      .reverse()
                      .join(
                        "/"
                      )}
                    {proximaRenovacao
                      ? `. A próxima referência de renovação fica em ${proximaRenovacao
                          .split(
                            "-"
                          )
                          .reverse()
                          .join(
                            "/"
                          )}.`
                      : "."}
                  </p>

                  <p className="mt-2 text-[10px] leading-4 text-emerald-300">
                    Estoque, farmácia, preço, quantidade e retirada agendada permanecem intactos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <TextArea
            label="Observações"
            value={
              observacoes
            }
            onChange={
              (
                event
              ) =>
                setObservacoes(
                  event.target.value
                )
            }
            placeholder="Ex.: receita renovada na consulta; compra será feita quando o estoque estiver próximo do fim."
            rows={
              4
            }
          />

          <Button
            size="lg"
            fullWidth
            onClick={
              handleSave
            }
            disabled={
              saving ||
              !activePersonId ||
              !selectedMedicamento
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saving ? (
              <Loader2
                size={
                  16
                }
                className="animate-spin"
              />
            ) : (
              <Save
                size={
                  16
                }
              />
            )}

            {saving
              ? "Salvando..."
              : "Registrar nova receita"}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}

export default function NovaReceitaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-void">
          <Loader2
            className="animate-spin text-ice"
            size={
              24
            }
          />
        </div>
      }
    >
      <NovaReceitaContent />
    </Suspense>
  );
}
