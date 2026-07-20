"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Star, LayoutGrid, Plus } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
  { id: "mais", icon: LayoutGrid, label: "Mais", path: "/mais" },
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
        {/* Grid com 5 colunas: 4 itens + coluna central vazia para o botão + */}
        <div className="grid grid-cols-5 items-end justify-items-center relative max-w-md mx-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            // Pula a coluna central (índice 2) para colocar o botão
            if (index === 2) {
              // Coluna vazia para o botão flutuante
              return <div key="empty-center" className="w-full" />;
            }
            // Ajusta a ordem dos itens: índice 0,1,3,4
            // Vamos mapear com base na posição original
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`
                  flex flex-col items-center gap-0.5 transition-all active:scale-95 relative
                  ${active ? "text-ice" : "text-ink-muted/60 hover:text-ink-primary"}
                  ${index === 0 ? "justify-self-start" : ""}
                  ${index === 1 ? "justify-self-start" : ""}
                  ${index === 3 ? "justify-self-end" : ""}
                  ${index === 4 ? "justify-self-end" : ""}
                `}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] font-medium transition-all ${
                  active ? "text-ice" : "text-ink-muted/60"
                }`}>
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

          {/* Botão flutuante centralizado com destaque */}
          <button
            onClick={() => {
              trigger("success");
              router.push("/novo");
            }}
            className="absolute left-1/2 -translate-x-1/2 -top-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-ice to-ice/80 text-void shadow-lg shadow-ice/40 active:scale-95 transition-all border-2 border-void/10"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}