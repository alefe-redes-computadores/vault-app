// components/ui/AvatarMedico.tsx
"use client";

import { Stethoscope } from "lucide-react";

interface AvatarMedicoProps {
  nome: string;
  tamanho?: number;
}

export function AvatarMedico({ nome, tamanho = 14 }: AvatarMedicoProps) {
  const initial = nome.charAt(0).toUpperCase();
  const sizeClass = `h-${tamanho} w-${tamanho}`;
  const textSize = tamanho >= 14 ? 'text-2xl' : 'text-lg';
  
  return (
    <div className="relative shrink-0">
      <div className={`flex ${sizeClass} items-center justify-center rounded-full bg-ice/10 text-ice border-2 border-ice/20 ${textSize} font-bold`}>
        {initial}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-void border border-surface-border/50">
        <Stethoscope size={12} className="text-ice" />
      </div>
    </div>
  );
}