// components/list/ListIcon.tsx
"use client";

import { ReactNode } from "react";

interface ListIconProps {
  /** Ícone a ser renderizado */
  icon: ReactNode;
  /** Cor principal (hex) */
  color: string;
  /** Tamanho do ícone (padrão: 22) */
  size?: number;
  /** Classes adicionais para o container */
  className?: string;
  /** Se deve usar gradiente (para medicamentos com 2 cores) */
  isGradient?: boolean;
  /** Segunda cor para gradiente */
  color2?: string;
}

export function ListIcon({
  icon,
  color,
  size = 22,
  className = "",
  isGradient = false,
  color2,
}: ListIconProps) {
  const containerStyle = isGradient && color2
    ? {
        background: `linear-gradient(135deg, ${color}25 50%, ${color2}25 50%)`,
        borderColor: `${color}55`,
      }
    : {
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
      };

  return (
    <div
      className={`
        flex h-12 w-12
        shrink-0
        items-center
        justify-center
        rounded-2xl
        border
        shadow-inner
        ${className}
      `}
      style={containerStyle}
    >
      {/* Clona o ícone e aplica a cor */}
      {icon}
    </div>
  );
}