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
  DollarSign,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import type { Attachment, TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Funções utilitárias para formatar data (DD/MM/YYYY <-> YYYY-MM-DD)
function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(displayStr: string): string {
  const clean = displayStr.replace(/\D/g, "");
  if (clean.length !== 8) return new Date().toISOString().slice(0, 10);
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function handleDateMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
  }
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`
  }
  return clean;
}

function addDaysToISO(dateISO: string, days: number): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
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
  
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  const [proximaDisplay, setProximaDisplay] = useState("");
  
  const [preco, setPreco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedMedicamento = medicamentos.find((m: any) => m.id === medicamentoId);

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
    
    const tipo = item.tipo_receita as TipoReceita;
    const diasValidade = (tipo && VALIDADE_RECEITA_DIAS[tipo]) ? VALIDADE_RECEITA_DIAS[tipo] : 30;
    
    const currentISO = parseDateToISO(dataDisplay);
    const proxISO = addDaysToISO(currentISO, diasValidade || 30);
    setProximaDisplay(formatDateToDisplay(proxISO));
  };

  useEffect(() => {
    if (selectedMedicamento && dataDisplay.length === 10) {
      const tipo = selectedMedicamento.tipo_receita as TipoReceita;
      const diasValidade = (tipo && VALIDADE_RECEITA_DIAS[tipo]) ? VALIDADE_RECEITA_DIAS[tipo] : 30;
      const currentISO = parseDateToISO(dataDisplay);
      const proxISO = addDaysToISO(currentISO, diasValidade || 30);
      setProximaDisplay(formatDateToDisplay(proxISO));
    }
  }, [dataDisplay, selectedMedicamento]);

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
    if (!dataDisplay || dataDisplay.length < 10) newErrors.data = "Data inválida";
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

      const dataISO = parseDateToISO(dataDisplay);
      const proximaISO = proximaDisplay.length === 10 ? parseDateToISO(proximaDisplay) : addDaysToISO(dataISO, 30);
      const precoNumerico = preco ? parseFloat(preco.replace(",", ".")) : undefined;

      await addRenovacao({
        medicamento_id: medicamentoId,
        data: dataISO,
        preco: precoNumerico, // Salva o custo relacional desta renovação
        anexo_url: anexoUrl,
        observacoes: observacoes.trim() || undefined,
      });

      await updateMedicamento(medicamentoId, {
        data_receita: dataISO,
        proxima_renovacao: proximaISO,
      });

      trigger("success");
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
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileWarning size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Nova receita / Renovação</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Medicamento Vinculado <span className="text-coral">*</span></label>
            <button onClick={() => { trigger("vibrate"); setIsMedModalOpen(true); }} className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${errors.medicamentoId ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised flex items-center justify-between`}>
              <span>{selectedMedicamento ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}` : "Selecionar medicamento"}</span>
            </button>
          </motion.div>

          {/* DATAS COM MÁSCARA AUTOMÁTICA (DD/MM/AAAA) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data da receita <span className="text-coral">*</span></label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay} 
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))} 
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Válida até</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={proximaDisplay} 
                  onChange={(e) => setProximaDisplay(handleDateMask(e.target.value))} 
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm" 
                />
              </div>
            </div>
          </motion.div>

          {/* CAMPO DE PREÇO PAGO (Custo Relacional Histórico) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Preço pago (R$) — Opcional"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              leftIcon={<DollarSign size={16} className="text-emerald-400" />}
            />
            <p className="mt-1 text-[11px] text-ink-muted px-1">Este valor será salvo para histórico de custos e comparação mensal.</p>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Notas (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Farmácia onde comprou, observações do médico..." />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <div className="mb-3"><label className="block text-sm font-medium text-ink-primary">Foto da Receita</label></div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Upload</Button>
                <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}><Camera size={16} />Câmera</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                <ImageIcon size={16} className="text-ice" />
                <p className="truncate text-sm font-medium flex-1">{attachment.name}</p>
                <button onClick={removeAttachment} className="text-ink-muted"><X size={14} /></button>
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Salvar Histórico"}
          </Button>
        </div>

        <SelectionModal isOpen={isMedModalOpen} onClose={() => setIsMedModalOpen(false)} onSelect={handleSelectMedicamento} items={medicamentos} title="Selecionar medicamento" renderItem={(item: any) => <div><p className="font-medium">{item.nome}</p><p className="text-xs text-ink-muted">{item.dosagem}</p></div>} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => {}} createNewLabel="" />
      </main>
    </PageTransition>
  );
}
