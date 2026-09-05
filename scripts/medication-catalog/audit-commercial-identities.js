// scripts/medication-catalog/audit-commercial-identities.js

"use strict";

const { createAdminClient } = require("./admin-client");

const TARGETS = [
  "venvanse",
  "rivotril",
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadBrands(supabase) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("medication_products")
      .select(
        [
          "id",
          "external_id",
          "product_name",
          "product_name_normalized",
          "product_kind",
          "manufacturer",
          "registration_number",
          "active",
        ].join(", ")
      )
      .eq("product_kind", "brand")
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      throw new Error(
        "Falha ao carregar produtos brand: " +
        error.message
      );
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function loadRelations(supabase) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("medication_product_substances")
      .select(
        [
          "product_id",
          "substance_id",
          "external_substance_id",
          "medication_substances(" +
            "id," +
            "canonical_name," +
            "canonical_name_normalized" +
          ")",
        ].join(", ")
      )
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      throw new Error(
        "Falha ao carregar relações produto-substância: " +
        error.message
      );
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return rows;
}

function buildRelationIndex(relations) {
  const map = new Map();

  for (const relation of relations) {
    if (!map.has(relation.product_id)) {
      map.set(
        relation.product_id,
        []
      );
    }

    map.get(
      relation.product_id
    ).push(relation);
  }

  return map;
}

function sameSafeSubstance(products, relationIndex) {
  let reference = null;

  for (const product of products) {
    const relations =
      relationIndex.get(
        product.id
      ) ?? [];

    if (relations.length !== 1) {
      return null;
    }

    const relation =
      relations[0];

    const substance =
      relation.medication_substances;

    if (
      !substance ||
      !substance.id ||
      !substance.canonical_name_normalized
    ) {
      return null;
    }

    if (!reference) {
      reference = {
        id: substance.id,
        name:
          substance.canonical_name,
        normalizedName:
          substance.canonical_name_normalized,
      };

      continue;
    }

    if (
      substance.id !==
      reference.id
    ) {
      return null;
    }
  }

  return reference;
}

function buildCandidates(
  brands,
  relationIndex
) {
  const grouped =
    new Map();

  for (const product of brands) {
    const key =
      product
        .product_name_normalized ||
      normalizeText(
        product.product_name
      );

    if (!key) {
      continue;
    }

    if (!grouped.has(key)) {
      grouped.set(
        key,
        []
      );
    }

    grouped.get(key).push(product);
  }

  const accepted = [];
  const rejected = {
    singleProduct: 0,
    unsafeSubstance: 0,
    multipleActiveProducts: 0,
    sameRegistrationOnly: 0,
  };

  for (const [name, products] of grouped.entries()) {
    if (products.length < 2) {
      rejected.singleProduct += 1;
      continue;
    }

    const registrations =
      new Set(
        products
          .map(
            (product) =>
              product.registration_number
          )
          .filter(Boolean)
      );

    if (registrations.size < 2) {
      rejected.sameRegistrationOnly += 1;
      continue;
    }

    const substance =
      sameSafeSubstance(
        products,
        relationIndex
      );

    if (!substance) {
      rejected.unsafeSubstance += 1;
      continue;
    }

    const active =
      products.filter(
        (product) =>
          product.active === true
      );

    if (active.length > 1) {
      rejected.multipleActiveProducts += 1;
      continue;
    }

    const canonicalSource =
      active[0] ??
      products[0];

    accepted.push({
      canonicalName:
        canonicalSource.product_name,

      normalizedName:
        name,

      substance,

      currentProduct:
        active.length === 1
          ? active[0]
          : null,

      products:
        products
          .slice()
          .sort((a, b) => {
            if (
              a.active !== b.active
            ) {
              return a.active
                ? -1
                : 1;
            }

            return String(
              a.registration_number ?? ""
            ).localeCompare(
              String(
                b.registration_number ?? ""
              )
            );
          }),
    });
  }

  accepted.sort(
    (a, b) =>
      a.normalizedName.localeCompare(
        b.normalizedName
      )
  );

  return {
    accepted,
    rejected,
  };
}

function printCandidate(candidate) {
  console.log(
    "\n------------------------------------------------------------"
  );

  console.log(
    "Identidade: " +
    candidate.canonicalName
  );

  console.log(
    "Substância segura: " +
    candidate.substance.name
  );

  console.log(
    "Produto atual: " +
    (
      candidate.currentProduct
        ? candidate.currentProduct.product_name +
          " | registro " +
          (
            candidate.currentProduct.registration_number ??
            "?"
          ) +
          " | fabricante " +
          (
            candidate.currentProduct.manufacturer ??
            "?"
          )
        : "(nenhum membro ativo)"
    )
  );

  console.log(
    "Membros: " +
    candidate.products.length
  );

  for (const product of candidate.products) {
    console.log(
      "  " +
      (
        product.active
          ? "🟢 current   "
          : "⚪ historical"
      ) +
      " | registro " +
      (
        product.registration_number ??
        "?"
      ) +
      " | CO_SEQ " +
      (
        product.external_id ??
        "?"
      ) +
      " | " +
      (
        product.manufacturer ??
        "fabricante não informado"
      )
    );
  }
}

async function main() {
  console.log(
    "🧠 VAULT — AUDITOR 4E7 DE IDENTIDADES COMERCIAIS\n"
  );

  console.log(
    "🚫 SOMENTE LEITURA"
  );

  console.log(
    "🚫 Nenhum INSERT/UPDATE/DELETE"
  );

  console.log(
    "🎯 Regra: marca + mesmo nome + mesma substância segura + registros diferentes.\n"
  );

  const supabase =
    createAdminClient();

  const brands =
    await loadBrands(
      supabase
    );

  const relations =
    await loadRelations(
      supabase
    );

  const relationIndex =
    buildRelationIndex(
      relations
    );

  const result =
    buildCandidates(
      brands,
      relationIndex
    );

  console.log(
    "============================================================"
  );

  console.log(
    "📊 RESUMO"
  );

  console.log(
    "Produtos brand analisados: " +
    brands.length
  );

  console.log(
    "Identidades candidatas seguras: " +
    result.accepted.length
  );

  console.log(
    "Grupos descartados por apenas 1 produto: " +
    result.rejected.singleProduct
  );

  console.log(
    "Grupos descartados por substância insegura/diferente: " +
    result.rejected.unsafeSubstance
  );

  console.log(
    "Grupos descartados por >1 produto ativo: " +
    result.rejected.multipleActiveProducts
  );

  console.log(
    "Grupos descartados sem múltiplos registros: " +
    result.rejected.sameRegistrationOnly
  );

  console.log(
    "\n============================================================"
  );

  console.log(
    "🎯 CASOS-ALVO"
  );

  for (const target of TARGETS) {
    const found =
      result.accepted.find(
        (candidate) =>
          candidate.normalizedName ===
          normalizeText(target)
      );

    if (!found) {
      console.log(
        "\n❌ " +
        target.toUpperCase() +
        " não virou candidato seguro."
      );

      continue;
    }

    console.log(
      "\n✅ " +
      target.toUpperCase() +
      " virou candidato seguro."
    );

    printCandidate(found);
  }

  console.log(
    "\n============================================================"
  );

  console.log(
    "🧪 PRIMEIRAS 20 IDENTIDADES SEGURAS"
  );

  for (
    const candidate of
    result.accepted.slice(0, 20)
  ) {
    printCandidate(
      candidate
    );
  }

  console.log(
    "\n============================================================"
  );

  console.log(
    "✅ AUDITORIA 4E7 CONCLUÍDA."
  );

  console.log(
    "🧾 Nenhuma identidade foi persistida."
  );

  console.log(
    "🏥 Envie esta saída antes de aplicar a migration ou criar memberships."
  );
}

main().catch(
  (error) => {
    console.error(
      "\n❌ AUDITORIA 4E7 FALHOU"
    );

    console.error(
      error instanceof Error
        ? error.stack ||
          error.message
        : error
    );

    process.exit(1);
  }
);
