const RETURN_PARAM = "return_to";

export function safeReturnTarget(value: string | null | undefined, fallback: string): string {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const url = new URL(candidate, "https://vault.local");
    if (url.origin !== "https://vault.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function withReturnTarget(href: string, returnTo: string): string {
  const target = safeReturnTarget(href, "/");
  const url = new URL(target, "https://vault.local");
  url.searchParams.set(RETURN_PARAM, safeReturnTarget(returnTo, "/"));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function preserveReturnTarget(href: string, params: Pick<URLSearchParams, "get">): string {
  const inherited = params.get(RETURN_PARAM);
  return inherited ? withReturnTarget(href, inherited) : href;
}
