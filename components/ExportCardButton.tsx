"use client";

import { useState } from "react";
import { FileDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useHapticFeedback } from "@/lib/haptics";
import { exportCardToPDF, exportCardsToPDF } from "@/lib/pdfExport";

interface ExportCardButtonProps {
  cardRef?: React.RefObject<HTMLElement>;
  cards?: Array<{ ref: React.RefObject<HTMLElement>; id: string }>;
  title?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  compact?: boolean;
  onBeforeExport?: () => void | Promise<void>;
  onAfterExport?: () => void;
}

export function ExportCardButton({
  cardRef,
  cards,
  title = "Documento",
  variant = "secondary",
  size = "sm",
  className = "",
  label = "Exportar PDF",
  compact = false,
  onBeforeExport,
  onAfterExport,
}: ExportCardButtonProps) {
  const { trigger } = useHapticFeedback();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const iconOnly = compact || label.trim().length === 0;

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    trigger("vibrate");

    try {
      await onBeforeExport?.();
      if (cards && cards.length > 0) {
        const refs = cards.map((c) => c.ref);
        await exportCardsToPDF({
          cards: refs,
          title,
          filename: `documentos_${new Date().getTime()}.pdf`,
          onProgress: (current, total) => {
            setProgress(Math.round((current / total) * 100));
          },
        });
      } else if (cardRef) {
        await exportCardToPDF({
          cardRef,
          title,
          filename: `documento_${new Date().getTime()}.pdf`,
        });
      } else {
        throw new Error("Nenhum card ou lista de cards fornecida");
      }

      trigger("success");
    } catch (err) {
      console.error("Erro ao exportar:", err);
      setError("Erro ao gerar o PDF. Tente novamente.");
      trigger("error");
    } finally {
      onAfterExport?.();
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative inline-flex shrink-0">
      <Button
        aria-label={iconOnly ? `Exportar PDF · ${title}` : undefined}
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={isLoading}
        className={`inline-flex shrink-0 items-center justify-center gap-2 ${iconOnly ? "!h-10 !w-10 !min-h-10 !min-w-10 !p-0" : ""} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className={iconOnly ? "sr-only" : undefined}>{cards && cards.length > 0 ? `${progress}%` : "Gerando..."}</span>
          </>
        ) : (
          <>
            <FileDown size={16} />
            <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
          </>
        )}
      </Button>

      {error && <div role="alert" className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[85] mx-auto flex max-w-xl items-start gap-2 rounded-2xl border border-coral/30 bg-surface-raised px-3 py-3 text-xs text-coral shadow-2xl">
        <span className="min-w-0 flex-1">{error}</span>
        <button type="button" onClick={() => setError(null)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-coral/25" aria-label="Fechar erro de exportação"><X size={14}/></button>
      </div>}
    </div>
  );
}
