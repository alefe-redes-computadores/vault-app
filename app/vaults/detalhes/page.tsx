// app/vaults/detalhes/page.tsx
"use client";

import {
  Suspense,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Car,
  ChevronRight,
  Edit,
  FileText,
  FolderLock,
  Heart,
  Home,
  KeyRound,
  Lock,
  PawPrint,
  Plane,
  Shield,
  Star,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  Button,
} from "@/components/ui/Button";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  SectionTitle,
} from "@/components/detail/DetailComponents";

import {
  useToast,
} from "@/components/ToastProvider";

import {
  useMounted,
} from "@/hooks/useMounted";

import {
  useVaults,
} from "@/hooks/useVaults";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import type {
  VaultPermission,
} from "@/lib/types";

import type {
  VaultAccessRole,
} from "@/lib/repositories/vaults";

// ============================================================
// ÍCONES
// ============================================================

const ICON_MAP: Record<
  string,
  LucideIcon
> = {
  lock:
    Lock,

  folder:
    FolderLock,

  home:
    Home,

  family:
    Users,

  users:
    Users,

  user:
    UserRound,

  heart:
    Heart,

  shield:
    Shield,

  star:
    Star,

  briefcase:
    Briefcase,

  building:
    Briefcase,

  documents:
    FileText,

  file:
    FileText,

  credentials:
    KeyRound,

  "book-open":
    BookOpen,

  plane:
    Plane,

  car:
    Car,

  "paw-print":
    PawPrint,
};

// ============================================================
// HELPERS
// ============================================================

function normalizeVaultColor(
  color?:
    string
): string {
  if (
    !color
  ) {
    return "#7DD3FC";
  }

  const normalized =
    color.trim();

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      normalized
    )
  ) {
    return normalized.toUpperCase();
  }

  const legacyColors:
    Record<
      string,
      string
    > = {
    purple:
      "#8B5CF6",

    blue:
      "#38BDF8",

    green:
      "#34D399",

    amber:
      "#F59E0B",

    coral:
      "#EF4444",

    red:
      "#EF4444",

    pink:
      "#EC4899",

    indigo:
      "#6366F1",

    teal:
      "#14B8A6",
  };

  return (
    legacyColors[
      normalized.toLowerCase()
    ] ??
    "#7DD3FC"
  );
}

function getRoleLabel(
  role:
    VaultAccessRole
): string {
  switch (
    role
  ) {
    case "owner":
      return "Proprietário";

    case "admin":
      return "Administrador";

    case "edit":
      return "Editor";

    case "view":
      return "Visualização";
  }
}

function getPermissionLabel(
  permission:
    VaultPermission
): string {
  switch (
    permission
  ) {
    case "admin":
      return "Administrador";

    case "edit":
      return "Editor";

    case "view":
      return "Visualização";
  }
}

// ============================================================
// CONTEÚDO
// ============================================================

function VaultDetailContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showSuccess,
    showError,
  } =
    useToast();

  const mounted =
    useMounted();

  const id =
    searchParams.get(
      "id"
    ) ??
    "";

  const {
    activePersonId,
    deleteVault,
    getAccess,
    getMembers,
    getMemberCount,
    getDocuments,
  } =
    useVaults();

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  // ==========================================================
  // CONSULTAS
  // ==========================================================

  const access =
    useLiveQuery(
      async () => {
        if (
          !id
        ) {
          return null;
        }

        return getAccess(
          id
        );
      },
      [
        id,
        getAccess,
      ],
      undefined
    );

  const members =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !access
        ) {
          return [];
        }

        return getMembers(
          id
        );
      },
      [
        id,
        access,
        getMembers,
      ],
      []
    );

  const memberCount =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !access
        ) {
          return 0;
        }

        return getMemberCount(
          id
        );
      },
      [
        id,
        access,
        getMemberCount,
      ],
      0
    );

  const documents =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !access
        ) {
          return [];
        }

        return getDocuments(
          id
        );
      },
      [
        id,
        access,
        getDocuments,
      ],
      []
    );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    access ===
      undefined ||
    !activePersonId
  ) {
    return (
      <DetailSkeleton />
    );
  }

  // ==========================================================
  // ACESSO + PESSOA ATIVA
  // ==========================================================

  const belongsToActivePerson =
    access
      ? access.role ===
          "owner"
        ? access.vault.person_id ===
          activePersonId
        : access.membership?.person_id ===
          activePersonId
      : false;

  if (
    !access ||
    !belongsToActivePerson
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Lock
                size={
                  24
                }
                className="text-ink-muted"
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-lg font-semibold text-ink-primary">
              Cofre não disponível
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Este cofre não existe, foi removido ou não pertence à pessoa atualmente ativa.
            </p>

            <Button
              type="button"
              variant="primary"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.replace(
                    "/vaults"
                  );
                }
              }
              className="mt-6"
            >
              Voltar para cofres
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const vault =
    access.vault;

  const role =
    access.role;

  const isOwner =
    role ===
    "owner";

  const canManageMembers =
    role ===
      "owner" ||
    role ===
      "admin";

  const canConfigureVault =
    role ===
    "owner";

  const canDeleteVault =
    role ===
    "owner";

  const Icon =
    ICON_MAP[
      vault.icon?.toLowerCase()
    ] ??
    Lock;

  const vaultColor =
    normalizeVaultColor(
      vault.color
    );

  const roleLabel =
    getRoleLabel(
      role
    );

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const handleBack =
    () => {
      if (
        isDeleting
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.back();
    };

  const handleMembers =
    () => {
      if (
        !vault.id ||
        !canManageMembers
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.push(
        `/vaults/membros?cofre_id=${encodeURIComponent(
          vault.id
        )}`
      );
    };

  const handleEdit =
    () => {
      if (
        !vault.id ||
        !canConfigureVault
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.push(
        `/vaults/editar?id=${encodeURIComponent(
          vault.id
        )}`
      );
    };

  const handleRequestDelete =
    () => {
      if (
        !canDeleteVault ||
        isDeleting
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setShowDeleteModal(
        true
      );
    };

  const handleCloseDelete =
    () => {
      if (
        isDeleting
      ) {
        return;
      }

      setShowDeleteModal(
        false
      );
    };

  const handleDelete =
    async () => {
      if (
        !vault.id ||
        !canDeleteVault ||
        isDeleting
      ) {
        return;
      }

      try {
        setIsDeleting(
          true
        );

        trigger(
          "vibrate"
        );

        await deleteVault(
          vault.id
        );

        trigger(
          "success"
        );

        showSuccess(
          "Cofre excluído. Os documentos foram mantidos e desvinculados."
        );

        router.replace(
          "/vaults"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir cofre:",
          error
        );

        trigger(
          "error"
        );

        showError(
          error instanceof
            Error
            ? error.message
            : "Não foi possível excluir o cofre."
        );
      } finally {
        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                handleBack
              }
              disabled={
                isDeleting
              }
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
                aria-hidden="true"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>

              <h1 className="mt-1 max-w-[220px] truncate font-display text-xl font-semibold text-ink-primary">
                {
                  vault.name
                }
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
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
              duration:
                0.28,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border"
                style={{
                  backgroundColor:
                    `${vaultColor}18`,

                  borderColor:
                    `${vaultColor}30`,
                }}
              >
                <Icon
                  size={
                    28
                  }
                  style={{
                    color:
                      vaultColor,
                  }}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-lg font-semibold text-ink-primary">
                    {
                      vault.name
                    }
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[11px] font-semibold text-ice">
                    <Shield
                      size={
                        11
                      }
                      aria-hidden="true"
                    />

                    {
                      roleLabel
                    }
                  </span>
                </div>

                {vault.description && (
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {
                      vault.description
                    }
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1 text-xs text-ink-muted">
                    {
                      memberCount
                    }{" "}
                    membro
                    {memberCount !==
                    1
                      ? "s"
                      : ""}
                  </span>

                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1 text-xs text-ink-muted">
                    {
                      documents.length
                    }{" "}
                    documento
                    {documents.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {(canManageMembers ||
              canConfigureVault ||
              canDeleteVault) && (
              <div className="mt-5 border-t border-surface-border/40 pt-4">
                <div className="flex flex-wrap gap-2">
                  {canManageMembers && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={
                        handleMembers
                      }
                      disabled={
                        isDeleting
                      }
                    >
                      <Users
                        size={
                          14
                        }
                        aria-hidden="true"
                      />

                      Gerenciar membros
                    </Button>
                  )}

                  {canConfigureVault && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={
                        handleEdit
                      }
                      disabled={
                        isDeleting
                      }
                    >
                      <Edit
                        size={
                          14
                        }
                        aria-hidden="true"
                      />

                      Editar
                    </Button>
                  )}

                  {canDeleteVault && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={
                        handleRequestDelete
                      }
                      disabled={
                        isDeleting
                      }
                    >
                      <Trash2
                        size={
                          14
                        }
                        aria-hidden="true"
                      />

                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {!isOwner &&
            access.membership && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration:
                    0.24,

                  delay:
                    0.04,
                }}
                className="rounded-[22px] border border-ice/20 bg-ice/10 p-4"
              >
                <div className="flex gap-3">
                  <Shield
                    size={
                      19
                    }
                    className="mt-0.5 shrink-0 text-ice"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-sm font-semibold text-ink-primary">
                      Cofre compartilhado
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Seu nível de acesso neste cofre é{" "}
                      <span className="font-semibold text-ink-primary">
                        {getPermissionLabel(
                          access.membership
                            .permission
                        )}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

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
              duration:
                0.24,

              delay:
                0.06,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FileText
                  size={
                    15
                  }
                />
              }
              title="Documentos neste cofre"
              action={
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                  {
                    documents.length
                  }{" "}
                  item
                  {documents.length !==
                  1
                    ? "s"
                    : ""}
                </span>
              }
            />

            {documents.length >
            0 ? (
              <div className="space-y-2">
                {documents.map(
                  (
                    doc
                  ) => (
                    <button
                      key={
                        doc.id
                      }
                      type="button"
                      disabled={
                        !doc.id
                      }
                      onClick={
                        () => {
                          if (
                            !doc.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/documentos/detalhes?id=${encodeURIComponent(
                              doc.id
                            )}`
                          );
                        }
                      }
                      className="flex w-full items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface px-4 py-3 text-left transition-all duration-200 hover:bg-surface-raised active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
                          <FileText
                            size={
                              15
                            }
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {
                              doc.title
                            }
                          </p>

                          <p className="mt-0.5 text-xs capitalize text-ink-muted">
                            {
                              doc.type
                            }
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={
                          16
                        }
                        className="shrink-0 text-ink-faint"
                        aria-hidden="true"
                      />
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
                  <FileText
                    size={
                      20
                    }
                    aria-hidden="true"
                  />
                </div>

                <p className="text-sm font-medium text-ink-primary">
                  Nenhum documento compartilhado
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Quando documentos forem vinculados a este cofre, eles aparecerão aqui.
                </p>
              </div>
            )}
          </motion.div>

          {members.length >
            0 && (
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
                duration:
                  0.24,

                delay:
                  0.1,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Users
                    size={
                      15
                    }
                  />
                }
                title="Compartilhamento"
                action={
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                    {
                      members.length
                    }{" "}
                    convite
                    {members.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                }
              />

              <div className="rounded-[24px] border border-surface-border/50 bg-surface px-4 py-3">
                <p className="text-sm text-ink-muted">
                  Além do proprietário, este cofre possui{" "}
                  <span className="font-semibold text-ink-primary">
                    {
                      members.filter(
                        (
                          member
                        ) =>
                          member.status ===
                          "accepted"
                      ).length
                    }
                  </span>{" "}
                  membro
                  {members.filter(
                    (
                      member
                    ) =>
                      member.status ===
                      "accepted"
                  ).length !==
                  1
                    ? "s"
                    : ""}{" "}
                  com acesso aceito.
                </p>

                {canManageMembers && (
                  <button
                    type="button"
                    onClick={
                      handleMembers
                    }
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ice"
                  >
                    Ver membros e convites

                    <ChevronRight
                      size={
                        14
                      }
                      aria-hidden="true"
                    />
                  </button>
                )}
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
          title="Excluir cofre"
          message={
            <div className="space-y-2">
              <p>
                Tem certeza que deseja excluir este cofre?
              </p>

              <p className="text-xs text-ink-faint">
                Os documentos não serão apagados. Eles serão mantidos no Vault e apenas desvinculados deste cofre.
              </p>
            </div>
          }
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
          closeOnBackdrop
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function VaultDetailPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <VaultDetailContent />
    </Suspense>
  );
}