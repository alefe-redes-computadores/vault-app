import type { SyncQueueItem } from '@/lib/types';
import { isClinicalExamTableM1, type ClinicalExamTableM1 } from './types';

export type ClinicalDependencyM1 = {table: ClinicalExamTableM1 | 'consultas' | 'vaccination_events_a8'; id: string};
/** Exact foreign-key dependencies, without name/date inference. */
export function clinicalExamDependenciesM1(item: SyncQueueItem): ClinicalDependencyM1[] {
  if (!isClinicalExamTableM1(item.table) || item.operation === 'delete') return [];
  const p = item.payload;
  const refs: ClinicalDependencyM1[] = [];
  const add = (table: ClinicalDependencyM1['table'], field: string) => {
    const id = p[field];
    if (typeof id === 'string' && id.trim()) refs.push({table, id: id.trim()});
  };
  switch (item.table) {
    case 'exam_order_items': add('exam_orders','order_id'); break;
    case 'exam_sessions': add('exam_orders','order_id'); break;
    case 'exam_session_items':
      add('exam_orders','order_id'); add('exam_order_items','exam_order_item_id');
      add('exam_sessions','session_id'); break;
    case 'clinical_asset_links': {
      add('clinical_assets','asset_id');
      const kind = p.entity_type;
      if (kind === 'exam_order') add('exam_orders','entity_id');
      if (kind === 'exam_order_item') add('exam_order_items','entity_id');
      if (kind === 'exam_session') add('exam_sessions','entity_id');
      if (kind === 'consultation') add('consultas','entity_id');
      if (kind === 'vaccination_event') add('vaccination_events_a8','entity_id');
      break;
    }
    case 'consultation_exam_order_links':
      add('exam_orders','order_id'); add('consultas','consultation_id'); break;
  }
  return refs;
}
