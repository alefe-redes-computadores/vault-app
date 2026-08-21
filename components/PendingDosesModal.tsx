// components/PendingDosesModal.tsx
"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface PendingDosesModalProps {
  isOpen: boolean;
  onClose: () => void;
  doses: Array<{ medicamentoId: string; nome: string; horario: string }>;
  onTomarDose: (dose: { medicamentoId: string; nome: string; horario: string }) => Promise<void>;
  onTomarTodas: () => Promise<void>;
  isProcessingDose: string | null;
  isProcessingAll: boolean;
  onExpand: () => void; // 🔥 NOVA PROP
}

export function PendingDosesModal({
  isOpen,
  onClose,
  doses,
  onTomarDose,
  onTomarTodas,
  isProcessingDose,
  isProcessingAll,
  onExpand, // 🔥 DESESTRUTURADA
}: PendingDosesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-void/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface rounded-[32px] p-6 shadow-2xl space-y-5 border border-surface-border"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-primary">
              Doses Pendentes
            </h3>
            <p className="text-xs text-ink-muted">Gerencie suas pendências de hoje</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-raised hover:bg-surface-border transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {doses.map((d, index) => {
            const isProcessing = isProcessingDose === `${d.medicamentoId}-${d.horario}`;
            return (
              <div
                key={`${d.medicamentoId}-${index}`}
                className={`flex items-center justify-between p-3.5 bg-surface-raised rounded-2xl border border-surface-border/50 ${
                  isProcessing ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-primary truncate">{d.nome}</p>
                  <p className="text-[10px] text-ink-muted font-mono">{d.horario}</p>
                </div>
                <button
                  onClick={() => onTomarDose(d)}
                  disabled={isProcessing || isProcessingAll}
                  className="text-emerald-400 font-bold text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessing ? "Salvando..." : "Tomar"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onExpand(); // 🔥 USA A PROP
            }}
            className="p-3.5 text-xs font-semibold rounded-2xl bg-surface-raised hover:bg-surface-border transition-all active:scale-95"
          >
            Expandir Cronograma
          </button>
          <button
            onClick={onTomarTodas}
            disabled={isProcessingAll || doses.length === 0}
            className="p-3.5 text-xs font-semibold rounded-2xl bg-coral text-white shadow-md shadow-coral/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingAll ? "Processando..." : "Tomar Tudo Agora"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}