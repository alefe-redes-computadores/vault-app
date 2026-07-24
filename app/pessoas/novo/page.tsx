"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { safeAddPerson } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";

export default function NewPersonPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  const handleSubmit = async () => {
    trigger("vibrate");

    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      trigger("error");
      return;
    }

    if (!user?.id) {
      setError("Usuário não autenticado");
      trigger("error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ✅ Usa safeAddPerson que já cuida da transação e sync
      await safeAddPerson({
        user_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        avatar_url: formData.avatar_url || undefined,
      });

      trigger("success");
      showToast("Pessoa adicionada com sucesso!", "success");
      router.push("/pessoas");
    } catch (err: any) {
      console.error("Erro ao salvar pessoa:", err);
      setError(err?.message || "Erro ao salvar pessoa");
      trigger("error");
      showToast("Erro ao salvar pessoa", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreencherDados = () => {
    trigger("vibrate");

    const nome = user?.user_metadata?.full_name || "";
    const email = user?.email || "";
    const avatar = user?.user_metadata?.avatar_url || "";

    setFormData({
      name: nome,
      email: email,
      phone: "",
      avatar_url: avatar,
    });

    showToast("Dados preenchidos com seu perfil!", "info");
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova pessoa
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre uma pessoa para vincular documentos com mais rapidez
              </p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-surface-border/50 bg-surface-raised shadow-sm">
                <User size={28} className="text-ice" />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Cadastro</p>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  Dados da pessoa
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Salve os dados principais para reutilizar em documentos e registros do app.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-[22px] border border-surface-border/40 bg-surface-raised/60 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface">
                  <User size={20} className="text-ink-muted" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    Preencher com meus dados
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-faint">
                    Usa nome, e-mail e avatar do seu perfil atual para acelerar o cadastro.
                  </p>
                </div>
              </div>

              <button
                onClick={handlePreencherDados}
                className="mt-3 inline-flex rounded-full bg-ice/12 px-3.5 py-2 text-sm font-medium text-ice transition-all active:scale-95 hover:bg-ice/16"
              >
                Usar meu perfil
              </button>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.04 }}
              >
                <Input
                  label="Nome completo"
                  placeholder="Ex: Alefe Gomes"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  error={error}
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.08 }}
                className="relative"
              >
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="pl-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.12 }}
                className="relative"
              >
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="pl-9"
                />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.16 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Adicionar pessoa
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}