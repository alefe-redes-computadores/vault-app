// app/vaults/novo/page.tsx
"use client";

import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  FileText,
  FolderLock,
  Heart,
  Home,
  KeyRound,
  Lock,
  Shield,
  Star,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { PageTransition } from "@/components/PageTransition";
import { useVaults } from "@/hooks/useVaults";
import { useToast } from "@/components/ToastProvider";
import { useHapticFeedback } from "@/lib/haptics";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const VAULT_ICONS = [
  {
    value: "lock",
    label: "Cofre",
    icon: Lock,
  },
  {
    value: "folder",
    label: "Arquivos",
    icon: FolderLock,
  },
  {
    value: "family",
    label: "Família",
    icon: Users,
  },
  {
    value: "home",
    label: "Casa",
    icon: Home,
  },
  {
    value: "user",
    label: "Pessoal",
    icon: UserRound,
  },
  {
    value: "heart",
    label: "Importante",
    icon: Heart,
  },
  {
    value: "shield",
    label: "Protegido",
    icon: Shield,
  },
  {
    value: "star",
    label: "Favoritos",
    icon: Star,
  },
  {
    value: "briefcase",
    label: "Trabalho",
    icon: Briefcase,
  },
  {
    value: "building",
    label: "Empresa",
    icon: Building2,
  },
  {
    value: "documents",
    label: "Documentos",
    icon: FileText,
  },
  {
    value: "credentials",
    label: "Senhas",
    icon: KeyRound,
  },
  {
    value: "cards",
    label: "Financeiro",
    icon: WalletCards,
  },
] as const;

const VAULT_COLORS = [
  "#7DD3FC",
  "#8B5CF6",
  "#6366F1",
  "#14B8A6",
  "#34D399",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
] as const;

// ============================================================
// PAGE
// ============================================================

export default function NovoVaultPage() {
  const router = useRouter();

  const {
    addVault,
    activePersonId,
  } = useVaults();

  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [icon, setIcon] =
    useState("lock");

  const [color, setColor] =
    useState("#7DD3FC");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const selectedIcon = useMemo(() => {
    return (
      VAULT_ICONS.find(
        (item) => item.value === icon
      ) ?? VAULT_ICONS[0]
    );
  }, [icon]);

  const SelectedIcon =
    selectedIcon.icon;

  const canSubmit =
    !!activePersonId &&
    !!name.trim() &&
    !isSubmitting;

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName =
      name.trim();

    if (!activePersonId) {
      trigger("error");

      showToast(
        "Selecione uma pessoa antes de criar o cofre.",
        "error"
      );

      return;
    }

    if (!normalizedName) {
      trigger("error");

      showToast(
        "Informe um nome para o cofre.",
        "error"
      );

      return;
    }

    try {
      setIsSubmitting(true);

      trigger("vibrate");

      const vaultId =
        await addVault({
          name: normalizedName,
          description:
            description.trim() ||
            undefined,
          icon,
          color,
        });

      trigger("success");

      showToast(
        "Cofre criado com sucesso.",
        "success"
      );

      router.replace(
        `/vaults/detalhes?id=${encodeURIComponent(
          vaultId
        )}`
      );
    } catch (error) {
      console.error(
        "Erro ao criar cofre:",
        error
      );

      trigger("error");

      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o cofre.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border bg-void/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
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
                Novo cofre
              </h1>
            </div>
          </div>
        </header>

        {/* ================================================== */}
        {/* CONTEÚDO */}
        {/* ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5"
        >
          {/* ================================================= */}
          {/* PREVIEW */}
          {/* ================================================= */}

          <section>
            <div
              className="relative overflow-hidden rounded-[28px] border bg-surface p-5 shadow-lg"
              style={{
                borderColor: `${color}45`,
              }}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl"
                style={{
                  backgroundColor: `${color}20`,
                }}
              />

              <div className="relative flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border"
                  style={{
                    backgroundColor: `${color}15`,
                    borderColor: `${color}35`,
                    color,
                  }}
                >
                  <SelectedIcon
                    size={25}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Prévia
                  </p>

                  <h2 className="mt-1 truncate font-display text-lg font-bold text-ink-primary">
                    {name.trim() ||
                      "Meu cofre"}
                  </h2>

                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {description.trim() ||
                      "Organize documentos e informações importantes em um único lugar."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* DADOS PRINCIPAIS */}
          {/* ================================================= */}

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-bold text-ink-primary">
                Informações
              </h2>

              <p className="mt-1 text-xs text-ink-faint">
                Defina como este cofre será identificado.
              </p>
            </div>

            <div className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-4">
              <div>
                <label
                  htmlFor="vault-name"
                  className="mb-2 block text-sm font-medium text-ink-muted"
                >
                  Nome
                </label>

                <input
                  id="vault-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Documentos da família"
                  maxLength={80}
                  autoComplete="off"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-surface-border bg-void px-4 py-3.5 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="vault-description"
                    className="text-sm font-medium text-ink-muted"
                  >
                    Descrição
                  </label>

                  <span className="text-[11px] text-ink-faint">
                    {description.length}
                    /160
                  </span>
                </div>

                <textarea
                  id="vault-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Uma descrição curta para identificar o conteúdo deste cofre."
                  maxLength={160}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-2xl border border-surface-border bg-void px-4 py-3.5 text-sm leading-relaxed text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* ÍCONE */}
          {/* ================================================= */}

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-bold text-ink-primary">
                Ícone
              </h2>

              <p className="mt-1 text-xs text-ink-faint">
                Escolha um símbolo para reconhecer o cofre rapidamente.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {VAULT_ICONS.map(
                ({
                  value,
                  label,
                  icon: Icon,
                }) => {
                  const selected =
                    icon === value;

                  return (
                    <motion.button
                      key={value}
                      type="button"
                      whileTap={{
                        scale: 0.95,
                      }}
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );
                        setIcon(value);
                      }}
                      disabled={
                        isSubmitting
                      }
                      className="relative flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[20px] border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        borderColor:
                          selected
                            ? `${color}70`
                            : undefined,
                        backgroundColor:
                          selected
                            ? `${color}10`
                            : undefined,
                      }}
                    >
                      {selected && (
                        <span
                          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                          style={{
                            backgroundColor:
                              color,
                          }}
                        >
                          <Check
                            size={10}
                            className="text-void"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </span>
                      )}

                      <Icon
                        size={21}
                        style={{
                          color: selected
                            ? color
                            : undefined,
                        }}
                        className={
                          selected
                            ? undefined
                            : "text-ink-muted"
                        }
                        aria-hidden="true"
                      />

                      <span
                        className={`text-[10px] font-medium leading-tight ${
                          selected
                            ? "text-ink-primary"
                            : "text-ink-faint"
                        }`}
                      >
                        {label}
                      </span>
                    </motion.button>
                  );
                }
              )}
            </div>
          </section>

          {/* ================================================= */}
          {/* COR */}
          {/* ================================================= */}

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-bold text-ink-primary">
                Cor de identificação
              </h2>

              <p className="mt-1 text-xs text-ink-faint">
                A cor é apenas visual e será salva em formato HEX.
              </p>
            </div>

            <div className="rounded-[24px] border border-surface-border bg-surface p-4">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {VAULT_COLORS.map(
                  (option) => {
                    const selected =
                      color === option;

                    return (
                      <motion.button
                        key={option}
                        type="button"
                        whileTap={{
                          scale: 0.9,
                        }}
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          setColor(option);
                        }}
                        disabled={
                          isSubmitting
                        }
                        className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          backgroundColor:
                            `${option}20`,
                          borderColor:
                            selected
                              ? option
                              : `${option}40`,
                        }}
                        aria-label={`Selecionar cor ${option}`}
                        aria-pressed={
                          selected
                        }
                      >
                        <span
                          className="h-6 w-6 rounded-full"
                          style={{
                            backgroundColor:
                              option,
                          }}
                        />

                        {selected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised shadow">
                            <Check
                              size={12}
                              style={{
                                color:
                                  option,
                              }}
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </motion.button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* AVISO PESSOA */}
          {/* ================================================= */}

          {!activePersonId && (
            <section className="rounded-[22px] border border-coral/25 bg-coral/10 p-4">
              <div className="flex gap-3">
                <Shield
                  size={19}
                  className="mt-0.5 shrink-0 text-coral"
                  aria-hidden="true"
                />

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Nenhuma pessoa ativa selecionada
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Todo cofre precisa pertencer a uma pessoa do Vault. Selecione uma pessoa antes de criar este registro.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* AÇÃO */}
          {/* ================================================= */}

          <div className="pt-2">
            <motion.button
              type="submit"
              whileTap={
                canSubmit
                  ? {
                      scale: 0.985,
                    }
                  : undefined
              }
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-ice px-5 py-4 text-sm font-bold text-void shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                  Criando cofre...
                </>
              ) : (
                <>
                  <Lock
                    size={18}
                    aria-hidden="true"
                  />
                  Criar cofre
                </>
              )}
            </motion.button>
          </div>
        </form>
      </main>
    </PageTransition>
  );
}