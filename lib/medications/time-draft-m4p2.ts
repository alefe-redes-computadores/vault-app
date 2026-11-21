/**
 * M4 P2: parser puro de edição humana; não mascara cada tecla.
 * Só converte em HH:mm no commit (blur / Enter), sem reordenar dígitos.
 * Nenhum horário é criado por inferência de dose/estoque.
 */
export function resolveMedicationTimeDraftM4P2(raw: string): string | null {
  const text = raw.trim();
  if (!text) return '';
  if (!/^[0-9:]+$/.test(text)) return null;
  let h = '', m = '';
  if (text.includes(':')) {
    const parts = text.split(':');
    if (parts.length !== 2 || parts[0].length < 1 || parts[0].length > 2 || parts[1].length > 2) return null;
    h = parts[0]; m = parts[1] || '00';
  } else {
    const digits = text;
    if (digits.length < 1 || digits.length > 4) return null;
    if (digits.length <= 2) { h = digits; m = '00'; }
    else if (digits.length === 3) { h = digits.slice(0, 1); m = digits.slice(1); }
    else { h = digits.slice(0, 2); m = digits.slice(2); }
  }
  const hour = Number(h), minute = Number(m);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
