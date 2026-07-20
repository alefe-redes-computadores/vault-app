"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

export default function NovaFarmaciaPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addFarmacia } = useFarmacias();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    telefone: "",
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
    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await addFarmacia({
        user_id: user?.id || "",
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
      });
      trigger("success");
      showToast("Farmácia cadastrada com sucesso!", "success");
      router.push("/saude/farmacias");
    } catch (error) {
      showToast("Erro ao cadastrar farmácia", "error");
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">Nova farmácia</h1>
              <p className="text-sm text-ink-muted">Cadastre uma farmácia para receitas</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <div className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4">
            <Input
              label="Nome da farmácia"
              placeholder="Ex: Droga Raia"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              error={errors.nome}
              required
            />

            <Input
              label="Endereço"
              placeholder="Ex: Rua das Flores, 123"
              value={formData.endereco}
              onChange={(e) => handleChange("endereco", e.target.value)}
            />

            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={formData.telefone}
              onChange={(e) => handleChange("telefone", e.target.value)}
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
                Salvar farmácia
              </>
            )}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}