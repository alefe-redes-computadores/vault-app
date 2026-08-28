// app/vaults/convites/page.tsx

"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useToast } from "@/components/ToastProvider";
import { useVaults } from "@/hooks/useVaults";
import { useHapticFeedback } from "@/lib/haptics";

import type {
  VaultMember,
  VaultPermission,
} from "@/lib/types";

function getPermissionLabel(
  permission: VaultPermission
): string {
  switch (permission) {
    case "admin":
      return "Administrador";

    case "edit":
      return "Pode editar";

    case "view":
      return "Somente leitura";

    default:
      return "Acesso";
  }
}

function getPermissionDescription(
  permission: VaultPermission
): string {
  switch (permission) {
    case "admin":
      return "Pode visualizar, editar conteúdo e gerenciar membros.";

    case "edit":
      return "Pode visualizar e editar o conteúdo compartilhado.";

    case "view":
      return "Pode visualizar o conteúdo, sem realizar alterações.";

    default:
      return "Acesso ao cofre compartilhado.";
  }
}

function formatInvitationDate(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

export default function VaultInvitesPage() {
  const router =
    useRouter();

  const { trigger } =
    useHapticFeedback();

  const {
    pendingInvites,
    activePersonId,
    respondToInvite,
  } = useVaults();

  const {
    showSuccess,
    showError,
    showLoading,
    updateToast,
  } = useToast();

  const [
    processingInviteId,
    setProcessingInviteId,
  ] = useState<
    string | null
  >(null);

  const [
    inviteToReject,
    setInviteToReject,
  ] = useState<
    VaultMember | null
  >(null);

  const [
    isRejecting,
    setIsRejecting,
  ] = useState(false);

  const sortedInvites =
    useMemo(() => {
      return [
        ...pendingInvites,
      ].sort((a, b) =>
        b.invited_at.localeCompare(
          a.invited_at
        )
      );
    }, [
      pendingInvites,
    ]);

  const isBusy =
    Boolean(
      processingInviteId
    ) || isRejecting;

  const handleBack = () => {
    if (isBusy) {
      return;
    }

    trigger("vibrate");
    router.back();
  };

  const handleAccept =
    async (
      invite: VaultMember
    ) => {
      if (
        !invite.id ||
        processingInviteId ||
        isRejecting
      ) {
        return;
      }

      if (!activePersonId) {
        trigger("error");

        showError(
          "Selecione uma pessoa antes de aceitar o convite."
        );

        return;
      }

      const toastId =
        showLoading(
          "Aceitando convite..."
        );

      try {
        setProcessingInviteId(
          invite.id
        );

        trigger("vibrate");

        await respondToInvite(
          invite.id,
          {
            status:
              "accepted",
            person_id:
              activePersonId,
          }
        );

        updateToast(
          toastId,
          {
            type: "success",
            message:
              "Convite aceito. O cofre foi vinculado à pessoa ativa.",
            duration: 3000,
          }
        );

        trigger("success");
      } catch (error) {
        console.error(
          "Erro ao aceitar convite de cofre:",
          error
        );

        updateToast(
          toastId,
          {
            type: "error",
            message:
              error instanceof
              Error
                ? error.message
                : "Não foi possível aceitar o convite.",
            duration: 4000,
          }
        );

        trigger("error");
      } finally {
        setProcessingInviteId(
          null
        );
      }
    };

  const handleRequestReject =
    (
      invite: VaultMember
    ) => {
      if (
        processingInviteId ||
        isRejecting
      ) {
        return;
      }

      trigger("vibrate");

      setInviteToReject(
        invite
      );
    };

  const handleCloseReject =
    () => {
      if (isRejecting) {
        return;
      }

      setInviteToReject(
        null
      );
    };

  const handleConfirmReject =
    async () => {
      if (
        !inviteToReject?.id ||
        isRejecting
      ) {
        return;
      }

      try {
        setIsRejecting(
          true
        );

        trigger("vibrate");

        await respondToInvite(
          inviteToReject.id,
          {
            status:
              "declined",
          }
        );

        trigger("success");

        showSuccess(
          "Convite recusado."
        );

        setInviteToReject(
          null
        );
      } catch (error) {
        console.error(
          "Erro ao recusar convite de cofre:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível recusar o convite."
        );
      } finally {
        setIsRejecting(
          false
        );
      }
    };

  if (!activePersonId) {
    return (
      <CardListSkeleton />
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-30 border-b border-surface-border bg-void/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
            <button
              type="button"
              onClick={
                handleBack
              }
              disabled={
                isBusy
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-surface-border bg-surface text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={20}
                aria-hidden="true"
              />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                Cofre familiar
              </p>

              <h1 className="truncate font-display text-xl font-bold text-ink-primary">
                Convites
              </h1>
            </div>

            {sortedInvites.length >
              0 && (
              <span className="flex min-w-8 items-center justify-center rounded-full border border-ice/20 bg-ice/10 px-2 py-1 text-xs font-bold text-ice">
                {
                  sortedInvites.length
                }
              </span>
            )}
          </div>
        </header>

        <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
          {sortedInvites.length ===
          0 ? (
            <EmptyState
              icon={Mail}
              title="Nenhum convite pendente"
              description="Quando alguém compartilhar um cofre com você, o convite aparecerá aqui."
              actionLabel="Voltar aos cofres"
              onAction={() => {
                trigger(
                  "vibrate"
                );

                router.replace(
                  "/vaults"
                );
              }}
            />
          ) : (
            <>
              <div className="rounded-[22px] border border-ice/20 bg-ice/10 p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-ice"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-sm font-semibold text-ink-primary">
                      Cofres compartilhados
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Ao aceitar, o cofre será associado à pessoa atualmente ativa no Vault. Você verá apenas os cofres compartilhados vinculados a essa pessoa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {sortedInvites.map(
                  (
                    invite,
                    index
                  ) => {
                    const isProcessing =
                      processingInviteId ===
                      invite.id;

                    const disabled =
                      isBusy &&
                      !isProcessing;

                    return (
                      <motion.article
                        key={
                          invite.id ??
                          `${invite.vault_id}-${invite.email}-${index}`
                        }
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          duration: 0.22,
                          delay:
                            Math.min(
                              index *
                                0.04,
                              0.2
                            ),
                        }}
                        className="overflow-hidden rounded-[24px] border border-surface-border bg-surface shadow-md"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                              <Mail
                                size={
                                  21
                                }
                                aria-hidden="true"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                                Convite para cofre
                              </p>

                              <h2 className="mt-1 truncate font-display text-base font-bold text-ink-primary">
                                {invite.name?.trim() ||
                                  "Cofre compartilhado"}
                              </h2>

                              <p className="mt-1 break-all text-xs text-ink-muted">
                                {
                                  invite.email
                                }
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-[18px] border border-surface-border bg-void/50 p-3.5">
                            <div className="flex items-start gap-3">
                              <UserRound
                                size={
                                  18
                                }
                                className="mt-0.5 shrink-0 text-ice"
                                aria-hidden="true"
                              />

                              <div>
                                <p className="text-sm font-semibold text-ink-primary">
                                  {getPermissionLabel(
                                    invite.permission
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                                  {getPermissionDescription(
                                    invite.permission
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                            <Clock3
                              size={
                                14
                              }
                              aria-hidden="true"
                            />

                            <span>
                              Convidado em{" "}
                              {formatInvitationDate(
                                invite.invited_at
                              )}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleRequestReject(
                                  invite
                                )
                              }
                              disabled={
                                isProcessing ||
                                disabled
                              }
                              className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-coral/20 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X
                                size={
                                  17
                                }
                                aria-hidden="true"
                              />

                              Recusar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleAccept(
                                  invite
                                )
                              }
                              disabled={
                                isProcessing ||
                                disabled
                              }
                              className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-ice px-4 py-3 text-sm font-bold text-void transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <>
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                                  Aceitando...
                                </>
                              ) : (
                                <>
                                  <Check
                                    size={
                                      17
                                    }
                                    aria-hidden="true"
                                  />
                                  Aceitar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  }
                )}
              </div>
            </>
          )}
        </section>

        <ConfirmationModal
          isOpen={
            Boolean(
              inviteToReject
            )
          }
          onClose={
            handleCloseReject
          }
          onConfirm={
            handleConfirmReject
          }
          title="Recusar convite?"
          message={
            <div className="space-y-2">
              <p>
                Você não terá acesso a este cofre compartilhado.
              </p>

              <p className="text-xs text-ink-faint">
                O proprietário poderá enviar um novo convite futuramente.
              </p>
            </div>
          }
          confirmLabel="Recusar convite"
          cancelLabel="Manter convite"
          type="danger"
          isLoading={
            isRejecting
          }
          closeOnBackdrop
        />
      </main>
    </PageTransition>
  );
}