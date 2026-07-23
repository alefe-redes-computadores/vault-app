"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Stethoscope,
  BadgeInfo,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { useMedicos } from "@/hooks/useMedicos";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

export default function NovoMedicoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addMedico } = useMedicos();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    especialidade: "",
    crm: "",
    telefone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");

    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await addMedico({
        user_id: user?.id || "",
        nome: formData.nome.trim(),
        especialidade: formData.especialidade.trim() || undefined,
        crm: formData.crm.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      trigger("success");
      showToast("Médico cadastrado com sucesso!", "success");
      router.push("/saude/medicos");
    } catch (error) {
      showToast("Erro ao cadastrar médico", "error");
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
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
                Saúde
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo médico
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre um profissional de saúde
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <Stethoscope size={18} className="text-ice" />
              </div>

              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Dados do profissional
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Preencha os dados principais para reutilizar esse médico em receitas e registros.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Nome completo"
                  placeholder="Ex: Dr. João Silva"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  error={errors.nome}
                  required
                  className="pl-9"
                />
              </div>

              <Input
                label="Especialidade"
                placeholder="Ex: Cardiologia, Pediatria..."
                value={formData.especialidade}
                onChange={(e) => handleChange("especialidade", e.target.value)}
              />

              <div className="relative">
                <BadgeInfo
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="CRM"
                  placeholder="Ex: SP-123456"
                  value={formData.crm}
                  onChange={(e) => handleChange("crm", e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="medico@exemplo.com"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.04 }}
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
                  Salvar médico
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}