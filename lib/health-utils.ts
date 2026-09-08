// lib/health-utils.ts

import type {
  Document,
  Exame,
  Medicamento,
  TipoReceita,
} from "@/lib/types";

import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  Droplet,
  Eye,
  Flame,
  HeartPulse,
  Moon,
  ShieldAlert,
  Stethoscope,
  XCircle,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

export type AlertLevel =
  | "vencido"
  | "urgente"
  | "atencao"
  | "ok";

export interface HealthAlert {
  id: string;

  kind:
    | "medicamento"
    | "documento"
    | "consulta"
    | "estoque"
    | "exame"
    | "cirurgia"
    | "tratamento"
    | "renovacao";

  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  level: AlertLevel;
  href: string;

  tipoReceita?: TipoReceita;

  stockMetric?:
    | "days"
    | "doses"
    | "quantity";

  stockValue?: number;
}

export interface EstoqueInfo {
  consumoDiario: number;

  quantidadeInicial: number;

  quantidadeRestante: number;

  saldoRegistrado: number;

  estoqueNegativo: boolean;

  diasRestantes:
    number | null;

  dosesRestantes: number;

  unidade: string;

  /**
   * Compatibilidade com consumidores antigos.
   */
  textoEstoque: string;

  isSOS: boolean;

  temFrequenciaConfigurada: boolean;

  estimativaDosesDisponivel: boolean;

  temUnidadePorDoseConfigurada: boolean;

  /**
   * Apresentação estruturada para UI.
   */
  textoDose:
    string | null;

  doseQuantidade:
    number | null;

  doseUnidade:
    string;

  textoEstoquePrincipal:
    string;

  textoEstoqueSecundario:
    string | null;

  gotasPorMl:
    number | null;

  gotasDisponiveis:
    number | null;

  mlDisponiveis:
    number | null;
}

// ============================================================
// CONSTANTES
// ============================================================

const DAY_MS =
  24 *
  60 *
  60 *
  1000;

const URGENTE_DIAS =
  5;

const ATENCAO_DIAS =
  15;

const URGENTE_DIAS_CONTROLADA =
  7;

const ATENCAO_DIAS_CONTROLADA =
  10;

const URGENTE_DIAS_ESTOQUE =
  3;

const ATENCAO_DIAS_ESTOQUE =
  7;

const URGENTE_DOSES_ESTOQUE_SOS =
  2;

const ATENCAO_DOSES_ESTOQUE_SOS =
  5;

// ============================================================
// RECEITAS
// ============================================================

export const VALIDADE_RECEITA_DIAS:
  Record<
    TipoReceita,
    number | null
  > = {
  comum:
    null,

  amarela:
    30,

  azul:
    60,

  branca:
    60,
};

export const TIPO_RECEITA_LABELS:
  Record<
    TipoReceita,
    string
  > = {
  comum:
    "Comum",

  amarela:
    "Amarela",

  azul:
    "Azul",

  branca:
    "Branca controlada",
};

// ============================================================
// HELPERS DE DATA
// ============================================================

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

function getDateOnlyPart(
  value: string
): string {
  return value
    .trim()
    .split(
      "T"
    )[0];
}

function parseDateParts(
  value?:
    string | null
): LocalDateParts | null {
  if (!value) {
    return null;
  }

  const clean =
    getDateOnlyPart(
      value
    );

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      clean
    );

  if (!match) {
    return null;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  if (
    !Number.isInteger(
      year
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      day
    ) ||
    month <
      1 ||
    month >
      12 ||
    day <
      1 ||
    day >
      31
  ) {
    return null;
  }

  const validationDate =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    validationDate.getFullYear() !==
      year ||
    validationDate.getMonth() !==
      month -
        1 ||
    validationDate.getDate() !==
      day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

export function parseLocalDate(
  value?:
    string | null
): Date | null {
  if (!value) {
    return null;
  }

  const parts =
    parseDateParts(
      value
    );

  if (parts) {
    return new Date(
      parts.year,
      parts.month -
        1,
      parts.day
    );
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function localDateToUtcDay(
  date: Date
): number {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

export function getDaysUntil(
  dateStr?:
    string | null
): number | null {
  if (!dateStr) {
    return null;
  }

  const target =
    parseLocalDate(
      dateStr
    );

  if (!target) {
    return null;
  }

  const today =
    new Date();

  const targetDay =
    localDateToUtcDay(
      target
    );

  const todayDay =
    localDateToUtcDay(
      today
    );

  return Math.round(
    (
      targetDay -
      todayDay
    ) /
      DAY_MS
  );
}

export function getLocalTodayISO(): string {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export function formatLocalDateISO(
  date: Date
): string {
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

export function addDaysToLocalDate(
  dateStr: string,
  days: number
): string {
  const date =
    parseLocalDate(
      dateStr
    );

  if (
    !date ||
    !Number.isFinite(
      days
    )
  ) {
    return "";
  }

  date.setDate(
    date.getDate() +
      days
  );

  return formatLocalDateISO(
    date
  );
}

// ============================================================
// ALERTAS DE DATA
// ============================================================

export function getAlertLevel(
  daysUntil:
    number | null,
  controlada:
    boolean = false
): AlertLevel {
  if (
    daysUntil ===
    null
  ) {
    return "ok";
  }

  if (
    daysUntil <
    0
  ) {
    return "vencido";
  }

  const urgenteLimite =
    controlada
      ? URGENTE_DIAS_CONTROLADA
      : URGENTE_DIAS;

  const atencaoLimite =
    controlada
      ? ATENCAO_DIAS_CONTROLADA
      : ATENCAO_DIAS;

  if (
    daysUntil <=
    urgenteLimite
  ) {
    return "urgente";
  }

  if (
    daysUntil <=
    atencaoLimite
  ) {
    return "atencao";
  }

  return "ok";
}

export function isControlada(
  tipo?: TipoReceita
): boolean {
  return Boolean(
    tipo &&
    tipo !==
      "comum"
  );
}

export function suggestRenewalDate(
  dataReceita: string,
  tipo: TipoReceita
): string {
  const dias =
    VALIDADE_RECEITA_DIAS[
      tipo
    ];

  if (
    !dias
  ) {
    return "";
  }

  return addDaysToLocalDate(
    dataReceita,
    dias
  );
}

// ============================================================
// ESTOQUE
// ============================================================

export function temEstoqueConfigurado(
  med: Medicamento
): boolean {
  return (
    typeof med.estoque_quantidade ===
      "number" &&
    Number.isFinite(
      med.estoque_quantidade
    )
  );
}

function getUnidadePorDose(
  med: Medicamento
): number | null {
  const value =
    Number(
      med.estoque_unidade_por_dose
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

function getGotasPorMl(
  med: Medicamento
): number | null {
  const value =
    Number(
      med.estoque_gotas_por_ml
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

function isMedicamentoGotas(
  med: Medicamento
): boolean {
  const forma =
    String(
      med.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  const formato =
    String(
      med.formato ||
        ""
    )
      .trim()
      .toLowerCase();

  return (
    forma.includes(
      "gota"
    ) ||
    formato.includes(
      "gota"
    )
  );
}

function formatEstoqueNumero(
  value:
    number
): string {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "0";
  }

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
    .toFixed(
      2
    )
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

function pluralDoseUnit(
  singular:
    string,
  plural:
    string,
  quantity:
    number
): string {
  return quantity ===
    1
    ? singular
    : plural;
}

export function getMedicamentoDoseUnitLabel(
  med:
    Medicamento,
  quantity:
    number = 2
): string {
  if (
    isMedicamentoGotas(
      med
    )
  ) {
    return pluralDoseUnit(
      "gota",
      "gotas",
      quantity
    );
  }

  const formato =
    String(
      med.formato ||
        med.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    formato.includes(
      "caps"
    )
  ) {
    return pluralDoseUnit(
      "cápsula",
      "cápsulas",
      quantity
    );
  }

  if (
    formato.includes(
      "comprim"
    ) ||
    formato.includes(
      "partido"
    ) ||
    formato.includes(
      "inteiro"
    )
  ) {
    return pluralDoseUnit(
      "comprimido",
      "comprimidos",
      quantity
    );
  }

  if (
    formato.includes(
      "adesivo"
    )
  ) {
    return pluralDoseUnit(
      "adesivo",
      "adesivos",
      quantity
    );
  }

  const estoqueUnit =
    String(
      med.estoque_unidade_medida ||
        ""
    ).trim();

  if (
    estoqueUnit
  ) {
    return estoqueUnit;
  }

  return pluralDoseUnit(
    "unidade",
    "unidades",
    quantity
  );
}

export function formatMedicamentoDose(
  med:
    Medicamento,
  quantity?:
    number | null
): string | null {
  const resolved =
    Number(
      quantity
    );

  if (
    !Number.isFinite(
      resolved
    ) ||
    resolved <=
      0
  ) {
    return null;
  }

  return `${formatEstoqueNumero(
    resolved
  )} ${getMedicamentoDoseUnitLabel(
    med,
    resolved
  )}`;
}

function normalizeHorarios(
  horarios:
    string[] | undefined
): string[] {
  return Array.from(
    new Set(
      (
        horarios ||
        []
      )
        .map(
          (
            horario
          ) =>
            String(
              horario ||
                ""
            ).trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

export function computeEstoqueInfo(
  med: Medicamento
): EstoqueInfo | null {
  if (
    !temEstoqueConfigurado(
      med
    )
  ) {
    return null;
  }

  const horarios =
    normalizeHorarios(
      med.estoque_horarios
    );

  const isSOS =
    med.tipo_uso !==
    "continuo";

  const temFrequenciaConfigurada =
    !isSOS &&
    horarios.length >
      0;

  const unidadePorDose =
    getUnidadePorDose(
      med
    );

  const temUnidadePorDoseConfigurada =
    unidadePorDose !==
    null;

  const saldoRegistrado =
    Number(
      med.estoque_quantidade
    );

  const estoqueNegativo =
    saldoRegistrado <
    0;

  const quantidadeRestante =
    Math.max(
      0,
      saldoRegistrado
    );

  const unidadeOriginal =
    med.estoque_unidade_medida ||
    "unidade(s)";

  const unidadeNormalizada =
    unidadeOriginal
      .trim()
      .toLowerCase();

  const isGotas =
    isMedicamentoGotas(
      med
    );

  const gotasPorMl =
    isGotas
      ? getGotasPorMl(
          med
        )
      : null;

  const doseUnidade =
    getMedicamentoDoseUnitLabel(
      med,
      unidadePorDose ??
        2
    );

  const textoDose =
    formatMedicamentoDose(
      med,
      unidadePorDose
    );

  let consumoDiario =
    0;

  let diasRestantes:
    number | null =
    null;

  let dosesRestantes =
    0;

  let estimativaDosesDisponivel =
    temUnidadePorDoseConfigurada;

  let gotasDisponiveis:
    number | null =
    null;

  let mlDisponiveis:
    number | null =
    null;

  const textoEstoquePrincipal =
    `${formatEstoqueNumero(
      quantidadeRestante
    )} ${unidadeOriginal}`;

  let textoEstoqueSecundario:
    string | null =
    null;

  if (
    isGotas &&
    unidadeNormalizada.includes(
      "ml"
    )
  ) {
    mlDisponiveis =
      quantidadeRestante;

    if (
      gotasPorMl !==
      null
    ) {
      gotasDisponiveis =
        quantidadeRestante *
        gotasPorMl;
    }
  }

  if (
    isGotas &&
    unidadeNormalizada.includes(
      "frasco"
    )
  ) {
    const mlTotal =
      Number(
        med.estoque_ml_total
      );

    if (
      Number.isFinite(
        mlTotal
      ) &&
      mlTotal >
        0
    ) {
      mlDisponiveis =
        mlTotal;

      if (
        gotasPorMl !==
        null
      ) {
        gotasDisponiveis =
          mlTotal *
          gotasPorMl;
      }
    }
  }

  if (
    unidadePorDose ===
    null
  ) {
    estimativaDosesDisponivel =
      false;

    if (
      gotasDisponiveis !==
      null
    ) {
      textoEstoqueSecundario =
        `≈ ${formatEstoqueNumero(
          gotasDisponiveis
        )} gotas disponíveis`;
    } else if (
      isGotas &&
      mlDisponiveis !==
        null
    ) {
      textoEstoqueSecundario =
        "Conversão em gotas indisponível";
    }

    const textoEstoque =
      textoEstoqueSecundario
        ? `${textoEstoquePrincipal} · ${textoEstoqueSecundario}`
        : textoEstoquePrincipal;

    return {
      consumoDiario:
        0,

      quantidadeInicial:
        quantidadeRestante,

      quantidadeRestante,

      saldoRegistrado,

      estoqueNegativo,

      diasRestantes:
        null,

      dosesRestantes:
        0,

      unidade:
        unidadeOriginal,

      textoEstoque,

      isSOS,

      temFrequenciaConfigurada,

      estimativaDosesDisponivel:
        false,

      temUnidadePorDoseConfigurada:
        false,

      textoDose,

      doseQuantidade:
        null,

      doseUnidade,

      textoEstoquePrincipal,

      textoEstoqueSecundario,

      gotasPorMl,

      gotasDisponiveis,

      mlDisponiveis,
    };
  }

  if (
    isGotas
  ) {
    if (
      gotasDisponiveis !==
      null
    ) {
      dosesRestantes =
        Math.floor(
          gotasDisponiveis /
            unidadePorDose
        );

      if (
        temFrequenciaConfigurada
      ) {
        consumoDiario =
          horarios.length *
          unidadePorDose;

        if (
          consumoDiario >
          0
        ) {
          diasRestantes =
            Math.floor(
              gotasDisponiveis /
                consumoDiario
            );
        }
      }

      textoEstoqueSecundario =
        `≈ ${formatEstoqueNumero(
          gotasDisponiveis
        )} gotas · ≈ ${dosesRestantes} dose${
          dosesRestantes ===
          1
            ? ""
            : "s"
        }`;
    } else if (
      unidadeNormalizada.includes(
        "gota"
      )
    ) {
      gotasDisponiveis =
        quantidadeRestante;

      dosesRestantes =
        Math.floor(
          quantidadeRestante /
            unidadePorDose
        );

      if (
        temFrequenciaConfigurada
      ) {
        consumoDiario =
          horarios.length *
          unidadePorDose;

        if (
          consumoDiario >
          0
        ) {
          diasRestantes =
            Math.floor(
              quantidadeRestante /
                consumoDiario
            );
        }
      }

      textoEstoqueSecundario =
        `≈ ${dosesRestantes} dose${
          dosesRestantes ===
          1
            ? ""
            : "s"
        }`;
    } else {
      estimativaDosesDisponivel =
        false;

      dosesRestantes =
        0;

      diasRestantes =
        null;

      if (
        mlDisponiveis !==
        null
      ) {
        textoEstoqueSecundario =
          "Conversão em gotas indisponível";
      }
    }
  } else {
    dosesRestantes =
      Math.floor(
        quantidadeRestante /
          unidadePorDose
      );

    if (
      temFrequenciaConfigurada
    ) {
      consumoDiario =
        horarios.length *
        unidadePorDose;

      if (
        consumoDiario >
        0
      ) {
        diasRestantes =
          Math.floor(
            quantidadeRestante /
              consumoDiario
          );
      }
    }

    textoEstoqueSecundario =
      `≈ ${dosesRestantes} dose${
        dosesRestantes ===
        1
          ? ""
          : "s"
      }`;
  }

  const textoEstoque =
    textoEstoqueSecundario
      ? `${textoEstoquePrincipal} · ${textoEstoqueSecundario}`
      : textoEstoquePrincipal;

  return {
    consumoDiario,

    quantidadeInicial:
      quantidadeRestante,

    quantidadeRestante,

    saldoRegistrado,

    estoqueNegativo,

    diasRestantes,

    dosesRestantes,

    unidade:
      unidadeOriginal,

    textoEstoque,

    isSOS,

    temFrequenciaConfigurada,

    estimativaDosesDisponivel,

    temUnidadePorDoseConfigurada,

    textoDose,

    doseQuantidade:
      unidadePorDose,

    doseUnidade,

    textoEstoquePrincipal,

    textoEstoqueSecundario,

    gotasPorMl,

    gotasDisponiveis,

    mlDisponiveis,
  };
}

// ============================================================
// ESTOQUE RETROATIVO
// ============================================================

export interface EstoqueRetroativoAnalise {
  estoqueInicial:
    number;

  estoqueEstimadoAtual:
    number;

  quantidadeEstimadaConsumida:
    number;

  dosesProgramadas:
    number;

  diasDecorridos:
    number;

  horariosPorDia:
    number;

  unidadePorDose:
    number | null;

  aplicavel:
    boolean;

  limitadoPorEstoque:
    boolean;
}

/**
 * Analisa um possível cadastro retroativo de estoque.
 *
 * IMPORTANTE:
 *
 * Esta função estima CONSUMO DE ESTOQUE.
 *
 * Ela NÃO afirma que as doses foram tomadas e NÃO cria
 * histórico de adesão.
 *
 * O período considera apenas dias completos anteriores a hoje.
 * Doses do dia atual não são presumidas.
 */
export function analisarEstoqueRetroativo(
  quantidadeComprada:
    number,
  dataCompraStr:
    string,
  horariosDiarios:
    string[],
  unidadePorDose?:
    number
): EstoqueRetroativoAnalise {
  const estoqueInicial =
    Number.isFinite(
      quantidadeComprada
    )
      ? Math.max(
          0,
          quantidadeComprada
        )
      : 0;

  const emptyResult:
    EstoqueRetroativoAnalise = {
      estoqueInicial,

      estoqueEstimadoAtual:
        estoqueInicial,

      quantidadeEstimadaConsumida:
        0,

      dosesProgramadas:
        0,

      diasDecorridos:
        0,

      horariosPorDia:
        0,

      unidadePorDose:
        typeof unidadePorDose ===
          "number" &&
        Number.isFinite(
          unidadePorDose
        ) &&
        unidadePorDose >
          0
          ? unidadePorDose
          : null,

      aplicavel:
        false,

      limitadoPorEstoque:
        false,
    };

  if (
    estoqueInicial <=
      0 ||
    !dataCompraStr
  ) {
    return emptyResult;
  }

  const horarios =
    normalizeHorarios(
      horariosDiarios
    );

  if (
    horarios.length ===
    0
  ) {
    return {
      ...emptyResult,

      horariosPorDia:
        0,
    };
  }

  if (
    typeof unidadePorDose !==
      "number" ||
    !Number.isFinite(
      unidadePorDose
    ) ||
    unidadePorDose <=
      0
  ) {
    return {
      ...emptyResult,

      horariosPorDia:
        horarios.length,
    };
  }

  const dataCompra =
    parseLocalDate(
      dataCompraStr
    );

  if (
    !dataCompra
  ) {
    return {
      ...emptyResult,

      horariosPorDia:
        horarios.length,

      unidadePorDose,
    };
  }

  const hoje =
    new Date();

  const compraDay =
    localDateToUtcDay(
      dataCompra
    );

  const hojeDay =
    localDateToUtcDay(
      hoje
    );

  const diasDecorridos =
    Math.floor(
      (
        hojeDay -
        compraDay
      ) /
        DAY_MS
    );

  if (
    diasDecorridos <=
    0
  ) {
    return {
      ...emptyResult,

      horariosPorDia:
        horarios.length,

      unidadePorDose,

      diasDecorridos:
        Math.max(
          0,
          diasDecorridos
        ),
    };
  }

  const dosesProgramadas =
    diasDecorridos *
    horarios.length;

  const consumoCalculado =
    dosesProgramadas *
    unidadePorDose;

  const quantidadeEstimadaConsumida =
    Math.min(
      estoqueInicial,
      consumoCalculado
    );

  const estoqueEstimadoAtual =
    Math.max(
      0,
      estoqueInicial -
        quantidadeEstimadaConsumida
    );

  return {
    estoqueInicial:
      Number(
        estoqueInicial.toFixed(
          4
        )
      ),

    estoqueEstimadoAtual:
      Number(
        estoqueEstimadoAtual.toFixed(
          4
        )
      ),

    quantidadeEstimadaConsumida:
      Number(
        quantidadeEstimadaConsumida.toFixed(
          4
        )
      ),

    dosesProgramadas,

    diasDecorridos,

    horariosPorDia:
      horarios.length,

    unidadePorDose,

    aplicavel:
      dosesProgramadas >
        0 &&
      quantidadeEstimadaConsumida >
        0,

    limitadoPorEstoque:
      consumoCalculado >
      estoqueInicial,
  };
}

/**
 * Compatibilidade com consumidores existentes.
 *
 * Para fluxos novos, prefira analisarEstoqueRetroativo()
 * para que a estimativa possa ser explicada ao usuário antes
 * de ser aplicada.
 */
export function calcularEstoqueRetroativo(
  quantidadeComprada:
    number,
  dataCompraStr:
    string,
  horariosDiarios:
    string[],
  unidadePorDose?:
    number
): number {
  return analisarEstoqueRetroativo(
    quantidadeComprada,
    dataCompraStr,
    horariosDiarios,
    unidadePorDose
  ).estoqueEstimadoAtual;
}

// ============================================================
// ALERTAS DE ESTOQUE
// ============================================================

export function getEstoqueAlerts(
  medicamentos:
    Medicamento[]
): HealthAlert[] {
  return medicamentos
    .filter(
      (
        med
      ) =>
        Boolean(
          med.id
        ) &&
        temEstoqueConfigurado(
          med
        ) &&
        med.status !==
          "descontinuado"
    )
    .map(
      (
        med
      ):
        HealthAlert | null => {
        const info =
          computeEstoqueInfo(
            med
          );

        if (
          !info ||
          !med.id
        ) {
          return null;
        }

        if (
          info.quantidadeRestante <=
          0
        ) {
          return {
            id:
              med.id,

            kind:
              "estoque",

            title:
              med.nome,

            subtitle:
              info.estoqueNegativo
                ? `Os registros de uso ultrapassaram o saldo informado (${info.unidade})`
                : `Estoque registrado zerado (${info.unidade})`,

            date:
              "",

            daysUntil:
              0,

            level:
              "vencido",

            href:
              `/saude/medicamentos/editar?id=${med.id}`,

            tipoReceita:
              med.tipo_receita,

            stockMetric:
              "quantity",

            stockValue:
              info.saldoRegistrado,
          };
        }

        if (
          info.isSOS
        ) {
          if (
            !info.estimativaDosesDisponivel
          ) {
            return null;
          }

          let level:
            AlertLevel =
            "ok";

          if (
            info.dosesRestantes <=
            URGENTE_DOSES_ESTOQUE_SOS
          ) {
            level =
              "urgente";
          } else if (
            info.dosesRestantes <=
            ATENCAO_DOSES_ESTOQUE_SOS
          ) {
            level =
              "atencao";
          }

          if (
            level ===
            "ok"
          ) {
            return null;
          }

          return {
            id:
              med.id,

            kind:
              "estoque",

            title:
              med.nome,

            subtitle:
              `Aproximadamente ${info.dosesRestantes} dose${
                info.dosesRestantes ===
                1
                  ? ""
                  : "s"
              } restante${
                info.dosesRestantes ===
                1
                  ? ""
                  : "s"
              }`,

            daysUntil:
              info.dosesRestantes,

            date:
              "",

            level,

            href:
              `/saude/medicamentos/editar?id=${med.id}`,

            tipoReceita:
              med.tipo_receita,

            stockMetric:
              "doses",

            stockValue:
              info.dosesRestantes,
          };
        }

        if (
          info.diasRestantes ===
          null
        ) {
          return null;
        }

        const daysUntil =
          info.diasRestantes;

        let level:
          AlertLevel =
          "ok";

        if (
          daysUntil <=
          0
        ) {
          level =
            "vencido";
        } else if (
          daysUntil <=
          URGENTE_DIAS_ESTOQUE
        ) {
          level =
            "urgente";
        } else if (
          daysUntil <=
          ATENCAO_DIAS_ESTOQUE
        ) {
          level =
            "atencao";
        }

        if (
          level ===
          "ok"
        ) {
          return null;
        }

        return {
          id:
            med.id,

          kind:
            "estoque",

          title:
            med.nome,

          subtitle:
            `${info.quantidadeRestante} ${info.unidade} restantes`,

          date:
            "",

          daysUntil,

          level,

          href:
            `/saude/medicamentos/editar?id=${med.id}`,

          tipoReceita:
            med.tipo_receita,

          stockMetric:
            "days",

          stockValue:
            daysUntil,
        };
      }
    )
    .filter(
      (
        alert
      ): alert is HealthAlert =>
        alert !==
        null
    )
    .sort(
      (
        a,
        b
      ) => {
        const levelWeight:
          Record<
            AlertLevel,
            number
          > = {
          vencido:
            0,

          urgente:
            1,

          atencao:
            2,

          ok:
            3,
        };

        const levelDiff =
          levelWeight[
            a.level
          ] -
          levelWeight[
            b.level
          ];

        if (
          levelDiff !==
          0
        ) {
          return levelDiff;
        }

        return (
          (
            a.stockValue ??
            a.daysUntil
          ) -
          (
            b.stockValue ??
            b.daysUntil
          )
        );
      }
    );
}

// ============================================================
// ALERTAS DE MEDICAMENTOS
// ============================================================

export function getMedicamentoAlerts(
  medicamentos:
    Medicamento[]
): HealthAlert[] {
  return medicamentos
    .filter(
      (
        med
      ) =>
        Boolean(
          med.id
        ) &&
        med.status !==
          "descontinuado"
    )
    .map(
      (
        med
      ) => {
        const controlada =
          isControlada(
            med.tipo_receita
          );

        const daysUntil =
          getDaysUntil(
            med.proxima_renovacao
          );

        const estoque =
          computeEstoqueInfo(
            med
          );

        const isMensalRigorosa =
          med.tipo_receita ===
          "amarela";

        const coberturaConfortavel =
          med.tipo_uso ===
            "continuo"
            ? estoque?.diasRestantes !==
                null &&
              estoque?.diasRestantes !==
                undefined &&
              estoque.diasRestantes >
                10
            : estoque?.estimativaDosesDisponivel ===
                true &&
              estoque.dosesRestantes >
                5;

        const level =
          !isMensalRigorosa &&
          coberturaConfortavel
            ? "ok"
            : getAlertLevel(
                daysUntil,
                controlada
              );

        return {
          id:
            med.id!,

          kind:
            "medicamento" as const,

          title:
            med.nome,

          subtitle:
            `${med.dosagem} · Dr(a). ${med.medico || "Não informado"}`,

          date:
            med.proxima_renovacao ||
            "",

          daysUntil:
            daysUntil ??
            999,

          level,

          href:
            `/saude/medicamentos/editar?id=${med.id}`,

          tipoReceita:
            med.tipo_receita,
        };
      }
    )
    .filter(
      (
        alert
      ) =>
        alert.level !==
        "ok"
    )
    .sort(
      (
        a,
        b
      ) =>
        a.daysUntil -
        b.daysUntil
    );
}

// ============================================================
// ALERTAS DE DOCUMENTOS
// ============================================================

export function getDocumentAlerts(
  documents:
    Document[]
): HealthAlert[] {
  const newestPrescriptionByMedication =
    new Map<string, Document>();

  for (const document of documents) {
    if (
      document.category_id !== "saude" ||
      document.type !== "receita" ||
      document.entidade_tipo !== "medicamento" ||
      !document.entidade_id
    ) {
      continue;
    }

    const current =
      newestPrescriptionByMedication.get(
        document.entidade_id
      );

    const documentDate = String(
      document.metadata?.prescription_date ||
      document.created_at ||
      ""
    );

    const currentDate = String(
      current?.metadata?.prescription_date ||
      current?.created_at ||
      ""
    );

    if (!current || documentDate > currentDate) {
      newestPrescriptionByMedication.set(
        document.entidade_id,
        document
      );
    }
  }

  return documents
    .filter(
      (
        doc
      ) =>
        doc.category_id ===
          "saude" &&
        Boolean(
          doc.id
        ) &&
        (
          doc.type !== "receita" ||
          doc.entidade_tipo !== "medicamento" ||
          !doc.entidade_id ||
          newestPrescriptionByMedication.get(
            doc.entidade_id
          )?.id === doc.id
        )
    )
    .map(
      (
        doc
      ) => {
        const expiry =
          String(
            doc.metadata
              ?.expiry_date ||
            doc.metadata
              ?.vencimento ||
            doc.metadata
              ?.validade ||
            ""
          );

        const daysUntil =
          getDaysUntil(
            expiry
          );

        return {
          id:
            doc.id!,

          kind:
            "documento" as const,

          title:
            doc.title,

          subtitle:
            doc.type ===
            "receita"
              ? "Receita"
              : doc.type,

          date:
            expiry,

          daysUntil:
            daysUntil ??
            999,

          level:
            getAlertLevel(
              daysUntil
            ),

          href:
            `/saude/documentos/detalhes?id=${doc.id}`,

        };
      }
    )
    .filter(
      (
        alert
      ) =>
        Boolean(
          alert.date
        ) &&
        alert.level !==
          "ok"
    )
    .sort(
      (
        a,
        b
      ) =>
        a.daysUntil -
        b.daysUntil
    );
}

// ============================================================
// COMPROMISSOS VINDOS DE DOCUMENTOS
// ============================================================

export function getUpcomingAppointments(
  documents:
    Document[]
): HealthAlert[] {
  const relevantTypes =
    [
      "prontuario",
      "laudo",
      "encaminhamento",
    ];

  return documents
    .filter(
      (
        doc
      ) =>
        doc.category_id ===
          "saude" &&
        Boolean(
          doc.id
        ) &&
        relevantTypes.includes(
          doc.type
        )
    )
    .map(
      (
        doc
      ) => {
        const date =
          String(
            doc.metadata
              ?.date ||
              ""
          );

        const subtitle =
          String(
            doc.metadata
              ?.specialty ||
              doc.metadata
                ?.hospital ||
              doc.type
          );

        const daysUntil =
          getDaysUntil(
            date
          );

        return {
          id:
            doc.id!,

          kind:
            "consulta" as const,

          title:
            doc.title,

          subtitle,

          date,

          daysUntil:
            daysUntil ??
            -999,

          level:
            "ok" as AlertLevel,

          href:
            `/saude/documentos/detalhes?id=${doc.id}`,
        };
      }
    )
    .filter(
      (
        alert
      ) =>
        Boolean(
          alert.date
        ) &&
        alert.daysUntil >=
          0 &&
        alert.daysUntil <=
          30
    )
    .sort(
      (
        a,
        b
      ) =>
        a.daysUntil -
        b.daysUntil
    );
}

// ============================================================
// ALERTAS DE EXAMES
// ============================================================

export function getExameAlerts(
  exames:
    Exame[]
): HealthAlert[] {
  return exames
    .filter(
      (
        exame
      ): exame is Exame & {
        id: string;
        data_retorno: string;
      } =>
        Boolean(
          exame.id
        ) &&
        Boolean(
          exame.data_retorno
        )
    )
    .map(
      (
        exame
      ) => {
        const daysUntil =
          getDaysUntil(
            exame.data_retorno
          );

        return {
          id:
            exame.id,

          kind:
            "exame" as const,

          title:
            `Retorno Exame: ${exame.nome}`,

          subtitle:
            `Laboratório: ${exame.laboratorio || "Não informado"}`,

          date:
            exame.data_retorno,

          daysUntil:
            daysUntil ??
            999,

          level:
            getAlertLevel(
              daysUntil
            ),

          href:
            `/saude/exames/detalhes?id=${exame.id}`,
        };
      }
    )
    .filter(
      (
        alert
      ) =>
        alert.level !==
        "ok"
    )
    .sort(
      (
        a,
        b
      ) =>
        a.daysUntil -
        b.daysUntil
    );
}

// ============================================================
// LABELS / CORES DE ALERTA
// ============================================================

export function alertLevelColor(
  level:
    AlertLevel
): string {
  switch (
    level
  ) {
    case "vencido":
      return "#F87171";

    case "urgente":
      return "#FB923C";

    case "atencao":
      return "#FBBF24";

    default:
      return "#7C9CB5";
  }
}

export function alertLevelLabel(
  level:
    AlertLevel,
  daysUntil:
    number
): string {
  if (
    level ===
    "vencido"
  ) {
    const dias =
      Math.abs(
        daysUntil
      );

    return dias ===
      0
      ? "Venceu hoje"
      : `Venceu há ${dias} dia${
          dias !==
          1
            ? "s"
            : ""
        }`;
  }

  if (
    daysUntil ===
    0
  ) {
    return "Vence hoje";
  }

  return `Vence em ${daysUntil} dia${
    daysUntil !==
    1
      ? "s"
      : ""
  }`;
}

export function estoqueLevelLabel(
  level:
    AlertLevel,
  valor:
    number,
  metric:
    "days" | "doses" | "quantity" =
      "days"
): string {
  if (
    metric ===
    "doses"
  ) {
    if (
      valor <=
      0
    ) {
      return "Sem doses estimadas restantes";
    }

    return `${valor} dose${
      valor ===
      1
        ? ""
        : "s"
    } restante${
      valor ===
      1
        ? ""
        : "s"
    }`;
  }

  if (
    metric ===
    "quantity"
  ) {
    if (
      valor <
      0
    ) {
      return "Uso registrado acima do saldo informado";
    }

    if (
      valor ===
      0
    ) {
      return "Estoque zerado";
    }

    return `${valor} unidade${
      valor ===
      1
        ? ""
        : "s"
    } restante${
      valor ===
      1
        ? ""
        : "s"
    }`;
  }

  if (
    level ===
    "vencido"
  ) {
    return "Estoque esgotado";
  }

  if (
    valor ===
    0
  ) {
    return "Estimativa de término hoje";
  }

  return `Estimativa de ${valor} dia${
    valor !==
    1
      ? "s"
      : ""
  } de estoque`;
}

// ============================================================
// FORMATAÇÃO
// ============================================================

export function formatDateDisplay(
  isoStr:
    string
): string {
  if (
    !isoStr
  ) {
    return "";
  }

  const parts =
    parseDateParts(
      isoStr
    );

  if (
    !parts
  ) {
    return isoStr;
  }

  return `${String(
    parts.day
  ).padStart(
    2,
    "0"
  )}/${String(
    parts.month
  ).padStart(
    2,
    "0"
  )}/${parts.year}`;
}

export function formatCurrency(
  value:
    number | undefined | null
): string {
  const val =
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
      ? value
      : 0;

  return `R$ ${val
    .toFixed(
      2
    )
    .replace(
      ".",
      ","
    )}`;
}

// ============================================================
// STATUS GLOBAL
// ============================================================

export function getStatusConfig(
  status:
    string
): {
  color: string;
  icon: LucideIcon;
} {
  switch (
    status
      ?.toLowerCase()
  ) {
    case "agendada":
      return {
        color:
          "#F59E0B",

        icon:
          Clock,
      };

    case "realizada":
      return {
        color:
          "#34D399",

        icon:
          CheckCircle2,
      };

    case "cancelada":
      return {
        color:
          "#EF4444",

        icon:
          XCircle,
      };

    default:
      return {
        color:
          "#38BDF8",

        icon:
          Stethoscope,
      };
  }
}

// ============================================================
// TEMA CLÍNICO
// ============================================================

export function getClinicalTheme(
  text:
    string
): {
  icon: LucideIcon;
  hex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  tagClass: string;
} {
  const lower =
    (
      text ||
      ""
    ).toLowerCase();

  if (
    lower.includes(
      "ceratocone"
    ) ||
    lower.includes(
      "estrabismo"
    ) ||
    lower.includes(
      "olho"
    ) ||
    lower.includes(
      "visão"
    )
  ) {
    return {
      icon:
        Eye,

      hex:
        "#06B6D4",

      textClass:
        "text-cyan-500",

      bgClass:
        "bg-cyan-500/10",

      borderClass:
        "border-cyan-500/30",

      tagClass:
        "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
    };
  }

  if (
    lower.includes(
      "insônia"
    ) ||
    lower.includes(
      "sono"
    )
  ) {
    return {
      icon:
        Moon,

      hex:
        "#6366F1",

      textClass:
        "text-indigo-400",

      bgClass:
        "bg-indigo-400/10",

      borderClass:
        "border-indigo-400/30",

      tagClass:
        "bg-indigo-400/10 border-indigo-400/20 text-indigo-400",
    };
  }

  if (
    lower.includes(
      "tdah"
    ) ||
    lower.includes(
      "f33"
    ) ||
    lower.includes(
      "f43"
    ) ||
    lower.includes(
      "neuro"
    ) ||
    lower.includes(
      "psi"
    ) ||
    lower.includes(
      "transtorno"
    ) ||
    lower.includes(
      "bipolar"
    )
  ) {
    return {
      icon:
        Brain,

      hex:
        "#8B5CF6",

      textClass:
        "text-violet-400",

      bgClass:
        "bg-violet-400/10",

      borderClass:
        "border-violet-400/30",

      tagClass:
        "bg-violet-400/10 border-violet-400/20 text-violet-400",
    };
  }

  if (
    lower.includes(
      "depressão"
    ) ||
    lower.includes(
      "depress"
    )
  ) {
    return {
      icon:
        HeartPulse,

      hex:
        "#EF4444",

      textClass:
        "text-coral",

      bgClass:
        "bg-coral/10",

      borderClass:
        "border-coral/30",

      tagClass:
        "bg-coral/10 border-coral/20 text-coral",
    };
  }

  if (
    lower.includes(
      "ansied"
    ) ||
    lower.includes(
      "f4"
    ) ||
    lower.includes(
      "pânico"
    ) ||
    lower.includes(
      "estresse"
    )
  ) {
    return {
      icon:
        ShieldAlert,

      hex:
        "#38BDF8",

      textClass:
        "text-ice",

      bgClass:
        "bg-ice/10",

      borderClass:
        "border-ice/30",

      tagClass:
        "bg-ice/10 border-ice/20 text-ice",
    };
  }

  if (
    lower.includes(
      "dor"
    ) ||
    lower.includes(
      "lesão"
    ) ||
    lower.includes(
      "plexo"
    ) ||
    lower.includes(
      "monoplegia"
    ) ||
    lower.includes(
      "artrose"
    ) ||
    lower.includes(
      "s89"
    ) ||
    lower.includes(
      "s14"
    ) ||
    lower.includes(
      "g83"
    ) ||
    lower.includes(
      "inflama"
    )
  ) {
    return {
      icon:
        Flame,

      hex:
        "#F59E0B",

      textClass:
        "text-amber-400",

      bgClass:
        "bg-amber-400/10",

      borderClass:
        "border-amber-400/30",

      tagClass:
        "bg-amber-400/10 border-amber-400/20 text-amber-400",
    };
  }

  return {
    icon:
      Activity,

    hex:
      "#34D399",

    textClass:
      "text-emerald-400",

    bgClass:
      "bg-emerald-400/10",

    borderClass:
      "border-emerald-400/30",

    tagClass:
      "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
  };
}

// ============================================================
// TEMAS DE REGISTROS DE SAÚDE
// ============================================================

export function getRegistroTheme(
  tipo:
    string
): {
  icon: LucideIcon;
  hex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  tagClass: string;
} {
  const lower =
    (
      tipo ||
      ""
    ).toLowerCase();

  if (
    lower.includes(
      "pressao"
    ) ||
    lower.includes(
      "pressão"
    ) ||
    lower ===
      "pa"
  ) {
    return {
      icon:
        HeartPulse,

      hex:
        "#EF4444",

      textClass:
        "text-coral",

      bgClass:
        "bg-coral/10",

      borderClass:
        "border-coral/30",

      tagClass:
        "bg-coral/10 border-coral/20 text-coral",
    };
  }

  if (
    lower.includes(
      "glicemia"
    ) ||
    lower.includes(
      "glicose"
    ) ||
    lower.includes(
      "açúcar"
    )
  ) {
    return {
      icon:
        Droplet,

      hex:
        "#34D399",

      textClass:
        "text-emerald-400",

      bgClass:
        "bg-emerald-400/10",

      borderClass:
        "border-emerald-400/30",

      tagClass:
        "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
    };
  }

  if (
    lower.includes(
      "temperatura"
    ) ||
    lower.includes(
      "febre"
    )
  ) {
    return {
      icon:
        Flame,

      hex:
        "#F59E0B",

      textClass:
        "text-amber-400",

      bgClass:
        "bg-amber-400/10",

      borderClass:
        "border-amber-400/30",

      tagClass:
        "bg-amber-400/10 border-amber-400/20 text-amber-400",
    };
  }

  if (
    lower.includes(
      "batimento"
    ) ||
    lower.includes(
      "pulso"
    ) ||
    lower.includes(
      "bpm"
    ) ||
    lower.includes(
      "frequência cardíaca"
    ) ||
    lower.includes(
      "frequencia cardiaca"
    )
  ) {
    return {
      icon:
        Activity,

      hex:
        "#38BDF8",

      textClass:
        "text-ice",

      bgClass:
        "bg-ice/10",

      borderClass:
        "border-ice/30",

      tagClass:
        "bg-ice/10 border-ice/20 text-ice",
    };
  }

  if (
    lower.includes(
      "ansiedade"
    ) ||
    lower.includes(
      "humor"
    ) ||
    lower.includes(
      "panico"
    ) ||
    lower.includes(
      "pânico"
    )
  ) {
    return {
      icon:
        ShieldAlert,

      hex:
        "#8B5CF6",

      textClass:
        "text-violet-400",

      bgClass:
        "bg-violet-400/10",

      borderClass:
        "border-violet-400/30",

      tagClass:
        "bg-violet-400/10 border-violet-400/20 text-violet-400",
    };
  }

  return {
    icon:
      Activity,

    hex:
      "#7C9CB5",

    textClass:
      "text-ink-muted",

    bgClass:
      "bg-surface-raised",

    borderClass:
      "border-surface-border",

    tagClass:
      "bg-surface-raised border-surface-border text-ink-muted",
  };
}
