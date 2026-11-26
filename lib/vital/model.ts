/** Independent Vital domain. Canonical DB adapter must enforce account ownership in each transaction. */
export type Scope = Readonly<{
    user_id: string;
    person_id: string;
}>;
export type Row = Scope & {
    id: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    revision: number;
    synced: boolean;
};
export type ExerciseKind = 'machine' | 'free_weights' | 'bodyweight' | 'functional' | 'walk' | 'run' | 'cycle' | 'treadmill' | 'elliptical' | 'swim' | 'other';
export type Modality = 'strength' | 'cardio' | 'mixed' | 'outdoor' | 'free' | 'custom';
export type Laterality = 'left' | 'right' | 'bilateral' | 'not_reported';
export type NutrientKey = 'energy_kcal' | 'carbohydrate_g' | 'protein_g' | 'fat_g' | 'fiber_g';
export type Nutrients = Partial<Record<NutrientKey, number>>;
export type Exercise = {
    id: string;
    name: string;
    kind: ExerciseKind;
    region?: string;
    equipment?: string;
    aliases: readonly string[];
};
export type ExerciseRow = Row & {
    name: string;
    kind: ExerciseKind;
    region: string | null;
    equipment: string | null;
    aliases: string[];
    favorite: boolean;
    active: boolean;
};
export type FoodRow = Row & {
    name: string;
    favorite: boolean;
    active: boolean;
    notes: string | null;
};
export type ExerciseRef = {
    source: 'catalog' | 'custom';
    id: string;
};
export type ExerciseSnapshot = ExerciseRef & {
    name: string;
    kind: ExerciseKind;
    region: string | null;
    equipment: string | null;
};
export type WorkoutSet = {
    id: string;
    reps: number | null;
    load: number | null;
    load_unit: 'kg' | 'lb' | null;
    seconds: number | null;
    rest_seconds: number | null;
};
export type WorkoutItem = {
    id: string;
    exercise: ExerciseSnapshot;
    duration_seconds: number | null;
    distance_m: number | null;
    intensity: string | null;
    laterality: Laterality;
    adaptation: string | null;
    sets: WorkoutSet[];
    clock?: ClockState | null;
    rest_clock?: ClockState | null;
    rest_seconds?: number | null;
};
export type WorkoutStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'draft';
export type WorkoutData = {
    day: string;
    title: string;
    modality: Modality;
    custom_modality: string | null;
    status: WorkoutStatus;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
    active_seconds: number | null;
    pause_seconds: number | null;
    duration_source: 'declared' | 'measured' | null;
    location_id: string | null;
    location_label: string | null;
    plan_version_id: string | null;
    rehab_program_id: string | null;
    notes: string | null;
    items: WorkoutItem[];
    clock: ClockState | null;
};
export type WorkoutRow = Row & WorkoutData;
export type WorkoutCheckinStatus = 'trained' | 'rest' | 'absent';
export type TrainingCheckin = Row & {
    day: string;
    status: WorkoutCheckinStatus;
    reason: string | null;
};
export type PlanStatus = 'active' | 'paused' | 'ended';
export type TrainingPlan = Row & {
    name: string;
    starts_on: string;
    ends_on: string | null;
};
export type TrainingPlanItem = {
    id: string;
    weekday: number;
    label: string;
    exercise: ExerciseSnapshot;
    target_seconds: number | null;
    target_sets: number | null;
    target_reps: number | null;
    target_load: number | null;
    target_load_unit: 'kg' | 'lb' | null;
};
export type TrainingPlanVersion = Row & {
    plan_id: string;
    version: number;
    effective_on: string;
    status: PlanStatus;
    plan_name: string;
    items: TrainingPlanItem[];
    goal: string | null;
};
export type NutritionPlan = Row & {
    name: string;
    starts_on: string;
    ends_on: string | null;
    professional_id: string | null;
};
export type NutritionRule = {
    id: string;
    label: string;
    detail: string | null;
};
export type CustomModality = Row & { name:string;description:string|null;aliases:string[];category:'pattern'|'preference'|'custom';identity_id:string;active:boolean };
export type ModalitySnapshot={id:string;name:string;identity_id:string;category:string};
export type NutritionPlanVersion = Row & {
    plan_id: string;
    version: number;
    effective_on: string;
    status: PlanStatus;
    plan_name: string;
    professional_id: string | null;
    modality_ids: string[];
    modalities: ModalitySnapshot[];
    custom_modality: string | null;
    rules: NutritionRule[];
    targets: Nutrients;
    origin: 'user' | 'professional';
    notes: string | null;
};
export type MealKind = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'supper' | 'custom';
export type MealItem = {
    id: string;
    food_id: string | null;
    name: string;
    quantity: number | null;
    unit: string | null;
    nutrients: Nutrients;
    nutrient_source: 'declared' | 'label' | null;
};
export type MealData = {
    day: string;
    time: string | null;
    kind: MealKind;
    custom_label: string | null;
    plan_version_id: string | null;
    items: MealItem[];
    notes: string | null;
};
export type MealRow = Row & MealData;
export type NutritionCheckin = Row & {
    day: string;
    status: 'followed' | 'partial' | 'outside' | null;
    daily_totals: Nutrients;
    daily_source: 'declared' | 'label' | null;
    energy: string | null;
    satiety: string | null;
    adaptation: string | null;
};
export type VitalAudit = Row & {
    target_table: string;
    target_id: string;
    previous_revision: number;
    reason: string;
    previous: unknown;
};
export type CatalogFavorite = Row & {
    exercise_id: string;
};
export type VitalTables = {
    vital_audit: VitalAudit;
    vital_exercises: ExerciseRow;
    vital_foods: FoodRow;
    vital_workout_sessions: WorkoutRow;
    vital_training_checkins: TrainingCheckin;
    vital_training_plans: TrainingPlan;
    vital_training_plan_versions: TrainingPlanVersion;
    vital_nutrition_plans: NutritionPlan;
    vital_nutrition_plan_versions: NutritionPlanVersion;
    vital_nutrition_modalities: CustomModality;
    vital_meals: MealRow;
    vital_nutrition_checkins: NutritionCheckin;
    vital_exercise_favorites: CatalogFavorite;
};
export type TableName = keyof VitalTables;
export const TABLES: readonly TableName[] = ['vital_audit', 'vital_exercises', 'vital_foods', 'vital_workout_sessions', 'vital_training_checkins', 'vital_training_plans', 'vital_training_plan_versions', 'vital_nutrition_plans', 'vital_nutrition_plan_versions', 'vital_nutrition_modalities', 'vital_meals', 'vital_nutrition_checkins', 'vital_exercise_favorites'];
export type ClockState = {
    started_ms: number;
    running_since_ms: number | null;
    elapsed_active_ms: number;
    stopped_ms: number | null;
};
export type SaveIdentity = {
    id: string;
    expected_revision: number | null;
};
/** Stable request identity comes from the editor, not a fresh UUID on every submit. */
export type Save<T> = SaveIdentity & {
    data: T;
};
export interface VitalTransaction {
    get<K extends TableName>(table: K, id: string): Promise<VitalTables[K] | undefined>;
    list<K extends TableName>(table: K): Promise<VitalTables[K][]>;
    put<K extends TableName>(table: K, row: VitalTables[K]): Promise<void>;
    enqueue<K extends TableName>(table: K, operation: 'add' | 'update', row: VitalTables[K]): Promise<void>;
    /** Only used for cloud-confirmed restoration within the same canonical transaction. */
    assertRestoreEmpty?(): Promise<void>;
    restoreAck?(ack: import('./cloud-transport').VitalAck): Promise<void>;
    /** Existing account-wide authorities; implementations MUST validate same account. */
    ownsReference(kind: 'location' | 'professional' | 'rehab_program', id: string): Promise<boolean>;
}
export interface VitalStorage {
    /** Must check active authentication and person ownership inside atomic DB transaction. No standalone database. */
    transaction<T>(scope: Scope, mode: 'read' | 'write', run: (tx: VitalTransaction) => Promise<T>): Promise<T>;
}
