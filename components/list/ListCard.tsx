// components/list/ListCard.tsx
"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export interface ListCardProps {
  /** Identificador único (para key) */
  id: string | number;
  /** Cor da barra lateral e ícone (hex) */
  color: string;
  /** Callback ao clicar no card (navegação) */
  onClick: () => void;
  /** Ícone renderizado (48x48 com fundo colorido) */
  icon: ReactNode;
  /** Conteúdo principal do card (título, badges, metadados) */
  children: ReactNode;
  /** Ações internas (ex: Editar, Excluir) – renderizadas fora do botão principal */
  actions?: ReactNode;
  /** Classes adicionais para o container */
  className?: string;
  /** Delay da animação (em segundos) */
  delay?: number;
  /** Se o card está em estado suspenso/desabilitado */
  isDisabled?: boolean;
  /** Cor da borda quando desabilitado */
  disabledBorderColor?: string;
  /** Classes para o conteúdo principal (flex) */
  contentClassName?: string;
  /** Se deve exibir a seta à direita (padrão: true) */
  showChevron?: boolean;
}

export function ListCard({
  id,
  color,
  onClick,
  icon,
  children,
  actions,
  className = "",
  delay = 0,
  isDisabled = false,
  disabledBorderColor = "border-coral/30",
  contentClassName = "",
  showChevron = true,
}: ListCardProps) {
  return (
    <motion.article
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        delay: Math.min(delay, 0.2),
      }}
      className={`
        group relative
        overflow-hidden
        rounded-[24px]
        border
        bg-surface
        shadow-md
        transition-all
        ${
          isDisabled
            ? `${disabledBorderColor} opacity-60`
            : "border-surface-border hover:bg-surface-raised"
        }
        ${className}
      `}
      style={{
        borderColor: isDisabled ? undefined : `${color}40`,
      }}
    >
      {/* Barra lateral de identidade */}
      <div
        className={`
          absolute
          bottom-0 left-0 top-0
          w-1.5
          ${isDisabled ? "bg-coral" : ""}
        `}
        style={
          !isDisabled
            ? {
                backgroundColor: color,
              }
            : undefined
        }
      />

      <div className="p-4 pl-5">
        {/* Conteúdo principal do card com navegação */}
        <button
          type="button"
          onClick={onClick}
          className={`
            flex w-full
            items-start gap-3.5
            text-left
            outline-none
            ${contentClassName}
          `}
        >
          {/* Ícone */}
          <div
            className="
              flex h-12 w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              shadow-inner
            "
            style={{
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color,
            }}
          >
            {icon}
          </div>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1">{children}</div>

          {/* Chevron (seta) */}
          {showChevron && (
            <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
          )}
        </button>

        {/* Ações internas (fora do botão principal) */}
        {actions && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/40">
            {actions}
          </div>
        )}
      </div>
    </motion.article>
  );
}