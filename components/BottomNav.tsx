"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Star, LayoutGrid, Plus } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "home", icon: Home, label: "Início", path: "/" },
  { id: "pessoas", icon: Users, label: "Pessoas", path: "/pessoas" },
  { id: "favoritos", icon: Star, label: "Favoritos", path: "/favoritos" },
  { id: "mais", icon: LayoutGrid, label: "Mais", path: "/mais" },
];

// Rotas que têm sua própria barra de ação fixa no rodapé (ex: botão "Salvar").
// O BottomNav não pode aparecer nelas, senão as duas barras fixas se sobrepõem.
const HIDDEN_ON_PATHS = ["/novo", "/login", "/auth/callback"];

function shouldHideNav(pathname: string): boolean {
  // match exato ou rota "filha" (ex: /novo/algo, /pessoas/123/editar)
  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // qualquer rota de edição, onde quer que ela esteja na árvore
  if (pathname.includes("/editar")) {
    return true;
  }
  return false;
}

export function BottomNav() {
  const { trigger } = useHapticFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const { isEnabled: isBiometricEnabled } = useBiometricPreference();
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

  useEffect(() => {
    const checkLock = () => {
      setIsBiometricLocked(document.body.classList.contains("biometric-locked"));
    };

    checkLock();

    const handleLockChange = () => {
      checkLock();
    };

    window.addEventListener("biometric:lockchange", handleLockChange);

    const observer = new MutationObserver(() => {
      checkLock();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("biometric:lockchange", handleLockChange);
      observer.disconnect();
    };
  }, []);

  const handleNavigate = (path: string) => {
    if (path === pathname) return;
    trigger("vibrate");
    router.push(path);
  };

  if (shouldHideNav(pathname) || isBiometricLocked) return null;

  const isActive = (path: string) => {
    return pathname === path || (path === "/" && pathname === "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="border-t border-surface-border/40 bg-surface/92 px-4 pb-5 pt-2 backdrop-blur-2xl">
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end justify-items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            const colMap: Record<string, string> = {
              home: "col-start-1",
              pessoas: "col-start-2",
              favoritos: "col-start-4",
              mais: "col-start-5",
            };

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`
                  relative flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200 active:scale-95
                  ${active ? "text-ice" : "text-ink-muted/65 hover:text-ink-primary"}
                  ${colMap[item.id] || ""}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-2xl bg-ice/10"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}

                <div className="relative z-[1] flex flex-col items-center gap-1">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  <span
                    className={`text-[10px] font-medium ${
                      active ? "text-ice" : "text-ink-muted/65"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => {
              trigger("success");
              router.push("/novo");
            }}
            aria-label="Novo documento"
            className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-ice text-void shadow-[0_16px_32px_rgba(125,211,252,0.28)] transition-all duration-200 active:scale-95"
          >
            <Plus size={24} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </nav>
  );
}
