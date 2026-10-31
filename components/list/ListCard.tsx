// components/list/ListCard.tsx
"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export interface ListCardProps {
  /** Identificador único (para key) */
  id: string | number;
  /** Cor da barra lateral e ícone (hex) */
  color: string;
  /** Callback ao clicar no card (navegação) */
  onClick: () => void;
  /** Ícone renderizado */
  icon: ReactNode;
  /** Conteúdo opcional dentro da barra lateral */
  rail?: ReactNode;
  /** Conteúdo principal do card */
  children: ReactNode;
  /** Ações internas – renderizadas fora do botão principal */
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
  /** Densidade visual opt-in. O padrão preserva todos os demais cards. */
  density?: "default" | "compact";
  /** V318: very compact medication list; opt-in, not a global size change. */
  compactTight?: boolean;
  /** Conteúdo com ações próprias; navegação vira um botão irmão. */
  interactiveContent?: boolean;
  navigationLabel?: string;
}

export function ListCard({
  id,
  color,
  onClick,
  icon,
  rail,
  children,
  actions,
  className = "",
  delay = 0,
  isDisabled = false,
  disabledBorderColor = "border-coral/30",
  contentClassName = "",
  showChevron = true,
  density = "default",
  compactTight = false,
  interactiveContent = false,
  navigationLabel = "Ver detalhes",
}: ListCardProps) {
  const isCompact = density === "compact";
  const isTight = isCompact && compactTight;
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      key={id}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.18,
        delay: reducedMotion ? 0 : Math.min(delay, 0.08),
      }}
      className={`
        group relative
        overflow-hidden
        ${isTight ? "rounded-[16px]" : isCompact ? "rounded-[20px]" : "rounded-[24px]"}
        border
        bg-surface
        ${isCompact ? "shadow-sm" : "shadow-md"}
        transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none
        focus-within:border-ice/45
        ${
          isDisabled
            ? `${disabledBorderColor} opacity-60`
            : "border-surface-border hover:bg-surface-raised/80 hover:shadow-lg"
        }
        ${className}
      `}
      style={{
        borderColor: isDisabled ? undefined : `${color}40`,
        contentVisibility: "auto",
        containIntrinsicSize: isTight ? "116px" : isCompact ? "148px" : "190px",
      }}
    >
      <div
        aria-hidden={!rail}
        className={`
          absolute
          bottom-0 left-0 top-0
          ${rail ? "w-6" : "w-1.5"}
          ${isDisabled && !rail ? "bg-coral" : ""}
        `}
        style={!isDisabled || rail ? { backgroundColor: color } : undefined}
      >
        {rail}
      </div>

      <div
        className={
          rail
            ? isCompact
              ? (isTight ? "p-2.5 pl-8" : "p-3 pl-8")
              : "p-4 pl-10"
            : isCompact
            ? (isTight ? "p-2.5 pl-3.5" : "p-3 pl-4")
            : "p-4 pl-5"
        }
      >
        {interactiveContent ? (
          <div className="relative">
            <button
              type="button"
              onClick={onClick}
              aria-label={navigationLabel}
              className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ice focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:bg-ice/[0.035]"
            />
            <div
              className={`pointer-events-none relative z-10 flex w-full items-start text-left [&_button]:pointer-events-auto [&_button]:relative [&_button]:z-20 ${
                isCompact ? "gap-2.5" : "gap-3.5"
              } ${contentClassName}`}
            >
              <div
                className={`
              flex
              ${isTight ? "h-9 w-9 rounded-xl" : isCompact ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"}
              shrink-0
              items-center
              justify-center
              border
              shadow-inner
              transition-colors
            `}
                style={{
                  backgroundColor: `${color}15`,
                  borderColor: `${color}30`,
                  color,
                }}
              >
                {icon}
              </div>

              <div className="min-w-0 flex-1">{children}</div>

              {showChevron && (
                <ChevronRight
                  size={isCompact ? 14 : 16}
                  className={
                    isCompact
                      ? "mt-1.5 shrink-0 text-ink-faint"
                      : "mt-2 shrink-0 text-ink-faint"
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className={`
            flex w-full
            items-start
            ${isCompact ? "gap-2.5" : "gap-3.5"}
            text-left
            outline-none
            focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-ice/75 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
            ${contentClassName}
          `}
          >
            <div
              className={`
              flex
              ${isTight ? "h-9 w-9 rounded-xl" : isCompact ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"}
              shrink-0
              items-center
              justify-center
              border
              shadow-inner
              transition-colors
            `}
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}30`,
                color,
              }}
            >
              {icon}
            </div>

            <div className="min-w-0 flex-1">{children}</div>

            {showChevron && (
              <ChevronRight
                size={isCompact ? 14 : 16}
                className={
                  isCompact
                    ? "mt-1.5 shrink-0 text-ink-faint"
                    : "mt-2 shrink-0 text-ink-faint"
                }
              />
            )}
          </button>
        )}

        {actions && (
          <div
            className={
              isCompact
                ? "mt-2 flex flex-wrap items-center gap-1.5 border-t border-surface-border/40 pt-2 [&_button]:min-h-9"
                : "mt-3 flex flex-wrap items-center gap-2 border-t border-surface-border/40 pt-2.5 [&_button]:min-h-10"
            }
          >
            {actions}
          </div>
        )}
      </div>
    </motion.article>
  );
}
