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

  /*
   * Para estoque SOS/esporádico, "dias restantes"
   * não representa corretamente a disponibilidade.
   */
  stockMetric?:
    | "days"
    | "doses"
    | "quantity";

  stockValue?: number;
}

export interface EstoqueInfo {
  consumoDiario: number;

  /**
   * Mantido por compatibilidade com consumidores atuais.
   *
   * Representa a quantidade disponível para apresentação
   * e nunca fica abaixo de zero.
   */
  quantidadeInicial: number;

  /**
   * Quantidade utilizável/exibível.
   *
   * Um saldo real negativo continua preservado separadamente
   * em saldoRegistrado.
   */
  quantidadeRestante: number;

  /**
   * Saldo exatamente persistido no medicamento.
   *
   * Pode ser negativo.
   */
  saldoRegistrado: number;

  /**
   * Permite ao cérebro/UI identificar que os registros de uso
   * ultrapassaram o saldo informado.
   */
  estoqueNegativo: boolean;

  /*
   * null = não existe informação suficiente para
   * estimar duração em dias.
   */
  diasRestantes:
    number | null;

  /**
   * Mantido como number por compatibilidade.
   *
   * Quando estimativaDosesDisponivel === false, este valor não
   * deve ser interpretado como uma estimativa real.
   */
  dosesRestantes: number;

  unidade: string;

  textoEstoque: string;

  isSOS: boolean;

  temFrequenciaConfigurada: boolean;

  estimativaDosesDisponivel: boolean;

  /**
   * Indica se existe quantidade por dose suficiente para fazer
   * cálculos de consumo.
   */
  temUnidadePorDoseConfigurada: boolean;
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
  18;

const URGENTE_DIAS_ESTOQUE =
  3;

const ATENCAO_DIAS_ESTOQUE =
  7;

/*
 * Para SOS não usamos "dias".
 *
 * Estes limites são exclusivamente de inventário:
 * quantas doses estimadas ainda existem.
 */
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

  /*
   * Validamos também combinações como 31/02.
   */
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

  /*
   * Fallback apenas para valores que realmente carreguem
   * horário/timestamp em outro formato.
   */
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

  /*
   * Usamos calendário civil, e não diferença de horas.
   */
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

/**
 * Retorna null quando a quantidade por dose não está
 * explicitamente configurada.
 *
 * IMPORTANTE:
 *
 * Nunca usamos fallback 1.
 */
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
          (horario) =>
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

  /*
   * Saldo exatamente persistido.
   *
   * Pode ser negativo para manter a movimentação reversível.
   */
  const saldoRegistrado =
    Number(
      med.estoque_quantidade
    );

  const estoqueNegativo =
    saldoRegistrado <
    0;

  /*
   * Disponibilidade exibível.
   *
   * O saldo bruto continua preservado em saldoRegistrado.
   */
  const quantidadeRestante =
    Math.max(
      0,
      saldoRegistrado
    );

  const unidadeOriginal =
    med.estoque_unidade_medida ||
    "unidade(s)";

  const unidade =
    unidadeOriginal
      .trim()
      .toLowerCase();

  const isGotas =
    isMedicamentoGotas(
      med
    );

  let consumoDiario =
    0;

  let diasRestantes:
    number | null =
    null;

  let dosesRestantes =
    0;

  /*
   * Uma estimativa exige quantidade por dose.
   *
   * Conversões específicas podem exigir dados adicionais.
   */
  let estimativaDosesDisponivel =
    temUnidadePorDoseConfigurada;

  let textoEstoque =
    `${quantidadeRestante} ${unidadeOriginal}`;

  /*
   * Sem quantidade por dose, sabemos o saldo físico,
   * mas não quantas doses ele representa.
   */
  if (
    unidadePorDose ===
    null
  ) {
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
    };
  }

  // ==========================================================
  // GOTAS COM ESTOQUE EM ML
  // ==========================================================

  if (
    isGotas &&
    unidade.includes(
      "ml"
    )
  ) {
    const gotasPorMl =
      getGotasPorMl(
        med
      );

    if (
      gotasPorMl !==
      null
    ) {
      const totalGotas =
        quantidadeRestante *
        gotasPorMl;

      dosesRestantes =
        Math.floor(
          totalGotas /
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
              totalGotas /
                consumoDiario
            );
        }
      }

      textoEstoque =
        `${quantidadeRestante} ${unidadeOriginal} (aprox. ${dosesRestantes} dose${
          dosesRestantes ===
          1
            ? ""
            : "s"
        })`;
    } else {
      /*
       * Sem gotas/ml não convertemos ml em gotas.
       */
      estimativaDosesDisponivel =
        false;

      dosesRestantes =
        0;

      diasRestantes =
        null;
    }
  }

  // ==========================================================
  // GOTAS COM ESTOQUE EM FRASCO
  // ==========================================================

  else if (
    isGotas &&
    unidade.includes(
      "frasco"
    )
  ) {
    const gotasPorMl =
      getGotasPorMl(
        med
      );

    const mlTotal =
      Number(
        med.estoque_ml_total
      );

    /*
     * "frasco" sozinho não informa volume.
     *
     * Só estimamos doses quando o volume total configurado
     * e gotas/ml são conhecidos.
     */
    if (
      gotasPorMl !==
        null &&
      Number.isFinite(
        mlTotal
      ) &&
      mlTotal >
        0
    ) {
      const totalGotas =
        mlTotal *
        gotasPorMl;

      dosesRestantes =
        Math.floor(
          totalGotas /
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
              totalGotas /
                consumoDiario
            );
        }
      }

      textoEstoque =
        `${quantidadeRestante} ${unidadeOriginal} (aprox. ${dosesRestantes} dose${
          dosesRestantes ===
          1
            ? ""
            : "s"
        })`;
    } else {
      estimativaDosesDisponivel =
        false;

      dosesRestantes =
        0;

      diasRestantes =
        null;
    }
  }

  // ==========================================================
  // COMPRIMIDOS / CÁPSULAS / DEMAIS UNIDADES
  // ==========================================================

  else {
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
  }

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
  };
}

// ============================================================
// ESTOQUE RETROATIVO
// ============================================================

/**
 * Calcula o saldo estimado quando o usuário informa
 * uma quantidade adquirida em uma data passada.
 *
 * Importante:
 * - só calcula consumo automático se houver horários;
 * - só calcula consumo quando unidadePorDose foi informada;
 * - não inventa "1 unidade por dose";
 * - YYYY-MM-DD é interpretado como data local;
 * - data futura não gera consumo negativo.
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
  if (
    !Number.isFinite(
      quantidadeComprada
    ) ||
    quantidadeComprada <=
      0
  ) {
    return Math.max(
      0,
      Number.isFinite(
        quantidadeComprada
      )
        ? quantidadeComprada
        : 0
    );
  }

  if (
    !dataCompraStr
  ) {
    return quantidadeComprada;
  }

  const horarios =
    normalizeHorarios(
      horariosDiarios
    );

  /*
   * Sem frequência explícita, não presumimos consumo.
   */
  if (
    horarios.length ===
    0
  ) {
    return quantidadeComprada;
  }

  /*
   * Sem quantidade por dose explícita, não presumimos 1.
   */
  if (
    typeof unidadePorDose !==
      "number" ||
    !Number.isFinite(
      unidadePorDose
    ) ||
    unidadePorDose <=
      0
  ) {
    return quantidadeComprada;
  }

  const dataCompra =
    parseLocalDate(
      dataCompraStr
    );

  if (
    !dataCompra
  ) {
    return quantidadeComprada;
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

  const diasPassados =
    Math.floor(
      (
        hojeDay -
        compraDay
      ) /
        DAY_MS
    );

  if (
    diasPassados <=
    0
  ) {
    return quantidadeComprada;
  }

  const consumoDiario =
    horarios.length *
    unidadePorDose;

  const totalConsumido =
    diasPassados *
    consumoDiario;

  const saldoRestante =
    quantidadeComprada -
    totalConsumido;

  /*
   * Esta função é uma estimativa de saldo inicial calculado a
   * partir de uma aquisição histórica.
   *
   * Diferentemente da movimentação real de DoseLogs, aqui não
   * faz sentido criar saldo inicial negativo.
   */
  return Math.max(
    0,
    Number(
      saldoRestante.toFixed(
        4
      )
    )
  );
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

        // ====================================================
        // ESTOQUE ZERADO / NEGATIVO — TODOS OS TIPOS
        // ====================================================

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

        // ====================================================
        // SOS / ESPORÁDICO
        // ====================================================

        if (
          info.isSOS
        ) {
          /*
           * Não existe "acaba em X dias" para medicamento
           * usado conforme necessidade.
           */
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

            /*
             * Mantido por compatibilidade.
             */
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

        // ====================================================
        // CONTÍNUO
        // ====================================================

        if (
          info.diasRestantes ===
          null
        ) {
          /*
           * Sem frequência ou quantidade por dose suficiente
           * não inventamos duração.
           */
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

          level:
            getAlertLevel(
              daysUntil,
              controlada
            ),

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
  return documents
    .filter(
      (
        doc
      ) =>
        doc.category_id ===
          "saude" &&
        Boolean(
          doc.id
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
                ?.renewal_date ||
              doc.metadata
                ?.vencimento ||
              doc.metadata
                ?.validade ||
              doc.metadata
                ?.proxima_renovacao ||
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
            `/detalhes?id=${doc.id}`,
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
            `/detalhes?id=${doc.id}`,
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
  if (!isoStr) {
    return "";
  }

  const parts =
    parseDateParts(
      isoStr
    );

  if (!parts) {
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

  // ==========================================================
  // OFTALMOLOGIA
  // ==========================================================

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

  // ==========================================================
  // SONO
  // ==========================================================

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

  // ==========================================================
  // NEUROLOGIA / PSIQUIATRIA
  // ==========================================================

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

  // ==========================================================
  // HUMOR
  // ==========================================================

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

  // ==========================================================
  // ANSIEDADE
  // ==========================================================

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

  // ==========================================================
  // DOR / LESÕES
  // ==========================================================

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

  // ==========================================================
  // FALLBACK
  // ==========================================================

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

  // ==========================================================
  // PRESSÃO ARTERIAL
  // ==========================================================

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

  // ==========================================================
  // GLICEMIA
  // ==========================================================

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

  // ==========================================================
  // TEMPERATURA
  // ==========================================================

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

  // ==========================================================
  // FREQUÊNCIA CARDÍACA
  // ==========================================================

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

  // ==========================================================
  // ANSIEDADE / HUMOR
  // ==========================================================

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

  // ==========================================================
  // FALLBACK
  // ==========================================================

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