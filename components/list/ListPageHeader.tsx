// components/list/ListPageHeader.tsx
"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface ListPageHeaderProps {
  /** Título principal da listagem */
  title: string;
  /** Subtítulo (ex: contagem de itens) */
  subtitle?: string;
  /** Se deve mostrar botão voltar (padrão: true) */
  showBack?: boolean;
  /** URL para onde voltar (se não fornecido, usa router.back()) */
  backUrl?: string;
  /** Ação à direita (ex: botão de mostrar suspensos) */
  rightAction?: ReactNode;
  /** Conteúdo extra abaixo do título (busca, filtros, etc.) */
  children?: ReactNode;
  /** Ícone decorativo no header (ex: Stethoscope para médicos) */
  icon?: ReactNode;
  /** Cor do ícone decorativo (padrão: ice) */
  iconColor?: string;
  /** Label da badge (ex: "Rede de Apoio") */
  badgeLabel?: string;
  /** Cor da badge (padrão: ice/90) */
  badgeColor?: string;
  /** Classe adicional para o container */
  className?: string;
}

export function ListPageHeader({
  title,
  subtitle,
  showBack = true,
  backUrl,
  rightAction,
  children,
  icon,
  iconColor = "text-ice",
  badgeLabel,
  badgeColor = "text-ice/90",
  className = "",
}: ListPageHeaderProps) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const handleBack = () => {
    trigger("vibrate");
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={`
        sticky top-0 z-30
        border-b border-surface-border/30
        bg-void/85
        px-5
        pb-4
        pt-4
        header-safe-top
        backdrop-blur-xl
        ${className}
      `}
    >
      {/* Linha superior: título + ações */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-surface-border/50
                bg-surface-raised
                text-ink-primary
                transition-transform
                active:scale-95
              "
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            {/* Badge + ícone opcional */}
            {(badgeLabel || icon) && (
              <div className="flex items-center gap-2">
                {icon && <span className={iconColor}>{icon}</span>}
                {badgeLabel && (
                  <span className={`font-mono text-[11px] uppercase tracking-[0.28em] ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}

            <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
            )}
          </div>
        </div>

        {rightAction && (
          <div className="shrink-0">{rightAction}</div>
        )}
      </div>

      {/* Conteúdo extra (busca, filtros, ordenação) */}
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </header>
  );
}