// app/cartoes/editar/page.tsx
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
  CreditCard,
  Landmark,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryDate,
  getBankLogoUrl,
  getBrandLabel,
} from "@/lib/utils/card-helper";
import {
  decryptPassword,
} from "@/lib/crypto";

import type {
  CardUpdateInput,
} from "@/lib/repositories/cards";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useSubmitAction } from "@/hooks/useSubmitAction";

type CardFormType =
  | "cartao_credito"
  | "cartao_debito";

interface CardFormState {
  title: string;
  bank_name: string;
  type: CardFormType;
  card_number: string;
  card_holder: string;
  expiry_date: string;
  cvv: string;
  agency: string;
  account: string;
  notes: string;
}

type TextFormField = Exclude<
  keyof CardFormState,
  "type"
>;

interface SensitiveFields {
  card_number: string;
  cvv: string;
}

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

const CARD_TYPES: Array<{
  id: CardFormType;
  label: string;
}> = [
  {
    id: "cartao_credito",
    label: "Cartão de Crédito",
  },
  {
    id: "cartao_debito",
    label: "Cartão de Débito",
  },
];

const INITIAL_FORM_DATA: CardFormState = {
  title: "",
  bank_name: "",
  type: "cartao_credito",
  card_number: "",
  card_holder: "",
  expiry_date: "",
  cvv: "",
  agency: "",
  account: "",
  notes: "",
};

function isCardType(
  type: string
): type is CardFormType {
  return (
    type === "cartao_credito" ||
    type === "cartao_debito"
  );
}

function EditCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");

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

  /*
   * Mantemos a função atual em um ref para o carregamento
   * depender somente do ID.
   *
   * Isso evita que uma nova referência de getCard em cada render
   * faça o efeito de carregamento executar repetidamente.
   */
  const getCardRef = useRef(getCard);

  useEffect(() => {
    getCardRef.current = getCard;
  }, [getCard]);

  const isSubmitLocked =
    useRef(false);

  const originalSensitiveFields =
    useRef<SensitiveFields>({
      card_number: "",
      cvv: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [notFound, setNotFound] =
    useState(false);

  const [invalidRecord, setInvalidRecord] =
    useState(false);

  const [errors, setErrors] = useState<
    Partial<Record<TextFormField, string>>
  >({});

  const [formData, setFormData] =
    useState<CardFormState>(
      INITIAL_FORM_DATA
    );

  useEffect(() => {
    let cancelled = false;

    async function loadCard() {
      if (!id) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }

        return;
      }

      try {
        const item =
          await getCardRef.current(id);

        if (cancelled) {
          return;
        }

        if (!item) {
          setNotFound(true);
          return;
        }

        if (!isCardType(item.type)) {
          setInvalidRecord(true);
          return;
        }

        const decryptedCardNumber =
          item.card_number_encrypted
            ? decryptPassword(
                item.card_number_encrypted
              )
            : "";

        const decryptedCvv =
          item.cvv_encrypted
            ? decryptPassword(
                item.cvv_encrypted
              )
            : "";

        const formattedCardNumber =
          decryptedCardNumber
            ? formatCardNumber(
                decryptedCardNumber
              )
            : "";

        originalSensitiveFields.current = {
          card_number:
            formattedCardNumber,
          cvv: decryptedCvv,
        };

        setFormData({
          title:
            item.title || "",

          bank_name:
            item.bank_name || "",

          type:
            item.type,

          card_number:
            formattedCardNumber,

          card_holder:
            item.card_holder || "",

          expiry_date:
            item.expiry_date || "",

          cvv:
            decryptedCvv,

          agency:
            item.agency || "",

          account:
            item.account || "",

          notes:
            item.notes || "",
        });
      } catch (error) {
        console.error(
          "Erro ao carregar cartão para edição:",
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

    loadCard();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const detectedBrand =
    detectCardBrand(
      formData.card_number
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
    field: TextFormField,
    value: string
  ) => {
    let formattedValue = value;

    if (field === "card_number") {
      formattedValue =
        formatCardNumber(value);
    }

    if (field === "expiry_date") {
      formattedValue =
        formatExpiryDate(value);
    }

    setFormData((previous) => ({
      ...previous,
      [field]: formattedValue,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
      }));
    }
  };

  const handleTypeChange = (
    type: CardFormType
  ) => {
    trigger("vibrate");

    setFormData((previous) => ({
      ...previous,
      type,
    }));
  };

  const validateForm = () => {
    const newErrors: Partial<
      Record<TextFormField, string>
    > = {};

    if (!formData.title.trim()) {
      newErrors.title =
        "O título é obrigatório";
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name =
        "O nome do banco é obrigatório";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
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

    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          const changes: CardUpdateInput = {
            title:
              formData.title.trim(),

            bank_name:
              formData.bank_name.trim(),

            type:
              formData.type,

            card_holder:
              formData.card_holder.trim(),

            brand:
              detectedBrand,

            expiry_date:
              formData.expiry_date.trim(),

            agency:
              formData.agency.trim(),

            account:
              formData.account.trim(),

            notes:
              formData.notes.trim(),
          };

          /*
           * Só enviamos número/CVV para o repository
           * quando realmente foram alterados.
           *
           * Assim evitamos descriptografar e gerar um novo
           * ciphertext sem necessidade em toda edição.
           *
           * Se o usuário apagar o campo, "" é enviado e o
           * repository remove o valor criptografado.
           */
          if (
            formData.card_number !==
            originalSensitiveFields.current
              .card_number
          ) {
            changes.card_number =
              formData.card_number.trim();
          }

          if (
            formData.cvv !==
            originalSensitiveFields.current.cvv
          ) {
            changes.cvv =
              formData.cvv.trim();
          }

          await updateCard(
            id,
            changes
          );
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage:
          "Cartão atualizado com sucesso",
        errorMessage:
          "Erro ao atualizar cartão",
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
              onClick={handleBack}
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
                Editar Cartão
              </h1>

              <p className="text-xs text-ink-muted">
                Registro não encontrado
              </p>
            </div>
          </header>

          <section className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface">
              <CreditCard
                size={32}
                className="text-ink-faint"
              />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Cartão não encontrado
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Este cartão pode ter sido removido
              ou o link utilizado não é mais válido.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={handleBack}
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
              onClick={handleBack}
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
                Editar Cartão
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
              Este registro não é um cartão
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Contas bancárias devem ser editadas
              pela área de Contas para evitar
              alterações incorretas no tipo do registro.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={handleBack}
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
            onClick={handleBack}
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
              Editar Cartão
            </h1>

            <p className="flex items-center gap-1 text-xs text-ink-muted">
              <ShieldCheck
                size={12}
                className="text-ice"
              />
              Dados sensíveis criptografados
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
                onError={(event) => {
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
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Título"
              value={formData.title}
              onChange={(event) =>
                handleChange(
                  "title",
                  event.target.value
                )
              }
              error={errors.title}
              required
            />

            <Input
              label="Nome do Banco"
              value={formData.bank_name}
              onChange={(event) =>
                handleChange(
                  "bank_name",
                  event.target.value
                )
              }
              error={errors.bank_name}
              required
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.05,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Tipo de Cartão
            </p>

            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.map(
                (typeItem) => (
                  <button
                    key={typeItem.id}
                    onClick={() =>
                      handleTypeChange(
                        typeItem.id
                      )
                    }
                    className={`rounded-2xl border px-3 py-3 text-left text-xs font-medium transition-all active:scale-95 ${
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
                    {typeItem.label}
                  </button>
                )
              )}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.1,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="relative">
              <Input
                label="Número do Cartão"
                value={
                  formData.card_number
                }
                onChange={(event) =>
                  handleChange(
                    "card_number",
                    event.target.value
                  )
                }
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                autoComplete="cc-number"
              />

              {detectedBrand !==
                "unknown" && (
                <div className="absolute right-3 top-9 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-1 text-[11px] font-semibold text-ice">
                  {getBrandLabel(
                    detectedBrand
                  )}
                </div>
              )}
            </div>

            <Input
              label="Nome Impresso no Cartão"
              value={
                formData.card_holder
              }
              onChange={(event) =>
                handleChange(
                  "card_holder",
                  event.target.value.toUpperCase()
                )
              }
              placeholder="NOME COMO NO CARTÃO"
              autoComplete="cc-name"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Validade"
                value={
                  formData.expiry_date
                }
                onChange={(event) =>
                  handleChange(
                    "expiry_date",
                    event.target.value
                  )
                }
                placeholder="MM/AA"
                inputMode="numeric"
                autoComplete="cc-exp"
              />

              <Input
                label="CVV"
                value={formData.cvv}
                onChange={(event) =>
                  handleChange(
                    "cvv",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4)
                  )
                }
                placeholder="123"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.15,
            }}
            className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Agência"
              value={formData.agency}
              onChange={(event) =>
                handleChange(
                  "agency",
                  event.target.value
                )
              }
            />

            <Input
              label="Conta / Dígito"
              value={formData.account}
              onChange={(event) =>
                handleChange(
                  "account",
                  event.target.value
                )
              }
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.2,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              value={formData.notes}
              onChange={(event) =>
                handleChange(
                  "notes",
                  event.target.value
                )
              }
              placeholder="Ex: limite, benefícios, vencimento da fatura ou outras observações."
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
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

function EditCardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <Loader2
        size={32}
        className="animate-spin text-ice"
      />
    </div>
  );
}

export default function EditCardPage() {
  return (
    <Suspense
      fallback={
        <EditCardFallback />
      }
    >
      <EditCardContent />
    </Suspense>
  );
}