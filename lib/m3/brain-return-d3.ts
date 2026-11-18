/**
 * VAULT CI360 P6 P3-D3 — Brain explicável e Cartão de Retorno.
 * Projeção de LEITURA sobre a autoridade relacional P4-A; sem mutações clínicas.
 * Um vínculo é um ID comprovado, não coincidência de data, médico ou nome.
 */
import type { EpisodeActionP4, EpisodeSnapshotP4 } from '@/lib/m3/clinical-episode-p4';

export type ReturnFactD3 = {
  key: string; title: string; date: string; detail: string; source: string;
  href: string | null;
};
export type ReturnCheckD3 = {
  key: string; title: string; explanation: string; href: string;
};
export type ReturnBriefD3 = {
  consultationId: string; consultationDay: string; consultationStatus: string;
  availableCount: number; visibleCount: number; isSummary: boolean;
  facts: ReturnFactD3[]; checks: ReturnCheckD3[]; questions: string[];
  action: EpisodeActionP4 | null; actionReason: string | null;
  latestSymptomDay: string | null; gaps: string[];
};
const clean = (value: unknown, max = 260): string => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : '';
const validDay = (raw: unknown): raw is string => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
};
const consultHref = (id: string): string => `/saude/consultas/detalhes?id=${encodeURIComponent(id)}`;

/** Somente URLs internas conhecidas; os destinos são revisáveis antes de registrar. */
export function contextualEpisodeHrefD3(href: string, consultationId: string): string {
  if (!consultationId || !/^\/saude\//.test(href) || href.startsWith('//')) return '/saude/careflow/episodios';
  if (href === '/saude/careflow/sintomas' || href === '/saude/careflow/exames' ||
      href === '/saude/careflow/modo-medico' || href === '/saude/medicamentos/novo') {
    return `${href}?consulta=${encodeURIComponent(consultationId)}`;
  }
  return href;
}

/**
 * No máximo um convite por sessão na Home (a UI P4-A já tem esse limite).
 * Se o relato que gerou o convite foi registrado HOJE, não insistir no check-in.
 * Não interpretar "ignorar" como ausência de sintomas ou conclusão de exame.
 */
export function prioritizeEpisodePromptD3(
  action: EpisodeActionP4 | null, today: string, sourceClinicalDay?: string | null
): EpisodeActionP4 | null {
  if (!action || !validDay(today)) return null;
  if (action.id.startsWith('symptom:') && validDay(sourceClinicalDay) && sourceClinicalDay === today) return null;
  return action;
}

/**
 * Projeta apenas evidências JÁ contidas no episódio escopado por pessoa/conta em P4-A.
 * O resumo de 30 linhas é uma amostra; o cartão nunca afirma completude histórica.
 * "Para conferir" significa falta de comprovação NESTE recorte, não tarefa médica pendente.
 */
export function buildReturnBriefD3(episode: EpisodeSnapshotP4, today: string): ReturnBriefD3 {
  const consultation = episode.consultation;
  if (!consultation.id || !validDay(consultation.data) || !validDay(today) || consultation.data > today ||
      episode.report.start !== consultation.data || episode.report.end !== today) {
    throw new Error('Episódio ou período incompatível com a consulta selecionada.');
  }
  const rows = episode.rows.filter(row => Boolean(row.sourceId && validDay(row.date) &&
    row.date >= consultation.data && row.date <= today));
  const symptoms = rows.filter(row => row.section === 'symptoms' && row.source === 'health_record')
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
  const latestSymptomDay = symptoms[0]?.date || null;
  const factEligible = rows.filter(row => row.section === 'symptoms' ||
    (row.section === 'careflow' && ['careflow_exam_result', 'careflow_exam_status', 'careflow_exam_order'].includes(row.source)));
  const facts: ReturnFactD3[] = [];
  const seen = new Set<string>();
  for (const row of factEligible) {
    const signature = `${row.source}:${row.sourceId}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    facts.push({key:signature, title:clean(row.title, 130), date:row.date,
      detail:clean(row.detail, 340), source:clean(row.source, 65),
      href: row.href?.startsWith('/saude/') && !row.href.startsWith('//') ? row.href : null});
    if (facts.length === 3) break;
  }
  const checks: ReturnCheckD3[] = [];
  const addCheck = (key: string, title: string, explanation: string, href: string) => {
    if (checks.length < 3) checks.push({key, title, explanation, href});
  };
  if (episode.stats.examOrders > 0) {
    addCheck('exams', 'Conferir o andamento dos exames',
      episode.stats.results === 0
        ? 'Há pedido vinculado; não encontramos resultado registrado neste episódio. Isso não prova que o exame não foi realizado.'
        : 'Há eventos relacionados a exames neste episódio. Confira cada item no registro original, sem presumir que todos foram concluídos.',
      contextualEpisodeHrefD3('/saude/careflow/exames', consultation.id));
  }
  if (episode.stats.linkedMedications > 0) {
    addCheck('medications', 'Revisar os medicamentos vinculados',
      'O vínculo é explícito, mas o cadastro atual não comprova compra, início nem administração de dose na data da consulta.',
      consultHref(consultation.id));
  }
  if (clean(consultation.proximos_passos)) {
    addCheck('followup', 'Conferir próximos passos relatados',
      'A consulta contém orientações declaradas. O VAULT não confirma automaticamente se já foram executadas.',
      consultHref(consultation.id));
  }
  if (!checks.length) {
    addCheck('review', 'Revisar se há novidades para registrar',
      'Sem pendência comprovada neste recorte. Se houve acontecimentos fora do VAULT, registre apenas fatos reais.',
      consultHref(consultation.id));
  }
  const questions: string[] = [];
  if (symptoms.length) questions.push('Que mudanças dos sintomas registrados devo relatar ao profissional?');
  if (episode.stats.examOrders > 0) questions.push('Há agendamento, coleta ou resultado de exames a apresentar ou confirmar?');
  if (episode.stats.linkedMedications > 0) questions.push('O cadastro do medicamento e o plano prescrito continuam correspondendo ao que foi orientado?');
  if (clean(consultation.proximos_passos) && questions.length < 3) questions.push('Quais próximos passos relatados já foram realizados ou precisam de revisão?');
  if (!questions.length) questions.push('Quais informações da consulta vale completar antes do próximo atendimento?');
  const action = consultation.status === 'realizada'
    ? prioritizeEpisodePromptD3(episode.nextAction, today, latestSymptomDay) : null;
  const actionReason = action?.id.startsWith('symptom:')
    ? 'Existe um relato vinculado por ID e não há nova confirmação hoje neste recorte.'
    : action?.id.startsWith('exam:') ? 'Um pedido de exames está explicitamente associado à consulta.'
    : action?.id.startsWith('next:') ? 'Há próximos passos declarados no registro original da consulta.' : null;
  return {
    consultationId: consultation.id, consultationDay: consultation.data,
    consultationStatus: consultation.status,
    availableCount: episode.report.availableCount, visibleCount: episode.rows.length,
    isSummary: episode.report.mode === 'summary', facts, checks, questions: questions.slice(0, 3),
    action, actionReason, latestSymptomDay, gaps: episode.gaps.slice(0, 4).map(x => clean(x, 350)),
  };
}

/** Cópia só depois de ação humana explícita; sem envio e sem escrita de dados. */
export function formatReturnBriefD3(brief: ReturnBriefD3): string {
  const lines = [`VAULT · Cartão de Retorno`, `Consulta: ${brief.consultationDay} · situação cadastrada: ${brief.consultationStatus}`,
    'Somente relações comprovadas por ID. Não constitui diagnóstico ou prescrição.',
    '', 'FATOS NOVOS NO RECORTE'];
  if (!brief.facts.length) lines.push('Nenhum fato adicional encontrado neste recorte (não prova ausência).');
  for (const f of brief.facts) lines.push(`• ${f.date} · ${f.title} — ${f.detail} [origem: ${f.source}]`);
  lines.push('', 'PARA CONFERIR');
  for (const c of brief.checks) lines.push(`• ${c.title}: ${c.explanation}`);
  lines.push('', 'PERGUNTAS PARA O RETORNO');
  for (const q of brief.questions) lines.push(`• ${q}`);
  lines.push('', `Fontes visíveis: ${brief.visibleCount}/${brief.availableCount}. ${brief.isSummary ? 'Resumo limitado: para todas as fontes, abra o modo detalhado.' : 'Modo detalhado do episódio.'}`);
  lines.push('Dados privados; confira antes de compartilhar. Não houve envio automático.');
  return lines.join('\n');
}
