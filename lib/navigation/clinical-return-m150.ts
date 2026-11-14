import { safeReturnTarget } from '@/lib/navigation/return-context';

/**
 * M150: true return to the original task, never a chain of return_to parameters.
 * Unlike router.back(), this also behaves after refreshing a page.
 * Only same-origin routes are accepted; the current route cannot return to itself.
 */
export function safeClinicalReturnM150(
  requested: string | null | undefined,
  currentRoute: string,
  fallback = '/saude/mapa'
): string {
  const origin = 'https://vault.local';
  const current = new URL(safeReturnTarget(currentRoute,'/'), origin).pathname;
  const fallbackCandidate = safeReturnTarget(fallback,'/');
  const fallbackUrl = new URL(fallbackCandidate, origin);
  const safeFallback = fallbackUrl.pathname === current ? '/' : fallbackCandidate;
  const target = safeReturnTarget(requested, safeFallback);
  const url = new URL(target, origin);
  if (url.pathname === current) return safeFallback;
  // Stop return_to nesting/cascades, without discarding harmless filters/anchors.
  url.searchParams.delete('return_to');
  return `${url.pathname}${url.search}${url.hash}`;
}
