"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const id = searchParams.get("id") || "";
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
        <main className="min-h-screen bg-void px-5 pb-28 pt-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-8 shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ice border-t-transparent" />
            <p className="mt-4 text-center text-sm text-ink-muted">
              Carregando medicamento...
            </p>
          </div>
        </main>
      </PageTransition>
    );
  }

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
                Editar medicamento
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Atualize as informações do medicamento
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
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Pill size={28} className="text-ink-muted" />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Editando</p>
                <p className="truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.nome || "Medicamento"}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Revise os dados e salve para manter o histórico sempre correto.
                </p>
              </div>
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
                <Pill size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Dados principais
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Atualize o nome e a dosagem do medicamento.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
                <Stethoscope size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Prescrição
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Revise o médico responsável e a farmácia, se aplicável.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
                <Calendar size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Datas
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Mantenha as datas sincronizadas para alertas e renovações futuras.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.16 }}
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
                  Registre informações adicionais importantes sobre o uso ou acompanhamento.
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
            transition={{ duration: 0.26, delay: 0.2 }}
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