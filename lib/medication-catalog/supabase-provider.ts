// lib/medication-catalog/supabase-provider.ts

import {
  supabase,
} from "@/lib/supabase/client";

import {
  normalizeMedicationText,
} from "@/lib/medication-intelligence/normalize";

import {
  isMedicationRegulatoryRuleActive,
} from "./regulatory";

import type {
  MedicationCommercialIdentity,
  MedicationCommercialProduct,
  MedicationPresentation,
  MedicationReference,
  MedicationReferenceSource,
  MedicationRegulatoryReference,
  MedicationRegulatoryPrescriptionModelCode,
} from "@/lib/medication-intelligence/types";

import type {
  MedicationCatalogProvider,
} from "./provider";

import type {
  MedicationCatalogSearchOptions,
  MedicationCatalogSearchResult,
  MedicationCatalogStatus,
  MedicationCatalogVersion,
} from "./types";

import type {
  MedicationRegulatoryCondition,
  MedicationRegulatoryException,
} from "./regulatory";

type SearchRpcRow = {
  reference_id: string;
  reference_type:
    | "substance"
    | "product";
  matched_text: string;
  score: number;
};

type CatalogVersionRow = {
  id: string;
  source_key: string;
  source_name: string;
  source_url:
    | string
    | null;
  version: string;
  published_at:
    | string
    | null;
  imported_at: string;
  active: boolean;
};

type SubstanceRow = {
  id: string;
  canonical_name: string;
  source_version_id:
    | string
    | null;
};

type ProductRow = {
  id: string;
  product_name: string;

  manufacturer:
    | string
    | null;

  registration_number:
    | string
    | null;

  active: boolean;

  source_version_id:
    | string
    | null;
};

type ProductSubstanceRow = {
  substance_id: string;
  source_version_id:
    | string
    | null;
  position:
    | number
    | null;
  is_primary: boolean;
};

type AliasRow = {
  alias: string;
};

type PresentationRow = {
  presentation_label: string;
  concentration_value:
    | number
    | string
    | null;
  concentration_unit:
    | string
    | null;
  pharmaceutical_form:
    | string
    | null;
};


type IdentityPresentationRow =
  PresentationRow & {
    product_id: string;

    source_version_id:
      | string
      | null;

    active: boolean;
  };

type CommercialIdentityRow = {
  id: string;

  canonical_name: string;

  current_product_id:
    | string
    | null;
};

type IdentityMembershipRow = {
  identity_id: string;

  product_id: string;

  relationship_type:
    | "current"
    | "historical";

  confidence:
    | "high"
    | "medium";

  evidence:
    | string
    | null;
};

type HydratedCommercialIdentity = {
  identity:
    MedicationCommercialIdentity;

  versionIds:
    string[];
};

type RegulatoryRuleRow = {
  id: string;

  regulatory_class:
    string | null;

  prescription_model:
    string | null;

  prescription_model_code:
    MedicationRegulatoryPrescriptionModelCode | null;

  vault_prescription_type:
    | "comum"
    | "amarela"
    | "azul"
    | "branca"
    | null;

  source_version_id:
    string;

  effective_from:
    | string
    | null;

  effective_until:
    | string
    | null;

  verified_at:
    string;
};

type RegulatoryExceptionRow = {
  id:
    string;

  regulatory_rule_id:
    string;

  label:
    string;

  condition_schema_version:
    number;

  conditions:
    unknown;

  override_prescription_model:
    string | null;

  override_prescription_model_code:
    MedicationRegulatoryPrescriptionModelCode | null;

  override_vault_prescription_type:
    | "comum"
    | "amarela"
    | "azul"
    | "branca"
    | null;

  source_version_id:
    string;

  effective_from:
    | string
    | null;

  effective_until:
    | string
    | null;

  verified_at:
    string;

  notes:
    string | null;
};

function mapAuthority(
  sourceKey: string
): MedicationReferenceSource["authority"] {
  const normalized =
    normalizeMedicationText(
      sourceKey
    );

  if (
    normalized.includes(
      "anvisa"
    ) ||
    normalized.includes(
      "cmed"
    )
  ) {
    return "anvisa";
  }

  if (
    normalized.includes(
      "ministerio"
    ) &&
    normalized.includes(
      "saude"
    )
  ) {
    return "ministerio_saude";
  }

  if (
    normalized.includes(
      "vault"
    ) ||
    normalized.includes(
      "local"
    )
  ) {
    return "catalogo_local";
  }

  return "other";
}

function versionToSource(
  version:
    CatalogVersionRow
): MedicationReferenceSource {
  return {
    id:
      version.id,

    label:
      version.source_name,

    authority:
      mapAuthority(
        version.source_key
      ),

    url:
      version.source_url ??
      undefined,

    version:
      version.version,

    verifiedAt:
      version.imported_at,
  };
}

function versionToCatalogVersion(
  version:
    CatalogVersionRow
): MedicationCatalogVersion {
  return {
    id:
      version.id,

    source:
      version.source_name,

    version:
      version.version,

    publishedAt:
      version.published_at ??
      undefined,

    importedAt:
      version.imported_at,

    active:
      version.active,
  };
}

function isRegulatoryNumericOperator(
  value:
    unknown
): value is
  | "eq"
  | "lt"
  | "lte"
  | "gt"
  | "gte" {
  return (
    value === "eq" ||
    value === "lt" ||
    value === "lte" ||
    value === "gt" ||
    value === "gte"
  );
}

function isRegulatoryTextOperator(
  value:
    unknown
): value is
  | "eq"
  | "in" {
  return (
    value === "eq" ||
    value === "in"
  );
}

function isRegulatoryConcentrationUnit(
  value:
    unknown
): value is
  | "percent"
  | "mg_ml"
  | "mg"
  | "mcg" {
  return (
    value === "percent" ||
    value === "mg_ml" ||
    value === "mg" ||
    value === "mcg"
  );
}

function isNonEmptyString(
  value:
    unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isStringOrStringArray(
  value:
    unknown
): value is
  | string
  | string[] {
  if (
    isNonEmptyString(
      value
    )
  ) {
    return true;
  }

  return (
    Array.isArray(
      value
    ) &&
    value.length >
      0 &&
    value.every(
      isNonEmptyString
    )
  );
}

function parseRegulatoryCondition(
  value:
    unknown
): MedicationRegulatoryCondition | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  switch (
    row.kind
  ) {
    case "ingredient_concentration": {
      if (
        !isNonEmptyString(
          row.ingredient
        ) ||
        !isRegulatoryNumericOperator(
          row.operator
        ) ||
        typeof row.value !==
          "number" ||
        !Number.isFinite(
          row.value
        ) ||
        !isRegulatoryConcentrationUnit(
          row.unit
        )
      ) {
        return null;
      }

      return {
        kind:
          "ingredient_concentration",

        ingredient:
          row.ingredient,

        operator:
          row.operator,

        value:
          row.value,

        unit:
          row.unit,
      };
    }

    case "pharmaceutical_form":
    case "product_id":
    case "registration_number": {
      if (
        !isRegulatoryTextOperator(
          row.operator
        ) ||
        !isStringOrStringArray(
          row.value
        )
      ) {
        return null;
      }

      return {
        kind:
          row.kind,

        operator:
          row.operator,

        value:
          row.value,
      };
    }

    default:
      return null;
  }
}

function parseRegulatoryConditions(
  value:
    unknown,
  schemaVersion:
    number
): MedicationRegulatoryCondition[] | null {
  if (
    schemaVersion !==
      1 ||
    !Array.isArray(
      value
    ) ||
    value.length ===
      0
  ) {
    return null;
  }

  const parsed =
    value.map(
      parseRegulatoryCondition
    );

  if (
    parsed.some(
      (
        condition
      ) =>
        condition ===
        null
    )
  ) {
    return null;
  }

  return parsed as MedicationRegulatoryCondition[];
}

function isMissingRegulatoryExceptionsTableError(
  error:
    unknown
): boolean {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return false;
  }

  const candidate =
    error as {
      code?:
        unknown;

      message?:
        unknown;

      details?:
        unknown;

      hint?:
        unknown;
    };

  const code =
    typeof candidate.code ===
      "string"
      ? candidate.code
      : "";

  const message =
    [
      candidate.message,
      candidate.details,
      candidate.hint,
    ]
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      )
      .join(
        " "
      )
      .toLowerCase();

  return (
    code ===
      "42P01" ||
    code ===
      "PGRST205" ||
    (
      message.includes(
        "medication_regulatory_rule_exceptions"
      ) &&
      (
        message.includes(
          "does not exist"
        ) ||
        message.includes(
          "schema cache"
        ) ||
        message.includes(
          "could not find"
        )
      )
    )
  );
}

function regulatoryExceptionRowToReference(
  row:
    RegulatoryExceptionRow,
  sourceMap:
    Map<
      string,
      MedicationReferenceSource
    >
): MedicationRegulatoryException | null {
  const conditions =
    parseRegulatoryConditions(
      row.conditions,
      row.condition_schema_version
    );

  if (
    !conditions
  ) {
    return null;
  }

  const source =
    sourceMap.get(
      row.source_version_id
    );

  return {
    id:
      row.id,

    label:
      row.label,

    conditions,

    overrideVaultPrescriptionType:
      row.override_vault_prescription_type ??
      undefined,

    overridePrescriptionModel:
      row.override_prescription_model ??
      undefined,

    overridePrescriptionModelCode:
      row.override_prescription_model_code ??
      undefined,

    effectiveFrom:
      row.effective_from ??
      undefined,

    effectiveUntil:
      row.effective_until ??
      undefined,

    sourceId:
      row.source_version_id,

    sourceVersion:
      source?.version,

    verifiedAt:
      row.verified_at,

    notes:
      row.notes ??
      undefined,
  };
}

function regulatoryRuleRowToReference(
  rule:
    RegulatoryRuleRow,
  sourceMap:
    Map<
      string,
      MedicationReferenceSource
    >
): MedicationRegulatoryReference {
  const source =
    sourceMap.get(
      rule.source_version_id
    );

  return {
    vaultPrescriptionType:
      rule.vault_prescription_type ??
      undefined,

    regulatoryClass:
      rule.regulatory_class ??
      undefined,

    prescriptionModel:
      rule.prescription_model ??
      undefined,

    prescriptionModelCode:
      rule.prescription_model_code ??
      undefined,

    effectiveFrom:
      rule.effective_from ??
      undefined,

    effectiveUntil:
      rule.effective_until ??
      undefined,

    verifiedAt:
      rule.verified_at,

    sources:
      source
        ? [
            source,
          ]
        : [],
  };
}

function uniqueStrings(
  values:
    Array<
      string | null | undefined
    >
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (
            value
          ) =>
            value?.trim()
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
    )
  );
}


function presentationRowToReference(
  row:
    PresentationRow
): MedicationPresentation {
  return {
    label:
      row.presentation_label,

    value:
      row.concentration_value ===
        null
        ? undefined
        : Number(
            row.concentration_value
          ),

    unit:
      row.concentration_unit ??
      undefined,

    pharmaceuticalForm:
      row.pharmaceutical_form ??
      undefined,
  };
}

export type MedicationCatalogQuickSearchResult = {
  referenceId: string;
  referenceType:
    | "substance"
    | "product";
  canonicalName: string;
  matchedText: string;
  score: number;
};

type CachedQuickSearch = {
  expiresAt: number;
  value: Promise<MedicationCatalogQuickSearchResult[]>;
};

type CachedReference = {
  expiresAt: number;
  value: Promise<MedicationReference | null>;
};

export class SupabaseMedicationCatalogProvider
  implements MedicationCatalogProvider
{
  private readonly quickSearchCache =
    new Map<string, CachedQuickSearch>();

  private readonly referenceCache =
    new Map<string, CachedReference>();

  private readonly quickSearchCacheTtlMs =
    2 * 60 * 1000;

  private readonly referenceCacheTtlMs =
    10 * 60 * 1000;

  async searchLight(
    query: string,
    options: MedicationCatalogSearchOptions = {}
  ): Promise<MedicationCatalogQuickSearchResult[]> {
    const normalized =
      normalizeMedicationText(query);

    if (!normalized) {
      return [];
    }

    const limit =
      Math.max(
        1,
        Math.min(
          options.limit ?? 10,
          50
        )
      );

    const minimumScore =
      options.minimumScore ??
      (
        normalized.length <= 4
          ? 0.85
          : normalized.length <= 7
            ? 0.5
            : 0.6
      );

    const cacheKey =
      [
        normalized,
        limit,
        minimumScore,
      ].join("|");

    const cached =
      this.quickSearchCache.get(cacheKey);

    if (
      cached &&
      cached.expiresAt > Date.now()
    ) {
      return cached.value;
    }

    const promise =
      this.executeLightSearch(
        normalized,
        limit,
        minimumScore
      );

    this.quickSearchCache.set(
      cacheKey,
      {
        expiresAt:
          Date.now() +
          this.quickSearchCacheTtlMs,
        value: promise,
      }
    );

    try {
      return await promise;
    } catch (error) {
      this.quickSearchCache.delete(
        cacheKey
      );
      throw error;
    }
  }

  private async executeLightSearch(
    normalized: string,
    limit: number,
    minimumScore: number
  ): Promise<MedicationCatalogQuickSearchResult[]> {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "search_medication_catalog",
        {
          p_query:
            normalized,

          p_limit:
            limit,

          p_min_score:
            minimumScore,
        }
      );

    if (error) {
      throw new Error(
        `Falha ao pesquisar catálogo de medicamentos: ${error.message}`
      );
    }

    const rows =
      (data ??
        []) as SearchRpcRow[];

    /*
     * FAST PATH
     * ---------
     * A lista do autocomplete usa apenas o retorno da RPC.
     * Não consulta products/substances novamente.
     *
     * A referência oficial completa é hidratada quando
     * selecionada ou prefetada.
     */
    return rows.map(
      (
        row
      ) => ({
        referenceId:
          row.reference_id,

        referenceType:
          row.reference_type,

        canonicalName:
          row.matched_text,

        matchedText:
          row.matched_text,

        score:
          Number(
            row.score
          ),
      })
    );
  }


  async prefetchQuickResults(
    results:
      MedicationCatalogQuickSearchResult[],
    limit:
      number = 1
  ): Promise<void> {
    const safeLimit =
      Math.max(
        0,
        Math.min(
          limit,
          2
        )
      );

    if (
      safeLimit === 0 ||
      results.length === 0
    ) {
      return;
    }

    await Promise.allSettled(
      results
        .slice(
          0,
          safeLimit
        )
        .map(
          (
            result
          ) =>
            this.getByTypedId(
              result.referenceId,
              result.referenceType
            )
        )
    );
  }

  async hydrateQuickResult(
    result: MedicationCatalogQuickSearchResult
  ): Promise<MedicationCatalogSearchResult | null> {
    const reference =
      await this.getByTypedId(
        result.referenceId,
        result.referenceType
      );

    if (!reference) {
      return null;
    }

    return {
      reference,
      score: result.score,
      matchedText:
        result.matchedText,
    };
  }

  async search(
    query: string,
    options:
      MedicationCatalogSearchOptions =
        {}
  ): Promise<MedicationCatalogSearchResult[]> {
    const normalized =
      normalizeMedicationText(
        query
      );

    if (
      !normalized
    ) {
      return [];
    }

    const limit =
      Math.max(
        1,
        Math.min(
          options.limit ??
            10,
          50
        )
      );

    const minimumScore =
      options.minimumScore ??
      (
        normalized.length <= 4
          ? 0.85
          : normalized.length <= 7
            ? 0.5
            : 0.6
      );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "search_medication_catalog",
        {
          p_query:
            normalized,

          p_limit:
            limit,

          p_min_score:
            minimumScore,
        }
      );

    if (
      error
    ) {
      throw new Error(
        `Falha ao pesquisar catálogo de medicamentos: ${error.message}`
      );
    }

    const rows =
      (
        data ??
        []
      ) as SearchRpcRow[];

    const hydrated =
      await Promise.all(
        rows.map(
          async (
            row
          ) => {
            const reference =
              await this.getByTypedId(
                row.reference_id,
                row.reference_type
              );

            if (
              !reference
            ) {
              return null;
            }

            return {
              reference,
              score:
                Number(
                  row.score
                ),
              matchedText:
                row.matched_text,
            } satisfies MedicationCatalogSearchResult;
          }
        )
      );

    return hydrated.filter(
      (
        item
      ): item is MedicationCatalogSearchResult =>
        item !==
        null
    );
  }

  async getById(
    id: string
  ): Promise<MedicationReference | null> {
    const product =
      await this.getByTypedId(
        id,
        "product"
      );

    if (
      product
    ) {
      return product;
    }

    return this.getByTypedId(
      id,
      "substance"
    );
  }

  async getStatus():
    Promise<MedicationCatalogStatus> {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "medication_catalog_versions"
        )
        .select(
          "id, source_key, source_name, source_url, version, published_at, imported_at, active"
        )
        .eq(
          "active",
          true
        )
        .order(
          "imported_at",
          {
            ascending:
              false,
          }
        );

    if (
      error
    ) {
      throw new Error(
        `Falha ao consultar status do catálogo: ${error.message}`
      );
    }

    const versions =
      (
        data ??
        []
      ) as CatalogVersionRow[];

    const sources =
      versions.map(
        versionToSource
      );

    const version =
      versions[0]
        ? versionToCatalogVersion(
            versions[0]
          )
        : null;

    const {
      count,
      error:
        countError,
    } =
      await supabase
        .from(
          "medication_substances"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "active",
          true
        );

    if (
      countError
    ) {
      throw new Error(
        `Falha ao contar referências do catálogo: ${countError.message}`
      );
    }

    return {
      available:
        versions.length >
          0 &&
        (
          count ??
          0
        ) >
          0,

      version,

      sources,

      referenceCount:
        count ??
        0,
    };
  }

  private async getByTypedId(
    id: string,
    type:
      | "substance"
      | "product"
  ): Promise<MedicationReference | null> {
    const cacheKey =
      `${type}:${id}`;

    const cached =
      this.referenceCache.get(
        cacheKey
      );

    if (
      cached &&
      cached.expiresAt > Date.now()
    ) {
      return cached.value;
    }

    const value =
      type === "product"
        ? this.hydrateProduct(id)
        : this.hydrateSubstance(id);

    this.referenceCache.set(
      cacheKey,
      {
        expiresAt:
          Date.now() +
          this.referenceCacheTtlMs,
        value,
      }
    );

    try {
      return await value;
    } catch (error) {
      this.referenceCache.delete(
        cacheKey
      );
      throw error;
    }
  }

  private async hydrateProduct(
    productId: string
  ): Promise<MedicationReference | null> {
    const {
      data:
        productData,
      error:
        productError,
    } =
      await supabase
        .from(
          "medication_products"
        )
        .select(
          "id, product_name, manufacturer, registration_number, active, source_version_id"
        )
        .eq(
          "id",
          productId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle();

    if (
      productError
    ) {
      throw new Error(
        `Falha ao carregar produto do catálogo: ${productError.message}`
      );
    }

    if (
      !productData
    ) {
      return null;
    }

    const product =
      productData as ProductRow;

    const {
      data:
        relationData,
      error:
        relationError,
    } =
      await supabase
        .from(
          "medication_product_substances"
        )
        .select(
          "substance_id, source_version_id, position, is_primary"
        )
        .eq(
          "product_id",
          product.id
        )
        .order(
          "is_primary",
          {
            ascending:
              false,
          }
        )
        .order(
          "position",
          {
            ascending:
              true,
            nullsFirst:
              false,
          }
        );

    if (
      relationError
    ) {
      throw new Error(
        `Falha ao carregar substâncias do produto: ${relationError.message}`
      );
    }

    const relations =
      (
        relationData ??
        []
      ) as ProductSubstanceRow[];

    const substanceIds =
      uniqueStrings(
        relations.map(
          (
            relation
          ) =>
            relation.substance_id
        )
      );

    let substances:
      SubstanceRow[] =
        [];

    if (
      substanceIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "medication_substances"
          )
          .select(
            "id, canonical_name, source_version_id"
          )
          .in(
            "id",
            substanceIds
          )
          .eq(
            "active",
            true
          );

      if (
        error
      ) {
        throw new Error(
          `Falha ao carregar princípios ativos: ${error.message}`
        );
      }

      const substanceMap =
        new Map(
          (
            (
              data ??
              []
            ) as SubstanceRow[]
          ).map(
            (
              substance
            ) => [
              substance.id,
              substance,
            ]
          )
        );

      substances =
        substanceIds
          .map(
            (
              id
            ) =>
              substanceMap.get(
                id
              )
          )
          .filter(
            (
              substance
            ): substance is SubstanceRow =>
              Boolean(
                substance
              )
          );
    }

    const [
      productAliasesResult,
      presentationsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "medication_aliases"
          )
          .select(
            "alias"
          )
          .eq(
            "product_id",
            product.id
          ),

        supabase
          .from(
            "medication_presentations"
          )
          .select(
            "presentation_label, concentration_value, concentration_unit, pharmaceutical_form"
          )
          .eq(
            "product_id",
            product.id
          )
          .eq(
            "active",
            true
          ),
      ]);

    if (
      productAliasesResult.error
    ) {
      throw new Error(
        `Falha ao carregar aliases do produto: ${productAliasesResult.error.message}`
      );
    }

    if (
      presentationsResult.error
    ) {
      throw new Error(
        `Falha ao carregar apresentações: ${presentationsResult.error.message}`
      );
    }

    const substanceAliasesResults =
      await Promise.all(
        substances.map(
          (
            substance
          ) =>
            supabase
              .from(
                "medication_aliases"
              )
              .select(
                "alias"
              )
              .eq(
                "substance_id",
                substance.id
              )
        )
      );

    for (
      const result of
        substanceAliasesResults
    ) {
      if (
        result.error
      ) {
        throw new Error(
          `Falha ao carregar aliases de substância: ${result.error.message}`
        );
      }
    }

    const regulatoryResults =
      await Promise.all(
        substances.map(
          (
            substance
          ) =>
            supabase
              .from(
                "medication_regulatory_rules"
              )
              .select(
                "id, regulatory_class, prescription_model, prescription_model_code, vault_prescription_type, source_version_id, effective_from, effective_until, verified_at"
              )
              .eq(
                "substance_id",
                substance.id
              )
        )
      );

    for (
      const result of
        regulatoryResults
    ) {
      if (
        result.error
      ) {
        throw new Error(
          `Falha ao carregar regra regulatória: ${result.error.message}`
        );
      }
    }

    const productAliases =
      (
        productAliasesResult.data ??
        []
      ) as AliasRow[];

    const substanceAliases =
      substanceAliasesResults.flatMap(
        (
          result
        ) =>
          (
            result.data ??
            []
          ) as AliasRow[]
      );

    const presentations =
      (
        presentationsResult.data ??
        []
      ) as PresentationRow[];

    const rules =
      regulatoryResults.flatMap(
        (
          result
        ) =>
          (
            result.data ??
            []
          ) as RegulatoryRuleRow[]
      );

    const regulatoryExceptionRows =
      await this.loadRegulatoryExceptions(
        rules.map(
          (
            rule
          ) =>
            rule.id
        )
      );

    const commercialIdentity =
      await this.hydrateCommercialIdentity(
        product
      );

    const versionIds =
      uniqueStrings([
        product.source_version_id,

        ...substances.map(
          (
            substance
          ) =>
            substance.source_version_id
        ),

        ...relations.map(
          (
            relation
          ) =>
            relation.source_version_id
        ),

        ...rules.map(
          (
            rule
          ) =>
            rule.source_version_id
        ),

        ...regulatoryExceptionRows.map(
          (
            exception
          ) =>
            exception.source_version_id
        ),

        ...(
          commercialIdentity?.versionIds ??
          []
        ),
      ]);

    const sources =
      await this.loadSources(
        versionIds
      );

    const sourceMap =
      new Map(
        sources.map(
          (
            source
          ) => [
            source.id,
            source,
          ]
        )
      );

    const exceptionsByRuleId =
      new Map<
        string,
        MedicationRegulatoryException[]
      >();

    const malformedExceptionRuleIds =
      new Set<string>();

    for (
      const row of
        regulatoryExceptionRows
    ) {
      const parsed =
        regulatoryExceptionRowToReference(
          row,
          sourceMap
        );

      if (
        !parsed
      ) {
        malformedExceptionRuleIds.add(
          row.regulatory_rule_id
        );

        continue;
      }

      const current =
        exceptionsByRuleId.get(
          row.regulatory_rule_id
        ) ??
        [];

      current.push(
        parsed
      );

      exceptionsByRuleId.set(
        row.regulatory_rule_id,
        current
      );
    }

    const regulatoryRules =
      rules.map(
        (
          rule
        ) => ({
          ...regulatoryRuleRowToReference(
            rule,
            sourceMap
          ),

          exceptions:
            exceptionsByRuleId.get(
              rule.id
            ) ??
            [],

          hasMalformedExceptions:
            malformedExceptionRuleIds.has(
              rule.id
            ),
        })
      );

    const activeRules =
      regulatoryRules.filter(
        (
          rule
        ) =>
          Boolean(
            rule.vaultPrescriptionType
          ) &&
          isMedicationRegulatoryRuleActive(
            rule
          )
      );

    const activeIngredients =
      uniqueStrings(
        substances.map(
          (
            substance
          ) =>
            substance.canonical_name
        )
      );

    return {
      id:
        product.id,

      canonicalName:
        product.product_name,

      activeIngredient:
        activeIngredients[0],

      activeIngredients,

      aliases:
        uniqueStrings([
          ...productAliases.map(
            (
              row
            ) =>
              row.alias
          ),

          ...substanceAliases.map(
            (
              row
            ) =>
              row.alias
          ),
        ]),

      presentations:
        presentations.map(
          presentationRowToReference
        ),

      prescriptionTypes:
        uniqueStrings(
          activeRules.map(
            (
              rule
            ) =>
              rule.vaultPrescriptionType
          )
        ) as Array<
          | "comum"
          | "amarela"
          | "azul"
          | "branca"
        >,

      regulatoryRules,

      regulatoryIdentity: {
        referenceType:
          "product",

        productId:
          product.id,

        registrationNumber:
          product.registration_number ??
          undefined,
      },

      pharmaceuticalForms:
        uniqueStrings(
          presentations.map(
            (
              row
            ) =>
              row.pharmaceutical_form
          )
        ),

      commercialIdentity:
        commercialIdentity?.identity,

      sources,
    };
  }

  private async hydrateCommercialIdentity(
    product:
      ProductRow
  ): Promise<
    HydratedCommercialIdentity | null
  > {
    const {
      data:
        membershipData,
      error:
        membershipError,
    } =
      await supabase
        .from(
          "medication_product_identity_memberships"
        )
        .select(
          "identity_id, product_id, relationship_type, confidence, evidence"
        )
        .eq(
          "product_id",
          product.id
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      throw new Error(
        `Falha ao carregar vínculo de identidade comercial: ${membershipError.message}`
      );
    }

    if (
      !membershipData
    ) {
      return null;
    }

    const ownMembership =
      membershipData as IdentityMembershipRow;

    const {
      data:
        identityData,
      error:
        identityError,
    } =
      await supabase
        .from(
          "medication_commercial_identities"
        )
        .select(
          "id, canonical_name, current_product_id"
        )
        .eq(
          "id",
          ownMembership.identity_id
        )
        .maybeSingle();

    if (
      identityError
    ) {
      throw new Error(
        `Falha ao carregar identidade comercial: ${identityError.message}`
      );
    }

    if (
      !identityData
    ) {
      return null;
    }

    const identity =
      identityData as CommercialIdentityRow;

    const {
      data:
        membershipsData,
      error:
        membershipsError,
    } =
      await supabase
        .from(
          "medication_product_identity_memberships"
        )
        .select(
          "identity_id, product_id, relationship_type, confidence, evidence"
        )
        .eq(
          "identity_id",
          identity.id
        );

    if (
      membershipsError
    ) {
      throw new Error(
        `Falha ao carregar membros da identidade comercial: ${membershipsError.message}`
      );
    }

    const memberships =
      (
        membershipsData ??
        []
      ) as IdentityMembershipRow[];

    const productIds =
      uniqueStrings(
        memberships.map(
          (
            membership
          ) =>
            membership.product_id
        )
      );

    if (
      productIds.length ===
      0
    ) {
      return {
        identity: {
          id:
            identity.id,

          canonicalName:
            identity.canonical_name,

          historicalProducts:
            [],
        },

        versionIds:
          [],
      };
    }

    const {
      data:
        productsData,
      error:
        productsError,
    } =
      await supabase
        .from(
          "medication_products"
        )
        .select(
          "id, product_name, manufacturer, registration_number, active, source_version_id"
        )
        .in(
          "id",
          productIds
        );

    if (
      productsError
    ) {
      throw new Error(
        `Falha ao carregar produtos da identidade comercial: ${productsError.message}`
      );
    }

    const memberProducts =
      (
        productsData ??
        []
      ) as ProductRow[];

    const {
      data:
        presentationData,
      error:
        presentationError,
    } =
      await supabase
        .from(
          "medication_presentations"
        )
        .select(
          "product_id, presentation_label, concentration_value, concentration_unit, pharmaceutical_form, source_version_id, active"
        )
        .in(
          "product_id",
          productIds
        );

    if (
      presentationError
    ) {
      throw new Error(
        `Falha ao carregar apresentações históricas: ${presentationError.message}`
      );
    }

    const identityPresentations =
      (
        presentationData ??
        []
      ) as IdentityPresentationRow[];

    const productMap =
      new Map(
        memberProducts.map(
          (
            item
          ) => [
            item.id,
            item,
          ]
        )
      );

    const presentationMap =
      new Map<
        string,
        IdentityPresentationRow[]
      >();

    for (
      const presentation of
        identityPresentations
    ) {
      if (
        !presentationMap.has(
          presentation.product_id
        )
      ) {
        presentationMap.set(
          presentation.product_id,
          []
        );
      }

      presentationMap
        .get(
          presentation.product_id
        )
        ?.push(
          presentation
        );
    }

    const snapshots:
      MedicationCommercialProduct[] =
        [];

    for (
      const membership of
        memberships
    ) {
      const memberProduct =
        productMap.get(
          membership.product_id
        );

      if (
        !memberProduct
      ) {
        continue;
      }

      const productPresentations =
        presentationMap.get(
          memberProduct.id
        ) ??
        [];

      /*
       * Para o produto atual, somente apresentações ativas.
       *
       * Para registros históricos preservamos apresentações
       * históricas oficiais, mesmo que estejam inativas hoje.
       */
      const allowedPresentations =
        membership.relationship_type ===
          "current"
          ? productPresentations.filter(
              (
                presentation
              ) =>
                presentation.active ===
                true
            )
          : productPresentations;

      snapshots.push({
        id:
          memberProduct.id,

        name:
          memberProduct.product_name,

        registrationNumber:
          memberProduct.registration_number ??
          undefined,

        manufacturer:
          memberProduct.manufacturer ??
          undefined,

        active:
          memberProduct.active,

        relationship:
          membership.relationship_type,

        confidence:
          membership.confidence,

        evidence:
          membership.evidence ??
          undefined,

        presentations:
          allowedPresentations.map(
            presentationRowToReference
          ),
      });
    }

    const currentProduct =
      snapshots.find(
        (
          snapshot
        ) =>
          snapshot.relationship ===
            "current" &&
          (
            !identity.current_product_id ||
            snapshot.id ===
              identity.current_product_id
          )
      );

    const historicalProducts =
      snapshots.filter(
        (
          snapshot
        ) =>
          snapshot.relationship ===
          "historical"
      );

    const versionIds =
      uniqueStrings([
        ...memberProducts.map(
          (
            memberProduct
          ) =>
            memberProduct.source_version_id
        ),

        ...identityPresentations.map(
          (
            presentation
          ) =>
            presentation.source_version_id
        ),
      ]);

    return {
      identity: {
        id:
          identity.id,

        canonicalName:
          identity.canonical_name,

        currentProduct,

        historicalProducts,
      },

      versionIds,
    };
  }

  private async hydrateSubstance(
    substanceId: string
  ): Promise<MedicationReference | null> {
    const {
      data:
        substanceData,
      error:
        substanceError,
    } =
      await supabase
        .from(
          "medication_substances"
        )
        .select(
          "id, canonical_name, source_version_id"
        )
        .eq(
          "id",
          substanceId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle();

    if (
      substanceError
    ) {
      throw new Error(
        `Falha ao carregar substância: ${substanceError.message}`
      );
    }

    if (
      !substanceData
    ) {
      return null;
    }

    const substance =
      substanceData as SubstanceRow;

    const [
      aliasesResult,
      relationsResult,
      regulatoryResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "medication_aliases"
          )
          .select(
            "alias"
          )
          .eq(
            "substance_id",
            substance.id
          ),

        supabase
          .from(
            "medication_product_substances"
          )
          .select(
            "product_id"
          )
          .eq(
            "substance_id",
            substance.id
          ),

        supabase
          .from(
            "medication_regulatory_rules"
          )
          .select(
            "id, regulatory_class, prescription_model, prescription_model_code, vault_prescription_type, source_version_id, effective_from, effective_until, verified_at"
          )
          .eq(
            "substance_id",
            substance.id
          ),
      ]);

    if (
      aliasesResult.error
    ) {
      throw new Error(
        `Falha ao carregar aliases da substância: ${aliasesResult.error.message}`
      );
    }

    if (
      relationsResult.error
    ) {
      throw new Error(
        `Falha ao carregar produtos da substância: ${relationsResult.error.message}`
      );
    }

    if (
      regulatoryResult.error
    ) {
      throw new Error(
        `Falha ao carregar regras regulatórias: ${regulatoryResult.error.message}`
      );
    }

    const productIds =
      uniqueStrings(
        (
          relationsResult.data ??
          []
        ).map(
          (
            row
          ) =>
            (
              row as {
                product_id:
                  string;
              }
            ).product_id
        )
      );

    let products:
      ProductRow[] =
        [];

    if (
      productIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "medication_products"
          )
          .select(
            "id, product_name, manufacturer, registration_number, active, source_version_id"
          )
          .in(
            "id",
            productIds
          )
          .eq(
            "active",
            true
          );

      if (
        error
      ) {
        throw new Error(
          `Falha ao carregar produtos da substância: ${error.message}`
        );
      }

      products =
        (
          data ??
          []
        ) as ProductRow[];
    }

    let presentations:
      PresentationRow[] =
        [];

    if (
      productIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "medication_presentations"
          )
          .select(
            "presentation_label, concentration_value, concentration_unit, pharmaceutical_form"
          )
          .in(
            "product_id",
            productIds
          )
          .eq(
            "active",
            true
          );

      if (
        error
      ) {
        throw new Error(
          `Falha ao carregar apresentações da substância: ${error.message}`
        );
      }

      presentations =
        (
          data ??
          []
        ) as PresentationRow[];
    }

    const aliases =
      (
        aliasesResult.data ??
        []
      ) as AliasRow[];

    const rules =
      (
        regulatoryResult.data ??
        []
      ) as RegulatoryRuleRow[];

    const regulatoryExceptionRows =
      await this.loadRegulatoryExceptions(
        rules.map(
          (
            rule
          ) =>
            rule.id
        )
      );

    const versionIds =
      uniqueStrings([
        substance.source_version_id,

        ...products.map(
          (
            product
          ) =>
            product.source_version_id
        ),

        ...rules.map(
          (
            rule
          ) =>
            rule.source_version_id
        ),

        ...regulatoryExceptionRows.map(
          (
            exception
          ) =>
            exception.source_version_id
        ),
      ]);

    const sources =
      await this.loadSources(
        versionIds
      );

    const sourceMap =
      new Map(
        sources.map(
          (
            source
          ) => [
            source.id,
            source,
          ]
        )
      );

    const exceptionsByRuleId =
      new Map<
        string,
        MedicationRegulatoryException[]
      >();

    const malformedExceptionRuleIds =
      new Set<string>();

    for (
      const row of
        regulatoryExceptionRows
    ) {
      const parsed =
        regulatoryExceptionRowToReference(
          row,
          sourceMap
        );

      if (
        !parsed
      ) {
        malformedExceptionRuleIds.add(
          row.regulatory_rule_id
        );

        continue;
      }

      const current =
        exceptionsByRuleId.get(
          row.regulatory_rule_id
        ) ??
        [];

      current.push(
        parsed
      );

      exceptionsByRuleId.set(
        row.regulatory_rule_id,
        current
      );
    }

    const regulatoryRules =
      rules.map(
        (
          rule
        ) => ({
          ...regulatoryRuleRowToReference(
            rule,
            sourceMap
          ),

          exceptions:
            exceptionsByRuleId.get(
              rule.id
            ) ??
            [],

          hasMalformedExceptions:
            malformedExceptionRuleIds.has(
              rule.id
            ),
        })
      );

    const activeRules =
      regulatoryRules.filter(
        (
          rule
        ) =>
          Boolean(
            rule.vaultPrescriptionType
          ) &&
          isMedicationRegulatoryRuleActive(
            rule
          )
      );

    return {
      id:
        substance.id,

      canonicalName:
        substance.canonical_name,

      activeIngredient:
        substance.canonical_name,

      activeIngredients: [
        substance.canonical_name,
      ],

      aliases:
        uniqueStrings([
          ...aliases.map(
            (
              row
            ) =>
              row.alias
          ),

          ...products.map(
            (
              product
            ) =>
              product.product_name
          ),
        ]),

      presentations:
        presentations.map(
          presentationRowToReference
        ),

      prescriptionTypes:
        uniqueStrings(
          activeRules.map(
            (
              rule
            ) =>
              rule.vaultPrescriptionType
          )
        ) as Array<
          | "comum"
          | "amarela"
          | "azul"
          | "branca"
        >,

      regulatoryRules,

      regulatoryIdentity: {
        referenceType:
          "substance",
      },

      pharmaceuticalForms:
        uniqueStrings(
          presentations.map(
            (
              row
            ) =>
              row.pharmaceutical_form
          )
        ),

      sources,
    };
  }

  private async loadRegulatoryExceptions(
    ruleIds:
      string[]
  ): Promise<RegulatoryExceptionRow[]> {
    if (
      ruleIds.length ===
        0
    ) {
      return [];
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "medication_regulatory_rule_exceptions"
        )
        .select(
          "id, regulatory_rule_id, label, condition_schema_version, conditions, override_prescription_model, override_prescription_model_code, override_vault_prescription_type, source_version_id, effective_from, effective_until, verified_at, notes"
        )
        .in(
          "regulatory_rule_id",
          ruleIds
        );

    if (
      error
    ) {
      if (
        isMissingRegulatoryExceptionsTableError(
          error
        )
      ) {
        return [];
      }

      throw new Error(
        `Falha ao carregar exceções regulatórias: ${error.message}`
      );
    }

    return (
      data ??
      []
    ) as RegulatoryExceptionRow[];
  }

  private async loadSources(
    ids: string[]
  ): Promise<MedicationReferenceSource[]> {
    if (
      ids.length ===
      0
    ) {
      return [];
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "medication_catalog_versions"
        )
        .select(
          "id, source_key, source_name, source_url, version, published_at, imported_at, active"
        )
        .in(
          "id",
          ids
        );

    if (
      error
    ) {
      throw new Error(
        `Falha ao carregar fontes do catálogo: ${error.message}`
      );
    }

    return (
      (
        data ??
        []
      ) as CatalogVersionRow[]
    ).map(
      versionToSource
    );
  }
}

export const supabaseMedicationCatalogProvider =
  new SupabaseMedicationCatalogProvider();
