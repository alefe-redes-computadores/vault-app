/** Macro C F4: projection of REAL pressure records. Never changes raw records or diagnoses. */
export type PressureSourceC3 = "manual" | "samsung_manual" | "health_connect" | null | undefined;
export type PressureReadingInputC3 = {
  id?: string | null;
  data?: string | null;
  horario?: string | null;
  valor_medicao?: string | null;
  unidade_medida?: string | null;
  source?: PressureSourceC3;
  device_id?: string | null;
};
export type PressureTrendPointC3 = {
  id: string | null;
  date: string;
  time: string | null;
  sys: number;
  dia: number;
  unitConfirmed: boolean;
  source: PressureSourceC3;
  hasDevice: boolean;
  hasContext: boolean;
  consultation: string | null;
  symptom: string | null;
};
export function pressureSourceLabelC3(source: PressureSourceC3): string {
  switch (source) {
    case "manual": return "Registro manual";
    case "samsung_manual": return "Samsung Health — entrada manual";
    case "health_connect": return "Health Connect";
    default: return "Origem não informada";
  }
}
/** Caller first scopes by owner/person and sorts records. This function only annotates an existing point. */
export function projectPressurePointC3(
  record: PressureReadingInputC3,
  sys: number,
  dia: number,
  hasContext: boolean,
  context?: { consultation?: string | null; symptom?: string | null },
  unitConfirmed = false,
): PressureTrendPointC3 {
  return {
    id: typeof record.id === "string" && record.id.length ? record.id : null,
    date: typeof record.data === "string" ? record.data : "",
    time: typeof record.horario === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(record.horario.trim()) ? record.horario.trim() : null,
    sys,
    dia,
    unitConfirmed,
    source: record.source ?? null,
    hasDevice: Boolean(record.device_id),
    hasContext: Boolean(hasContext),
    consultation: typeof context?.consultation === "string" && context.consultation.trim() ? context.consultation : null,
    symptom: typeof context?.symptom === "string" && context.symptom.trim() ? context.symptom : null,
  };
}

/** C4: leitura de valor PERSISTIDO, não de draft. A validação segue os limites
 * de validateMetric(pressao_arterial) e o padrão textual de healthReadingValue.
 * Um legado sem unidade mantém seu valor mas não ganha unidade confirmada.
 * A tela não infere diagnóstico nem altera o banco, o writer ou o PDF.
 */
export function parsePressureTrendValueC4(raw: string | null | undefined, declaredUnit?: string | null):
  { sys: number; dia: number; unitConfirmed: boolean } | null {
  const text = typeof raw === "string" ? raw : "";
  const unit = typeof declaredUnit === "string" ? declaredUnit.trim() : "";
  if (unit && unit.toLowerCase() !== "mmhg") return null;
  const match = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?\s*$/i.exec(text);
  if (!match) return null;
  const sys = Number(match[1]), dia = Number(match[2]);
  if (!Number.isInteger(sys) || !Number.isInteger(dia) || sys < 30 || sys > 300 ||
      dia < 20 || dia > 200 || dia >= sys) return null;
  return { sys, dia, unitConfirmed: Boolean(unit) || /\d\s*mmHg\s*$/i.test(text) };
}
