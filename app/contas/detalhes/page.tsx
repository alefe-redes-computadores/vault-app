// app/contas/detalhes/page.tsx
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
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  Landmark,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";

import { useCards } from "@/hooks/useCards";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { getBankLogoUrl } from "@/lib/utils/card-helper";

import { PageTransition } from "@/components/PageTransition";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useMounted } from "@/hooks/useMounted";

import type { BankCard } from "@/lib/types";

import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

/* ============================================================
   TIPOS
   ============================================================ */

type AccountType =
  | "conta_corrente"
  | "conta_poupanca"
  | "conta_digital";

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

function isAccountType(
  type: BankCard["type"]
): type is AccountType {
  return (
    type === "conta_corrente" ||
    type === "conta_poupanca" ||
    type === "conta_digital"
  );
}

function getAccountTypeLabel(
  type: AccountType
): string {
  switch (type) {
    case "conta_corrente":
      return "Conta Corrente";

    case "conta_poupanca":
      return "Conta Poupança";

    case "conta_digital":
      return "Conta Digital";

    default:
      return "Conta Bancária";
  }
}

function getBankStyle(
  bankName: string
): string {
  const name =
    bankName.toLocaleLowerCase(
      "pt-BR"
    );

  if (
    name.includes("nubank")
  ) {
    return "from-[#820ad1] to-[#590494] text-white";
  }

  if (
    name.includes("itaú") ||
    name.includes("itau")
  ) {
    return "from-[#ec7000] to-[#ff9900] text-white";
  }

  if (
    name.includes("inter")
  ) {
    return "from-[#ff7a00] to-[#ff500f] text-white";
  }

  if (
    name.includes("c6")
  ) {
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

  if (
    name.includes("caixa")
  ) {
    return "from-[#005CA9] to-[#007cc7] text-white";
  }

  if (
    name.includes("brasil") ||
    name === "bb" ||
    name.includes(
      "banco do brasil"
    )
  ) {
    return "from-[#003da5] to-[#0052cc] text-white";
  }

  if (
    name.includes("xp")
  ) {
    return "from-[#000000] to-[#1a1a1a] text-white";
  }

  if (
    name.includes("sicredi")
  ) {
    return "from-[#008736] to-[#00b046] text-white";
  }

  return "from-surface-raised to-surface border-surface-border/50 text-ink-primary";
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function AccountDetailsContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const {
    trigger,
  } = useHapticFeedback();

  const {
    showToast,
  } = useToast();

  const {
    activePersonId,
  } = useActivePersonId();

  const {
    deleteCard,
    getCard,
  } = useCards();

  const mounted =
    useMounted();

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
      > | null
    >(null);

  const [
    account,
    setAccount,
  ] = useState<BankCard | null>(
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
    copiedField,
    setCopiedField,
  ] = useState<string | null>(
    null
  );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] = useState(false);

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

        /*
         * Regra de pessoa:
         *
         * - se o registro já tem person_id, ele precisa pertencer
         *   à pessoa ativa;
         *
         * - registros antigos sem person_id continuam acessíveis
         *   por compatibilidade de legado.
         */
        if (
          activePersonId &&
          item.person_id &&
          item.person_id !==
            activePersonId
        ) {
          setNotFound(true);
          return;
        }

        setAccount(item);
      } catch (error) {
        console.error(
          "Erro ao carregar detalhes da conta:",
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
  }, [
    id,
    activePersonId,
  ]);

  const handleBack = () => {
    trigger("vibrate");

    router.back();
  };

  const handleCopy =
    async (
      text: string,
      fieldName: string,
      successMessage: string
    ) => {
      trigger("vibrate");

      try {
        await navigator.clipboard.writeText(
          text
        );

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
          setTimeout(
            () => {
              setCopiedField(
                null
              );
            },
            2500
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

  const handleEdit = () => {
    if (!account?.id) {
      return;
    }

    trigger("vibrate");

    router.push(
      `/contas/editar?id=${encodeURIComponent(
        account.id
      )}`
    );
  };

  const handleNewAccount =
    () => {
      trigger("vibrate");

      setIsMenuFlutuanteOpen(
        false
      );

      router.push(
        "/contas/novo"
      );
    };

  const handleDelete =
    async () => {
      if (
        !account?.id ||
        isDeleting
      ) {
        return;
      }

      trigger("vibrate");

      try {
        setIsDeleting(true);

        await deleteCard(
          account.id
        );

        trigger("success");

        showToast(
          "Conta excluída com sucesso.",
          "success"
        );

        setShowDeleteModal(
          false
        );

        router.back();
      } catch (error) {
        console.error(
          "Erro ao excluir conta:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error
            ? error.message
            : "Erro ao excluir conta.",
          "error"
        );
      } finally {
        setIsDeleting(false);
      }
    };

  const handleCloseDelete =
    () => {
      if (isDeleting) {
        return;
      }

      setShowDeleteModal(
        false
      );
    };

  if (
    !mounted ||
    loading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
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
                Conta Bancária
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
              Esta conta não existe, foi removida ou pertence a outra pessoa do Vault.
            </p>

            <button
              type="button"
              onClick={
                handleBack
              }
              className="mt-6 rounded-2xl bg-ice px-6 py-3 text-sm font-semibold text-void transition-all active:scale-95"
            >
              Voltar
            </button>
          </section>
        </main>
      </PageTransition>
    );
  }

  if (
    invalidRecord ||
    !account
  ) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
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
                Conta Bancária
              </h1>

              <p className="text-xs text-ink-muted">
                Tipo incompatível
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
              Cartões devem ser acessados pela área de Cartões para manter cada tipo de registro no fluxo correto.
            </p>

            <button
              type="button"
              onClick={
                handleBack
              }
              className="mt-6 rounded-2xl bg-ice px-6 py-3 text-sm font-semibold text-void transition-all active:scale-95"
            >
              Voltar
            </button>
          </section>
        </main>
      </PageTransition>
    );
  }

  const logoUrl =
    getBankLogoUrl(
      account.bank_name
    );

  const accountStyle =
    getBankStyle(
      account.bank_name
    );

  const accountTypeLabel =
    getAccountTypeLabel(
      account.type as AccountType
    );

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* =====================================================
            HEADER
            ===================================================== */}
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
                {account.title}
              </h1>

              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                <ShieldCheck
                  size={12}
                  className="text-ice"
                />

                Dados organizados no cofre
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsMenuFlutuanteOpen(
                    (
                      previous
                    ) =>
                      !previous
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all hover:bg-ice/20 active:scale-95"
                type="button"
                aria-label="Ações da conta"
                aria-expanded={
                  isMenuFlutuanteOpen
                }
              >
                <Plus
                  size={18}
                />
              </button>

              <AnimatePresence>
                {isMenuFlutuanteOpen && (
                  <>
                    <motion.div
                      initial={{
                        opacity:
                          0,
                      }}
                      animate={{
                        opacity:
                          1,
                      }}
                      exit={{
                        opacity:
                          0,
                      }}
                      transition={{
                        duration:
                          0.16,
                      }}
                      onClick={() =>
                        setIsMenuFlutuanteOpen(
                          false
                        )
                      }
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    />

                    <motion.div
                      initial={{
                        opacity:
                          0,
                        y: 10,
                        scale:
                          0.95,
                      }}
                      animate={{
                        opacity:
                          1,
                        y: 0,
                        scale:
                          1,
                      }}
                      exit={{
                        opacity:
                          0,
                        y: 10,
                        scale:
                          0.95,
                      }}
                      transition={{
                        duration:
                          0.18,
                        ease: [
                          0.16,
                          1,
                          0.3,
                          1,
                        ],
                      }}
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                          Ações
                        </p>
                      </div>

                      <div className="space-y-1 px-1.5 pb-2">
                        <button
                          type="button"
                          onClick={
                            handleNewAccount
                          }
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                            <Landmark
                              size={
                                15
                              }
                            />
                          </div>

                          <span className="text-sm font-medium text-ink-primary">
                            Nova Conta
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuFlutuanteOpen(
                              false
                            );

                            handleEdit();
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                            <Edit3
                              size={
                                15
                              }
                            />
                          </div>

                          <span className="text-sm font-medium text-ink-primary">
                            Editar Conta
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={
                handleEdit
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              type="button"
              aria-label="Editar conta"
            >
              <Edit3
                size={18}
              />
            </button>

            <button
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setShowDeleteModal(
                  true
                );
              }}
              disabled={
                isDeleting
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95 disabled:opacity-50"
              type="button"
              aria-label="Excluir conta"
            >
              <Trash2
                size={18}
              />
            </button>
          </div>
        </header>

        {/* =====================================================
            CONTEÚDO
            ===================================================== */}
        <section className="space-y-6 px-5 pt-6">
          {/* Cartão visual da conta */}
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="relative w-full"
          >
            <div
              className={`absolute -inset-1 bg-gradient-to-br opacity-20 blur-2xl ${accountStyle}`}
            />

            <div
              className={`relative flex aspect-[1.58/1] w-full flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-2xl ${accountStyle}`}
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
                        account.bank_name
                      }
                      className="h-5 max-w-[90px] object-contain mix-blend-multiply"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                ) : (
                  <span className="truncate font-display text-lg font-bold">
                    {
                      account.bank_name
                    }
                  </span>
                )}

                <span className="shrink-0 text-right text-[10px] font-bold uppercase tracking-widest text-white/80">
                  {
                    accountTypeLabel
                  }
                </span>
              </div>

              <div className="relative z-10 mt-auto space-y-2 pt-4">
                <div className="font-mono text-xl tracking-wider text-white/90 sm:text-2xl">
                  {account.account
                    ? `Conta ${account.account}`
                    : "Conta não informada"}
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0 text-[10px] font-medium uppercase tracking-widest text-white/80">
                    <span className="block truncate">
                      {
                        account.bank_name
                      }
                    </span>
                  </div>

                  {account.agency && (
                    <div className="shrink-0 text-right">
                      <span className="block text-[7px] uppercase tracking-wider text-white/60">
                        Agência
                      </span>

                      <span className="font-mono text-sm text-white">
                        {
                          account.agency
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Ações rápidas */}
          {(account.agency ||
            account.account) && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.1,
              }}
              className="flex justify-center gap-5"
            >
              {account.agency && (
                <button
                  onClick={() =>
                    handleCopy(
                      account.agency!,
                      "agency",
                      "Agência copiada."
                    )
                  }
                  className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                  type="button"
                  aria-label="Copiar agência"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                    {copiedField ===
                    "agency" ? (
                      <Check
                        size={
                          18
                        }
                        className="text-ice"
                      />
                    ) : (
                      <Landmark
                        size={
                          18
                        }
                      />
                    )}
                  </div>

                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Copiar Agência
                  </span>
                </button>
              )}

              {account.account && (
                <button
                  onClick={() =>
                    handleCopy(
                      account.account!,
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
                        size={
                          18
                        }
                        className="text-ice"
                      />
                    ) : (
                      <Copy
                        size={
                          18
                        }
                      />
                    )}
                  </div>

                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Copiar Conta
                  </span>
                </button>
              )}
            </motion.div>
          )}

          {/* Tipo */}
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
                <Wallet
                  size={
                    15
                  }
                />
              }
              title="Conta"
            />

            <DetailInfoRow
              icon={
                <Wallet
                  size={
                    14
                  }
                />
              }
              iconClassName="bg-ice/10 text-ice"
              label="Tipo"
            >
              <span className="text-sm font-semibold text-ink-primary">
                {
                  accountTypeLabel
                }
              </span>
            </DetailInfoRow>
          </motion.div>

          {/* Dados bancários */}
          {(account.agency ||
            account.account) && (
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
                    size={
                      15
                    }
                  />
                }
                title="Dados da Conta"
              />

              <div className="grid grid-cols-2 gap-3">
                {account.agency && (
                  <DetailInfoRow
                    icon={
                      <Landmark
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Agência"
                    action={
                      <button
                        onClick={() =>
                          handleCopy(
                            account.agency!,
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
                            size={
                              16
                            }
                            className="text-ice"
                          />
                        ) : (
                          <Copy
                            size={
                              16
                            }
                          />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">
                      {
                        account.agency
                      }
                    </span>
                  </DetailInfoRow>
                )}

                {account.account && (
                  <DetailInfoRow
                    icon={
                      <Copy
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Conta"
                    action={
                      <button
                        onClick={() =>
                          handleCopy(
                            account.account!,
                            "account",
                            "Conta copiada."
                          )
                        }
                        className="p-1 text-ink-muted active:scale-95"
                        type="button"
                        aria-label="Copiar conta"
                      >
                        {copiedField ===
                        "account" ? (
                          <Check
                            size={
                              16
                            }
                            className="text-ice"
                          />
                        ) : (
                          <Copy
                            size={
                              16
                            }
                          />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">
                      {
                        account.account
                      }
                    </span>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {/* Anotações */}
          {account.notes && (
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
                    size={
                      15
                    }
                  />
                }
                title="Anotações"
              />

              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {
                    account.notes
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
          onClose={
            handleCloseDelete
          }
          onConfirm={
            handleDelete
          }
          title="Excluir conta"
          message="Tem certeza que deseja excluir esta conta bancária?"
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

export default function AccountDetailsPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <AccountDetailsContent />
    </Suspense>
  );
}