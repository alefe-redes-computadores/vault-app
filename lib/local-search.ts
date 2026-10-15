/** Local, deterministic text matching. Never infers clinical relationships. */
export function normalizeLocalSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/(\d)(\p{L})/gu, '$1 $2').replace(/(\p{L})(\d)/gu, '$1 $2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export type LocalSearchRow<T> = {item:T;text:string};
export function createLocalSearchIndex<T>(items: readonly T[], fields:(item:T)=>readonly unknown[]): LocalSearchRow<T>[] {
  return items.map(item=>({item,text:normalizeLocalSearch(fields(item).filter(value=>typeof value==='string'||typeof value==='number').join(' '))}));
}
export function filterLocalSearchIndex<T>(index:readonly LocalSearchRow<T>[], query:string):T[] {
  const tokens=[...new Set(normalizeLocalSearch(query).split(/\s+/).filter(Boolean))];
  return index.filter(row=>tokens.every(token=>row.text.includes(token))).map(row=>row.item);
}
