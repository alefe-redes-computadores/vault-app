// app/contas/novo/page.tsx

"use client";

import {
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useHapticFeedback } from "@/lib/haptics";
import { getBankLogoUrl } from "@/lib/utils/card-helper";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useCards } from "@/hooks/useCards";
import { useActivePersonId } from "@/hooks/useActivePersonId";

type AccountType =
  | "conta_corrente"
  | "conta_poupanca"
  | "conta_digital";

interface AccountFormState {
  title: string;
  bank_name: string;
  type: AccountType;
  agency: string;
  account: string;
  notes: string;
}

type AccountTextField =
  Exclude<
    keyof AccountFormState,
    "type"
  >;

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

const ACCOUNT_TYPES: Array<{
  id: AccountType;
  label: string;
}> = [
  {
    id: "conta_corrente",
    label: "C. Corrente",
  },
  {
    id: "conta_poupanca",
    label: "Poupança",
  },
  {
    id: "conta_digital",
    label: "Digital",
  },
];

const INITIAL_FORM_DATA: AccountFormState =
  {
    title: "",
    bank_name: "",
    type: "conta_corrente",
    agency: "",
    account: "",
    notes: "",
  };

export default function NewAccountPage() {
  const router =
    useRouter();

  const { trigger } =
    useHapticFeedback();

  const { addCard } =
    useCards();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const [
    errors,
    setErrors,
  ] =
    useState<
      Partial<
        Record<
          AccountTextField,
          string
        >
      >
    >({});

  const [
    formData,
    setFormData,
  ] =
    useState<AccountFormState>(
      INITIAL_FORM_DATA
    );

  const logoUrl =
    getBankLogoUrl(
      formData.bank_name
    );

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleChange = (
    field:
      AccountTextField,
    value: string
  ) => {
    setFormData(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );

    if (
      errors[field]
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          [field]:
            undefined,
        })
      );
    }
  };

  const handleTypeChange = (
    type: AccountType
  ) => {
    trigger("vibrate");

    setFormData(
      (previous) => ({
        ...previous,
        type,
      })
    );
  };

  const validateForm =
    () => {
      const newErrors: Partial<
        Record<
          AccountTextField,
          string
        >
      > = {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "O título é obrigatório";
      }

      if (
        !formData.bank_name.trim()
      ) {
        newErrors.bank_name =
          "O nome do banco é obrigatório";
      }

      if (
        !formData.agency.trim()
      ) {
        newErrors.agency =
          "A agência é obrigatória";
      }

      if (
        !formData.account.trim()
      ) {
        newErrors.account =
          "A conta é obrigatória";
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

  const handleSubmit =
    () => {
      trigger("vibrate");

      if (
        !validateForm()
      ) {
        trigger("error");
        return;
      }

      const personId =
        activePersonId;

      if (!personId) {
        trigger("error");
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

      run(
        async () => {
          try {
            await addCard({
              title:
                formData.title.trim(),

              bank_name:
                formData.bank_name.trim(),

              type:
                formData.type,

              agency:
                formData.agency.trim(),

              account:
                formData.account.trim(),

              notes:
                formData.notes.trim(),

              person_id:
                personId,
            });
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Conta salva com sucesso",

          errorMessage:
            "Erro ao salvar conta",

          goBackOnSuccess:
            true,
        }
      );
    };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-44">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button
            onClick={
              handleBack
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            type="button"
            aria-label="Voltar"
          >
            <ArrowLeft
              size={18}
              className="text-ink-primary"
            />
          </button>

          <div>
            <h1 className="font-display text-lg font-semibold text-ink-primary">
              Adicionar Conta Bancária
            </h1>

            <p className="flex items-center gap-1 text-xs text-ink-muted">
              <ShieldCheck
                size={12}
                className="text-ice"
              />
              Dados organizados no cofre
            </p>
          </div>
        </header>

        <div className="flex flex-col items-center px-5 pt-6">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[28px] border border-surface-border/60 bg-surface shadow-md">
            {logoUrl ? (
              <img
                src={
                  logoUrl
                }
                alt={`Logo ${
                  formData.bank_name ||
                  "do banco"
                }`}
                className="h-10 w-10 object-contain"
                onError={(
                  event
                ) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <Landmark
                size={32}
                className="text-ice"
              />
            )}
          </div>
        </div>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Título (ex: Conta Corrente Principal, Salário Itaú)"
              value={
                formData.title
              }
              onChange={(
                event
              ) =>
                handleChange(
                  "title",
                  event.target.value
                )
              }
              error={
                errors.title
              }
              required
            />

            <Input
              label="Nome do Banco (ex: Nubank, Itaú, Bradesco)"
              value={
                formData.bank_name
              }
              onChange={(
                event
              ) =>
                handleChange(
                  "bank_name",
                  event.target.value
                )
              }
              error={
                errors.bank_name
              }
              required
            />
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Tipo de Conta
            </p>

            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(
                (
                  typeItem
                ) => (
                  <button
                    key={
                      typeItem.id
                    }
                    onClick={() =>
                      handleTypeChange(
                        typeItem.id
                      )
                    }
                    className={`rounded-2xl border px-2 py-3 text-center text-xs font-medium transition-all active:scale-95 ${
                      formData.type ===
                      typeItem.id
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                    type="button"
                    aria-pressed={
                      formData.type ===
                      typeItem.id
                    }
                  >
                    {
                      typeItem.label
                    }
                  </button>
                )
              )}
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
                0.1,
            }}
            className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Agência"
              value={
                formData.agency
              }
              onChange={(
                event
              ) =>
                handleChange(
                  "agency",
                  event.target.value
                )
              }
              placeholder="0000"
              error={
                errors.agency
              }
              required
            />

            <Input
              label="Conta / Dígito"
              value={
                formData.account
              }
              onChange={(
                event
              ) =>
                handleChange(
                  "account",
                  event.target.value
                )
              }
              placeholder="00000-0"
              error={
                errors.account
              }
              required
            />
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.15,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações (opcional)"
              value={
                formData.notes
              }
              onChange={(
                event
              ) =>
                handleChange(
                  "notes",
                  event.target.value
                )
              }
              placeholder="Ex: finalidade da conta, benefícios, observações sobre movimentação ou outras informações."
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/90 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting ||
              !activePersonId
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save
                size={16}
              />
            )}

            {isSubmitting
              ? "Salvando..."
              : "Salvar Conta"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}