import type { Scope } from './model';
import type { CanonicalDb, CanonicalTable } from './storage-dexie';
import { fail, own, requireId, requireScope } from './validation';
/** Local-only, on the existing VaultDB; never send drafts to SyncQueue or Brain. */
export type DraftKind = 'workout' | 'meal' | 'training_plan' | 'nutrition_plan';
export type DraftRecord = Scope & {
    id: string;
    kind: DraftKind;
    schema_version: 1;
    payload: unknown;
    expected_revision: number | null;
    draft_revision: number;
    updated_at: number;
    expires_at: number;
};
export const DRAFT_STORE = 'id, user_id, person_id, [user_id+person_id], expires_at';
type DraftTable = CanonicalTable & {
    delete(id: string): PromiseLike<unknown>;
};
export function createVitalDraftStorage(deps: {
    db: CanonicalDb;
    authenticatedUser: () => Promise<string | null>;
    activeScope: () => Scope | null;
    now?: () => number;
}) {
    const now = deps.now ?? Date.now, ttl = 7 * 24 * 60 * 60 * 1000;
    async function execute<T>(raw: Scope, mode: 'r' | 'rw', fn: (s: Scope, t: DraftTable) => Promise<T>) { const s = requireScope(raw), uid = await deps.authenticatedUser(); const check = () => { if (uid !== s.user_id || !own(deps.activeScope(), s))
        fail('Pessoa ativa mudou.'); }; check(); const persons = deps.db.table('persons'), t = deps.db.table('vital_drafts') as DraftTable; return deps.db.transaction(mode, [persons, t], async () => { check(); const p = await persons.get(s.person_id); if (!p || p.user_id !== s.user_id)
        fail('Pessoa fora da conta.'); const result = await fn(s, t); check(); return result; }); }
    const owned = async (t: DraftTable, s: Scope, id: string) => { const r = await t.get(requireId(id)); if (r && (r.user_id !== s.user_id || r.person_id !== s.person_id))
        fail('Rascunho indisponível.'); return r as DraftRecord | undefined; };
    return {
        async save(scope: Scope, input: {
            id: string;
            kind: DraftKind;
            payload: unknown;
            expected_revision: number | null;
            expected_draft_revision: number | null;
        }) { return execute(scope, 'rw', async (s, t) => { if (!['workout', 'meal', 'training_plan', 'nutrition_plan'].includes(input.kind))
            fail('Tipo de rascunho inválido.'); const id = requireId(input.id); const previous = await owned(t, s, id); if (previous && previous.kind !== input.kind)
            fail('Identidade de rascunho incompatível.'); if ((previous?.draft_revision ?? null) !== input.expected_draft_revision)
            fail('Rascunho alterado em outra sessão.'); const encoded = JSON.stringify(input.payload,(_k,v)=>{if(typeof v==='number'&&!Number.isFinite(v)){if(!Number.isNaN(v))fail('Número infinito inválido.');return {__vault_invalid_number:true};}return v;}); if (!encoded || encoded.length > 500000)
            fail('Rascunho inválido ou grande demais.'); const stamp = now(); const r: DraftRecord = { id, ...s, kind: input.kind, schema_version: 1, payload: structuredClone(input.payload), expected_revision: input.expected_revision, draft_revision: (previous?.draft_revision ?? 0) + 1, updated_at: stamp, expires_at: stamp + ttl }; await t.put(r as unknown as Record<string, unknown>); return r; }); },
        async load<T>(scope: Scope, id: string, kind: DraftKind, validate: (payload: unknown) => T): Promise<{
            record: DraftRecord;
            value: T;
        } | null> { return execute(scope, 'r', async (s, t) => { const r = await owned(t, s, id); if (!r || r.expires_at <= now())
            return null; if (r.kind !== kind || r.schema_version !== 1)
            fail('Versão de rascunho incompatível.'); return { record: r, value: validate(r.payload) }; }); },
        async list(scope: Scope, kind: DraftKind) { return execute(scope, 'r', async (s, t) => (await t.where('[user_id+person_id]').equals([s.user_id, s.person_id]).toArray()).filter(r => r.user_id === s.user_id && r.person_id === s.person_id && r.kind === kind && Number(r.expires_at) > now()).map(r => ({ id: String(r.id), updated_at: Number(r.updated_at), draft_revision: Number(r.draft_revision) }))); },
        async discard(scope: Scope, id: string, revision: number) { return execute(scope, 'rw', async (s, t) => { const r = await owned(t, s, id); if (!r)
            return; if (r.draft_revision !== revision)
            fail('Rascunho mudou antes do descarte.'); await t.delete(id); }); }
    };
}
