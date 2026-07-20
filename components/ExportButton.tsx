"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { exportAllData, downloadJSON } from "@/lib/export";
import { useToast } from "@/components/ToastProvider";

interface ExportButtonProps {
  variant?: "icon" | "full";
}

export function ExportButton({ variant = "icon" }: ExportButtonProps) {
  const { trigger } = useHapticFeedback();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user) {
      showToast("Usuário não autenticado", "error");
      return;
    }

    trigger("vibrate");
    setIsExporting(true);

    try {
      const data = await exportAllData(user.id);
      const date = new Date().toISOString().split("T")[0];
      downloadJSON(data, `vault-backup-${date}.json`);
      trigger("success");
      showToast("Dados exportados com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      trigger("error");
      showToast("Erro ao exportar dados", "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="p-2 rounded-full bg-surface-raised border border-surface-border/50 hover:bg-surface-border transition-colors active:scale-95 disabled:opacity-50"
        title="Exportar dados"
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        ) : (
          <Download size={18} className="text-ink-muted" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-surface-border/50 hover:bg-surface-border transition-colors active:scale-95 disabled:opacity-50"
    >
      {isExporting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download size={16} />
          Exportar dados
        </>
      )}
    </button>
  );
}