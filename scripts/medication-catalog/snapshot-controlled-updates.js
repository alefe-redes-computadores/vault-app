// scripts/medication-catalog/snapshot-controlled-updates.js

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const SOURCE_DIR =
  path.join(
    ROOT,
    ".medication-catalog-audit/sources"
  );

const UPDATE_DIR =
  path.join(
    SOURCE_DIR,
    "updates"
  );

const MANIFEST_FILE =
  path.join(
    UPDATE_DIR,
    "manifest-updates-97-102.json"
  );

const SOURCES = [
  {
    update: 97,
    resolution: "RDC 999/2025",
    date: "2025-11-24",
    url:
      "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/RDC9992025.pdf/@@display-file/file",
    expectedType: "pdf",
  },
  {
    update: 98,
    resolution: "RDC 1.011/2026",
    date: "2026-01-30",
    url:
      "https://anvisalegis.datalegis.net/action/UrlPublicasAction.php?acao=abrirAtoPublico&num_ato=00001011&sgl_tipo=RDC&sgl_orgao=RDC/DC/ANVISA/MS&vlr_ano=2026&seq_ato=000&cod_modulo=134&cod_menu=1696",
    expectedType: "html",
  },
  {
    update: 99,
    resolution: "RDC 1.017/2026",
    date: "2026-02-20",
    url:
      "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&tipo=RDC&numeroAto=00001017&seqAto=000&valorAno=2026&orgao=RDC/DC/ANVISA/MS&codTipo=&desItem=&desItemFim=&cod_menu=1696&cod_modulo=134&pesquisa=true",
    expectedType: "html",
  },
  {
    update: 100,
    resolution: "RDC 1.021/2026",
    date: "2026-04-09",
    url:
      "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&tipo=RDC&numeroAto=00001021&seqAto=000&valorAno=2026&orgao=RDC/DC/ANVISA/MS&codTipo=&desItem=&desItemFim=&cod_menu=1696&cod_modulo=134&pesquisa=true",
    expectedType: "html",
  },
  {
    update: 101,
    resolution: "RDC 1.023/2026",
    date: "2026-05-11",
    url:
      "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&tipo=RDC&numeroAto=00001023&seqAto=000&valorAno=2026&orgao=RDC/DC/ANVISA/MS&codTipo=&desItem=&desItemFim=&cod_menu=1696&cod_modulo=134&pesquisa=true",
    expectedType: "html",
  },
  {
    update: 102,
    resolution: "RDC 1.036/2026",
    date: "2026-07-09",
    url:
      "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&tipo=RDC&numeroAto=00001036&seqAto=000&valorAno=2026&orgao=RDC/DC/ANVISA/MS&codTipo=&desItem=&desItemFim=&cod_menu=1696&cod_modulo=134&pesquisa=true",
    expectedType: "html",
  },
];

function sha256(
  buffer
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      buffer
    )
    .digest(
      "hex"
    );
}

function normalizeText(
  value
) {
  return String(
    value ??
      ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function detectKnownErrorPage(
  buffer
) {
  const text =
    normalizeText(
      buffer.toString(
        "utf8"
      )
    );

  const markers = [
    "ora-28001",
    "password has expired",
    "senha expirou",
    "oracle",
    "erro interno",
    "internal server error",
    "application error",
    "exception report",
  ];

  return markers.filter(
    (
      marker
    ) =>
      text.includes(
        normalizeText(
          marker
        )
      )
  );
}

function validatePdf(
  buffer,
  source
) {
  const signature =
    buffer
      .subarray(
        0,
        5
      )
      .toString(
        "ascii"
      );

  if (
    signature !==
    "%PDF-"
  ) {
    return {
      valid: false,
      reason:
        "missing_pdf_signature",
    };
  }

  if (
    buffer.length <
    5000
  ) {
    return {
      valid: false,
      reason:
        "pdf_too_small",
    };
  }

  return {
    valid: true,
    reason: null,
  };
}

function validateHtml(
  buffer,
  source
) {
  if (
    buffer.length <
    500
  ) {
    return {
      valid: false,
      reason:
        "response_too_small",
    };
  }

  const errors =
    detectKnownErrorPage(
      buffer
    );

  if (
    errors.length >
    0
  ) {
    return {
      valid: false,
      reason:
        "known_error_page",
      errorMarkers:
        errors,
    };
  }

  const text =
    normalizeText(
      buffer.toString(
        "utf8"
      )
    );

  const resolutionNumber =
    normalizeText(
      source.resolution
        .replace(
          "RDC ",
          ""
        )
        .replace(
          "/",
          " "
        )
    );

  const hasResolution =
    text.includes(
      resolutionNumber
    );

  const hasControlledContext =
    (
      text.includes(
        "portaria"
      ) &&
      text.includes(
        "344"
      )
    ) ||
    text.includes(
      "substancias"
    );

  if (
    !hasResolution &&
    !hasControlledContext
  ) {
    return {
      valid: false,
      reason:
        "expected_regulatory_markers_missing",
    };
  }

  return {
    valid: true,
    reason: null,
  };
}

async function fetchSource(
  source
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      45000
    );

  try {
    const response =
      await fetch(
        source.url,
        {
          redirect:
            "follow",

          signal:
            controller.signal,

          headers: {
            "user-agent":
              "VaultMedicationCatalog/1.0 regulatory-audit",

            accept:
              source.expectedType ===
              "pdf"
                ? "application/pdf,*/*"
                : "text/html,*/*",
          },
        }
      );

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    return {
      httpOk:
        response.ok,

      status:
        response.status,

      statusText:
        response.statusText,

      finalUrl:
        response.url,

      contentType:
        response.headers.get(
          "content-type"
        ),

      buffer,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

async function main() {
  console.log(
    "🧠 VAULT — SNAPSHOT DAS UPDATES 97 → 102\n"
  );

  console.log(
    "🚫 Nenhuma conexão com Supabase."
  );

  console.log(
    "🚫 Página de erro nunca será promovida como fonte válida.\n"
  );

  fs.mkdirSync(
    UPDATE_DIR,
    {
      recursive:
        true,
    }
  );

  const results = [];

  for (
    const source of
      SOURCES
  ) {
    console.log(
      "────────────────────────────────────────────────────────"
    );

    console.log(
      "🌐 UPDATE " +
        source.update +
        " — " +
        source.resolution
    );

    try {
      const fetched =
        await fetchSource(
          source
        );

      console.log(
        "   HTTP: " +
          fetched.status +
          " " +
          fetched.statusText
      );

      console.log(
        "   Content-Type: " +
          (
            fetched.contentType ??
            "não informado"
          )
      );

      console.log(
        "   Bytes: " +
          fetched.buffer.length
      );

      const validation =
        source.expectedType ===
        "pdf"
          ? validatePdf(
              fetched.buffer,
              source
            )
          : validateHtml(
              fetched.buffer,
              source
            );

      if (
        !fetched.httpOk ||
        !validation.valid
      ) {
        console.log(
          "   ⚠️ NÃO PROMOVIDO"
        );

        console.log(
          "   Motivo: " +
            (
              validation.reason ??
              "http_error"
            )
        );

        if (
          validation.errorMarkers
            ?.length
        ) {
          console.log(
            "   Marcadores: " +
              validation.errorMarkers.join(
                ", "
              )
          );
        }

        results.push(
          {
            ...source,

            status:
              "unavailable",

            httpStatus:
              fetched.status,

            finalUrl:
              fetched.finalUrl,

            contentType:
              fetched.contentType,

            bytes:
              fetched.buffer.length,

            validation,
          }
        );

        continue;
      }

      const extension =
        source.expectedType ===
        "pdf"
          ? ".pdf"
          : ".html";

      const filename =
        "update-" +
        source.update +
        "-" +
        source.resolution
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          ) +
        extension;

      const target =
        path.join(
          UPDATE_DIR,
          filename
        );

      const temp =
        target +
        ".tmp";

      fs.writeFileSync(
        temp,
        fetched.buffer
      );

      fs.renameSync(
        temp,
        target
      );

      const hash =
        sha256(
          fetched.buffer
        );

      console.log(
        "   ✅ FONTE VALIDADA"
      );

      console.log(
        "   SHA-256: " +
          hash
      );

      results.push(
        {
          ...source,

          status:
            "available",

          httpStatus:
            fetched.status,

          finalUrl:
            fetched.finalUrl,

          contentType:
            fetched.contentType,

          bytes:
            fetched.buffer.length,

          sha256:
            hash,

          filename,
        }
      );
    } catch (
      error
    ) {
      console.log(
        "   ⚠️ INDISPONÍVEL"
      );

      console.log(
        "   Erro: " +
          (
            error instanceof
              Error
              ? error.message
              : String(
                  error
                )
          )
      );

      results.push(
        {
          ...source,

          status:
            "unavailable",

          error:
            error instanceof
              Error
              ? error.message
              : String(
                  error
                ),
        }
      );
    }
  }

  const available =
    results.filter(
      (
        item
      ) =>
        item.status ===
        "available"
    );

  const unavailable =
    results.filter(
      (
        item
      ) =>
        item.status ===
        "unavailable"
    );

  const manifest = {
    generatedAt:
      new Date()
        .toISOString(),

    authority:
      "ANVISA",

    purpose:
      "Vault controlled substances regulatory provenance",

    updates:
      results,

    summary: {
      requested:
        results.length,

      available:
        available.length,

      unavailable:
        unavailable.length,
    },

    safety: {
      supabaseWrites:
        false,

      errorPagesPromoted:
        false,

      note:
        "Uma fonte indisponível não é tratada como conteúdo regulatório válido.",
    },
  };

  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify(
      manifest,
      null,
      2
    ) +
      "\n"
  );

  console.log(
    "\n📊 RESULTADO"
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "Solicitadas:   " +
      results.length
  );

  console.log(
    "Disponíveis:   " +
      available.length
  );

  console.log(
    "Indisponíveis: " +
      unavailable.length
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "\n📦 FONTES DISPONÍVEIS"
  );

  if (
    available.length ===
    0
  ) {
    console.log(
      "   nenhuma"
    );
  } else {
    for (
      const item of
        available
    ) {
      console.log(
        "   ✅ update " +
          item.update +
          " — " +
          item.resolution +
          " — " +
          item.filename
      );
    }
  }

  console.log(
    "\n⚠️ FONTES INDISPONÍVEIS"
  );

  if (
    unavailable.length ===
    0
  ) {
    console.log(
      "   nenhuma"
    );
  } else {
    for (
      const item of
        unavailable
    ) {
      console.log(
        "   ⚠️ update " +
          item.update +
          " — " +
          item.resolution +
          " — " +
          (
            item.validation
              ?.reason ??
            item.error ??
            "indisponível"
          )
      );
    }
  }

  console.log(
    "\n📝 Manifesto:"
  );

  console.log(
    "   " +
      MANIFEST_FILE
  );

  console.log(
    "\n🚫 Nenhuma escrita no Supabase."
  );

  console.log(
    "✅ Snapshot concluído."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ SNAPSHOT FALHOU:"
      );

      console.error(
        error instanceof
          Error
          ? error.stack ||
              error.message
          : error
      );

      console.error(
        "\n🚫 Nenhuma escrita no Supabase."
      );

      process.exit(
        1
      );
    }
  );
