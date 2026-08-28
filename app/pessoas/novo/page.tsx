// app/pessoas/novo/page.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Mail,
  Palette,
  Phone,
  Save,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useHapticFeedback } from "@/lib/haptics";

import { personsRepository } from "@/lib/repositories/persons";
import { uploadFile } from "@/lib/supabase/storage";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

const PERSON_COLORS = [
  {
    name: "Azul",
    value: "#38BDF8",
  },
  {
    name: "Roxo",
    value: "#A78BFA",
  },
  {
    name: "Rosa",
    value: "#F472B6",
  },
  {
    name: "Vermelho",
    value: "#F87171",
  },
  {
    name: "Laranja",
    value: "#FB923C",
  },
  {
    name: "Amarelo",
    value: "#FACC15",
  },
  {
    name: "Verde",
    value: "#4ADE80",
  },
  {
    name: "Ciano",
    value: "#22D3EE",
  },
  {
    name: "Índigo",
    value: "#6366F1",
  },
  {
    name: "Cinza",
    value: "#9CA3AF",
  },
];

function formatPhone(
  value: string
): string {
  const clean = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (clean.length <= 2) {
    return clean;
  }

  if (clean.length <= 6) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(2)}`;
  }

  if (clean.length <= 10) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(
      2,
      6
    )}-${clean.slice(6)}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(7)}`;
}

export default function NewPersonPage() {
  const router = useRouter();

  const { user } =
    useAuth();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const {
    run,
    isSubmitting,
  } = useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    localFile,
    setLocalFile,
  ] = useState<File | null>(
    null
  );

  const [
    localPreviewUrl,
    setLocalPreviewUrl,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    color: "#38BDF8",
  });

  // ==========================================================
  // LIMPEZA DO PREVIEW LOCAL
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        localPreviewUrl
      ) {
        URL.revokeObjectURL(
          localPreviewUrl
        );
      }
    };
  }, [localPreviewUrl]);

  // ==========================================================
  // GOOGLE
  // ==========================================================

  const handleImportGoogle =
    () => {
      trigger("vibrate");

      if (!user) {
        return;
      }

      const meta =
        user.user_metadata ||
        {};

      setFormData(
        (prev) => ({
          ...prev,
          name:
            meta.full_name ||
            meta.name ||
            prev.name,
          email:
            user.email ||
            prev.email,
          avatar_url:
            meta.avatar_url ||
            meta.picture ||
            prev.avatar_url,
        })
      );

      if (
        localPreviewUrl
      ) {
        URL.revokeObjectURL(
          localPreviewUrl
        );

        setLocalPreviewUrl(
          null
        );
      }

      setLocalFile(null);

      showToast(
        "Dados preenchidos com a conta Google!",
        "success"
      );
    };

  // ==========================================================
  // FOTO
  // ==========================================================

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      trigger("error");

      showToast(
        "A imagem é muito grande. Escolha uma de até 5 MB.",
        "error"
      );

      return;
    }

    trigger("vibrate");

    if (
      localPreviewUrl
    ) {
      URL.revokeObjectURL(
        localPreviewUrl
      );
    }

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setLocalFile(file);

    setLocalPreviewUrl(
      previewUrl
    );
  };

  const removeAvatar =
    () => {
      trigger("vibrate");

      if (
        localPreviewUrl
      ) {
        URL.revokeObjectURL(
          localPreviewUrl
        );
      }

      setLocalPreviewUrl(
        null
      );

      setLocalFile(null);

      setFormData(
        (prev) => ({
          ...prev,
          avatar_url: "",
        })
      );
    };

  // ==========================================================
  // COR
  // ==========================================================

  const handleSelectColor =
    (color: string) => {
      trigger("vibrate");

      setFormData(
        (prev) => ({
          ...prev,
          color,
        })
      );
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      trigger("vibrate");

      const normalizedName =
        formData.name.trim();

      if (!normalizedName) {
        setError(
          "Nome é obrigatório"
        );

        trigger("error");

        return;
      }

      if (!user?.id) {
        setError(
          "Usuário não autenticado"
        );

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
            let finalAvatarUrl =
              formData.avatar_url.trim();

            if (localFile) {
              const {
                url,
                error:
                  uploadError,
              } =
                await uploadFile(
                  user.id,
                  localFile,
                  "avatars"
                );

              if (
                uploadError ||
                !url
              ) {
                throw new Error(
                  "Não foi possível enviar a foto."
                );
              }

              finalAvatarUrl =
                url;
            }

            await personsRepository.create(
              {
                name:
                  normalizedName,

                email:
                  formData.email
                    .trim() ||
                  undefined,

                phone:
                  formData.phone
                    .trim() ||
                  undefined,

                avatar_url:
                  finalAvatarUrl ||
                  undefined,

                color:
                  formData.color,
              }
            );
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Pessoa adicionada com sucesso!",
          errorMessage:
            "Erro ao salvar pessoa. Tente novamente.",
          goBackOnSuccess:
            true,
        }
      );
    };

  const previewAvatar =
    localPreviewUrl ||
    formData.avatar_url;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-32">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={
            handleFileSelect
          }
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                isSubmitting
              }
              onClick={() => {
                if (
                  isSubmitting
                ) {
                  return;
                }

                trigger(
                  "vibrate"
                );

                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95 disabled:opacity-50"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
                aria-hidden="true"
              />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova pessoa
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                Cadastre uma pessoa
                para vincular seus
                dados no Vault.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {user && (
            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="flex items-center justify-between gap-4 rounded-[24px] border border-ice/30 bg-ice/5 p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/15 text-ice">
                  <Sparkles
                    size={18}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-primary">
                    Preencher com dados do Google?
                  </p>

                  <p className="truncate text-[11px] text-ink-muted">
                    Use seu nome,
                    e-mail e foto de
                    perfil atuais.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={
                  handleImportGoogle
                }
                className="shrink-0 rounded-xl bg-ice px-3.5 py-2 text-xs font-bold text-void shadow-md shadow-ice/20 transition-transform active:scale-95 disabled:opacity-50"
              >
                Preencher
              </button>
            </motion.div>
          )}

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
              duration: 0.28,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex h-16 w-16 cursor-pointer overflow-hidden items-center justify-center rounded-[20px] border border-surface-border/50 shadow-sm transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor:
                      previewAvatar
                        ? "transparent"
                        : `${formData.color}18`,
                    borderColor: `${formData.color}55`,
                  }}
                  aria-label="Selecionar foto"
                >
                  {previewAvatar ? (
                    <img
                      src={
                        previewAvatar
                      }
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User
                      size={28}
                      style={{
                        color:
                          formData.color,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {previewAvatar ? (
                  <button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={
                      removeAvatar
                    }
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-void shadow-md disabled:opacity-50"
                    aria-label="Remover foto"
                  >
                    <X
                      size={12}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ice text-void shadow-md disabled:opacity-50"
                    aria-label="Selecionar foto"
                  >
                    <Camera
                      size={12}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">
                  Cadastro
                </p>

                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  Dados da pessoa
                </h2>

                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  A foto é opcional
                  e pode ter até 5
                  MB.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Ex: Alefe Gomes"
                value={
                  formData.name
                }
                disabled={
                  isSubmitting
                }
                onChange={(
                  event
                ) => {
                  setError("");

                  setFormData(
                    (prev) => ({
                      ...prev,
                      name:
                        event.target
                          .value,
                    })
                  );
                }}
                error={error}
                required
              />

              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />

                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={
                    formData.email
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (prev) => ({
                        ...prev,
                        email:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className="pl-9"
                  type="email"
                />
              </div>

              <div className="relative">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />

                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={
                    formData.phone
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (prev) => ({
                        ...prev,
                        phone:
                          formatPhone(
                            event
                              .target
                              .value
                          ),
                      })
                    )
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3">
                <p className="flex items-center gap-2 text-sm font-medium text-ink-primary">
                  <Palette
                    size={16}
                    style={{
                      color:
                        formData.color,
                    }}
                    aria-hidden="true"
                  />
                  Cor da pessoa
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Identifica
                  visualmente esta
                  pessoa no
                  aplicativo.
                </p>
              </div>

              <div className="rounded-[22px] border border-surface-border/40 bg-surface-raised/60 p-4">
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-8">
                  {PERSON_COLORS.map(
                    (color) => {
                      const selected =
                        formData.color ===
                        color.value;

                      return (
                        <button
                          key={
                            color.value
                          }
                          type="button"
                          disabled={
                            isSubmitting
                          }
                          aria-label={`Selecionar cor ${color.name}`}
                          aria-pressed={
                            selected
                          }
                          onClick={() =>
                            handleSelectColor(
                              color.value
                            )
                          }
                          className="relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:opacity-50"
                          style={{
                            backgroundColor:
                              color.value,
                            boxShadow:
                              selected
                                ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${color.value}`
                                : "none",
                          }}
                        >
                          {selected && (
                            <Check
                              size={
                                19
                              }
                              strokeWidth={
                                3
                              }
                              className="text-white drop-shadow-sm"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-5 flex items-center gap-3 border-t border-surface-border/30 pt-4">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        formData.color,
                    }}
                  />

                  <p className="text-xs text-ink-muted">
                    Cor usada nos
                    cards e
                    identificadores
                    de{" "}
                    <span className="font-medium text-ink-primary">
                      {formData.name.trim() ||
                        "esta pessoa"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting
            }
            className="mt-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
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
                Adicionar pessoa
              </>
            )}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}