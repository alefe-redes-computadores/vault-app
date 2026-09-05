// scripts/medication-catalog/trace-brand-presentations.js

"use strict";

const { createAdminClient } = require("./admin-client");

const TARGETS = [
  "VENVANSE",
  "RIVOTRIL",
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

async function getProducts(supabase, target) {
  const normalized = normalizeText(target);

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
        "source_version_id",
      ].join(", ")
    )
    .eq("product_name_normalized", normalized)
    .order("active", {
      ascending: false,
    })
    .order("registration_number", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      "Falha ao buscar produtos de " +
      target +
      ": " +
      error.message
    );
  }

  return data ?? [];
}

async function getPresentationsForProduct(
  supabase,
  productId
) {
  const { data, error } = await supabase
    .from("medication_presentations")
    .select(
      [
        "id",
        "product_id",
        "presentation_label",
        "external_registration",
        "ggrem_code",
        "ean",
        "external_id",
        "active",
        "source_version_id",
      ].join(", ")
    )
    .eq("product_id", productId)
    .order("external_registration", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      "Falha ao buscar apresentações do produto " +
      productId +
      ": " +
      error.message
    );
  }

  return data ?? [];
}

async function getPresentationsByRegistrationPrefix(
  supabase,
  registration
) {
  if (!registration) {
    return [];
  }

  const { data, error } = await supabase
    .from("medication_presentations")
    .select(
      [
        "id",
        "product_id",
        "presentation_label",
        "external_registration",
        "ggrem_code",
        "ean",
        "active",
      ].join(", ")
    )
    .like(
      "external_registration",
      registration + "%"
    )
    .order("external_registration", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      "Falha ao procurar prefixo " +
      registration +
      ": " +
      error.message
    );
  }

  return data ?? [];
}

async function hydratePresentationOwners(
  supabase,
  presentations
) {
  const productIds = Array.from(
    new Set(
      presentations
        .map((item) => item.product_id)
        .filter(Boolean)
    )
  );

  if (!productIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("medication_products")
    .select(
      [
        "id",
        "external_id",
        "product_name",
        "product_kind",
        "manufacturer",
        "registration_number",
        "active",
      ].join(", ")
    )
    .in("id", productIds);

  if (error) {
    throw new Error(
      "Falha ao hidratar donos das apresentações: " +
      error.message
    );
  }

  return new Map(
    (data ?? []).map(
      (item) => [
        item.id,
        item,
      ]
    )
  );
}

async function traceTarget(
  supabase,
  target
) {
  console.log(
    "\n============================================================"
  );

  console.log(
    "🎯 " + target
  );

  const products =
    await getProducts(
      supabase,
      target
    );

  console.log(
    "\nProdutos exatos encontrados: " +
    products.length
  );

  if (!products.length) {
    console.log(
      "❌ Nenhum produto exato."
    );

    return;
  }

  for (const product of products) {
    console.log(
      "\n------------------------------------------------------------"
    );

    console.log(
      "Produto: " +
      product.product_name
    );

    console.log(
      "UUID: " +
      product.id
    );

    console.log(
      "CO_SEQ / external_id: " +
      (
        product.external_id ||
        "(vazio)"
      )
    );

    console.log(
      "Registro-base: " +
      (
        product.registration_number ||
        "(vazio)"
      )
    );

    console.log(
      "Tipo: " +
      product.product_kind
    );

    console.log(
      "Ativo: " +
      product.active
    );

    console.log(
      "Fabricante: " +
      (
        product.manufacturer ||
        "(vazio)"
      )
    );

    const direct =
      await getPresentationsForProduct(
        supabase,
        product.id
      );

    console.log(
      "Apresentações diretamente ligadas: " +
      direct.length
    );

    for (const item of direct.slice(0, 20)) {
      console.log(
        "  ✓ " +
        item.external_registration +
        " | " +
        item.presentation_label
      );
    }

    const byPrefix =
      await getPresentationsByRegistrationPrefix(
        supabase,
        product.registration_number
      );

    console.log(
      "Apresentações encontradas pelo prefixo do registro: " +
      byPrefix.length
    );

    const owners =
      await hydratePresentationOwners(
        supabase,
        byPrefix
      );

    for (const presentation of byPrefix.slice(0, 30)) {
      const owner =
        owners.get(
          presentation.product_id
        );

      console.log(
        "  → " +
        presentation.external_registration +
        " | " +
        presentation.presentation_label
      );

      console.log(
        "     ligado a: " +
        (
          owner
            ? owner.product_name +
              " | registro " +
              (owner.registration_number || "?") +
              " | external_id " +
              (owner.external_id || "?") +
              " | ativo=" +
              String(owner.active)
            : "PRODUTO NÃO ENCONTRADO"
        )
      );
    }
  }
}

async function main() {
  console.log(
    "🧠 VAULT — RASTREAMENTO 4E6 DE APRESENTAÇÕES\n"
  );

  console.log(
    "🚫 SOMENTE LEITURA"
  );

  console.log(
    "🚫 Nenhum INSERT/UPDATE/DELETE"
  );

  console.log(
    "🔬 Investigando VENVANSE e RIVOTRIL.\n"
  );

  const supabase =
    createAdminClient();

  for (const target of TARGETS) {
    await traceTarget(
      supabase,
      target
    );
  }

  console.log(
    "\n============================================================"
  );

  console.log(
    "✅ RASTREAMENTO 4E6 CONCLUÍDO."
  );

  console.log(
    "🧾 Nenhum dado foi alterado."
  );

  console.log(
    "🏥 Envie esta saída para definirmos a correção semântica."
  );
}

main().catch((error) => {
  console.error(
    "\n❌ RASTREAMENTO 4E6 FALHOU"
  );

  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );

  process.exit(1);
});
