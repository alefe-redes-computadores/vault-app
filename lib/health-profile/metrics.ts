import type { HealthMetric } from "./types";
export function ageOn(
  birth: string | null | undefined,
  today: string
): number | null {
  if (!birth || !validDate(birth) || birth > today) return null;
  const [y, m, d] = birth.split("-").map(Number),
    [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number),
    v = new Date(y, m - 1, d, 12);
  return v.getFullYear() === y && v.getMonth() === m - 1 && v.getDate() === d;
}
export function bmi(
  weight: number | undefined,
  height: number | null | undefined
): number | null {
  return weight &&
    height &&
    Number.isFinite(weight) &&
    Number.isFinite(height) &&
    weight > 0 &&
    height > 0
    ? Math.round((weight / (height / 100) ** 2) * 10) / 10
    : null;
}
export function decimal(value: string): number {
  return Number(value.trim().replace(",", "."));
}
export function validateMetric(
  type: HealthMetric,
  value: number,
  second?: number
): void {
  const ranges: Record<HealthMetric, [number, number]> = {
    sono: [1, 1440],
    peso: [1, 500],
    pressao_arterial: [30, 300],
    frequencia_cardiaca: [20, 300],
    oxigenacao: [1, 100],
    caminhada: [1, 1440],
  };
  const [min, max] = ranges[type];
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    ([
      "sono",
      "caminhada",
      "pressao_arterial",
      "frequencia_cardiaca",
      "oxigenacao",
    ].includes(type) &&
      !Number.isInteger(value))
  )
    throw new Error("Confira o valor e a unidade informados.");
  if (
    type === "pressao_arterial" &&
    (!second ||
      !Number.isInteger(second) ||
      second < 20 ||
      second > 200 ||
      second >= value)
  )
    throw new Error(
      "Informe pressão sistólica e diastólica, por exemplo 120 / 80."
    );
}
export function sleepDuration(start: string, end: string): number {
  const a = Date.parse(start),
    b = Date.parse(end),
    minutes = Math.round((b - a) / 60000);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    minutes <= 0 ||
    minutes > 1440 ||
    b > Date.now()
  )
    throw new Error(
      "Confira início e fim do sono: até 24 horas, sem horário futuro."
    );
  return minutes;
}
