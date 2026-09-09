// app/saude/retiradas/editar/page.tsx
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
  PageTransition,
} from "@/components/PageTransition";

function EditarRetiradaContent() {
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

  const {
    showToast,
  } =
    useToast();

  const {
    trigger,
  } =
    useHapticFeedback();

  const retirada =
    retiradas.find(
      (
        item
      ) =>
        item.id ===
        id
    );

  const [
    loadedId,
    setLoadedId,
  ] =
    useState<
      string | null
    >(null);

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
    useState("");

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
    status,
    setStatus,
  ] =
    useState<
      "agendada" |
      "realizada" |
      "cancelada" |
      "nao_realizada"
    >(
      "agendada"
    );

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

  useEffect(() => {
    if (
      !retirada ||
      !retirada.id ||
      loadedId ===
        retirada.id
    ) {
      return;
    }

    setMedicamentoId(
      retirada.medicamento_id
    );

    setMedicoId(
      retirada.medico_id ||
      ""
    );

    setFarmaciaId(
      retirada.farmacia_id ||
      ""
    );

    setHospitalId(
      retirada.hospital_id ||
      ""
    );

    setLocalId(
      retirada.local_id ||
      ""
    );

    setData(
      retirada.data
    );

    setHorario(
      retirada.horario ||
      ""
    );

    setTipo(
      retirada.tipo
    );

    setStatus(
      retirada.status
    );

    setObservacoes(
      retirada.observacoes ||
      ""
    );

    setLoadedId(
      retirada.id
    );
  }, [
    retirada,
    loadedId,
  ]);

  if (
    !retirada
  ) {
    return (
      <main className="min-h-screen bg-void" />
    );
  }

  const selected =
    medicamentos.find(
      (
        item
      ) =>
        item.id ===
        medicamentoId
    );

  const selectClass =
    "mt-1.5 w-full rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none focus:border-ice/50";

  const save =
    async () => {
      if (
        !data ||
        saving
      ) {
        return;
      }

      setSaving(
        true
      );

      try {
        await updateRetirada(
          retirada.id!,
          {
            medicamento_id:
              medicamentoId,

            medicamento_nome:
              selected?.nome ||
              retirada.medicamento_nome ||
              null,

            medicamento_dosagem:
              selected?.dosagem ||
              retirada.medicamento_dosagem ||
              null,

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

            data,

            horario:
              horario ||
              null,

            tipo,

            status,

            observacoes:
              observacoes.trim() ||
              null,

            realizada_em:
              status ===
              "realizada"
                ? retirada.realizada_em ||
                  new Date()
                    .toISOString()
                : null,
          }
        );

        trigger(
          "success"
        );

        showToast(
          "Retirada atualizada",
          "success"
        );

        router.replace(
          `/saude/retiradas/detalhes?id=${retirada.id}`
        );
      } catch (
        error
      ) {
        console.error(
          "[EditarRetirada]",
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
        setSaving(
          false
        );
      }
    };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.replace(
                  `/saude/retiradas/detalhes?id=${retirada.id}`
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
                Compromisso
              </p>

              <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">
                Editar retirada
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Medicamento
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
                {medicamentos.map(
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Data
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
                Horário
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
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

              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Status
                <select
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target.value as typeof status
                    )
                  }
                  className={
                    selectClass
                  }
                >
                  <option value="agendada">
                    Agendada
                  </option>
                  <option value="realizada">
                    Realizada
                  </option>
                  <option value="nao_realizada">
                    Não realizada
                  </option>
                  <option value="cancelada">
                    Cancelada
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            {[
              [
                "Médico",
                medicoId,
                setMedicoId,
                medicos,
              ],
              [
                "Farmácia",
                farmaciaId,
                setFarmaciaId,
                farmacias,
              ],
              [
                "Hospital",
                hospitalId,
                setHospitalId,
                hospitais,
              ],
              [
                "Local",
                localId,
                setLocalId,
                locais,
              ],
            ].map(
              (
                [
                  label,
                  value,
                  setter,
                  items,
                ]:
                  any
              ) => (
                <label
                  key={
                    label
                  }
                  className="mb-3 block last:mb-0 text-[10px] font-bold uppercase tracking-wider text-ink-muted"
                >
                  {
                    label
                  }
                  <select
                    value={
                      value
                    }
                    onChange={(
                      event
                    ) =>
                      setter(
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

                    {items.map(
                      (
                        item:
                          any
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
              )
            )}
          </div>

          <div className="rounded-[26px] border border-surface-border/50 bg-surface p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
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
                rows={5}
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ice px-4 py-3.5 text-sm font-bold text-void disabled:opacity-50"
          >
            <Save
              size={17}
            />

            {saving
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </section>
      </main>
    </PageTransition>
  );
}

export default function EditarRetiradaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void" />
      }
    >
      <EditarRetiradaContent />
    </Suspense>
  );
}
