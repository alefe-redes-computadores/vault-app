"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { CustomDatePicker } from "@/components/DatePicker";
import { db } from "@/lib/db";

export default function EditMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || ""; // ← string
  const { user } = useAuth();
  const { updateMedicamento } = useMedicamentos();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    dosagem: "",
    medico: "",
    farmacia: "",
    data_receita: "",
    proxima_renovacao: "",
    observacoes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadMedicamento = async () => {
      const med = await db.medicamentos.get(id);
      if (med) {
        setFormData({
          nome: med.nome || "",
          dosagem: med.dosagem || "",
          medico: med.medico || "",
          farmacia: med.farmacia || "",
          data_receita: med.data_receita || "",
          proxima_renovacao: med.proxima_renovacao || "",
          observacoes: med.observacoes || "",
        });
      } else {
        showToast("Medicamento não encontrado", "error");
        router.push("/saude/medicamentos");
      }
      setIsLoading(false);
    };
    loadMedicamento();
  }, [id, router, showToast]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!formData.dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!formData.medico.trim()) newErrors.medico = "Médico é obrigatório";
    if (!formData.data_receita.trim()) newErrors.data_receita = "Data da receita é obrigatória";
    if (!formData.proxima_renovacao.trim()) newErrors.proxima_renovacao = "Próxima renovação é obrigatória";
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
      await updateMedicamento(id, {
        nome: formData.nome.trim(),
        dosagem: formData.dosagem.trim(),
        medico: formData.medico.trim(),
        farmacia: formData.farmacia.trim() || undefined,
        data_receita: formData.data_receita,
        proxima_renovacao: formData.proxima_renovacao,
        observacoes: formData.observacoes.trim() || undefined,
      });
      trigger("success");
      showToast("Medicamento atualizado com sucesso!", "success");
      router.push("/saude/medicamentos");
    } catch (error) {
      showToast("Erro ao atualizar medicamento", "error");
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-ice" />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar medicamento</h1>
              <p className="text-sm text-ink-muted">Atualize as informações do medicamento</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <div className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4">
            <Input
              label="Nome do medicamento"
              placeholder="Ex: Losartana Potássica"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              error={errors.nome}
              required
            />

            <Input
              label="Dosagem"
              placeholder="Ex: 50mg"
              value={formData.dosagem}
              onChange={(e) => handleChange("dosagem", e.target.value)}
              error={errors.dosagem}
              required
            />

            <Input
              label="Médico"
              placeholder="Ex: Dr. João Silva"
              value={formData.medico}
              onChange={(e) => handleChange("medico", e.target.value)}
              error={errors.medico}
              required
            />

            <Input
              label="Farmácia (opcional)"
              placeholder="Ex: Droga Raia"
              value={formData.farmacia}
              onChange={(e) => handleChange("farmacia", e.target.value)}
            />

            <CustomDatePicker
              label="Data da receita"
              value={formData.data_receita}
              onChange={(val) => handleChange("data_receita", val)}
              required
              error={errors.data_receita}
            />

            <CustomDatePicker
              label="Próxima renovação"
              value={formData.proxima_renovacao}
              onChange={(val) => handleChange("proxima_renovacao", val)}
              required
              error={errors.proxima_renovacao}
            />

            <TextArea
              label="Observações (opcional)"
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
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
                Salvar alterações
              </>
            )}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}