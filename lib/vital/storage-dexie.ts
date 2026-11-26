import type { Scope, Row, TableName, VitalStorage, VitalTransaction, VitalTables } from './model';
import { TABLES } from './model';
import {vitalAckId,vitalTable} from './cloud-transport';
import { fail, own, requireId, requireScope } from './validation';
/** Structural port for VaultDB, injected after handoff. No new Dexie instance. */
export interface CanonicalTable {
    get(id: string): PromiseLike<Record<string, unknown> | undefined>;
    put(row: Record<string, unknown>): PromiseLike<unknown>;
    where(index: string): {
        equals(key: readonly string[]): {
            toArray(): PromiseLike<Record<string, unknown>[]>;
        };
    };
}
export interface CanonicalDb {
    table(name: string): CanonicalTable;
    transaction<T>(mode: 'r' | 'rw', tables: readonly CanonicalTable[], callback: () => Promise<T>): PromiseLike<T>;
}
export type CanonicalQueue = (table: TableName, operation: 'add' | 'update', row: Record<string, unknown>, options: {
    dispatchSync: false;
}) => Promise<void>;
/** Bind ONLY to existing getLocalFirstAuthUser, active scope, VaultDB and enfileirarOperacao. */
export function createVitalStorage(deps: {
    db: CanonicalDb;
    authenticatedUser: () => Promise<string | null>;
    activeScope: () => Scope | null;
    enqueue: CanonicalQueue;
    dispatch: () => void;
    onDispatchError?: () => void;
}): VitalStorage {
    return { async transaction<T>(raw: Scope, mode: 'read' | 'write', run: (tx: VitalTransaction) => Promise<T>) {
            const s = requireScope(raw);
            const uid = await deps.authenticatedUser();
            const assertActive = () => { if (uid !== s.user_id || !own(deps.activeScope(), s))
                fail('Conta ou pessoa ativa mudou.'); };
            assertActive();
            const names = [...TABLES, 'persons', 'locais', 'medicos', 'rehab_programs_m5', ...(mode === 'write' ? ['syncQueue','vital_sync_ack'] : [])];
            const tables = new Map(names.map(name => [name, deps.db.table(name)]));
            let queued = false, open = true;
            const table = (name: string) => { if (!open || !tables.has(name))
                fail('Transação fora do escopo.'); return tables.get(name)!; };
            const result = await deps.db.transaction(mode === 'write' ? 'rw' : 'r', [...tables.values()], async () => {
                assertActive();
                const person = await table('persons').get(s.person_id);
                if (!person || person.user_id !== s.user_id)
                    fail('Pessoa fora da conta autenticada.');
                const tx: VitalTransaction = {
                    async get<K extends TableName>(name: K, id: string) { if (!TABLES.includes(name))
                        fail('Tabela inválida.'); const row = await table(name).get(requireId(id)); if (row && (row.user_id !== s.user_id || row.person_id !== s.person_id))
                        fail('ID fora do escopo.'); return row as VitalTables[K] | undefined; },
                    async list<K extends TableName>(name: K) { if (!TABLES.includes(name))
                        fail('Tabela inválida.'); return (await table(name).where('[user_id+person_id]').equals([s.user_id, s.person_id]).toArray()).filter(r => r.user_id === s.user_id && r.person_id === s.person_id) as VitalTables[K][]; },
                    async put<K extends TableName>(name: K, row: VitalTables[K]) { assertActive(); if (mode !== 'write' || !TABLES.includes(name) || !own(row, s))
                        fail('Escrita fora da pessoa ativa.'); const prior = await table(name).get(requireId(row.id)); if (prior && (prior.user_id !== s.user_id || prior.person_id !== s.person_id))
                        fail('ID fora do escopo.'); await table(name).put(row as unknown as Record<string, unknown>); },
                    async enqueue<K extends TableName>(name: K, operation: 'add' | 'update', row: VitalTables[K]) { assertActive(); if (mode !== 'write' || !TABLES.includes(name) || !own(row, s) || !['add', 'update'].includes(operation))
                        fail('Fila fora da pessoa ativa.'); const saved = await table(name).get(requireId(row.id)); if (!saved || JSON.stringify(saved) !== JSON.stringify(row))
                        fail('Fila deve corresponder ao registro persistido.'); await deps.enqueue(name, operation, row as unknown as Record<string, unknown>, { dispatchSync: false }); queued = true; },
                    async assertRestoreEmpty(){assertActive();if(mode!=='write')fail('Recuperação exige transação de escrita.');const acks=await table('vital_sync_ack').where('[user_id+person_id]').equals([s.user_id,s.person_id]).toArray();if(acks.length)fail('Há recibos de sincronização locais; use a recuperação normal.');const queue=table('syncQueue') as unknown as {where(index:string):{equals(key:string):{toArray():PromiseLike<Record<string,unknown>[]>}}};for(const name of TABLES){const rows=await queue.where('table').equals(name).toArray();if(rows.some(row=>{const p=row.payload as Record<string,unknown>|undefined;return p?.user_id===s.user_id&&p.person_id===s.person_id;}))fail('Há operações Vital pendentes; use a recuperação normal.');}},
                    async restoreAck(ack) { assertActive(); if(mode!=='write'||!own(ack,s)||!vitalTable(ack.table)||ack.id!==vitalAckId(ack.table,s,ack.row_id)||ack.pending_revision!==null||ack.pending_fingerprint!==null||!ack.fingerprint||!Number.isSafeInteger(ack.revision)||await table('vital_sync_ack').get(ack.id))fail('Recibo de recuperação inválido ou já existente.');const row=await table(ack.table).get(ack.row_id);if(!row||row.revision!==ack.revision||row.synced!==true)fail('Recibo sem registro correspondente.');await table('vital_sync_ack').put(ack as unknown as Record<string,unknown>); },
                    async ownsReference(kind, id) { const n = kind === 'location' ? 'locais' : kind === 'professional' ? 'medicos' : kind === 'rehab_program' ? 'rehab_programs_m5' : null; if (!n)
                        fail('Referência desconhecida.'); const row = await table(n).get(requireId(id)); return !!row && row.user_id === s.user_id && !row.deleted_at && (kind !== 'rehab_program' || row.person_id === s.person_id); }
                };
                try {
                    const value = await run(tx);
                    assertActive();
                    return value;
                }
                finally {
                    open = false;
                }
            });
            // A committed local save must not be misreported as failure if dispatch is unavailable. Pending queue remains canonical.
            if (queued) {
                try {
                    deps.dispatch();
                }
                catch {
                    try {
                        deps.onDispatchError?.();
                    }
                    catch { /* gravação já confirmada */ }
                }
            }
            return result;
        } };
}
/** Registration descriptor, not a call to db.version; choose the version on the accumulated baseline. */
export const VITAL_STORES: Record<TableName, string> = Object.fromEntries(TABLES.map(table => [table, 'id, user_id, person_id, [user_id+person_id], updated_at, deleted_at, synced' + (table === 'vital_audit' ? ', target_id' : table.endsWith('_versions') ? ', plan_id, effective_on' : table === 'vital_workout_sessions' || table === 'vital_meals' || table.endsWith('_checkins') ? ', day' : '')])) as Record<TableName, string>;
