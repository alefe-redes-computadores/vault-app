import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RefObject } from 'react';

interface ExportCardOptions {
  cardRef: RefObject<HTMLElement>;
  title?: string;
  filename?: string;
}

/**
 * Exporta um card (elemento HTML) para PDF como imagem
 * Mantém as cores, rebites e estilo visual
 */
export async function exportCardToPDF(options: ExportCardOptions): Promise<void> {
  const {
    cardRef,
    title = 'Documento Vault',
    filename = `documento_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`,
  } = options;

  if (!cardRef.current) {
    throw new Error('Elemento do card não encontrado');
  }

  try {
    // Captura o card com alta resolução
    const canvas = await html2canvas(cardRef.current, {
      scale: 3, // Alta escala para não pixelar
      useCORS: true,
      logging: false,
      backgroundColor: '#0A0C0F', // Fundo escuro do app
      allowTaint: true,
      width: cardRef.current.scrollWidth,
      height: cardRef.current.scrollHeight,
    });

    // Cria o PDF em tamanho A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
      hotfixes: ['px_scaling'],
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcula a proporção da imagem para caber na página
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(
      pageWidth / imgWidth,
      pageHeight / imgHeight
    );

    const finalWidth = imgWidth * ratio * 0.95; // 5% de margem
    const finalHeight = imgHeight * ratio * 0.95;

    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    // Converte canvas para imagem
    const imgData = canvas.toDataURL('image/png');

    // Adiciona a imagem ao PDF
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

    // Salva o PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao gerar PDF do card:', error);
    throw new Error('Não foi possível gerar o PDF. Tente novamente.');
  }
}

/**
 * Exporta múltiplos cards para um único PDF (um por página)
 */
export async function exportCardsToPDF(options: {
  cards: RefObject<HTMLElement>[];
  title?: string;
  filename?: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  const {
    cards,
    title = 'Meus Documentos',
    filename = `documentos_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`,
    onProgress,
  } = options;

  if (cards.length === 0) {
    throw new Error('Nenhum card para exportar');
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
      hotfixes: ['px_scaling'],
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Processa cada card
    for (let i = 0; i < cards.length; i++) {
      const ref = cards[i];
      if (!ref.current) continue;

      onProgress?.(i + 1, cards.length);

      // Captura o card
      const canvas = await html2canvas(ref.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#0A0C0F',
        allowTaint: true,
        width: ref.current.scrollWidth,
        height: ref.current.scrollHeight,
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(
        pageWidth / imgWidth,
        pageHeight / imgHeight
      );

      const finalWidth = imgWidth * ratio * 0.95;
      const finalHeight = imgHeight * ratio * 0.95;

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      const imgData = canvas.toDataURL('image/png');

      // Adiciona página (exceto na primeira)
      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao exportar cards:', error);
    throw new Error('Não foi possível gerar o PDF. Tente novamente.');
  }
}