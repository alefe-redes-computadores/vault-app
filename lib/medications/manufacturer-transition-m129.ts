/**
 * M129: relato voluntário de uma troca de fabricante. Não detecta efeito
 * clínico, não altera prescrição, estoque ou aparência automaticamente.
 */
import { manufacturerComparisonKeyM129 } from './manufacturer-catalog-m129';
import { readManufacturerMetadata } from './manufacturer-experience';
import type { Renovacao, Medicamento } from '@/lib/types';

export const MANUFACTURER_TRANSITION_PREFIX_M129 = '[VAULT:TROCA-FABRICANTE]';
export type ManufacturerAssessmentM129 = 'better' | 'same' | 'worse' | 'unknown';
export type ManufacturerTransitionM129 = {
  acquisitionId: string;
  sourceManufacturer: string;
  priorManufacturer?: string;
  startedAt: string | null;
  assessment: ManufacturerAssessmentM129;
  notes?: string;
  recordedAt: string;
  /** Estado do ícone no momento de visitar o editor, NÃO aparência confirmada do lote. */
  appearanceBefore?: { format: string; colors: string[] };
};

export function validClinicalDayM129(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Máscara de teclado numérico: datas são digitadas em DD/MM/AAAA, sem date picker nativo. */
export function maskManufacturerStartDateM129(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function displayManufacturerStartDateM129(iso?: string | null): string {
  if (!iso || !validClinicalDayM129(iso)) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function parseManufacturerStartDateM129(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return validClinicalDayM129(iso) ? iso : null;
}

export function readManufacturerTransitionM129(notes?: string | null, acquisitionId?: string): ManufacturerTransitionM129 | null {
  const lines = String(notes ?? '').split(/\r?\n/).filter(line => line.startsWith(MANUFACTURER_TRANSITION_PREFIX_M129));
  for (const line of lines.reverse()) {
    try {
      const item: unknown = JSON.parse(line.slice(MANUFACTURER_TRANSITION_PREFIX_M129.length));
      if (!item || typeof item !== 'object') continue;
      const row = item as Partial<ManufacturerTransitionM129>;
      if (typeof row.acquisitionId !== 'string' || !row.acquisitionId ||
          (acquisitionId && row.acquisitionId !== acquisitionId) ||
          typeof row.sourceManufacturer !== 'string' || !row.sourceManufacturer.trim() ||
          !['better', 'same', 'worse', 'unknown'].includes(row.assessment || '') ||
          (row.startedAt !== null && typeof row.startedAt !== 'string') ||
          (typeof row.startedAt === 'string' && !validClinicalDayM129(row.startedAt)) ||
          typeof row.recordedAt !== 'string' || !Number.isFinite(Date.parse(row.recordedAt)) ||
          (typeof row.notes === 'string' && row.notes.length > 1200)) continue;
      return row as ManufacturerTransitionM129;
    } catch { /* registro legado/corrompido não bloqueia outros */ }
  }
  return null;
}

export function writeManufacturerTransitionM129(notes: string | null | undefined, next: ManufacturerTransitionM129): string {
  if (!next.acquisitionId || !next.sourceManufacturer.trim() ||
    (next.startedAt !== null && !validClinicalDayM129(next.startedAt)) ||
    (!next.startedAt && next.assessment !== 'unknown') ||
    !['better','same','worse','unknown'].includes(next.assessment) ||
    !Number.isFinite(Date.parse(next.recordedAt))) throw new Error('Relato de fabricante inválido.');
  const preserved = String(notes ?? '').split(/\r?\n/).filter(line => !line.startsWith(MANUFACTURER_TRANSITION_PREFIX_M129));
  const cleaned: ManufacturerTransitionM129 = {
    acquisitionId: next.acquisitionId,
    sourceManufacturer: next.sourceManufacturer.trim().slice(0, 120),
    ...(next.priorManufacturer ? { priorManufacturer: next.priorManufacturer.trim().slice(0, 120) } : {}),
    startedAt: next.startedAt,
    assessment: next.assessment,
    ...(next.notes?.trim() ? { notes: next.notes.trim().slice(0, 1000) } : {}),
    recordedAt: next.recordedAt,
    ...(next.appearanceBefore ? { appearanceBefore: {
      format: next.appearanceBefore.format.slice(0, 60),
      colors: next.appearanceBefore.colors.filter(c => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 2),
    } } : {}),
  };
  return [...preserved, `${MANUFACTURER_TRANSITION_PREFIX_M129}${JSON.stringify(cleaned)}`].filter(Boolean).join('\n');
}

/**
 * Somente compras/retiradas com data real explícita. `historico` vem do
 * único grafo reativo V313, já filtrado por conta e pessoa; conferimos de novo.
 */
export function findPreviousManufacturerM129(current: Renovacao, history: readonly Renovacao[]): string | null {
  // Captura local estreitada para o callback: o TypeScript não pode garantir que
  // uma propriedade opcional de um objeto permaneça definida dentro de filter().
  const acquisitionDate = current.data_aquisicao;
  if (!current.id || !current.user_id || !current.person_id || !acquisitionDate ||
    !validClinicalDayM129(acquisitionDate)) return null;
  const candidates = history.filter(row =>
    row.id && row.id !== current.id &&
    row.user_id === current.user_id && row.person_id === current.person_id &&
    row.medicamento_id === current.medicamento_id &&
    row.data_aquisicao && validClinicalDayM129(row.data_aquisicao) &&
    row.data_aquisicao < acquisitionDate &&
    readManufacturerMetadata(row.observacoes).manufacturer
  ).sort((a, b) => (b.data_aquisicao || '').localeCompare(a.data_aquisicao || '') ||
    (b.created_at || '').localeCompare(a.created_at || '') || String(b.id).localeCompare(String(a.id)));
  return candidates.length ? readManufacturerMetadata(candidates[0].observacoes).manufacturer || null : null;
}

export function describeManufacturerChangeM129(current: string, previous?: string | null) {
  if (!current.trim()) return { changed: false, message: 'Fabricante não informado.', hasComparison: false };
  if (!previous?.trim()) return { changed: false, message: 'Sem fabricante anterior confirmado para comparar.', hasComparison: false };
  const changed = manufacturerComparisonKeyM129(current) !== manufacturerComparisonKeyM129(previous);
  return {
    changed,
    hasComparison: true,
    message: changed
      ? `Mudança de fabricante registrada: ${previous} → ${current}. Informe quando começou a usar a nova apresentação.`
      : `Fabricante mantido: ${current}. Não há troca confirmada neste histórico.`,
  };
}

export function manufacturerEvidenceSummaryM129(record: ManufacturerTransitionM129 | null, previous: string | null) {
  if (!record) return 'Nenhum relato de início de uso registrado. Compra não significa uso iniciado.';
  if (!record.startedAt) return 'Uso do novo produto ainda não confirmado. Sem avaliação comparativa.';
  const words: Record<ManufacturerAssessmentM129, string> = {
    better: 'Você relatou melhora percebida',
    same: 'Você relatou nenhuma mudança percebida',
    worse: 'Você relatou piora percebida',
    unknown: 'Você ainda não definiu uma comparação',
  };
  return `${words[record.assessment]} com ${record.sourceManufacturer} após iniciar o produto em ${record.startedAt.split('-').reverse().join('/')}${previous ? `, em relação ao registro anterior de ${previous}` : ''}. Relato pessoal, não comprova relação causal.`;
}

export function appearanceBeforeM129(medication?: Medicamento | null): { format: string; colors: string[] } | undefined {
  if (!medication) return undefined;
  return {
    format: String(medication.formato || medication.forma_farmaceutica || 'não informado'),
    colors: (medication.cores || []).filter(c => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 2),
  };
}
