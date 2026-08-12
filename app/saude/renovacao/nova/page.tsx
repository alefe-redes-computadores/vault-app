"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  FileWarning,
  Upload,
  Camera,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import type { Attachment } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NovaRenovacaoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSelectMedId = searchParams.get("medicamento_id");
  
  const { user } = useAuth();
  const { medicamentos, updateMedicamento } = useMedicamentos();
  const { addRenovacao } = useRenovacoes();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [medicamentoId, setMedicamentoId] = useState("");
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(today);
  const [novaProximaRenovacao, setNovaProximaRenovacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedMedicamento = medicamentos.find((m: any) => m.id === medicamentoId);

  // Auto-seleciona o medicamento se vier da página de detalhes
  useEffect(() => {
    if (autoSelectMedId && medicamentos.length > 0 && !medicamentoId) {
      const med = medicamentos.find((m: any) => m.id === autoSelectMedId);
      if (med) {
        handleSelectMedicamento(med);
      }
    }
  }, [autoSelectMedId, medicamentos, medicamentoId]);

  const handleSelectMedicamento = (item: any) => {
    trigger("vibrate");
    setMedicamentoId(item.id!);
    
    // Calcula a próxima data de renovação baseado na cor da receita (Padrão 30 dias se não achar)
    const diasValidade = item.tipo_receita ? VALIDADE_RECEITA_DIAS[item.tipo_receita] : 30;
    setNovaProximaRenovacao(addDays(data, diasValidade || 30));
  };

  // Recalcula a sugestão se a data da receita mudar
  useEffect(() => {
    if (selectedMedicamento && data) {
      const diasValidade = selectedMedicamento.tipo_receita ? VALIDADE_RECEITA_DIAS[selectedMedicamento.tipo_receita] : 30;
      setNovaProximaRenovacao(addDays(data, diasValidade || 30));
    }
  }, [data, selectedMedicamento]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: `renovacao_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!medicamentoId) newErrors.medicamentoId = "Selecione o medicamento";
    if (!data) newErrors.data = "Data é obrigatória";
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
      let anexoUrl: string | undefined;

      if (localFile && user) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          anexoUrl = url;
          if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
        }
      }

      // 1. Salva o "Filho" (A Renovação/Receita)
      await addRenovacao({
        medicamento_id: medicamentoId,
        data,
        anexo_url: anexoUrl,
        observacoes: observacoes.trim() || undefined,
      });

      // 2. Atualiza o "Pai" (Medicamento) - ISSO MATA O ALERTA FANTASMA!
      await updateMedicamento(medicamentoId, {
        data_receita: data, // Atualiza a data da última receita
        proxima_renovacao: novaProximaRenovacao || addDays(data, 30), // Empurra a validade pra frente
      });

      trigger("success");
      
      // Se veio da tela do medicamento, volta pra ela, senão vai pra home de saúde
      if (autoSelectMedId) {
        router.back();
      } else {
        router.push("/saude");
      }
    } catch (error) {
      console.error("Erro ao salvar renovação:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileWarning size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova receita
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Registre a renovação e anexe a foto da receita.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              Medicamento Vinculado <span className="text-coral">*</span>
            </label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsMedModalOpen(true);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${
                errors.medicamentoId ? "border-coral/50" : "border-surface-border/50"
              } bg-surface-raised`}
            >
              {selectedMedicamento
                ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}`
                : "Selecionar medicamento"}
            </button>
            {errors.medicamentoId && (
              <p className="mt-1 text-xs text-coral">{errors.medicamentoId}</p>
            )}
            {selectedMedicamento && (
              <p className="mt-2 text-xs text-ink-muted">
                Dr(a). {selectedMedicamento.medico}
                {selectedMedicamento.farmacia ? ` · ${selectedMedicamento.farmacia}` : ""}
              </p>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.04 }}
            className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Data da receita <span className="text-coral">*</span>
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                  errors.data ? "border-coral/50" : "border-surface-border/50"
                }`}
              />
              {errors.data && <p className="text-xs text-coral">{errors.data}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Válida até (Estimada)
              </label>
              <input
                type="date"
                value={novaProximaRenovacao}
                onChange={(e) => setNovaProximaRenovacao(e.target.value)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Notas (opcional)"
              placeholder="Ex: Peguei a receita no posto, mudou de médico..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">
                Foto da Receita (opcional mas recomendado)
              </label>
              <p className="mt-1 text-xs text-ink-muted">
                Anexe a receita para manter no histórico desse medicamento.
              </p>
            </div>

            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                    fileInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  <Upload size={16} />
                  Upload
                </Button>
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                    cameraInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  <Camera size={16} />
                  Câmera
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border/40 bg-surface">
                    {attachment.type === "image" ? (
                      <ImageIcon size={16} className="text-ice" />
                    ) : (
                      <FileText size={16} className="text-ice" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {attachment.type === "image" ? "Imagem" : "PDF"}
                    </p>
                  </div>
                  <button
                    onClick={removeAttachment}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-border/40 hover:text-ink-primary"
                    disabled={loading}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Histórico
              </>
            )}
          </Button>
        </div>

        <SelectionModal
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={handleSelectMedicamento}
          items={medicamentos}
          title="Selecionar medicamento"
          placeholder="Buscar medicamento..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">
                {item.nome} · {item.dosagem}
              </p>
              <p className="text-xs text-ink-muted">Dr(a). {item.medico}</p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsMedModalOpen(false);
            trigger("vibrate");
            router.push("/saude/medicamentos/novo");
          }}
          createNewLabel="Cadastrar medicamento"
        />
      </main>
    </PageTransition>
  );
}
