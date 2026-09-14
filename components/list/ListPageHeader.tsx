// components/list/ListPageHeader.tsx
"use client";

import { ReactNode } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface ListPageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backUrl?: string;
  rightAction?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
  badgeLabel?: string;
  badgeColor?: string;
  className?: string;
}

const PERSONAL_LISTS = new Set([
  "/senhas",
  "/pessoas",
  "/vaults",
  "/cartoes",
  "/contas",
  "/favoritos",
]);

function getCanonicalBackUrl(pathname: string) {
  if (PERSONAL_LISTS.has(pathname)) {
    return "/mais";
  }

  if (pathname.startsWith("/saude/")) {
    return "/";
  }

  if (pathname === "/documentos") {
    return "/";
  }

  return "/";
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
  const pathname = usePathname();
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const handleBack = () => {
    trigger("vibrate");
    router.replace(
      backUrl ||
      getCanonicalBackUrl(pathname)
    );
  };

  return (
    <header
      className={`
        sticky top-0 z-30
        border-b border-surface-border/30
        bg-void/85
        px-5 pb-4 pt-4
        header-safe-top
        backdrop-blur-xl
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            {(badgeLabel || icon) && (
              <div className="flex items-center gap-2">
                {icon && (
                  <span className={iconColor}>
                    {icon}
                  </span>
                )}

                {badgeLabel && (
                  <span
                    className={`font-mono text-[11px] uppercase tracking-[0.28em] ${badgeColor}`}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}

            <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 text-sm text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightAction && (
          <div className="shrink-0">
            {rightAction}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-3 space-y-3">
          {children}
        </div>
      )}
    </header>
  );
}
