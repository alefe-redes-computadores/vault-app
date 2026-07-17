"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddMedicamento } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";

export default function NewMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    dosagem: "",
    medico: "",
    farmacia: "",
    data_receita: "",
    proxima_renovacao: "",
    observacoes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.dosagem || !formData.medico || !formData.proxima_renovacao) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await safeAddMedicamento({
        document_id: 0,
        nome: formData.nome,
        dosagem: formData.dosagem,
        medico: formData.medico,
        farmacia: formData.farmacia || undefined,
        data_receita: formData.data_receita || new Date().toISOString().split("T")[0],
        proxima_renovacao: formData.proxima_renovacao,
        observacoes: formData.observacoes || undefined,
      });
      trigger("success");
      router.push("/saude/medicamentos");
    } catch (error) {
      console.error(error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo medicamento</h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <Input
            label="Nome do medicamento"
            placeholder="Ex: Losartana"
            value={formData.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
          />
          <Input
            label="Dosagem"
            placeholder="Ex: 50mg"
            value={formData.dosagem}
            onChange={(e) => handleChange("dosagem", e.target.value)}
          />
          <Input
            label="Médico"
            placeholder="Nome do médico"
            value={formData.medico}
            onChange={(e) => handleChange("medico", e.target.value)}
          />
          <Input
            label="Farmácia (opcional)"
            placeholder="Nome da farmácia"
            value={formData.farmacia}
            onChange={(e) => handleChange("farmacia", e.target.value)}
          />
          <Input
            label="Data da receita"
            type="date"
            value={formData.data_receita}
            onChange={(e) => handleChange("data_receita", e.target.value)}
          />
          <Input
            label="Próxima renovação"
            type="date"
            value={formData.proxima_renovacao}
            onChange={(e) => handleChange("proxima_renovacao", e.target.value)}
          />
          <Input
            label="Observações (opcional)"
            placeholder="Informações adicionais..."
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar medicamento"}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}