"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Pill,
  Calendar,
  Stethoscope,
  Building2,
  FileText,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddMedicamento } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { scheduleMedicationRenewalNotification } from "@/lib/notifications";
import { db } from "@/lib/db";

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
        user_id: "",
        document_id: "",
        nome: formData.nome,
        dosagem: formData.dosagem,
        medico: formData.medico,
        farmacia: formData.farmacia || undefined,
        data_receita: formData.data_receita || new Date().toISOString().split("T")[0],
        proxima_renovacao: formData.proxima_renovacao,
        observacoes: formData.observacoes || undefined,
      });

      const medicamentos = await db.medicamentos.toArray();
      const ultimo = medicamentos[medicamentos.length - 1];

      if (ultimo?.id && formData.data_receita) {
        const dataEmissao = new Date(formData.data_receita);
        const dataNotificacao = new Date(dataEmissao);
        dataNotificacao.setDate(dataNotificacao.getDate() + 25);

        if (dataNotificacao > new Date()) {
          await scheduleMedicationRenewalNotification(
            ultimo.id,
            formData.nome,
            dataNotificacao.toISOString().split("T")[0],
            formData.medico
          );
        }
      }

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
                Novo medicamento
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre um medicamento e acompanhe a próxima renovação
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
                <Pill size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Dados principais
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Informe os dados básicos para identificar o medicamento com clareza.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <Stethoscope size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Prescrição
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Relacione o médico responsável e, se quiser, a farmácia utilizada.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <Calendar size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Datas importantes
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Defina a data da receita e quando ela precisará ser renovada.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <FileText size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Observações
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Adicione detalhes extras, instruções ou qualquer contexto útil.
                </p>
              </div>
            </div>

            <TextArea
              label="Observações (opcional)"
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.16 }}
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
                  Salvar medicamento
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}