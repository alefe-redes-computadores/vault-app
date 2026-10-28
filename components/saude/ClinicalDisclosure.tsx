"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Progressive, deep-link-aware detail group. Children mount only when opened. */
export function ClinicalDisclosure({ id, title, description, icon, children, defaultOpen = false }: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const revealHash = () => {
      let hash = window.location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* invalid fragment: ignore */ }
      if (hash === id) setOpen(true);
    };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [id]);

  return (
    <section id={id} className="scroll-mt-28 overflow-hidden rounded-[20px] border border-surface-border/70 bg-surface">
      <h2>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(value => !value)}
          className="flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-surface-raised text-ice" aria-hidden="true">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-snug text-ink-primary">{title}</span>
            <span className="mt-1 block text-[11px] leading-snug text-ink-muted">{description}</span>
          </span>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {open && (
        <div id={`${id}-panel`} className="space-y-3 border-t border-surface-border/50 bg-void/15 p-2.5 sm:p-3">
          {children}
        </div>
      )}
    </section>
  );
}
