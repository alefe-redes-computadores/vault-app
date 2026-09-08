// lib/medication-intelligence/types.ts

import type {
  TipoReceita,
} from "@/lib/types";

import type {
  MedicationRegulatoryEvaluationContext,
  MedicationRegulatoryException,
} from "@/lib/medication-catalog/regulatory";

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

/**
 * Código estruturado do modelo oficial de receituário.
 *
 * TipoReceita continua sendo a abstração visual/legada do Vault.
 */
export type MedicationRegulatoryPrescriptionModelCode =
  | "notificacao_a"
  | "notificacao_b"
  | "notificacao_b2"
  | "notificacao_retinoides"
  | "notificacao_talidomida"
  | "receita_controle_especial"
  | "receita_comum"
  | "other";

/**
 * Regra regulatória vinculada à referência farmacêutica.
 *
 * Essa estrutura é evidência, não interpretação clínica.
 * Uma regra pode ter vigência histórica e fontes próprias.
 */
export type MedicationRegulatoryReference = {
  vaultPrescriptionType?:
    TipoReceita;

  regulatoryClass?:
    string;

  /**
   * Modelo regulatório oficial quando conhecido.
   *
   * Ex.:
   * "Notificação de Receita A"
   * "Notificação de Receita B"
   * "Receita de Controle Especial"
   *
   * Não confundir com vaultPrescriptionType, que é apenas
   * a abstração visual utilizada pelo Vault.
   */
  prescriptionModel?:
    string;

  prescriptionModelCode?:
    MedicationRegulatoryPrescriptionModelCode;

  effectiveFrom?:
    string;

  effectiveUntil?:
    string;

  verifiedAt?:
    string;

  /**
   * Exceções condicionais associadas a esta regra.
   *
   * A presença de uma exceção NÃO significa que ela se aplica.
   * Ela deve ser avaliada com contexto suficiente.
   */
  exceptions?:
    MedicationRegulatoryException[];

  /**
   * true significa que pelo menos uma exceção vinculada a esta
   * regra foi recebida, mas não pôde ser interpretada pelo
   * contrato estruturado atual.
   *
   * Fail-safe:
   * uma regra nessa condição não pode sustentar acusação de
   * divergência de receita.
   */
  hasMalformedExceptions?:
    boolean;

  sources:
    MedicationReferenceSource[];
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
export type MedicationRegulatoryIdentity =
  | {
      referenceType:
        "product";

      productId:
        string;

      registrationNumber?:
        string;
    }
  | {
      referenceType:
        "substance";
    };

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

  /**
   * Tipos de receita vigentes no momento em que a referência
   * foi hidratada.
   *
   * Mantido por compatibilidade com consumidores existentes.
   * Para validação temporal, prefira regulatoryRules.
   */
  prescriptionTypes?: TipoReceita[];

  /**
   * Regras regulatórias conhecidas, inclusive históricas.
   *
   * O consumidor deve respeitar effectiveFrom/effectiveUntil.
   */
  regulatoryRules?:
    MedicationRegulatoryReference[];

  /**
   * Identidade regulatória concreta da referência hidratada.
   *
   * Produto:
   * - productId é o ID real de medication_products;
   * - registrationNumber só existe quando veio da fonte.
   *
   * Substância:
   * - nunca inventa productId;
   * - nunca escolhe arbitrariamente um produto relacionado.
   */
  regulatoryIdentity?:
    MedicationRegulatoryIdentity;

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

  /**
   * Data ISO da prescrição/receita quando conhecida.
   *
   * Permite comparar a classificação selecionada com a regra
   * que estava vigente naquele momento, em vez de assumir
   * automaticamente a regra atual.
   */
  prescriptionDate?: string;

  /**
   * Contexto regulatório opcional para avaliar exceções que
   * dependam do produto, apresentação ou concentração.
   *
   * Ausência desse contexto nunca autoriza inferência.
   */
  regulatoryContext?:
    MedicationRegulatoryEvaluationContext;
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
