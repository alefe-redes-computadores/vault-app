/**
 * R6 — projeção única de leitura para exames e pedidos.
 *
 * O registro `Exame` e o evento `exam_order` são entidades diferentes. Esta
 * projeção une APENAS a apresentação, nunca converte um pedido em laudo,
 * não relaciona pelo nome, não altera IDs, não grava e não altera status.
 * Escopo de usuário/pessoa é exigido dos repositórios chamadores.
 */
import type { ExamItemStateM2 } from "@/lib/careflow-m2/domain";

export type IndividualExamR6 = {
  id?: string | null;
  data?: string | null;
  nome?: string | null;
};
export type GroupedOrderR6 = {
  order: { id: string; payload: Record<string, unknown> };
  items: readonly {
    item: { id: string; payload: Record<string, unknown> };
    state: ExamItemStateM2;
  }[];
};
export type UnifiedExamRowR6<E extends IndividualExamR6,O extends GroupedOrderR6> =
  | { kind: 'exam'; key: string; date: string; exame: E }
  | { kind: 'order'; key: string; date: string; order: O['order']; items: O['items'] };

const day = (raw: unknown): string =>
  typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
const searchText = (raw: unknown): string => String(raw ?? '').toLocaleLowerCase('pt-BR');

export function buildUnifiedExamWorkspaceR6<E extends IndividualExamR6,O extends GroupedOrderR6>(
  filteredExams: readonly E[],
  scopedOrders: readonly O[],
  search: string,
  includeOrders: boolean,
): UnifiedExamRowR6<E,O>[] {
  const q = search.trim().toLocaleLowerCase('pt-BR');
  const individual: UnifiedExamRowR6<E,O>[] = filteredExams
    .filter(e => Boolean(e.id))
    .map(exame => ({kind:'exam' as const,key:`exam:${exame.id}`,date:day(exame.data),exame}));
  const grouped: UnifiedExamRowR6<E,O>[] = !includeOrders ? [] : scopedOrders
    .filter(v => Boolean(v.order.id))
    .filter(v => !q || [v.order.payload.title,v.order.payload.date,
      ...v.items.map(i => i.item.payload.name)].some(x => searchText(x).includes(q)))
    .map(v => ({kind:'order' as const,key:`order:${v.order.id}`,date:day(v.order.payload.date),order:v.order,items:v.items}));
  // A origem e o ID permanecem discriminantes. Não associamos por nomes iguais.
  return [...individual,...grouped]
    .sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
}

/**
 * Filtra uma linha de cuidado existente; pressão nunca vira sintoma e
 * ausência de aferições não equivale a ausência de plano.
 */
export type ClinicalFocusR6='todos'|'sintomas'|'pressao';
export function filterClinicalEventsR6<E extends {category?: string;record?:{tipo?:string|null}}>(
  events: readonly E[], focus: ClinicalFocusR6,
): E[] {
  if (focus==='sintomas') return events.filter(e=>e.category==='sintoma');
  if (focus==='pressao') return events.filter(e=>e.record?.tipo==='pressao_arterial');
  return [...events];
}
