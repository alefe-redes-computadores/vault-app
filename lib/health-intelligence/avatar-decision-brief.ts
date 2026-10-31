/** P12: apresentação cautelosa da decisão do Brain no Avatar.
 * Apenas resume evidências calculadas; nunca registra dose, compra, retirada ou diagnóstico.
 */
export type AvatarDecisionBriefInput = {
  title?: string | null;
  reason?: string | null;
  lane?: "now" | "prepare" | "discuss" | "observe" | null;
  evidenceKind?: "recorded" | "projected" | "association" | "missing_data" | null;
  counts?: { overdue?: number; prepare?: number; unknown?: number } | null;
  overdueWithdrawals?: number | null;
  missingDocuments?: number | null;
};
export type AvatarDecisionBrief = {title:string; explanation:string; authority:string};
const clean=(value:string|null|undefined)=>typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,260):"";
const count=(value:number|null|undefined)=>typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.trunc(value)):0;
export function buildAvatarDecisionBrief(input: AvatarDecisionBriefInput): AvatarDecisionBrief {
  // P14 R2: sem título registrado, o fallback respeita a etapa real; não inventa execução.
  const fallbackTitle=input.lane==="now"?"Revisar atenção registrada":input.lane==="prepare"?"Preparar próxima etapa":input.lane==="discuss"?"Levar questão à consulta":input.lane==="observe"?"Acompanhar evolução":"Acompanhar o cuidado registrado";
  const title=clean(input.title) || fallbackTitle;
  const authority=input.evidenceKind==="recorded"?"Fato registrado":input.evidenceKind==="projected"?"Projeção, não confirmação":input.evidenceKind==="association"?"Associação temporal, não causal":input.evidenceKind==="missing_data"?"Dados ainda incompletos":"Resumo de registros";
  const reason=clean(input.reason);
  // Never transform an unknown or projected stage into a completed clinical event.
  const safeReason=reason || (input.evidenceKind==="projected"?"Estimativa para planejamento; confirme os registros antes de agir.":input.evidenceKind==="missing_data"?"Faltam dados para explicar uma próxima etapa.":input.evidenceKind==="association"?"Associação temporal observada; não demonstra causa nem diagnóstico.":"Abra os registros vinculados para conferir a situação.");
  const overdue=count(input.overdueWithdrawals), missing=count(input.missingDocuments);
  // P14: uma pendência nunca oculta outra no resumo da Fênix. São eventos distintos e verificáveis.
  const situation=[overdue?`${overdue} retirada(s) com data vencida ainda exigem revisão.`:"",missing?`${missing} documento(s) sinalizado(s) como ausente(s) pedem conferência.`:""].filter(Boolean).join(" ");
  const counts=input.counts;
  const fallback=!reason&&!situation&&counts&&(count(counts.overdue)||count(counts.prepare)||count(counts.unknown))
    ? `${count(counts.overdue)} para decidir · ${count(counts.prepare)} para preparar · ${count(counts.unknown)} para esclarecer.`:"";
  return {title, authority, explanation: [safeReason,situation||fallback].filter(Boolean).join(" ").slice(0,370)};
}
