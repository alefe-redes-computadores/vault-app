"use client";

import { useEffect, useState } from "react";
import { Droplet, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useHapticFeedback } from "@/lib/haptics";

interface Props {
  isAtivo: boolean;
  onToggle: (ativo: boolean) => void;
  mlTotal: string;
  setMlTotal: (val: string) => void;
  gotasPorMl: string;
  setGotasPorMl: (val: string) => void;
  onEstoqueCalculado?: (totalDoses: number) => void;
}

export function CalculadoraGotas({
  isAtivo,
  onToggle,
  mlTotal,
  setMlTotal,
  gotasPorMl,
  setGotasPorMl,
  onEstoqueCalculado,
}: Props) {
  const { trigger } = useHapticFeedback();

  // Cálculo automático das gotas totais do frasco
  const totalGotas = Number(mlTotal || 0) * Number(gotasPorMl || 0);

  useEffect(() => {
    if (isAtivo && onEstoqueCalculado) {
      onEstoqueCalculado(totalGotas);
    }
  }, [mlTotal, gotasPorMl, isAtivo, totalGotas, onEstoqueCalculado]);

  return (
    <div className="rounded-[24px] border border-surface-border/60 bg-surface p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/10 text-ice">
            <Droplet size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">Medição por Gotas / Frasco</p>
            <p className="text-[11px] text-ink-muted">Cálculo automático de ml para gotas/doses</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            trigger("vibrate");
            onToggle(!isAtivo);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isAtivo ? "bg-ice" : "bg-surface-raised"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void shadow-lg ring-0 transition duration-200 ease-in-out ${
              isAtivo ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {isAtivo && (
        <div className="space-y-3 pt-2 border-t border-surface-border/40 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Volume do Frasco (ml)"
              placeholder="Ex: 20"
              value={mlTotal}
              onChange={(e) => setMlTotal(e.target.value)}
            />
            <Input
              label="Gotas por ml (Gts/ml)"
              placeholder="Ex: 20"
              value={gotasPorMl}
              onChange={(e) => setGotasPorMl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2 border border-surface-border/40 text-xs">
            <span className="text-ink-muted flex items-center gap-1.5 font-medium">
              <Sparkles size={13} className="text-amber-400" />
              Equivalente total:
            </span>
            <span className="font-mono font-bold text-ice">
              {totalGotas > 0 ? `${totalGotas} gotas no frasco` : "Preencha os campos"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
