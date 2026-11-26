import type { Nutrients, NutrientKey, Scope } from './model';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NUTRIENT_KEYS: readonly NutrientKey[] = ['energy_kcal', 'carbohydrate_g', 'protein_g', 'fat_g', 'fiber_g'];
export function fail(message: string): never { throw new Error(message); }
export function requireId(v: unknown): string { if (typeof v !== 'string' || !UUID.test(v))
    return fail('Identificador inválido.'); return v.toLowerCase(); }
export function requireScope(s: Scope): Scope { return { user_id: requireId(s.user_id), person_id: requireId(s.person_id) }; }
export function own(r: Scope | undefined | null, s: Scope) { return !!r && r.user_id === s.user_id && r.person_id === s.person_id; }
export function text(v: unknown, max = 500, required = false): string | null { if (v == null && !required)
    return null; if (typeof v !== 'string')
    return fail('Texto inválido.'); const x = v.trim(); if (!x && required)
    return fail('Preencha o campo obrigatório.'); if (x.length > max)
    return fail('Texto excede o limite permitido.'); return x || null; }
export function number(v: unknown, max = Number.MAX_SAFE_INTEGER, integer = false): number | null { if (v == null)
    return null; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max || (integer && !Number.isInteger(v)))
    return fail('Valor numérico inválido.'); return v; }
export function oneOf<T extends string>(v: unknown, values: readonly T[]): T { if (typeof v !== 'string' || !values.includes(v as T))
    return fail('Opção inválida.'); return v as T; }
export function civil(v: unknown): string { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '1900-01-01' || v > '9999-12-31')
    return fail('Data civil inválida.'); const d = new Date(v + 'T00:00:00Z'); if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v)
    return fail('Data civil inválida.'); return v; }
export function localDay(d: Date) { if (!Number.isFinite(d.getTime()))
    return fail('Relógio inválido.'); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function time(v: unknown): string | null { if (v == null || v === '')
    return null; if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    return fail('Horário inválido.'); return v; }
export function instant(v: unknown): string | null { if (v == null)
    return null; if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3}(?:0{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
    return fail('Data e hora inválidas.'); civil(v.slice(0, 10)); return new Date(v).toISOString(); }
export function nutrients(v: unknown): Nutrients { if (!v || typeof v !== 'object' || Array.isArray(v))
    return fail('Nutrientes inválidos.'); const o = v as Record<string, unknown>; if (Object.keys(o).some(k => !NUTRIENT_KEYS.includes(k as NutrientKey)))
    return fail('Nutriente desconhecido.'); const r: Nutrients = {}; for (const k of NUTRIENT_KEYS) {
    const n = number(o[k], 1000000);
    if (n !== null)
        r[k] = n;
} return r; }
export function uniqueIds(rows: readonly {
    id: string;
}[]) { const seen = new Set<string>(); for (const row of rows) {
    const id = requireId(row.id);
    if (seen.has(id))
        return fail('Item duplicado.');
    seen.add(id);
} }
export function requireBoolean(v: unknown): boolean { if (typeof v !== 'boolean')
    return fail('Estado inválido.'); return v; }
