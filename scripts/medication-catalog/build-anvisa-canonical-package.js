// scripts/medication-catalog/build-anvisa-canonical-package.js

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const { execFileSync } = require("child_process");
const { TextDecoder } = require("util");

const TLS_VERIFICATION_BYPASSED = false;
const { reconcileOfficialRows } = require("./catalog-integrity-r01.cjs");

const SOURCES = {
  consulta: {
    key: "anvisa_consulta_medicamentos",
    label: "TA_CONSULTA_MEDICAMENTOS.CSV",
    url: "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
  },
  precos: {
    key: "anvisa_precos_medicamentos",
    label: "TA_PRECOS_MEDICAMENTOS.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv",
  },
  restricoes: {
    key: "anvisa_restricao_medicamento",
    label: "TA_RESTRICAO_MEDICAMENTO.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv",
  },
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

function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}

function cleanValue(value) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function splitCodes(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function decodeBuffer(buffer) {
  try {
    return {
      encoding: "utf-8",
      text: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    };
  } catch {
    // Explicit CP1252 mapping: some Node/ICU builds treat this label as Latin-1.
    // Reject undefined CP1252 bytes instead of manufacturing replacement characters.
    const cp1252 = [0x20ac, null, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
      0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, null, 0x017d, null,
      null, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
      0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, null, 0x017e, 0x0178];
    const text = buffer.toString("latin1").replace(/[\x80-\x9f]/g, c => {
      const cp = cp1252[c.charCodeAt(0) - 0x80];
      if (cp === null) throw new Error("Byte indefinido em CP1252: 0x" + c.charCodeAt(0).toString(16));
      return String.fromCodePoint(cp);
    });
    return { encoding: "windows-1252", text };
  }
}

function detectDelimiter(headerLine) {
  const candidates = [";", ",", "|", "\t"];
  let best = ";";
  let bestCount = -1;

  for (const delimiter of candidates) {
    let quoted = false;
    let count = 0;

    for (let i = 0; i < headerLine.length; i += 1) {
      const char = headerLine[i];

      if (char === '"') {
        if (quoted && headerLine[i + 1] === '"') {
          i += 1;
          continue;
        }

        quoted = !quoted;
        continue;
      }

      if (!quoted && char === delimiter) {
        count += 1;
      }
    }

    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

// R03: CSV state machine. A quote opens a quoted field only at its start.
// Quotes in unquoted fields are literal (also Python csv.reader semantics).
// Never pad, truncate, infer a delimiter from data rows or discard bad rows.
function scanCsv(text, delimiter, onRow) {
  let row=[], field='', state='start', line=1, startLine=1, startOffset=0, literalQuotes=0, records=0;
  const emit=(endOffset)=>{
    row.push(field); records++;
    onRow(row,{startLine,endLine:line,startOffset,endOffset,record:records});
    row=[];field='';state='start';
  };
  const error=(message,offset)=>{const e=new Error(`${message}; linha física ${line}, registro ${records+1}`);e.csv={line,startLine,startOffset,offset,record:records+1};throw e;};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(state==='quoted'){
      if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else state='closed';}
      else {field+=c;if(c==='\r'){if(text[i+1]==='\n'){field+='\n';i++;}line++;}else if(c==='\n')line++;}
      continue;
    }
    if(c===delimiter){row.push(field);field='';state='start';continue;}
    if(c==='\r'||c==='\n'){
      emit(i);if(c==='\r'&&text[i+1]==='\n')i++;line++;startLine=line;startOffset=i+1;continue;
    }
    if(state==='closed')error('CSV contém caractere após fechamento de aspas',i);
    if(c==='"'&&state==='start'){state='quoted';continue;}
    if(c==='"')literalQuotes++;
    field+=c;state='bare';
  }
  if(state==='quoted')error('CSV com aspas não encerradas',text.length);
  if(state!=='start'||row.length||field.length)emit(text.length);
  return {records,literalQuotes,physicalLines:line};
}
const csvLocation=new WeakMap();
function parseCsv(text,delimiter){
  const rows=[];
  scanCsv(text,delimiter,(raw,loc)=>{const row=raw.map(v=>v.trim());if(loc.startOffset===loc.endOffset)return;csvLocation.set(row,loc);rows.push(row);});
  return rows;
}
function rowsToObjects(rows){
  if(!rows.length)return [];
  const headers=rows[0].map(v=>v.replace(/^\uFEFF/,''));
  if(new Set(headers).size!==headers.length||headers.some(h=>!h)||headers.includes('__pharmalensSourceLine'))throw Error('Cabeçalho CSV inválido/duplicado');
  const output=[];
  for(let n=1;n<rows.length;n++){
    const row=rows[n],loc=csvLocation.get(row);
    if(row.length!==headers.length)throw Error(`Linha CSV com cardinalidade incompatível: linha física ${loc?.startLine??n+1}, esperado=${headers.length}, recebido=${row.length}`);
    if(row.every(v=>v===''))continue;
    const item=Object.create(null);for(let i=0;i<headers.length;i++)item[headers[i]]=row[i];
    Object.defineProperty(item,'__pharmalensSourceLine',{value:loc?.startLine??n+1,enumerable:false});output.push(item);
  }
  return output;
}
// Full source diagnostics, without materializing the catalog. Digest includes
// every parsed field and record, including physically empty records.
function inspectCsv(text,delimiter){
  const digest=crypto.createHash('sha256'), widths=Object.create(null), examples=[];
  let header=null,invalid=0,blank=0,allEmpty=0,good=0,stats=null,syntaxError=null;
  const sample=(raw,loc,reason)=>{if(examples.length<12)examples.push({...loc,reason,width:raw.length,rawExcerpt:text.slice(loc.startOffset,Math.min(loc.endOffset,loc.startOffset+1600))});};
  try{stats=scanCsv(text,delimiter,(raw,loc)=>{
    // csv.reader represents a physically blank line as [] rather than [''].
    const physicalBlank=loc.startOffset===loc.endOffset;
    digest.update(JSON.stringify(physicalBlank?[]:raw)+'\n');
    if(physicalBlank){blank++;return;}
    if(header===null){header=raw.map(v=>v.trim().replace(/^\uFEFF/,''));return;}
    widths[raw.length]=(widths[raw.length]||0)+1;
    if(raw.length!==header.length){invalid++;sample(raw,loc,'width_mismatch');return;}
    if(raw.every(x=>!x.trim()))allEmpty++;else good++;
  });}catch(e){syntaxError=e.message;if(e.csv&&examples.length<12)examples.push({...e.csv,reason:'syntax',rawExcerpt:text.slice(e.csv.startOffset,Math.min(e.csv.offset+1,e.csv.startOffset+1600))});}
  const validHeader=Boolean(header?.length&&header.every(Boolean)&&new Set(header).size===header.length&&!header.includes('__pharmalensSourceLine'));
  return {header,widths,invalid,blank,allEmpty,good,stats,syntaxError,examples,digest:digest.digest('hex'),valid:validHeader&&!syntaxError&&!invalid&&good>0};
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function downloadSource(source, tempDir) {
  const destination = path.join(tempDir, source.label);

  console.log("⬇️ Baixando " + source.label + "...");

  execFileSync(
    "curl",
    [
      "--disable",
      "--proto", "=https",
      "--proto-redir", "=https",
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "3",
      "--retry-delay",
      "2",
      "--connect-timeout",
      "30",
      "--max-time",
      "240",
      "-o",
      destination,
      source.url,
    ],
    { stdio: "inherit" }
  );

  return destination;
}

function loadCsv(source, tempDir) {
  const downloaded = process.env.PHARMALENS_SOURCE_DIR ? path.join(process.env.PHARMALENS_SOURCE_DIR, source.label) : downloadSource(source, tempDir);
  const buffer = fs.readFileSync(downloaded);
  const decoded = decodeBuffer(buffer);
  const text = decoded.text.replace(/^\uFEFF/, "");
  const firstBreak = text.search(/\r?\n/);

  if (firstBreak === -1) {
    throw new Error("Cabeçalho inválido em " + source.label);
  }

  const delimiter = detectDelimiter(text.slice(0, firstBreak));
  let rows;
  try { rows = rowsToObjects(parseCsv(text, delimiter)); }
  catch (error) { throw new Error(source.label + ": " + error.message); }

  return {
    source,
    hash: sha256(buffer),
    bytes: buffer.length,
    encoding: decoded.encoding,
    rows,
  };
}

function productKind(row) {
  const category = normalizeText(row.DS_TIPO_CATEGORIA_REGULATORIA);

  if (category === "generico") return "generic";
  if (category === "similar") return "similar";
  if (category === "novo") return "brand";

  return "other";
}

function buildConsultaPackage(rows) {
  const products = new Map();
  const baseRegistrationToProductIds = new Map();
  const productNameToIds = new Map();
  const safeSubstances = new Map();
  const safeRelations = new Map();

  const diagnostics = {
    placeholderProductNames: 0,
    noSubstanceName: 0,
    multipleSubstanceCodes: 0,
    missingSubstanceCode: 0,
    safeSingleSubstanceRelations: 0,
  };

  for (const row of rows) {
    const productId = cleanValue(row.CO_SEQ_PRODUTO);
    const rawProductName = cleanValue(row.NO_PRODUTO);

    if (!productId || !rawProductName) {
      continue;
    }

    const normalizedProductName = normalizeText(rawProductName);

    if (
      normalizedProductName === "n o declarado" ||
      normalizedProductName === "nao declarado" ||
      normalizedProductName === "nc ni"
    ) {
      diagnostics.placeholderProductNames += 1;
    }

    const baseRegistration = digitsOnly(row.NU_REGISTRO_PRODUTO);

    products.set(productId, {
      externalId: productId,
      name: rawProductName,
      normalizedName: normalizedProductName,
      registrationNumber: baseRegistration || null,
      manufacturer: cleanValue(row.NO_RAZAO_SOCIAL_EMPRESA),
      category: cleanValue(row.DS_TIPO_CATEGORIA_REGULATORIA),
      productKind: productKind(row),
      active: normalizeText(row.VALIDADE_SITUACAO) === "ativo",
      referenceText: cleanValue(row.DS_REFERENCIA),
      synonymsText: cleanValue(row.SINONIMOS),
    });

    if (baseRegistration) {
      if (!baseRegistrationToProductIds.has(baseRegistration)) {
        baseRegistrationToProductIds.set(baseRegistration, new Set());
      }

      baseRegistrationToProductIds.get(baseRegistration).add(productId);
    }

    if (!productNameToIds.has(normalizedProductName)) {
      productNameToIds.set(normalizedProductName, new Set());
    }

    productNameToIds.get(normalizedProductName).add(productId);

    const rawSubstance = cleanValue(row.SUBSTANCIAS_MEDICAMENTOS);
    const substanceCodes = splitCodes(row.CO_SUBSTANCIA);

    if (!rawSubstance) {
      diagnostics.noSubstanceName += 1;
      continue;
    }

    if (substanceCodes.length === 0) {
      diagnostics.missingSubstanceCode += 1;
      continue;
    }

    if (substanceCodes.length !== 1) {
      diagnostics.multipleSubstanceCodes += 1;
      continue;
    }

    // Contadores históricos acima; a autoridade de composição trabalha sobre todas as linhas.
  }
  const composition = reconcileOfficialRows(rows);
  for (const [key,value] of composition.substances) safeSubstances.set(key,value);
  for (const [key,value] of composition.relations) safeRelations.set(key,value);
  diagnostics.safeSingleSubstanceRelations = composition.reports.filter(r=>r.status==="complete"&&r.codes.length===1).length;
  diagnostics.associationComplete = composition.reports.filter(r=>r.status==="complete"&&r.codes.length>1).length;
  diagnostics.associationPartial = composition.reports.filter(r=>r.status==="partial").length;
  diagnostics.associationAmbiguous = composition.reports.filter(r=>r.status==="ambiguous").length;
  diagnostics.associationInconclusive = composition.reports.filter(r=>r.status==="inconclusive").length;

  return {
    products,
    baseRegistrationToProductIds,
    productNameToIds,
    safeSubstances,
    safeRelations,
    composition,
    diagnostics,
  };
}

function mapPresentations(rows, consultaPackage) {
  const presentations = new Map();

  const diagnostics = {
    numericRegistrationRows: 0,
    linkedByNineDigitPrefix: 0,
    ambiguousNineDigitPrefix: 0,
    unlinkedByRegistration: 0,
    linkedToActiveProducts: 0,
    linkedToInactiveProducts: 0,
    invalidCommercialIdentifiers: 0,
  };

  for (const row of rows) {
    const presentationRegistration = digitsOnly(row.NU_REGISTRO);

    if (!presentationRegistration) {
      continue;
    }

    diagnostics.numericRegistrationRows += 1;

    const baseRegistration = presentationRegistration.slice(0, 9);
    const productIds = consultaPackage.baseRegistrationToProductIds.get(baseRegistration);

    if (!productIds || productIds.size === 0) {
      diagnostics.unlinkedByRegistration += 1;
      continue;
    }

    if (productIds.size > 1) {
      diagnostics.ambiguousNineDigitPrefix += 1;
      continue;
    }

    const productExternalId = Array.from(productIds)[0];
    const product = consultaPackage.products.get(productExternalId);

    if (!product) {
      diagnostics.unlinkedByRegistration += 1;
      continue;
    }

    diagnostics.linkedByNineDigitPrefix += 1;

    if (product.active) {
      diagnostics.linkedToActiveProducts += 1;
    } else {
      diagnostics.linkedToInactiveProducts += 1;
    }

    const ggrem = cleanValue(row.CO_GGREM);
    const ean = cleanValue(row.CO_EAN);

    if (
      (ggrem && normalizeText(ggrem) === "si nc") ||
      (ean && (normalizeText(ean) === "si nc" || /^0+$/.test(digitsOnly(ean))))
    ) {
      diagnostics.invalidCommercialIdentifiers += 1;
    }

    const key = [
      productExternalId,
      presentationRegistration,
      ggrem || "",
      cleanValue(row.DS_APRESENTACAO) || "",
    ].join("|");

    if (!presentations.has(key)) {
      presentations.set(key, {
        productExternalId,
        externalRegistration: presentationRegistration,
        ggremCode: ggrem,
        ean,
        presentationLabel: cleanValue(row.DS_APRESENTACAO),
        sourceSubstanceText: cleanValue(row.DS_SUBSTANCIA),
        sourceProductName: cleanValue(row.NO_PRODUTO),
        confidence: "high",
      });
    }
  }

  return { presentations, diagnostics };
}

function mapRegulatoryEvidence(rows, consultaPackage) {
  const evidence = [];

  const diagnostics = {
    totalRows: rows.length,
    withPrescriptionRestriction: 0,
    uniqueProductNameMatch: 0,
    ambiguousProductNameMatch: 0,
    noProductNameMatch: 0,
    notificationA: 0,
    notificationB: 0,
    retention: 0,
  };

  for (const row of rows) {
    const restriction = cleanValue(row.DS_RESTRICAO_PRESCRICAO);

    if (restriction) {
      diagnostics.withPrescriptionRestriction += 1;

      const normalizedRestriction = normalizeText(restriction);

      if (normalizedRestriction.includes("notificacao de receita a")) {
        diagnostics.notificationA += 1;
      }

      if (normalizedRestriction.includes("notificacao de receita b")) {
        diagnostics.notificationB += 1;
      }

      if (normalizedRestriction.includes("retencao de receita")) {
        diagnostics.retention += 1;
      }
    }

    const normalizedProduct = normalizeText(row.NO_PRODUTO);
    const productIds = consultaPackage.productNameToIds.get(normalizedProduct);

    let matchConfidence = "unlinked";
    let productExternalId = null;

    if (!productIds || productIds.size === 0) {
      diagnostics.noProductNameMatch += 1;
    } else if (productIds.size === 1) {
      diagnostics.uniqueProductNameMatch += 1;
      matchConfidence = "medium";
      productExternalId = Array.from(productIds)[0];
    } else {
      diagnostics.ambiguousProductNameMatch += 1;
      matchConfidence = "ambiguous";
    }

    evidence.push({
      productExternalId,
      productName: cleanValue(row.NO_PRODUTO),
      activeIngredientText: cleanValue(row.NO_PRINICIPIO_ATIVO),
      concentrationText: cleanValue(row.DS_CONCENTRACAO),
      pharmaceuticalForm: cleanValue(row.DS_FORMA_FISICA),
      prescriptionRestriction: restriction,
      hospitalRestricted: cleanValue(row.ST_RESTRITO_HOSPITAL),
      useRestriction: cleanValue(row.DS_RESTRICAO_USO),
      matchConfidence,
    });
  }

  return { evidence, diagnostics };
}

function percent(value, total) {
  if (!total) return "0.00%";
  return ((value / total) * 100).toFixed(2) + "%";
}

function main() {
  console.log("🧠 VAULT — GERADOR CANÔNICO ANVISA 4D7");
  console.log("");
  console.log("🚫 NÃO GRAVA NO SUPABASE.");
  console.log("🚫 NÃO ALTERA DEXIE.");
  console.log("🚫 NÃO ALINHA MÚLTIPLOS CO_SUBSTANCIA POR POSIÇÃO.");
  console.log("Associações completas exigem resolução individual e conjunto textual concordante.");
  console.log("🚫 NÃO CONVERTE AUTOMATICAMENTE A/B EM TIPO_RECEITA DO VAULT.");
  console.log("🔐 TLS verificado: " + (TLS_VERIFICATION_BYPASSED ? "NÃO — BYPASS TEMPORÁRIO" : "SIM"));
  console.log("");

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "vault-canonical-package-")
  );

  try {
    const consulta = loadCsv(SOURCES.consulta, tempDir);
    const precos = loadCsv(SOURCES.precos, tempDir);
    const restricoes = loadCsv(SOURCES.restricoes, tempDir);

    const consultaPackage = buildConsultaPackage(consulta.rows);
    const presentationPackage = mapPresentations(
      precos.rows,
      consultaPackage
    );

    const regulatoryPackage = mapRegulatoryEvidence(
      restricoes.rows,
      consultaPackage
    );

    const versions = [consulta, precos, restricoes].map((dataset) => ({
      sourceKey: dataset.source.key,
      sourceName: dataset.source.label,
      sourceUrl: dataset.source.url,
      sha256: dataset.hash,
      bytes: dataset.bytes,
      encoding: dataset.encoding,
    }));

    const canonicalPackage = {
      versions,
      products: Array.from(consultaPackage.products.values()),
      substances: Array.from(consultaPackage.safeSubstances.values()),
      productSubstances: Array.from(consultaPackage.safeRelations.values()),
      presentations: Array.from(presentationPackage.presentations.values()),
      regulatoryEvidence: regulatoryPackage.evidence,
      diagnostics: {
        consulta: consultaPackage.diagnostics,
        presentations: presentationPackage.diagnostics,
        regulatory: regulatoryPackage.diagnostics,
      },
    };

    console.log("============================================================");
    console.log("📦 PACOTE CANÔNICO");
    console.log("Versões/fontes:                    " + canonicalPackage.versions.length);
    console.log("Produtos:                          " + canonicalPackage.products.length);
    console.log("Substâncias seguras:               " + canonicalPackage.substances.length);
    console.log("Relações produto ↔ substância:      " + canonicalPackage.productSubstances.length);
    console.log("Apresentações ligadas:             " + canonicalPackage.presentations.length);
    console.log("Evidências regulatórias preservadas:" + canonicalPackage.regulatoryEvidence.length);

    console.log("\n============================================================");
    console.log("🧬 DIAGNÓSTICO — SUBSTÂNCIAS");
    console.log("Relações seguras 1 código:         " + consultaPackage.diagnostics.safeSingleSubstanceRelations);
    console.log("Linhas sem substância:             " + consultaPackage.diagnostics.noSubstanceName);
    console.log("Linhas sem CO_SUBSTANCIA:          " + consultaPackage.diagnostics.missingSubstanceCode);
    console.log("Linhas com múltiplos códigos:      " + consultaPackage.diagnostics.multipleSubstanceCodes);
    console.log("Placeholders de nome de produto:   " + consultaPackage.diagnostics.placeholderProductNames);

    console.log("\n============================================================");
    console.log("💊 DIAGNÓSTICO — APRESENTAÇÕES");
    console.log("Registros numéricos CMED:          " + presentationPackage.diagnostics.numericRegistrationRows);
    console.log("Ligados por prefixo oficial 9d:    " + presentationPackage.diagnostics.linkedByNineDigitPrefix);
    console.log("Cobertura:                         " + percent(
      presentationPackage.diagnostics.linkedByNineDigitPrefix,
      presentationPackage.diagnostics.numericRegistrationRows
    ));
    console.log("Ligados a produtos ativos:         " + presentationPackage.diagnostics.linkedToActiveProducts);
    console.log("Ligados a produtos inativos:       " + presentationPackage.diagnostics.linkedToInactiveProducts);
    console.log("Prefixos ambíguos:                 " + presentationPackage.diagnostics.ambiguousNineDigitPrefix);
    console.log("Sem produto por registro-base:     " + presentationPackage.diagnostics.unlinkedByRegistration);
    console.log("Identificadores comerciais suspeitos:" + presentationPackage.diagnostics.invalidCommercialIdentifiers);

    console.log("\n============================================================");
    console.log("📜 DIAGNÓSTICO — EVIDÊNCIA REGULATÓRIA");
    console.log("Linhas totais:                     " + regulatoryPackage.diagnostics.totalRows);
    console.log("Com restrição de prescrição:       " + regulatoryPackage.diagnostics.withPrescriptionRestriction);
    console.log("Nome com match único:              " + regulatoryPackage.diagnostics.uniqueProductNameMatch);
    console.log("Nome ambíguo:                      " + regulatoryPackage.diagnostics.ambiguousProductNameMatch);
    console.log("Sem match de nome:                 " + regulatoryPackage.diagnostics.noProductNameMatch);
    console.log("Menções Notificação A:             " + regulatoryPackage.diagnostics.notificationA);
    console.log("Menções Notificação B:             " + regulatoryPackage.diagnostics.notificationB);
    console.log("Menções retenção de receita:       " + regulatoryPackage.diagnostics.retention);

    console.log("\n============================================================");
    console.log("🧪 AMOSTRA DE APRESENTAÇÕES CANÔNICAS");

    const targetPresentations = canonicalPackage.presentations
      .filter((item) => {
        const value = normalizeText(
          (item.sourceProductName || "") + " " + (item.sourceSubstanceText || "")
        );

        return (
          value.includes("venvanse") ||
          value.includes("clonazepam") ||
          value.includes("amitriptilina")
        );
      })
      .slice(0, 20);

    for (const item of targetPresentations) {
      console.log(JSON.stringify(item, null, 2));
    }

    console.log("\n============================================================");
    console.log("✅ Pacote canônico 4D7 construído em memória.");
    console.log("🧾 Nenhum dado persistido.");
    console.log("🔐 Importação real permanece bloqueada: revisão Guardian e aplicação separadas.");
    console.log("Diagnóstico de associações: "+JSON.stringify(consultaPackage.diagnostics));
    console.log("🧠 Relações farmacológicas ambíguas continuam fora do pacote seguro.");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = { SOURCES, loadCsv, buildConsultaPackage, mapPresentations, mapRegulatoryEvidence, parseCsv, rowsToObjects, scanCsv, inspectCsv, detectDelimiter, decodeBuffer };
if (require.main === module) try {
  main();
} catch (error) {
  console.error("\n❌ Falha no gerador canônico:");
  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );
  process.exit(1);
}
