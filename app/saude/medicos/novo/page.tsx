"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo médico</h1>
              <p className="text-sm text-ink-muted">Cadastre um profissional de saúde</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <div className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4">
            <Input
              label="Nome completo"
              placeholder="Ex: Dr. João Silva"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              error={errors.nome}
              required
            />

            <Input
              label="Especialidade"
              placeholder="Ex: Cardiologia, Pediatria..."
              value={formData.especialidade}
              onChange={(e) => handleChange("especialidade", e.target.value)}
            />

            <Input
              label="CRM"
              placeholder="Ex: SP-123456"
              value={formData.crm}
              onChange={(e) => handleChange("crm", e.target.value)}
            />

            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={formData.telefone}
              onChange={(e) => handleChange("telefone", e.target.value)}
            />

            <Input
              label="E-mail"
              placeholder="medico@exemplo.com"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

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
        </section>
      </main>
    </PageTransition>
  );
}