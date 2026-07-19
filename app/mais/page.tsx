"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  HelpCircle,
  FileText,
  Database,
  Download,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useSyncQueue } from "@/hooks/useSyncQueue";

export default function MaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { processQueue, isOnline } = useSyncQueue();

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

  const handleSync = async () => {
    if (!isOnline) {
      showToast("Sem conexão com a internet", "error");
      return;
    }
    trigger("vibrate");
    showToast("Sincronizando dados...", "info");
    try {
      await processQueue();
      showToast("Dados sincronizados com sucesso!", "success");
    } catch {
      showToast("Erro ao sincronizar", "error");
    }
  };

  const menuSections = [
    {
      title: "Geral",
      items: [
        {
          id: "cofres",
          icon: Shield,
          label: "Cofres",
          description: "Documentos compartilhados com sua família",
          onClick: () => router.push("/vaults"),
        },
        {
          id: "pessoas",
          icon: Users,
          label: "Pessoas",
          description: "Gerencie as pessoas do seu vault",
          onClick: () => router.push("/pessoas"),
        },
      ],
    },
    {
      title: "Dados",
      items: [
        {
          id: "exportar",
          icon: Download,
          label: "Exportar dados",
          description: "Baixe todos os seus dados em JSON",
          onClick: () => showToast("Em breve...", "info"),
        },
        {
          id: "sync",
          icon: RefreshCw,
          label: "Sincronizar agora",
          description: isOnline ? "Forçar sincronização com a nuvem" : "Sem conexão",
          onClick: handleSync,
          disabled: !isOnline,
        },
        {
          id: "limpar",
          icon: HardDrive,
          label: "Limpar dados locais",
          description: "Remove todos os dados do dispositivo",
          onClick: clearLocalData,
        },
      ],
    },
    {
      title: "Suporte",
      items: [
        {
          id: "ajuda",
          icon: HelpCircle,
          label: "Ajuda",
          description: "Dúvidas e suporte",
          onClick: () => showToast("Em breve...", "info"),
        },
      ],
    },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Mais</h1>
              <p className="text-sm text-ink-muted">Configurações e opções extras</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: sectionIndex * 0.05 }}
            >
              <h2 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={`flex items-center gap-4 w-full p-3 rounded-xl bg-surface border border-surface-border/50 hover:bg-surface-border transition-all active:scale-95 ${
                        item.disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-surface-raised border border-surface-border/50 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-ink-muted" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                        <p className="text-xs text-ink-muted">{item.description}</p>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted/40 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Sair (seção separada) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 w-full p-3 rounded-xl bg-coral/10 border border-coral/20 hover:bg-coral/20 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center flex-shrink-0">
                <LogOut size={18} className="text-coral" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-coral">Sair da conta</p>
                <p className="text-xs text-coral/70">Desconectar e limpar sessão</p>
              </div>
              <ChevronRight size={16} className="text-coral/40 flex-shrink-0" />
            </button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}