/**
 * IA 2.0 P2 — auditable local-create ownership.
 * The local header owns only a SINGLE canonical Compose action for a list.
 * Multi-action hubs retain the existing Compose sheet as a reversible fallback.
 * Never creates or mutates clinical records.
 */
const IA20_P2_HEADER_LISTS = [
  '/pessoas','/cartoes','/contas','/vaults','/senhas',
  '/saude/medicamentos','/saude/tratamentos','/saude/renovacao',
  '/saude/retiradas','/saude/consultas','/saude/exames',
  '/saude/cirurgias','/saude/cids','/saude/medicos',
  '/saude/farmacias','/saude/hospitais','/saude/locais',
  '/saude/registros','/saude/fornecimento',
] as const;

export const IA20_P2_LOCAL_CREATE_ROUTES: readonly string[] = IA20_P2_HEADER_LISTS;
const LISTS = new Set<string>(IA20_P2_HEADER_LISTS);

export function ia20P2Route(pathname: string): string {
  const p = (pathname || '/').split(/[?#]/,1)[0].replace(/\/+$/,'');
  return p || '/';
}

export function ia20P2HeaderOwnsCreate(
  pathname: string, optionCount: number, searchParams?: Pick<URLSearchParams,'get'>,
): boolean {
  const route = ia20P2Route(pathname);
  if (!LISTS.has(route) || optionCount !== 1) return false;
  // Fornecimento is a list AND an inline form. Never offer a second creation
  // action over the active input form.
  if (route === '/saude/fornecimento' &&
      ['novo','editar'].includes(searchParams?.get('action') || '')) return false;
  return true;
}
