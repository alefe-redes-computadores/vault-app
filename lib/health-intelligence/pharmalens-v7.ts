/**
 * PharmaLens V7 / PL7-P1 — leitura DESCRITIVA de aquisições reais e relatos pessoais.
 * Não atribui causalidade, não compara eficácia clínica, não altera prescrições,
 * doses, estoque, dados sincronizados ou eventos antigos.
 */
import type { Renovacao } from '@/lib/types';
import { readManufacturerMetadata } from '@/lib/medications/manufacturer-experience';
import { readManufacturerCheckInsM127, type ManufacturerCheckInM127 } from '@/lib/medications/manufacturer-checkin-m127';
import { manufacturerComparisonKeyM129 } from '@/lib/medications/manufacturer-catalog-m129';
import { readManufacturerTransitionM129, validClinicalDayM129, type ManufacturerAssessmentM129 } from '@/lib/medications/manufacturer-transition-m129';
import { isPrescriptionOnly } from '@/lib/health-supply/renewal-event';

export type PharmaLensQualityV7 = 'documentado' | 'parcial' | 'insuficiente';
export type PharmaLensIssueV7 =
  | 'fabricante_ausente'
  | 'data_aquisicao_ausente'
  | 'inicio_uso_nao_confirmado'
  | 'troca_sem_fabricante_anterior'
  | 'relato_de_outro_fabricante'
  | 'fabricante_editado_apos_relato'
  | 'inicio_anterior_a_aquisicao';

export type PharmaLensCycleV7 = {
  acquisitionId: string;
  medicationId: string;
  manufacturer: string | null;
  commercialName: string | null;
  acquiredAt: string | null;
  startedAt: string | null;
  previousManufacturer: string | null;
  perceivedChange: ManufacturerAssessmentM129 | null;
  /** Relatos apenas do fabricante declarado nesta aquisição (considerando aliases). */
  checkIns: readonly ManufacturerCheckInM127[];
  /** Relatos históricos preservados de outro fabricante, NÃO reatribuídos. */
  otherManufacturerCheckIns: readonly ManufacturerCheckInM127[];
  issues: readonly PharmaLensIssueV7[];
  quality: PharmaLensQualityV7;
  /** Não é métrica clínica: só indica início e fabricante anterior documentados. */
  confirmedManufacturerTransition: boolean;
};

export type PharmaLensManufacturerSummaryV7 = {
  manufacturer: string;
  acquisitionCount: number;
  declaredStartCount: number;
  personalCheckInCount: number;
  /** Avaliações pessoais documentadas, não diferenças de eficácia. */
  personalAssessments: Readonly<Record<ManufacturerAssessmentM129, number>>;
};

export type PharmaLensReportV7 = {
  medicationId: string;
  cycles: readonly PharmaLensCycleV7[];
  manufacturers: readonly PharmaLensManufacturerSummaryV7[];
  totalAcquisitions: number;
  /** Cadastros com data futura omitidos das comparações (quando todayISO válido). */
  futureAcquisitionsExcluded: number;
  documentedTransitions: number;
  /** Sempre observacional; zero "score clínico". */
  interpretation: 'observacional_sem_causalidade';
};

export type PharmaLensInputV7 = {
  userId: string;
  personId: string;
  medicationId: string;
  acquisitions: readonly Renovacao[];
  /** Dia civil no fuso da interface (AAAA-MM-DD), opcional; impede tratar compra futura como realizada. */
  todayISO?: string;
};

function validDate(day: string | null | undefined): day is string {
  return typeof day === 'string' && validClinicalDayM129(day);
}
function unique<T>(list: readonly T[]): T[] { return [...new Set(list)]; }
function blankReport(medicationId: string): PharmaLensReportV7 {
  return { medicationId, cycles: [], manufacturers: [], totalAcquisitions: 0, futureAcquisitionsExcluded: 0,
    documentedTransitions: 0, interpretation: 'observacional_sem_causalidade' };
}
function key(value?: string | null): string { return manufacturerComparisonKeyM129(value); }

/**
 * Entrada deve vir do repositório por pessoa/conta, mas a fronteira valida
 * de novo. Não inclui eventos de prescrição sem compra/retirada identificável.
 * Nunca usa `data` (data da receita) como data real de aquisição.
 */
export function buildPharmaLensReportV7(input: PharmaLensInputV7): PharmaLensReportV7 {
  const { userId, personId, medicationId, acquisitions } = input;
  if (!userId || !personId || !medicationId) return blankReport(medicationId || '');
  const todayISO = validDate(input.todayISO) ? input.todayISO : null;
  const rows = acquisitions.filter(row =>
    typeof row.id === 'string' && row.id.length > 0 &&
    row.user_id === userId && row.person_id === personId &&
    row.medicamento_id === medicationId && !isPrescriptionOnly(row)
  );
  // Se o repositório entregar duplicatas por reconciliação, não duplicar relatos.
  const deduplicated = new Map<string, Renovacao>();
  for (const row of rows) {
    const id = row.id!;
    const prior = deduplicated.get(id);
    const modified = row.updated_at || row.created_at || '';
    if (!prior || modified > (prior.updated_at || prior.created_at || '')) deduplicated.set(id, row);
  }
  const futureAcquisitionsExcluded = todayISO ? [...deduplicated.values()].filter(row => validDate(row.data_aquisicao) && row.data_aquisicao > todayISO).length : 0;
  const sorted = [...deduplicated.values()]
    .filter(row => !(todayISO && validDate(row.data_aquisicao) && row.data_aquisicao > todayISO))
    .sort((a, b) =>
    (validDate(b.data_aquisicao) ? b.data_aquisicao : '').localeCompare(validDate(a.data_aquisicao) ? a.data_aquisicao : '') ||
    String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id))
  );

  const cycles: PharmaLensCycleV7[] = sorted.map(row => {
    const id = row.id!;
    const meta = readManufacturerMetadata(row.observacoes);
    const manufacturer = meta.manufacturer || null;
    const acquiredAt = validDate(row.data_aquisicao) ? row.data_aquisicao : null;
    const transition = readManufacturerTransitionM129(row.observacoes, id);
    const sameTransitionManufacturer = Boolean(manufacturer && transition && key(transition.sourceManufacturer) === key(manufacturer));
    const start = sameTransitionManufacturer && validDate(transition?.startedAt) ? transition!.startedAt : null;
    const checkIns = readManufacturerCheckInsM127(row.observacoes, id);
    const ownCheckIns = manufacturer ? checkIns.filter(item => key(item.manufacturer) === key(manufacturer)) : [];
    const otherCheckIns = checkIns.filter(item => !manufacturer || key(item.manufacturer) !== key(manufacturer));
    const earlier = acquiredAt ? sorted
      .filter(candidate => candidate.id !== id && validDate(candidate.data_aquisicao) && candidate.data_aquisicao < acquiredAt && readManufacturerMetadata(candidate.observacoes).manufacturer)
      .sort((a,b) => (b.data_aquisicao || '').localeCompare(a.data_aquisicao || '') || String(b.id).localeCompare(String(a.id)))[0] : undefined;
    const previousManufacturer = earlier ? readManufacturerMetadata(earlier.observacoes).manufacturer || null : null;
    const changed = Boolean(manufacturer && previousManufacturer && key(manufacturer) !== key(previousManufacturer));
    const issues: PharmaLensIssueV7[] = [];
    if (!manufacturer) issues.push('fabricante_ausente');
    if (!acquiredAt) issues.push('data_aquisicao_ausente');
    if (!start) issues.push('inicio_uso_nao_confirmado');
    if (transition && !sameTransitionManufacturer) issues.push('fabricante_editado_apos_relato');
    if (otherCheckIns.length) issues.push('relato_de_outro_fabricante');
    if (start && acquiredAt && start < acquiredAt) issues.push('inicio_anterior_a_aquisicao');
    if (transition && start && !previousManufacturer && transition.assessment !== 'unknown') issues.push('troca_sem_fabricante_anterior');
    const validStart = Boolean(start && acquiredAt && start >= acquiredAt && (!todayISO || start <= todayISO));
    const confirmedManufacturerTransition = Boolean(validStart && changed && transition && sameTransitionManufacturer);
    const perceivedChange: ManufacturerAssessmentM129 | null = confirmedManufacturerTransition && transition!.assessment !== 'unknown' ? transition!.assessment : null;
    // Sem início confirmado, a aquisição permanece uma observação incompleta.
    const quality: PharmaLensQualityV7 = !manufacturer ? 'insuficiente'
      : acquiredAt && validStart && !issues.includes('fabricante_editado_apos_relato') ? 'documentado' : 'parcial';
    return {
      acquisitionId: id, medicationId, manufacturer, commercialName: meta.commercialName || null,
      acquiredAt, startedAt: validStart ? start : null, previousManufacturer,
      perceivedChange, checkIns: ownCheckIns, otherManufacturerCheckIns: otherCheckIns,
      issues: unique(issues), quality, confirmedManufacturerTransition,
    };
  });

  const grouped = new Map<string, { name: string; entries: PharmaLensCycleV7[] }>();
  for (const cycle of cycles) {
    if (!cycle.manufacturer) continue;
    const normalized = key(cycle.manufacturer);
    const group = grouped.get(normalized) || { name: cycle.manufacturer, entries: [] };
    group.entries.push(cycle); grouped.set(normalized, group);
  }
  const manufacturers: PharmaLensManufacturerSummaryV7[] = [...grouped.values()].map(({name,entries}) => ({
    manufacturer: name,
    acquisitionCount: entries.length,
    declaredStartCount: entries.filter(x => !!x.startedAt).length,
    personalCheckInCount: entries.reduce((sum, x) => sum + x.checkIns.length, 0),
    personalAssessments: {
      better: entries.filter(x => x.perceivedChange === 'better').length,
      same: entries.filter(x => x.perceivedChange === 'same').length,
      worse: entries.filter(x => x.perceivedChange === 'worse').length,
      unknown: entries.filter(x => x.perceivedChange === 'unknown').length,
    },
  })).sort((a,b) => b.acquisitionCount - a.acquisitionCount || a.manufacturer.localeCompare(b.manufacturer,'pt-BR'));
  return { medicationId, cycles, manufacturers, totalAcquisitions: cycles.length, futureAcquisitionsExcluded,
    documentedTransitions: cycles.filter(x => x.confirmedManufacturerTransition).length,
    interpretation: 'observacional_sem_causalidade' };
}
