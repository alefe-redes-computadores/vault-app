// app/contas/editar/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  Save,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { getBankLogoUrl } from "@/lib/utils/card-helper";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

import { useSubmitAction } from "@/hooks/useSubmitAction";

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

type AccountTextField = Exclude<
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

const INITIAL_FORM_DATA: AccountFormState = {
  title: "",
  bank_name: "",
  type: "conta_corrente",
  agency: "",
  account: "",
  notes: "",
};

function isAccountType(
  type: string
): type is AccountType {
  return (
    type === "conta_corrente" ||
    type === "conta_poupanca" ||
    type === "conta_digital"
  );
}

function EditAccountContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const { trigger } =
    useHapticFeedback();

  const {
    getCard,
    updateCard,
  } = useCards();

  const {
    run,
    isSubmitting,
  } = useSubmitAction();

  const getCardRef =
    useRef(getCard);

  useEffect(() => {
    getCardRef.current =
      getCard;
  }, [getCard]);

  const isSubmitLocked =
    useRef(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    notFound,
    setNotFound,
  ] = useState(false);

  const [
    invalidRecord,
    setInvalidRecord,
  ] = useState(false);

  const [errors, setErrors] =
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
  ] = useState<AccountFormState>(
    INITIAL_FORM_DATA
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      if (!id) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }

        return;
      }

      try {
        const item =
          await getCardRef.current(
            id
          );

        if (cancelled) {
          return;
        }

        if (!item) {
          setNotFound(true);
          return;
        }

        if (
          !isAccountType(
            item.type
          )
        ) {
          setInvalidRecord(
            true
          );
          return;
        }

        setFormData({
          title:
            item.title || "",

          bank_name:
            item.bank_name || "",

          type:
            item.type,

          agency:
            item.agency || "",

          account:
            item.account || "",

          notes:
            item.notes || "",
        });
      } catch (error) {
        console.error(
          "Erro ao carregar conta para edição:",
          error
        );

        if (!cancelled) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const logoUrl =
    getBankLogoUrl(
      formData.bank_name
    );

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleChange = (
    field: AccountTextField,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
      }));
    }
  };

  const handleTypeChange = (
    type: AccountType
  ) => {
    trigger("vibrate");

    setFormData((previous) => ({
      ...previous,
      type,
    }));
  };

  const validateForm = () => {
    const newErrors: Partial<
      Record<
        AccountTextField,
        string
      >
    > = {};

    if (!formData.title.trim()) {
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

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0
    );
  };

  const handleSubmit = () => {
    if (!id) {
      return;
    }

    trigger("vibrate");

    if (!validateForm()) {
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
          await updateCard(
            id,
            {
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
            }
          );
        } finally {
          isSubmitLocked.current =
            false;
        }
      },
      {
        successMessage:
          "Conta atualizada com sucesso",
        errorMessage:
          "Erro ao atualizar conta",
        goBackOnSuccess: true,
      }
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2
          size={32}
          className="animate-spin text-ice"
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="min-h-[100dvh] bg-void">
          <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
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
                Editar Conta Bancária
              </h1>

              <p className="text-xs text-ink-muted">
                Registro não encontrado
              </p>
            </div>
          </header>

          <section className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface">
              <Wallet
                size={32}
                className="text-ink-faint"
              />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Conta não encontrada
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Esta conta pode ter sido removida ou o link utilizado não é mais válido.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={
                handleBack
              }
              className="mt-6"
            >
              Voltar
            </Button>
          </section>
        </main>
      </PageTransition>
    );
  }

  if (invalidRecord) {
    return (
      <PageTransition>
        <main className="min-h-[100dvh] bg-void">
          <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
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
                Editar Conta Bancária
              </h1>

              <p className="text-xs text-ink-muted">
                Tipo de registro incompatível
              </p>
            </div>
          </header>

          <section className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface">
              <Landmark
                size={32}
                className="text-ink-faint"
              />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Este registro não é uma conta
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Cartões devem ser editados pela área de Cartões para evitar alterações incorretas no tipo do registro.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={
                handleBack
              }
              className="mt-6"
            >
              Voltar
            </Button>
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-32">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button
            onClick={
              handleBack
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
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
              Editar Conta Bancária
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
                src={logoUrl}
                alt={`Logo ${formData.bank_name || "do banco"}`}
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
              label="Título"
              value={
                formData.title
              }
              onChange={(event) =>
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
              label="Nome do Banco"
              value={
                formData.bank_name
              }
              onChange={(event) =>
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
              delay: 0.05,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Tipo de Conta
            </p>

            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(
                (typeItem) => (
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
              delay: 0.1,
            }}
            className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Agência"
              value={
                formData.agency
              }
              onChange={(event) =>
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
              onChange={(event) =>
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
              delay: 0.15,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              value={
                formData.notes
              }
              onChange={(event) =>
                handleChange(
                  "notes",
                  event.target.value
                )
              }
              placeholder="Ex: finalidade da conta, benefícios, observações sobre movimentação ou outras informações."
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
              ? "Salvando alterações..."
              : "Salvar Alterações"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}

function EditAccountFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <Loader2
        size={32}
        className="animate-spin text-ice"
      />
    </div>
  );
}

export default function EditAccountPage() {
  return (
    <Suspense
      fallback={
        <EditAccountFallback />
      }
    >
      <EditAccountContent />
    </Suspense>
  );
}