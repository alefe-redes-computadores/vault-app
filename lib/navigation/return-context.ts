const RETURN_PARAM = "return_to";
const INTERNAL_ORIGIN = "https://vault.local";

/** Only local, non-API routes can become navigation targets; nested origins are stripped. */
export function safeReturnTarget(value: string | null | undefined, fallback: string): string {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") ||
      /[\u0000-\u001f\u007f<>]/.test(candidate) || candidate.length > 2048) return fallback;
  try {
    // Validate each raw segment before URL normalization can erase traversal.
    // Encoded delimiters, residual escapes and controls have no role in a route segment.
    const rawPath = candidate.split(/[?#]/, 1)[0];
    const decoded = rawPath.split('/').map(segment => decodeURIComponent(segment));
    if (decoded.some(segment => /[\u0000-\u001f\u007f<>\\/?#%\ufffd]/.test(segment) || segment === '.' || segment === '..')) return fallback;
    const decodedPath = decoded.join('/');
    const url = new URL(candidate, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.username || url.password ||
        /^\/api(?:\/|$)/i.test(decodedPath) || url.pathname.startsWith('//')) return fallback;
    url.searchParams.delete(RETURN_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

/** A destination has one immediate parent only; keep its existing filters and anchors. */
export function withReturnTarget(href: string, returnTo: string): string {
  const target = safeReturnTarget(href, "/");
  const origin = safeReturnTarget(returnTo, "/");
  const url = new URL(target, INTERNAL_ORIGIN);
  const parent = new URL(origin, INTERNAL_ORIGIN);
  // Same pathname may still represent a different state (list -> editor/query).
  // Only a byte-equivalent route+query+hash would become a self-return.
  if (`${url.pathname}${url.search}${url.hash}` !== `${parent.pathname}${parent.search}${parent.hash}`)
    url.searchParams.set(RETURN_PARAM, origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function preserveReturnTarget(href: string, params: Pick<URLSearchParams, "get">): string {
  const inherited = params.get(RETURN_PARAM);
  return inherited ? withReturnTarget(href, inherited) : href;
}
