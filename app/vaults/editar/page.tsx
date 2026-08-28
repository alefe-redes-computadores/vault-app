// app/vaults/editar/page.tsx

"use client";

import {
  Suspense,
  useEffect,
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
  BookOpen,
  Briefcase,
  Car,
  Check,
  Heart,
  Home,
  Loader2,
  Lock,
  Palette,
  PawPrint,
  Plane,
  Save,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";

import { useMounted } from "@/hooks/useMounted";
import { useVaults } from "@/hooks/useVaults";

import { useHapticFeedback } from "@/lib/haptics";

const ICON_OPTIONS: {
  label: string;
  icon: LucideIcon;
  value: string;
}[] = [
  {
    label: "Casa",
    icon: Home,
    value: "home",
  },
  {
    label: "Saúde",
    icon: Heart,
    value: "heart",
  },
  {
    label: "Trabalho",
    icon: Briefcase,
    value: "briefcase",
  },
  {
    label: "Estudos",
    icon: BookOpen,
    value: "book-open",
  },
  {
    label: "Viagens",
    icon: Plane,
    value: "plane",
  },
  {
    label: "Carro",
    icon: Car,
    value: "car",
  },
  {
    label: "Pet",
    icon: PawPrint,
    value: "paw-print",
  },
  {
    label: "Pessoas",
    icon: Users,
    value: "users",
  },
];

const COLOR_OPTIONS = [
  "#7DD3FC",
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#F472B6",
  "#34D399",
] as const;

interface VaultFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
}

function normalizeVaultColor(
  color?: string
): string {
  if (!color) {
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

  const legacyColors: Record<
    string,
    string
  > = {
    purple: "#8B5CF6",
    blue: "#3B82F6",
    green: "#10B981",
    amber: "#F59E0B",
    coral: "#EF4444",
    red: "#EF4444",
    pink: "#EC4899",
    indigo: "#6366F1",
    teal: "#14B8A6",
  };

  return (
    legacyColors[
      normalized.toLowerCase()
    ] ?? "#7DD3FC"
  );
}

function EditarVaultContent() {
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

  const id =
    searchParams.get("id") ??
    "";

  const {
    activePersonId,
    getAccess,
    updateVault,
    deleteVault,
  } = useVaults();

  const [
    formData,
    setFormData,
  ] = useState<VaultFormData>({
    name: "",
    description: "",
    icon: "home",
    color: "#7DD3FC",
  });

  const [
    loadedVaultId,
    setLoadedVaultId,
  ] = useState<string | null>(
    null
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const access =
    useLiveQuery(
      async () => {
        if (!id) {
          return null;
        }

        return getAccess(id);
      },
      [
        id,
        getAccess,
      ],
      undefined
    );

  useEffect(() => {
    const vault =
      access?.vault;

    const vaultId =
      vault?.id;

    if (
      !vault ||
      !vaultId ||
      loadedVaultId ===
        vaultId
    ) {
      return;
    }

    setFormData({
      name:
        vault.name ?? "",
      description:
        vault.description ??
        "",
      icon:
        vault.icon ||
        "home",
      color:
        normalizeVaultColor(
          vault.color
        ),
    });

    setLoadedVaultId(
      vaultId
    );
  }, [
    access,
    loadedVaultId,
  ]);

  const selectedIcon =
    useMemo(
      () =>
        ICON_OPTIONS.find(
          (option) =>
            option.value ===
            formData.icon
        ),
      [formData.icon]
    );

  const SelectedIcon =
    selectedIcon?.icon ??
    Lock;

  const isBusy =
    isSaving ||
    isDeleting;

  if (
    !mounted ||
    access === undefined ||
    !activePersonId
  ) {
    return (
      <DetailSkeleton />
    );
  }

  const canEdit =
    access?.role ===
      "owner" &&
    access.vault.person_id ===
      activePersonId;

  if (!access || !canEdit) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Lock
                size={24}
                className="text-ink-muted"
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-lg font-semibold text-ink-primary">
              Edição não disponível
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Este cofre não pertence à pessoa ativa ou sua conta não possui permissão para alterar suas configurações.
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

  const validate =
    (): boolean => {
      if (
        !formData.name.trim()
      ) {
        trigger("error");

        showError(
          "Informe o nome do cofre."
        );

        return false;
      }

      return true;
    };

  const handleSubmit =
    async () => {
      if (
        !id ||
        isBusy ||
        !validate()
      ) {
        return;
      }

      try {
        setIsSaving(true);

        trigger("vibrate");

        await updateVault(
          id,
          {
            name:
              formData.name.trim(),

            description:
              formData.description
                .trim() ||
              undefined,

            icon:
              formData.icon,

            color:
              normalizeVaultColor(
                formData.color
              ),
          }
        );

        trigger("success");

        showSuccess(
          "Cofre atualizado com sucesso."
        );

        router.back();
      } catch (error) {
        console.error(
          "Erro ao atualizar cofre:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o cofre."
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleRequestDelete =
    () => {
      if (isBusy) {
        return;
      }

      trigger("vibrate");

      setShowDeleteModal(
        true
      );
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

  const handleDelete =
    async () => {
      if (
        !id ||
        isDeleting ||
        isSaving
      ) {
        return;
      }

      try {
        setIsDeleting(
          true
        );

        trigger("vibrate");

        await deleteVault(id);

        trigger("success");

        showSuccess(
          "Cofre excluído. Os documentos foram mantidos e desvinculados."
        );

        router.replace(
          "/vaults"
        );
      } catch (error) {
        console.error(
          "Erro ao excluir cofre:",
          error
        );

        trigger("error");

        showError(
          error instanceof Error
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

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar cofre
              </h1>
            </div>

            <button
              type="button"
              disabled={
                isBusy
              }
              onClick={
                handleRequestDelete
              }
              aria-label="Excluir cofre"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2
                size={16}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
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
              duration: 0.24,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-[28px] border shadow-sm"
                style={{
                  backgroundColor:
                    `${formData.color}1F`,
                  borderColor:
                    `${formData.color}20`,
                }}
              >
                <SelectedIcon
                  size={34}
                  style={{
                    color:
                      formData.color,
                  }}
                  aria-hidden="true"
                />
              </div>

              <h2 className="mt-4 font-display text-lg font-semibold text-ink-primary">
                {formData.name ||
                  "Configure seu cofre"}
              </h2>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Escolha um nome, uma cor e um ícone para identificar rapidamente este espaço.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome do cofre"
                placeholder="Ex: Família Gomes, Saúde, Empresa"
                value={
                  formData.name
                }
                onChange={(
                  event
                ) =>
                  setFormData(
                    (current) => ({
                      ...current,
                      name:
                        event
                          .target
                          .value,
                    })
                  )
                }
                disabled={
                  isBusy
                }
                required
              />

              <TextArea
                label="Descrição"
                placeholder="O que será guardado neste cofre?"
                value={
                  formData.description
                }
                onChange={(
                  event
                ) =>
                  setFormData(
                    (current) => ({
                      ...current,
                      description:
                        event
                          .target
                          .value,
                    })
                  )
                }
                disabled={
                  isBusy
                }
              />
            </div>
          </motion.div>

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
              duration: 0.24,
              delay: 0.04,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-3">
              <p className="text-sm font-semibold text-ink-primary">
                Ícone
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Escolha o símbolo que melhor representa este cofre.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {ICON_OPTIONS.map(
                (option) => {
                  const Icon =
                    option.icon;

                  const isSelected =
                    formData.icon ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
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

                        setFormData(
                          (
                            current
                          ) => ({
                            ...current,
                            icon:
                              option.value,
                          })
                        );
                      }}
                      aria-pressed={
                        isSelected
                      }
                      className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSelected
                          ? "border-ice bg-ice/10 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      <Icon
                        size={20}
                        aria-hidden="true"
                      />

                      <span className="text-[10px] font-medium">
                        {
                          option.label
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>

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
              duration: 0.24,
              delay: 0.08,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                <Palette
                  size={16}
                  style={{
                    color:
                      formData.color,
                  }}
                  aria-hidden="true"
                />

                Cor
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Use uma cor para diferenciar cofres com mais rapidez.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map(
                (color) => {
                  const selected =
                    formData.color ===
                    color;

                  return (
                    <button
                      key={color}
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

                        setFormData(
                          (
                            current
                          ) => ({
                            ...current,
                            color,
                          })
                        );
                      }}
                      aria-label={`Selecionar cor ${color}`}
                      aria-pressed={
                        selected
                      }
                      className={`relative h-10 w-10 rounded-full border-2 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-white shadow-lg"
                          : "border-transparent"
                      }`}
                      style={{
                        backgroundColor:
                          color,
                      }}
                    >
                      {selected && (
                        <Check
                          size={16}
                          className="absolute inset-0 m-auto text-void"
                          strokeWidth={
                            3
                          }
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>

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
              duration: 0.24,
              delay: 0.12,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              Prévia
            </p>

            <div className="mt-4 flex items-center gap-4 rounded-[24px] border border-surface-border/50 bg-surface-raised/60 px-4 py-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor:
                    `${formData.color}22`,
                  borderColor:
                    `${formData.color}22`,
                }}
              >
                <SelectedIcon
                  size={22}
                  style={{
                    color:
                      formData.color,
                  }}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-ink-primary">
                  {formData.name ||
                    "Nome do cofre"}
                </p>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                  {formData.description ||
                    "Descrição opcional do cofre"}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() =>
              void handleSubmit()
            }
            disabled={
              isBusy
            }
            className="flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />

                Salvando...
              </>
            ) : (
              <>
                <Save
                  size={16}
                  aria-hidden="true"
                />

                Salvar alterações
              </>
            )}
          </Button>
        </div>

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

export default function EditarVaultPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarVaultContent />
    </Suspense>
  );
}