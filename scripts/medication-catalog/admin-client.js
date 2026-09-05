// scripts/medication-catalog/admin-client.js

"use strict";

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const root = path.resolve(__dirname, "../..");
  const envPath = path.join(root, ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local não encontrado.");
  }

  const text = fs.readFileSync(envPath, "utf8");

  function read(name) {
    const line = text
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith(name + "="));

    if (!line) return null;

    let value = line.slice(line.indexOf("=") + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value || null;
  }

  return {
    url: read("NEXT_PUBLIC_SUPABASE_URL"),
    secret: read("SUPABASE_SECRET_KEY"),
  };
}

function createAdminClient() {
  const { url, secret } = loadEnvLocal();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente.");
  }

  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY ausente.");
  }

  if (!secret.startsWith("sb_secret_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY inválida ou formato inesperado."
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

module.exports = {
  createAdminClient,
};

if (require.main === module) {
  (async () => {
    console.log("🧠 VAULT — TESTE 4E2 DO CLIENTE ADMINISTRATIVO\n");
    console.log("🚫 MODO SOMENTE LEITURA");
    console.log("🔒 Secret key não será exibida.\n");

    const supabase = createAdminClient();

    const tables = [
      "medication_catalog_versions",
      "medication_substances",
      "medication_products",
      "medication_product_substances",
      "medication_aliases",
      "medication_presentations",
      "medication_regulatory_rules",
    ];

    let failed = false;

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select("*", {
          count: "exact",
          head: true,
        });

      if (error) {
        failed = true;
        console.log(
          "❌ " + table + ": " + error.message
        );
      } else {
        console.log(
          "✅ " + table + ": " + String(count ?? 0) + " registros"
        );
      }
    }

    console.log("");

    if (failed) {
      console.log(
        "❌ Uma ou mais leituras falharam."
      );
      process.exit(1);
    }

    console.log(
      "✅ Cliente administrativo autenticado e catálogo acessível."
    );

    console.log(
      "🧾 Nenhum INSERT/UPDATE/DELETE foi executado."
    );
  })().catch((error) => {
    console.error(
      "\n❌ Falha no teste administrativo:"
    );

    console.error(
      error instanceof Error
        ? error.stack || error.message
        : error
    );

    process.exit(1);
  });
}
