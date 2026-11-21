export type ParsedPressure = { systolic: number; diastolic: number; display: string; abbreviated: boolean };

export function parsePressureDraft(raw: string): ParsedPressure | null {
  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact) return null;
  let left = "";
  let right = "";
  if (compact.includes("/")) {
    [left, right] = compact.split("/", 2);
  } else {
    const digits = compact.replace(/\D/g, "");
    if (digits.length === 4) [left, right] = [digits.slice(0, 2), digits.slice(2)];
    else if (digits.length === 5) [left, right] = [digits.slice(0, 3), digits.slice(3)];
    else return null;
  }
  if (!/^\d{2,3}$/.test(left) || !/^\d{1,2}$/.test(right)) return null;
  const abbreviated = left.length === 2 && Number(left) < 30;
  const systolic = abbreviated ? Number(left) * 10 : Number(left);
  const diastolic = abbreviated ? Number(right) * 10 : Number(right);
  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic) || systolic < 30 || systolic > 300 || diastolic < 20 || diastolic > 200 || diastolic >= systolic) return null;
  return { systolic, diastolic, display: `${systolic}/${diastolic}`, abbreviated };
}
