// components/BottomNav.tsx
"use client";
import { getComposeOptions, getOptionColorClass, type ComposeOption } from "@/lib/navigation/bottom-nav-compose";
// VAULT_INTELLIGENCE_NAV_CONTEXT_V65
// VAULT_BOTTOM_NAV_POLISH_V70
// VAULT_CONTEXTUAL_FAB_PATH_NORMALIZATION_V44: a rota é normalizada antes do catálogo M6.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, LayoutGrid, Plus, Clock, FolderOpen } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "home", icon: Home, label: "Início", path: "/" },
  { id: "hoje", icon: Clock, label: "Hoje", path: "/hoje" },
  {
    id: "documentos",
    icon: FolderOpen,
    label: "Documentos",
    path: "/documentos",
  },
  { id: "mais", icon: LayoutGrid, label: "Mais", path: "/mais" },
];

// VAULT M6: tabela de ações extraída; normalização continua na borda da navegação.

const ALLOWED_NAV_PATHS = [
  "/",
  "/hoje",
  "/documentos",
  "/saude/documentos",
  "/mais",
  "/pessoas",
  "/cartoes",
  "/contas",
  "/vaults",
  "/senhas",
  "/favoritos",
  "/saude",
  "/saude/medicamentos",
  "/saude/medicos",
  "/saude/farmacias",
  "/saude/tratamentos",
  "/saude/retiradas",
  "/saude/fornecimento",
  "/saude/hospitais",
  "/saude/locais",
  "/saude/renovacao",
  "/saude/exames",
  "/saude/consultas",
  "/saude/cirurgias",
  "/saude/cids",
  "/saude/rede",
  "/saude/registros",
  "/saude/central-m144", // M148 P3: Central e area autenticada, barra inferior permanece
];

// VAULT_NORMALIZE_PATHNAME_V40
function normalizeNavPathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const clean = pathname.split(/[?#]/, 1)[0] || "/";
  return clean.replace(/\/+$/, "") || "/";
}

function shouldShowNav(
  pathname: string
): boolean {
  const normalizedPathname = normalizeNavPathname(pathname);
  if (
    normalizedPathname.includes("/novo") ||
    normalizedPathname.includes("/editar") ||
    normalizedPathname.includes("/nova")
  ) {
    return false;
  }

  return ALLOWED_NAV_PATHS.some(
    (path) =>
      normalizedPathname === normalizeNavPathname(path)
  );
}

// VAULT M6: tons semânticos delegados a catálogo puro.

export function BottomNav() {
  const { trigger } =
    useHapticFeedback();

  const pathname =
    usePathname();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    isComposeMenuOpen,
    setIsComposeMenuOpen,
  ] = useState(false);
  const composeButtonRef = useRef<HTMLButtonElement>(null);
  const composeMenuRef = useRef<HTMLDivElement>(null);
  const homeFallbackRef = useRef<number | null>(null);
  // M53: the action sheet is a true keyboard-accessible dialog.
  useEffect(() => {
    if (!isComposeMenuOpen) return;
    const frame = requestAnimationFrame(() => {
      composeMenuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsComposeMenuOpen(false);
      composeButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isComposeMenuOpen]);

  // VAULT_BOTTOM_NAV_BIOMETRIC_V66
  // O Vault não possui mais lock biométrico global.
  // A barra inferior permanece disponível na navegação normal;
  // autenticação pertence exclusivamente às ações sensíveis.

  useEffect(() => {
    setIsComposeMenuOpen(false);
    // Qualquer transição de rota ou desmontagem cancela o fallback anterior.
    return () => {
      if (homeFallbackRef.current !== null) {
        window.clearTimeout(homeFallbackRef.current);
        homeFallbackRef.current = null;
      }
    };
  }, [pathname]);
  const handleNavigate = (
    path: string
  ) => {
    if (
      normalizeNavPathname(path) ===
      normalizeNavPathname(pathname)
    ) {
      setIsComposeMenuOpen(false);
      return;
    }

    setIsComposeMenuOpen(false);
    trigger("vibrate");
    // VAULT_HOME_NAV_FALLBACK_V37
    // A navegação normal continua sendo client-side e usando replace,
    // preservando o contrato V33.1 sem acumular histórico entre abas.
    router.replace(path);
// Em alguns WebViews/APKs o roteador pode, raramente, não concluir
    // a transição para a raiz. Só nesse caso fazemos um fallback real.
    // Não recarrega quando a navegação funcionou normalmente.
    if (path === "/" && typeof window !== "undefined") {
      const initialRoute = normalizeNavPathname(window.location.pathname);
      if (homeFallbackRef.current !== null) window.clearTimeout(homeFallbackRef.current);
      homeFallbackRef.current = window.setTimeout(() => {
        homeFallbackRef.current = null;
        // Só recarrega quando o router realmente não saiu da rota inicial.
        // Nunca tratar uma transição lenta de 450ms como travamento do app.
        if (
          document.visibilityState === "visible" &&
          initialRoute !== "/" &&
          normalizeNavPathname(window.location.pathname) === initialRoute
        ) {
          window.location.assign("/");
        }
      }, 5000);
    }
  };

  const isActive = (
    path: string
  ) => {
    return (
      normalizeNavPathname(pathname) ===
      normalizeNavPathname(path)
    );
  };

  const composeOptions =
    getComposeOptions(
      normalizeNavPathname(pathname),
      searchParams
    );

  const showCompose =
    composeOptions.length > 0;

  // V31.2: a rota decide se a navegação existe.
  // A biometria apenas oculta visualmente a barra enquanto o lock estiver ativo.
  if (!shouldShowNav(pathname)) {
    return null;
  }

  const handleComposePress =
    () => {
      if (!showCompose) {
        return;
      }

      if (
        composeOptions.length === 1
      ) {
        trigger("success");

        router.push(
          composeOptions[0].path
        );

        return;
      }

      trigger("vibrate");

      setIsComposeMenuOpen(
        (prev) => !prev
      );
    };

  const handleComposeOptionPress =
    (
      option: ComposeOption
    ) => {
      trigger("success");

      setIsComposeMenuOpen(
        false
      );

      router.push(
        option.path
      );
    };

  const gridClass =
    showCompose
      ? "grid-cols-5"
      : "grid-cols-4";

  const colMap:
    Record<string, string> =
    showCompose
      ? {
          home: "col-start-1",
          hoje: "col-start-2",
          documentos: "col-start-4",
          mais: "col-start-5",
        }
      : {};

  return (
    <>
      <AnimatePresence>
        {isComposeMenuOpen &&
          showCompose && (
            <>
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.15,
                }}
                onClick={() =>
                  setIsComposeMenuOpen(
                    false
                  )
                }
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                aria-hidden="true"
              />

              <motion.div
                initial={{
                  opacity: 0,
                  y: 30,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.95,
                }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
                ref={composeMenuRef}
                role="dialog"
                aria-modal="true"
                aria-label="Adicionar novo registro"
                onKeyDown={(event) => {
                  if (event.key !== "Tab") return;
                  const actions = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
                  const first = actions[0], last = actions[actions.length - 1];
                  if (!first || !last) return;
                  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }}
                className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 mx-auto max-w-sm overflow-hidden rounded-[24px] border border-surface-border/80 bg-surface/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                    Adicionar Novo
                  </p>
                </div>

                <div className="scrollbar-hide max-h-[60vh] overflow-y-auto px-3 pb-4 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {composeOptions.map(
                      (
                        option
                      ) => {
                        const Icon =
                          option.icon;

                        const colorClass =
                          getOptionColorClass(
                            option.id
                          );

                        return (
                          <button
                            key={
                              option.id
                            }
                            type="button"
                            onClick={() =>
                              handleComposeOptionPress(
                                option
                              )
                            }
                            className="flex min-h-12 items-center gap-2.5 rounded-xl border border-surface-border/40 bg-surface-raised/40 p-2.5 text-left transition-all hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 active:scale-95"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${colorClass}`}
                            >
                              <Icon
                                size={
                                  15
                                }
                              />
                            </div>

                            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink-primary">
                              {
                                option.label
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>
      <nav
        className="vault-bottom-nav fixed inset-x-0 bottom-0 z-50 bg-surface transition-opacity visible opacity-100"
      >
        <div className="border-t border-surface-border/40 bg-surface/95 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-1 backdrop-blur-xl">
          <div
            className={`relative mx-auto grid max-w-md ${gridClass} items-end justify-items-center`}
          >
            {navItems.map(
              (
                item
              ) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.path
                  );

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={() =>
                      handleNavigate(
                        item.path
                      )
                    }
                    className={`
                      relative isolate flex min-h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-2 py-1 transition-all duration-200 active:scale-95
                      ${
                        active
                          ? "text-ink-primary"
                          : "text-ink-muted/65 hover:text-ink-primary"
                      }
                      ${
                        colMap[
                          item.id
                        ] || ""
                      }
                    `}
                  >
                    {active && (
                      <motion.div
                        className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-400/70"
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 28,
                        }}
                      />
                    )}

                    <div className="relative z-[1] flex flex-col items-center gap-1">
                      <Icon
                        size={
                          22
                        }
                        strokeWidth={
                          active
                            ? 2.4
                            : 2
                        }
                      />

                      <span
                        className={`text-[10px] font-medium ${
                          active
                            ? "text-ink-primary"
                            : "text-ink-muted/65"
                        }`}
                      >
                        {
                          item.label
                        }
                      </span>
                    </div>
                  </button>
                );
              }
            )}

            {showCompose && (
              <button
                ref={composeButtonRef}
                type="button"
                onClick={handleComposePress}
                aria-haspopup={composeOptions.length > 1 ? "dialog" : undefined}
                aria-expanded={composeOptions.length > 1 ? isComposeMenuOpen : undefined}
                aria-label={
                  composeOptions.length >
                  1
                    ? "Adicionar"
                    : composeOptions[0]
                        .label
                }
                className="absolute left-1/2 top-0 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-[34%] items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400 text-void shadow-[0_10px_20px_rgba(52,211,153,0.22)] transition-all duration-300 active:scale-90"
              >
                <motion.div
                  animate={{
                    rotate:
                      isComposeMenuOpen
                        ? 45
                        : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Plus
                    size={
                      28
                    }
                    strokeWidth={
                      2.5
                    }
                  />
                </motion.div>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
