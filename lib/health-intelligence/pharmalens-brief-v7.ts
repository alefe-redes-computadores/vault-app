/** Resumo descritivo para consulta. Não é laudo nem prescrição. */
import type { PharmaLensReportV7 } from './pharmalens-v7';
import type { PharmaLensObservationsV7 } from './pharmalens-observation-v7';
const displayDay = (s: string | null) => s ? s.split('-').reverse().join('/') : 'não confirmado';
const changeLabel = { better: 'melhora percebida', same: 'sem alteração percebida', worse: 'piora percebida', unknown: 'ainda sem avaliação' } as const;
export function makePharmaLensConsultationBriefV7(args: {
  medicationName: string;
  report: PharmaLensReportV7;
  observations: PharmaLensObservationsV7;
  generatedOn: string;
}): string {
  const { medicationName, report, observations, generatedOn } = args;
  const out = [
    'VAULT — PharmaLens | Resumo pessoal para consulta',
    `Medicamento registrado: ${medicationName || 'não informado'}`,
    `Preparado em: ${displayDay(generatedOn)}`,
    `Período observado: últimos ${observations.rangeDays} dias`,
    '',
    'Relatos e aquisições documentadas',
  ];
  if (!report.cycles.length) out.push('Não há aquisição documentada com identificação suficiente.');
  for (const cycle of report.cycles) {
    const obs = observations.entries.find(e => e.acquisitionId === cycle.acquisitionId);
    out.push(`• ${cycle.manufacturer || 'Fabricante não informado'} | aquisição ${displayDay(cycle.acquiredAt)} | início ${displayDay(cycle.startedAt)}`);
    out.push(`  Avaliação pessoal da troca: ${cycle.perceivedChange ? changeLabel[cycle.perceivedChange] : 'não documentada'}. Relatos próprios: ${cycle.checkIns.length}.`);
    if (obs && obs.observedDays > 0) {
      out.push(`  Janela com ${obs.observedDays} dias; doses programadas registradas como tomadas: ${obs.takenScheduled}; SOS/extra como tomadas: ${obs.takenRescue}; ignoradas explicitamente: ${obs.explicitlyIgnored}.`);
      out.push(`  Contexto de outros tratamentos contínuos: ${obs.concomitantIgnoredDays} dia(s) com dose ignorada; ${obs.confirmedOtherStockGapDays} dia(s) com falta de estoque explicitamente declarada.`);
      out.push(`  Registros de saúde: ${obs.healthRecordDays} dia(s), dos quais ${obs.healthConnectRecordDays} registro(s) recebidos do Health Connect.`);
    } else out.push('  Sem janela de uso exclusiva confirmada para cruzamento temporal.');
    if (cycle.issues.length) out.push(`  Pontos a conferir no cadastro: ${cycle.issues.join(', ')}.`);
  }
  out.push('', 'Limitações importantes',
    '• Compra, início de uso e tomada efetiva são eventos distintos.',
    '• Registros e relatos são observacionais; não demonstram melhor eficácia, bioequivalência, causalidade ou segurança por fabricante.',
    '• Contagens dependem dos registros disponíveis; ausência de dose registrada NÃO indica interrupção.',
    '• Sinais de outros tratamentos, sono e Health Connect são contexto, não interpretação farmacocinética.',
    '• Não alterar dose, marca ou tratamento a partir deste relatório. Rever com profissional de saúde.');
  return out.join('\n');
}
