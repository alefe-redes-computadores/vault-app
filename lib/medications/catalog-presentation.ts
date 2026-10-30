export const normalizeCatalogComparisonText = (value: string) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "").trim();

export const normalizeCatalogPresentationText = (value: string) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

export const normalizeCatalogText = normalizeCatalogPresentationText;

export function extractCatalogPresentationDosage(value: string): string | null {
  const text = String(value ?? "").replace(/,/g, ".").trim();
  const match = text.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|g|ui)\s*\/\s*\d*(?:\.\d+)?\s*ml\b/i)
    || text.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|g|ui)\s*\/\s*ml\b/i)
    || text.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|g|ui)\b/i);
  if (match) return match[0].replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
  const percent = text.match(/\b\d+(?:\.\d+)?\s*%/);
  return percent ? percent[0].replace(/\s+/g, "").trim() : null;
}

const formatRules: Array<[string, RegExp]> = [
  ["injecao", /\bsol inj\b|\bsolucao injetavel\b|\binjetavel\b|\bamp\b|\bampola\b|\bseringa\b|\binj(?:ecao|etavel)?\b/],
  ["comprimido", /\bcom ct\b|\bcomp ct\b|\bcom rev\b|\bcomp rev\b|\bcomprimido\b|\bcomprim\b|\bcomp\b/],
  ["capsula", /\bcap dura\b|\bcap mole\b|\bcaps dura\b|\bcaps mole\b|\bcapsula\b|\bcaps\b|\bcap\b/],
  ["gota", /\bsol or got\b|\bsol oral got\b|\bgota(?:s)?\b|\bgot\b/],
  ["suspensao", /\bsusp or\b|\bsusp oral\b|\bsuspensao oral\b|\bsuspensao\b|\bsus or\b/],
  ["solucao", /\bsol or\b|\bsol oral\b|\bsolucao oral\b/],
  ["colirio", /\bcolirio\b|\boftalm/], ["adesivo", /\badesiv|transderm/],
  ["supositorio", /\bsupositor/], ["ovulo", /\bovulo\b/], ["sublingual", /\bsubling/],
  ["mastigavel", /\bmastig/], ["efervescente", /\beferv/], ["dispersivel", /\bdispers/],
  ["xarope", /\bxarope\b|\bxpe\b/], ["creme", /\bcreme\b|\bcrem\b/],
  ["pomada", /\bpomada\b|\bpom\b/], ["gel", /\bgel\b/], ["granulado", /\bgranulado\b|\bgran\b/],
  ["sache", /\bsache\b/], ["spray", /\bspray\b/], ["inalador", /\binalador\b|\binala/],
  ["solucao", /\bsolucao\b|\bsol\b/], ["po", /\bpo\b/], ["implante", /\bimplante\b|\bimplant/],
];

export function inferVaultFormatFromOfficialPresentation(value: string): string | null {
  const text = ` ${normalizeCatalogPresentationText(value)} `;
  return formatRules.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const labels: Record<string, string> = {
  comprimido: "Comprimido", partido: "Partido", capsula: "Cápsula", gota: "Gotas", injecao: "Injeção",
  adesivo: "Adesivo", solucao: "Solução", suspensao: "Suspensão", xarope: "Xarope", spray: "Spray",
  inalador: "Inalador", creme: "Creme", pomada: "Pomada", gel: "Gel", colirio: "Colírio",
  supositorio: "Supositório", ovulo: "Óvulo", po: "Pó", granulado: "Granulado", sache: "Sachê",
  sublingual: "Sublingual", bucal: "Bucal", mastigavel: "Mastigável", efervescente: "Efervescente",
  dispersivel: "Dispersível", implante: "Implante",
};

export const getCatalogFormatLabel = (format: string | null) => format ? labels[format] ?? format : null;

const aliases: Record<string, string[]> = {
  comprimido:["comprimido","comp"],partido:["comprimido","comp"],capsula:["capsula","cap"],gota:["gota","gotas","gts"],
  injecao:["injecao","injetavel","inj"],adesivo:["adesivo","transdermico"],solucao:["solucao","sol"],suspensao:["suspensao"],
  xarope:["xarope"],spray:["spray","aerosol"],inalador:["inalador","inalacao","inalatoria"],creme:["creme"],pomada:["pomada"],
  gel:["gel"],colirio:["colirio","oftalmica","oftalmico"],supositorio:["supositorio"],ovulo:["ovulo","vaginal"],po:["po"],
  granulado:["granulado"],sache:["sache"],sublingual:["sublingual"],bucal:["bucal"],mastigavel:["mastigavel"],
  efervescente:["efervescente"],dispersivel:["dispersivel","orodispersivel"],implante:["implante"],
};

export function formatMatchesCatalog(formato: string, texts: string[]) {
  if (!formato || !texts.length) return true;
  const normalized = texts.map(normalizeCatalogComparisonText).filter(Boolean);
  return (aliases[formato] ?? [formato]).some(term => {
    const expected = normalizeCatalogComparisonText(term);
    return normalized.some(candidate => candidate.includes(expected));
  });
}

export function getEstoqueUnidadePorFormato(formato: string) {
  if (["gota", "colirio"].includes(formato)) return "gota(s)";
  if (["solucao", "suspensao", "xarope"].includes(formato)) return "ml";
  if (["spray", "inalador"].includes(formato)) return "jato(s)";
  if (["creme", "pomada", "gel"].includes(formato)) return "aplicação(ões)";
  if (formato === "injecao") return "dose(s)";
  if (formato === "adesivo") return "adesivo(s)";
  if (formato === "sache") return "sachê(s)";
  if (formato === "supositorio") return "supositório(s)";
  if (formato === "ovulo") return "óvulo(s)";
  if (formato === "implante") return "implante(s)";
  if (formato === "capsula") return "cápsula(s)";
  return "comprimido(s)";
}
