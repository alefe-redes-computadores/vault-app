// lib/health-insights.ts

import {
  computeEstoqueInfo,
  getDaysUntil,
  getLocalTodayISO,
  parseLocalDate,
} from "./health-utils";

import type {
  Cid,
  Cirurgia,
  Consulta,
  Document as VaultDocument,
  DoseLog,
  Exame,
  Medicamento,
  RegistroSaude,
  Renovacao,
  Tratamento,
} from "./types";

// ============================================================
// TIPOS BASE DO MOTOR
// ============================================================

export type InsightConfianca =
  | "baixa"
  | "media"
  | "alta";

type InsightUrgencia =
  | "alta"
  | "media"
  | "baixa"
  | "nenhuma";

export type RenovacaoInsightMotivo =
  | "receita"
  | "estoque"
  | "sus"
  | "nenhum";

export type StatusValidadeReceita =
  | "valida"
  | "vence_hoje"
  | "proxima"
  | "vencida"
  | "sem_data";

export interface InsightEvidence {
  confianca: InsightConfianca;
  amostra: number;
  periodoDias?: number;
}

export interface ValidadeReceitaInsight {
  dataReceita: string | null;

  dataValidade: string | null;

  diasValidade: number;

  diasRestantes:
    | number
    | null;

  status:
    StatusValidadeReceita;

  vencida: boolean;

  mensagem: string;
}

/**
 * Regra atual do produto Vault.
 *
 * Uma receita registrada possui validade de referência de
 * 30 dias a partir da data da prescrição.
 *
 * A regra fica centralizada no cérebro para que Home,
 * Medicamentos, Renovações, Documentos e demais consumidores
 * não implementem cálculos diferentes.
 */
export const RECEITA_VALIDADE_PADRAO_DIAS =
  30;

export type PersonScoped<
  T extends {
    person_id?: string;
  },
> = T & {
  person_id: string;
};

/**
 * Contexto canônico do cérebro do Vault.
 *
 * IMPORTANTE:
 *
 * Este objeto deve receber somente dados que já passaram pelo
 * filtro da pessoa ativa.
 *
 * health-insights.ts não consulta Dexie, Supabase, hooks nem
 * tenta descobrir quem é a pessoa ativa.
 */
export interface HealthInsightContext {
  personId: string;

  /**
   * YYYY-MM-DD.
   *
   * Pode ser informado por testes ou consumidores que desejem
   * analisar um dia específico.
   */
  hoje?: string;

  medicamentos: Array<
    PersonScoped<Medicamento>
  >;

  doseLogs: Array<
    PersonScoped<DoseLog>
  >;

  renovacoes: Array<
    PersonScoped<Renovacao>
  >;

  tratamentos: Array<
    PersonScoped<Tratamento>
  >;

  registrosSaude: Array<
    PersonScoped<RegistroSaude>
  >;

  consultas: Array<
    PersonScoped<Consulta>
  >;

  exames: Array<
    PersonScoped<Exame>
  >;

  cirurgias: Array<
    PersonScoped<Cirurgia>
  >;

  cids: Array<
    PersonScoped<Cid>
  >;

  documentos: Array<
    PersonScoped<VaultDocument>
  >;
}

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface DoseLogLike {
  id?: string;

  medicamento_id?: string;

  data?: string;

  horario?: string;

  tomado_em?: string;

  ignorado_em?: string;

  quantidade?: number;

  /**
   * Compatibilidade temporária com estruturas antigas.
   */
  timestamp?: string;

  status?: string;
}

interface RegistroTemporalLike {
  data?: string;

  horario?: string;

  timestamp?: string;
}

interface DoseWindowSummary {
  tomadas: number;

  quantidadeTotal: number;

  quantidadeConhecida: number;

  tomadasSemQuantidade: number;

  diasComUso: number;
}

interface PeriodComparison {
  atual: number;

  anterior: number;

  diferenca: number;

  percentual:
    | number
    | null;
}

// ============================================================
// HELPERS GERAIS
// ============================================================

function normalizeText(
  value?: string | null
): string {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function uniqueStrings(
  values: Array<
    string | undefined | null
  >
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          String(
            value || ""
          ).trim()
        )
        .filter(Boolean)
    )
  );
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function determineConfidence(
  sample: number,
  thresholds: {
    media: number;
    alta: number;
  } = {
    media: 7,
    alta: 20,
  }
): InsightConfianca {
  if (
    sample >=
    thresholds.alta
  ) {
    return "alta";
  }

  if (
    sample >=
    thresholds.media
  ) {
    return "media";
  }

  return "baixa";
}

function comparePeriods(
  atual: number,
  anterior: number
): PeriodComparison {
  const diferenca =
    atual -
    anterior;

  if (
    anterior === 0
  ) {
    return {
      atual,
      anterior,
      diferenca,
      percentual:
        atual === 0
          ? 0
          : null,
    };
  }

  return {
    atual,
    anterior,
    diferenca,

    percentual:
      Number(
        (
          (
            diferenca /
            anterior
          ) *
          100
        ).toFixed(1)
      ),
  };
}

// ============================================================
// HELPERS DE DATA
// ============================================================

function parseLocalDateTime(
  data?: string,
  horario?: string
): Date | null {
  if (!data) {
    return null;
  }

  if (
    data.includes("T")
  ) {
    return parseLocalDate(
      data
    );
  }

  const base =
    parseLocalDate(
      data
    );

  if (!base) {
    return null;
  }

  if (!horario) {
    return base;
  }

  const match =
    /^(\d{1,2}):(\d{2})/.exec(
      horario.trim()
    );

  if (!match) {
    return base;
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  if (
    !Number.isInteger(
      hours
    ) ||
    !Number.isInteger(
      minutes
    ) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return base;
  }

  base.setHours(
    hours,
    minutes,
    0,
    0
  );

  return base;
}

function startOfDay(
  date: Date
): Date {
  const result =
    new Date(
      date
    );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function startOfToday(
  todayISO?: string
): Date {
  const parsed =
    parseLocalDate(
      todayISO ||
        getLocalTodayISO()
    );

  if (parsed) {
    return startOfDay(
      parsed
    );
  }

  return startOfDay(
    new Date()
  );
}

function addLocalDays(
  date: Date,
  days: number
): Date {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      days
  );

  return result;
}

function getDoseEventDate(
  dose: DoseLogLike
): Date | null {
  if (dose.tomado_em) {
    const parsed =
      parseLocalDate(
        dose.tomado_em
      );

    if (parsed) {
      return parsed;
    }
  }

  if (dose.timestamp) {
    const parsed =
      parseLocalDate(
        dose.timestamp
      );

    if (parsed) {
      return parsed;
    }
  }

  return parseLocalDateTime(
    dose.data,
    dose.horario
  );
}

function getDoseResolvedDate(
  dose: DoseLogLike
): Date | null {
  if (dose.tomado_em) {
    const parsed =
      parseLocalDate(
        dose.tomado_em
      );

    if (parsed) {
      return parsed;
    }
  }

  if (dose.ignorado_em) {
    const parsed =
      parseLocalDate(
        dose.ignorado_em
      );

    if (parsed) {
      return parsed;
    }
  }

  return getDoseEventDate(
    dose
  );
}

function getRegistroEventDate(
  registro: RegistroTemporalLike
): Date | null {
  if (
    registro.timestamp
  ) {
    const parsed =
      parseLocalDate(
        registro.timestamp
      );

    if (parsed) {
      return parsed;
    }
  }

  return parseLocalDateTime(
    registro.data,
    registro.horario
  );
}

function formatLocalDateKey(
  date: Date
): string {
  return [
    date.getFullYear(),

    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

function diffLocalDays(
  from: Date,
  to: Date
): number {
  const fromDay =
    startOfDay(
      from
    );

  const toDay =
    startOfDay(
      to
    );

  return Math.round(
    (
      toDay.getTime() -
      fromDay.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function isInsideWindow(
  date: Date | null,
  start: Date,
  end: Date
): boolean {
  return Boolean(
    date &&
      date >= start &&
      date < end
  );
}

// ============================================================
// VALIDADE CANÔNICA DE RECEITA
// ============================================================

export function calcularDataValidadeReceita(
  dataReceita?: string | null,
  diasValidade:
    number =
      RECEITA_VALIDADE_PADRAO_DIAS
): string | null {
  if (
    !dataReceita ||
    !Number.isInteger(
      diasValidade
    ) ||
    diasValidade <=
      0
  ) {
    return null;
  }

  const data =
    parseLocalDate(
      dataReceita
    );

  if (!data) {
    return null;
  }

  const validade =
    addLocalDays(
      startOfDay(
        data
      ),
      diasValidade
    );

  return formatLocalDateKey(
    validade
  );
}

export function analisarValidadeReceita(
  dataReceita?: string | null,
  diasValidade:
    number =
      RECEITA_VALIDADE_PADRAO_DIAS
): ValidadeReceitaInsight {
  const dataValidade =
    calcularDataValidadeReceita(
      dataReceita,
      diasValidade
    );

  if (
    !dataReceita ||
    !dataValidade
  ) {
    return {
      dataReceita:
        dataReceita ||
        null,

      dataValidade:
        null,

      diasValidade,

      diasRestantes:
        null,

      status:
        "sem_data",

      vencida:
        false,

      mensagem:
        "Não há uma data válida de receita para calcular a validade.",
    };
  }

  const diasRestantes =
    getDaysUntil(
      dataValidade
    );

  if (
    diasRestantes ===
    null
  ) {
    return {
      dataReceita,

      dataValidade,

      diasValidade,

      diasRestantes:
        null,

      status:
        "sem_data",

      vencida:
        false,

      mensagem:
        "Não foi possível calcular a validade da receita registrada.",
    };
  }

  if (
    diasRestantes <
    0
  ) {
    return {
      dataReceita,

      dataValidade,

      diasValidade,

      diasRestantes,

      status:
        "vencida",

      vencida:
        true,

      mensagem:
        `A validade de referência desta receita passou há ${Math.abs(
          diasRestantes
        )} dia(s).`,
    };
  }

  if (
    diasRestantes ===
    0
  ) {
    return {
      dataReceita,

      dataValidade,

      diasValidade,

      diasRestantes,

      status:
        "vence_hoje",

      vencida:
        false,

      mensagem:
        "A validade de referência desta receita termina hoje.",
    };
  }

  if (
    diasRestantes <=
    7
  ) {
    return {
      dataReceita,

      dataValidade,

      diasValidade,

      diasRestantes,

      status:
        "proxima",

      vencida:
        false,

      mensagem:
        `Faltam ${diasRestantes} dia(s) para a validade de referência desta receita.`,
    };
  }

  return {
    dataReceita,

    dataValidade,

    diasValidade,

    diasRestantes,

    status:
      "valida",

    vencida:
      false,

    mensagem:
      `A receita possui ${diasRestantes} dia(s) restantes na validade de referência registrada pelo Vault.`,
  };
}

// ============================================================
// HELPERS DE DOSE
// ============================================================

function isDoseTaken(
  dose: DoseLogLike
): boolean {
  if (
    dose.tomado_em
  ) {
    return true;
  }

  return (
    dose.status ===
      "tomado" ||
    dose.status ===
      "taken"
  );
}

function isDoseIgnored(
  dose: DoseLogLike
): boolean {
  if (
    dose.ignorado_em
  ) {
    return true;
  }

  return (
    dose.status ===
      "ignorado" ||
    dose.status ===
      "perdido" ||
    dose.status ===
      "ignored"
  );
}

function isDoseResolved(
  dose: DoseLogLike
): boolean {
  return (
    isDoseTaken(
      dose
    ) ||
    isDoseIgnored(
      dose
    )
  );
}

/**
 * Quantidade conhecida.
 *
 * Esta função NUNCA inventa quantidade.
 */
function getKnownDoseQuantity(
  dose: DoseLogLike
): number | null {
  const value =
    Number(
      dose.quantidade
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

/**
 * Compatibilidade histórica.
 *
 * Algumas APIs antigas exibem "quantidade total" e precisam
 * continuar entendendo um DoseLog antigo sem quantidade como
 * uma ocorrência.
 *
 * Este fallback para 1 é SOMENTE uma unidade estatística de
 * evento. Nunca deve ser reutilizado para movimentar estoque
 * ou fazer conversões clínicas.
 */
function getDoseQuantity(
  dose: DoseLogLike
): number {
  return (
    getKnownDoseQuantity(
      dose
    ) ?? 1
  );
}

function formatQuantity(
  value: number
): string {
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

function summarizeDoseWindow(
  doses: DoseLogLike[],
  start: Date,
  end: Date
): DoseWindowSummary {
  const tomadas =
    doses.filter(
      (dose) => {
        if (
          !isDoseTaken(
            dose
          )
        ) {
          return false;
        }

        return isInsideWindow(
          getDoseEventDate(
            dose
          ),
          start,
          end
        );
      }
    );

  const dias =
    new Set<string>();

  let quantidadeTotal =
    0;

  let quantidadeConhecida =
    0;

  let tomadasSemQuantidade =
    0;

  tomadas.forEach(
    (dose) => {
      quantidadeTotal +=
        getDoseQuantity(
          dose
        );

      const known =
        getKnownDoseQuantity(
          dose
        );

      if (
        known === null
      ) {
        tomadasSemQuantidade +=
          1;
      } else {
        quantidadeConhecida +=
          known;
      }

      const eventDate =
        getDoseEventDate(
          dose
        );

      if (eventDate) {
        dias.add(
          formatLocalDateKey(
            eventDate
          )
        );
      }
    }
  );

  return {
    tomadas:
      tomadas.length,

    quantidadeTotal,

    quantidadeConhecida,

    tomadasSemQuantidade,

    diasComUso:
      dias.size,
  };
}

function getTakenDoses(
  doses: DoseLogLike[]
): DoseLogLike[] {
  return doses.filter(
    isDoseTaken
  );
}

function getLatestTakenDose(
  doses: DoseLogLike[]
): DoseLogLike | undefined {
  return getTakenDoses(
    doses
  )
    .map(
      (dose) => ({
        dose,

        date:
          getDoseEventDate(
            dose
          ),
      })
    )
    .filter(
      (
        item
      ): item is {
        dose: DoseLogLike;
        date: Date;
      } =>
        Boolean(
          item.date
        )
    )
    .sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime()
    )[0]?.dose;
}

// ============================================================
// HELPERS DE CONTEXTO
// ============================================================

function getActiveMedicamentos(
  medicamentos: Medicamento[]
): Medicamento[] {
  return medicamentos.filter(
    (medicamento) =>
      medicamento.status !==
      "descontinuado"
  );
}

function getMedicamentoDoseLogs(
  medicamentoId: string | undefined,
  doseLogs: DoseLogLike[]
): DoseLogLike[] {
  if (!medicamentoId) {
    return [];
  }

  return doseLogs.filter(
    (dose) =>
      dose.medicamento_id ===
      medicamentoId
  );
}

function getMedicationName(
  medicamentos: Medicamento[],
  medicamentoId?: string
): string {
  if (!medicamentoId) {
    return "Medicamento";
  }

  return (
    medicamentos.find(
      (medicamento) =>
        medicamento.id ===
        medicamentoId
    )?.nome ||
    "Medicamento"
  );
}

// ============================================================
// 1. VALIDAR VÍNCULO MÉDICO ↔ LOCAL
// ============================================================

export function validarVinculoMedicoLocal(
  medico:
    | {
        estabelecimentos?: string[];
      }
    | null
    | undefined,
  localId: string
): boolean {
  if (
    !medico ||
    !localId
  ) {
    return true;
  }

  if (
    medico.estabelecimentos &&
    Array.isArray(
      medico.estabelecimentos
    )
  ) {
    return medico.estabelecimentos.includes(
      localId
    );
  }

  return true;
}

// ============================================================
// 2. SUGERIR RENOVAÇÃO
// ============================================================

export interface RenovacaoInsight {
  deveRenovar: boolean;

  mensagem: string;

  urgencia:
    | "alta"
    | "media"
    | "nenhuma";

  motivo:
    RenovacaoInsightMotivo;

  diasAteRenovacao:
    | number
    | null;

  diasRestantesEstoque:
    | number
    | null;
}

export function sugerirRenovacao(
  medicamento: Medicamento
): RenovacaoInsight {
  if (
    medicamento.status ===
    "descontinuado"
  ) {
    return {
      deveRenovar: false,

      mensagem: "",

      urgencia:
        "nenhuma",

      motivo:
        "nenhum",

      diasAteRenovacao:
        null,

      diasRestantesEstoque:
        null,
    };
  }

  const diasAteRenovacao =
    getDaysUntil(
      medicamento.proxima_renovacao
    );

  const isContinuo =
    medicamento.tipo_uso ===
    "continuo";

  const estoque =
    computeEstoqueInfo(
      medicamento
    );

  const temControleEstoque =
    typeof medicamento.estoque_quantidade ===
      "number" &&
    Number.isFinite(
      medicamento.estoque_quantidade
    );

  const diasRestantes =
    isContinuo &&
    estoque &&
    estoque.diasRestantes !==
      null
      ? estoque.diasRestantes
      : null;

  if (
    diasAteRenovacao !==
      null &&
    diasAteRenovacao <
      0
  ) {
    return {
      deveRenovar: true,

      mensagem:
        `A data de renovação de "${medicamento.nome}" passou há ${Math.abs(
          diasAteRenovacao
        )} dia(s).`,

      urgencia:
        "alta",

      motivo:
        "receita",

      diasAteRenovacao,

      diasRestantesEstoque:
        diasRestantes,
    };
  }

  if (
    medicamento.tipo_aquisicao ===
      "sus" &&
    medicamento.data_retorno_sus
  ) {
    const diasRetornoSus =
      getDaysUntil(
        medicamento.data_retorno_sus
      );

    if (
      diasRetornoSus !==
        null &&
      diasRetornoSus < 0
    ) {
      return {
        deveRenovar:
          true,

        mensagem:
          `A data registrada para retirada de "${medicamento.nome}" passou há ${Math.abs(
            diasRetornoSus
          )} dia(s).`,

        urgencia:
          "alta",

        motivo:
          "sus",

        diasAteRenovacao,

        diasRestantesEstoque:
          diasRestantes,
      };
    }

    if (
      diasRetornoSus !==
        null &&
      diasRetornoSus <= 7
    ) {
      return {
        deveRenovar:
          true,

        mensagem:
          diasRetornoSus ===
          0
            ? `A retirada de "${medicamento.nome}" está registrada para hoje.`
            : `A retirada de "${medicamento.nome}" está registrada para daqui a ${diasRetornoSus} dia(s).`,

        urgencia:
          diasRetornoSus <=
          2
            ? "alta"
            : "media",

        motivo:
          "sus",

        diasAteRenovacao,

        diasRestantesEstoque:
          diasRestantes,
      };
    }
  }

  if (!isContinuo) {
    if (
      temControleEstoque &&
      medicamento
        .estoque_quantidade! <=
        0
    ) {
      return {
        deveRenovar:
          true,

        mensagem:
          `O estoque registrado de "${medicamento.nome}" está zerado.`,

        urgencia:
          "alta",

        motivo:
          "estoque",

        diasAteRenovacao,

        diasRestantesEstoque:
          null,
      };
    }

    if (
      diasAteRenovacao !==
        null &&
      diasAteRenovacao <= 10
    ) {
      return {
        deveRenovar:
          true,

        mensagem:
          diasAteRenovacao ===
          0
            ? `A renovação de "${medicamento.nome}" está registrada para hoje.`
            : `A renovação de "${medicamento.nome}" está prevista para daqui a ${diasAteRenovacao} dia(s).`,

        urgencia:
          diasAteRenovacao <=
          3
            ? "alta"
            : "media",

        motivo:
          "receita",

        diasAteRenovacao,

        diasRestantesEstoque:
          null,
      };
    }

    return {
      deveRenovar:
        false,

      mensagem: "",

      urgencia:
        "nenhuma",

      motivo:
        "nenhum",

      diasAteRenovacao,

      diasRestantesEstoque:
        null,
    };
  }

  if (
    temControleEstoque &&
    medicamento
      .estoque_quantidade! <=
      0
  ) {
    return {
      deveRenovar: true,

      mensagem:
        `O estoque registrado de "${medicamento.nome}" está zerado.`,

      urgencia:
        "alta",

      motivo:
        "estoque",

      diasAteRenovacao,

      diasRestantesEstoque:
        diasRestantes,
    };
  }

  if (
    diasRestantes !==
      null &&
    diasRestantes <= 10
  ) {
    return {
      deveRenovar: true,

      mensagem:
        diasRestantes <= 0
          ? `O estoque registrado de "${medicamento.nome}" está zerado.`
          : `O estoque registrado de "${medicamento.nome}" corresponde a aproximadamente ${diasRestantes} dia(s) na rotina configurada.`,

      urgencia:
        diasRestantes <=
        4
          ? "alta"
          : "media",

      motivo:
        "estoque",

      diasAteRenovacao,

      diasRestantesEstoque:
        diasRestantes,
    };
  }

  if (
    diasAteRenovacao !==
      null &&
    diasAteRenovacao <= 10
  ) {
    return {
      deveRenovar: true,

      mensagem:
        diasAteRenovacao ===
        0
          ? `A renovação de "${medicamento.nome}" está prevista para hoje.`
          : `A renovação de "${medicamento.nome}" está prevista em ${diasAteRenovacao} dia(s).`,

      urgencia:
        diasAteRenovacao <=
        3
          ? "alta"
          : "media",

      motivo:
        "receita",

      diasAteRenovacao,

      diasRestantesEstoque:
        diasRestantes,
    };
  }

  return {
    deveRenovar:
      false,

    mensagem: "",

    urgencia:
      "nenhuma",

    motivo:
      "nenhum",

    diasAteRenovacao,

    diasRestantesEstoque:
      diasRestantes,
  };
}

// ============================================================
// 3. ANALISAR MELHOR FARMÁCIA
// ============================================================

export function analisarMelhorFarmacia(
  renovacoes: Renovacao[]
) {
  const farmaciasPrecos:
    Record<
      string,
      number[]
    > = {};

  renovacoes.forEach(
    (renovacao) => {
      const preco =
        Number(
          renovacao.preco
        );

      const aquisicaoGratuita =
        renovacao.tipo_aquisicao ===
          "sus" ||
        renovacao.tipo_aquisicao ===
          "gratuito";

      if (
        renovacao.farmacia_id &&
        !aquisicaoGratuita &&
        Number.isFinite(
          preco
        ) &&
        preco > 0
      ) {
        if (
          !farmaciasPrecos[
            renovacao.farmacia_id
          ]
        ) {
          farmaciasPrecos[
            renovacao.farmacia_id
          ] = [];
        }

        farmaciasPrecos[
          renovacao.farmacia_id
        ].push(
          preco
        );
      }
    }
  );

  return Object.entries(
    farmaciasPrecos
  )
    .map(
      (
        [
          id,
          precos,
        ]
      ) => ({
        farmacia_id:
          id,

        media_preco:
          precos.reduce(
            (
              total,
              preco
            ) =>
              total +
              preco,
            0
          ) /
          precos.length,

        total_compras:
          precos.length,
      })
    )
    .sort(
      (a, b) =>
        a.media_preco -
        b.media_preco
    );
}

// ============================================================
// 4. CALCULAR ECONOMIA
// ============================================================

/**
 * Converte um valor desconhecido em número positivo utilizável
 * por análises financeiras.
 *
 * Zero, negativos, NaN, null e undefined não são considerados
 * dados suficientes para comparação.
 */
function toPositiveFiniteNumber(
  value: unknown
): number | null {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

/**
 * Data que representa a aquisição financeira.
 *
 * `data_aquisicao` é canônica para compras/retiradas novas.
 * `data` permanece como fallback para registros legados que
 * foram criados antes desse campo existir.
 */
function getRenovacaoAcquisitionTime(
  renovacao: Renovacao
): number {
  const rawDate =
    renovacao.data_aquisicao ||
    renovacao.data;

  return (
    parseLocalDate(
      rawDate
    )?.getTime() ??
    0
  );
}

interface RenovacaoComparablePrice {
  renovacao:
    Renovacao;

  precoTotal:
    number;

  quantidade:
    number;

  precoUnitario:
    number;

  timestamp:
    number;
}

/**
 * Extrai somente aquisições capazes de participar de uma
 * comparação justa de preço.
 *
 * A comparação exige:
 * - aquisição paga;
 * - preço total conhecido;
 * - quantidade adquirida conhecida.
 *
 * Sem quantidade não existe base segura para dizer que uma
 * compra ficou mais cara ou mais barata que outra.
 */
function getComparableRenovacaoPrice(
  renovacao:
    Renovacao
): RenovacaoComparablePrice | null {
  const gratuita =
    renovacao.tipo_aquisicao ===
      "sus" ||
    renovacao.tipo_aquisicao ===
      "gratuito";

  if (gratuita) {
    return null;
  }

  const precoTotal =
    toPositiveFiniteNumber(
      renovacao.preco
    );

  const quantidade =
    toPositiveFiniteNumber(
      renovacao.quantidade
    );

  if (
    precoTotal ===
      null ||
    quantidade ===
      null
  ) {
    return null;
  }

  return {
    renovacao,

    precoTotal,

    quantidade,

    precoUnitario:
      precoTotal /
      quantidade,

    timestamp:
      getRenovacaoAcquisitionTime(
        renovacao
      ),
  };
}

export function calcularEconomia(
  renovacoes: Renovacao[]
) {
  const comparaveis =
    renovacoes
      .map(
        getComparableRenovacaoPrice
      )
      .filter(
        (
          item
        ): item is RenovacaoComparablePrice =>
          item !== null
      )
      .sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      );

  if (
    comparaveis.length <
    2
  ) {
    return null;
  }

  const ultima =
    comparaveis[
      comparaveis.length -
        1
    ];

  const anteriores =
    comparaveis.slice(
      0,
      -1
    );

  if (
    anteriores.length ===
    0
  ) {
    return null;
  }

  /**
   * A inteligência trabalha com custo unitário médio anterior,
   * e só depois converte essa referência para a quantidade
   * comprada atualmente.
   *
   * Exemplo:
   * R$100 / 60 = R$1,6667 por unidade.
   * Para uma compra atual de 30 unidades, a referência justa
   * passa a ser R$50, e não R$100.
   */
  const mediaPrecoUnitarioAnterior =
    anteriores.reduce(
      (
        total,
        item
      ) =>
        total +
        item.precoUnitario,
      0
    ) /
    anteriores.length;

  if (
    !Number.isFinite(
      mediaPrecoUnitarioAnterior
    ) ||
    mediaPrecoUnitarioAnterior <=
      0
  ) {
    return null;
  }

  const precoReferenciaQuantidadeAtual =
    mediaPrecoUnitarioAnterior *
    ultima.quantidade;

  const economia =
    precoReferenciaQuantidadeAtual -
    ultima.precoTotal;

  const percentual =
    (
      economia /
      precoReferenciaQuantidadeAtual
    ) *
    100;

  return {
    /**
     * Campos históricos preservados para compatibilidade com
     * telas que já consomem calcularEconomia().
     *
     * `media_anterior` agora significa:
     * custo histórico médio equivalente à quantidade atual.
     */
    ultimo_preco:
      Number(
        ultima.precoTotal.toFixed(
          2
        )
      ),

    media_anterior:
      Number(
        precoReferenciaQuantidadeAtual.toFixed(
          2
        )
      ),

    economia:
      Number(
        economia.toFixed(
          2
        )
      ),

    percentual:
      Number(
        percentual.toFixed(
          1
        )
      ),

    /**
     * Evidências adicionais para o cérebro explicar a conta
     * sem obrigar as telas a refazerem lógica financeira.
     */
    quantidade_atual:
      ultima.quantidade,

    preco_unitario_atual:
      Number(
        ultima.precoUnitario.toFixed(
          4
        )
      ),

    preco_unitario_medio_anterior:
      Number(
        mediaPrecoUnitarioAnterior.toFixed(
          4
        )
      ),

    preco_referencia_quantidade_atual:
      Number(
        precoReferenciaQuantidadeAtual.toFixed(
          2
        )
      ),

    compras_anteriores_comparaveis:
      anteriores.length,

    data_referencia:
      ultima.renovacao
        .data_aquisicao ||
      ultima.renovacao.data,
  };
}

// ============================================================
// 5. SUGERIR HORÁRIOS
// ============================================================

export function sugerirHorarios(
  primeiroHorario: string,
  vezesAoDia: number
): string[] {
  if (
    !primeiroHorario ||
    vezesAoDia < 1 ||
    !Number.isInteger(
      vezesAoDia
    )
  ) {
    return [];
  }

  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      primeiroHorario
    );

  if (!match) {
    return [];
  }

  const horaInicial =
    Number(
      match[1]
    );

  const minutoInicial =
    Number(
      match[2]
    );

  if (
    horaInicial < 0 ||
    horaInicial > 23 ||
    minutoInicial < 0 ||
    minutoInicial > 59
  ) {
    return [];
  }

  const intervaloMinutos =
    (
      24 *
      60
    ) /
    vezesAoDia;

  const inicioMinutos =
    horaInicial *
      60 +
    minutoInicial;

  const horarios:
    string[] = [];

  for (
    let index = 0;
    index <
    vezesAoDia;
    index++
  ) {
    const minutosTotais =
      Math.round(
        inicioMinutos +
          index *
            intervaloMinutos
      ) %
      (
        24 *
        60
      );

    const hora =
      Math.floor(
        minutosTotais /
          60
      );

    const minuto =
      minutosTotais %
      60;

    horarios.push(
      `${String(
        hora
      ).padStart(
        2,
        "0"
      )}:${String(
        minuto
      ).padStart(
        2,
        "0"
      )}`
    );
  }

  return horarios;
}

// ============================================================
// 6. VALIDAÇÃO DE RECEITA
// ============================================================

/**
 * Compatibilidade com consumidores que já possuem uma data de
 * validade calculada.
 *
 * Para novos fluxos, prefira analisarValidadeReceita().
 */
export function isReceitaVencidaSegura(
  dataValidade?: string
): boolean {
  if (
    !dataValidade
  ) {
    return false;
  }

  const dias =
    getDaysUntil(
      dataValidade
    );

  return (
    dias !== null &&
    dias < 0
  );
}

// ============================================================
// 7. COMPORTAMENTO DE USO
// ============================================================

export interface ComportamentoInsight {
  tipo:
    | "padrao_esporadico"
    | "alerta_adesao"
    | "risco_superdosagem"
    | "alerta_tolerancia";

  titulo: string;

  mensagem: string;

  acaoSugerida: string;

  requerAtencaoUrgente?: boolean;

  confianca?:
    InsightConfianca;

  amostra?: number;

  metricas?: {
    tomadasUltimaHora:
      number;

    quantidadeUltimaHora:
      number;

    tomadasUltimas24h:
      number;

    quantidadeUltimas24h:
      number;

    tomadasUltimos7Dias:
      number;

    quantidadeUltimos7Dias:
      number;

    diasComUsoUltimos7Dias:
      number;

    tomadas7DiasAnteriores:
      number;

    quantidade7DiasAnteriores:
      number;
  };
}

export function analisarComportamentoUso(
  medicamento: Medicamento,
  historicoDoses: DoseLogLike[]
): ComportamentoInsight | null {
  if (
    !historicoDoses ||
    historicoDoses.length ===
      0
  ) {
    return null;
  }

  const agora =
    new Date();

  const umaHoraAtras =
    new Date(
      agora.getTime() -
        60 *
          60 *
          1000
    );

  const vinteQuatroHorasAtras =
    new Date(
      agora.getTime() -
        24 *
          60 *
          60 *
          1000
    );

  const seteDiasAtras =
    new Date(
      agora.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000
    );

  const quatorzeDiasAtras =
    new Date(
      agora.getTime() -
        14 *
          24 *
          60 *
          60 *
          1000
    );

  const ultimaHora =
    summarizeDoseWindow(
      historicoDoses,
      umaHoraAtras,
      agora
    );

  const ultimas24h =
    summarizeDoseWindow(
      historicoDoses,
      vinteQuatroHorasAtras,
      agora
    );

  const ultimos7Dias =
    summarizeDoseWindow(
      historicoDoses,
      seteDiasAtras,
      agora
    );

  const seteDiasAnteriores =
    summarizeDoseWindow(
      historicoDoses,
      quatorzeDiasAtras,
      seteDiasAtras
    );

  const sample =
    ultimos7Dias.tomadas +
    seteDiasAnteriores.tomadas;

  const confianca =
    determineConfidence(
      sample,
      {
        media: 5,
        alta: 12,
      }
    );

  const metricas = {
    tomadasUltimaHora:
      ultimaHora.tomadas,

    quantidadeUltimaHora:
      ultimaHora.quantidadeTotal,

    tomadasUltimas24h:
      ultimas24h.tomadas,

    quantidadeUltimas24h:
      ultimas24h.quantidadeTotal,

    tomadasUltimos7Dias:
      ultimos7Dias.tomadas,

    quantidadeUltimos7Dias:
      ultimos7Dias.quantidadeTotal,

    diasComUsoUltimos7Dias:
      ultimos7Dias.diasComUso,

    tomadas7DiasAnteriores:
      seteDiasAnteriores.tomadas,

    quantidade7DiasAnteriores:
      seteDiasAnteriores.quantidadeTotal,
  };

  const isEsporadico =
    medicamento.tipo_uso ===
      "esporadico" ||
    medicamento.tipo_uso ===
      "sos";

  if (
    ultimaHora.tomadas >=
    2
  ) {
    return {
      tipo:
        "risco_superdosagem",

      titulo:
        "Tomadas registradas em intervalo curto",

      mensagem:
        `Foram registradas ${ultimaHora.tomadas} tomadas de "${medicamento.nome}" na última hora. Confira se esses registros correspondem ao uso realizado e à orientação recebida.`,

      acaoSugerida:
        "Confira o histórico e a orientação da prescrição. Se houver dúvida sobre uma tomada não planejada ou surgirem sintomas importantes, procure orientação profissional.",

      confianca:
        "alta",

      amostra:
        ultimaHora.tomadas,

      metricas,
    };
  }

  if (isEsporadico) {
    const temPeriodoAnterior =
      seteDiasAnteriores.tomadas >
        0;

    const aumentouTomadas =
      temPeriodoAnterior &&
      ultimos7Dias.tomadas >=
        Math.max(
          4,
          seteDiasAnteriores.tomadas *
            1.5
        );

    if (
      aumentouTomadas
    ) {
      return {
        tipo:
          "alerta_tolerancia",

        titulo:
          "Uso SOS aumentou recentemente",

        mensagem:
          `Nos últimos 7 dias, "${medicamento.nome}" teve ${ultimos7Dias.tomadas} tomada(s). Nos 7 dias anteriores foram ${seteDiasAnteriores.tomadas}. O padrão registrado aumentou.`,

        acaoSugerida:
          "Leve esse histórico ao profissional responsável para contextualizar a mudança no padrão de uso.",

        confianca,

        amostra:
          sample,

        metricas,
      };
    }

    if (
      ultimos7Dias.tomadas >=
      4
    ) {
      return {
        tipo:
          "padrao_esporadico",

        titulo:
          "Uso SOS recorrente na última semana",

        mensagem:
          `Foram registradas ${ultimos7Dias.tomadas} tomada(s) de "${medicamento.nome}" em ${ultimos7Dias.diasComUso} dia(s) nos últimos 7 dias.`,

        acaoSugerida:
          "Esse histórico pode ser útil no próximo acompanhamento, especialmente se a frequência estiver diferente do padrão habitual.",

        confianca,

        amostra:
          ultimos7Dias.tomadas,

        metricas,
      };
    }
  }

  const dosesIgnoradasRecentes =
    historicoDoses.filter(
      (dose) => {
        if (
          !isDoseIgnored(
            dose
          )
        ) {
          return false;
        }

        const date =
          dose.ignorado_em
            ? parseLocalDate(
                dose.ignorado_em
              )
            : getDoseEventDate(
                dose
              );

        return Boolean(
          date &&
            date >=
              seteDiasAtras &&
            date <=
              agora
        );
      }
    );

  if (
    !isEsporadico &&
    dosesIgnoradasRecentes.length >=
      3
  ) {
    return {
      tipo:
        "alerta_adesao",

      titulo:
        "Doses ignoradas recentemente",

      mensagem:
        `Há ${dosesIgnoradasRecentes.length} dose(s) marcadas como ignoradas de "${medicamento.nome}" nos últimos 7 dias.`,

      acaoSugerida:
        "Revise a rotina registrada e leve esse histórico ao próximo acompanhamento caso esteja difícil manter os horários.",

      confianca:
        determineConfidence(
          dosesIgnoradasRecentes.length,
          {
            media: 4,
            alta: 8,
          }
        ),

      amostra:
        dosesIgnoradasRecentes.length,

      metricas,
    };
  }

  return null;
}

// ============================================================
// 8. VIGILÂNCIA DE MÉDICO
// ============================================================

export interface MedicoInsight {
  urgencia:
    | "alta"
    | "media"
    | "baixa"
    | "nenhuma";

  mensagem: string;

  tipo:
    | "estoque"
    | "adesao"
    | "frequencia"
    | "nenhum";
}

export function analisarMedico(
  medicoContexto: {
    medicamentos:
      Medicamento[];

    consultasCount:
      number;

    ultimaConsulta:
      Consulta | null;
  }
): MedicoInsight | null {
  if (
    medicoContexto
      .medicamentos.length ===
    0
  ) {
    return null;
  }

  const ultimaConsultaDate =
    medicoContexto.ultimaConsulta
      ? parseLocalDate(
          medicoContexto
            .ultimaConsulta.data
        )
      : null;

  if (
    !ultimaConsultaDate
  ) {
    return {
      urgencia:
        "baixa",

      tipo:
        "frequencia",

      mensagem:
        "Há medicamentos ativos associados, mas nenhuma consulta anterior foi encontrada neste histórico.",
    };
  }

  const mesesDesdeUltimaConsulta =
    (
      Date.now() -
      ultimaConsultaDate.getTime()
    ) /
    (
      1000 *
      60 *
      60 *
      24 *
      30.4375
    );

  if (
    mesesDesdeUltimaConsulta >
    6
  ) {
    return {
      urgencia:
        "media",

      tipo:
        "frequencia",

      mensagem:
        `Última consulta registrada há aproximadamente ${Math.floor(
          mesesDesdeUltimaConsulta
        )} meses, com medicamentos ativos associados.`,
    };
  }

  return null;
}

// ============================================================
// 9. VIGILÂNCIA DE FARMÁCIA
// ============================================================

export interface FarmaciaInsight {
  status:
    | "destaque_preco"
    | "alerta_gasto"
    | "neutro";

  mensagem: string;
}

export function analisarFarmaciaDetalhada(
  farmaciaContexto: {
    totalGasto:
      number;

    comprasCount:
      number;

    isMaisEconomica:
      boolean;
  }
): FarmaciaInsight | null {
  if (
    farmaciaContexto
      .isMaisEconomica &&
    farmaciaContexto
      .comprasCount >
      0
  ) {
    return {
      status:
        "destaque_preco",

      mensagem:
        "Esta farmácia apresenta a menor média de preço no histórico pago disponível.",
    };
  }

  if (
    farmaciaContexto.totalGasto >
    300
  ) {
    return {
      status:
        "alerta_gasto",

      mensagem:
        `Gasto histórico acumulado registrado: R$ ${farmaciaContexto.totalGasto.toFixed(
          2
        )}.`,
    };
  }

  return null;
}

// ============================================================
// 10. VISÃO GERAL — MOTOR CANÔNICO DE ALERTAS
// ============================================================

export interface AlertaVisaoGeral {
  id: string;

  tipo:
    | "estoque"
    | "receita"
    | "sus"
    | "consulta"
    | "exame"
    | "cirurgia";

  titulo: string;

  mensagem: string;

  urgencia:
    | "alta"
    | "media"
    | "baixa"
    | "nenhuma";

  link: string;

  entidadeId?: string;

  data?: string;

  dias?:
    | number
    | null;
}

export function gerarAlertasVisaoGeral(
  contexto: {
    medicamentos:
      Medicamento[];

    consultas:
      Consulta[];

    exames:
      Exame[];

    cirurgias:
      Cirurgia[];
  }
): AlertaVisaoGeral[] {
  const alerts:
    AlertaVisaoGeral[] = [];

  const hoje =
    startOfToday();

  const seteDias =
    addLocalDays(
      hoje,
      7
    );

  const trintaDias =
    addLocalDays(
      hoje,
      30
    );

  contexto.medicamentos.forEach(
    (medicamento) => {
      if (
        medicamento.status ===
        "descontinuado"
      ) {
        return;
      }

      const insight =
        sugerirRenovacao(
          medicamento
        );

      if (
        !insight.deveRenovar ||
        insight.motivo ===
          "nenhum"
      ) {
        return;
      }

      const tipo:
        AlertaVisaoGeral["tipo"] =
        insight.motivo ===
        "receita"
          ? "receita"
          : insight.motivo ===
              "sus"
            ? "sus"
            : "estoque";

      const titulo =
        tipo ===
        "receita"
          ? `Renovação de ${medicamento.nome}`
          : tipo ===
              "sus"
            ? `Retirada de ${medicamento.nome}`
            : `Estoque de ${medicamento.nome}`;

      alerts.push({
        id:
          `${tipo}-medicamento-${medicamento.id}`,

        tipo,

        titulo,

        mensagem:
          insight.mensagem,

        urgencia:
          insight.urgencia,

        link:
          `/saude/medicamentos/detalhes?id=${medicamento.id}`,

        entidadeId:
          medicamento.id,

        data:
          tipo ===
          "sus"
            ? medicamento.data_retorno_sus
            : tipo ===
                "receita"
              ? medicamento.proxima_renovacao
              : undefined,

        dias:
          tipo ===
          "receita"
            ? insight.diasAteRenovacao
            : tipo ===
                "estoque"
              ? insight.diasRestantesEstoque
              : medicamento.data_retorno_sus
                ? getDaysUntil(
                    medicamento.data_retorno_sus
                  )
                : null,
      });
    }
  );

  contexto.consultas.forEach(
    (consulta) => {
      if (
        consulta.status !==
        "agendada"
      ) {
        return;
      }

      const dataConsulta =
        parseLocalDate(
          consulta.data
        );

      if (
        !dataConsulta ||
        dataConsulta <
          hoje ||
        dataConsulta >
          seteDias
      ) {
        return;
      }

      const dias =
        diffLocalDays(
          hoje,
          dataConsulta
        );

      const nomeMedico =
        consulta.medico ||
        "profissional";

      alerts.push({
        id:
          `consulta-${consulta.id}`,

        tipo:
          "consulta",

        titulo:
          dias === 0
            ? "Consulta hoje"
            : "Consulta próxima",

        mensagem:
          dias === 0
            ? `Consulta com ${nomeMedico} hoje.`
            : `Consulta com ${nomeMedico} em ${dias} dia${dias === 1 ? "" : "s"}.`,

        urgencia:
          dias <= 2
            ? "alta"
            : "media",

        link:
          `/saude/consultas/detalhes?id=${consulta.id}`,

        entidadeId:
          consulta.id,

        data:
          consulta.data,

        dias,
      });
    }
  );

  contexto.exames.forEach(
    (exame) => {
      if (
        !exame.data_retorno
      ) {
        return;
      }

      const dias =
        getDaysUntil(
          exame.data_retorno
        );

      if (
        dias === null
      ) {
        return;
      }

      if (
        dias < 0
      ) {
        if (
          dias < -7
        ) {
          return;
        }

        alerts.push({
          id:
            `exame-retorno-${exame.id}`,

          tipo:
            "exame",

          titulo:
            "Retorno de exame pendente",

          mensagem:
            `A data registrada para retorno do exame "${exame.nome}" passou há ${Math.abs(
              dias
            )} dia(s).`,

          urgencia:
            "alta",

          link:
            `/saude/exames/detalhes?id=${exame.id}`,

          entidadeId:
            exame.id,

          data:
            exame.data_retorno,

          dias,
        });

        return;
      }

      if (
        dias <= 7
      ) {
        alerts.push({
          id:
            `exame-retorno-${exame.id}`,

          tipo:
            "exame",

          titulo:
            dias === 0
              ? "Retorno de exame hoje"
              : "Retorno de exame próximo",

          mensagem:
            dias === 0
              ? `Retorno do exame "${exame.nome}" registrado para hoje.`
              : `Retorno do exame "${exame.nome}" em ${dias} dia(s).`,

          urgencia:
            dias <= 2
              ? "alta"
              : "media",

          link:
            `/saude/exames/detalhes?id=${exame.id}`,

          entidadeId:
            exame.id,

          data:
            exame.data_retorno,

          dias,
        });
      }
    }
  );

  contexto.cirurgias.forEach(
    (cirurgia) => {
      if (
        cirurgia.status !==
        "agendada"
      ) {
        return;
      }

      const dataCirurgia =
        parseLocalDate(
          cirurgia.data
        );

      if (
        !dataCirurgia ||
        dataCirurgia <
          hoje ||
        dataCirurgia >
          trintaDias
      ) {
        return;
      }

      const dias =
        diffLocalDays(
          hoje,
          dataCirurgia
        );

      alerts.push({
        id:
          `cirurgia-${cirurgia.id}`,

        tipo:
          "cirurgia",

        titulo:
          dias === 0
            ? "Cirurgia hoje"
            : "Cirurgia programada",

        mensagem:
          dias === 0
            ? `Cirurgia "${cirurgia.procedimento}" programada para hoje.`
            : `Cirurgia "${cirurgia.procedimento}" em ${dias} dia${dias === 1 ? "" : "s"}.`,

        urgencia:
          dias <= 7
            ? "alta"
            : "media",

        link:
          `/saude/cirurgias/detalhes?id=${cirurgia.id}`,

        entidadeId:
          cirurgia.id,

        data:
          cirurgia.data,

        dias,
      });
    }
  );

  const ordem:
    Record<
      InsightUrgencia,
      number
    > = {
      alta: 0,
      media: 1,
      baixa: 2,
      nenhuma: 3,
    };

  const unique =
    new Map<
      string,
      AlertaVisaoGeral
    >();

  for (
    const alert of
    alerts
  ) {
    const existing =
      unique.get(
        alert.id
      );

    if (!existing) {
      unique.set(
        alert.id,
        alert
      );

      continue;
    }

    if (
      ordem[
        alert.urgencia
      ] <
      ordem[
        existing.urgencia
      ]
    ) {
      unique.set(
        alert.id,
        alert
      );
    }
  }

  return Array.from(
    unique.values()
  ).sort(
    (a, b) => {
      const prioridade =
        ordem[
          a.urgencia
        ] -
        ordem[
          b.urgencia
        ];

      if (
        prioridade !==
        0
      ) {
        return prioridade;
      }

      const diasA =
        a.dias ??
        99999;

      const diasB =
        b.dias ??
        99999;

      return (
        diasA -
        diasB
      );
    }
  );
}

// ============================================================
// 11. ASSISTENTE DIÁRIO
// ============================================================

export interface RotinaInsight {
  titulo: string;

  mensagem: string;

  icone:
    | "alerta"
    | "info"
    | "medico"
    | "cirurgia";

  urgencia:
    | "alta"
    | "media"
    | "baixa";
}

export function analisarRotinaDiaria(
  dosesHoje: Array<{
    tomada?: boolean;
    ignorada?: boolean;
    horario: string;
  }>,

  compromissosHoje: Array<{
    tipo: string;
    procedimento?: string;
    nome?: string;
    medico?: string;
  }>
): RotinaInsight | null {
  const cirurgiaHoje =
    compromissosHoje.find(
      (compromisso) =>
        compromisso.tipo ===
        "cirurgia"
    );

  if (
    cirurgiaHoje &&
    dosesHoje.some(
      (dose) =>
        !dose.tomada &&
        !dose.ignorada
    )
  ) {
    return {
      titulo:
        "Cirurgia programada hoje",

      mensagem:
        `Há uma cirurgia registrada hoje${cirurgiaHoje.procedimento ? ` (${cirurgiaHoje.procedimento})` : ""} e existem doses ainda não resolvidas. Confira as orientações específicas fornecidas pela equipe responsável sobre medicamentos e preparo.`,

      icone:
        "cirurgia",

      urgencia:
        "alta",
    };
  }

  const exameHoje =
    compromissosHoje.find(
      (compromisso) =>
        compromisso.tipo ===
        "exame"
    );

  if (exameHoje) {
    return {
      titulo:
        "Exame programado hoje",

      mensagem:
        `Há um exame registrado hoje${exameHoje.nome ? ` ("${exameHoje.nome}")` : ""}. Confira no pedido ou nas orientações do serviço se existe algum preparo específico.`,

      icone:
        "alerta",

      urgencia:
        "media",
    };
  }

  const consultaHoje =
    compromissosHoje.find(
      (compromisso) =>
        compromisso.tipo ===
        "consulta"
    );

  if (
    consultaHoje
  ) {
    const medico =
      consultaHoje.medico ||
      "profissional";

    return {
      titulo:
        "Dia de consulta",

      mensagem:
        `Você tem consulta com ${medico} hoje. O histórico de medicamentos, doses, sintomas e exames pode ajudar na conversa.`,

      icone:
        "medico",

      urgencia:
        "baixa",
    };
  }

  return null;
}

// ============================================================
// 12. RECEITAS ARQUIVADAS
// ============================================================

export interface StatusReceita {
  status:
    | "valida"
    | "proxima"
    | "vencida"
    | "renovada_historico";

  label: string;

  color: string;
}

export function analisarReceitaArquivada(
  dataReceita:
    string | undefined,

  medicamentoAlvo:
    Medicamento | null,

  renovacoesDoMedicamento:
    Renovacao[]
): StatusReceita | null {
  void medicamentoAlvo;

  if (
    !dataReceita
  ) {
    return null;
  }

  const dataBase =
    parseLocalDate(
      dataReceita
    );

  if (
    !dataBase
  ) {
    return null;
  }

  const temRenovacaoPosterior =
    renovacoesDoMedicamento.some(
      (renovacao) => {
        const dataRenovacao =
          parseLocalDate(
            renovacao.data
          );

        return Boolean(
          dataRenovacao &&
            dataRenovacao >
              dataBase
        );
      }
    );

  if (
    temRenovacaoPosterior
  ) {
    return {
      status:
        "renovada_historico",

      label:
        "Arquivada (renovada)",

      color:
        "#38BDF8",
    };
  }

  const validade =
    analisarValidadeReceita(
      dataReceita
    );

  if (
    validade.status ===
    "vencida"
  ) {
    return {
      status:
        "vencida",

      label:
        "Receita expirada",

      color:
        "#EF4444",
    };
  }

  if (
    validade.status ===
      "proxima" ||
    validade.status ===
      "vence_hoje"
  ) {
    return {
      status:
        "proxima",

      label:
        validade.status ===
        "vence_hoje"
          ? "Validade termina hoje"
          : "Próxima do vencimento",

      color:
        "#F59E0B",
    };
  }

  return {
    status:
      "valida",

    label:
      "Receita arquivada",

    color:
      "#10B981",
  };
}

// ============================================================
// 13. INSIGHTS DE CID
// ============================================================

export interface CidInsight {
  categoria: string;

  tratamentosSugeridos:
    string[];

  alertaClinico: string;
}

export function getCidInsights(
  codigo: string
): CidInsight {
  const codigoLimpo =
    (
      codigo ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    codigoLimpo.startsWith(
      "F90"
    )
  ) {
    return {
      categoria:
        "Neurodesenvolvimento",

      tratamentosSugeridos: [
        "Plano terapêutico registrado",
        "Acompanhamento profissional",
        "Rotina e adesão conforme orientação recebida",
      ],

      alertaClinico:
        "O Vault pode ajudar a relacionar consultas, tratamentos, medicamentos e registros associados a este diagnóstico.",
    };
  }

  if (
    codigoLimpo.startsWith(
      "F32"
    ) ||
    codigoLimpo.startsWith(
      "F33"
    )
  ) {
    return {
      categoria:
        "Saúde mental / humor",

      tratamentosSugeridos: [
        "Plano terapêutico registrado",
        "Acompanhamento profissional regular",
        "Histórico de sintomas e adesão",
      ],

      alertaClinico:
        "Mudanças importantes nos registros de sintomas ou adesão podem ser úteis no acompanhamento profissional.",
    };
  }

  if (
    codigoLimpo.startsWith(
      "G43"
    ) ||
    codigoLimpo.startsWith(
      "M54"
    )
  ) {
    return {
      categoria:
        "Dor / condição neurológica ou musculoesquelética",

      tratamentosSugeridos: [
        "Plano terapêutico registrado",
        "Acompanhamento profissional",
        "Registro de sintomas e medicamentos SOS",
      ],

      alertaClinico:
        "O histórico de sintomas e de uso de medicamentos SOS pode ajudar a visualizar mudanças no padrão registrado.",
    };
  }

  return {
    categoria:
      "Condição clínica",

    tratamentosSugeridos: [
      "Plano terapêutico registrado",
      "Acompanhamento profissional",
      "Documentos, exames e receitas relacionados",
    ],

    alertaClinico:
      "Mantenha os registros associados organizados para facilitar o acompanhamento histórico.",
  };
}

// ============================================================
// 14. ANÁLISE DE ADESÃO
// ============================================================

export interface AdesaoMedicamentoInsight {
  adesao: number;

  status:
    | "boa"
    | "media"
    | "baixa";

  mensagem: string;

  confianca?:
    InsightConfianca;

  amostra?: number;
}

export function analisarAdesaoMedicamento(
  medicamento: Medicamento,

  doseLogs: Array<{
    data: string;
    horario: string;
    quantidade?: number;
    tomado_em?: string;
    ignorado_em?: string;
    status?: string;
  }>,

  ultimosDias:
    number = 7
): AdesaoMedicamentoInsight {
  const horarios =
    uniqueStrings(
      medicamento
        .estoque_horarios ||
        []
    );

  if (
    medicamento.tipo_uso !==
    "continuo"
  ) {
    return {
      adesao: 100,

      status:
        "boa",

      mensagem:
        "Medicamento sem rotina contínua de doses; adesão por horário não se aplica.",

      confianca:
        "baixa",

      amostra: 0,
    };
  }

  if (
    horarios.length ===
    0
  ) {
    return {
      adesao: 100,

      status:
        "boa",

      mensagem:
        "Sem horários configurados para calcular adesão.",

      confianca:
        "baixa",

      amostra: 0,
    };
  }

  const dias =
    Math.max(
      1,
      Math.floor(
        ultimosDias
      )
    );

  const hoje =
    startOfToday();

  const agora =
    new Date();

  const dataLimite =
    addLocalDays(
      hoje,
      -(
        dias -
        1
      )
    );

  const slotsEsperados =
    new Set<string>();

  for (
    let offset = 0;
    offset <
    dias;
    offset++
  ) {
    const dia =
      addLocalDays(
        dataLimite,
        offset
      );

    const dataKey =
      formatLocalDateKey(
        dia
      );

    for (
      const horario of
      horarios
    ) {
      const slotDate =
        parseLocalDateTime(
          dataKey,
          horario
        );

      if (
        !slotDate ||
        slotDate >
          agora
      ) {
        continue;
      }

      slotsEsperados.add(
        `${dataKey}|${horario}`
      );
    }
  }

  const slotsTomados =
    new Set<string>();

  doseLogs.forEach(
    (dose) => {
      if (
        !isDoseTaken(
          dose
        )
      ) {
        return;
      }

      if (
        !dose.data ||
        !dose.horario
      ) {
        return;
      }

      if (
        !horarios.includes(
          dose.horario
        )
      ) {
        return;
      }

      const key =
        `${dose.data}|${dose.horario}`;

      if (
        slotsEsperados.has(
          key
        )
      ) {
        slotsTomados.add(
          key
        );
      }
    }
  );

  const dosesEsperadas =
    slotsEsperados.size;

  if (
    dosesEsperadas ===
    0
  ) {
    return {
      adesao: 100,

      status:
        "boa",

      mensagem:
        "Ainda não há doses programadas vencidas no período analisado.",

      confianca:
        "baixa",

      amostra: 0,
    };
  }

  const dosesTomadas =
    slotsTomados.size;

  const adesao =
    Math.min(
      100,
      Math.round(
        (
          dosesTomadas /
          dosesEsperadas
        ) *
          100
      )
    );

  const mensagem =
    `Foram registradas ${dosesTomadas} de ${dosesEsperadas} doses programadas já previstas até o momento no período analisado.`;

  const confianca =
    determineConfidence(
      dosesEsperadas,
      {
        media: 7,
        alta: 21,
      }
    );

  if (
    adesao >=
    80
  ) {
    return {
      adesao,

      status:
        "boa",

      mensagem,

      confianca,

      amostra:
        dosesEsperadas,
    };
  }

  if (
    adesao >=
    50
  ) {
    return {
      adesao,

      status:
        "media",

      mensagem,

      confianca,

      amostra:
        dosesEsperadas,
    };
  }

  return {
    adesao,

    status:
      "baixa",

    mensagem,

    confianca,

    amostra:
      dosesEsperadas,
  };
}

// ============================================================
// 15. REGISTROS DE SAÚDE
// ============================================================

export interface RegistroSaudeInsight {
  status:
    | "normal"
    | "atencao"
    | "alerta"
    | "critico";

  titulo: string;

  mensagem: string;

  recomendacao: string;
}

export interface RegistroSaudeSerieInsight {
  totalOcorrencias: number;

  ocorrenciasAnteriores: number;

  idsAnteriores: string[];

  primeiraData?: string;

  ultimaData?: string;

  intensidadesRegistradas: number;

  mediaAnterior: number | null;

  variacaoIntensidade:
    | "acima"
    | "abaixo"
    | "estavel"
    | null;

  evidencia: InsightEvidence;
}

function registroSaudeDateTimeKey(
  registro: RegistroSaude
): string {
  return `${registro.data || ""}T${registro.horario || "00:00"}`;
}

export function analisarSerieRegistrosSaude(
  registro: RegistroSaude,
  historico: RegistroSaude[]
): RegistroSaudeSerieInsight {
  const nomeNormalizado = normalizeText(
    registro.nome || ""
  );

  const currentKey =
    registroSaudeDateTimeKey(
      registro
    );

  const anteriores = historico
    .filter((item) => {
      if (
        registro.person_id &&
        item.person_id &&
        item.person_id !== registro.person_id
      ) {
        return false;
      }

      if (
        normalizeText(item.nome || "") !==
        nomeNormalizado
      ) {
        return false;
      }

      return (
        registroSaudeDateTimeKey(item) <
        currentKey
      );
    })
    .sort((a, b) =>
      registroSaudeDateTimeKey(b).localeCompare(
        registroSaudeDateTimeKey(a)
      )
    );

  const intensidadesAnteriores = anteriores
    .map((item) => item.intensidade)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value)
    );

  const mediaAnterior =
    intensidadesAnteriores.length > 0
      ? intensidadesAnteriores.reduce(
          (total, value) => total + value,
          0
        ) / intensidadesAnteriores.length
      : null;

  let variacaoIntensidade:
    | "acima"
    | "abaixo"
    | "estavel"
    | null = null;

  if (
    typeof registro.intensidade === "number" &&
    Number.isFinite(registro.intensidade) &&
    mediaAnterior !== null
  ) {
    const diferenca =
      registro.intensidade - mediaAnterior;

    if (diferenca >= 1) {
      variacaoIntensidade = "acima";
    } else if (diferenca <= -1) {
      variacaoIntensidade = "abaixo";
    } else {
      variacaoIntensidade = "estavel";
    }
  }

  const serie = [
    registro,
    ...anteriores,
  ];

  return {
    totalOcorrencias: serie.length,

    ocorrenciasAnteriores:
      anteriores.length,

    idsAnteriores: anteriores
      .map((item) => item.id)
      .filter(
        (itemId): itemId is string =>
          Boolean(itemId)
      ),

    primeiraData:
      serie[serie.length - 1]?.data,

    ultimaData:
      registro.data,

    intensidadesRegistradas:
      intensidadesAnteriores.length +
      (typeof registro.intensidade === "number" &&
      Number.isFinite(registro.intensidade)
        ? 1
        : 0),

    mediaAnterior,

    variacaoIntensidade,

    evidencia: {
      confianca:
        anteriores.length >= 3
          ? "alta"
          : anteriores.length >= 1
            ? "media"
            : "baixa",

      amostra:
        anteriores.length,
    },
  };
}

export function analisarRegistroSaude(
  tipo: string,

  valorMedicao?: string,

  intensidade?: number,

  observacoes?: string
): RegistroSaudeInsight | null {
  void observacoes;

  if (
    !tipo
  ) {
    return null;
  }

  const normalized =
    normalizeText(
      tipo
    );

  if (
    normalized.includes(
      "pressao"
    ) ||
    normalized.includes(
      "pressão"
    )
  ) {
    if (
      !valorMedicao
    ) {
      return null;
    }

    const [
      sistolicaRaw,
      diastolicaRaw,
    ] =
      valorMedicao.split(
        "/"
      );

    const sistolica =
      Number(
        sistolicaRaw
      );

    const diastolica =
      Number(
        diastolicaRaw
      );

    if (
      !Number.isFinite(
        sistolica
      ) ||
      !Number.isFinite(
        diastolica
      )
    ) {
      return null;
    }

    if (
      sistolica >= 180 ||
      diastolica >= 120
    ) {
      return {
        status:
          "critico",

        titulo:
          "Pressão muito elevada registrada",

        mensagem:
          `Registro de ${sistolica}/${diastolica} mmHg.`,

        recomendacao:
          "Confirme a medição. Se o valor persistir ou houver sintomas importantes, procure avaliação médica urgente.",
      };
    }

    if (
      sistolica >= 140 ||
      diastolica >= 90
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Pressão elevada registrada",

        mensagem:
          `Registro de ${sistolica}/${diastolica} mmHg.`,

        recomendacao:
          "Acompanhe os registros e compartilhe valores persistentes ou incomuns com o profissional responsável.",
      };
    }

    if (
      sistolica < 90 ||
      diastolica < 60
    ) {
      return {
        status:
          "atencao",

        titulo:
          "Pressão baixa registrada",

        mensagem:
          `Registro de ${sistolica}/${diastolica} mmHg.`,

        recomendacao:
          "Observe sintomas associados. Se houver tontura intensa, desmaio, fraqueza importante ou piora, procure avaliação.",
      };
    }

    return {
      status:
        "normal",

      titulo:
        "Pressão registrada",

      mensagem:
        `${sistolica}/${diastolica} mmHg.`,

      recomendacao:
        "Continue registrando as medições para acompanhar a evolução ao longo do tempo.",
    };
  }

  if (
    normalized.includes(
      "glicemia"
    ) ||
    normalized.includes(
      "acucar"
    ) ||
    normalized.includes(
      "açúcar"
    ) ||
    normalized.includes(
      "glicose"
    )
  ) {
    if (
      !valorMedicao
    ) {
      return null;
    }

    const glicemia =
      Number(
        valorMedicao.replace(
          ",",
          "."
        )
      );

    if (
      !Number.isFinite(
        glicemia
      )
    ) {
      return null;
    }

    if (
      glicemia <
      70
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Glicemia baixa registrada",

        mensagem:
          `${glicemia} mg/dL.`,

        recomendacao:
          "Siga o plano de ação que você recebeu para episódios de glicemia baixa. Se houver sintomas importantes ou dúvida, procure orientação médica.",
      };
    }

    if (
      glicemia >
      200
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Glicemia elevada registrada",

        mensagem:
          `${glicemia} mg/dL.`,

        recomendacao:
          "Registre o contexto da medição e procure orientação se valores elevados persistirem ou houver sintomas.",
      };
    }

    return {
      status:
        "normal",

      titulo:
        "Glicemia registrada",

      mensagem:
        `${glicemia} mg/dL.`,

      recomendacao:
        "Continue registrando os valores e o contexto da medição para acompanhamento.",
    };
  }

  if (
    normalized.includes(
      "temperatura"
    ) ||
    normalized.includes(
      "febre"
    )
  ) {
    if (
      !valorMedicao
    ) {
      return null;
    }

    const temperatura =
      Number(
        valorMedicao.replace(
          ",",
          "."
        )
      );

    if (
      !Number.isFinite(
        temperatura
      )
    ) {
      return null;
    }

    if (
      temperatura >=
      39.5
    ) {
      return {
        status:
          "critico",

        titulo:
          "Temperatura alta registrada",

        mensagem:
          `${temperatura} °C.`,

        recomendacao:
          "Monitore a evolução e procure avaliação médica com prioridade se houver sintomas importantes, piora ou dificuldade para controlar a temperatura.",
      };
    }

    if (
      temperatura >=
      38
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Febre registrada",

        mensagem:
          `${temperatura} °C.`,

        recomendacao:
          "Acompanhe a evolução e siga as orientações previamente recebidas para febre.",
      };
    }

    if (
      temperatura <
      35
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Temperatura baixa registrada",

        mensagem:
          `${temperatura} °C.`,

        recomendacao:
          "Confirme a medição e procure avaliação se o valor persistir ou houver sintomas relevantes.",
      };
    }

    return {
      status:
        "normal",

      titulo:
        "Temperatura registrada",

      mensagem:
        `${temperatura} °C.`,

      recomendacao:
        "Continue registrando caso esteja acompanhando a evolução de sintomas.",
    };
  }

  if (
    normalized.includes(
      "batimento"
    ) ||
    normalized.includes(
      "pulso"
    ) ||
    normalized.includes(
      "frequencia"
    ) ||
    normalized.includes(
      "frequência"
    ) ||
    normalized.includes(
      "cardíaca"
    ) ||
    normalized.includes(
      "bpm"
    )
  ) {
    if (
      !valorMedicao
    ) {
      return null;
    }

    const bpm =
      Number(
        valorMedicao
      );

    if (
      !Number.isFinite(
        bpm
      )
    ) {
      return null;
    }

    if (
      bpm >
      120
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Frequência cardíaca elevada registrada",

        mensagem:
          `${bpm} bpm.`,

        recomendacao:
          "Considere o contexto da medição. Se estiver em repouso e o valor persistir, especialmente com sintomas, procure avaliação.",
      };
    }

    if (
      bpm <
      50
    ) {
      return {
        status:
          "atencao",

        titulo:
          "Frequência cardíaca baixa registrada",

        mensagem:
          `${bpm} bpm.`,

        recomendacao:
          "Considere seu padrão habitual e o contexto da medição. Procure avaliação se houver sintomas ou se esse valor for incomum para você.",
      };
    }

    return {
      status:
        "normal",

      titulo:
        "Frequência cardíaca registrada",

      mensagem:
        `${bpm} bpm.`,

      recomendacao:
        "Continue registrando para acompanhar o padrão ao longo do tempo.",
    };
  }

  if (
    intensidade !==
      undefined &&
    intensidade !==
      null
  ) {
    if (
      intensidade >=
      8
    ) {
      return {
        status:
          "critico",

        titulo:
          "Sintoma de intensidade alta",

        mensagem:
          `Intensidade ${intensidade}/10 registrada para "${tipo}".`,

        recomendacao:
          "Se o sintoma for intenso, inesperado, estiver piorando ou vier acompanhado de outros sinais importantes, procure avaliação médica.",
      };
    }

    if (
      intensidade >=
      5
    ) {
      return {
        status:
          "alerta",

        titulo:
          "Sintoma de intensidade moderada",

        mensagem:
          `Intensidade ${intensidade}/10 registrada para "${tipo}".`,

        recomendacao:
          "Continue registrando evolução, duração e possíveis fatores associados para facilitar o acompanhamento.",
      };
    }

    if (
      intensidade >=
      1
    ) {
      return {
        status:
          "atencao",

        titulo:
          "Sintoma registrado",

        mensagem:
          `Intensidade ${intensidade}/10 para "${tipo}".`,

        recomendacao:
          "Acompanhe se o sintoma melhora, persiste ou muda de intensidade.",
      };
    }
  }

  return {
    status:
      "normal",

    titulo:
      "Registro de saúde",

    mensagem:
      `O registro "${tipo}" foi salvo no histórico.`,

    recomendacao:
      "Registros consistentes ajudam a visualizar mudanças e padrões ao longo do tempo.",
  };
}

// ============================================================
// 16. PROCESSADOR DA LISTAGEM DE MEDICAMENTOS
// ============================================================

export interface ProcessedMed {
  med: Medicamento;

  isSOS: boolean;

  isSuspenso: boolean;

  foiTomadoHoje: boolean;

  horarioTomado?: string;

  dosesEsperadasHoje:
    number;

  dosesTomadasHoje:
    number;

  dosesIgnoradasHoje:
    number;

  dosesPendentesHoje:
    number;

  quantidadeTomadaHoje:
    number;

  insight:
    RenovacaoInsight;

  receita:
    | {
        sigla: string;

        corBorda:
          string;

        tooltip:
          string;

        textColorClass:
          string;
      }
    | null;

  textoEstoque:
    string;

  isEstoqueZerado:
    boolean;

  isEstoqueCritico:
    boolean;
}

export function processarListaMedicamentos(
  medicamentos:
    Medicamento[],

  doseLogsHoje: Array<{
    medicamento_id:
      string;

    data?: string;

    horario?: string;

    tomado_em?: string;

    ignorado_em?: string;

    quantidade?:
      number;
  }>
): ProcessedMed[] {
  const lista =
    medicamentos.map(
      (medicamento) => {
        const isSOS =
          medicamento.tipo_uso ===
            "esporadico" ||
          medicamento.tipo_uso ===
            "sos";

        const isSuspenso =
          medicamento.status ===
          "descontinuado";

        const insight =
          isSuspenso
            ? {
                deveRenovar:
                  false,

                mensagem:
                  "",

                urgencia:
                  "nenhuma" as const,

                motivo:
                  "nenhum" as const,

                diasAteRenovacao:
                  null,

                diasRestantesEstoque:
                  null,
              }
            : sugerirRenovacao(
                medicamento
              );

        const logsMedicamento =
          doseLogsHoje.filter(
            (log) =>
              log.medicamento_id ===
              medicamento.id
          );

        const tomadasHoje =
          logsMedicamento.filter(
            isDoseTaken
          );

        const ignoradasHoje =
          logsMedicamento.filter(
            isDoseIgnored
          );

        const horariosPlanejados =
          uniqueStrings(
            medicamento
              .estoque_horarios ||
              []
          );

        const horariosTomados =
          new Set(
            tomadasHoje
              .map(
                (log) =>
                  log.horario
              )
              .filter(
                (
                  horario
                ): horario is string =>
                  Boolean(
                    horario
                  )
              )
          );

        const horariosIgnorados =
          new Set(
            ignoradasHoje
              .map(
                (log) =>
                  log.horario
              )
              .filter(
                (
                  horario
                ): horario is string =>
                  Boolean(
                    horario
                  )
              )
          );

        const dosesEsperadasHoje =
          isSOS
            ? 0
            : horariosPlanejados.length;

        const dosesTomadasPlanejadas =
          horariosPlanejados.filter(
            (horario) =>
              horariosTomados.has(
                horario
              )
          ).length;

        const dosesIgnoradasPlanejadas =
          horariosPlanejados.filter(
            (horario) =>
              horariosIgnorados.has(
                horario
              )
          ).length;

        const dosesTomadasHoje =
          isSOS
            ? tomadasHoje.length
            : dosesTomadasPlanejadas;

        const dosesIgnoradasHoje =
          isSOS
            ? 0
            : dosesIgnoradasPlanejadas;

        const dosesResolvidasHoje =
          isSOS
            ? tomadasHoje.length
            : horariosPlanejados.filter(
                (horario) =>
                  horariosTomados.has(
                    horario
                  ) ||
                  horariosIgnorados.has(
                    horario
                  )
              ).length;

        const dosesPendentesHoje =
          Math.max(
            0,
            dosesEsperadasHoje -
              dosesResolvidasHoje
          );

        const foiTomadoHoje =
          isSOS
            ? tomadasHoje.length >
              0
            : dosesEsperadasHoje >
                0
              ? dosesPendentesHoje ===
                0
              : tomadasHoje.length >
                0;

        const quantidadeTomadaHoje =
          tomadasHoje.reduce(
            (
              total,
              log
            ) =>
              total +
              getDoseQuantity(
                log
              ),
            0
          );

        const ultimaTomada =
          getLatestTakenDose(
            tomadasHoje
          );

        const horarioTomado =
          ultimaTomada
            ?.tomado_em
            ? parseLocalDate(
                ultimaTomada
                  .tomado_em
              )?.toLocaleTimeString(
                "pt-BR",
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",
                }
              )
            : ultimaTomada
                ?.horario;

        const corPadrao =
          medicamento.cores &&
          medicamento
            .cores.length >
            0
            ? medicamento
                .cores[0]
            : "#60A5FA";

        const tipoReceita =
          medicamento.tipo_receita as
            | string
            | undefined;

        let receita:
          ProcessedMed["receita"];

        if (
          tipoReceita ===
          "amarela"
        ) {
          receita = {
            sigla:
              "A1/A2",

            corBorda:
              "#fbbf24",

            textColorClass:
              "text-amber-400",

            tooltip:
              "Receita amarela",
          };
        } else if (
          tipoReceita ===
          "azul"
        ) {
          receita = {
            sigla:
              "B1/B2",

            corBorda:
              "#60a5fa",

            textColorClass:
              "text-blue-400",

            tooltip:
              "Receita azul",
          };
        } else if (
          tipoReceita ===
            "branca_controle" ||
          tipoReceita ===
            "especial"
        ) {
          receita = {
            sigla:
              "C1",

            corBorda:
              "#94a3b8",

            textColorClass:
              "text-slate-400",

            tooltip:
              "Receita de controle especial",
          };
        } else if (
          tipoReceita ===
          "branca"
        ) {
          receita = {
            sigla:
              "Branca",

            corBorda:
              corPadrao,

            textColorClass:
              "text-slate-300",

            tooltip:
              "Receita branca",
          };
        } else {
          receita = {
            sigla:
              "S/R",

            corBorda:
              corPadrao,

            textColorClass:
              "text-slate-500",

            tooltip:
              "Sem categoria especial registrada",
          };
        }

        const estoqueInfo =
          computeEstoqueInfo(
            medicamento
          );

        const temEstoque =
          typeof medicamento.estoque_quantidade ===
            "number" &&
          Number.isFinite(
            medicamento.estoque_quantidade
          );

        const dosesRestantes =
          estoqueInfo
            ? estoqueInfo
                .dosesRestantes
            : temEstoque
              ? medicamento
                  .estoque_quantidade!
              : null;

        const isEstoqueZerado =
          temEstoque &&
          medicamento
            .estoque_quantidade! <=
            0;

        const isEstoqueCritico =
          temEstoque &&
          !isEstoqueZerado &&
          dosesRestantes !==
            null &&
          dosesRestantes >
            0 &&
          dosesRestantes <
            10;

        const textoEstoque =
          estoqueInfo
            ? estoqueInfo
                .textoEstoque
            : temEstoque
              ? `${medicamento.estoque_quantidade} ${medicamento.estoque_unidade_medida || "unidades"}`
              : "Sem controle de estoque";

        return {
          med:
            medicamento,

          isSOS,

          isSuspenso,

          foiTomadoHoje,

          horarioTomado,

          dosesEsperadasHoje,

          dosesTomadasHoje,

          dosesIgnoradasHoje,

          dosesPendentesHoje,

          quantidadeTomadaHoje,

          insight,

          receita,

          textoEstoque,

          isEstoqueZerado,

          isEstoqueCritico,
        };
      }
    );

  return lista.sort(
    (a, b) => {
      if (
        a.isSuspenso &&
        !b.isSuspenso
      ) {
        return 1;
      }

      if (
        !a.isSuspenso &&
        b.isSuspenso
      ) {
        return -1;
      }

      if (
        a.isSOS &&
        !b.isSOS
      ) {
        return 1;
      }

      if (
        !a.isSOS &&
        b.isSOS
      ) {
        return -1;
      }

      if (
        !a.isSOS &&
        !b.isSOS
      ) {
        if (
          a.dosesPendentesHoje >
            0 &&
          b.dosesPendentesHoje ===
            0
        ) {
          return -1;
        }

        if (
          a.dosesPendentesHoje ===
            0 &&
          b.dosesPendentesHoje >
            0
        ) {
          return 1;
        }
      }

      const urgenciaPeso:
        Record<
          | "alta"
          | "media"
          | "nenhuma",
          number
        > = {
          alta: 0,
          media: 1,
          nenhuma: 2,
        };

      const pesoA =
        urgenciaPeso[
          a.insight.urgencia
        ];

      const pesoB =
        urgenciaPeso[
          b.insight.urgencia
        ];

      if (
        pesoA !==
        pesoB
      ) {
        return (
          pesoA -
          pesoB
        );
      }

      return a.med.nome.localeCompare(
        b.med.nome,
        "pt-BR",
        {
          sensitivity:
            "base",
        }
      );
    }
  );
}

// ============================================================
// 16.1. CLUSTERS DE SINTOMAS + SOS
// ============================================================

export interface ClusterSintomaSosInsight {
  titulo: string;

  mensagem: string;

  sintomasDetectados:
    string[];

  recomendacao:
    string;

  confianca?:
    InsightConfianca;

  amostra?: number;
}

export function analisarClustersSintomasSOS(
  registrosSaude: Array<{
    data?: string;
    horario?: string;
    timestamp?: string;
    tipo: string;
    intensidade?: number;
  }>,

  dosesSos: Array<{
    data?: string;
    horario?: string;
    timestamp?: string;
    tomado_em?: string;
    quantidade?: number;
    medicamento_nome?: string;
  }>,

  janelaDias:
    number = 3
): ClusterSintomaSosInsight | null {
  if (
    !registrosSaude ||
    registrosSaude.length ===
      0
  ) {
    return null;
  }

  const diasJanela =
    Math.max(
      1,
      janelaDias
    );

  const agora =
    new Date();

  const limite =
    new Date(
      agora.getTime() -
        diasJanela *
          24 *
          60 *
          60 *
          1000
    );

  const sintomasRecentes =
    registrosSaude.filter(
      (registro) =>
        isInsideWindow(
          getRegistroEventDate(
            registro
          ),
          limite,
          new Date(
            agora.getTime() +
              1
          )
        )
    );

  const tiposUnicos =
    uniqueStrings(
      sintomasRecentes.map(
        (registro) =>
          normalizeText(
            registro.tipo
          )
      )
    );

  if (
    tiposUnicos.length <
    2
  ) {
    return null;
  }

  const dosesRecentes =
    dosesSos.filter(
      (dose) =>
        isInsideWindow(
          getDoseEventDate(
            dose
          ),
          limite,
          new Date(
            agora.getTime() +
              1
          )
        )
    );

  const sample =
    sintomasRecentes.length +
    dosesRecentes.length;

  return {
    titulo:
      "Padrão de sintomas recentes",

    mensagem:
      `Foram registrados múltiplos tipos de sintomas nos últimos ${diasJanela} dia(s): ${tiposUnicos.join(
        ", "
      )}.${dosesRecentes.length > 0 ? ` No mesmo período houve ${dosesRecentes.length} tomada(s) SOS registrada(s).` : ""}`,

    sintomasDetectados:
      tiposUnicos,

    recomendacao:
      "Os eventos ocorreram no mesmo período, mas isso não demonstra relação de causa. Esse histórico pode ajudar a contextualizar sintomas e uso SOS no acompanhamento profissional.",

    confianca:
      determineConfidence(
        sample,
        {
          media: 6,
          alta: 15,
        }
      ),

    amostra:
      sample,
  };
}

// ============================================================
// 17. RESUMO PARA CONSULTA
// ============================================================

export interface ResumoConsultaMedico {
  totalDosesSosMes:
    number;

  quantidadeTotalSosMes:
    number;

  sintomaMaisFrequente:
    string;

  taxaAdesaoGeral:
    number;

  mensagemProntaMedico:
    string;
}

export function gerarResumoParaConsulta(
  dosesSosMes: Array<{
    data?: string;
    horario?: string;
    timestamp?: string;
    tomado_em?: string;
    quantidade?: number;
  }>,

  registrosSaudeMes: Array<{
    tipo: string;
    data?: string;
    timestamp?: string;
  }>,

  taxaAdesaoMedia:
    number
): ResumoConsultaMedico {
  const tomadasSos =
    dosesSosMes.filter(
      isDoseTaken
    );

  const totalDosesSosMes =
    tomadasSos.length;

  const quantidadeTotalSosMes =
    tomadasSos.reduce(
      (
        total,
        dose
      ) =>
        total +
        getDoseQuantity(
          dose
        ),
      0
    );

  const contagemSintomas:
    Record<
      string,
      number
    > = {};

  registrosSaudeMes.forEach(
    (registro) => {
      const tipo =
        normalizeText(
          registro.tipo
        );

      if (!tipo) {
        return;
      }

      contagemSintomas[
        tipo
      ] =
        (
          contagemSintomas[
            tipo
          ] ||
          0
        ) +
        1;
    }
  );

  let sintomaMaisFrequente =
    "Nenhum registrado";

  let maxCount =
    0;

  Object.entries(
    contagemSintomas
  ).forEach(
    (
      [
        sintoma,
        count,
      ]
    ) => {
      if (
        count >
        maxCount
      ) {
        maxCount =
          count;

        sintomaMaisFrequente =
          sintoma;
      }
    }
  );

  const adesaoSegura =
    clamp(
      Math.round(
        taxaAdesaoMedia
      ),
      0,
      100
    );

  const mensagemProntaMedico =
    `Resumo dos últimos 30 dias: adesão média registrada de ${adesaoSegura}%. Sintoma mais recorrente: "${sintomaMaisFrequente}" (${maxCount} ocorrência(s)). Medicamento(s) SOS: ${totalDosesSosMes} tomada(s) registrada(s) no período.`;

  return {
    totalDosesSosMes,

    quantidadeTotalSosMes,

    sintomaMaisFrequente,

    taxaAdesaoGeral:
      adesaoSegura,

    mensagemProntaMedico,
  };
}

// ============================================================
// 18. PADRÃO POR DIA DA SEMANA
// ============================================================

export interface PadraoDiaSemanaInsight {
  diaCritico: string;

  mensagem: string;

  ocorrencias:
    number;

  totalRegistros:
    number;

  proporcao:
    number;

  confianca:
    InsightConfianca;

  amostra:
    number;
}

export function analisarPadraoDiaSemana(
  registros: Array<{
    data?: string;
    horario?: string;
    timestamp?: string;
    tipo: string;
  }>
): PadraoDiaSemanaInsight | null {
  if (
    !registros ||
    registros.length ===
      0
  ) {
    return null;
  }

  const nomesDias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const diasContagem:
    Record<
      string,
      number
    > = {};

  nomesDias.forEach(
    (dia) => {
      diasContagem[
        dia
      ] = 0;
    }
  );

  let registrosValidos =
    0;

  registros.forEach(
    (registro) => {
      const date =
        getRegistroEventDate(
          registro
        );

      if (!date) {
        return;
      }

      registrosValidos +=
        1;

      const nomeDia =
        nomesDias[
          date.getDay()
        ];

      diasContagem[
        nomeDia
      ] =
        (
          diasContagem[
            nomeDia
          ] ||
          0
        ) +
        1;
    }
  );

  if (
    registrosValidos <
    4
  ) {
    return null;
  }

  const ranking =
    Object.entries(
      diasContagem
    ).sort(
      (
        first,
        second
      ) =>
        second[1] -
        first[1]
    );

  const [
    diaCritico,
    maxOcorrencias,
  ] =
    ranking[0];

  const segundoLugar =
    ranking[1]?.[1] ??
    0;

  if (
    maxOcorrencias <
    3
  ) {
    return null;
  }

  const proporcao =
    maxOcorrencias /
    registrosValidos;

  const temConcentracao =
    proporcao >=
      0.3 &&
    maxOcorrencias >
      segundoLugar;

  if (
    !temConcentracao
  ) {
    return null;
  }

  const confianca =
    determineConfidence(
      registrosValidos,
      {
        media: 10,
        alta: 28,
      }
    );

  return {
    diaCritico,

    ocorrencias:
      maxOcorrencias,

    totalRegistros:
      registrosValidos,

    proporcao:
      Number(
        (
          proporcao *
          100
        ).toFixed(
          1
        )
      ),

    confianca,

    amostra:
      registrosValidos,

    mensagem:
      confianca ===
      "baixa"
        ? `Há um sinal inicial de maior concentração de registros em ${diaCritico} (${maxOcorrencias} de ${registrosValidos}). Ainda há poucos dados para considerar isso um padrão consistente.`
        : `Os registros mostram maior concentração em ${diaCritico}: ${maxOcorrencias} de ${registrosValidos} ocorrência(s) analisadas.`,
  };
}

// ============================================================
// 19. PADRÃO DE DÓSES IGNORADAS POR HORÁRIO
// ============================================================

export interface PadraoHorarioDoseInsight {
  horario: string;

  ignoradas:
    number;

  resolvidas:
    number;

  taxaIgnoradas:
    number;

  titulo: string;

  mensagem: string;

  confianca:
    InsightConfianca;

  amostra: number;
}

export function analisarPadraoHorarioDoses(
  medicamento: Medicamento,

  doseLogs:
    DoseLogLike[]
): PadraoHorarioDoseInsight | null {
  if (
    medicamento.tipo_uso !==
    "continuo"
  ) {
    return null;
  }

  const horarios =
    uniqueStrings(
      medicamento
        .estoque_horarios ||
        []
    );

  if (
    horarios.length ===
      0 ||
    doseLogs.length ===
      0
  ) {
    return null;
  }

  const estatisticas =
    horarios.map(
      (horario) => {
        const logs =
          doseLogs.filter(
            (dose) =>
              dose.horario ===
                horario &&
              isDoseResolved(
                dose
              )
          );

        const ignoradas =
          logs.filter(
            isDoseIgnored
          ).length;

        return {
          horario,

          ignoradas,

          resolvidas:
            logs.length,

          taxa:
            logs.length >
            0
              ? ignoradas /
                logs.length
              : 0,
        };
      }
    );

  const candidatos =
    estatisticas
      .filter(
        (item) =>
          item.resolvidas >=
            4 &&
          item.ignoradas >=
            2
      )
      .sort(
        (a, b) => {
          if (
            b.taxa !==
            a.taxa
          ) {
            return (
              b.taxa -
              a.taxa
            );
          }

          return (
            b.ignoradas -
            a.ignoradas
          );
        }
      );

  const principal =
    candidatos[0];

  if (
    !principal ||
    principal.taxa <
      0.25
  ) {
    return null;
  }

  const confianca =
    determineConfidence(
      principal.resolvidas,
      {
        media: 8,
        alta: 20,
      }
    );

  return {
    horario:
      principal.horario,

    ignoradas:
      principal.ignoradas,

    resolvidas:
      principal.resolvidas,

    taxaIgnoradas:
      Number(
        (
          principal.taxa *
          100
        ).toFixed(
          1
        )
      ),

    titulo:
      "Horário com mais doses ignoradas",

    mensagem:
      confianca ===
      "baixa"
        ? `Há um sinal inicial de mais doses ignoradas às ${principal.horario}: ${principal.ignoradas} em ${principal.resolvidas} registros resolvidos desse horário.`
        : `Às ${principal.horario}, ${principal.ignoradas} de ${principal.resolvidas} doses resolvidas foram marcadas como ignoradas.`,

    confianca,

    amostra:
      principal.resolvidas,
  };
}

// ============================================================
// 20. TENDÊNCIA DE USO SOS
// ============================================================

export interface TendenciaSosInsight {
  medicamentoId?:
    string;

  medicamentoNome:
    string;

  atual:
    number;

  anterior:
    number;

  diferenca:
    number;

  percentual:
    | number
    | null;

  titulo: string;

  mensagem: string;

  confianca:
    InsightConfianca;

  amostra: number;
}

export function analisarTendenciaSOS(
  medicamento: Medicamento,

  doseLogs:
    DoseLogLike[],

  periodoDias:
    number = 7
): TendenciaSosInsight | null {
  const isSOS =
    medicamento.tipo_uso ===
      "esporadico" ||
    medicamento.tipo_uso ===
      "sos";

  if (
    !isSOS
  ) {
    return null;
  }

  const dias =
    Math.max(
      1,
      Math.floor(
        periodoDias
      )
    );

  const fimAtual =
    new Date();

  const inicioAtual =
    new Date(
      fimAtual.getTime() -
        dias *
          24 *
          60 *
          60 *
          1000
    );

  const inicioAnterior =
    new Date(
      inicioAtual.getTime() -
        dias *
          24 *
          60 *
          60 *
          1000
    );

  const atual =
    summarizeDoseWindow(
      doseLogs,
      inicioAtual,
      fimAtual
    );

  const anterior =
    summarizeDoseWindow(
      doseLogs,
      inicioAnterior,
      inicioAtual
    );

  const comparison =
    comparePeriods(
      atual.tomadas,
      anterior.tomadas
    );

  const sample =
    atual.tomadas +
    anterior.tomadas;

  if (
    sample <
    4
  ) {
    return null;
  }

  const aumentoRelevante =
    atual.tomadas >=
      anterior.tomadas +
        2 &&
    (
      anterior.tomadas ===
        0 ||
      atual.tomadas >=
        anterior.tomadas *
          1.5
    );

  const quedaRelevante =
    anterior.tomadas >=
      atual.tomadas +
        2 &&
    atual.tomadas <=
      anterior.tomadas *
        0.6;

  if (
    !aumentoRelevante &&
    !quedaRelevante
  ) {
    return null;
  }

  const confianca =
    determineConfidence(
      sample,
      {
        media: 7,
        alta: 15,
      }
    );

  const direction =
    aumentoRelevante
      ? "aumentou"
      : "diminuiu";

  return {
    medicamentoId:
      medicamento.id,

    medicamentoNome:
      medicamento.nome,

    atual:
      atual.tomadas,

    anterior:
      anterior.tomadas,

    diferenca:
      comparison.diferenca,

    percentual:
      comparison.percentual,

    titulo:
      aumentoRelevante
        ? "Uso SOS aumentou"
        : "Uso SOS diminuiu",

    mensagem:
      `O uso registrado de "${medicamento.nome}" ${direction}: ${atual.tomadas} tomada(s) nos últimos ${dias} dias contra ${anterior.tomadas} no período anterior equivalente.`,

    confianca,

    amostra:
      sample,
  };
}

// ============================================================
// 21. CONSUMO OBSERVADO × ROTINA
// ============================================================

export interface ConsumoRotinaInsight {
  medicamentoId?:
    string;

  medicamentoNome:
    string;

  periodoDias:
    number;

  dosesPrevistas:
    number;

  dosesTomadas:
    number;

  diferenca:
    number;

  percentualRealizado:
    number;

  titulo: string;

  mensagem: string;

  confianca:
    InsightConfianca;

  amostra: number;
}

export function analisarConsumoVsRotina(
  medicamento: Medicamento,

  doseLogs:
    DoseLogLike[],

  periodoDias:
    number = 7
): ConsumoRotinaInsight | null {
  if (
    medicamento.tipo_uso !==
    "continuo"
  ) {
    return null;
  }

  const horarios =
    uniqueStrings(
      medicamento
        .estoque_horarios ||
        []
    );

  if (
    horarios.length ===
    0
  ) {
    return null;
  }

  const dias =
    Math.max(
      1,
      Math.floor(
        periodoDias
      )
    );

  const hoje =
    startOfToday();

  const agora =
    new Date();

  const inicio =
    addLocalDays(
      hoje,
      -(
        dias -
        1
      )
    );

  let dosesPrevistas =
    0;

  for (
    let offset = 0;
    offset <
    dias;
    offset++
  ) {
    const dia =
      addLocalDays(
        inicio,
        offset
      );

    const data =
      formatLocalDateKey(
        dia
      );

    for (
      const horario of
      horarios
    ) {
      const slot =
        parseLocalDateTime(
          data,
          horario
        );

      if (
        slot &&
        slot <=
          agora
      ) {
        dosesPrevistas +=
          1;
      }
    }
  }

  if (
    dosesPrevistas ===
    0
  ) {
    return null;
  }

  const tomadas =
    new Set<string>();

  doseLogs.forEach(
    (dose) => {
      if (
        !isDoseTaken(
          dose
        ) ||
        !dose.data ||
        !dose.horario ||
        !horarios.includes(
          dose.horario
        )
      ) {
        return;
      }

      const date =
        parseLocalDate(
          dose.data
        );

      if (
        !date ||
        date <
          inicio ||
        date >
          agora
      ) {
        return;
      }

      tomadas.add(
        `${dose.data}|${dose.horario}`
      );
    }
  );

  const dosesTomadas =
    Math.min(
      dosesPrevistas,
      tomadas.size
    );

  const percentualRealizado =
    Math.round(
      (
        dosesTomadas /
        dosesPrevistas
      ) *
        100
    );

  const diferenca =
    dosesTomadas -
    dosesPrevistas;

  if (
    percentualRealizado >=
      80 &&
    percentualRealizado <=
      110
  ) {
    return null;
  }

  const confianca =
    determineConfidence(
      dosesPrevistas,
      {
        media: 7,
        alta: 21,
      }
    );

  return {
    medicamentoId:
      medicamento.id,

    medicamentoNome:
      medicamento.nome,

    periodoDias:
      dias,

    dosesPrevistas,

    dosesTomadas,

    diferenca,

    percentualRealizado,

    titulo:
      percentualRealizado <
      80
        ? "Uso registrado abaixo da rotina"
        : "Uso registrado acima da rotina",

    mensagem:
      `Nos últimos ${dias} dias, foram registradas ${dosesTomadas} de ${dosesPrevistas} doses programadas de "${medicamento.nome}" já previstas até o momento (${percentualRealizado}%).`,

    confianca,

    amostra:
      dosesPrevistas,
  };
}

// ============================================================
// 22. INTERVALO DE RENOVAÇÕES / AQUISIÇÕES
// ============================================================

export interface IntervaloRenovacaoInsight {
  medicamentoId:
    string;

  totalRenovacoes:
    number;

  intervalosAnalisados:
    number;

  mediaDias:
    number;

  menorIntervalo:
    number;

  maiorIntervalo:
    number;

  confianca:
    InsightConfianca;

  mensagem: string;
}

export function analisarIntervaloRenovacoes(
  medicamentoId:
    string,

  renovacoes:
    Renovacao[]
): IntervaloRenovacaoInsight | null {
  if (
    !medicamentoId
  ) {
    return null;
  }

  const datas =
    renovacoes
      .filter(
        (renovacao) =>
          renovacao.medicamento_id ===
            medicamentoId &&
          Boolean(
            renovacao.data
          )
      )
      .map(
        (renovacao) =>
          parseLocalDate(
            renovacao.data
          )
      )
      .filter(
        (
          date
        ): date is Date =>
          Boolean(
            date
          )
      )
      .sort(
        (a, b) =>
          a.getTime() -
          b.getTime()
      );

  if (
    datas.length <
    2
  ) {
    return null;
  }

  const intervalos:
    number[] = [];

  for (
    let index = 1;
    index <
    datas.length;
    index++
  ) {
    const diff =
      diffLocalDays(
        datas[
          index - 1
        ],
        datas[index]
      );

    if (
      diff >
      0
    ) {
      intervalos.push(
        diff
      );
    }
  }

  if (
    intervalos.length ===
    0
  ) {
    return null;
  }

  const media =
    intervalos.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    intervalos.length;

  const mediaDias =
    Math.round(
      media
    );

  const confianca =
    determineConfidence(
      intervalos.length,
      {
        media: 3,
        alta: 6,
      }
    );

  return {
    medicamentoId,

    totalRenovacoes:
      datas.length,

    intervalosAnalisados:
      intervalos.length,

    mediaDias,

    menorIntervalo:
      Math.min(
        ...intervalos
      ),

    maiorIntervalo:
      Math.max(
        ...intervalos
      ),

    confianca,

    mensagem:
      confianca ===
      "baixa"
        ? `As aquisições registradas tiveram intervalo médio de aproximadamente ${mediaDias} dia(s), mas ainda há poucos registros para estabelecer um padrão.`
        : `O intervalo médio entre as aquisições registradas é de aproximadamente ${mediaDias} dia(s).`,
  };
}

// ============================================================
// 22.1. MUDANÇA NO PADRÃO DE RENOVAÇÕES
// ============================================================

export interface PadraoRenovacaoInsight {
  medicamentoId:
    string;

  intervaloAtual:
    number;

  mediaAnterior:
    number;

  diferencaDias:
    number;

  status:
    | "mais_cedo"
    | "dentro_padrao"
    | "mais_tarde";

  confianca:
    InsightConfianca;

  amostra:
    number;

  mensagem: string;
}

export function analisarPadraoRenovacao(
  medicamentoId:
    string,

  renovacoes:
    Renovacao[]
): PadraoRenovacaoInsight | null {
  if (
    !medicamentoId
  ) {
    return null;
  }

  const datas =
    renovacoes
      .filter(
        (renovacao) =>
          renovacao.medicamento_id ===
            medicamentoId &&
          Boolean(
            renovacao.data
          )
      )
      .map(
        (renovacao) =>
          parseLocalDate(
            renovacao.data
          )
      )
      .filter(
        (
          date
        ): date is Date =>
          Boolean(
            date
          )
      )
      .sort(
        (a, b) =>
          a.getTime() -
          b.getTime()
      );

  if (
    datas.length <
    3
  ) {
    return null;
  }

  const intervalos:
    number[] = [];

  for (
    let index = 1;
    index <
    datas.length;
    index++
  ) {
    const intervalo =
      diffLocalDays(
        datas[
          index - 1
        ],
        datas[index]
      );

    if (
      intervalo >
      0
    ) {
      intervalos.push(
        intervalo
      );
    }
  }

  if (
    intervalos.length <
    2
  ) {
    return null;
  }

  const intervaloAtual =
    intervalos[
      intervalos.length -
        1
    ];

  const anteriores =
    intervalos.slice(
      0,
      -1
    );

  if (
    anteriores.length ===
    0
  ) {
    return null;
  }

  const mediaAnterior =
    anteriores.reduce(
      (
        total,
        intervalo
      ) =>
        total +
        intervalo,
      0
    ) /
    anteriores.length;

  if (
    mediaAnterior <=
    0
  ) {
    return null;
  }

  const diferencaDias =
    Math.round(
      intervaloAtual -
        mediaAnterior
    );

  /**
   * Pequenas variações são naturais.
   *
   * Exigimos diferença de pelo menos 20% da média histórica
   * e no mínimo 3 dias antes de chamar a mudança de padrão.
   */
  const tolerancia =
    Math.max(
      3,
      Math.round(
        mediaAnterior *
          0.2
      )
    );

  let status:
    PadraoRenovacaoInsight["status"] =
      "dentro_padrao";

  if (
    diferencaDias >
    tolerancia
  ) {
    status =
      "mais_tarde";
  } else if (
    diferencaDias <
    -tolerancia
  ) {
    status =
      "mais_cedo";
  }

  if (
    status ===
    "dentro_padrao"
  ) {
    return null;
  }

  const confianca =
    determineConfidence(
      anteriores.length,
      {
        media: 3,
        alta: 6,
      }
    );

  return {
    medicamentoId,

    intervaloAtual,

    mediaAnterior:
      Math.round(
        mediaAnterior
      ),

    diferencaDias,

    status,

    confianca,

    amostra:
      anteriores.length,

    mensagem:
      status ===
      "mais_tarde"
        ? `A última aquisição ocorreu ${Math.abs(
            diferencaDias
          )} dia(s) mais tarde que o intervalo médio anterior registrado.`
        : `A última aquisição ocorreu ${Math.abs(
            diferencaDias
          )} dia(s) mais cedo que o intervalo médio anterior registrado.`,
  };
}

// ============================================================
// 23. LINHA DO TEMPO
// ============================================================

export type HealthTimelineEventType =
  | "dose_tomada"
  | "dose_ignorada"
  | "renovacao"
  | "registro_saude"
  | "consulta"
  | "exame"
  | "cirurgia";

export interface HealthTimelineEvent {
  id: string;

  tipo:
    HealthTimelineEventType;

  data: string;

  titulo: string;

  descricao?:
    string;

  entidadeId?:
    string;

  medicamentoId?:
    string;

  timestamp:
    number;
}

export function gerarLinhaDoTempoSaude(
  contexto:
    HealthInsightContext,

  limite:
    number = 50
): HealthTimelineEvent[] {
  const events:
    HealthTimelineEvent[] = [];

  contexto.doseLogs.forEach(
    (dose) => {
      if (
        !dose.id ||
        !isDoseResolved(
          dose
        )
      ) {
        return;
      }

      const date =
        getDoseResolvedDate(
          dose
        );

      if (!date) {
        return;
      }

      const taken =
        isDoseTaken(
          dose
        );

      events.push({
        id:
          `${taken ? "dose-tomada" : "dose-ignorada"}-${dose.id}`,

        tipo:
          taken
            ? "dose_tomada"
            : "dose_ignorada",

        data:
          formatLocalDateKey(
            date
          ),

        titulo:
          taken
            ? "Dose registrada"
            : "Dose ignorada",

        descricao:
          `${getMedicationName(
            contexto.medicamentos,
            dose.medicamento_id
          )}${dose.horario ? ` · ${dose.horario}` : ""}`,

        entidadeId:
          dose.id,

        medicamentoId:
          dose.medicamento_id,

        timestamp:
          date.getTime(),
      });
    }
  );

  contexto.renovacoes.forEach(
    (renovacao) => {
      const dataAquisicao =
        renovacao.data_aquisicao ||
        renovacao.data;

      if (
        !renovacao.id ||
        !dataAquisicao
      ) {
        return;
      }

      const date =
        parseLocalDate(
          dataAquisicao
        );

      if (
        !date
      ) {
        return;
      }

      events.push({
        id:
          `renovacao-${renovacao.id}`,

        tipo:
          "renovacao",

        data:
          dataAquisicao,

        titulo:
          "Aquisição / renovação",

        descricao:
          getMedicationName(
            contexto.medicamentos,
            renovacao.medicamento_id
          ),

        entidadeId:
          renovacao.id,

        medicamentoId:
          renovacao.medicamento_id,

        timestamp:
          date.getTime(),
      });
    }
  );

  contexto.registrosSaude.forEach(
    (registro) => {
      if (
        !registro.id ||
        !registro.data
      ) {
        return;
      }

      const date =
        parseLocalDateTime(
          registro.data,
          registro.horario
        );

      if (
        !date
      ) {
        return;
      }

      events.push({
        id:
          `registro-saude-${registro.id}`,

        tipo:
          "registro_saude",

        data:
          registro.data,

        titulo:
          registro.nome ||
          registro.tipo ||
          "Registro de saúde",

        entidadeId:
          registro.id,

        medicamentoId:
          registro.medicamento_id,

        timestamp:
          date.getTime(),
      });
    }
  );

  contexto.consultas.forEach(
    (consulta) => {
      if (
        !consulta.id ||
        !consulta.data
      ) {
        return;
      }

      const date =
        parseLocalDate(
          consulta.data
        );

      if (
        !date
      ) {
        return;
      }

      events.push({
        id:
          `consulta-timeline-${consulta.id}`,

        tipo:
          "consulta",

        data:
          consulta.data,

        titulo:
          "Consulta",

        descricao:
          consulta.medico ||
          undefined,

        entidadeId:
          consulta.id,

        timestamp:
          date.getTime(),
      });
    }
  );

  contexto.exames.forEach(
    (exame) => {
      if (
        !exame.id ||
        !exame.data
      ) {
        return;
      }

      const date =
        parseLocalDate(
          exame.data
        );

      if (
        !date
      ) {
        return;
      }

      events.push({
        id:
          `exame-timeline-${exame.id}`,

        tipo:
          "exame",

        data:
          exame.data,

        titulo:
          exame.nome ||
          "Exame",

        entidadeId:
          exame.id,

        timestamp:
          date.getTime(),
      });
    }
  );

  contexto.cirurgias.forEach(
    (cirurgia) => {
      if (
        !cirurgia.id ||
        !cirurgia.data
      ) {
        return;
      }

      const date =
        parseLocalDate(
          cirurgia.data
        );

      if (
        !date
      ) {
        return;
      }

      events.push({
        id:
          `cirurgia-timeline-${cirurgia.id}`,

        tipo:
          "cirurgia",

        data:
          cirurgia.data,

        titulo:
          cirurgia.procedimento ||
          "Cirurgia",

        entidadeId:
          cirurgia.id,

        timestamp:
          date.getTime(),
      });
    }
  );

  return events
    .sort(
      (a, b) =>
        b.timestamp -
        a.timestamp
    )
    .slice(
      0,
      Math.max(
        1,
        limite
      )
    );
}

// ============================================================
// 24. INSIGHT PADRONIZADO DO CÉREBRO
// ============================================================

export type HealthInsightCategory =
  | "adesao"
  | "uso_sos"
  | "estoque"
  | "renovacao"
  | "rotina"
  | "sintomas"
  | "historico"
  | "dados";

export interface HealthInsight {
  id: string;

  categoria:
    HealthInsightCategory;

  titulo: string;

  mensagem: string;

  urgencia:
    InsightUrgencia;

  confianca:
    InsightConfianca;

  amostra: number;

  periodoDias?:
    number;

  entidadeTipo?:
    string;

  entidadeId?:
    string;

  link?: string;

  /**
   * Evidências simples e auditáveis que podem ser exibidas
   * futuramente em "Por que o Vault mostrou isso?".
   */
  evidencias?:
    string[];
}

// ============================================================
// 25. VALIDAÇÃO DO CONTEXTO
// ============================================================

export interface HealthContextValidation {
  valido: boolean;

  inconsistencias:
    string[];

  registrosDescartados:
    number;
}

export function validarHealthInsightContext(
  contexto:
    HealthInsightContext
): HealthContextValidation {
  const inconsistencias:
    string[] = [];

  let registrosDescartados =
    0;

  if (
    !contexto.personId?.trim()
  ) {
    inconsistencias.push(
      "Pessoa do contexto não identificada."
    );
  }

  const grupos: Array<{
    nome: string;

    dados: Array<{
      person_id?: string;
    }>;
  }> = [
    {
      nome:
        "medicamentos",

      dados:
        contexto.medicamentos,
    },
    {
      nome:
        "doseLogs",

      dados:
        contexto.doseLogs,
    },
    {
      nome:
        "renovacoes",

      dados:
        contexto.renovacoes,
    },
    {
      nome:
        "tratamentos",

      dados:
        contexto.tratamentos,
    },
    {
      nome:
        "registrosSaude",

      dados:
        contexto.registrosSaude,
    },
    {
      nome:
        "consultas",

      dados:
        contexto.consultas,
    },
    {
      nome:
        "exames",

      dados:
        contexto.exames,
    },
    {
      nome:
        "cirurgias",

      dados:
        contexto.cirurgias,
    },
    {
      nome:
        "cids",

      dados:
        contexto.cids,
    },
    {
      nome:
        "documentos",

      dados:
        contexto.documentos,
    },
  ];

  grupos.forEach(
    (grupo) => {
      const invalidos =
        grupo.dados.filter(
          (item) =>
            !item.person_id ||
            item.person_id !==
              contexto.personId
        ).length;

      if (
        invalidos >
        0
      ) {
        registrosDescartados +=
          invalidos;

        inconsistencias.push(
          `${grupo.nome}: ${invalidos} registro(s) não pertencem à pessoa do contexto.`
        );
      }
    }
  );

  return {
    valido:
      inconsistencias.length ===
      0,

    inconsistencias,

    registrosDescartados,
  };
}

// ============================================================
// 26. CÉREBRO LONGITUDINAL DO VAULT
// ============================================================

export function gerarInsightsSaude(
  contexto:
    HealthInsightContext
): HealthInsight[] {
  const insights:
    HealthInsight[] = [];

  const validation =
    validarHealthInsightContext(
      contexto
    );

  const medicamentos =
    contexto.medicamentos.filter(
      (item) =>
        item.person_id ===
        contexto.personId
    );

  const doseLogs =
    contexto.doseLogs.filter(
      (item) =>
        item.person_id ===
        contexto.personId
    );

  const renovacoes =
    contexto.renovacoes.filter(
      (item) =>
        item.person_id ===
        contexto.personId
    );

  const registrosSaude =
    contexto.registrosSaude.filter(
      (item) =>
        item.person_id ===
        contexto.personId
    );

  if (
    !validation.valido
  ) {
    insights.push({
      id:
        "contexto-dados-inconsistentes",

      categoria:
        "dados",

      titulo:
        "Alguns registros não entraram na análise",

      mensagem:
        `${validation.registrosDescartados} registro(s) foram ignorados porque não pertencem à pessoa analisada ou não possuem vínculo de pessoa válido.`,

      urgencia:
        "baixa",

      confianca:
        "alta",

      amostra:
        validation.registrosDescartados,

      evidencias:
        validation.inconsistencias,
    });
  }

  const medicamentosAtivos =
    getActiveMedicamentos(
      medicamentos
    );

  // ----------------------------------------------------------
  // ADESÃO / HORÁRIOS / CONSUMO DE MEDICAMENTOS CONTÍNUOS
  // ----------------------------------------------------------

  medicamentosAtivos.forEach(
    (medicamento) => {
      if (
        !medicamento.id
      ) {
        return;
      }

      const logs =
        getMedicamentoDoseLogs(
          medicamento.id,
          doseLogs
        );

      if (
        medicamento.tipo_uso ===
        "continuo"
      ) {
        const adesao =
          analisarAdesaoMedicamento(
            medicamento,
            logs
              .filter(
                (log) =>
                  Boolean(
                    log.data &&
                    log.horario
                  )
              )
              .map(
                (log) => ({
                  data:
                    log.data!,

                  horario:
                    log.horario!,

                  quantidade:
                    log.quantidade,

                  tomado_em:
                    log.tomado_em,

                  ignorado_em:
                    log.ignorado_em,

                  status:
                    log.status,
                })
              ),
            7
          );

        if (
          adesao.amostra &&
          adesao.amostra >
            0 &&
          adesao.adesao <
            80
        ) {
          insights.push({
            id:
              `adesao-${medicamento.id}`,

            categoria:
              "adesao",

            titulo:
              `Rotina de ${medicamento.nome}`,

            mensagem:
              `${adesao.mensagem} A taxa registrada foi de ${adesao.adesao}%.`,

            urgencia:
              adesao.adesao <
              50
                ? "media"
                : "baixa",

            confianca:
              adesao.confianca ||
              "baixa",

            amostra:
              adesao.amostra,

            periodoDias:
              7,

            entidadeTipo:
              "medicamento",

            entidadeId:
              medicamento.id,

            link:
              `/saude/medicamentos/detalhes?id=${medicamento.id}`,

            evidencias: [
              `${adesao.amostra} dose(s) programada(s) analisadas`,
              `${adesao.adesao}% de doses registradas como tomadas`,
            ],
          });
        }

        const horarioInsight =
          analisarPadraoHorarioDoses(
            medicamento,
            logs
          );

        if (
          horarioInsight
        ) {
          insights.push({
            id:
              `horario-adesao-${medicamento.id}-${horarioInsight.horario}`,

            categoria:
              "adesao",

            titulo:
              `${medicamento.nome}: ${horarioInsight.titulo}`,

            mensagem:
              horarioInsight.mensagem,

            urgencia:
              horarioInsight.taxaIgnoradas >=
              50
                ? "media"
                : "baixa",

            confianca:
              horarioInsight.confianca,

            amostra:
              horarioInsight.amostra,

            entidadeTipo:
              "medicamento",

            entidadeId:
              medicamento.id,

            link:
              `/saude/medicamentos/detalhes?id=${medicamento.id}`,

            evidencias: [
              `${horarioInsight.ignoradas} dose(s) ignorada(s)`,
              `${horarioInsight.resolvidas} dose(s) resolvida(s) às ${horarioInsight.horario}`,
            ],
          });
        }

        const consumo =
          analisarConsumoVsRotina(
            medicamento,
            logs,
            7
          );

        if (
          consumo
        ) {
          insights.push({
            id:
              `consumo-rotina-${medicamento.id}`,

            categoria:
              "rotina",

            titulo:
              `${medicamento.nome}: ${consumo.titulo}`,

            mensagem:
              consumo.mensagem,

            urgencia:
              consumo.percentualRealizado <
              50
                ? "media"
                : "baixa",

            confianca:
              consumo.confianca,

            amostra:
              consumo.amostra,

            periodoDias:
              consumo.periodoDias,

            entidadeTipo:
              "medicamento",

            entidadeId:
              medicamento.id,

            link:
              `/saude/medicamentos/detalhes?id=${medicamento.id}`,

            evidencias: [
              `${consumo.dosesTomadas} dose(s) tomada(s)`,
              `${consumo.dosesPrevistas} dose(s) programada(s) já previstas`,
            ],
          });
        }
      }

      // -------------------------------------------------------
      // SOS
      // -------------------------------------------------------

      const tendenciaSOS =
        analisarTendenciaSOS(
          medicamento,
          logs,
          7
        );

      if (
        tendenciaSOS
      ) {
        insights.push({
          id:
            `tendencia-sos-${medicamento.id}`,

          categoria:
            "uso_sos",

          titulo:
            `${medicamento.nome}: ${tendenciaSOS.titulo}`,

          mensagem:
            tendenciaSOS.mensagem,

          urgencia:
            tendenciaSOS.atual >
              tendenciaSOS.anterior
              ? "media"
              : "baixa",

          confianca:
            tendenciaSOS.confianca,

          amostra:
            tendenciaSOS.amostra,

          periodoDias:
            14,

          entidadeTipo:
            "medicamento",

          entidadeId:
            medicamento.id,

          link:
            `/saude/medicamentos/detalhes?id=${medicamento.id}`,

          evidencias: [
            `${tendenciaSOS.atual} tomada(s) nos últimos 7 dias`,
            `${tendenciaSOS.anterior} tomada(s) nos 7 dias anteriores`,
          ],
        });
      }

      // -------------------------------------------------------
      // RENOVAÇÃO / ESTOQUE
      // -------------------------------------------------------

      const renovacaoInsight =
        sugerirRenovacao(
          medicamento
        );

      if (
        renovacaoInsight.deveRenovar &&
        renovacaoInsight.motivo !==
          "nenhum"
      ) {
        insights.push({
          id:
            `renovacao-${renovacaoInsight.motivo}-${medicamento.id}`,

          categoria:
            renovacaoInsight.motivo ===
            "estoque"
              ? "estoque"
              : "renovacao",

          titulo:
            renovacaoInsight.motivo ===
            "estoque"
              ? `Estoque de ${medicamento.nome}`
              : renovacaoInsight.motivo ===
                  "sus"
                ? `Retirada de ${medicamento.nome}`
                : `Renovação de ${medicamento.nome}`,

          mensagem:
            renovacaoInsight.mensagem,

          urgencia:
            renovacaoInsight.urgencia,

          confianca:
            "alta",

          amostra: 1,

          entidadeTipo:
            "medicamento",

          entidadeId:
            medicamento.id,

          link:
            `/saude/medicamentos/detalhes?id=${medicamento.id}`,
        });
      }

      const intervaloRenovacoes =
        analisarIntervaloRenovacoes(
          medicamento.id,
          renovacoes
        );

      if (
        intervaloRenovacoes &&
        intervaloRenovacoes
          .intervalosAnalisados >=
          2
      ) {
        insights.push({
          id:
            `intervalo-renovacoes-${medicamento.id}`,

          categoria:
            "historico",

          titulo:
            `Histórico de aquisição de ${medicamento.nome}`,

          mensagem:
            intervaloRenovacoes.mensagem,

          urgencia:
            "nenhuma",

          confianca:
            intervaloRenovacoes.confianca,

          amostra:
            intervaloRenovacoes.intervalosAnalisados,

          entidadeTipo:
            "medicamento",

          entidadeId:
            medicamento.id,

          link:
            `/saude/medicamentos/detalhes?id=${medicamento.id}`,

          evidencias: [
            `${intervaloRenovacoes.totalRenovacoes} aquisição(ões) registrada(s)`,
            `Intervalos entre ${intervaloRenovacoes.menorIntervalo} e ${intervaloRenovacoes.maiorIntervalo} dia(s)`,
          ],
        });
      }

      const padraoRenovacao =
        analisarPadraoRenovacao(
          medicamento.id,
          renovacoes
        );

      if (
        padraoRenovacao
      ) {
        insights.push({
          id:
            `padrao-renovacao-${medicamento.id}`,

          categoria:
            "historico",

          titulo:
            `Mudança no intervalo de ${medicamento.nome}`,

          mensagem:
            padraoRenovacao.mensagem,

          urgencia:
            "nenhuma",

          confianca:
            padraoRenovacao.confianca,

          amostra:
            padraoRenovacao.amostra,

          entidadeTipo:
            "medicamento",

          entidadeId:
            medicamento.id,

          link:
            `/saude/renovacao?medicamento_id=${medicamento.id}`,

          evidencias: [
            `Último intervalo: ${padraoRenovacao.intervaloAtual} dia(s)`,
            `Média anterior: ${padraoRenovacao.mediaAnterior} dia(s)`,
          ],
        });
      }
    }
  );

  // ----------------------------------------------------------
  // SINTOMAS × SOS
  // ----------------------------------------------------------

  const idsSos =
    new Set(
      medicamentosAtivos
        .filter(
          (medicamento) =>
            medicamento.tipo_uso ===
              "esporadico" ||
            medicamento.tipo_uso ===
              "sos"
        )
        .map(
          (medicamento) =>
            medicamento.id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(
              id
            )
        )
    );

  const dosesSos =
    doseLogs
      .filter(
        (dose) =>
          Boolean(
            dose.medicamento_id &&
            idsSos.has(
              dose.medicamento_id
            ) &&
            isDoseTaken(
              dose
            )
          )
      )
      .map(
        (dose) => ({
          data:
            dose.data,

          horario:
            dose.horario,

          tomado_em:
            dose.tomado_em,

          quantidade:
            dose.quantidade,

          medicamento_nome:
            getMedicationName(
              medicamentos,
              dose.medicamento_id
            ),
        })
      );

  const registrosSintomas =
    registrosSaude
      .filter(
        (registro) =>
          registro.categoria ===
            "sintoma" ||
          Boolean(
            registro.intensidade
          )
      )
      .map(
        (registro) => ({
          data:
            registro.data,

          horario:
            registro.horario,

          tipo:
            registro.tipo ||
            registro.nome ||
            "sintoma",

          intensidade:
            registro.intensidade,
        })
      );

  const cluster =
    analisarClustersSintomasSOS(
      registrosSintomas,
      dosesSos,
      3
    );

  if (
    cluster
  ) {
    insights.push({
      id:
        "cluster-sintomas-sos",

      categoria:
        "sintomas",

      titulo:
        cluster.titulo,

      mensagem:
        `${cluster.mensagem} ${cluster.recomendacao}`,

      urgencia:
        "baixa",

      confianca:
        cluster.confianca ||
        "baixa",

      amostra:
        cluster.amostra ||
        0,

      periodoDias:
        3,

      evidencias: [
        `${cluster.sintomasDetectados.length} tipo(s) de sintoma no período`,
        `${dosesSos.length} registro(s) SOS disponíveis no contexto`,
      ],
    });
  }

  // ----------------------------------------------------------
  // DIA DA SEMANA
  // ----------------------------------------------------------

  const padraoDia =
    analisarPadraoDiaSemana(
      registrosSaude.map(
        (registro) => ({
          data:
            registro.data,

          horario:
            registro.horario,

          tipo:
            registro.tipo ||
            registro.nome ||
            "registro",
        })
      )
    );

  if (
    padraoDia
  ) {
    insights.push({
      id:
        `padrao-dia-${normalizeText(
          padraoDia.diaCritico
        )}`,

      categoria:
        "historico",

      titulo:
        "Padrão por dia da semana",

      mensagem:
        padraoDia.mensagem,

      urgencia:
        "nenhuma",

      confianca:
        padraoDia.confianca,

      amostra:
        padraoDia.amostra,

      evidencias: [
        `${padraoDia.ocorrencias} ocorrência(s) em ${padraoDia.diaCritico}`,
        `${padraoDia.totalRegistros} registro(s) analisados`,
        `${formatQuantity(
          padraoDia.proporcao
        )}% do histórico analisado`,
      ],
    });
  }

  // ----------------------------------------------------------
  // DEDUPLICAÇÃO + ORDENAÇÃO
  // ----------------------------------------------------------

  const ordemUrgencia:
    Record<
      InsightUrgencia,
      number
    > = {
      alta: 0,
      media: 1,
      baixa: 2,
      nenhuma: 3,
    };

  const ordemConfianca:
    Record<
      InsightConfianca,
      number
    > = {
      alta: 0,
      media: 1,
      baixa: 2,
    };

  const unique =
    new Map<
      string,
      HealthInsight
    >();

  insights.forEach(
    (insight) => {
      const existing =
        unique.get(
          insight.id
        );

      if (
        !existing
      ) {
        unique.set(
          insight.id,
          insight
        );

        return;
      }

      const novaUrgencia =
        ordemUrgencia[
          insight.urgencia
        ];

      const antigaUrgencia =
        ordemUrgencia[
          existing.urgencia
        ];

      if (
        novaUrgencia <
        antigaUrgencia
      ) {
        unique.set(
          insight.id,
          insight
        );

        return;
      }

      if (
        novaUrgencia ===
          antigaUrgencia &&
        ordemConfianca[
          insight.confianca
        ] <
          ordemConfianca[
            existing.confianca
          ]
      ) {
        unique.set(
          insight.id,
          insight
        );
      }
    }
  );

  return Array.from(
    unique.values()
  ).sort(
    (a, b) => {
      const urgency =
        ordemUrgencia[
          a.urgencia
        ] -
        ordemUrgencia[
          b.urgencia
        ];

      if (
        urgency !==
        0
      ) {
        return urgency;
      }

      const confidence =
        ordemConfianca[
          a.confianca
        ] -
        ordemConfianca[
          b.confianca
        ];

      if (
        confidence !==
        0
      ) {
        return confidence;
      }

      return (
        b.amostra -
        a.amostra
      );
    }
  );
} 
