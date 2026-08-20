// components/saude/SOSDoseModal.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Pill,
  Droplet,
  Syringe,
  StickyNote,
  Circle,
  AlertTriangle,
  Clock,
  Plus,
  Check,
  PhoneCall,
  ChevronRight,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useToast } from "@/components/ToastProvider";
import { safeSetDoseLog, safeUpdateMedicamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Medicamento } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface SOSDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getMedicamentoIcon(formato?: string) {
  switch (formato) {
    case "gota":
      return Droplet;
    case "injecao":
      return Syringe;
    case "adesivo":
      return StickyNote;
    case "capsula":
      return Pill;
    default:
      return Circle;
  }
}

export function SOSDoseModal({ isOpen, onClose }: SOSDoseModalProps) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { medicamentos } = useMedicamentos();
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();

  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [hora, setHora] = useState<string>(
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [estoqueZerado, setEstoqueZerado] = useState(false);

  const sosMedicamentos = useMemo(() => {
    return (medicamentos || []).filter(
      (med: Medicamento) => med.tipo_uso === "esporadico" || med.tipo_uso === "sos"
    );
  }, [medicamentos]);

  const selectedMed = sosMedicamentos.find((m) => m.id === selectedMedId) || null;

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedMedId(null);
    setIsSelectOpen(false);
    setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    setQuantidade("1");
    setObservacoes("");
    setAlertMessage(null);
    setEstoqueZerado(false);
    onClose();
  };

  const handleMedSelect = (medId: string) => {
    trigger("vibrate");
    setSelectedMedId(medId);
    setIsSelectOpen(false);
    setAlertMessage(null);
    setEstoqueZerado(false);
  };

  const handleSubmit = () => {
    if (!selectedMed) {
      trigger("error");
      showToast("Selecione um medicamento", "error");
      return;
    }

    const qtd = Number(quantidade) || 1;
    const doseUsual = Number(selectedMed.estoque_unidade_por_dose) || 1;

    // Alerta de saúde
    if (qtd > doseUsual * 5) {
      setAlertMessage(
        `A quantidade informada (${qtd}) é ${Math.round(qtd / doseUsual)}x maior que a dose usual (${doseUsual}). Se estiver passando por um momento difícil, fale com alguém agora. CVV: 188.`
      );
      trigger("vibrate");
      return;
    }

    // Estoque zerado
    if (selectedMed.estoque_quantidade !== undefined && selectedMed.estoque_quantidade <= 0) {
      setEstoqueZerado(true);
      trigger("error");
      return;
    }

    run(
      async () => {
        const agora = new Date();
        const isoData = agora.toISOString().slice(0, 10);

        // 1. Registra a dose
        const doseId = await safeSetDoseLog({
          user_id: selectedMed.user_id,
          person_id: activePersonId || undefined,
          medicamento_id: selectedMed.id!,
          data: isoData,
          horario: hora,
          quantidade: qtd,
          tomado_em: agora.toISOString(),
        });

        await enfileirarOperacao("doseLogs", "add", {
          id: doseId,
          user_id: selectedMed.user_id,
          person_id: activePersonId,
          medicamento_id: selectedMed.id,
          data: isoData,
          horario: hora,
          quantidade: qtd,
          tomado_em: agora.toISOString(),
        });

        // 2. Abate do estoque
        if (typeof selectedMed.estoque_quantidade === "number") {
          const novoEstoque = Math.max(0, selectedMed.estoque_quantidade - qtd);
          await safeUpdateMedicamento(selectedMed.id!, {
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: isoData,
          });
          await enfileirarOperacao("medicamentos", "update", {
            id: selectedMed.id,
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: isoData,
          });
        }

        trigger("success");
        showToast("Dose registrada com sucesso!", "success");
        handleClose();
      },
      {
        successMessage: "Dose registrada",
        errorMessage: "Erro ao registrar dose",
        goBackOnSuccess: false,
      }
    );
  };

  const handleEstoqueRedirect = () => {
    if (selectedMed) {
      router.push(`/saude/medicamentos/editar?id=${selectedMed.id}&intent=compra`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md rounded-t-[32px] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-primary">
                  Registrar Dose SOS
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Selecione o medicamento usado
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-ink-muted active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de medicamento */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Medicamento
                </label>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setIsSelectOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                >
                  {selectedMed ? (
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        {(() => {
                          const Icon = getMedicamentoIcon(selectedMed.formato);
                          return <Icon size={18} />;
                        })()}
                      </span>
                      <span>
                        <span className="block font-medium text-ink-primary">
                          {selectedMed.nome}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {selectedMed.dosagem}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-ink-muted">Selecionar medicamento...</span>
                  )}
                  <ChevronRight size={16} className="text-ink-faint" />
                </button>
              </div>

              {/* Hora */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Hora
                </label>
                <div className="relative">
                  <Clock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-10 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice"
                  />
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Quantidade{" "}
                  {selectedMed?.formato === "gota"
                    ? "(gotas)"
                    : selectedMed?.formato === "comprimido"
                    ? "(comprimidos)"
                    : ""}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Por que tomou? (opcional)"
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice resize-none"
                />
              </div>

              {/* Alerta de quantidade alta */}
              {alertMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>{alertMessage}</p>
                  </div>
                  {alertMessage.includes("188") && (
                    <button
                      onClick={() => window.open("tel:188")}
                      className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ice"
                    >
                      <PhoneCall size={14} /> Ligar CVV 188
                    </button>
                  )}
                </motion.div>
              )}

              {/* Estoque zerado */}
              {estoqueZerado && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral"
                >
                  <p>Estoque zerado para este medicamento.</p>
                  <button
                    onClick={handleEstoqueRedirect}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ice"
                  >
                    <Plus size={14} /> Atualizar estoque
                  </button>
                </motion.div>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-2"
              >
                {isSubmitting ? "Salvando..." : "Registrar Dose"}
              </Button>
            </div>
          </motion.div>

          {/* Modal de seleção de medicamento */}
          <AnimatePresence>
            {isSelectOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsSelectOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="fixed bottom-0 left-0 right-0 z-[70] mx-auto w-full max-w-md rounded-t-[32px] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold text-ink-primary">
                      Medicamentos SOS
                    </h3>
                    <button
                      onClick={() => setIsSelectOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-ink-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto space-y-2">
                    {sosMedicamentos.length === 0 ? (
                      <div className="py-8 text-center text-sm text-ink-muted">
                        Nenhum medicamento SOS cadastrado.
                        <button
                          onClick={() => {
                            onClose();
                            router.push("/saude/medicamentos/novo?tipo=sos");
                          }}
                          className="mt-3 text-ice font-semibold"
                        >
                          Cadastrar agora
                        </button>
                      </div>
                    ) : (
                      sosMedicamentos.map((med) => {
                        const Icon = getMedicamentoIcon(med.formato);
                        const isSelected = med.id === selectedMedId;
                        return (
                          <button
                            key={med.id}
                            onClick={() => handleMedSelect(med.id!)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                              isSelected
                                ? "border-ice bg-ice/10"
                                : "border-surface-border/50 bg-surface-raised hover:bg-surface-raised"
                            }`}
                          >
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"
                              style={{
                                backgroundColor: med.cores?.[0]
                                  ? `${med.cores[0]}20`
                                  : undefined,
                              }}
                            >
                              <Icon size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-ink-primary">
                                {med.nome}
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {med.dosagem}
                              </span>
                            </span>
                            {isSelected && (
                              <Check size={16} className="text-ice shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}