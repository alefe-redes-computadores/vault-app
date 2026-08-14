"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { exportAllData, downloadJSON } from "@/lib/export";
import { useToast } from "@/components/ToastProvider";
import { ConfirmationModal } from "@/components/ConfirmationModal";

interface ExportButtonProps {
  variant?: "icon" | "full";
}

export function ExportButton({ variant = "icon" }: ExportButtonProps) {
  const { trigger } = useHapticFeedback();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const handleConfirmExport = async () => {
    if (!user) return;
    
    setShowWarningModal(false);
    trigger("vibrate");
    setIsExporting(true);

    try {
      const data = await exportAllData(user.id);
      const date = new Date().toISOString().split("T")[0];
      downloadJSON(data, `vault-backup-${date}.json`);
      trigger("success");
      showToast("Dados exportados com segurança!", "success");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      trigger("error");
      showToast("Erro ao exportar dados", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleTrigger = () => {
    trigger("vibrate");
    setShowWarningModal(true);
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={handleTrigger}
          disabled={isExporting}
          title="Exportar dados"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:bg-surface-border hover:text-ink-primary disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>
      ) : (
        <button
          onClick={handleTrigger}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-2xl border border-surface-border/50 bg-surface px-4 py-2.5 text-sm font-medium text-ink-primary transition-all active:scale-95 hover:bg-surface-raised disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Exportar dados
        </button>
      )}

      <ConfirmationModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={handleConfirmExport}
        title="Exportar dados confidenciais"
        message="O arquivo de backup gerado contém informações médicas sensíveis, históricos clínicos e credenciais. Armazene este arquivo em um local seguro e criptografado."
        confirmLabel="Entendido, exportar"
        cancelLabel="Cancelar"
        type="warning"
      />
    </>
  );
}
