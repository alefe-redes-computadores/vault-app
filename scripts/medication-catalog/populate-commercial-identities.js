// scripts/medication-catalog/populate-commercial-identities.js

"use strict";

const { createAdminClient } = require("./admin-client");

const BATCH_SIZE = 200;
const APPLY_CONFIRMATION = "POPULATE_COMMERCIAL_IDENTITIES";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunk(values, size) {
  const result = [];

  for (let i = 0; i < values.length; i += size) {
    result.push(
      values.slice(i, i + size)
    );
  }

  return result;
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

function getSameSafeSubstance(
  products,
  relationIndex
) {
  let reference = null;

  for (const product of products) {
    const relations =
      relationIndex.get(product.id) ?? [];

    if (relations.length !== 1) {
      return null;
    }

    const substance =
      relations[0].medication_substances;

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
        name: substance.canonical_name,
        normalizedName:
          substance.canonical_name_normalized,
      };

      continue;
    }

    if (substance.id !== reference.id) {
      return null;
    }
  }

  return reference;
}

function buildCandidates(
  brands,
  relationIndex
) {
  const grouped = new Map();

  for (const product of brands) {
    const key =
      product.product_name_normalized ||
      normalizeText(product.product_name);

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
      getSameSafeSubstance(
        products,
        relationIndex
      );

    if (!substance) {
      rejected.unsafeSubstance += 1;
      continue;
    }

    const activeProducts =
      products.filter(
        (product) =>
          product.active === true
      );

    if (activeProducts.length > 1) {
      rejected.multipleActiveProducts += 1;
      continue;
    }

    const canonicalSource =
      activeProducts[0] ??
      products[0];

    accepted.push({
      canonicalName:
        canonicalSource.product_name,

      normalizedName: name,

      substance,

      currentProduct:
        activeProducts.length === 1
          ? activeProducts[0]
          : null,

      products:
        products
          .slice()
          .sort((a, b) => {
            if (a.active !== b.active) {
              return a.active ? -1 : 1;
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

async function countTable(
  supabase,
  table
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", {
      head: true,
      count: "exact",
    });

  if (error) {
    throw new Error(
      "Falha ao acessar " +
      table +
      ": " +
      error.message
    );
  }

  return count ?? 0;
}

async function assertDestinationEmpty(
  supabase
) {
  const identities =
    await countTable(
      supabase,
      "medication_commercial_identities"
    );

  const memberships =
    await countTable(
      supabase,
      "medication_product_identity_memberships"
    );

  console.log(
    "Identidades já existentes: " +
    identities
  );

  console.log(
    "Memberships já existentes: " +
    memberships
  );

  if (
    identities !== 0 ||
    memberships !== 0
  ) {
    throw new Error(
      "Carga inicial bloqueada: tabelas de identidade não estão vazias."
    );
  }
}

async function insertIdentityBatches(
  supabase,
  candidates
) {
  const batches =
    chunk(
      candidates,
      BATCH_SIZE
    );

  const inserted = [];

  for (
    let index = 0;
    index < batches.length;
    index += 1
  ) {
    const rows =
      batches[index].map(
        (candidate) => ({
          canonical_name:
            candidate.canonicalName,

          canonical_name_normalized:
            candidate.normalizedName,

          current_product_id:
            candidate.currentProduct
              ? candidate.currentProduct.id
              : null,
        })
      );

    console.log(
      "📦 identities " +
      String(index + 1) +
      "/" +
      String(batches.length)
    );

    const { data, error } =
      await supabase
        .from(
          "medication_commercial_identities"
        )
        .insert(rows)
        .select(
          "id, canonical_name_normalized"
        );

    if (error) {
      throw new Error(
        "Falha ao inserir identities lote " +
        String(index + 1) +
        ": " +
        error.message
      );
    }

    inserted.push(
      ...(data ?? [])
    );
  }

  return inserted;
}

async function insertMembershipBatches(
  supabase,
  rows
) {
  const batches =
    chunk(
      rows,
      BATCH_SIZE
    );

  for (
    let index = 0;
    index < batches.length;
    index += 1
  ) {
    console.log(
      "📦 memberships " +
      String(index + 1) +
      "/" +
      String(batches.length)
    );

    const { error } =
      await supabase
        .from(
          "medication_product_identity_memberships"
        )
        .insert(
          batches[index]
        );

    if (error) {
      throw new Error(
        "Falha ao inserir memberships lote " +
        String(index + 1) +
        ": " +
        error.message
      );
    }
  }
}

async function cleanupInserted(
  supabase,
  identityIds
) {
  if (!identityIds.length) {
    return;
  }

  console.log(
    "\n🧹 Limpando identidades inseridas pela tentativa incompleta..."
  );

  for (
    const ids of chunk(
      identityIds,
      100
    )
  ) {
    const { error } =
      await supabase
        .from(
          "medication_commercial_identities"
        )
        .delete()
        .in(
          "id",
          ids
        );

    if (error) {
      console.error(
        "⚠️ Falha no cleanup: " +
        error.message
      );
    }
  }
}

async function verifyResult(
  supabase,
  expectedIdentities,
  expectedMemberships
) {
  const identities =
    await countTable(
      supabase,
      "medication_commercial_identities"
    );

  const memberships =
    await countTable(
      supabase,
      "medication_product_identity_memberships"
    );

  console.log(
    "\n🔬 AUDITORIA FINAL"
  );

  console.log(
    "Identidades: " +
    identities +
    " / esperado " +
    expectedIdentities
  );

  console.log(
    "Memberships: " +
    memberships +
    " / esperado " +
    expectedMemberships
  );

  if (
    identities !== expectedIdentities ||
    memberships !== expectedMemberships
  ) {
    throw new Error(
      "Contagens finais divergentes."
    );
  }
}

async function printTarget(
  supabase,
  normalizedName
) {
  const { data, error } = await supabase
    .from(
      "medication_commercial_identities"
    )
    .select(
      [
        "id",
        "canonical_name",
        "current_product_id",
        "medication_product_identity_memberships(" +
          "relationship_type," +
          "confidence," +
          "evidence," +
          "medication_products(" +
            "product_name," +
            "registration_number," +
            "manufacturer," +
            "active" +
          ")" +
        ")",
      ].join(", ")
    )
    .eq(
      "canonical_name_normalized",
      normalizedName
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      "Falha ao auditar identidade " +
      normalizedName +
      ": " +
      error.message
    );
  }

  console.log(
    "\n🎯 " +
    normalizedName.toUpperCase()
  );

  console.log(
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

async function apply(
  supabase,
  candidates
) {
  await assertDestinationEmpty(
    supabase
  );

  const expectedMemberships =
    candidates.reduce(
      (total, candidate) =>
        total +
        candidate.products.length,
      0
    );

  let insertedIdentityIds = [];

  try {
    const inserted =
      await insertIdentityBatches(
        supabase,
        candidates
      );

    insertedIdentityIds =
      inserted.map(
        (item) => item.id
      );

    if (
      inserted.length !==
      candidates.length
    ) {
      throw new Error(
        "Quantidade de identities retornadas divergiu."
      );
    }

    const identityIdByName =
      new Map(
        inserted.map(
          (item) => [
            item.canonical_name_normalized,
            item.id,
          ]
        )
      );

    const membershipRows = [];

    for (const candidate of candidates) {
      const identityId =
        identityIdByName.get(
          candidate.normalizedName
        );

      if (!identityId) {
        throw new Error(
          "Identity UUID não resolvido para " +
          candidate.normalizedName
        );
      }

      for (const product of candidate.products) {
        membershipRows.push({
          identity_id:
            identityId,

          product_id:
            product.id,

          relationship_type:
            candidate.currentProduct &&
            candidate.currentProduct.id ===
              product.id
              ? "current"
              : "historical",

          confidence:
            "high",

          evidence:
            "Same normalized commercial name; " +
            "same single safe substance; " +
            "different official registrations.",
        });
      }
    }

    await insertMembershipBatches(
      supabase,
      membershipRows
    );

    await verifyResult(
      supabase,
      candidates.length,
      expectedMemberships
    );

    await printTarget(
      supabase,
      "venvanse"
    );

    await printTarget(
      supabase,
      "rivotril"
    );

    console.log(
      "\n✅ IDENTIDADES COMERCIAIS PERSISTIDAS COM SUCESSO."
    );
  } catch (error) {
    await cleanupInserted(
      supabase,
      insertedIdentityIds
    );

    throw error;
  }
}

async function main() {
  const args =
    process.argv.slice(2);

  const isDryRun =
    args.includes("--dry-run");

  const isApply =
    args.includes("--apply");

  const confirmArg =
    args.find(
      (arg) =>
        arg.startsWith(
          "--confirm="
        )
    );

  const confirmation =
    confirmArg
      ? confirmArg.slice(
          "--confirm=".length
        )
      : null;

  if (isDryRun === isApply) {
    throw new Error(
      "Escolha exatamente um modo: --dry-run OU --apply."
    );
  }

  if (
    isApply &&
    confirmation !==
      APPLY_CONFIRMATION
  ) {
    throw new Error(
      "Modo --apply exige --confirm=" +
      APPLY_CONFIRMATION
    );
  }

  console.log(
    "🧠 VAULT — POPULADOR 4E7B.2\n"
  );

  console.log(
    isDryRun
      ? "🧪 MODO DRY-RUN — ZERO ESCRITAS"
      : "🔴 MODO APPLY — ESCRITA ADMINISTRATIVA"
  );

  console.log(
    "🎯 Somente identidades brand com evidência HIGH.\n"
  );

  const supabase =
    createAdminClient();

  await assertDestinationEmpty(
    supabase
  );

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

  const membershipCount =
    result.accepted.reduce(
      (total, candidate) =>
        total +
        candidate.products.length,
      0
    );

  console.log(
    "\n============================================================"
  );

  console.log(
    "📊 PACOTE DE IDENTIDADES"
  );

  console.log(
    "Produtos brand analisados: " +
    brands.length
  );

  console.log(
    "Identidades seguras: " +
    result.accepted.length
  );

  console.log(
    "Memberships: " +
    membershipCount
  );

  console.log(
    "Descartados — substância insegura/diferente: " +
    result.rejected.unsafeSubstance
  );

  console.log(
    "Descartados — >1 produto ativo: " +
    result.rejected.multipleActiveProducts
  );

  const venvanse =
    result.accepted.find(
      (item) =>
        item.normalizedName ===
        "venvanse"
    );

  const rivotril =
    result.accepted.find(
      (item) =>
        item.normalizedName ===
        "rivotril"
    );

  if (!venvanse || !rivotril) {
    throw new Error(
      "Casos-alvo VENVANSE/RIVOTRIL deixaram de passar pela regra segura."
    );
  }

  console.log(
    "\n✅ VENVANSE presente no pacote."
  );

  console.log(
    "✅ RIVOTRIL presente no pacote."
  );

  if (result.accepted.length !== 391) {
    throw new Error(
      "Quantidade de identidades mudou: esperado 391, encontrado " +
      result.accepted.length +
      ". APPLY bloqueado."
    );
  }

  if (isDryRun) {
    console.log(
      "\n============================================================"
    );

    console.log(
      "✅ DRY-RUN 4E7B.2 CONCLUÍDO."
    );

    console.log(
      "🧾 Nenhuma identidade ou membership foi gravado."
    );

    console.log(
      "🏥 Envie esta saída antes do --apply."
    );

    return;
  }

  await apply(
    supabase,
    result.accepted
  );
}

main().catch(
  (error) => {
    console.error(
      "\n❌ POPULADOR 4E7B.2 ABORTADO"
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
