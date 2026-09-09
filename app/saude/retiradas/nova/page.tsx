// app/saude/retiradas/nova/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Pill,
  Save,
} from "lucide-react";

import {
  useRetiradas,
} from "@/hooks/useRetiradas";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

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
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  PageTransition,
} from "@/components/PageTransition";

function NovaRetiradaContent() {
  const router =
    useRouter();

  const params =
    useSearchParams();

  const {
    showToast,
  } =
    useToast();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    addRetirada,
  } =
    useRetiradas();

  const {
    medicamentos,
  } =
    useMedicamentos();

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

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState("");

  const [
    medicoId,
    setMedicoId,
  ] =
    useState("");

  const [
    farmaciaId,
    setFarmaciaId,
  ] =
    useState("");

  const [
    hospitalId,
    setHospitalId,
  ] =
    useState("");

  const [
    localId,
    setLocalId,
  ] =
    useState("");

  const [
    data,
    setData,
  ] =
    useState(
      getLocalTodayISO()
    );

  const [
    horario,
    setHorario,
  ] =
    useState("");

  const [
    tipo,
    setTipo,
  ] =
    useState<
      "sus" |
      "farmacia" |
      "outro"
    >("sus");

  const [
    quantidadePrevista,
    setQuantidadePrevista,
  ] =
    useState("");

  const [
    exigeNovaReceita,
    setExigeNovaReceita,
  ] =
    useState(false);

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const autoMedicationId =
    params.get(
      "medicamento_id"
    );

  useEffect(() => {
    if (
      autoMedicationId &&
      medicamentos.some(
        (
          medicamento
        ) =>
          medicamento.id ===
          autoMedicationId
      )
    ) {
      setMedicamentoId(
        autoMedicationId
      );
    }
  }, [
    autoMedicationId,
    medicamentos,
  ]);

  const selected =
    medicamentos.find(
      (
        medicamento
      ) =>
        medicamento.id ===
        medicamentoId
    );

  useEffect(() => {
    if (
      !selected
    ) {
      return;
    }

    if (
      !medicoId &&
      selected.medico_id
    ) {
      setMedicoId(
        selected.medico_id
      );
    }

    if (
      !farmaciaId &&
      selected.farmacia_id
    ) {
      setFarmaciaId(
        selected.farmacia_id
      );
    }

    if (
      !hospitalId &&
      selected.hospital_id
    ) {
      setHospitalId(
        selected.hospital_id
      );
    }

    if (
      !localId &&
      selected.local_id
    ) {
      setLocalId(
        selected.local_id
      );
    }
  }, [
    selected,
    medicoId,
    farmaciaId,
    hospitalId,
    localId,
  ]);

  const save =
    async () => {
      if (
        !medicamentoId ||
        !data ||
        saving
      ) {
        showToast(
          "Informe medicamento e data",
          "error"
        );

        return;
      }

      setSaving(
        true
      );

      try {
        const quantidade =
          quantidadePrevista
            ? Number(
                quantidadePrevista.replace(
                  ",",
                  "."
                )
              )
            : undefined;

        await addRetirada({
          medicamento_id:
            medicamentoId,

          medico_id:
            medicoId ||
            null,

          farmacia_id:
            farmaciaId ||
            null,

          hospital_id:
            hospitalId ||
            null,

          local_id:
            localId ||
            null,

          medicamento_nome:
            selected?.nome ||
            null,

          medicamento_dosagem:
            selected?.dosagem ||
            null,

          data,

          horario:
            horario ||
            null,

          tipo,

          status:
            "agendada",

          quantidade_prevista:
            Number.isFinite(
              quantidade
            )
              ? quantidade
              : null,

          quantidade_retirada:
            null,

          exige_nova_receita:
            exigeNovaReceita,

          observacoes:
            observacoes.trim() ||
            null,

          realizada_em:
            null,

          renovacao_origem_id:
            null,

          renovacao_realizada_id:
            null,
        });

        trigger(
          "success"
        );

        showToast(
          "Retirada agendada",
          "success"
        );

        router.replace(
          "/saude/retiradas"
        );
      } catch (
        error
      ) {
        console.error(
          "[NovaRetirada]",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao agendar retirada",
          "error"
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const selectClass =
    "mt-1.5 w-full rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none focus:border-ice/50";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center gap-3">
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

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ice">
                Compromisso de saúde
              </p>

              <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">
                Nova retirada
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          <div className="rounded-[26px] border border-ice/20 bg-gradient-to-br from-ice/10 to-surface p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Pill
                  size={19}
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-ink-primary">
                  Retirada como compromisso
                </h2>

                <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                  Vincule medicamento, profissional e estabelecimento. A retirada passa a aparecer na agenda do Vault.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Medicamento *
              <select
                value={
                  medicamentoId
                }
                onChange={(
                  event
                ) =>
                  setMedicamentoId(
                    event.target.value
                  )
                }
                className={
                  selectClass
                }
              >
                <option value="">
                  Selecione...
                </option>

                {medicamentos.map(
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
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Calendar
                    size={11}
                  />
                  Data *
                </span>

                <input
                  type="date"
                  value={
                    data
                  }
                  onChange={(
                    event
                  ) =>
                    setData(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                />
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock
                    size={11}
                  />
                  Horário
                </span>

                <input
                  type="time"
                  value={
                    horario
                  }
                  onChange={(
                    event
                  ) =>
                    setHorario(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                />
              </label>
            </div>

            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Tipo
              <select
                value={
                  tipo
                }
                onChange={(
                  event
                ) =>
                  setTipo(
                    event.target.value as
                      | "sus"
                      | "farmacia"
                      | "outro"
                  )
                }
                className={
                  selectClass
                }
              >
                <option value="sus">
                  SUS
                </option>
                <option value="farmacia">
                  Farmácia
                </option>
                <option value="outro">
                  Outro
                </option>
              </select>
            </label>
          </div>

          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ice">
              Vínculos
            </p>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Médico
                <select
                  value={
                    medicoId
                  }
                  onChange={(
                    event
                  ) =>
                    setMedicoId(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    Não informado
                  </option>
                  {medicos.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.nome
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Farmácia
                <select
                  value={
                    farmaciaId
                  }
                  onChange={(
                    event
                  ) =>
                    setFarmaciaId(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    Não informada
                  </option>
                  {farmacias.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.nome
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Hospital
                <select
                  value={
                    hospitalId
                  }
                  onChange={(
                    event
                  ) =>
                    setHospitalId(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    Não informado
                  </option>
                  {hospitais.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.nome
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Local
                <select
                  value={
                    localId
                  }
                  onChange={(
                    event
                  ) =>
                    setLocalId(
                      event.target.value
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="">
                    Não informado
                  </option>
                  {locais.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.nome
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Quantidade prevista
              <input
                type="number"
                min="0"
                step="any"
                value={
                  quantidadePrevista
                }
                onChange={(
                  event
                ) =>
                  setQuantidadePrevista(
                    event.target.value
                  )
                }
                className={
                  selectClass
                }
              />
            </label>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3.5 py-3">
              <div>
                <p className="text-xs font-semibold text-ink-primary">
                  Exige nova receita
                </p>

                <p className="mt-0.5 text-[9px] text-ink-muted">
                  Informação logística declarada pelo usuário.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  exigeNovaReceita
                }
                onChange={(
                  event
                ) =>
                  setExigeNovaReceita(
                    event.target.checked
                  )
                }
                className="h-5 w-5 accent-ice"
              />
            </label>

            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Observações
              <textarea
                value={
                  observacoes
                }
                onChange={(
                  event
                ) =>
                  setObservacoes(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Ex.: retirar na Farmácia Municipal, levar documento..."
                className={`${selectClass} resize-none`}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={
              save
            }
            disabled={
              saving
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ice px-4 py-3.5 text-sm font-bold text-void transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <Save
              size={17}
            />

            {saving
              ? "Salvando..."
              : "Agendar retirada"}
          </button>
        </section>
      </main>
    </PageTransition>
  );
}

export default function NovaRetiradaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void" />
      }
    >
      <NovaRetiradaContent />
    </Suspense>
  );
}
