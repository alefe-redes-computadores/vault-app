// scripts/medication-catalog/audit-imported-catalog.js

"use strict";

const { createAdminClient } = require("./admin-client");

const SEARCH_CASES = [
  "venvanse",
  "lisdexanfetamina",
  "rivotril",
  "clonazepam",
  "amitriptilina",
  "clonazepan",
  "venvase",
];

const EXPECTED_COUNTS = {
  medication_substances: 2439,
  medication_products: 42349,
  medication_product_substances: 22104,
  medication_presentations: 51465,
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCount(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", {
      head: true,
      count: "exact",
    });

  if (error) {
    throw new Error(
      "Falha ao contar " + table + ": " + error.message
    );
  }

  return count ?? 0;
}

async function auditVersions(supabase) {
  console.log("============================================================");
  console.log("📚 VERSÕES ATIVAS");

  const { data, error } = await supabase
    .from("medication_catalog_versions")
    .select(
      "id, source_key, source_name, version, active, imported_at, source_url"
    )
    .eq("active", true)
    .order("source_key", { ascending: true });

  if (error) {
    throw new Error(
      "Falha ao consultar versões: " + error.message
    );
  }

  const rows = data ?? [];

  for (const row of rows) {
    console.log("");
    console.log("✅ " + row.source_key);
    console.log("   fonte: " + row.source_name);
    console.log("   versão: " + row.version);
    console.log("   importada em: " + row.imported_at);
  }

  console.log("");
  console.log("Total de versões ativas: " + rows.length);

  if (rows.length !== 3) {
    throw new Error(
      "Esperávamos exatamente 3 versões ativas."
    );
  }
}

async function auditCounts(supabase) {
  console.log("\n============================================================");
  console.log("📊 CONTAGENS");

  for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
    const count = await getCount(supabase, table);

    console.log(
      (count === expected ? "✅ " : "❌ ") +
      table +
      ": " +
      count +
      " / esperado " +
      expected
    );

    if (count !== expected) {
      throw new Error(
        "Contagem divergente em " + table
      );
    }
  }

  const aliases = await getCount(
    supabase,
    "medication_aliases"
  );

  const rules = await getCount(
    supabase,
    "medication_regulatory_rules"
  );

  console.log(
    "✅ medication_aliases: " +
    aliases +
    " (esperado nesta fase: 0)"
  );

  console.log(
    "✅ medication_regulatory_rules: " +
    rules +
    " (esperado nesta fase: 0)"
  );

  if (aliases !== 0 || rules !== 0) {
    throw new Error(
      "Aliases ou regras regulatórias não deveriam estar populados nesta fase."
    );
  }
}

async function auditOrphans(supabase) {
  console.log("\n============================================================");
  console.log("🧬 INTEGRIDADE RELACIONAL");

  async function countRows(table, select) {
    const { count, error } = await supabase
      .from(table)
      .select(select, {
        head: true,
        count: "exact",
      });

    if (error) {
      throw new Error(
        "Falha na auditoria relacional de " +
        table +
        ": " +
        error.message
      );
    }

    return count ?? 0;
  }

  const relationTotal =
    await countRows(
      "medication_product_substances",
      "*"
    );

  const relationWithProduct =
    await countRows(
      "medication_product_substances",
      "product_id, medication_products!inner(id)"
    );

  const relationWithSubstance =
    await countRows(
      "medication_product_substances",
      "substance_id, medication_substances!inner(id)"
    );

  const presentationTotal =
    await countRows(
      "medication_presentations",
      "*"
    );

  const presentationsWithProduct =
    await countRows(
      "medication_presentations",
      "product_id, medication_products!inner(id)"
    );

  const relationsWithoutProduct =
    relationTotal -
    relationWithProduct;

  const relationsWithoutSubstance =
    relationTotal -
    relationWithSubstance;

  const presentationsWithoutProduct =
    presentationTotal -
    presentationsWithProduct;

  console.log(
    (relationsWithoutProduct === 0 ? "✅ " : "❌ ") +
    "relações sem produto: " +
    relationsWithoutProduct +
    " (" +
    relationWithProduct +
    "/" +
    relationTotal +
    " ligadas)"
  );

  console.log(
    (relationsWithoutSubstance === 0 ? "✅ " : "❌ ") +
    "relações sem substância: " +
    relationsWithoutSubstance +
    " (" +
    relationWithSubstance +
    "/" +
    relationTotal +
    " ligadas)"
  );

  console.log(
    (presentationsWithoutProduct === 0 ? "✅ " : "❌ ") +
    "apresentações sem produto: " +
    presentationsWithoutProduct +
    " (" +
    presentationsWithProduct +
    "/" +
    presentationTotal +
    " ligadas)"
  );

  if (
    relationsWithoutProduct !== 0 ||
    relationsWithoutSubstance !== 0 ||
    presentationsWithoutProduct !== 0
  ) {
    throw new Error(
      "Integridade relacional divergente."
    );
  }
}

async function auditPlaceholderSearch(supabase) {
  console.log("\n============================================================");
  console.log("🧹 PLACEHOLDERS");

  const { data, error } = await supabase
    .from("medication_products")
    .select(
      "id, product_name, product_name_normalized, active"
    )
    .in(
      "product_name_normalized",
      [
        "n o declarado",
        "nao declarado",
        "nc ni",
      ]
    )
    .eq("active", true)
    .limit(20);

  if (error) {
    throw new Error(
      "Falha ao verificar placeholders: " +
      error.message
    );
  }

  const rows = data ?? [];

  console.log(
    (rows.length === 0 ? "✅ " : "❌ ") +
    "placeholders ativos: " +
    rows.length
  );

  if (rows.length > 0) {
    console.log(rows);
    throw new Error(
      "Placeholder indevido disponível como produto ativo."
    );
  }
}

async function rpcSearch(supabase, query) {
  const { data, error } = await supabase.rpc(
    "search_medication_catalog",
    {
      p_query: query,
      p_limit: 10,
      p_min_score: 0.3,
    }
  );

  if (error) {
    throw new Error(
      "RPC falhou para \"" +
      query +
      "\": " +
      error.message
    );
  }

  return data ?? [];
}

async function auditSearches(supabase) {
  console.log("\n============================================================");
  console.log("🔎 TESTES REAIS DO RPC");

  const resultsByQuery = new Map();

  for (const query of SEARCH_CASES) {
    const results = await rpcSearch(
      supabase,
      query
    );

    resultsByQuery.set(
      query,
      results
    );

    console.log("\n▶ " + query);
    console.log(
      "  resultados: " + results.length
    );

    for (const item of results.slice(0, 8)) {
      console.log(
        "  - [" +
        item.reference_type +
        "] " +
        item.matched_text +
        " | score=" +
        Number(item.score ?? 0).toFixed(4)
      );
    }
  }

  return resultsByQuery;
}

async function hydrateProduct(supabase, productId) {
  const { data: product, error: productError } =
    await supabase
      .from("medication_products")
      .select(
        "id, product_name, product_kind, manufacturer, registration_number, active"
      )
      .eq("id", productId)
      .maybeSingle();

  if (productError) {
    throw new Error(
      "Falha ao hidratar produto: " +
      productError.message
    );
  }

  if (!product) {
    throw new Error(
      "Produto não encontrado durante hidratação."
    );
  }

  const {
    data: relations,
    error: relationsError,
  } = await supabase
    .from("medication_product_substances")
    .select(
      "external_substance_id, medication_substances(id, canonical_name, canonical_name_normalized)"
    )
    .eq("product_id", productId);

  if (relationsError) {
    throw new Error(
      "Falha ao hidratar substâncias do produto: " +
      relationsError.message
    );
  }

  const {
    data: presentations,
    error: presentationsError,
  } = await supabase
    .from("medication_presentations")
    .select(
      "presentation_label, external_registration, ggrem_code, ean, active"
    )
    .eq("product_id", productId)
    .order("presentation_label", {
      ascending: true,
    })
    .limit(20);

  if (presentationsError) {
    throw new Error(
      "Falha ao hidratar apresentações: " +
      presentationsError.message
    );
  }

  return {
    product,
    relations: relations ?? [],
    presentations: presentations ?? [],
  };
}

async function auditHydration(
  supabase,
  resultsByQuery
) {
  console.log("\n============================================================");
  console.log("🧠 HIDRATAÇÃO REAL");

  const preferredQueries = [
    "venvanse",
    "rivotril",
    "clonazepam",
    "amitriptilina",
  ];

  for (const query of preferredQueries) {
    const results =
      resultsByQuery.get(query) ?? [];

    const productResult =
      results.find(
        (item) =>
          item.reference_type === "product" &&
          normalizeText(item.matched_text) ===
            normalizeText(query)
      ) ||
      results.find(
        (item) =>
          item.reference_type === "product"
      );

    if (!productResult) {
      console.log(
        "\n⚠️ " +
        query +
        ": nenhum produto retornado pelo RPC."
      );

      continue;
    }

    const hydrated =
      await hydrateProduct(
        supabase,
        productResult.reference_id
      );

    console.log(
      "\n▶ " +
      hydrated.product.product_name
    );

    console.log(
      "  tipo: " +
      hydrated.product.product_kind
    );

    console.log(
      "  registro: " +
      (
        hydrated.product.registration_number ||
        "(não informado)"
      )
    );

    console.log(
      "  fabricante: " +
      (
        hydrated.product.manufacturer ||
        "(não informado)"
      )
    );

    const substances =
      hydrated.relations
        .map(
          (item) =>
            item.medication_substances &&
            item.medication_substances.canonical_name
        )
        .filter(Boolean);

    console.log(
      "  substâncias: " +
      (
        substances.length
          ? substances.join(" | ")
          : "(sem relação segura)"
      )
    );

    console.log(
      "  apresentações carregadas: " +
      hydrated.presentations.length
    );

    for (
      const presentation of
      hydrated.presentations.slice(0, 8)
    ) {
      console.log(
        "    - " +
        presentation.presentation_label
      );
    }
  }
}

async function auditActiveSearchQuality(
  supabase,
  resultsByQuery
) {
  console.log("\n============================================================");
  console.log("🎯 QUALIDADE DAS BUSCAS");

  const expectations = [
    {
      query: "venvanse",
      term: "venvanse",
    },
    {
      query: "lisdexanfetamina",
      term: "lisdexanfetamina",
    },
    {
      query: "rivotril",
      term: "rivotril",
    },
    {
      query: "clonazepam",
      term: "clonazepam",
    },
    {
      query: "amitriptilina",
      term: "amitriptilina",
    },
  ];

  let failed = false;

  for (const item of expectations) {
    const results =
      resultsByQuery.get(item.query) ?? [];

    const found =
      results.some(
        (result) =>
          normalizeText(
            result.matched_text
          ).includes(
            normalizeText(
              item.term
            )
          )
      );

    console.log(
      (found ? "✅ " : "❌ ") +
      item.query +
      " encontrou termo esperado"
    );

    if (!found) {
      failed = true;
    }
  }

  if (failed) {
    throw new Error(
      "Uma ou mais buscas-base falharam."
    );
  }

  console.log("");
  console.log(
    "ℹ️ Casos com erro proposital de digitação (venvase/clonazepan)"
  );
  console.log(
    "   são observacionais nesta etapa; ainda não exigimos match."
  );
}

async function main() {
  console.log(
    "🧠 VAULT — AUDITORIA PÓS-IMPORTAÇÃO 4E5\n"
  );

  console.log(
    "🚫 SOMENTE LEITURA"
  );

  console.log(
    "🚫 Nenhum INSERT/UPDATE/DELETE"
  );

  console.log(
    "🔎 Catálogo oficial recém-importado será validado.\n"
  );

  const supabase =
    createAdminClient();

  await auditVersions(
    supabase
  );

  await auditCounts(
    supabase
  );

  await auditOrphans(
    supabase
  );

  await auditPlaceholderSearch(
    supabase
  );

  const resultsByQuery =
    await auditSearches(
      supabase
    );

  await auditActiveSearchQuality(
    supabase,
    resultsByQuery
  );

  await auditHydration(
    supabase,
    resultsByQuery
  );

  console.log(
    "\n============================================================"
  );

  console.log(
    "✅ AUDITORIA 4E5 CONCLUÍDA."
  );

  console.log(
    "🧠 Catálogo carregado, pesquisável e hidratável."
  );

  console.log(
    "🧾 Nenhum dado foi alterado."
  );

  console.log(
    "🏥 Envie esta saída para a próxima cirurgia."
  );
}

main().catch((error) => {
  console.error(
    "\n❌ AUDITORIA 4E5 FALHOU"
  );

  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );

  process.exit(1);
});
