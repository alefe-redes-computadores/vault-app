import mg from "./catalog-mg.json";
import popular from "./catalog-popular.json";
import type { Medicamento } from "@/lib/types";
import type { SupplyProcess } from "./types";
export interface SusCatalogItem {
  id: string;
  programa: string;
  uf: string;
  indicacao: string;
  cids: string[];
  medicamento: string;
  apresentacao: string;
  apac: string;
  pagina: number;
  natureza: string;
}
export const SUS_CATALOG: readonly SusCatalogItem[] = [
  ...mg.itens,
  ...popular.itens,
];
export const SUS_SOURCES = [mg.fonte, popular.fonte];
export const catalogSourceVersion = "sus-2026-10-09";
export const normalizeSus = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const searchable = SUS_CATALOG.map((item) => ({
  item,
  text: normalizeSus(
    `${item.medicamento} ${item.apresentacao} ${
      item.indicacao
    } ${item.cids.join(" ")}`
  ),
}));
export function searchSusCatalog(
  query: string,
  origin?: string,
  indication?: string,
  limit = 40
): SusCatalogItem[] {
  const terms = normalizeSus(query).split(" ").filter(Boolean);
  return searchable
    .filter(
      ({ item, text }) =>
        (!origin || item.programa === origin) &&
        (!indication || item.indicacao === indication) &&
        terms.every((t) => text.includes(t))
    )
    .slice(0, Math.max(0, limit))
    .map((x) => x.item);
}
export function catalogIndications(origin: string) {
  return [
    ...new Set(
      SUS_CATALOG.filter((x) => x.programa === origin).map((x) => x.indicacao)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
export function catalogEntry(id?: string | null) {
  return id ? SUS_CATALOG.find((x) => x.id === id) : undefined;
}
export function validateCatalogSelection(
  process: SupplyProcess,
  id?: string | null
) {
  if (!id) return;
  const item = catalogEntry(id);
  if (
    !item ||
    item.natureza !== "medicamento" ||
    item.programa !== process.origem ||
    item.indicacao !== process.indicacao ||
    (item.uf !== "BR" && item.uf !== process.uf)
  )
    throw new Error(
      "A apresentação precisa pertencer ao programa, à UF e à indicação deste processo."
    );
}
/** Busca somente sugestão. A apresentação é confirmada pela pessoa, nunca autoatribuída. */
export function medicationSusQuery(med: Medicamento): string {
  const ref = med.catalog_snapshot?.reference as
    | {
        activeIngredient?: unknown;
        activeIngredients?: unknown;
        canonicalName?: unknown;
      }
    | undefined;
  if (
    ref &&
    Array.isArray(ref.activeIngredients) &&
    ref.activeIngredients.every((x) => typeof x === "string")
  )
    return ref.activeIngredients.join(" ");
  if (ref && typeof ref.activeIngredient === "string")
    return ref.activeIngredient;
  return med.nome;
}
