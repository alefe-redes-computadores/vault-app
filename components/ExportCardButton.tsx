"use client";

import { useState, useRef } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHapticFeedback } from '@/lib/haptics';
import { exportCardToPDF, exportCardsToPDF } from '@/lib/pdfExport';
import type { Document } from '@/lib/types';

interface ExportCardButtonProps {
  cardRef?: React.RefObject<HTMLElement>;
  cards?: Array<{ ref: React.RefObject<HTMLElement>; id: number }>;
  title?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function ExportCardButton({
  cardRef,
  cards,
  title = 'Documento',
  variant = 'secondary',
  size = 'sm',
  className = '',
  label = 'Exportar PDF',
}: ExportCardButtonProps) {
  const { trigger } = useHapticFeedback();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    trigger('vibrate');

    try {
      if (cards && cards.length > 0) {
        // Exporta múltiplos cards
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
        // Exporta um único card
        await exportCardToPDF({
          cardRef,
          title,
          filename: `documento_${new Date().getTime()}.pdf`,
        });
      } else {
        throw new Error('Nenhum card ou lista de cards fornecida');
      }

      trigger('success');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      setError('Erro ao gerar o PDF. Tente novamente.');
      trigger('error');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={isLoading}
        className={`flex items-center justify-center gap-2 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {cards && cards.length > 0 ? `${progress}%` : 'Gerando...'}
          </>
        ) : (
          <>
            <FileDown size={16} />
            {label}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-coral">{error}</p>
      )}
    </div>
  );
}