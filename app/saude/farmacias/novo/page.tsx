// app/saude/farmacias/novo/page.tsx
"use client";

import {
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
  Loader2,
  Save,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  Button,
} from "@/components/ui/Button";
import {
  Input,
} from "@/components/ui/Input";
import {
  TextArea,
} from "@/components/ui/TextArea";

// ============================================================
// ANIMATION
// ============================================================

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

export default function NovaFarmaciaPage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const {
    addFarmacia,
  } =
    useFarmacias();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const [
    nome,
    setNome,
  ] =
    useState("");

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
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

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
            /*
             * Farmácia é global por usuário.
             *
             * Não existe:
             * - activePersonId
             * - person_id
             * - user_id vindo da página
             *
             * O repository injeta internamente o usuário.
             */
            await addFarmacia({
              nome:
                nome.trim(),

              endereco:
                endereco.trim() ||
                undefined,

              telefone:
                telefone.trim() ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,
            });
          },
          {
            successMessage:
              "Farmácia cadastrada com sucesso",

            errorMessage:
              "Erro ao cadastrar farmácia",

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
        {/* ====================================================
            HEADER
            ==================================================== */}

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

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2
                  size={16}
                  className="text-amber-400"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                  Hub de Farmácia
                </p>
              </div>

              <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                Nova Farmácia
              </h1>
            </div>
          </div>
        </header>

        {/* ====================================================
            FORM
            ==================================================== */}

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              duration:
                0.28,
            }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Informações do Local
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                Este cadastro fica disponível globalmente no seu Vault e pode ser usado pelos registros de saúde das diferentes pessoas.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Ex: Farmácia Popular, Drogasil..."
              value={nome}
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

            <TextArea
              label="Observações"
              placeholder="Horário de funcionamento, unidade, detalhes..."
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
            />
          </motion.div>
        </section>

        {/* ====================================================
            SAVE
            ==================================================== */}

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

                Salvar farmácia
              </>
            )}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}