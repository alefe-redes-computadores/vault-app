"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, RefreshCw, ShieldCheck, Wand2, X, History, Copy } from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import type { Credential } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Medidor de Força
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

function EditPasswordContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
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

  // Estados Originais para Lógica de Histórico
  const [originalItem, setOriginalItem] = useState<any>(null);
  const [originalPlainPass, setOriginalPlainPass] = useState("");
  
  // Histórico local visível
  const [historyItems, setHistoryItems] = useState<{encrypted: string, date: string}[]>([]);
  const [visibleHistoryPass, setVisibleHistoryPass] = useState<Record<number, boolean>>({});

  // Estados do Gerador
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genOptions, setGenOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true });

  const [formData, setFormData] = useState({
    title: "",
    username: "",
    password_plain: "",
    url: "",
    notes: "",
    category: "outros" as Credential["category"],
  });

  const strengthScore = calculateStrength(formData.password_plain);

  useEffect(() => {
    async function loadCredential() {
      if (!id) return;
      try {
        const item = await db.credentials.get(id);
        if (item) {
          const isAuth = await authenticate();
          if (!isAuth) {
            router.back();
            return;
          }
          
          setHasAuthenticated(true);
          const plainText = decryptPassword(item.password_encrypted) || "";
          
          setOriginalItem(item);
          setOriginalPlainPass(plainText);
          setHistoryItems((item as any).password_history || []);
          
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const copyOldPassword = async (encrypted: string) => {
    try {
      trigger("vibrate");
      const isAuth = await authenticate();
      if (!isAuth) return;
      const plainText = decryptPassword(encrypted);
      if (plainText) {
        await Clipboard.write({ string: plainText });
        showToast("Senha antiga copiada!", "success");
      }
    } catch (e) {
      trigger("error");
    }
  };

  const toggleVisibleHistory = async (index: number) => {
    if (!visibleHistoryPass[index]) {
      const isAuth = await authenticate();
      if (!isAuth) return;
    }
    trigger("vibrate");
    setVisibleHistoryPass(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSubmit = async () => {
    if (!id || !originalItem) return;
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
      const payload: any = {
        title: formData.title.trim(),
        username: formData.username.trim(),
        password_plain: formData.password_plain,
        url: formData.url.trim(),
        notes: formData.notes.trim(),
        category: formData.category,
      };

      // ✅ Lógica do Histórico: Se a senha mudou, joga a antiga (criptografada) pro histórico
      if (formData.password_plain !== originalPlainPass) {
        const newHistory = [...historyItems];
        newHistory.push({
          encrypted: originalItem.password_encrypted,
          date: new Date().toISOString()
        });
        payload.password_history = newHistory;
      }

      await updateCredential(id, payload);
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">Senha secreta <span className="text-coral">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password_plain}
                  onChange={(e) => handleChange("password_plain", e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 pr-24 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.password_plain ? "border-coral/50" : "border-surface-border/50"}`}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button onClick={() => { trigger("vibrate"); setShowGenerator(true); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all">
                    <Wand2 size={16} />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-surface-border/50"></div>
                  <button onClick={handleTogglePassword} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-border/50 hover:text-ice active:scale-95 transition-all">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Barra de Força da Senha */}
              <div className="flex gap-1 h-1 w-full mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className={`flex-1 rounded-full transition-colors duration-500 ${strengthScore >= level ? getStrengthColor(strengthScore) : "bg-surface-border/40"}`} />
                ))}
              </div>

              {errors.password_plain && <p className="text-xs text-coral mt-1">{errors.password_plain}</p>}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {(["banco", "social", "trabalho", "outros"] as const).map((cat) => (
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

          {/* ✅ Seção de Histórico de Senhas (Aparece apenas se houver histórico) */}
          {historyItems.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-ink-primary flex items-center gap-2">
                <History size={16} className="text-ink-muted" /> Senhas Anteriores
              </h3>
              <div className="space-y-3">
                {historyItems.map((hist, idx) => {
                  const dataFormatada = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(hist.date));
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-2xl bg-surface-raised p-3 border border-surface-border/40">
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Trocada em: {dataFormatada}</p>
                        <p className="font-mono text-sm text-ink-primary">
                          {visibleHistoryPass[idx] ? decryptPassword(hist.encrypted) : "••••••••••••"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleVisibleHistory(idx)} className="p-2 text-ink-muted hover:text-ice transition-colors">
                          {visibleHistoryPass[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => copyOldPassword(hist.encrypted)} className="p-2 text-ink-muted hover:text-ice transition-colors">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }).reverse()} {/* Inverte para mostrar as mais recentes primeiro */}
              </div>
            </motion.div>
          )}
        </section>

        {/* Gerador de Senhas Bottom Sheet */}
        <AnimatePresence>
          {showGenerator && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGenerator(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] border-t border-surface-border/60 bg-surface p-6 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold text-ink-primary flex items-center gap-2">
                    <Wand2 size={20} className="text-ice" /> Gerador Inteligente
                  </h3>
                  <button onClick={() => setShowGenerator(false)} className="rounded-full p-2 bg-surface-raised text-ink-muted active:scale-95"><X size={16}/></button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2"><span className="text-ink-muted">Tamanho</span><span className="font-mono text-ice font-bold">{genLength} caracteres</span></div>
                    <input type="range" min="8" max="64" value={genLength} onChange={(e) => { trigger("vibrate"); setGenLength(Number(e.target.value)); }} className="w-full accent-ice" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'uppercase', label: 'Maiúsculas (A-Z)' },
                      { id: 'lowercase', label: 'Minúsculas (a-z)' },
                      { id: 'numbers', label: 'Números (0-9)' },
                      { id: 'symbols', label: 'Símbolos (!@#)' }
                    ].map((opt) => (
                      <button key={opt.id} onClick={() => { trigger("vibrate"); setGenOptions(p => ({ ...p, [opt.id]: !p[opt.id as keyof typeof p] })); }} className={`flex items-center justify-center rounded-2xl border py-3 text-sm font-medium transition-all active:scale-95 ${genOptions[opt.id as keyof typeof genOptions] ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <Button variant="primary" fullWidth size="lg" onClick={executeGeneration} className="shadow-lg shadow-ice/10 mt-2">
                    Aplicar Senha Gerada
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
