// app/saude/medicos/novo/page.tsx
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
  Loader2,
  Save,
  Stethoscope,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";
import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  Button,
} from "@/components/ui/Button";
import {
  Input,
} from "@/components/ui/Input";
import {
  TextArea,
} from "@/components/ui/TextArea";
import {
  PageTransition,
} from "@/components/PageTransition";

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
    )}) ${clean.slice(
      2
    )}`;
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
    )}-${clean.slice(
      6
    )}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(
    7
  )}`;
}

export default function NovoMedicoPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    addMedico,
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
    especialidade,
    setEspecialidade,
  ] =
    useState("");

  const [
    crm,
    setCrm,
  ] =
    useState("");

  const [
    telefone,
    setTelefone,
  ] =
    useState("");

  const [
    email,
    setEmail,
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

  const validate =
    () => {
      const newErrors: Record<
        string,
        string
      > = {};

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
        ).length === 0
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
            await addMedico({
              nome:
                nome.trim(),

              especialidade:
                especialidade.trim() ||
                undefined,

              crm:
                crm.trim() ||
                undefined,

              telefone:
                telefone.trim() ||
                undefined,

              email:
                email.trim() ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,
            });
          },
          {
            successMessage:
              "Médico cadastrado com sucesso",

            errorMessage:
              "Erro ao cadastrar médico",

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
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
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
                <Stethoscope
                  size={17}
                  className="shrink-0 text-ice"
                />

                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                  Novo médico
                </h1>
              </div>

              <p className="mt-1 text-sm text-ink-muted">
                Cadastre o profissional na sua rede médica.
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
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Dados do profissional
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Hospitais, locais e tratamentos são vinculados pelas próprias áreas para manter uma única fonte de verdade.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Nome completo"
              value={
                nome
              }
              onChange={(
                event
              ) =>
                setNome(
                  event
                    .target
                    .value
                )
              }
              error={
                errors.nome
              }
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Especialidade"
                placeholder="Cardiologia"
                value={
                  especialidade
                }
                onChange={(
                  event
                ) =>
                  setEspecialidade(
                    event
                      .target
                      .value
                  )
                }
              />

              <Input
                label="CRM"
                placeholder="12345-MG"
                value={
                  crm
                }
                onChange={(
                  event
                ) =>
                  setCrm(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

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

            <Input
              label="E-mail"
              type="email"
              placeholder="medico@email.com"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event
                    .target
                    .value
                )
              }
            />

            <TextArea
              label="Observações"
              placeholder="Dias de atendimento, informações de contato, orientações ou outras anotações..."
              value={
                observacoes
              }
              onChange={(
                event
              ) =>
                setObservacoes(
                  event
                    .target
                    .value
                )
              }
            />
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
                Salvar médico
              </>
            )}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}