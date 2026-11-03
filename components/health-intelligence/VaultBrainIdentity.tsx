import { BrainCircuit } from "lucide-react";

/** One visual identity, no second assistant and no additional floating control. */
export function VaultBrainIdentity({ compact = false, context }: { compact?: boolean; context?: string }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5 text-violet-200">
    <BrainCircuit size={compact ? 13 : 16} aria-hidden="true" className="shrink-0" />
    <span className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold uppercase tracking-[.12em]`}>
      VAULT Brain{context ? <span className="font-medium normal-case tracking-normal text-ink-muted"> · {context}</span> : null}
    </span>
  </span>;
}
