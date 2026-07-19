"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  User,
  Settings,
  BarChart3,
  LogOut,
  HardDrive,
  Users,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";

export default function MaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair da conta?")) {
      trigger("vibrate");
      await logout();
      router.push("/login");
    }
  };

  const clearLocalData = async () => {
    if (confirm("Tem certeza que deseja limpar todos os dados locais?")) {
      await db.delete();
      trigger("success");
      showToast("Dados locais limpos com sucesso!", "success");
      router.push("/login");
    }
  };

  const menuItems = [
    {
      id: "cofres",
      icon: Shield,
      label: "Cofres",
      description: "Documentos compartilhados com sua família",
      onClick: () => router.push("/vaults"),
    },
    {
      id: "perfil",
      icon: User,
      label: "Perfil",
      description: "Gerencie sua conta e informações",
      onClick: () => router.push("/perfil"),
    },
    {
      id: "estatisticas",
      icon: BarChart3,
      label: "Estatísticas",
      description: "Visão geral dos seus documentos",
      onClick: () => showToast("Em breve...", "info"),
    },
    {
      id: "dados",
      icon: HardDrive,
      label: "Dados locais",
      description: "Limpar ou exportar dados",
      onClick: clearLocalData,
    },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Mais</h1>
              <p className="text-sm text-ink-muted">Configurações e opções extras</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex items-center gap-4 w-full p-4 rounded-xl bg-surface border border-surface-border hover:border-ice/20 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center">
                  <Icon size={20} className="text-ink-muted" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                  <p className="text-xs text-ink-muted">{item.description}</p>
                </div>
                <ChevronRight size={16} className="text-ink-muted/40" />
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full p-4 rounded-xl bg-coral/10 border border-coral/20 hover:bg-coral/20 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center">
              <LogOut size={20} className="text-coral" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-coral">Sair da conta</p>
              <p className="text-xs text-coral/70">Desconectar e limpar sessão</p>
            </div>
            <ChevronRight size={16} className="text-coral/40" />
          </button>
        </section>
      </main>
    </PageTransition>
  );
}