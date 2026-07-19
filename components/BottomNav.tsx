"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Star, User, Plus, MoreHorizontal, Shield } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useEffect, useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";

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

const extraItems: NavItem[] = [
  { id: "vaults", icon: Shield, label: "Cofres", path: "/vaults" },
];

export function BottomNav() {
  const { trigger } = useHapticFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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
    setIsMoreOpen(false);
  };

  if (pathname === "/login" || pathname === "/auth/callback" || isBiometricLocked) return null;

  const isActive = (path: string) => {
    return pathname === path || (path === "/" && pathname === "/");
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="glass-header rounded-t-[32px] border-t border-surface-border px-4 pt-3 pb-6">
          <div className="grid grid-cols-5 items-center justify-items-center relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex flex-col items-center gap-0.5 transition-all active:scale-[0.95] relative ${
                    active ? "text-ice" : "text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {active && (
                    <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-ice" />
                  )}
                </button>
              );
            })}

            {/* Botão "Mais" */}
            <button
              onClick={() => {
                trigger("vibrate");
                setIsMoreOpen(true);
              }}
              className={`flex flex-col items-center gap-0.5 transition-all active:scale-[0.95] relative ${
                isMoreOpen ? "text-ice" : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <MoreHorizontal size={22} strokeWidth={isMoreOpen ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Mais</span>
            </button>

            {/* Botão flutuante centralizado */}
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

      {/* BottomSheet do "Mais" */}
      <BottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="Mais opções"
      >
        <div className="space-y-2">
          {extraItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
              >
                <Icon size={20} className="text-ink-muted" />
                <span className="text-sm text-ink-primary">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              trigger("vibrate");
              setIsMoreOpen(false);
              router.push("/perfil");
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
          >
            <User size={20} className="text-ink-muted" />
            <span className="text-sm text-ink-primary">Perfil</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}