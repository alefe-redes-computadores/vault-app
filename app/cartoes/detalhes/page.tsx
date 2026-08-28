// app/cartoes/detalhes/page.tsx
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
  Check,
  Copy,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";

import { useCards } from "@/hooks/useCards";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { decryptPassword } from "@/lib/crypto";
import {
  getBankLogoUrl,
  getBrandLabel,
} from "@/lib/utils/card-helper";

import { PageTransition } from "@/components/PageTransition";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useMounted } from "@/hooks/useMounted";

import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type { BankCard } from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

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

const formatCardNumber = (
  value: string
) => {
  const digits =
    value.replace(/\D/g, "");

  const match =
    digits.match(/.{1,4}/g);

  return match
    ? match.join(" ")
    : value;
};

const getCardTypeLabel = (
  type: BankCard["type"]
) => {
  if (
    type === "cartao_credito"
  ) {
    return "Cartão de Crédito";
  }

  if (
    type === "cartao_debito"
  ) {
    return "Cartão de Débito";
  }

  return "Registro bancário";
};

const isCardType = (
  type: BankCard["type"]
) => {
  return (
    type === "cartao_credito" ||
    type === "cartao_debito"
  );
};

const getBankStyle = (
  bankName: string
) => {
  const name =
    bankName.toLowerCase();

  if (name.includes("nubank")) {
    return "from-[#820ad1] to-[#590494] text-white";
  }

  if (
    name.includes("itaú") ||
    name.includes("itau")
  ) {
    return "from-[#ec7000] to-[#ff9900] text-white";
  }

  if (name.includes("inter")) {
    return "from-[#ff7a00] to-[#ff500f] text-white";
  }

  if (name.includes("c6")) {
    return "from-[#242424] to-[#000000] text-white border-white/10";
  }

  if (
    name.includes("bradesco")
  ) {
    return "from-[#cc092f] to-[#ff1a4a] text-white";
  }

  if (
    name.includes("santander")
  ) {
    return "from-[#cc0000] to-[#ff0000] text-white";
  }

  if (name.includes("caixa")) {
    return "from-[#005CA9] to-[#007cc7] text-white";
  }

  if (
    name.includes("brasil") ||
    name.includes("bb")
  ) {
    return "from-[#003da5] to-[#0052cc] text-white";
  }

  if (name.includes("xp")) {
    return "from-[#000000] to-[#1a1a1a] text-white";
  }

  if (
    name.includes("sicredi")
  ) {
    return "from-[#008736] to-[#00b046] text-white";
  }

  return "from-surface-raised to-surface border-surface-border/50 text-ink-primary";
};

/* ============================================================
   CONTEÚDO
   ============================================================ */

function CardDetailsContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const mounted =
    useMounted();

  const {
    deleteCard,
    getCard,
  } = useCards();

  const {
    authenticate,
  } = useBiometric({
    title:
      "Acessar Dados Sensíveis",
    subtitle:
      "Confirme sua identidade para visualizar ou copiar os dados protegidos do cartão.",
  });

  const getCardRef =
    useRef(getCard);

  useEffect(() => {
    getCardRef.current =
      getCard;
  }, [getCard]);

  const copiedTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | undefined
    >(undefined);

  const [card, setCard] =
    useState<BankCard | null>(
      null
    );

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

  const [
    showSensitive,
    setShowSensitive,
  ] = useState(false);

  const [
    copiedField,
    setCopiedField,
  ] = useState<
    string | null
  >(null);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

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
          !isCardType(
            item.type
          )
        ) {
          setInvalidRecord(
            true
          );
          return;
        }

        setCard(item);
      } catch (error) {
        console.error(
          "Erro ao carregar detalhes do cartão:",
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

  useEffect(() => {
    return () => {
      if (
        copiedTimeoutRef.current
      ) {
        clearTimeout(
          copiedTimeoutRef.current
        );
      }
    };
  }, []);

  if (!mounted) {
    return (
      <DetailSkeleton />
    );
  }

  const markAsCopied = (
    fieldName: string
  ) => {
    setCopiedField(
      fieldName
    );

    if (
      copiedTimeoutRef.current
    ) {
      clearTimeout(
        copiedTimeoutRef.current
      );
    }

    copiedTimeoutRef.current =
      setTimeout(() => {
        setCopiedField(null);
      }, 2500);
  };

  const copyToClipboard =
    async (
      text: string,
      fieldName: string,
      successMessage: string
    ) => {
      if (!text) {
        return;
      }

      trigger("vibrate");

      try {
        await navigator.clipboard.writeText(
          text
        );

        markAsCopied(
          fieldName
        );

        trigger("success");

        showToast(
          successMessage,
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao copiar:",
          error
        );

        trigger("error");

        showToast(
          "Não foi possível copiar.",
          "error"
        );
      }
    };

  const authenticateSensitive =
    async (): Promise<boolean> => {
      if (showSensitive) {
        return true;
      }

      const isAuthenticated =
        await authenticate();

      if (!isAuthenticated) {
        return false;
      }

      setShowSensitive(true);

      return true;
    };

  const handleToggleSensitive =
    async () => {
      trigger("vibrate");

      if (showSensitive) {
        setShowSensitive(false);
        return;
      }

      const isAuthenticated =
        await authenticate();

      if (!isAuthenticated) {
        return;
      }

      setShowSensitive(true);
    };

  const handleCopySensitive =
    async (
      text: string,
      fieldName: string,
      successMessage: string
    ) => {
      if (!text) {
        return;
      }

      const allowed =
        await authenticateSensitive();

      if (!allowed) {
        return;
      }

      await copyToClipboard(
        text,
        fieldName,
        successMessage
      );
    };

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleEdit = () => {
    if (!card?.id) {
      return;
    }

    trigger("vibrate");

    router.push(
      `/cartoes/editar?id=${encodeURIComponent(
        card.id
      )}`
    );
  };

  const handleRequestDelete =
    () => {
      trigger("vibrate");

      setShowDeleteModal(
        true
      );
    };

  const handleDelete =
    async () => {
      if (
        !id ||
        isDeleting
      ) {
        return;
      }

      trigger("vibrate");

      try {
        setIsDeleting(true);

        await deleteCard(id);

        trigger("success");

        showToast(
          "Cartão excluído com sucesso.",
          "success"
        );

        setShowDeleteModal(
          false
        );

        router.back();
      } catch (error) {
        console.error(
          "Erro ao excluir cartão:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error
            ? error.message
            : "Erro ao excluir cartão.",
          "error"
        );
      } finally {
        setIsDeleting(false);
      }
    };

  if (loading) {
    return (
      <DetailSkeleton />
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
                Cartão
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
              Este cartão pode ter sido removido ou o link utilizado não é mais válido.
            </p>

            <button
              type="button"
              onClick={
                handleBack
              }
              className="mt-6 min-h-11 rounded-2xl bg-ice px-5 py-3 text-sm font-semibold text-void transition-transform active:scale-95"
            >
              Voltar
            </button>
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
                Cartão
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
              Contas bancárias devem ser visualizadas pela área de Contas.
            </p>

            <button
              type="button"
              onClick={
                handleBack
              }
              className="mt-6 min-h-11 rounded-2xl bg-ice px-5 py-3 text-sm font-semibold text-void transition-transform active:scale-95"
            >
              Voltar
            </button>
          </section>
        </main>
      </PageTransition>
    );
  }

  if (!card) {
    return (
      <DetailSkeleton />
    );
  }

  const plainCardNumber =
    card.card_number_encrypted
      ? decryptPassword(
          card.card_number_encrypted
        )
      : "";

  const plainCvv =
    card.cvv_encrypted
      ? decryptPassword(
          card.cvv_encrypted
        )
      : "";

  const logoUrl =
    getBankLogoUrl(
      card.bank_name
    );

  const brandLabel =
    card.brand
      ? getBrandLabel(
          card.brand
        )
      : null;

  const cardStyle =
    getBankStyle(
      card.bank_name
    );

  const typeLabel =
    getCardTypeLabel(
      card.type
    );

  const maskedCardNumber =
    plainCardNumber
      ? `••••  ••••  ••••  ${plainCardNumber.slice(
          -4
        )}`
      : "";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <h1 className="max-w-[180px] truncate font-display text-lg font-semibold text-ink-primary">
                {card.title}
              </h1>

              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                <ShieldCheck
                  size={12}
                  className="text-ice"
                />
                Dados sensíveis criptografados
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={
                handleEdit
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              type="button"
              aria-label="Editar cartão"
            >
              <Edit3
                size={18}
              />
            </button>

            <button
              onClick={
                handleRequestDelete
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95"
              type="button"
              aria-label="Excluir cartão"
            >
              <Trash2
                size={18}
              />
            </button>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="relative w-full"
          >
            <div
              className={`absolute -inset-1 bg-gradient-to-br opacity-20 blur-2xl ${cardStyle}`}
            />

            <div
              className={`relative flex aspect-[1.58/1] w-full flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-2xl ${cardStyle}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                {logoUrl ? (
                  <div className="rounded-lg bg-white/90 p-1.5 backdrop-blur-md">
                    <img
                      src={
                        logoUrl
                      }
                      alt={
                        card.bank_name
                      }
                      className="h-5 object-contain mix-blend-multiply"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                ) : (
                  <span className="font-display text-lg font-bold">
                    {
                      card.bank_name
                    }
                  </span>
                )}

                {brandLabel && (
                  <span className="text-sm font-bold italic uppercase tracking-widest text-white/90">
                    {
                      brandLabel
                    }
                  </span>
                )}
              </div>

              {plainCardNumber && (
                <div className="relative z-10 mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-11 flex-col justify-around rounded-md border border-amber-600/50 bg-gradient-to-br from-amber-200 to-amber-500 p-1 shadow-inner">
                    <div className="h-[1px] w-full bg-amber-700/30" />
                    <div className="h-[1px] w-full bg-amber-700/30" />
                    <div className="h-[1px] w-full bg-amber-700/30" />
                  </div>

                  <Wifi
                    size={24}
                    className="rotate-90 text-white/60"
                  />
                </div>
              )}

              <div className="relative z-10 mt-auto space-y-2 pt-4">
                {plainCardNumber ? (
                  <div className="font-mono text-xl tracking-[0.12em] text-white drop-shadow-sm md:text-2xl">
                    {showSensitive
                      ? formatCardNumber(
                          plainCardNumber
                        )
                      : maskedCardNumber}
                  </div>
                ) : (
                  <div className="font-mono text-lg tracking-widest text-white/50">
                    NÚMERO NÃO INFORMADO
                  </div>
                )}

                <div className="flex items-end justify-between">
                  <div className="truncate pr-4 text-[10px] font-medium uppercase tracking-widest text-white/80">
                    {card.card_holder ||
                      "TITULAR DO CARTÃO"}
                  </div>

                  <div className="flex gap-4 text-right">
                    {card.expiry_date && (
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase tracking-wider text-white/60">
                          Validade
                        </span>

                        <span className="font-mono text-sm text-white">
                          {
                            card.expiry_date
                          }
                        </span>
                      </div>
                    )}

                    {plainCvv && (
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase tracking-wider text-white/60">
                          CVV
                        </span>

                        <span className="font-mono text-sm text-white">
                          {showSensitive
                            ? plainCvv
                            : "•••"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
            className="flex justify-center gap-3"
          >
            {(plainCardNumber ||
              plainCvv) && (
              <button
                onClick={
                  handleToggleSensitive
                }
                className={`flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                  showSensitive
                    ? "text-ice"
                    : "text-ink-muted hover:text-ink-primary"
                }`}
                type="button"
                aria-label={
                  showSensitive
                    ? "Ocultar dados"
                    : "Revelar dados"
                }
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                    showSensitive
                      ? "border-ice/30 bg-ice/15"
                      : "border-surface-border/50 bg-surface-raised"
                  }`}
                >
                  {showSensitive ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {showSensitive
                    ? "Ocultar"
                    : "Revelar"}
                </span>
              </button>
            )}

            {plainCardNumber && (
              <button
                onClick={() =>
                  handleCopySensitive(
                    plainCardNumber,
                    "card",
                    "Número do cartão copiado."
                  )
                }
                className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                type="button"
                aria-label="Copiar número do cartão"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  {copiedField ===
                  "card" ? (
                    <Check
                      size={18}
                      className="text-ice"
                    />
                  ) : (
                    <CreditCard
                      size={18}
                    />
                  )}
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Copiar Nº
                </span>
              </button>
            )}

            {plainCvv && (
              <button
                onClick={() =>
                  handleCopySensitive(
                    plainCvv,
                    "cvv",
                    "CVV copiado."
                  )
                }
                className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                type="button"
                aria-label="Copiar CVV"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  {copiedField ===
                  "cvv" ? (
                    <Check
                      size={18}
                      className="text-ice"
                    />
                  ) : (
                    <ShieldCheck
                      size={18}
                    />
                  )}
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Copiar CVV
                </span>
              </button>
            )}

            {card.account && (
              <button
                onClick={() =>
                  copyToClipboard(
                    card.account ?? "",
                    "account",
                    "Conta copiada."
                  )
                }
                className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                type="button"
                aria-label="Copiar conta"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  {copiedField ===
                  "account" ? (
                    <Check
                      size={18}
                      className="text-ice"
                    />
                  ) : (
                    <Landmark
                      size={18}
                    />
                  )}
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Copiar C/C
                </span>
              </button>
            )}
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.14,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <CreditCard
                  size={15}
                />
              }
              title="Cartão"
            />

            <DetailInfoRow
              icon={
                <CreditCard
                  size={14}
                />
              }
              iconClassName="bg-surface-raised text-ink-muted"
              label="Tipo"
            >
              <span className="text-sm font-semibold text-ink-primary">
                {
                  typeLabel
                }
              </span>
            </DetailInfoRow>

            {brandLabel && (
              <DetailInfoRow
                icon={
                  <ShieldCheck
                    size={14}
                  />
                }
                iconClassName="bg-surface-raised text-ink-muted"
                label="Bandeira"
              >
                <span className="text-sm font-semibold text-ink-primary">
                  {
                    brandLabel
                  }
                </span>
              </DetailInfoRow>
            )}
          </motion.div>

          {(card.agency ||
            card.account) && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.18,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Landmark
                    size={15}
                  />
                }
                title="Dados da Conta"
              />

              <div className="grid grid-cols-2 gap-3">
                {card.agency && (
                  <DetailInfoRow
                    icon={
                      <Landmark
                        size={14}
                      />
                    }
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Agência"
                    action={
                      <button
                        onClick={() =>
                          copyToClipboard(
                            card.agency ??
                              "",
                            "agency",
                            "Agência copiada."
                          )
                        }
                        className="p-1 text-ink-muted active:scale-95"
                        type="button"
                        aria-label="Copiar agência"
                      >
                        {copiedField ===
                        "agency" ? (
                          <Check
                            size={16}
                            className="text-ice"
                          />
                        ) : (
                          <Copy
                            size={16}
                          />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">
                      {
                        card.agency
                      }
                    </span>
                  </DetailInfoRow>
                )}

                {card.account && (
                  <DetailInfoRow
                    icon={
                      <Copy
                        size={14}
                      />
                    }
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Conta"
                    action={
                      <button
                        onClick={() =>
                          copyToClipboard(
                            card.account ??
                              "",
                            "account_only",
                            "Conta copiada."
                          )
                        }
                        className="p-1 text-ink-muted active:scale-95"
                        type="button"
                        aria-label="Copiar conta"
                      >
                        {copiedField ===
                        "account_only" ? (
                          <Check
                            size={16}
                            className="text-ice"
                          />
                        ) : (
                          <Copy
                            size={16}
                          />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">
                      {
                        card.account
                      }
                    </span>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {card.notes && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.22,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Edit3
                    size={15}
                  />
                }
                title="Anotações"
              />

              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {
                    card.notes
                  }
                </p>
              </div>
            </motion.div>
          )}
        </section>

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={() => {
            if (
              !isDeleting
            ) {
              setShowDeleteModal(
                false
              );
            }
          }}
          onConfirm={
            handleDelete
          }
          title="Excluir cartão"
          message="Tem certeza que deseja excluir este cartão do cofre?"
          confirmLabel={
            isDeleting
              ? "Excluindo..."
              : "Excluir"
          }
          cancelLabel="Cancelar"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function CardDetailsPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <CardDetailsContent />
    </Suspense>
  );
}