import type { Scope, Save } from './model';
import { fail, own, requireId, requireScope } from './validation';
/** Consumer-side scoped draft. One stable request id per opening; no reinitialization from live query. */
export class ScopedEditor<T extends object, R extends {
    id: string;
    revision: number;
}> {
    private scope: Scope;
    private value: T;
    private original: T;
    private id: string;
    private rev: number | null;
    private flight: Promise<R> | null = null;
    private generation = 0;
    constructor(scope: Scope, id: string, value: T, revision: number | null) { this.scope = requireScope(scope); this.id = requireId(id); this.value = structuredClone(value); this.original = structuredClone(value); this.rev = revision; }
    snapshot() { return structuredClone(this.value); }
    identity() { return { id: this.id, expected_revision: this.rev }; }
    get dirty() { return JSON.stringify(this.value) !== JSON.stringify(this.original); }
    get saving() { return this.flight !== null; }
    set<K extends keyof T>(key: K, value: T[K]) { if (this.flight)
        fail('Aguarde a gravação.'); this.value = { ...this.value, [key]: structuredClone(value) }; }
    /** Use for explicit discard/scope change only; never call on reactive data refresh. */
    replace(scope: Scope, id: string, value: T, revision: number | null, discard = false) { if (this.flight)
        fail('Aguarde a gravação antes de trocar o formulário.'); const next = requireScope(scope); if (this.dirty && !discard && own(next, this.scope))
        fail('Confirme o descarte do rascunho.'); this.generation++; this.scope = next; this.id = requireId(id); this.rev = revision; this.original = structuredClone(value); this.value = structuredClone(value); }
    submit(active: Scope, writer: (scope: Scope, request: Save<T>) => Promise<R>): Promise<R> { if (!own(active, this.scope))
        return Promise.reject(Error('Pessoa ativa mudou.')); if (this.flight)
        return this.flight; const version = this.generation, scope = { ...this.scope }, data = this.snapshot(); const req = { id: this.id, expected_revision: this.rev, data }; const p = Promise.resolve().then(() => writer(scope, req)).then(row => { if (version !== this.generation || row.id !== req.id || !Number.isSafeInteger(row.revision) || row.revision < 1)
        fail('Resposta de gravação inválida.'); this.rev = row.revision; this.original = structuredClone(data); return row; }); this.flight = p; void p.finally(() => { if (this.flight === p)
        this.flight = null; }).catch(() => { }); return p; }
}
