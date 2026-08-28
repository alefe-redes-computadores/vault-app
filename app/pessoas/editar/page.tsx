// app/pessoas/editar/page.tsx
"use client";

import {
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
  Camera,
  Check,
  Loader2,
  Mail,
  Palette,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useHapticFeedback } from "@/lib/haptics";

import { personsRepository } from "@/lib/repositories/persons";
import { uploadFile } from "@/lib/supabase/storage";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";

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

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "object" &&
    error !== null &&
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return "";
}

export default function EditarPessoaPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const { user } =
    useAuth();

  const {
    activePersonId,
  } = useActivePersonId();

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
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState<
    Record<string, string>
  >({});

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

  const isActive =
    activePersonId === id;

  // ==========================================================
  // CARREGAR PESSOA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadPerson =
      async () => {
        if (!id) {
          showToast(
            "ID da pessoa não informado.",
            "error"
          );

          router.replace(
            "/pessoas"
          );

          return;
        }

        setIsLoading(true);

        try {
          /**
           * getById valida se a pessoa pertence ao
           * usuário autenticado.
           */
          const person =
            await personsRepository.getById(
              id
            );

          if (!person) {
            showToast(
              "Pessoa não encontrada ou acesso negado.",
              "error"
            );

            router.replace(
              "/pessoas"
            );

            return;
          }

          if (!cancelled) {
            setFormData({
              name:
                person.name ||
                "",
              email:
                person.email ||
                "",
              phone:
                person.phone ||
                "",
              avatar_url:
                person.avatar_url ||
                "",
              color:
                person.color ||
                "#38BDF8",
            });
          }
        } catch (error) {
          console.error(
            "Erro ao carregar pessoa:",
            error
          );

          if (!cancelled) {
            showToast(
              "Erro ao carregar os dados da pessoa.",
              "error"
            );

            router.replace(
              "/pessoas"
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoading(
              false
            );
          }
        }
      };

    void loadPerson();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    router,
    showToast,
  ]);

  // ==========================================================
  // FOTO
  // ==========================================================

  const handleUploadPhoto =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (
        !file ||
        !user?.id
      ) {
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

      setUploadingPhoto(
        true
      );

      trigger("vibrate");

      try {
        const {
          url,
          error,
        } = await uploadFile(
          user.id,
          file,
          "avatars"
        );

        if (
          error ||
          !url
        ) {
          throw new Error(
            getErrorMessage(
              error
            ) ||
              "Não foi possível enviar a foto."
          );
        }

        setFormData(
          (prev) => ({
            ...prev,
            avatar_url:
              url,
          })
        );

        trigger("success");

        showToast(
          "Foto enviada com sucesso!",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao enviar foto:",
          error
        );

        trigger("error");

        const message =
          getErrorMessage(
            error
          );

        showToast(
          message.includes(
            "Bucket not found"
          )
            ? "O bucket de avatars precisa estar configurado no Supabase."
            : "Erro ao enviar foto.",
          "error"
        );
      } finally {
        setUploadingPhoto(
          false
        );
      }
    };

  const removePhoto =
    () => {
      trigger("vibrate");

      setFormData(
        (prev) => ({
          ...prev,
          avatar_url: "",
        })
      );
    };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !formData.name.trim()
      ) {
        newErrors.name =
          "Nome é obrigatório";
      }

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
        ).length === 0
      );
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      trigger("vibrate");

      if (
        !validate() ||
        !id
      ) {
        trigger("error");
        return;
      }

      if (
        isSubmitLocked.current ||
        isSubmitting ||
        uploadingPhoto
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      run(
        async () => {
          try {
            await personsRepository.update(
              id,
              {
                name:
                  formData.name.trim(),

                email:
                  formData.email
                    .trim() ||
                  undefined,

                phone:
                  formData.phone
                    .trim() ||
                  undefined,

                avatar_url:
                  formData.avatar_url
                    .trim() ||
                  undefined,

                color:
                  formData.color,
              }
            );

            if (
              isActive &&
              formData.color
            ) {
              document.documentElement.style.setProperty(
                "--person-accent",
                formData.color
              );
            }
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Pessoa atualizada com sucesso!",
          errorMessage:
            "Erro ao atualizar pessoa. Tente novamente.",
          goBackOnSuccess:
            true,
        }
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <PageTransition>
        <DetailSkeleton />
      </PageTransition>
    );
  }

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
            handleUploadPhoto
          }
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                isSubmitting ||
                uploadingPhoto
              }
              onClick={() => {
                if (
                  isSubmitting ||
                  uploadingPhoto
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

            <div className="min-w-0">
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar pessoa
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                Atualize os dados
                desta pessoa.
              </p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6">
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
            className="mb-4 rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                {formData.avatar_url ? (
                  <img
                    src={
                      formData.avatar_url
                    }
                    alt={
                      formData.name
                    }
                    className="h-20 w-20 rounded-full border-2 object-cover"
                    style={{
                      borderColor: `${formData.color}55`,
                    }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border bg-surface-raised"
                    style={{
                      borderColor: `${formData.color}55`,
                    }}
                  >
                    <User
                      size={36}
                      style={{
                        color:
                          formData.color,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    uploadingPhoto ||
                    isSubmitting
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-void bg-ice text-void transition-all active:scale-95 disabled:opacity-50"
                  aria-label="Alterar foto"
                >
                  {uploadingPhoto ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Camera
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {formData.avatar_url && (
                  <button
                    type="button"
                    disabled={
                      uploadingPhoto ||
                      isSubmitting
                    }
                    onClick={
                      removePhoto
                    }
                    className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-void bg-coral text-white transition-all active:scale-95 disabled:opacity-50"
                    aria-label="Remover foto"
                  >
                    <X
                      size={12}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-ink-muted">
                    Editando
                  </p>

                  {isActive && (
                    <span className="rounded-full border border-ice/20 bg-ice/15 px-2 py-0.5 text-[10px] font-bold uppercase text-ice">
                      Ativa
                    </span>
                  )}
                </div>

                <p className="truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.name ||
                    "Sem nome"}
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Revise e salve
                  os dados para
                  manter o cadastro
                  atualizado.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm">
            <div className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Digite o nome"
                value={
                  formData.name
                }
                disabled={
                  isSubmitting ||
                  uploadingPhoto
                }
                onChange={(
                  event
                ) => {
                  setErrors(
                    (prev) => ({
                      ...prev,
                      name: "",
                    })
                  );

                  setFormData(
                    (prev) => ({
                      ...prev,
                      name:
                        event.target
                          .value,
                    })
                  );
                }}
                error={
                  errors.name
                }
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
                  placeholder="Digite o e-mail"
                  value={
                    formData.email
                  }
                  disabled={
                    isSubmitting ||
                    uploadingPhoto
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
                  type="email"
                  className="pl-9"
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
                    isSubmitting ||
                    uploadingPhoto
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

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Palette
                    size={16}
                    style={{
                      color:
                        formData.color,
                    }}
                    aria-hidden="true"
                  />

                  <label className="text-sm font-medium text-ink-primary">
                    Cor da pessoa
                  </label>
                </div>

                <p className="mb-3 text-xs leading-5 text-ink-muted">
                  Essa cor será
                  usada para
                  identificar
                  visualmente esta
                  pessoa.
                </p>

                <div className="grid grid-cols-4 gap-3">
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
                            isSubmitting ||
                            uploadingPhoto
                          }
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            setFormData(
                              (prev) => ({
                                ...prev,
                                color:
                                  color.value,
                              })
                            );
                          }}
                          className="group flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all active:scale-95 disabled:opacity-50"
                          style={{
                            borderColor:
                              selected
                                ? color.value
                                : "rgba(255,255,255,0.08)",
                            backgroundColor:
                              selected
                                ? `${color.value}12`
                                : "transparent",
                          }}
                          aria-label={`Selecionar cor ${color.name}`}
                          aria-pressed={
                            selected
                          }
                        >
                          <span
                            className="h-9 w-9 rounded-full border-2 transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor:
                                color.value,
                              borderColor:
                                selected
                                  ? "#ffffff"
                                  : `${color.value}55`,
                              boxShadow:
                                selected
                                  ? `0 0 0 2px ${color.value}55`
                                  : "none",
                            }}
                          />

                          <span
                            className="text-[11px] font-medium"
                            style={{
                              color:
                                selected
                                  ? color.value
                                  : "var(--color-ink-muted)",
                            }}
                          >
                            {
                              color.name
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting ||
              uploadingPhoto
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
                Salvar alterações
              </>
            )}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}