// lib/pdfExport.ts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import type { RefObject } from "react";

// ============================================================
// TIPOS
// ============================================================

interface ExportCardOptions {
  cardRef: RefObject<HTMLElement>;
  title?: string;
  filename?: string;
}

interface ExportCardsOptions {
  cards: RefObject<HTMLElement>[];
  title?: string;
  filename?: string;
  onProgress?: (
    current: number,
    total: number
  ) => void;
}

// ============================================================
// CONSTANTES
// ============================================================

const PDF_BACKGROUND =
  "#0A0C0F";

const PDF_SCALE =
  3;

const PDF_CONTENT_RATIO =
  0.95;

// ============================================================
// HELPERS
// ============================================================

function createPdf(
  title:
    string
): jsPDF {
  const pdf =
    new jsPDF({
      orientation:
        "portrait",

      unit:
        "px",

      format:
        "a4",

      hotfixes: [
        "px_scaling",
      ],
    });

  /*
   * O título já fazia parte da API pública do utilitário,
   * mas antes não era utilizado.
   */
  pdf.setProperties({
    title,
    creator:
      "Vault",
  });

  return pdf;
}

async function captureElement(
  element:
    HTMLElement
): Promise<HTMLCanvasElement> {
  return html2canvas(
    element,
    {
      scale:
        PDF_SCALE,

      useCORS:
        true,

      logging:
        false,

      backgroundColor:
        PDF_BACKGROUND,

      /*
       * Com useCORS habilitado, não queremos aceitar um canvas
       * contaminado por recursos cross-origin, porque isso pode
       * fazer canvas.toDataURL() falhar depois.
       */
      allowTaint:
        false,

      width:
        element.scrollWidth,

      height:
        element.scrollHeight,

      /*
       * Garante que a captura parte do início do elemento mesmo
       * quando a página atual está rolada.
       */
      scrollX:
        0,

      scrollY:
        -window.scrollY,
    }
  );
}

function addCanvasToCurrentPage(
  pdf:
    jsPDF,
  canvas:
    HTMLCanvasElement
): void {
  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const imgWidth =
    canvas.width;

  const imgHeight =
    canvas.height;

  if (
    imgWidth <=
      0 ||
    imgHeight <=
      0
  ) {
    throw new Error(
      "O card não possui dimensões válidas para exportação."
    );
  }

  const ratio =
    Math.min(
      pageWidth /
        imgWidth,
      pageHeight /
        imgHeight
    );

  const finalWidth =
    imgWidth *
    ratio *
    PDF_CONTENT_RATIO;

  const finalHeight =
    imgHeight *
    ratio *
    PDF_CONTENT_RATIO;

  const x =
    (
      pageWidth -
      finalWidth
    ) /
    2;

  const y =
    (
      pageHeight -
      finalHeight
    ) /
    2;

  const imgData =
    canvas.toDataURL(
      "image/png"
    );

  pdf.addImage(
    imgData,
    "PNG",
    x,
    y,
    finalWidth,
    finalHeight
  );
}

function getMountedElements(
  cards:
    RefObject<HTMLElement>[]
): HTMLElement[] {
  return cards
    .map(
      (
        ref
      ) =>
        ref.current
    )
    .filter(
      (
        element
      ): element is HTMLElement =>
        Boolean(
          element
        )
    );
}

// ============================================================
// EXPORTAR UM CARD
// ============================================================

/**
 * Exporta um elemento HTML para PDF como imagem.
 *
 * Preserva a aparência visual atual do card no DOM.
 */
export async function exportCardToPDF(
  options:
    ExportCardOptions
): Promise<void> {
  const {
    cardRef,
    title =
      "Documento Vault",

    filename =
      `documento_${format(
        new Date(),
        "dd-MM-yyyy_HH-mm"
      )}.pdf`,
  } =
    options;

  const element =
    cardRef.current;

  if (
    !element
  ) {
    throw new Error(
      "Elemento do card não encontrado."
    );
  }

  try {
    const canvas =
      await captureElement(
        element
      );

    const pdf =
      createPdf(
        title
      );

    addCanvasToCurrentPage(
      pdf,
      canvas
    );

    pdf.save(
      filename
    );
  } catch (
    error
  ) {
    console.error(
      "[pdfExport] Erro ao gerar PDF do card:",
      error
    );

    throw new Error(
      "Não foi possível gerar o PDF. Tente novamente."
    );
  }
}

// ============================================================
// EXPORTAR VÁRIOS CARDS
// ============================================================

/**
 * Exporta múltiplos elementos HTML para um único PDF.
 *
 * Cada card montado recebe uma página própria.
 *
 * Importante:
 * refs sem elemento montado não podem ser capturados por
 * html2canvas. O chamador deve garantir que todos os cards que
 * deseja exportar existam no DOM no momento da chamada.
 */
export async function exportCardsToPDF(
  options:
    ExportCardsOptions
): Promise<void> {
  const {
    cards,
    title =
      "Meus Documentos",

    filename =
      `documentos_${format(
        new Date(),
        "dd-MM-yyyy_HH-mm"
      )}.pdf`,

    onProgress,
  } =
    options;

  if (
    cards.length ===
    0
  ) {
    throw new Error(
      "Nenhum card para exportar."
    );
  }

  /*
   * Filtramos ANTES de criar/processar páginas.
   *
   * Isso corrige:
   * - páginas iniciais em branco;
   * - progresso contando refs inexistentes;
   * - PDF vazio sendo salvo silenciosamente.
   */
  const elements =
    getMountedElements(
      cards
    );

  if (
    elements.length ===
    0
  ) {
    throw new Error(
      "Nenhum dos cards solicitados está montado para exportação."
    );
  }

  try {
    const pdf =
      createPdf(
        title
      );

    const total =
      elements.length;

    for (
      let index =
        0;
      index <
      total;
      index++
    ) {
      const element =
        elements[
          index
        ];

      const canvas =
        await captureElement(
          element
        );

      /*
       * O jsPDF já nasce com a primeira página.
       *
       * Só adicionamos outra página depois que pelo menos um
       * card válido já tiver sido escrito.
       */
      if (
        index >
        0
      ) {
        pdf.addPage();
      }

      addCanvasToCurrentPage(
        pdf,
        canvas
      );

      onProgress?.(
        index +
          1,
        total
      );
    }

    pdf.save(
      filename
    );
  } catch (
    error
  ) {
    console.error(
      "[pdfExport] Erro ao exportar cards:",
      error
    );

    throw new Error(
      "Não foi possível gerar o PDF. Tente novamente."
    );
  }
}