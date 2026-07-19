"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Star, User, Plus, MoreHorizontal } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useEffect, useState } from "react";

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "home", icon: Home, label: "Início", path: "/" },
  { id: "pessoas", icon: Users, label: "Pessoas", path: "/pessoas" },
  { id: "favorites", icon: Star, label: "Favoritos", path: "/favoritos" },
  { id: "profile", icon: User, label: "Perfil", path: "/perfil" },
];

export function BottomNav() {
  const { trigger } = useHapticFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

  useEffect(() => {
    const checkLock = () => {
      setIsBiometricLocked(document.body.classList.contains("biometric-locked"));
    };
    checkLock();

    const observer = new MutationObserver(() => checkLock());
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const handleNavigate = (path: string) => {
    if (path === pathname) return;
    trigger("vibrate");
    router.push(path);
  };

  if (pathname === "/login" || pathname === "/auth/callback" || isBiometricLocked) return null;

  const isActive = (path: string) => {
    return pathname === path || (path === "/" && pathname === "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-surface/95 backdrop-blur-xl border-t border-surface-border/50 px-4 pt-2 pb-5">
        <div className="grid grid-cols-5 items-center justify-items-center relative max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`
                  flex flex-col items-center gap-0.5 transition-all active:scale-95 relative
                  ${active ? "text-ice" : "text-ink-muted/60 hover:text-ink-primary"}
                `}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] font-medium transition-all ${
                  active ? "text-ice" : "text-ink-muted/60"
                }`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute -top-1 w-1 h-1 rounded-full bg-ice" />
                )}
              </button>
            );
          })}

          {/* Botão "Mais" — agora abre uma tela */}
          <button
            onClick={() => {
              trigger("vibrate");
              router.push("/mais");
            }}
            className={`
              flex flex-col items-center gap-0.5 transition-all active:scale-95 relative
              ${pathname === "/mais" ? "text-ice" : "text-ink-muted/60 hover:text-ink-primary"}
            `}
          >
            <MoreHorizontal size={22} strokeWidth={pathname === "/mais" ? 2.5 : 2} />
            <span className="text-[10px] font-medium text-ink-muted/60">Mais</span>
            {pathname === "/mais" && (
              <div className="absolute -top-1 w-1 h-1 rounded-full bg-ice" />
            )}
          </button>

          {/* Botão flutuante centralizado */}
          <button
            onClick={() => {
              trigger("success");
              router.push("/novo");
            }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/30 active:scale-95 transition-all border-4 border-surface"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}