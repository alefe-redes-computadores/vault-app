"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";

export default function NewPersonPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addPerson } = useSafeDb();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAutoFill = () => {
    if (user?.user_metadata) {
      setName(user.user_metadata.full_name || "");
      setEmail(user.email || "");
      trigger("vibrate");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Nome é obrigatório");
      trigger("error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addPerson({
        user_id: user?.id || "",
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar_url: user?.user_metadata?.avatar_url,
      });
      trigger("success");
      router.push("/pessoas");
    } catch (err) {
      setError("Erro ao salvar pessoa");
      trigger("error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Nova pessoa</h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm"
          >
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-full bg-surface-raised flex items-center justify-center border-2 border-ice/20">
                <User size={40} className="text-ink-muted" />
              </div>
              <button
                onClick={handleAutoFill}
                className="text-sm text-ice hover:text-ice/80 transition-colors"
              >
                Preencher com meus dados do Google
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Ex: Alefe Gomes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={error}
                required
              />

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar pessoa
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}