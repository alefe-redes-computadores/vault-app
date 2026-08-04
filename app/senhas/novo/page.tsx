"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewPasswordPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addCredential } = useCredentials();
  
  const { authenticate } = useBiometric({
    title: "Visualizar Senha",
    subtitle: "Por segurança, confirme sua identidade para exibir a senha na tela.",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    username: "",
    password_plain: "",
    url: "",
    notes: "",
    category: "outros" as const,
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Gerador de senhas estilo Bitwarden
  const generatePassword = () => {
    trigger("vibrate");
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|";
    let newPass = "";
    for (let i = 0; i < 16; i++) {
      newPass += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData((prev) => ({ ...prev, password_plain: newPass }));
    setShowPassword(true); // Exibe recém gerada
  };

  const handleTogglePassword = async () => {
    trigger("vibrate");
    if (!showPassword && formData.password_plain) {
      // Se tiver senha digitada, exige biometria para mostrar
      const isAuth = await authenticate();
      if (!isAuth) return;
    }
    setShowPassword(!showPassword);
  };

  const handleSubmit = async () => {
    trigger("vibrate");

    // Validação Simples
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.password_plain.trim()) newErrors.password_plain = "A senha não pode estar vazia";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    setLoading(true);

    try {
      await addCredential({
        user_id: user?.id || "",
        title: formData.title.trim(),
        username: formData.username.trim(),
        password_plain: formData.password_plain,
        url: formData.url.trim(),
        notes: formData.notes.trim(),
        category: formData.category,
      });

      trigger("success");
      router.back();
    } catch (error) {
      console.error("Erro ao salvar senha:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Nova Senha</h1>
              <p className="mt-0.5 text-sm text-ink-muted flex items-center gap-1">
                <ShieldCheck size={14} className="text-ice" />
                Criptografia E2EE ativada
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Título (ex: Netflix, Banco Itaú)"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <Input
              label="E-mail ou Usuário"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Senha secreta <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password_plain}
                  onChange={(e) => handleChange("password_plain", e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 pr-24 text-ink-primary placeholder:text-ink-muted/50 outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.password_plain ? "border-coral/50 focus:border-coral/50" : "border-surface-border/50"
                  }`}
                  placeholder="••••••••••••"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button
                    onClick={generatePassword}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ink-primary active:scale-95 transition-all"
                    aria-label="Gerar senha aleatória"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <div className="h-4 w-px bg-surface-border/50 mx-0.5"></div>
                  <button
                    onClick={handleTogglePassword}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all"
                    aria-label="Mostrar/Ocultar senha"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errors.password_plain && <p className="text-xs text-coral">{errors.password_plain}</p>}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {["banco", "social", "trabalho", "outros"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => { trigger("vibrate"); handleChange("category", cat); }}
                  className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 capitalize ${
                    formData.category === cat ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.1)]" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4">
            <Input
              label="URL do Site/App (opcional)"
              placeholder="https://exemplo.com"
              value={formData.url}
              onChange={(e) => handleChange("url", e.target.value)}
            />
            <TextArea
              label="Notas (opcional)"
              placeholder="Perguntas de segurança, dicas..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? "Criptografando e Salvando..." : "Salvar Senha"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
