// VAULT M2 R2 — formatos puros extraidos da tela Detalhes sem alterar comportamento.
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/health-utils";

export function normalizeMedicationQualityText(
  value:
    string | null | undefined
): string {
  return String(
    value ?? ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .replace(
      /[^a-z0-9]+/g,
      ""
    )
    .trim();
}

// ============================================================
// HELPERS DE DATA
// ============================================================

export function formatDate(
  isoStr?: string | null
) {
  if (!isoStr) {
    return "—";
  }

  try {
    const dateOnly =
      isoStr.split("T")[0];

    const date =
      parseLocalDate(
        dateOnly
      );

    if (!date) {
      return isoStr;
    }

    return format(
      date,
      "dd MMM yyyy",
      {
        locale:
          ptBR,
      }
    );
  } catch {
    return isoStr;
  }
}

export function getDateDaysAgoISO(
  daysAgo: number
) {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  date.setDate(
    date.getDate() -
      daysAgo
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export function getDoseSortTimestamp(
  log: {
    data?: string;
    horario?: string;
    tomado_em?: string;
  }
) {
  if (
    log.tomado_em
  ) {
    const timestamp =
      new Date(
        log.tomado_em
      ).getTime();

    if (
      Number.isFinite(
        timestamp
      )
    ) {
      return timestamp;
    }
  }

  if (
    log.data
  ) {
    const [
      year,
      month,
      day,
    ] =
      log.data
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      (
        log.horario ||
        "00:00"
      )
        .split(":")
        .map(Number);

    const timestamp =
      new Date(
        year,
        month - 1,
        day,
        hour || 0,
        minute || 0
      ).getTime();

    return Number.isFinite(
      timestamp
    )
      ? timestamp
      : 0;
  }

  return 0;
}

// ============================================================
// HELPERS DE QUANTIDADE
// ============================================================

export function formatQuantidade(
  value: number
) {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(2)
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

export function getKnownDoseQuantity(
  log: {
    quantidade?: number;
  }
): number | null {
  const value =
    Number(
      log.quantidade
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return null;
  }

  return value;
}

export function summarizeKnownQuantity(
  logs: Array<{
    quantidade?: number;
  }>
) {
  let total =
    0;

  let knownCount =
    0;

  logs.forEach(
    (log) => {
      const value =
        getKnownDoseQuantity(
          log
        );

      if (
        value ===
        null
      ) {
        return;
      }

      total +=
        value;

      knownCount +=
        1;
    }
  );

  return {
    total,
    knownCount,

    totalCount:
      logs.length,

    complete:
      logs.length ===
        0 ||
      knownCount ===
        logs.length,
  };
}

export function formatKnownQuantitySummary(
  summary: {
    total: number;
    knownCount: number;
    totalCount: number;
    complete: boolean;
  }
): string {
  if (
    summary.totalCount ===
    0
  ) {
    return "0";
  }

  if (
    summary.knownCount ===
    0
  ) {
    return "—";
  }

  if (
    summary.complete
  ) {
    return formatQuantidade(
      summary.total
    );
  }

  return `${formatQuantidade(
    summary.total
  )}*`;
}
