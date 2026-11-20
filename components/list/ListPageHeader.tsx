// components/list/ListPageHeader.tsx
"use client";

import { ReactNode } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeReturnTarget } from "@/lib/navigation/return-context";
import { getComposeOptions } from "@/lib/navigation/bottom-nav-compose";
import { ia20P2HeaderOwnsCreate, ia20P2Route } from "@/lib/navigation/ia20-p2-create";
import { ContextualCreateP2 } from "@/components/list/ContextualCreateP2";

interface ListPageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backUrl?: string;
  rightAction?: ReactNode;
  /** P3: do not duplicate the create CTA while an inline form is mounted. */
  suppressCreate?: boolean;
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

const HEALTH_HUB_LISTS = new Set([
  "/saude/medicamentos",
  "/saude/tratamentos",
  "/saude/renovacao",
  "/saude/retiradas",
  "/saude/consultas",
  "/saude/exames",
  "/saude/cirurgias",
  "/saude/cids",
  "/saude/medicos",
  "/saude/farmacias",
  "/saude/hospitais",
  "/saude/locais",
  "/saude/registros",
  "/saude/documentos",
  "/saude/hidratacao",
  "/saude/lembretes",
  "/saude/timeline",
  "/saude/plano-seguranca",
]);

function getCanonicalBackUrl(pathname: string) {
  if (PERSONAL_LISTS.has(pathname)) {
    return "/mais";
  }

  if (HEALTH_HUB_LISTS.has(pathname)) {
    return "/saude/rede";
  }

  if (pathname.startsWith("/saude/")) {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length > 2
      ? `/${segments.slice(0, 2).join("/")}`
      : "/saude/rede";
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
  suppressCreate = false,
  children,
  icon,
  iconColor = "text-ice",
  badgeLabel,
  badgeColor = "text-ice/90",
  className = "",
}: ListPageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trigger } = useHapticFeedback();
  // Android Capacitor export uses trailingSlash: true. Normalize BEFORE resolving creation.
  const p2Options = getComposeOptions(ia20P2Route(pathname), searchParams);
  const p2CreateVisible = !suppressCreate && ia20P2HeaderOwnsCreate(pathname, p2Options.length, searchParams);

  const handleBack = () => {
    trigger("vibrate");
    router.replace(
      safeReturnTarget(searchParams.get("return_to"), backUrl || getCanonicalBackUrl(pathname))
    );
  };

  return (
    <header
      className={`
        sticky top-0 z-30
        border-b border-surface-border/45
        bg-void/90
        px-3.5 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4
        header-safe-top
        backdrop-blur-xl
        shadow-[0_12px_30px_-24px_rgba(0,0,0,0.95)]
        ${className}
      `}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2.5 sm:flex-nowrap sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              title="Voltar para a área anterior"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/70 bg-surface-raised/85 text-ink-primary shadow-sm transition-all hover:border-ice/35 hover:bg-surface-raised active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/70"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0 flex-1">
            {(badgeLabel || icon) && (
              <div className="flex items-center gap-2">
                {icon && (
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg border border-surface-border/60 bg-surface-raised/60 ${iconColor}`} aria-hidden="true">
                    {icon}
                  </span>
                )}

                {badgeLabel && (
                  <span
                    className={`max-w-full break-words font-mono text-[10px] font-semibold uppercase tracking-[0.15em] ${badgeColor}`}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}

            <h1 className="break-words font-display text-[22px] font-semibold leading-tight tracking-tight text-ink-primary sm:text-2xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 break-words text-[13px] leading-relaxed text-ink-muted sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightAction && (
          <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5 self-start">
            {rightAction}
          </div>
        )}
      </div>

      {/* P0: CTA autonomo, sempre no fluxo visivel do cabecalho e fora do overflow de rightAction.
          Uma unica autoridade: se o header possui a criacao, o Compose inferior permanece suprimido. */}
      {p2CreateVisible && (
        <div data-vault-p0-create-row="visible" role="group" aria-label={`Adicionar em ${title}`}
          className="mt-2 grid w-full min-w-0 grid-cols-1 sm:flex sm:justify-end">
          <ContextualCreateP2 option={p2Options[0]} pathname={pathname} searchParams={searchParams} />
        </div>
      )}

      {children && (
        <div role="group" aria-label={`Ferramentas de ${title}`} className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </header>
  );
}
