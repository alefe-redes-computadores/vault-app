// lib/medication-intelligence/types.ts

import type {
  TipoReceita,
} from "@/lib/types";

/**
 * Origem de uma informação usada pelo Medication Intelligence.
 *
 * O Vault deve conseguir explicar de onde veio qualquer
 * validação regulatória ou farmacêutica.
 */
export type MedicationReferenceSource = {
  id: string;

  label: string;

  /**
   * Ex.: anvisa, ministerio_saude, catalogo_local.
   */
  authority:
    | "anvisa"
    | "ministerio_saude"
    | "catalogo_local"
    | "other";

  url?: string;

  /**
   * Versão da base, resolução ou conjunto de dados.
   */
  version?: string;

  /**
   * Data ISO da última verificação/importação.
   */
  verifiedAt?: string;
};

export type MedicationPresentation = {
  /**
   * Texto original da apresentação/concentração.
   * Ex.: "25 mg".
   */
  label: string;

  value?: number;

  unit?: string;

  pharmaceuticalForm?: string;
};


/**
 * Snapshot de um produto regulatório pertencente a uma
 * identidade comercial histórica.
 *
 * IMPORTANTE:
 * apresentações permanecem vinculadas ao registro concreto
 * ao qual pertencem. O Vault nunca deve promovê-las
 * silenciosamente para outro registro.
 */
export type MedicationCommercialProduct = {
  id: string;

  name: string;

  registrationNumber?: string;

  manufacturer?: string;

  active: boolean;

  relationship:
    | "current"
    | "historical";

  confidence:
    | "high"
    | "medium";

  evidence?: string;

  presentations:
    MedicationPresentation[];
};

/**
 * Identidade comercial que pode atravessar diferentes
 * registros oficiais ao longo do tempo.
 *
 * Ex.:
 * VENVANSE
 * ├─ registro atual — Takeda
 * └─ registro histórico — Shire
 *
 * Essa camada NÃO funde os produtos regulatórios.
 */
export type MedicationCommercialIdentity = {
  id: string;

  canonicalName: string;

  currentProduct?:
    MedicationCommercialProduct;

  historicalProducts:
    MedicationCommercialProduct[];
};

/**
 * Um medicamento pode ser encontrado por marca, princípio ativo,
 * genérico, similar ou outros nomes válidos.
 *
 * O catálogo deve representar equivalências conhecidas.
 */
export type MedicationReference = {
  id: string;

  /**
   * Nome principal usado pela referência.
   */
  canonicalName: string;

  /**
   * Primeiro princípio ativo conhecido.
   *
   * Mantido por compatibilidade com consumidores antigos.
   * Para produtos combinados, prefira activeIngredients.
   */
  activeIngredient?: string;

  /**
   * Todos os princípios ativos conhecidos do produto.
   *
   * A ordem só deve ser considerada significativa quando
   * vier explicitamente da fonte.
   */
  activeIngredients?: string[];

  /**
   * Marcas, genéricos, similares ou grafias alternativas
   * reconhecidas pela fonte.
   */
  aliases?: string[];

  presentations?: MedicationPresentation[];

  prescriptionTypes?: TipoReceita[];

  pharmaceuticalForms?: string[];

  /**
   * Identidade comercial histórica quando o produto atual
   * pertence a um agrupamento seguro do catálogo.
   *
   * presentations no nível principal continua contendo
   * SOMENTE apresentações confirmadas do produto atual.
   */
  commercialIdentity?:
    MedicationCommercialIdentity;

  sources: MedicationReferenceSource[];
};

export type MedicationValidationConfidence =
  | "low"
  | "medium"
  | "high";

export type MedicationValidationSeverity =
  | "info"
  | "warning"
  | "important";

/**
 * Tipo específico do possível problema encontrado.
 *
 * "Possível" é intencional: este módulo não faz diagnóstico
 * nem presume que um cadastro divergente esteja necessariamente
 * errado.
 */
export type MedicationValidationIssueCode =
  | "possible_name_typo"
  | "presentation_not_found"
  | "prescription_type_mismatch"
  | "pharmaceutical_form_mismatch";

export type MedicationValidationField =
  | "nome"
  | "dosagem"
  | "tipo_receita"
  | "formato";

export type MedicationValidationIssue = {
  id: string;

  code:
    MedicationValidationIssueCode;

  field:
    MedicationValidationField;

  severity:
    MedicationValidationSeverity;

  confidence:
    MedicationValidationConfidence;

  title: string;

  message: string;

  evidence: string[];

  /**
   * Sugestão nunca deve ser aplicada sem confirmação da pessoa.
   */
  suggestedValue?: string;

  referenceId?: string;

  sources:
    MedicationReferenceSource[];
};

export type MedicationValidationInput = {
  nome: string;

  dosagem?: string;

  tipoReceita?: TipoReceita;

  formato?: string;
};

export type MedicationNormalizedInput = {
  originalName: string;

  normalizedName: string;

  originalDosage?: string;

  dosageValue?: number;

  dosageUnit?: string;

  tipoReceita?: TipoReceita;

  formato?: string;
};

export type MedicationReferenceMatch = {
  reference:
    MedicationReference;

  matchedBy:
    | "canonical_name"
    | "alias"
    | "active_ingredient"
    | "similarity";

  matchedText: string;

  score: number;
};

export type MedicationValidationResult = {
  input:
    MedicationValidationInput;

  normalized:
    MedicationNormalizedInput;

  match:
    MedicationReferenceMatch | null;

  issues:
    MedicationValidationIssue[];

  /**
   * true significa apenas que nenhuma inconsistência foi
   * encontrada COM AS REFERÊNCIAS DISPONÍVEIS.
   *
   * Não significa aprovação médica ou regulatória absoluta.
   */
  noIssuesFound: boolean;

  /**
   * Indica se havia referência suficiente para validar algo.
   */
  referenceAvailable: boolean;
};
