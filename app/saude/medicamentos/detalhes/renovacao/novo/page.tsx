"use client";

import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Save,
  Loader2,
  Upload,
  X,
  FileText,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddRenovacao } from "@/lib/db";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewRenovacaoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicamentoId = searchParams.get("medicamento_id") || "";
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    data: "",
    observacoes: "",
    anexo_url: "",
  });

  const handleFileUpload = async (file: File) => {
    if (!user) {
      trigger("error");
      return;
    }

    setUploading(true);
    try {
      const folder = "renovacoes";
      const { url, error } = await uploadFile(user.id, file, folder);
      if (error) throw error;

      setFormData((prev) => ({ ...prev, anexo_url: url }));
      trigger("success");
    } catch (error) {
      console.error("Erro no upload:", error);
      trigger("error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const removeAttachment = () => {
    setFormData((prev) => ({ ...prev, anexo_url: "" }));
    trigger("vibrate");
  };

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
        anexo_url: formData.anexo_url || undefined,
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

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
                Nova renovação
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Registre uma nova renovação da receita
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.26 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <Calendar size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Data da renovação
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Informe quando a renovação foi realizada para manter o histórico correto.
                </p>
              </div>
            </div>

            <Input
              label="Data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.26, delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <ShieldCheck size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Observações
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Adicione contexto útil, como troca de farmácia, nova receita ou ajuste médico.
                </p>
              </div>
            </div>

            <TextArea
              label="Observações (opcional)"
              placeholder="Ex: Nova receita emitida, troca de farmácia, alteração de orientação..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
              }
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.26, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <Paperclip size={18} className="text-ice" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Anexo da receita
                </h2>
                <p className="mt-1 text-sm leading-5 text-ink-muted">
                  Você pode anexar imagem ou PDF para manter o histórico clínico completo.
                </p>
              </div>
            </div>

            {formData.anexo_url ? (
              <div className="flex items-center justify-between rounded-[20px] border border-surface-border/50 bg-surface-raised px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-void/30">
                    <FileText size={16} className="text-ink-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {formData.anexo_url.split("/").pop() || "Arquivo anexado"}
                    </p>
                    <p className="text-xs text-ink-muted">Arquivo pronto para envio</p>
                  </div>
                </div>

                <button
                  onClick={removeAttachment}
                  disabled={uploading}
                  aria-label="Remover anexo"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-border/40 hover:text-coral disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  trigger("vibrate");
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-dashed border-surface-border/70 bg-surface-raised px-4 py-6 text-left transition-all active:scale-[0.99] hover:border-ice/40 hover:bg-surface-raised/80 disabled:opacity-60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-void/30">
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin text-ice" />
                  ) : (
                    <Upload size={18} className="text-ice" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    {uploading ? "Enviando anexo..." : "Anexar receita"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    Selecione uma imagem ou PDF para complementar o registro.
                  </p>
                </div>
              </button>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.26, delay: 0.12 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="mt-1 flex items-center justify-center gap-2"
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