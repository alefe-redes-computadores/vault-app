// app/senhas/novo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Loader2, Eye, EyeOff, ShieldCheck, KeyRound, Wand2, X,
} from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { guessWebsiteFromTitle, getFaviconUrl } from "@/lib/utils/credential-helper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import type { Credential } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const calculateStrength = (password: string) => {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const getStrengthColor = (score: number) => {
  if (score === 0) return "bg-surface-border";
  if (score === 1) return "bg-coral";
  if (score === 2) return "bg-amber-500";
  if (score === 3) return "bg-ice/70";
  return "bg-ice";
};

export default function NewPasswordPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { addCredential } = useCredentials();
  const { run, isSubmitting } = useSubmitAction();

  const { authenticate } = useBiometric({
    title: "Visualizar Senha",
    subtitle: "Por segurança, confirme sua identidade.",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [faviconError, setFaviconError] = useState(false);

  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genOptions, setGenOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const [formData, setFormData] = useState({
    title: "",
    username: "",
    password_plain: "",
    url: "",
    notes: "",
    category: "outros" as Credential["category"],
  });

  const strengthScore = calculateStrength(formData.password_plain);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "title") {
        if (!prev.url || prev.url.startsWith("https://")) {
          updated.url = guessWebsiteFromTitle(value);
          setFaviconError(false);
        }
      }
      return updated;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTogglePassword = async () => {
    trigger("vibrate");
    if (!showPassword && formData.password_plain) {
      const isAuth = await authenticate();
      if (!isAuth) return;
    }
    setShowPassword(!showPassword);
  };

  const executeGeneration = () => {
    trigger("vibrate");
    let charset = "";
    if (genOptions.lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (genOptions.uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (genOptions.numbers) charset += "0123456789";
    if (genOptions.symbols) charset += "!@#$%^&*()_+~|-=";
    if (!charset) charset = "abcdefghijklmnopqrstuvwxyz";

    let newPass = "";
    const randomValues = new Uint32Array(genLength);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < genLength; i++) {
      newPass += charset[randomValues[i] % charset.length];
    }

    setFormData((prev) => ({ ...prev, password_plain: newPass }));
    setShowPassword(true);
    setShowGenerator(false);
    trigger("success");
  };

  const handleSubmit = () => {
    trigger("vibrate");
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.password_plain.trim()) newErrors.password_plain = "A senha não pode estar vazia";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    run(
      () =>
        addCredential({
          title: formData.title.trim(),
          username: formData.username.trim(),
          password_plain: formData.password_plain,
          url: formData.url.trim(),
          notes: formData.notes.trim(),
          category: formData.category,
        }),
      {
        successMessage: "Senha salva com sucesso",
        errorMessage: "Erro ao salvar senha",
        goBackOnSuccess: true,
      }
    );
  };

  const faviconUrl = getFaviconUrl(formData.url);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="header-safe-top sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Nova Senha</h1>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
                <ShieldCheck size={14} className="text-ice" /> Criptografia E2EE ativada
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-surface-border/50 bg-surface shadow-sm">
              {faviconUrl && !faviconError ? (
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="h-8 w-8 object-contain"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <KeyRound size={28} className="text-ice" />
              )}
            </div>
          </div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Título (ex: Itaú, Netflix)"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="E-mail ou Usuário"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">
                Senha secreta <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password_plain}
                  onChange={(e) => handleChange("password_plain", e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 pr-24 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.password_plain ? "border-coral/50" : "border-surface-border/50"
                  }`}
                  placeholder="••••••••••••"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button
                    onClick={() => { trigger("vibrate"); setShowGenerator(true); }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all"
                  >
                    <Wand2 size={16} />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-surface-border/50"></div>
                  <button
                    onClick={handleTogglePassword}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-1 h-1 w-full mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 rounded-full transition-colors duration-500 ${
                      strengthScore >= level ? getStrengthColor(strengthScore) : "bg-surface-border/40"
                    }`}
                  />
                ))}
              </div>

              {errors.password_plain && (
                <p className="text-xs text-coral mt-1">{errors.password_plain}</p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {(["banco", "social", "trabalho", "outros"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { trigger("vibrate"); handleChange("category", cat); }}
                  className={`capitalize rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                    formData.category === cat
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.15 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="URL do Site/App"
              placeholder="https://exemplo.com"
              value={formData.url}
              onChange={(e) => {
                handleChange("url", e.target.value);
                setFaviconError(false);
              }}
            />
            <TextArea
              label="Notas (opcional)"
              placeholder="Perguntas de segurança, dicas..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </motion.div>
        </section>

        <AnimatePresence>
          {showGenerator && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGenerator(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] border-t border-surface-border/60 bg-surface p-6 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold text-ink-primary flex items-center gap-2">
                    <Wand2 size={20} className="text-ice" /> Gerador Inteligente
                  </h3>
                  <button
                    onClick={() => setShowGenerator(false)}
                    className="rounded-full p-2 bg-surface-raised text-ink-muted active:scale-95"
                  >
                    <X size={16}/>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-ink-muted">Tamanho</span>
                      <span className="font-mono text-ice font-bold">{genLength} caracteres</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={genLength}
                      onChange={(e) => { trigger("vibrate"); setGenLength(Number(e.target.value)); }}
                      className="w-full accent-ice"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'uppercase', label: 'Maiúsculas (A-Z)' },
                      { id: 'lowercase', label: 'Minúsculas (a-z)' },
                      { id: 'numbers', label: 'Números (0-9)' },
                      { id: 'symbols', label: 'Símbolos (!@#)' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          trigger("vibrate");
                          setGenOptions((p) => ({
                            ...p,
                            [opt.id]: !p[opt.id as keyof typeof p],
                          }));
                        }}
                        className={`flex items-center justify-center rounded-2xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                          genOptions[opt.id as keyof typeof genOptions]
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={executeGeneration}
                    className="shadow-lg shadow-ice/10 mt-2"
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando..." : "Salvar Senha"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}