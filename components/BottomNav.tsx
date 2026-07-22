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

    window.addEventListener('biometric:lockchange', handleLockChange);

    const observer = new MutationObserver(() => {
      checkLock();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('biometric:lockchange', handleLockChange);
      observer.disconnect();
    };
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="bg-surface/95 backdrop-blur-xl border-t border-surface-border/50 px-4 pt-2 pb-5">
        <div className="grid grid-cols-5 items-end justify-items-center relative max-w-md mx-auto">
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
                  flex flex-col items-center gap-0.5 transition-all duration-150 active:scale-90 relative
                  ${active ? "text-ice" : "text-ink-muted/60 hover:text-ink-primary"}
                  ${colMap[item.id] || ""}
                `}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                <span
                  className={`text-[10px] font-medium transition-all duration-150 ${
                    active ? "text-ice" : "text-ink-muted/60"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-ice"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* Botão flutuante centralizado */}
          <button
            onClick={() => {
              trigger("success");
              router.push("/novo");
            }}
            className="absolute left-1/2 -translate-x-1/2 -top-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-ice to-ice/80 text-void shadow-lg shadow-ice/40 active:scale-90 transition-all duration-150 border-2 border-void/10 z-10"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}