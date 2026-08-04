"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function EditPasswordContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { updateCredential } = useCredentials();
  
  const { authenticate } = useBiometric({
    title: "Editar Senha",
    subtitle: "Confirme sua identidade para editar esta credencial.",
    fallbackTitle: "Usar senha do dispositivo",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    username: "",
    password_plain: "",
    url: "",
    notes: "",
    category: "outros" as const,
  });

  useEffect(() => {
    async function loadCredential() {
      if (!id) return;
      try {
        const item = await db.credentials.get(id);
        if (item) {
          // Exige biometria antes de popular o formulário e revelar a senha real
          const isAuth = await authenticate();
          if (!isAuth) {
            router.back();
            return;
          }
          
          setHasAuthenticated(true);
          const plainText = decryptPassword(item.password_encrypted);
          
          setFormData({
            title: item.title,
            username: item.username || "",
            password_plain: plainText,
            url: item.url || "",
            notes: item.notes || "",
            category: item.category,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCredential();
  }, [id, authenticate, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const generatePassword = () => {
    trigger("vibrate");
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|";
    let newPass = "";
    for (let i = 0; i < 16; i++) {
      newPass += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData((prev) => ({ ...prev, password_plain: newPass }));
    setShowPassword(true);
  };

  const handleSubmit = async () => {
    if (!id) return;
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.password_plain.trim()) newErrors.password_plain = "A senha não pode estar vazia";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      await updateCredential(id, {
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
      console.error("Erro ao salvar:", error);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !hasAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 size={32} className="animate-spin text-ice" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-ink-primary">Editar Senha</h1>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
              <ShieldCheck size={14} className="text-ice" /> Criptografia E2EE ativada
            </p>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="Título" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} error={errors.title} required />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="E-mail ou Usuário" value={formData.username} onChange={(e) => handleChange("username", e.target.value)} />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Senha secreta <span className="text-coral">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password_plain}
                  onChange={(e) => handleChange("password_plain", e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 pr-24 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.password_plain ? "border-coral/50" : "border-surface-border/50"}`}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button onClick={generatePassword} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ink-primary active:scale-95 transition-all">
                    <RefreshCw size={16} />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-surface-border/50"></div>
                  <button onClick={() => setShowPassword(!showPassword)} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all">
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
                  className={`capitalize rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${formData.category === cat ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input label="URL do Site/App (opcional)" value={formData.url} onChange={(e) => handleChange("url", e.target.value)} />
            <TextArea label="Notas (opcional)" value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Salvando Alterações..." : "Salvar Alterações"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}

export default function EditPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void"><Loader2 size={32} className="animate-spin text-ice" /></div>}>
      <EditPasswordContent />
    </Suspense>
  );
}
