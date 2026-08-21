// components/ui/AvatarMedicamento.tsx
"use client";

import { Pill, Circle, Droplet, Syringe, StickyNote } from "lucide-react";

const FORMATOS = [
  { id: "comprimido", label: "Redondo", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

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
  tamanho = 14 
}: AvatarMedicamentoProps) {
  const initial = nome.charAt(0).toUpperCase();
  const color = cores?.[0] || "#60A5FA";
  const Icon = FORMATOS.find((f) => f.id === formato)?.icon || Pill;
  const sizeClass = `h-${tamanho} w-${tamanho}`;
  
  return (
    <div className="relative shrink-0">
      <div className={`flex ${sizeClass} items-center justify-center rounded-full border-2 border-surface-border/50 bg-surface-raised shadow-inner`}>
        <Icon size={tamanho >= 14 ? 24 : 18} stroke={color} strokeWidth={1.5} fill={color + "44"} />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-void border border-surface-border/50 text-[8px] font-bold text-ink-muted">
        {initial}
      </div>
    </div>
  );
}