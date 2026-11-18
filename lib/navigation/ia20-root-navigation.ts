/** VAULT IA 2.0 P1 — taxonomy of five user-facing navigation roots.
 * Pure navigation semantics only. No personal data, storage, business rules or I/O.
 * Keep existing route IDs and deep links intact while grouping their active tab.
 */
export type Ia20RootId = "home" | "hoje" | "saude" | "documentos" | "mais";

export const IA20_ROOTS: ReadonlyArray<{ id: Ia20RootId; label: string; href: string }> = [
  { id: "home", label: "Início", href: "/" },
  { id: "hoje", label: "Hoje", href: "/hoje" },
  { id: "saude", label: "Saúde", href: "/saude/minha-saude" },
  { id: "documentos", label: "Documentos", href: "/documentos" },
  { id: "mais", label: "Mais", href: "/mais" },
];

export function normalizeIa20Route(raw: string): string {
  const path = String(raw || "/").split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path.startsWith("/") && !path.startsWith("//") ? path || "/" : "/";
}

/** An active tab is a signpost, not a redirect or authorization boundary. */
export function ia20ActiveRoot(pathname: string): Ia20RootId | null {
  const path = normalizeIa20Route(pathname);
  if (path === "/") return "home";
  if (path === "/hoje" || path.startsWith("/hoje/")) return "hoje";
  if (path === "/documentos" || path.startsWith("/documentos/") ||
      path === "/saude/documentos" || path.startsWith("/saude/documentos/")) return "documentos";
  if (path === "/mais" || path.startsWith("/mais/")) return "mais";
  if (path === "/saude" || path.startsWith("/saude/")) return "saude";
  return null;
}

/** Only explicitly named clinical overview screens receive a persistent bottom bar.
 * Input, camera, drafts, full-screen PDF tasks remain focused experiences.
 */
export function ia20IsCareflowOverview(pathname: string): boolean {
  const path = normalizeIa20Route(pathname);
  return /^\/saude\/careflow\/(episodios|linha-do-tempo|dossie|exames|pressao|sintomas|relatorios)$/.test(path);
}
