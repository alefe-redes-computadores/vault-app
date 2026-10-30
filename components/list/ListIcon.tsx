// components/list/ListIcon.tsx
"use client";

import { ReactNode, type CSSProperties } from "react";

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
        background: `linear-gradient(135deg, ${color}28, ${color2}22)`,
        borderColor: `${color}55`,
      }
    : {
        backgroundColor: `${color}14`,
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
        transition-colors
        ${className}
      `}
      style={{ ...containerStyle, color }}
    >
      <span
        className="inline-flex items-center justify-center [&_svg]:h-[var(--vault-list-icon-size)] [&_svg]:w-[var(--vault-list-icon-size)]"
        style={{ "--vault-list-icon-size": `${Math.max(12, Math.min(40, size))}px` } as CSSProperties}
        aria-hidden="true"
      >{icon}</span>
    </div>
  );
}