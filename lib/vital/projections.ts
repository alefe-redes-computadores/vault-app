import type * as M from './model';
import { civil, fail, NUTRIENT_KEYS, own } from './validation';
import { EXERCISES, EXERCISE_IDENTITIES, findExercises } from './catalog';
const scoped = <T extends M.Row>(r: readonly T[], s: M.Scope) => r.filter(x => own(x, s) && !x.deleted_at);
export function trainingDay(s: M.Scope, day: string, rows: readonly M.WorkoutRow[], checkins: readonly M.TrainingCheckin[]) {
    civil(day);
    const sessions = scoped(rows, s).filter(x => x.day === day && x.status === 'completed');
    const declarations = scoped(checkins, s).filter(x => x.day === day);
    const explicit = declarations.length === 1 ? declarations[0] : null;
    if (declarations.length > 1 || (sessions.length && explicit && explicit.status !== 'trained'))
        return { state: 'conflict' as const, sessions, declaration: explicit };
    return { state: sessions.length ? 'trained' as const : explicit?.status ?? 'unknown' as const, sessions, declaration: explicit };
}
export function trainingPeriod(s: M.Scope, from: string, to: string, rows: readonly M.WorkoutRow[], checkins: readonly M.TrainingCheckin[]) {
    civil(from);
    civil(to);
    if (from > to)
        fail('Período inválido.');
    const sessions = scoped(rows, s).filter(x => x.status === 'completed' && x.day >= from && x.day <= to);
    const days = new Set(sessions.map(x => x.day));
    const declarations = scoped(checkins, s).filter(x => x.day >= from && x.day <= to);
    for (const x of declarations)
        days.add(x.day);
    const states = [...days].sort().map(day => ({ day, ...trainingDay(s, day, sessions, declarations) }));
    const intervals = sessions.filter(x => x.started_at && x.ended_at).map(x => ({ start: Date.parse(x.started_at!), end: Date.parse(x.ended_at!) })).sort((a, b) => a.start - b.start);
    let overlap = false, end = -Infinity;
    for (const x of intervals) {
        if (x.start < end)
            overlap = true;
        end = Math.max(end, x.end);
    }
    const known = sessions.filter(x => x.duration_seconds !== null), knownActive = sessions.filter(x => x.active_seconds !== null);
    const modality: Partial<Record<M.Modality, number>> = {};
    const exercise = new Map<string, {
        id: string;
        name: string;
        kind: M.ExerciseKind;
        count: number;
        duration_seconds: number | null;
        duration_count: number;
    }>();
    for (const session of sessions) {
        modality[session.modality] = (modality[session.modality] ?? 0) + 1;
        for (const item of session.items) {
            const key = `${item.exercise.source}:${item.exercise.id}`;
            const prior = exercise.get(key) ?? { id: key, name: item.exercise.name, kind: item.exercise.kind, count: 0, duration_seconds: null, duration_count: 0 };
            prior.count++;
            if (item.duration_seconds !== null) {
                prior.duration_seconds = (prior.duration_seconds ?? 0) + item.duration_seconds;
                prior.duration_count++;
            }
            exercise.set(key, prior);
        }
    }
    return { sessions: sessions.length, days: states, confirmed_days: states.filter(x => x.state === 'trained').length, conflict_days: states.filter(x => x.state === 'conflict').length, elapsed_seconds: overlap || !known.length ? null : known.reduce((sum, x) => sum + x.duration_seconds!, 0), duration_coverage: { known: known.length, total: sessions.length, overlap }, active_seconds: overlap || !knownActive.length ? null : knownActive.reduce((sum, x) => sum + x.active_seconds!, 0), active_coverage: { known: knownActive.length, total: sessions.length }, modality, exercises: [...exercise.values()] };
}
export function activePlanVersions<P extends M.TrainingPlan | M.NutritionPlan, V extends M.TrainingPlanVersion | M.NutritionPlanVersion>(s: M.Scope, day: string, plans: readonly P[], versions: readonly V[]) {
    civil(day);
    const visible = scoped(plans, s).filter(p => p.starts_on <= day && (!p.ends_on || day <= p.ends_on));
    const vs = scoped(versions, s);
    return visible.flatMap(plan => { const eligible = vs.filter(v => v.plan_id === plan.id && v.effective_on <= day).sort((a, b) => b.effective_on.localeCompare(a.effective_on) || b.version - a.version); const version = eligible[0]; if (!version)
        return []; const conflict = eligible.filter(x => x.version === version.version).length > 1; return [{ plan, version, active: !conflict && version.status === 'active', conflict }]; });
}
export function nutritionDay(s: M.Scope, day: string, rows: readonly M.MealRow[], checkins: readonly M.NutritionCheckin[], targets: M.Nutrients = {}) {
    civil(day);
    const meals = scoped(rows, s).filter(x => x.day === day).sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.created_at.localeCompare(b.created_at));
    const items = meals.flatMap(m => m.items);
    const totals = Object.fromEntries(NUTRIENT_KEYS.map(key => { const known = items.filter(i => typeof i.nutrients[key] === 'number' && Number.isFinite(i.nutrients[key]) && i.nutrients[key]! >= 0); const amount = known.length ? known.reduce((sum, x) => sum + x.nutrients[key]!, 0) : null; const complete = items.length > 0 && known.length === items.length; const target = targets[key]; return [key, { amount, known: known.length, total: items.length, complete, percent: complete && amount !== null && typeof target === 'number' && target > 0 && Number.isFinite(target) ? Math.round(amount / target * 100) : null }]; })) as Record<M.NutrientKey, {
        amount: number | null;
        known: number;
        total: number;
        complete: boolean;
        percent: number | null;
    }>;
    const declarations = scoped(checkins, s).filter(x => x.day === day);
    const checkin=declarations.length===1?declarations[0]:null;
    // A declared daily total is a separate source, never added to item values.
    const dailyTotals=Object.fromEntries(NUTRIENT_KEYS.map(k=>[k,checkin?.daily_totals?.[k]??null])) as Record<M.NutrientKey,number|null>;
    return { meals, totals, dailyTotals, dailySource:checkin?.daily_source??null, checkin, checkin_conflict: declarations.length > 1 };
}
export function exerciseCatalog(s: M.Scope, query: string, custom: readonly M.ExerciseRow[], favorites: readonly M.CatalogFavorite[]) { const favor = new Set(scoped(favorites, s).map(x => x.exercise_id)); const privateRows = scoped(custom, s).filter(x => x.active); return [...findExercises(query).map(x => ({ ...x, source: 'catalog' as const, favorite: favor.has(x.id), identity: EXERCISE_IDENTITIES[x.kind] })), ...findExercises(query, privateRows.map(x => ({ id: x.id, name: x.name, kind: x.kind, region: x.region ?? undefined, equipment: x.equipment ?? undefined, aliases: x.aliases }))).map(x => ({ ...x, source: 'custom' as const, favorite: privateRows.find(r => r.id === x.id)!.favorite, identity: EXERCISE_IDENTITIES[x.kind] }))].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'pt-BR')); }
export function reuseWorkout(s: M.Scope, row: M.WorkoutRow, day: string, newId: () => string): M.WorkoutData { civil(day); if (!own(row, s) || row.deleted_at || row.status !== 'completed')
    fail('Sessão indisponível.'); return { day, title: row.title, modality: row.modality, custom_modality: row.custom_modality, status: 'draft', started_at: null, ended_at: null, duration_seconds: null, active_seconds: null, pause_seconds: null, duration_source: null, location_id: row.location_id, location_label: row.location_label, plan_version_id: null, rehab_program_id: null, notes: null, clock: null, items: row.items.map(x => ({ id: newId(), exercise: { ...x.exercise }, duration_seconds: null, distance_m: null, intensity: null, laterality: x.laterality, adaptation: x.adaptation, sets: [] })) }; }

/** A ficha is planning: copy identities, never expected performance. */
export function workoutItemsFromPlan(s:M.Scope, day:string, version:M.TrainingPlanVersion, id:()=>string): M.WorkoutItem[] {
 civil(day);if(!own(version,s)||version.deleted_at||version.status!=='active'||version.effective_on>day)fail('Ficha indisponível nesta data.');
 const weekday=new Date(day+'T12:00:00Z').getUTCDay();
 return version.items.filter(x=>x.weekday===weekday).map(x=>({id:id(),exercise:{...x.exercise},duration_seconds:null,distance_m:null,intensity:null,laterality:'not_reported',adaptation:null,sets:[],clock:null,rest_clock:null,rest_seconds:null}));
}
/** Each point represents actual registered evidence; no missing-day zero or inferred load conversion. */
export function exerciseHistory(s:M.Scope,from:string,to:string,rows:readonly M.WorkoutRow[]) {
 civil(from);civil(to);if(from>to)fail('Período inválido.');
 const groups=new Map<string,{id:string;name:string;kind:M.ExerciseKind;points:{day:string;session_id:string;item_id:string;duration_seconds:number|null;distance_m:number|null;sets:number;loads:{amount:number;unit:'kg'|'lb'}[]}[]}>();
 for(const row of scoped(rows,s).filter(x=>x.status==='completed'&&x.day>=from&&x.day<=to).sort((a,b)=>a.day.localeCompare(b.day)||a.updated_at.localeCompare(b.updated_at))){
  for(const i of row.items){const key=i.exercise.source+':'+i.exercise.id;const group=groups.get(key)??{id:key,name:i.exercise.name,kind:i.exercise.kind,points:[]};group.points.push({day:row.day,session_id:row.id,item_id:i.id,duration_seconds:i.duration_seconds,distance_m:i.distance_m,sets:i.sets.length,loads:i.sets.flatMap(x=>x.load!==null&&x.load_unit!==null?[{amount:x.load,unit:x.load_unit}]:[])});groups.set(key,group);}
 }return [...groups.values()];
}
