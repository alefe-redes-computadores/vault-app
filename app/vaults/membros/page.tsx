// app/vaults/membros/page.tsx

"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Check,
  Edit,
  Eye,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { useVaults } from "@/hooks/useVaults";
import { useMounted } from "@/hooks/useMounted";

import { useHapticFeedback } from "@/lib/haptics";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";

import type {
  VaultMember,
  VaultMemberStatus,
  VaultPermission,
} from "@/lib/types";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

interface PermissionOption {
  id: VaultPermission;
  label: string;
  description: string;
  icon: LucideIcon;
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  {
    id: "view",
    label: "Visualizar",
    description:
      "Pode visualizar o conteúdo compartilhado.",
    icon: Eye,
  },
  {
    id: "edit",
    label: "Editar",
    description:
      "Pode visualizar e alterar o conteúdo do cofre.",
    icon: Edit,
  },
  {
    id: "admin",
    label: "Admin",
    description:
      "Pode editar conteúdo e gerenciar membros.",
    icon: Shield,
  },
];

const PERMISSION_TONE: Record<
  VaultPermission,
  string
> = {
  view:
    "bg-surface-raised text-ink-muted",
  edit:
    "bg-ice/10 text-ice",
  admin:
    "bg-violet-500/15 text-violet-300",
};

const STATUS_TONE: Record<
  VaultMemberStatus,
  string
> = {
  accepted:
    "bg-emerald-500/15 text-emerald-300",
  pending:
    "bg-ice/10 text-ice",
  declined:
    "bg-coral/15 text-coral",
};

// ============================================================
// HELPERS
// ============================================================

function getPermissionOption(
  permission: VaultPermission
): PermissionOption {
  return (
    PERMISSION_OPTIONS.find(
      (option) =>
        option.id === permission
    ) ?? PERMISSION_OPTIONS[0]
  );
}

function getMemberInitial(
  member: VaultMember
): string {
  const source =
    member.name?.trim() ||
    member.email.trim();

  return (
    source
      .charAt(0)
      .toUpperCase() || "?"
  );
}

function getMemberStatusLabel(
  status: VaultMember["status"]
): string {
  if (status === "accepted") {
    return "Aceito";
  }

  if (status === "pending") {
    return "Pendente";
  }

  return "Recusado";
}

// ============================================================
// CONTENT
// ============================================================

function VaultMembersContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const mounted =
    useMounted();

  const { trigger } =
    useHapticFeedback();

  const {
    showSuccess,
    showError,
  } = useToast();

  const vaultId =
    searchParams.get("cofre_id") ??
    "";

  const {
    activePersonId,
    getAccess,
    getMembers,
    addMember,
    updateMemberPermission,
    deleteMember,
  } = useVaults();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    permission,
    setPermission,
  ] =
    useState<VaultPermission>(
      "view"
    );

  const [
    isAdding,
    setIsAdding,
  ] = useState(false);

  const [
    updatingMemberId,
    setUpdatingMemberId,
  ] = useState<
    string | null
  >(null);

  const [
    deletingMemberId,
    setDeletingMemberId,
  ] = useState<
    string | null
  >(null);

  const [
    memberToDelete,
    setMemberToDelete,
  ] =
    useState<VaultMember | null>(
      null
    );

  const access =
    useLiveQuery(
      async () => {
        if (!vaultId) {
          return null;
        }

        return getAccess(
          vaultId
        );
      },
      [
        vaultId,
        getAccess,
      ],
      undefined
    );

  const members =
    useLiveQuery(
      async () => {
        if (
          !vaultId ||
          !access
        ) {
          return [];
        }

        return getMembers(
          vaultId
        );
      },
      [
        vaultId,
        access,
        getMembers,
      ],
      undefined
    );

  const belongsToActivePerson =
    useMemo(() => {
      if (
        !access ||
        !activePersonId
      ) {
        return false;
      }

      if (
        access.role ===
        "owner"
      ) {
        return (
          access.vault
            .person_id ===
          activePersonId
        );
      }

      return (
        access.membership
          ?.person_id ===
        activePersonId
      );
    }, [
      access,
      activePersonId,
    ]);

  const canManageMembers =
    belongsToActivePerson &&
    (access?.role ===
      "owner" ||
      access?.role ===
        "admin");

  const visibleMembers =
    useMemo(() => {
      if (!members) {
        return [];
      }

      return [...members].sort(
        (a, b) => {
          const statusWeight: Record<
            VaultMemberStatus,
            number
          > = {
            accepted: 0,
            pending: 1,
            declined: 2,
          };

          const byStatus =
            statusWeight[
              a.status
            ] -
            statusWeight[
              b.status
            ];

          if (byStatus !== 0) {
            return byStatus;
          }

          return a.email.localeCompare(
            b.email
          );
        }
      );
    }, [members]);

  const acceptedCount =
    visibleMembers.filter(
      (member) =>
        member.status ===
        "accepted"
    ).length;

  const pendingCount =
    visibleMembers.filter(
      (member) =>
        member.status ===
        "pending"
    ).length;

  const totalPeople =
    acceptedCount + 1;

  const isBusy =
    isAdding ||
    updatingMemberId !==
      null ||
    deletingMemberId !==
      null;

  if (
    !mounted ||
    access === undefined ||
    members === undefined ||
    !activePersonId
  ) {
    return (
      <CardListSkeleton />
    );
  }

  if (
    !access ||
    !belongsToActivePerson
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Users
                size={24}
                className="text-ink-muted"
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-lg font-semibold text-ink-primary">
              Cofre não disponível
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Este cofre não pertence à pessoa ativa ou sua conta não possui acesso a ele.
            </p>

            <Button
              type="button"
              variant="primary"
              className="mt-6"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.replace(
                  "/vaults"
                );
              }}
            >
              Voltar para cofres
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  if (!canManageMembers) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Shield
                size={24}
                className="text-ink-muted"
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-lg font-semibold text-ink-primary">
              Gerenciamento restrito
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Apenas o proprietário ou um administrador pode convidar, remover ou alterar as permissões dos membros deste cofre.
            </p>

            <Button
              type="button"
              variant="primary"
              className="mt-6"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const handleAddMember =
    async () => {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail ||
        !normalizedEmail.includes(
          "@"
        )
      ) {
        trigger("error");

        showError(
          "Digite um e-mail válido."
        );

        return;
      }

      if (
        isBusy ||
        !vaultId
      ) {
        return;
      }

      try {
        setIsAdding(true);

        trigger("vibrate");

        await addMember({
          vault_id:
            vaultId,
          email:
            normalizedEmail,
          name:
            normalizedEmail.split(
              "@"
            )[0],
          permission,
        });

        trigger("success");

        showSuccess(
          "Convite enviado com sucesso."
        );

        setEmail("");
        setPermission("view");
      } catch (error) {
        console.error(
          "Erro ao convidar membro:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o convite."
        );
      } finally {
        setIsAdding(false);
      }
    };

  const handlePermissionChange =
    async (
      member: VaultMember,
      nextPermission: VaultPermission
    ) => {
      if (
        !member.id ||
        member.status !==
          "accepted" ||
        member.permission ===
          nextPermission ||
        isBusy
      ) {
        return;
      }

      try {
        setUpdatingMemberId(
          member.id
        );

        trigger("vibrate");

        await updateMemberPermission(
          member.id,
          {
            permission:
              nextPermission,
          }
        );

        trigger("success");

        showSuccess(
          "Permissão atualizada."
        );
      } catch (error) {
        console.error(
          "Erro ao atualizar permissão:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a permissão."
        );
      } finally {
        setUpdatingMemberId(
          null
        );
      }
    };

  const handleRequestDeleteMember =
    (
      member: VaultMember
    ) => {
      if (
        !member.id ||
        isBusy
      ) {
        return;
      }

      trigger("vibrate");

      setMemberToDelete(
        member
      );
    };

  const handleCloseDeleteModal =
    () => {
      if (
        deletingMemberId !==
        null
      ) {
        return;
      }

      setMemberToDelete(
        null
      );
    };

  const handleDeleteMember =
    async () => {
      if (
        !memberToDelete?.id ||
        isBusy
      ) {
        return;
      }

      const memberId =
        memberToDelete.id;

      const wasPending =
        memberToDelete.status ===
        "pending";

      try {
        setDeletingMemberId(
          memberId
        );

        trigger("vibrate");

        await deleteMember(
          memberId
        );

        trigger("success");

        showSuccess(
          wasPending
            ? "Convite cancelado."
            : "Membro removido do cofre."
        );

        setMemberToDelete(
          null
        );
      } catch (error) {
        console.error(
          "Erro ao remover membro:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível remover o membro."
        );
      } finally {
        setDeletingMemberId(
          null
        );
      }
    };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                isBusy
              }
              onClick={() => {
                if (isBusy) {
                  return;
                }

                trigger(
                  "vibrate"
                );

                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
                aria-hidden="true"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>

              <h1 className="max-w-[220px] truncate font-display text-xl font-semibold text-ink-primary">
                Membros
              </h1>

              <p className="truncate text-sm text-ink-muted">
                {
                  access.vault
                    .name
                }
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.26,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <UserPlus
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h3 className="font-display text-sm font-semibold text-ink-primary">
                  Convidar membro
                </h3>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Envie um convite com a permissão adequada. A pessoa convidada deverá aceitar o acesso na própria conta.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />

                <Input
                  label="E-mail do convidado"
                  placeholder="nome@email.com"
                  value={email}
                  disabled={
                    isBusy
                  }
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  className="pl-9"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Permissão
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {PERMISSION_OPTIONS.map(
                    (option) => {
                      const Icon =
                        option.icon;

                      const isSelected =
                        permission ===
                        option.id;

                      return (
                        <button
                          key={
                            option.id
                          }
                          type="button"
                          disabled={
                            isBusy
                          }
                          onClick={() => {
                            if (
                              isBusy
                            ) {
                              return;
                            }

                            trigger(
                              "vibrate"
                            );

                            setPermission(
                              option.id
                            );
                          }}
                          aria-pressed={
                            isSelected
                          }
                          title={
                            option.description
                          }
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                              ? "border-ice bg-ice/12 text-ice"
                              : "border-surface-border/50 bg-surface-raised text-ink-muted"
                          }`}
                        >
                          <Icon
                            size={16}
                            aria-hidden="true"
                          />

                          {
                            option.label
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  void handleAddMember()
                }
                disabled={
                  isBusy
                }
                className="flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />

                    Convidando...
                  </>
                ) : (
                  <>
                    <UserPlus
                      size={14}
                      aria-hidden="true"
                    />

                    Convidar membro
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.03,
            }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
                Com acesso
              </p>

              <p className="mt-2 font-display text-2xl font-semibold text-ink-primary">
                {totalPeople}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Incluindo proprietário
              </p>
            </div>

            <div className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
                Convites
              </p>

              <p className="mt-2 font-display text-2xl font-semibold text-ink-primary">
                {pendingCount}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Aguardando resposta
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.26,
              delay: 0.06,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink-primary">
                <Users
                  size={16}
                  className="text-ink-muted"
                  aria-hidden="true"
                />

                Membros
              </h3>

              <span className="text-xs text-ink-muted">
                {
                  visibleMembers.length
                }{" "}
                registros
              </span>
            </div>

            {visibleMembers.length >
            0 ? (
              <div className="space-y-2">
                {visibleMembers.map(
                  (
                    member,
                    index
                  ) => {
                    const memberId =
                      member.id;

                    const permissionInfo =
                      getPermissionOption(
                        member.permission
                      );

                    const PermIcon =
                      permissionInfo.icon;

                    const isUpdating =
                      updatingMemberId ===
                      memberId;

                    const isDeleting =
                      deletingMemberId ===
                      memberId;

                    const memberBusy =
                      isUpdating ||
                      isDeleting;

                    return (
                      <motion.div
                        key={
                          member.id ??
                          `${member.email}-${index}`
                        }
                        initial={{
                          opacity: 0,
                          y: 10,
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
                        className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-semibold text-ink-muted">
                              {getMemberInitial(
                                member
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {member.name ||
                                  member.email}
                              </p>

                              <p className="truncate text-xs text-ink-muted">
                                {
                                  member.email
                                }
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    PERMISSION_TONE[
                                      member
                                        .permission
                                    ]
                                  }`}
                                >
                                  <PermIcon
                                    size={
                                      10
                                    }
                                    aria-hidden="true"
                                  />

                                  {
                                    permissionInfo.label
                                  }
                                </span>

                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    STATUS_TONE[
                                      member
                                        .status
                                    ]
                                  }`}
                                >
                                  {getMemberStatusLabel(
                                    member.status
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {memberId && (
                            <button
                              type="button"
                              disabled={
                                isBusy
                              }
                              onClick={() =>
                                handleRequestDeleteMember(
                                  member
                                )
                              }
                              aria-label={
                                member.status ===
                                "pending"
                                  ? "Cancelar convite"
                                  : "Remover membro"
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-coral transition-colors active:scale-95 hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {memberBusy ? (
                                <Loader2
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2
                                  size={
                                    15
                                  }
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          )}
                        </div>

                        {member.status ===
                          "accepted" &&
                          memberId && (
                            <div className="mt-4 border-t border-surface-border/40 pt-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-ink-primary">
                                  Permissão de acesso
                                </p>

                                {isUpdating && (
                                  <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                                    <Loader2
                                      size={
                                        11
                                      }
                                      className="animate-spin"
                                      aria-hidden="true"
                                    />

                                    Salvando
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {PERMISSION_OPTIONS.map(
                                  (
                                    option
                                  ) => {
                                    const Icon =
                                      option.icon;

                                    const selected =
                                      member.permission ===
                                      option.id;

                                    return (
                                      <button
                                        key={
                                          option.id
                                        }
                                        type="button"
                                        disabled={
                                          isBusy
                                        }
                                        onClick={() =>
                                          void handlePermissionChange(
                                            member,
                                            option.id
                                          )
                                        }
                                        aria-pressed={
                                          selected
                                        }
                                        title={
                                          option.description
                                        }
                                        className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                          selected
                                            ? "border-ice bg-ice/10 text-ice"
                                            : "border-surface-border/50 bg-surface-raised/60 text-ink-muted"
                                        }`}
                                      >
                                        {selected ? (
                                          <Check
                                            size={
                                              14
                                            }
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Icon
                                            size={
                                              14
                                            }
                                            aria-hidden="true"
                                          />
                                        )}

                                        {
                                          option.label
                                        }
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {member.status ===
                          "pending" && (
                            <div className="mt-4 border-t border-surface-border/40 pt-3">
                              <p className="text-xs leading-5 text-ink-muted">
                                Convite enviado. A aceitação ou recusa deve ser feita pela pessoa convidada na própria conta.
                              </p>
                            </div>
                          )}

                        {member.status ===
                          "declined" && (
                            <div className="mt-4 flex items-start justify-between gap-3 border-t border-surface-border/40 pt-3">
                              <p className="text-xs leading-5 text-ink-muted">
                                Este convite foi recusado e pode ser removido da lista.
                              </p>

                              <X
                                size={14}
                                className="mt-0.5 shrink-0 text-coral"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                      </motion.div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
                  <Users
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <p className="text-sm font-medium text-ink-primary">
                  Nenhum membro adicional
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Convide pessoas para compartilhar este cofre com a permissão adequada.
                </p>
              </div>
            )}
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={
            memberToDelete !==
            null
          }
          onClose={
            handleCloseDeleteModal
          }
          onConfirm={
            handleDeleteMember
          }
          title={
            memberToDelete?.status ===
            "pending"
              ? "Cancelar convite"
              : memberToDelete?.status ===
                  "declined"
                ? "Remover convite"
                : "Remover membro"
          }
          message={
            <div className="space-y-2">
              <p>
                {memberToDelete?.status ===
                "pending"
                  ? `Deseja cancelar o convite enviado para ${memberToDelete.email}?`
                  : memberToDelete?.status ===
                      "declined"
                    ? `Deseja remover o convite recusado de ${memberToDelete.email}?`
                    : `Deseja remover ${memberToDelete?.name || memberToDelete?.email || "este membro"} deste cofre?`}
              </p>

              {memberToDelete?.status ===
                "accepted" && (
                <p className="text-xs leading-5 text-ink-faint">
                  A pessoa perderá o acesso a este cofre. Os documentos originais não serão apagados.
                </p>
              )}
            </div>
          }
          confirmLabel={
            memberToDelete?.status ===
            "pending"
              ? "Cancelar convite"
              : "Remover"
          }
          cancelLabel="Voltar"
          type="danger"
          isLoading={
            deletingMemberId !==
            null
          }
          closeOnBackdrop
        />
      </main>
    </PageTransition>
  );
}

export default function VaultMembersPage() {
  return (
    <Suspense
      fallback={
        <CardListSkeleton />
      }
    >
      <VaultMembersContent />
    </Suspense>
  );
}