import type { Row, Scope } from './model';
import { own } from './validation';
export type SyncDecision = 'insert' | 'compare_and_swap' | 'already_acknowledged' | 'conflict';
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
function payload(row: Row) { const { synced, ...r } = row; return { ...r, created_at: new Date(r.created_at).toISOString(), updated_at: new Date(r.updated_at).toISOString(), deleted_at: r.deleted_at === null ? null : new Date(r.deleted_at).toISOString() }; }
/** A policy for the EXISTING queue processor. The canonical dispatcher must provide the last server ACK revision, not guess it from timestamps. */
export function decideVitalSync(scope: Scope, local: Row, remote: Row | null, lastAcknowledgedRevision: number | null): SyncDecision {
    if (!own(local, scope) || !Number.isFinite(Date.parse(local.created_at)) || !Number.isFinite(Date.parse(local.updated_at)) || (local.deleted_at !== null && !Number.isFinite(Date.parse(local.deleted_at))) || !Number.isSafeInteger(local.revision) || local.revision < 1)
        return 'conflict';
    if (!remote)
        return lastAcknowledgedRevision === null ? 'insert' : 'conflict';
    if (!own(remote, scope) || !Number.isFinite(Date.parse(remote.created_at)) || !Number.isFinite(Date.parse(remote.updated_at)) || (remote.deleted_at !== null && !Number.isFinite(Date.parse(remote.deleted_at))) || remote.id !== local.id || Date.parse(remote.created_at) !== Date.parse(local.created_at))
        return 'conflict';
    if (canon(payload(local)) === canon(payload(remote)))
        return 'already_acknowledged';
    if (remote.deleted_at && !local.deleted_at)
        return 'conflict';
    if (!Number.isSafeInteger(remote.revision) || lastAcknowledgedRevision !== remote.revision || local.revision <= remote.revision)
        return 'conflict';
    return 'compare_and_swap';
}
