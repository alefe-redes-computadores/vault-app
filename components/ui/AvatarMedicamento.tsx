// components/ui/AvatarMedicamento.tsx
"use client";

import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

interface AvatarMedicamentoProps {
  nome: string;
  formato?: string;
  cores?: string[];
  tamanho?: number;
}

export function AvatarMedicamento({
  nome,
  formato = "comprimido",
  cores = [],
  tamanho = 14,
}: AvatarMedicamentoProps) {
  const initial = nome.charAt(0).toUpperCase();
  const color = cores[0] || "#9CA3AF";
  const pixels = tamanho >= 14 ? 56 : 44;
  const iconSize = tamanho >= 14 ? 28 : 22;

  return (
    <div className="relative shrink-0" style={{ width: pixels, height: pixels }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl border-2 bg-surface-raised shadow-inner"
        style={{ borderColor: `${color}66` }}
      >
        <MedicationFormatIcon formato={formato} cores={cores} size={iconSize} />
      </div>
      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-surface-border/50 bg-void text-[8px] font-bold text-ink-muted">
        {initial}
      </div>
    </div>
  );
}
