// app/saude/locais/novo/page.tsx
"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Eraser,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  Plus,
  PlusCircle,
  Save,
  Stethoscope,
  X,
} from "lucide-react";
import type {
  LucideIcon,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useLocais,
} from "@/hooks/useLocais";
import {
  useMedicos,
} from "@/hooks/useMedicos";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  Button,
} from "@/components/ui/Button";
import {
  Input,
} from "@/components/ui/Input";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  SelectionModal,
} from "@/components/SelectionModal";

import type {
  Medico,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type LocalTipo =
  | "posto_saude"
  | "laboratorio"
  | "clinica"
  | "outro";

interface LocalTypeOption {
  id: LocalTipo;
  label: string;
  description: string;
  icon: LucideIcon;
}

// ============================================================
// CONFIG
// ============================================================

const TIPOS_LOCAL:
  LocalTypeOption[] = [
  {
    id: "posto_saude",
    label: "Posto / UBS",
    description:
      "Unidade básica, posto de saúde ou atendimento primário.",
    icon: PlusCircle,
  },
  {
    id: "laboratorio",
    label: "Laboratório",
    description:
      "Análises clínicas, coleta, diagnóstico ou exames laboratoriais.",
    icon: FlaskConical,
  },
  {
    id: "clinica",
    label: "Clínica",
    description:
      "Clínica médica, especializada ou centro de atendimento.",
    icon: Building2,
  },
  {
    id: "outro",
    label: "Outro",
    description:
      "Outro estabelecimento de saúde que não se encaixe nas categorias atuais.",
    icon: MapPin,
  },
];

const fadeUp = {
  initial: {
    opacity: 0,
    y: 12,
  },

  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatPhone(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        11
      );

  if (
    clean.length <= 2
  ) {
    return clean;
  }

  if (
    clean.length <= 6
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(2)}`;
  }

  if (
    clean.length <= 10
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(
      2,
      6
    )}-${clean.slice(6)}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(7)}`;
}

// ============================================================
// PAGE
// ============================================================

export default function NovoLocalPage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const {
    addLocal,
  } =
    useLocais();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    nome,
    setNome,
  ] =
    useState("");

  const [
    tipo,
    setTipo,
  ] =
    useState<LocalTipo>(
      "posto_saude"
    );

  const [
    endereco,
    setEndereco,
  ] =
    useState("");

  const [
    telefone,
    setTelefone,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    medicoIds,
    setMedicoIds,
  ] =
    useState<string[]>([]);

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(false);

  // ==========================================================
  // MEDICOS
  // ==========================================================

  const medicosVinculados =
    useMemo(() => {
      const selected =
        new Set(
          medicoIds
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              selected.has(
                medico.id
              )
          )
      );
    }, [
      medicos,
      medicoIds,
    ]);

  const medicosDisponiveis =
    useMemo(() => {
      const selected =
        new Set(
          medicoIds
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              !selected.has(
                medico.id
              )
          )
      );
    }, [
      medicos,
      medicoIds,
    ]);

  const handleAddMedico =
    (
      medico:
        Medico
    ) => {
      if (
        !medico.id
      ) {
        return;
      }

      setMedicoIds(
        (
          previous
        ) =>
          previous.includes(
            medico.id!
          )
            ? previous
            : [
                ...previous,
                medico.id!,
              ]
      );

      setIsMedicoModalOpen(
        false
      );
    };

  const handleRemoveMedico =
    (
      medicoId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setMedicoIds(
        (
          previous
        ) =>
          previous.filter(
            (
              current
            ) =>
              current !==
              medicoId
          )
      );
    };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const clearError =
    (
      key: string
    ) => {
      setErrors(
        (
          previous
        ) => {
          if (
            !previous[key]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[key];

          return next;
        }
      );
    };

  const validate =
    () => {
      const newErrors:
        Record<
          string,
          string
        > =
        {};

      if (
        !nome.trim()
      ) {
        newErrors.nome =
          "Nome é obrigatório";
      }

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async () => {
      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        trigger(
          "error"
        );

        return;
      }

      if (
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      try {
        await run(
          async () => {
            await addLocal({
              nome:
                nome.trim(),

              tipo,

              endereco:
                endereco.trim() ||
                undefined,

              telefone:
                telefone.trim() ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,

              medico_ids:
                Array.from(
                  new Set(
                    medicoIds
                  )
                ),
            });
          },
          {
            successMessage:
              "Local cadastrado com sucesso",

            errorMessage:
              "Erro ao cadastrar local",

            goBackOnSuccess:
              true,
          }
        );
      } finally {
        isSubmitLocked.current =
          false;
      }
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Entidade global
              </p>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo local
              </h1>

              <p className="mt-1 text-xs text-ink-muted">
                Cadastre uma unidade da sua rede de saúde.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Identificação
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                O local ficará disponível para todas as pessoas do Vault. O histórico clínico continua separado por pessoa.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Ex: UBS Central, Clínica Vida..."
              value={
                nome
              }
              onChange={(
                event
              ) => {
                setNome(
                  event.target.value
                );

                clearError(
                  "nome"
                );
              }}
              error={
                errors.nome
              }
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Tipo de local
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPOS_LOCAL.map(
                  (
                    option
                  ) => {
                    const Icon =
                      option.icon;

                    const selected =
                      tipo ===
                      option.id;

                    return (
                      <button
                        key={
                          option.id
                        }
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          setTipo(
                            option.id
                          );
                        }}
                        aria-pressed={
                          selected
                        }
                        className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                          selected
                            ? "border-ice/40 bg-ice/8"
                            : "border-surface-border/50 bg-surface-raised/60"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-ice/15 text-ice"
                              : "bg-surface text-ink-muted"
                          }`}
                        >
                          <Icon
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold ${
                              selected
                                ? "text-ice"
                                : "text-ink-primary"
                            }`}
                          >
                            {
                              option.label
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] leading-4 text-ink-muted">
                            {
                              option.description
                            }
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={
                endereco
              }
              onChange={(
                event
              ) =>
                setEndereco(
                  event.target.value
                )
              }
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={
                telefone
              }
              onChange={(
                event
              ) =>
                setTelefone(
                  formatPhone(
                    event
                      .target
                      .value
                  )
                )
              }
            />

            <div>
              <label
                htmlFor="observacoes"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-primary"
              >
                <FileText
                  size={14}
                  className="text-ink-faint"
                />

                Observações
              </label>

              <textarea
                id="observacoes"
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
                placeholder="Informações úteis sobre atendimento, horários, acesso ou outras observações..."
                className="w-full resize-none rounded-2xl border border-surface-border/60 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/50"
              />
            </div>
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.05,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Stethoscope
                    size={14}
                    className="text-ice"
                  />

                  Médicos do local (
                  {
                    medicoIds.length
                  }
                  )
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                  Cadastro estrutural de profissionais que atendem nesta unidade.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {medicoIds.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setMedicoIds(
                        []
                      );
                    }}
                    className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-1 text-[10px] font-bold uppercase text-coral transition-all active:scale-95"
                  >
                    <Eraser
                      size={12}
                    />

                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setIsMedicoModalOpen(
                      true
                    );
                  }}
                  className="flex items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[10px] font-bold text-ice transition-all active:scale-95"
                >
                  <Plus
                    size={12}
                  />

                  Adicionar
                </button>
              </div>
            </div>

            {medicosVinculados.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico vinculado diretamente a este local.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicosVinculados.map(
                  (
                    medico
                  ) => (
                    <div
                      key={
                        medico.id
                      }
                      className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised py-1 pl-3 pr-1"
                    >
                      <span className="max-w-[180px] truncate text-xs font-semibold text-ink-primary">
                        Dr(a).{" "}
                        {
                          medico.nome
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveMedico(
                            medico.id!
                          )
                        }
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                        aria-label={`Remover ${medico.nome}`}
                      >
                        <X
                          size={12}
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              <>
                <Save
                  size={16}
                />

                Salvar local
              </>
            )}
          </Button>
        </div>

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={() =>
            setIsMedicoModalOpen(
              false
            )
          }
          onSelect={
            handleAddMedico
          }
          items={
            medicosDisponiveis
          }
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            item.nome
          }
          renderItem={(
            item
          ) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Stethoscope
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-primary">
                  Dr(a).{" "}
                  {
                    item.nome
                  }
                </p>

                {item.especialidade && (
                  <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                    {
                      item.especialidade
                    }
                  </p>
                )}
              </div>
            </div>
          )}
          onCreateNew={() => {
            setIsMedicoModalOpen(
              false
            );

            router.push(
              "/saude/medicos/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />
      </main>
    </PageTransition>
  );
}