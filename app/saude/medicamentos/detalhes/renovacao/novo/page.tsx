"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Save, Loader2, Upload } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddRenovacao } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

export default function NewRenovacaoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicamentoId = Number(searchParams.get("medicamento_id"));

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data: "",
    observacoes: "",
  });

  const handleSubmit = async () => {
    if (!formData.data) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await safeAddRenovacao({
        medicamento_id: medicamentoId,
        data: formData.data,
        observacoes: formData.observacoes || undefined,
      });
      trigger("success");
      router.push(`/saude/medicamentos/detalhes?id=${medicamentoId}`);
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
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Nova renovação
              </h1>
              <p className="text-sm text-ink-muted">Registre uma nova renovação da receita</p>
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
              label="Data da renovação"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <TextArea
              label="Observações (opcional)"
              placeholder="Ex: Nova receita, troca de farmácia, etc."
              value={formData.observacoes}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => trigger("vibrate")}
            >
              <Upload size={16} />
              Anexar receita
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Registrar renovação
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}