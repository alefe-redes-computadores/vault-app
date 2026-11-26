import type { ClockState } from './model';
import { fail } from './validation';
const validMs = (n: number) => { if (!Number.isSafeInteger(n) || n < 0)
    fail('Relógio inválido.'); return n; };
export function startClock(now: number): ClockState { return { started_ms: validMs(now), running_since_ms: now, elapsed_active_ms: 0, stopped_ms: null }; }
export function validateClock(c: ClockState, now: number): ClockState { validMs(now); validMs(c.started_ms); validMs(c.elapsed_active_ms); if (c.started_ms > now)
    fail('Relógio regressivo. Revise a sessão.'); if (c.running_since_ms !== null && (validMs(c.running_since_ms) < c.started_ms || c.running_since_ms > now))
    fail('Relógio regressivo. Revise a sessão.'); if (c.stopped_ms !== null && (validMs(c.stopped_ms) < c.started_ms || c.stopped_ms > now || c.running_since_ms !== null))
    fail('Cronômetro inválido.'); const end = c.stopped_ms ?? now; const active = c.elapsed_active_ms + (c.running_since_ms === null ? 0 : now - c.running_since_ms); if (active > end - c.started_ms)
    fail('Tempo ativo excede tempo decorrido.'); return { ...c }; }
export function clockTimes(c: ClockState, now: number) { validateClock(c, now); const elapsed = (c.stopped_ms ?? now) - c.started_ms; const active = c.elapsed_active_ms + (c.running_since_ms === null ? 0 : now - c.running_since_ms); return { elapsed_seconds: Math.floor(elapsed / 1000), active_seconds: Math.floor(active / 1000), pause_seconds: Math.floor((elapsed - active) / 1000) }; }
export function pauseClock(c: ClockState, now: number): ClockState { validateClock(c, now); return c.running_since_ms === null ? { ...c } : { ...c, elapsed_active_ms: c.elapsed_active_ms + now - c.running_since_ms, running_since_ms: null }; }
export function resumeClock(c: ClockState, now: number): ClockState { validateClock(c, now); if (c.stopped_ms !== null)
    fail('Sessão encerrada.'); return c.running_since_ms !== null ? { ...c } : { ...c, running_since_ms: now }; }
export function stopClock(c: ClockState, now: number): ClockState { if (c.stopped_ms !== null) {
    validateClock(c, now);
    return { ...c };
} return { ...pauseClock(c, now), stopped_ms: now }; }
