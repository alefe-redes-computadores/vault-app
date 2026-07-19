"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Star, User, Plus } from "lucide-react";
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
  { id: "vaults", icon: Users, label: "Cofres", path: "/vaults" },
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

  // Esconde em login, callback, e quando a biometria está bloqueada
  if (pathname === "/login" || pathname === "/auth/callback" || isBiometricLocked) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="glass-header rounded-t-[32px] border-t border-surface-border px-4 pt-3 pb-6">
        {/* Container grid com 4 colunas iguais */}
        <div className="grid grid-cols-4 items-center justify-items-center relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || 
              (item.path === "/" && pathname === "/") ||
              (item.path === "/vaults" && pathname?.startsWith("/vaults"));

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`flex flex-col items-center gap-0.5 transition-all active:scale-[0.95] relative ${
                  isActive ? "text-ice" : "text-ink-muted hover:text-ink-primary"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-ice" />
                )}
              </button>
            );
          })}

          {/* Botão flutuante centralizado sobre a grid */}
          <button
            onClick={() => {
              trigger("success");
              router.push("/novo");
            }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-vault active:scale-[0.95] transition-all border-4 border-void z-10"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}