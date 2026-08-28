// app/senhas/novo/page.tsx
"use client";

import {
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  Wand2,
  X,
} from "lucide-react";

import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import {
  getFaviconUrl,
  guessWebsiteFromTitle,
} from "@/lib/utils/credential-helper";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { useSubmitAction } from "@/hooks/useSubmitAction";

import type {
  Credential,
} from "@/lib/types";

type CredentialCategory =
  Credential["category"];

interface PasswordFormState {
  title: string;
  username: string;
  password_plain: string;
  url: string;
  notes: string;
  category: CredentialCategory;
}

type PasswordTextField =
  Exclude<
    keyof PasswordFormState,
    "category"
  >;

interface GeneratorOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

type GeneratorOptionKey =
  keyof GeneratorOptions;

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

const CATEGORIES: Array<{
  id: CredentialCategory;
  label: string;
}> = [
  {
    id: "banco",
    label: "Banco",
  },
  {
    id: "social",
    label: "Social",
  },
  {
    id: "trabalho",
    label: "Trabalho",
  },
  {
    id: "outros",
    label: "Outros",
  },
];

const GENERATOR_OPTIONS: Array<{
  id: GeneratorOptionKey;
  label: string;
}> = [
  {
    id: "uppercase",
    label: "Maiúsculas (A-Z)",
  },
  {
    id: "lowercase",
    label: "Minúsculas (a-z)",
  },
  {
    id: "numbers",
    label: "Números (0-9)",
  },
  {
    id: "symbols",
    label: "Símbolos (!@#)",
  },
];

const INITIAL_FORM_DATA: PasswordFormState = {
  title: "",
  username: "",
  password_plain: "",
  url: "",
  notes: "",
  category: "outros",
};

function calculateStrength(
  password: string
): number {
  let score = 0;

  if (!password) {
    return score;
  }

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (
    /[^A-Za-z0-9]/.test(password)
  ) {
    score += 1;
  }

  return score;
}

function getStrengthColor(
  score: number
): string {
  if (score === 0) {
    return "bg-surface-border";
  }

  if (score === 1) {
    return "bg-coral";
  }

  if (score === 2) {
    return "bg-amber-500";
  }

  if (score === 3) {
    return "bg-ice/70";
  }

  return "bg-ice";
}

export default function NewPasswordPage() {
  const router =
    useRouter();

  const {
    trigger,
  } = useHapticFeedback();

  const {
    showToast,
  } = useToast();

  const {
    addCredential,
  } = useCredentials();

  const {
    activePersonId,
  } = useActivePersonId();

  const {
    run,
    isSubmitting,
  } = useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const {
    authenticate,
  } = useBiometric({
    title: "Visualizar Senha",
    subtitle:
      "Por segurança, confirme sua identidade.",
  });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState<
    Partial<
      Record<
        PasswordTextField,
        string
      >
    >
  >({});

  const [
    faviconError,
    setFaviconError,
  ] = useState(false);

  const [
    showGenerator,
    setShowGenerator,
  ] = useState(false);

  const [
    genLength,
    setGenLength,
  ] = useState(16);

  const [
    genOptions,
    setGenOptions,
  ] = useState<GeneratorOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const [
    formData,
    setFormData,
  ] = useState<PasswordFormState>(
    INITIAL_FORM_DATA
  );

  const strengthScore =
    calculateStrength(
      formData.password_plain
    );

  const faviconUrl =
    getFaviconUrl(
      formData.url
    );

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleTextChange = (
    field: PasswordTextField,
    value: string
  ) => {
    setFormData(
      (previous) => {
        const updated: PasswordFormState = {
          ...previous,
          [field]: value,
        };

        if (
          field === "title"
        ) {
          const currentUrl =
            previous.url.trim();

          if (
            !currentUrl ||
            currentUrl.startsWith(
              "https://"
            )
          ) {
            updated.url =
              guessWebsiteFromTitle(
                value
              );

            setFaviconError(
              false
            );
          }
        }

        return updated;
      }
    );

    if (errors[field]) {
      setErrors(
        (previous) => ({
          ...previous,
          [field]:
            undefined,
        })
      );
    }
  };

  const handleCategoryChange =
    (
      category: CredentialCategory
    ) => {
      trigger("vibrate");

      setFormData(
        (previous) => ({
          ...previous,
          category,
        })
      );
    };

  const handleTogglePassword =
    async () => {
      trigger("vibrate");

      if (
        !showPassword &&
        formData.password_plain
      ) {
        const authenticated =
          await authenticate();

        if (!authenticated) {
          return;
        }
      }

      setShowPassword(
        (previous) =>
          !previous
      );
    };

  const handleGeneratorOption =
    (
      option:
        GeneratorOptionKey
    ) => {
      trigger("vibrate");

      setGenOptions(
        (previous) => ({
          ...previous,
          [option]:
            !previous[option],
        })
      );
    };

  const executeGeneration =
    () => {
      trigger("vibrate");

      let charset = "";

      if (
        genOptions.lowercase
      ) {
        charset +=
          "abcdefghijklmnopqrstuvwxyz";
      }

      if (
        genOptions.uppercase
      ) {
        charset +=
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      }

      if (
        genOptions.numbers
      ) {
        charset +=
          "0123456789";
      }

      if (
        genOptions.symbols
      ) {
        charset +=
          "!@#$%^&*()_+~|-=";
      }

      if (!charset) {
        trigger("error");

        showToast(
          "Selecione pelo menos um tipo de caractere.",
          "error"
        );

        return;
      }

      const randomValues =
        new Uint32Array(
          genLength
        );

      window.crypto.getRandomValues(
        randomValues
      );

      let newPassword = "";

      for (
        let index = 0;
        index < genLength;
        index += 1
      ) {
        newPassword +=
          charset[
            randomValues[
              index
            ] %
              charset.length
          ];
      }

      setFormData(
        (previous) => ({
          ...previous,
          password_plain:
            newPassword,
        })
      );

      setErrors(
        (previous) => ({
          ...previous,
          password_plain:
            undefined,
        })
      );

      setShowPassword(
        true
      );

      setShowGenerator(
        false
      );

      trigger("success");
    };

  const validateForm =
    (): boolean => {
      const newErrors: Partial<
        Record<
          PasswordTextField,
          string
        >
      > = {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "O título é obrigatório";
      }

      if (
        !formData.password_plain
      ) {
        newErrors.password_plain =
          "A senha não pode estar vazia";
      }

      setErrors(newErrors);

      return (
        Object.keys(
          newErrors
        ).length === 0
      );
    };

  const handleSubmit = () => {
    trigger("vibrate");

    if (
      !activePersonId
    ) {
      trigger("error");

      showToast(
        "Nenhuma pessoa ativa foi encontrada. Selecione uma pessoa antes de salvar a senha.",
        "error"
      );

      return;
    }

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

    isSubmitLocked.current =
      true;

    run(
      async () => {
        try {
          await addCredential({
            title:
              formData.title.trim(),

            username:
              formData.username.trim(),

            password_plain:
              formData.password_plain,

            url:
              formData.url.trim(),

            notes:
              formData.notes.trim(),

            category:
              formData.category,

            person_id:
              activePersonId,
          });
        } finally {
          isSubmitLocked.current =
            false;
        }
      },
      {
        successMessage:
          "Senha salva com sucesso",
        errorMessage:
          "Erro ao salvar senha",
        goBackOnSuccess:
          true,
      }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="header-safe-top sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Nova Senha
              </h1>

              <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
                <ShieldCheck
                  size={14}
                  className="text-ice"
                />

                Dados sensíveis criptografados
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-surface-border/50 bg-surface shadow-sm">
              {faviconUrl &&
              !faviconError ? (
                <img
                  src={
                    faviconUrl
                  }
                  alt="Ícone do site"
                  className="h-8 w-8 object-contain"
                  onError={() =>
                    setFaviconError(
                      true
                    )
                  }
                />
              ) : (
                <KeyRound
                  size={28}
                  className="text-ice"
                />
              )}
            </div>
          </div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Título (ex: Itaú, Netflix)"
              value={
                formData.title
              }
              onChange={(
                event
              ) =>
                handleTextChange(
                  "title",
                  event.target.value
                )
              }
              error={
                errors.title
              }
              required
            />
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.05,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="E-mail ou Usuário"
              value={
                formData.username
              }
              onChange={(
                event
              ) =>
                handleTextChange(
                  "username",
                  event.target.value
                )
              }
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">
                Senha secreta{" "}
                <span className="text-coral">
                  *
                </span>
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    formData.password_plain
                  }
                  onChange={(
                    event
                  ) =>
                    handleTextChange(
                      "password_plain",
                      event.target.value
                    )
                  }
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 pr-24 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.password_plain
                      ? "border-coral/50"
                      : "border-surface-border/50"
                  }`}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />

                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setShowGenerator(
                        true
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-all hover:bg-surface-border/50 hover:text-ice active:scale-95"
                    type="button"
                    aria-label="Abrir gerador de senha"
                  >
                    <Wand2
                      size={16}
                    />
                  </button>

                  <div className="mx-0.5 h-4 w-px bg-surface-border/50" />

                  <button
                    onClick={
                      handleTogglePassword
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-all hover:bg-surface-border/50 hover:text-ice active:scale-95"
                    type="button"
                    aria-label={
                      showPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    aria-pressed={
                      showPassword
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex h-1 w-full gap-1">
                {[1, 2, 3, 4].map(
                  (
                    level
                  ) => (
                    <div
                      key={
                        level
                      }
                      className={`flex-1 rounded-full transition-colors duration-500 ${
                        strengthScore >=
                        level
                          ? getStrengthColor(
                              strengthScore
                            )
                          : "bg-surface-border/40"
                      }`}
                    />
                  )
                )}
              </div>

              {errors.password_plain && (
                <p className="mt-1 text-xs text-coral">
                  {
                    errors.password_plain
                  }
                </p>
              )}
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Categoria
            </p>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(
                (
                  category
                ) => (
                  <button
                    key={
                      category.id
                    }
                    onClick={() =>
                      handleCategoryChange(
                        category.id
                      )
                    }
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      formData.category ===
                      category.id
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                    type="button"
                    aria-pressed={
                      formData.category ===
                      category.id
                    }
                  >
                    {
                      category.label
                    }
                  </button>
                )
              )}
            </div>
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.15,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="URL do Site/App"
              placeholder="https://exemplo.com"
              value={
                formData.url
              }
              onChange={(
                event
              ) => {
                handleTextChange(
                  "url",
                  event.target.value
                );

                setFaviconError(
                  false
                );
              }}
            />

            <TextArea
              label="Notas (opcional)"
              placeholder="Ex: contexto da conta, recuperação, observações importantes."
              value={
                formData.notes
              }
              onChange={(
                event
              ) =>
                handleTextChange(
                  "notes",
                  event.target.value
                )
              }
            />
          </motion.div>
        </section>

        <AnimatePresence>
          {showGenerator && (
            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() =>
                  setShowGenerator(
                    false
                  )
                }
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{
                  y: "100%",
                }}
                animate={{
                  y: 0,
                }}
                exit={{
                  y: "100%",
                }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-[32px] border-t border-surface-border/60 bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-primary">
                    <Wand2
                      size={20}
                      className="text-ice"
                    />

                    Gerador de Senha
                  </h3>

                  <button
                    onClick={() =>
                      setShowGenerator(
                        false
                      )
                    }
                    className="rounded-full bg-surface-raised p-2 text-ink-muted active:scale-95"
                    type="button"
                    aria-label="Fechar gerador"
                  >
                    <X
                      size={16}
                    />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-ink-muted">
                        Tamanho
                      </span>

                      <span className="font-mono font-bold text-ice">
                        {
                          genLength
                        }{" "}
                        caracteres
                      </span>
                    </div>

                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={
                        genLength
                      }
                      onChange={(
                        event
                      ) => {
                        setGenLength(
                          Number(
                            event.target
                              .value
                          )
                        );
                      }}
                      onPointerUp={() =>
                        trigger(
                          "vibrate"
                        )
                      }
                      className="w-full accent-ice"
                      aria-label="Tamanho da senha"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {GENERATOR_OPTIONS.map(
                      (
                        option
                      ) => (
                        <button
                          key={
                            option.id
                          }
                          onClick={() =>
                            handleGeneratorOption(
                              option.id
                            )
                          }
                          className={`flex items-center justify-center rounded-2xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                            genOptions[
                              option.id
                            ]
                              ? "border-ice bg-ice/12 text-ice"
                              : "border-surface-border/50 bg-surface-raised text-ink-muted"
                          }`}
                          type="button"
                          aria-pressed={
                            genOptions[
                              option.id
                            ]
                          }
                        >
                          {
                            option.label
                          }
                        </button>
                      )
                    )}
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={
                      executeGeneration
                    }
                    className="mt-2 shadow-lg shadow-ice/10"
                  >
                    Aplicar Senha Gerada
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save
                size={16}
              />
            )}

            {isSubmitting
              ? "Salvando..."
              : "Salvar Senha"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}