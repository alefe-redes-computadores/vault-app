import type { ClinicalMonthBrainInsight, ClinicalMonthDoseRow, ClinicalMonthRecordRow } from "@/lib/clinical-month-report";
import type { RegistroSaude } from "@/lib/types";

const LABELS: Record<string, string> = {
  scheduled: "Rotina", sos: "SOS (Resgate)", extra: "Dose Extra",
  sem_estoque: "Sem estoque / Barreira de fornecimento", nao_realizada: "Não realizada",
  already_knew: "Ciente no momento do registro", atencao: "Atenção",
  importante: "Importante", informativa: "Informativa",
};

export const clinicalLabel = (value: string | null | undefined): string => LABELS[value || ""] || sanitizeClinicalText(value || "Não informado");

export function sanitizeClinicalText(value: unknown): string {
  let text = String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\$([^$]+)\$/g, "$1").replace(/~/g, " ");
  for (const [key, label] of Object.entries(LABELS)) text = text.replace(new RegExp(`\\b${key}\\b`, "g"), label);
  return text.replace(/\s{2,}/g, " ").trim();
}

export interface ClinicalMonthDoseDay { date: string; lines: string[]; }
export interface ClinicalMonthBarrier { medication: string; affectedDays: number; ignoredDoses: number; detail: string; }

const quantity = (row: ClinicalMonthDoseRow) => row.quantity === null ? "quantidade não informada" : String(row.quantity);
export function groupClinicalMonthDoses(rows: readonly ClinicalMonthDoseRow[]): ClinicalMonthDoseDay[] {
  const days = new Map<string, ClinicalMonthDoseRow[]>();
  for (const row of rows) days.set(row.date, [...(days.get(row.date) || []), row]);
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, dayRows]) => {
    const lines: string[] = [];
    const routineTaken = new Map<string, ClinicalMonthDoseRow[]>();
    for (const row of dayRows) {
      if (row.status === "taken" && (row.doseKind === "scheduled" || !row.doseKind)) {
        const key = row.scheduledTime || "Horário não informado";
        routineTaken.set(key, [...(routineTaken.get(key) || []), row]);
        continue;
      }
      const when = row.scheduledTime || "Horário não informado";
      const real = row.confirmedAt ? new Date(row.confirmedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Não informado";
      if (row.status === "ignored") lines.push(`${when} | Ignorada: ${row.medication} (${quantity(row)}) — Motivo: ${clinicalLabel(row.reason || "nao_realizada")}`);
      else lines.push(`${when} | ${clinicalLabel(row.doseKind)} tomada: ${row.medication} (${quantity(row)}) · Registro real: ${real}${row.safety ? " · Alerta preservado" : ""}`);
    }
    for (const [when, taken] of routineTaken) {
      const medicines = taken.map(row => `${row.medication} (${quantity(row)})`).join(", ");
      const real = taken.some(row => row.confirmedAt) ? " · Registro real: ver registros individuais" : "";
      lines.unshift(`${when} | Rotina tomada: ${medicines}${real}`);
    }
    return { date, lines: lines.map(sanitizeClinicalText) };
  });
}

export function buildSupplyBarriers(rows: readonly ClinicalMonthDoseRow[]): ClinicalMonthBarrier[] {
  const grouped = new Map<string, ClinicalMonthDoseRow[]>();
  for (const row of rows) if (row.status === "ignored" && row.reason === "sem_estoque") grouped.set(row.medication, [...(grouped.get(row.medication) || []), row]);
  return [...grouped.entries()].map(([medication, items]) => ({
    medication, affectedDays: new Set(items.map(item => item.date)).size, ignoredDoses: items.length,
    detail: "Motivo explicitamente registrado: Sem estoque / Barreira de fornecimento",
  })).sort((a, b) => b.affectedDays - a.affectedDays || a.medication.localeCompare(b.medication));
}

function recordKind(record: RegistroSaude): string {
  return `${record.tipo} ${record.nome} ${record.registro_chave || ""}`.toLowerCase();
}
const cleanObservation = (value?: string) => sanitizeClinicalText(value || "").replace(/Samsung Health via Health Connect\.?/gi, "").replace(/Duração do intervalo da sessão[^.]*\.?/gi, "").trim();

export function aggregateClinicalMonthRecords(records: readonly RegistroSaude[]): { rows: ClinicalMonthRecordRow[]; biometricSourceNote: string | null } {
  const groups = new Map<string, RegistroSaude[]>();
  let hasHealthConnect = false;
  for (const record of records) {
    if (record.source === "health_connect") hasHealthConnect = true;
    const kind = recordKind(record);
    const family = /caminh|walk/.test(kind) ? "walk" : /água|agua|hidrat/.test(kind) ? "water" : /sono|sleep/.test(kind) ? "sleep" : /humor|mood/.test(kind) ? "mood" : `${record.tipo}:${record.nome}`;
    groups.set(`${record.data}|${family}`, [...(groups.get(`${record.data}|${family}`) || []), record]);
  }
  const rows: ClinicalMonthRecordRow[] = [];
  for (const [key, items] of groups) {
    const [date, family] = key.split("|");
    if (family === "walk") {
      const minutes = items.reduce((sum, item) => sum + (item.duracao_minutos || item.valor_numerico || 0), 0);
      rows.push({ date, title: "Caminhada", detail: `${minutes} min total (${items.length} sessão(ões) registrada(s))` });
    } else if (family === "water") {
      const ml = items.reduce((sum, item) => sum + (item.valor_numerico || Number.parseFloat(item.valor_medicao || "") || 0), 0);
      rows.push({ date, title: "Água", detail: `${ml} ml (${items.length} registro(s))` });
    } else if (family === "sleep") {
      const minutes = Math.max(...items.map(item => item.duracao_minutos || 0));
      rows.push({ date, title: "Sono", detail: `${minutes ? `${minutes} min` : "Intervalo registrado"}${items.length > 1 ? ` · ${items.length} sessões recebidas, principal exibida` : ""}` });
    } else if (family === "mood") {
      const item = items.find(entry => entry.valor_medicao || typeof entry.intensidade === "number" || cleanObservation(entry.observacoes));
      if (item) rows.push({ date, title: item.nome || "Humor", detail: sanitizeClinicalText([item.valor_medicao, typeof item.intensidade === "number" ? `Intensidade ${item.intensidade}/10` : "", cleanObservation(item.observacoes)].filter(Boolean).join(" · ")) });
    } else for (const item of items) rows.push({ date, title: item.nome || item.tipo || "Registro de saúde", detail: sanitizeClinicalText([item.valor_medicao, typeof item.intensidade === "number" ? `Intensidade ${item.intensidade}/10` : "", cleanObservation(item.observacoes)].filter(Boolean).join(" · ")) });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return { rows, biometricSourceNote: hasHealthConnect ? "Fonte biométrica: Samsung Health via Health Connect. Sessões importadas podem ser consolidadas por dia." : null };
}

export function dedupeClinicalBrainInsights(items: readonly ClinicalMonthBrainInsight[]): ClinicalMonthBrainInsight[] {
  const chosen = new Map<string, ClinicalMonthBrainInsight>();
  for (const item of items) {
    const percentage = item.message.match(/\b\d+\s*(?:de\s*\d+\s*)?\(?(\d{1,3}%)\)?/i)?.[1] || "";
    const subject = item.title.toLowerCase()
      .replace(/^rotina de\s+/, "")
      .replace(/:\s*uso registrado.*$/, "")
      .replace(/\buso registrado.*$/, "")
      .replace(/[^a-zà-ú0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const key = `${item.detectedAt.slice(0, 10)}|${subject}|${percentage}`;
    const current = chosen.get(key);
    if (!current || `${item.title} ${item.message}`.length > `${current.title} ${current.message}`.length) chosen.set(key, { ...item, title: sanitizeClinicalText(item.title), message: sanitizeClinicalText(item.message), severity: clinicalLabel(item.severity) });
  }
  return [...chosen.values()].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
