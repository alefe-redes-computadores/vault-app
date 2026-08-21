// components/ui/EstoqueStatus.tsx
"use client";

import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface EstoqueStatusProps {
  quantidade: number;
  unidade: string;
  className?: string;
}

export function EstoqueStatus({ quantidade, unidade, className = "" }: EstoqueStatusProps) {
  const isCritico = quantidade <= 9;
  const isAtencao = quantidade >= 10 && quantidade <= 19;
  const isOk = quantidade >= 20;

  if (isOk) {
    return (
      <div className={`flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-400 ${className}`}>
        <CheckCircle2 size={14} />
        <span className="text-xs font-bold">{quantidade} {unidade}</span>
      </div>
    );
  }

  if (isAtencao) {
    return (
      <div className={`flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-400 animate-pulse ${className}`}>
        <AlertTriangle size={14} />
        <span className="text-xs font-bold">{quantidade} {unidade}</span>
      </div>
    );
  }

  if (isCritico) {
    return (
      <div className={`flex items-center gap-1.5 rounded-full bg-coral/10 px-2.5 py-1 text-coral animate-pulse ${className}`}>
        <AlertCircle size={14} />
        <span className="text-xs font-bold">{quantidade} {unidade}</span>
      </div>
    );
  }

  return null;
}