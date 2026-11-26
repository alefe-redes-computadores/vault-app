import type * as M from './model';
import { EXERCISES, EXERCISE_IDENTITIES, NUTRITION_MODALITIES, getExercise } from './catalog';
import { civil, fail, instant, localDay, number, nutrients, oneOf, own, requireBoolean, requireId, requireScope, text, time, uniqueIds } from './validation';
import { clockTimes, validateClock } from './clock';
import {collectVitalBackup,verifyVitalBackupRemote,restoreVitalBackupEmpty} from './backup';
import type {VitalRemote} from './cloud-transport';
const live = <T extends M.Row>(rows: readonly T[], s: M.Scope) => rows.filter(r => own(r, s) && !r.deleted_at);
const positive = (v: unknown, max = 1000000) => { const n = number(v, max); if (n !== null && n <= 0)
    fail('Quantidade deve ser positiva.'); return n; };
const kinds = Object.keys(EXERCISE_IDENTITIES) as M.ExerciseKind[];
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const rowData = (r: M.Row) => { const { id, user_id, person_id, created_at, updated_at, deleted_at, revision, synced, ...rest } = r; return rest; };
const need = (v: unknown, max = 120) => text(v, max, true)!;
const optionalId = (v: string | null) => v === null ? null : requireId(v);
const arrays = <T>(v: readonly T[], max: number): readonly T[] => { if (!Array.isArray(v) || v.length > max)
    fail('Quantidade de itens inválida.'); return v; };
const uniqueDay = <T extends M.Row & {
    day: string;
}>(rows: T[], s: M.Scope, day: string, id: string) => { if (live(rows, s).some(r => r.day === day && r.id !== requireId(id)))
    fail('Já existe um registro para este dia. Abra o registro existente.'); };
/** Sole candidate writer for new Vital tables. No side database, scheduler or clinical writer. */
export class VitalRepository {
    constructor(private readonly storage: M.VitalStorage, private readonly now: () => Date = () => new Date(), private readonly newId: () => string = () => crypto.randomUUID()) { }
    private async write<T>(scope: M.Scope, run: (tx: M.VitalTransaction, s: M.Scope) => Promise<T>): Promise<T> { const s = requireScope(scope); return this.storage.transaction(s, 'write', tx => run(tx, s)); }
    private async get<K extends M.TableName>(tx: M.VitalTransaction, s: M.Scope, table: K, id: string): Promise<M.VitalTables[K]> { const row = await tx.get(table, requireId(id)); if (!row || !own(row, s) || row.deleted_at)
        fail('Registro indisponível nesta pessoa.'); return row; }
    private stamp() { return this.now().toISOString(); }
    private async save<K extends M.TableName>(tx: M.VitalTransaction, s: M.Scope, table: K, req: M.SaveIdentity, data: Omit<M.VitalTables[K], keyof M.Row>, auditReason?: string | null): Promise<M.VitalTables[K]> {
        const id = requireId(req.id);
        const previous = await tx.get(table, id);
        if (previous && (!own(previous, s) || previous.deleted_at))
            fail('Identidade indisponível.');
        if (previous && same(rowData(previous), data))
            return previous; // stable retry, no duplicate outbox
        if ((previous?.revision ?? null) !== req.expected_revision)
            fail('Registro alterado em outra sessão. Revise antes de salvar.');
        const stamp = new Date(Math.max(this.now().getTime(), previous ? Date.parse(previous.updated_at) + 1 : 0)).toISOString();
        const next = { ...data, id, ...s, created_at: previous?.created_at ?? stamp, updated_at: stamp, deleted_at: null, revision: (previous?.revision ?? 0) + 1, synced: false } as M.VitalTables[K];
        if (previous && auditReason) {
            const audit: M.VitalAudit = { id: requireId(this.newId()), ...s, created_at: stamp, updated_at: stamp, revision: 1, deleted_at: null, synced: false, target_table: table, target_id: id, previous_revision: previous.revision, reason: need(auditReason, 500), previous: rowData(previous) };
            await tx.put('vital_audit', audit);
            await tx.enqueue('vital_audit', 'add', audit);
        }
        await tx.put(table, next);
        await tx.enqueue(table, previous ? 'update' : 'add', next);
        return next;
    }
    async list<K extends M.TableName>(scope: M.Scope, table: K): Promise<M.VitalTables[K][]> { const s = requireScope(scope); return this.storage.transaction(s, 'read', async (tx) => live(await tx.list(table), s)); }
    async saveExercise(scope: M.Scope, req: M.Save<Omit<M.ExerciseRow, keyof M.Row>>) { return this.write(scope, async (tx, s) => { const d = req.data; return this.save(tx, s, 'vital_exercises', req, { name: need(d.name), kind: oneOf(d.kind, kinds), region: text(d.region, 80), equipment: text(d.equipment, 100), aliases: arrays(d.aliases, 20).map(x => need(x, 80)), favorite: requireBoolean(d.favorite), active: requireBoolean(d.active) }); }); }
    async saveFood(scope: M.Scope, req: M.Save<Omit<M.FoodRow, keyof M.Row>>) { return this.write(scope, (tx, s) => this.save(tx, s, 'vital_foods', req, { name: need(req.data.name), favorite: requireBoolean(req.data.favorite), active: requireBoolean(req.data.active), notes: text(req.data.notes) })); }
    private async exerciseSnapshot(tx: M.VitalTransaction, s: M.Scope, ref: M.ExerciseRef, old?: M.ExerciseSnapshot): Promise<M.ExerciseSnapshot> {
        const source = oneOf(ref.source, ['catalog', 'custom'] as const);
        // Existing historical snapshot remains unchanged even if catalog renamed or deactivated.
        if (old && old.source === source && old.id === ref.id)
            return { ...old };
        if (source === 'catalog') {
            const e = getExercise(ref.id);
            if (!e)
                fail('Exercício não encontrado no catálogo.');
            return { source, id: e.id, name: e.name, kind: e.kind, region: e.region ?? null, equipment: e.equipment ?? null };
        }
        const e = await this.get(tx, s, 'vital_exercises', ref.id);
        if (!e.active)
            fail('Exercício inativo.');
        return { source, id: e.id, name: e.name, kind: e.kind, region: e.region, equipment: e.equipment };
    }
    async favoriteExercise(scope: M.Scope, req: M.Save<{
        exercise_id: string;
    }>) { return this.write(scope, async (tx, s) => { if (!getExercise(req.data.exercise_id))
        fail('Exercício de catálogo desconhecido.'); if (live(await tx.list('vital_exercise_favorites'), s).some(x => x.exercise_id === req.data.exercise_id && x.id !== requireId(req.id)))
        fail('Favorito já existente.'); return this.save(tx, s, 'vital_exercise_favorites', req, { exercise_id: req.data.exercise_id }); }); }
    async saveTrainingPlan(scope: M.Scope, req: M.Save<Omit<M.TrainingPlan, keyof M.Row>>) { return this.write(scope, (tx,s)=>this.inSaveTrainingPlan(tx,s,req)); }
    private async inSaveTrainingPlan(tx:M.VitalTransaction,s:M.Scope,req: M.Save<Omit<M.TrainingPlan, keyof M.Row>>) { const d = req.data; const starts = civil(d.starts_on), ends = d.ends_on === null ? null : civil(d.ends_on); if (ends && ends < starts)
        fail('Fim anterior ao início.'); const old = await tx.get('vital_training_plans', req.id); if (old && own(old, s) && (old.starts_on !== starts || (ends !== null && (old.ends_on === null || ends < old.ends_on))) && (await tx.list('vital_training_plan_versions')).some(v => own(v, s) && v.plan_id === old.id && !v.deleted_at))
        fail('Vigência histórica não pode ser reescrita. Encerre por nova versão.'); return this.save(tx, s, 'vital_training_plans', req, { name: need(d.name), starts_on: starts, ends_on: ends }); }
    async saveNutritionPlan(scope: M.Scope, req: M.Save<Omit<M.NutritionPlan, keyof M.Row>>) { return this.write(scope, (tx,s)=>this.inSaveNutritionPlan(tx,s,req)); }
    private async inSaveNutritionPlan(tx:M.VitalTransaction,s:M.Scope,req: M.Save<Omit<M.NutritionPlan, keyof M.Row>>) { const d = req.data; const starts = civil(d.starts_on), ends = d.ends_on === null ? null : civil(d.ends_on); if (ends && ends < starts)
        fail('Fim anterior ao início.'); const professional = optionalId(d.professional_id); if (professional && !await tx.ownsReference('professional', professional))
        fail('Profissional fora da conta.'); const old = await tx.get('vital_nutrition_plans', req.id); if (old && own(old, s) && (old.starts_on !== starts || (ends !== null && (old.ends_on === null || ends < old.ends_on))) && (await tx.list('vital_nutrition_plan_versions')).some(v => own(v, s) && v.plan_id === old.id && !v.deleted_at))
        fail('Vigência histórica não pode ser reescrita. Encerre por nova versão.'); return this.save(tx, s, 'vital_nutrition_plans', req, { name: need(d.name), starts_on: starts, ends_on: ends, professional_id: professional }); }
    private async versionContext<K extends 'vital_training_plan_versions' | 'vital_nutrition_plan_versions'>(tx: M.VitalTransaction, s: M.Scope, table: K, req: M.SaveIdentity, plan: M.TrainingPlan | M.NutritionPlan, day: string) {
        const versions = live(await tx.list(table), s).filter(x => x.plan_id === plan.id);
        const existing = await tx.get(table, requireId(req.id));
        if (existing) {
            if (!own(existing, s) || existing.plan_id !== plan.id || existing.deleted_at)
                fail('Versão indisponível.');
            return { existing, version: existing.version };
        }
        if (req.expected_revision !== null)
            fail('Versões são imutáveis.');
        if (day < plan.starts_on || (plan.ends_on && day > plan.ends_on))
            fail('Vigência fora do plano.');
        if (versions.some(v => v.effective_on > day))
            fail('Nova versão deve suceder a vigência anterior.');
        return { existing: undefined, version: Math.max(0, ...versions.map(x => x.version)) + 1 };
    }
    async addTrainingVersion(scope: M.Scope, req: M.Save<{
        plan_id: string;
        effective_on: string;
        items: readonly (Omit<M.TrainingPlanItem, 'exercise'> & {
            exercise: M.ExerciseRef;
        })[];
        goal: string | null;
        status: M.PlanStatus;
    }>) { return this.write(scope, (tx,s)=>this.inAddTrainingVersion(tx,s,req)); }
    private async inAddTrainingVersion(tx:M.VitalTransaction,s:M.Scope,req: M.Save<{
        plan_id: string;
        effective_on: string;
        items: readonly (Omit<M.TrainingPlanItem, 'exercise'> & {
            exercise: M.ExerciseRef;
        })[];
        goal: string | null;
        status: M.PlanStatus;
    }>) {
            const d = req.data, p = await this.get(tx, s, 'vital_training_plans', d.plan_id), day = civil(d.effective_on), ctx = await this.versionContext(tx, s, 'vital_training_plan_versions', req, p, day);
            const raw = arrays(d.items, 200);
            uniqueIds(raw);
            const items: M.TrainingPlanItem[] = [];
            for (const item of raw) {
                const weekday = number(item.weekday, 6, true);
                if (weekday === null)
                    fail('Dia da ficha obrigatório.');
                const load = number(item.target_load, 100000), unit = item.target_load_unit === null ? null : oneOf(item.target_load_unit, ['kg', 'lb'] as const);
                if ((load === null) !== (unit === null))
                    fail('Carga precisa de unidade.');
                items.push({ id: requireId(item.id), weekday, label: need(item.label, 80), exercise: await this.exerciseSnapshot(tx, s, item.exercise, ctx.existing?.items.find(i => i.id === item.id)?.exercise), target_seconds: positive(item.target_seconds, 86400), target_sets: number(item.target_sets, 1000, true), target_reps: number(item.target_reps, 10000, true), target_load: load, target_load_unit: unit });
            }
            const data = { plan_id: p.id, version: ctx.version, effective_on: day, status: oneOf(d.status, ['active', 'paused', 'ended'] as const), plan_name: ctx.existing?.plan_name ?? p.name, items, goal: text(d.goal) };
            if (ctx.existing && !same(rowData(ctx.existing), data))
                fail('Versão existente não pode ser alterada. Crie outra versão.');
            return this.save(tx, s, 'vital_training_plan_versions', req, data);
        }
    async addNutritionVersion(scope: M.Scope, req: M.Save<Omit<M.NutritionPlanVersion, keyof M.Row | 'version' | 'plan_name' | 'professional_id' | 'modalities'>>) { return this.write(scope, (tx,s)=>this.inAddNutritionVersion(tx,s,req)); }
    private async inAddNutritionVersion(tx:M.VitalTransaction,s:M.Scope,req: M.Save<Omit<M.NutritionPlanVersion, keyof M.Row | 'version' | 'plan_name' | 'professional_id' | 'modalities'>>) { const d = req.data, p = await this.get(tx, s, 'vital_nutrition_plans', d.plan_id), day = civil(d.effective_on), ctx = await this.versionContext(tx, s, 'vital_nutrition_plan_versions', req, p, day); const ids = [...new Set(arrays(d.modality_ids, 20))]; if(!ids.length)fail('Modalidade inválida.');const snapshots:M.ModalitySnapshot[]=[];for(const mid of ids){const previous=ctx.existing?.modalities.find(m=>m.id===mid);if(previous){snapshots.push(previous);continue;}const standard=NUTRITION_MODALITIES.find(m=>m.id===mid&&m.active);if(standard){snapshots.push({id:standard.id,name:standard.name,identity_id:standard.id,category:standard.category});continue;}if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mid))fail('Modalidade inválida.');const custom=await this.get(tx,s,'vital_nutrition_modalities',mid);if(!custom.active)fail('Modalidade inativa.');snapshots.push({id:custom.id,name:custom.name,identity_id:custom.identity_id,category:custom.category});} const custom = text(d.custom_modality, 120, ids.includes('custom')); const rules = arrays(d.rules, 100); uniqueIds(rules); const origin = oneOf(d.origin, ['user', 'professional'] as const); const professional = ctx.existing ? ctx.existing.professional_id : p.professional_id; if (origin === 'professional' && !professional)
        fail('Vincule o profissional existente.'); const data = { plan_id: p.id, version: ctx.version, effective_on: day, status: oneOf(d.status, ['active', 'paused', 'ended'] as const), plan_name: ctx.existing?.plan_name ?? p.name, professional_id: professional, modality_ids: ids, modalities:snapshots, custom_modality: custom, rules: rules.map(r => ({ id: requireId(r.id), label: need(r.label), detail: text(r.detail) })), targets: nutrients(d.targets), origin, notes: text(d.notes) }; if (ctx.existing && !same(rowData(ctx.existing), data))
        fail('Versão existente não pode ser alterada. Crie outra versão.'); return this.save(tx, s, 'vital_nutrition_plan_versions', req, data); }
    private async validatePlanVersion(tx: M.VitalTransaction, s: M.Scope, table: 'vital_training_plan_versions' | 'vital_nutrition_plan_versions', id: string | null, day: string, oldId: string | null) { if (id === null)
        return null; const v = await this.get(tx, s, table, id); if (v.effective_on > day)
        fail('Versão ainda não vigente nesta data.'); if (id === oldId)
        return id; const plan = table === 'vital_training_plan_versions' ? await this.get(tx, s, 'vital_training_plans', v.plan_id) : await this.get(tx, s, 'vital_nutrition_plans', v.plan_id); if (day < plan.starts_on || (plan.ends_on && day > plan.ends_on))
        fail('Plano fora de vigência.'); const eligible = live(await tx.list(table), s).filter(x => x.plan_id === v.plan_id && x.effective_on <= day).sort((a, b) => b.effective_on.localeCompare(a.effective_on)||b.version-a.version); if (eligible.filter(x=>x.version===v.version).length!==1||eligible[0]?.id !== id || v.status !== 'active')
        fail('Selecione a versão ativa e vigente na data.'); return id; }
    async saveWorkout(scope: M.Scope, req: M.Save<Omit<M.WorkoutData, 'items'> & {
        items: readonly (Omit<M.WorkoutItem, 'exercise'> & {
            exercise: M.ExerciseRef;
        })[];
    }>, correctionReason?: string) {
        return this.write(scope, async (tx, s) => {
            const d = req.data, previous = await tx.get('vital_workout_sessions', requireId(req.id));
            if (previous && !own(previous, s))
                fail('Sessão fora da pessoa.');
            const day = civil(d.day), status = oneOf(d.status, ['planned', 'in_progress', 'completed', 'cancelled', 'draft'] as const), modality = oneOf(d.modality, ['strength', 'cardio', 'mixed', 'outdoor', 'free', 'custom'] as const);
            const now = this.now();
            if (previous?.status === 'cancelled' && status !== 'cancelled')
                fail('Sessão cancelada não pode ser reativada automaticamente.');
            if ((status === 'completed' || status === 'in_progress') && day > localDay(now))
                fail('Realização futura não pode ser registrada.');
            const start = instant(d.started_at), end = instant(d.ended_at);
            if (start && end && end < start)
                fail('Fim anterior ao início.');
            if ((status === 'completed' || status === 'in_progress') && ((start && Date.parse(start) > now.getTime()) || (end && Date.parse(end) > now.getTime())))
                fail('Horário futuro não é realização.');
            if (status === 'planned' && (end || d.active_seconds !== null || d.pause_seconds !== null || d.clock))
                fail('Planejamento não é realização.');
            let total = number(d.duration_seconds, 604800, true), active = number(d.active_seconds, 604800, true), pause = number(d.pause_seconds, 604800, true);
            const source = d.duration_source === null ? null : oneOf(d.duration_source, ['declared', 'measured'] as const);
            const clock = d.clock ? validateClock(d.clock, now.getTime()) : null;
            if (clock && !['draft', 'in_progress', 'completed'].includes(status))
                fail('Cronômetro incompatível com o estado.');
            if (clock && status === 'completed') {
                if (clock.stopped_ms === null)
                    fail('Encerre o cronômetro antes de concluir.');
                const t = clockTimes(clock, now.getTime());
                total = t.elapsed_seconds;
                active = t.active_seconds;
                pause = t.pause_seconds;
            }
            if (total !== null && ((active ?? 0) + (pause ?? 0) > total))
                fail('Tempo ativo e pausas excedem duração total.');
            if (total === null && (active !== null || pause !== null))
                fail('Informe duração total para detalhar os tempos.');
            if (total !== null && !source && !clock)
                fail('Informe a origem da duração.');
            const location = optionalId(d.location_id), rehab = optionalId(d.rehab_program_id);
            if (location && (!previous || location !== previous.location_id) && !await tx.ownsReference('location', location))
                fail('Local fora da conta.');
            if (rehab && (!previous || rehab !== previous.rehab_program_id) && !await tx.ownsReference('rehab_program', rehab))
                fail('Reabilitação fora da pessoa.');
            const version = await this.validatePlanVersion(tx, s, 'vital_training_plan_versions', optionalId(d.plan_version_id), day, previous?.day === day ? previous.plan_version_id : null);
            const raw = arrays(d.items, 200);
            uniqueIds(raw);
            const items: M.WorkoutItem[] = [];
            const setIds = new Set<string>();
            for (const item of raw) {
                const sets = arrays(item.sets, 100);
                uniqueIds(sets);
                for (const set of sets) {
                    const id = requireId(set.id);
                    if (setIds.has(id))
                        fail('Série duplicada.');
                    setIds.add(id);
                }
                const cleanSets = sets.map(set => { const load = number(set.load, 100000), unit = set.load_unit === null ? null : oneOf(set.load_unit, ['kg', 'lb'] as const); if ((load === null) !== (unit === null))
                    fail('Carga precisa de unidade.'); const reps = number(set.reps, 10000, true), seconds = positive(set.seconds, 86400), rest = number(set.rest_seconds, 86400, true); if (reps === null && seconds === null && load === null && rest === null)
                    fail('Série vazia.'); return { id: requireId(set.id), reps, load, load_unit: unit, seconds, rest_seconds: rest }; });
                const itemClock = item.clock ? validateClock(item.clock, now.getTime()) : null, restClock = item.rest_clock ? validateClock(item.rest_clock, now.getTime()) : null;
                if ((itemClock || restClock) && !['draft', 'in_progress', 'completed'].includes(status))
                    fail('Cronômetro de exercício incompatível com o estado.');
                if (status === 'completed' && (itemClock?.stopped_ms === null || restClock?.stopped_ms === null))
                    fail('Encerre os cronômetros do exercício.');
                const duration = itemClock && status === 'completed' ? clockTimes(itemClock, now.getTime()).active_seconds : positive(item.duration_seconds, 604800);
                const restSeconds = restClock && status === 'completed' ? clockTimes(restClock, now.getTime()).active_seconds : number(item.rest_seconds, 604800, true);
                if (total !== null && status === 'completed' && duration !== null && duration > total)
                    fail('Tempo do aparelho excede a sessão.');
                items.push({ id: requireId(item.id), exercise: await this.exerciseSnapshot(tx, s, item.exercise, previous?.items.find(i => i.id === item.id)?.exercise), duration_seconds: duration, distance_m: number(item.distance_m, 10000000), intensity: text(item.intensity, 80), laterality: oneOf(item.laterality, ['left', 'right', 'bilateral', 'not_reported'] as const), adaptation: text(item.adaptation), sets: cleanSets, clock: itemClock, rest_clock: restClock, rest_seconds: restSeconds });
            }
            const data: M.WorkoutData = { day, title: need(d.title), modality, custom_modality: text(d.custom_modality, 120, modality === 'custom'), status, started_at: start, ended_at: end, duration_seconds: total, active_seconds: active, pause_seconds: pause, duration_source: clock && status === 'completed' ? 'measured' : source, location_id: location, location_label: text(d.location_label, 120), plan_version_id: version, rehab_program_id: rehab, notes: text(d.notes), items, clock };
            if (status === 'completed' && !items.length && total === null)
                fail('Informe ao menos duração ou atividade realizada.');
            if (previous?.status === 'completed' && !same(rowData(previous), data) && !text(correctionReason, 500))
                fail('Informe o motivo da retificação.');
            if (previous?.status === 'completed' && status !== 'completed')
                fail('Retifique ou exclua explicitamente o registro realizado.');
            return this.save(tx, s, 'vital_workout_sessions', req, data, previous?.status === 'completed' ? correctionReason : null);
        });
    }
    async saveMeal(scope: M.Scope, req: M.Save<M.MealData>, correctionReason?: string) {
        return this.write(scope, async (tx, s) => {
            const d = req.data, previous = await tx.get('vital_meals', requireId(req.id));
            if (previous && !own(previous, s))
                fail('Refeição fora da pessoa.');
            const day = civil(d.day);
            if (day > localDay(this.now()))
                fail('Refeição futura não é fato realizado.');
            const mealTime = time(d.time);
            const current = this.now();
            if (day === localDay(current) && mealTime && mealTime > `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`)
                fail('Horário futuro não é refeição realizada.');
            const kind = oneOf(d.kind, ['breakfast', 'lunch', 'snack', 'dinner', 'supper', 'custom'] as const);
            const raw = arrays(d.items, 200);
            uniqueIds(raw);
            if (!raw.length)
                fail('Informe ao menos um alimento.');
            const items: M.MealItem[] = [];
            for (const item of raw) {
                const foodId = optionalId(item.food_id), old = previous?.items.find(i => i.id === item.id), sameRef = foodId && old?.food_id === foodId;
                let name = need(item.name);
                if (foodId) {
                    if (sameRef)
                        name = old!.name;
                    else {
                        const food = await this.get(tx, s, 'vital_foods', foodId);
                        if (!food.active)
                            fail('Alimento inativo.');
                        name = food.name;
                    }
                }
                const qty = positive(item.quantity), unit = text(item.unit, 40);
                if ((qty === null) !== (unit === null))
                    fail('Porção conhecida exige quantidade e unidade.');
                const ns = nutrients(item.nutrients), src = item.nutrient_source === null ? null : oneOf(item.nutrient_source, ['declared', 'label'] as const);
                if (Object.keys(ns).length && !src)
                    fail('Informe a fonte dos valores nutricionais.');
                items.push({ id: requireId(item.id), food_id: foodId, name, quantity: qty, unit, nutrients: ns, nutrient_source: Object.keys(ns).length?src:null });
            }
            const data: M.MealData = { day, time: mealTime, kind, custom_label: text(d.custom_label, 80, kind === 'custom'), plan_version_id: await this.validatePlanVersion(tx, s, 'vital_nutrition_plan_versions', optionalId(d.plan_version_id), day, previous?.day === day ? previous.plan_version_id : null), items, notes: text(d.notes) };
            if (previous && !same(rowData(previous), data) && !text(correctionReason, 500))
                fail('Informe o motivo da retificação.');
            return this.save(tx, s, 'vital_meals', req, data, previous ? correctionReason : null);
        });
    }
    async saveTrainingCheckin(scope: M.Scope, req: M.Save<Omit<M.TrainingCheckin, keyof M.Row>>) { return this.write(scope, async (tx, s) => { const day = civil(req.data.day), status = oneOf(req.data.status, ['trained', 'rest', 'absent'] as const); if (day > localDay(this.now()) && status !== 'rest')
        fail('Declaração de realização ou ausência futura inválida.'); uniqueDay(await tx.list('vital_training_checkins'), s, day, req.id); const prior = await tx.get('vital_training_checkins', req.id); if (prior && prior.day !== day)
        fail('Dia do check-in não pode ser transferido.'); return this.save(tx, s, 'vital_training_checkins', req, { day, status, reason: text(req.data.reason) }); }); }
    async saveNutritionCheckin(scope: M.Scope, req: M.Save<Omit<M.NutritionCheckin, keyof M.Row | 'daily_totals' | 'daily_source'> & Partial<Pick<M.NutritionCheckin,'daily_totals'|'daily_source'>>>) { return this.write(scope, async (tx, s) => { const day = civil(req.data.day); if (day > localDay(this.now()))
        fail('Autoavaliação futura inválida.'); uniqueDay(await tx.list('vital_nutrition_checkins'), s, day, req.id); const prior = await tx.get('vital_nutrition_checkins', req.id); if (prior && prior.day !== day)
        fail('Dia do check-in não pode ser transferido.'); const daily=nutrients(req.data.daily_totals??prior?.daily_totals??{}); const source=Object.keys(daily).length?oneOf(req.data.daily_source===undefined?prior?.daily_source:req.data.daily_source,['declared','label'] as const):null; const status=req.data.status===null?null:oneOf(req.data.status,['followed','partial','outside'] as const); const energy=text(req.data.energy,120),satiety=text(req.data.satiety,120),adaptation=text(req.data.adaptation); if(!status&&!source&&!energy&&!satiety&&!adaptation)fail('Informe ao menos um dado ou uma autoavaliação.'); return this.save(tx,s,'vital_nutrition_checkins',req,{day,status,daily_totals:daily,daily_source:source,energy,satiety,adaptation}); }); }
    async archive<K extends Exclude<M.TableName, 'vital_audit' | 'vital_training_plan_versions' | 'vital_nutrition_plan_versions'>>(scope: M.Scope, table: K, id: string, expectedRevision: number, reason: string) { return this.write(scope, async (tx, s) => { if (!['vital_exercises', 'vital_foods', 'vital_workout_sessions', 'vital_training_checkins', 'vital_meals', 'vital_nutrition_checkins', 'vital_exercise_favorites','vital_nutrition_modalities'].includes(table))
        fail('Tabela não permite exclusão por esta operação.'); const old = await tx.get(table, requireId(id)); if (!old || !own(old, s))
        fail('Registro indisponível.'); if (old.deleted_at)
        return old; if (old.revision !== expectedRevision)
        fail('Registro alterado em outra sessão.'); if (table === 'vital_training_plans' || table === 'vital_nutrition_plans')
        fail('Encerre ou pause o plano, preservando as versões.'); const stamp = new Date(Math.max(this.now().getTime(), Date.parse(old.updated_at) + 1)).toISOString(); const audit: M.VitalAudit = { id: requireId(this.newId()), ...s, created_at: stamp, updated_at: stamp, deleted_at: null, revision: 1, synced: false, target_table: table, target_id: id, previous_revision: old.revision, reason: need(reason, 500), previous: rowData(old) }; const next = { ...old, deleted_at: stamp, updated_at: stamp, revision: old.revision + 1, synced: false }; await tx.put('vital_audit', audit); await tx.enqueue('vital_audit', 'add', audit); await tx.put(table, next); await tx.enqueue(table, 'update', next); return next; }); }

    /** Initial root and immutable first version commit together, or neither commits. */
    async createTrainingPlan(scope:M.Scope,root:Parameters<VitalRepository['saveTrainingPlan']>[1],version:Parameters<VitalRepository['addTrainingVersion']>[1]) {
      if(root.expected_revision!==null||version.expected_revision!==null||version.data.plan_id!==root.id)fail('Identidades iniciais incompatíveis.');
      return this.write(scope,async(tx,s)=>{const plan=await this.inSaveTrainingPlan(tx,s,root);const initial=await this.inAddTrainingVersion(tx,s,version);return {plan,version:initial};});
    }
    async createNutritionPlan(scope:M.Scope,root:Parameters<VitalRepository['saveNutritionPlan']>[1],version:Parameters<VitalRepository['addNutritionVersion']>[1]) {
      if(root.expected_revision!==null||version.expected_revision!==null||version.data.plan_id!==root.id)fail('Identidades iniciais incompatíveis.');
      return this.write(scope,async(tx,s)=>{const plan=await this.inSaveNutritionPlan(tx,s,root);const initial=await this.inAddNutritionVersion(tx,s,version);return {plan,version:initial};});
    }
    async revisionHistory(scope:M.Scope,table:M.TableName,targetId:string){const s=requireScope(scope);requireId(targetId);return this.storage.transaction(s,'read',async tx=>live(await tx.list('vital_audit'),s).filter(r=>r.target_table===table&&r.target_id===targetId).sort((a,b)=>b.previous_revision-a.previous_revision));}
    async exportBackup(scope:M.Scope){const s=requireScope(scope);return this.storage.transaction(s,'read',tx=>collectVitalBackup(tx,s));}
    async restoreBackup(scope:M.Scope,raw:unknown,remote:VitalRemote){const s=requireScope(scope);const verified=await verifyVitalBackupRemote(raw,s,remote);return this.write(s,tx=>restoreVitalBackupEmpty(tx,s,verified));}
    async snapshot(scope:M.Scope){const s=requireScope(scope);return this.storage.transaction(s,'read',async tx=>({
      exercises:live(await tx.list('vital_exercises'),s),foods:live(await tx.list('vital_foods'),s),favorites:live(await tx.list('vital_exercise_favorites'),s),
      workouts:live(await tx.list('vital_workout_sessions'),s),trainingCheckins:live(await tx.list('vital_training_checkins'),s),
      trainingPlans:live(await tx.list('vital_training_plans'),s),trainingVersions:live(await tx.list('vital_training_plan_versions'),s),
      meals:live(await tx.list('vital_meals'),s),nutritionCheckins:live(await tx.list('vital_nutrition_checkins'),s),
      nutritionModalities:live(await tx.list('vital_nutrition_modalities'),s),nutritionPlans:live(await tx.list('vital_nutrition_plans'),s),nutritionVersions:live(await tx.list('vital_nutrition_plan_versions'),s)
    }));}
    async saveModality(scope:M.Scope,req:M.Save<Omit<M.CustomModality,keyof M.Row>>){return this.write(scope,(tx,s)=>{const d=req.data;if(!NUTRITION_MODALITIES.some(x=>x.id===d.identity_id&&x.active))fail('Identidade semântica inválida.');return this.save(tx,s,'vital_nutrition_modalities',req,{name:need(d.name),description:text(d.description),aliases:arrays(d.aliases,20).map(x=>need(x,80)),category:oneOf(d.category,['pattern','preference','custom'] as const),identity_id:d.identity_id,active:requireBoolean(d.active)});});}
    private async assertPlanBase(tx:M.VitalTransaction,s:M.Scope,table:'vital_training_plan_versions'|'vital_nutrition_plan_versions',planId:string,newId:string,expectedPrevious:string|null){
      const rows=live(await tx.list(table),s).filter(x=>x.plan_id===planId).sort((a,b)=>b.version-a.version);
      if(rows[0]?.id===newId)return; // exact retry still validated by immutable version writer
      if((rows[0]?.id??null)!==expectedPrevious)fail('A ficha ou plano recebeu nova versão. Revise antes de salvar.');
    }
    async reviseTrainingPlan(scope:M.Scope,root:Parameters<VitalRepository['saveTrainingPlan']>[1],version:Parameters<VitalRepository['addTrainingVersion']>[1],expectedPrevious:string|null){if(root.expected_revision===null||version.expected_revision!==null||version.data.plan_id!==root.id)fail('Identidades de revisão incompatíveis.');return this.write(scope,async(tx,s)=>{await this.assertPlanBase(tx,s,'vital_training_plan_versions',root.id,version.id,expectedPrevious);return {plan:await this.inSaveTrainingPlan(tx,s,root),version:await this.inAddTrainingVersion(tx,s,version)};});}
    async reviseNutritionPlan(scope:M.Scope,root:Parameters<VitalRepository['saveNutritionPlan']>[1],version:Parameters<VitalRepository['addNutritionVersion']>[1],expectedPrevious:string|null){if(root.expected_revision===null||version.expected_revision!==null||version.data.plan_id!==root.id)fail('Identidades de revisão incompatíveis.');return this.write(scope,async(tx,s)=>{await this.assertPlanBase(tx,s,'vital_nutrition_plan_versions',root.id,version.id,expectedPrevious);return {plan:await this.inSaveNutritionPlan(tx,s,root),version:await this.inAddNutritionVersion(tx,s,version)};});}
}
