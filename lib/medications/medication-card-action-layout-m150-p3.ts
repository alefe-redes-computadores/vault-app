/**
 * UI-only priority. Every secondary action remains reachable in a disclosure;
 * none is executed automatically and no medication/dose/stock state is mutated.
 */
export type CardActionNameM150P3 = 'dose' | 'care' | 'stock' | 'history';
export function medicationCardActionLayoutM150P3(input: {
  dose: boolean; care: boolean; stock: boolean; suspended: boolean; history: boolean;
}): { primary: CardActionNameM150P3 | null; secondary: CardActionNameM150P3[] } {
  const primary: CardActionNameM150P3 | null = input.suspended ? null :
    input.dose ? 'dose' : input.care ? 'care' : input.stock ? 'stock' : null;
  const secondary: CardActionNameM150P3[] = [];
  if (input.history) secondary.push('history');
  if (input.care && primary !== 'care') secondary.push('care');
  if (input.stock && primary !== 'stock') secondary.push('stock');
  return { primary, secondary };
}
