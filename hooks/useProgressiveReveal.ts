"use client";

import { useState } from "react";

/**
 * M55: purely visual pagination for long, read-only lists.
 * A change of person/records derives the initial viewport immediately, without
 * an effect that might briefly expose records from the previous context.
 * It does not filter, change, synchronize or confirm clinical records.
 */
export function useProgressiveReveal(identity: string, total: number, initial: number, step: number) {
  const first = Math.max(1, Math.floor(initial));
  const page = Math.max(1, Math.floor(step));
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const [state, setState] = useState(() => ({ identity, first, limit: first }));
  const limit = state.identity === identity && state.first === first ? Math.max(first, state.limit) : first;
  const visible = Math.min(count, limit);
  const remaining = count - visible;
  const expanded = visible > first;
  const showMore = () => setState({ identity, first, limit: Math.min(count, visible + page) });
  const collapse = () => setState({ identity, first, limit: first });
  return { visible, remaining, expanded, nextCount: Math.min(remaining, page), showMore, collapse };
}
