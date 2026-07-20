"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

export default function EditMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
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
      }
      setIsLoading(false);
    };
    loadMedicamento();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.dosagem || !formData.medico || !formData.proxima_renovacao) {
      trigger("error");
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    setLoading(true);
    try {
      await db.medicamentos.update(id, {
        ...formData,
        updated_at: new Date().toISOString(),
        synced: false,
      });
      trigger("success");
      showToast("Medicamento atualizado com sucesso!", "success");
      router.push(`/saude/medicamentos/detalhes?id=${id}`);
    } catch (error) {
      console.error(error);
      trigger("error");
      showToast("Erro ao atualizar medicamento", "error");
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar medicamento</h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Input
              label="Nome do medicamento"
              placeholder="Ex: Losartana"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Input
              label="Dosagem"
              placeholder="Ex: 50mg"
              value={formData.dosagem}
              onChange={(e) => handleChange("dosagem", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Input
              label="Médico"
              placeholder="Nome do médico"
              value={formData.medico}
              onChange={(e) => handleChange("medico", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Input
              label="Farmácia (opcional)"
              placeholder="Nome da farmácia"
              value={formData.farmacia}
              onChange={(e) => handleChange("farmacia", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Input
              label="Data da receita"
              type="date"
              value={formData.data_receita}
              onChange={(e) => handleChange("data_receita", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Input
              label="Próxima renovação"
              type="date"
              value={formData.proxima_renovacao}
              onChange={(e) => handleChange("proxima_renovacao", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Input
              label="Observações (opcional)"
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
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
                  Salvar alterações
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}