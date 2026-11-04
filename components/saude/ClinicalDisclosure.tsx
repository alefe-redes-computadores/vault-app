"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Progressive, deep-link-aware detail group. Children mount only when opened. */
export function ClinicalDisclosure({ id, title, description, icon, children, defaultOpen = false, iconClassName = "text-ink-secondary" }: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode | (() => ReactNode);
  defaultOpen?: boolean;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = `${id}-heading`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const revealHash = () => {
      let hash = window.location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* invalid fragment: ignore */ }
      if (hash === id) setOpen(true);
    };
    const section = sectionRef.current;
    const reveal = () => setOpen(true);
    section?.addEventListener("vault:reveal-clinical-section", reveal);
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => {
      section?.removeEventListener("vault:reveal-clinical-section", reveal);
      window.removeEventListener("hashchange", revealHash);
    };
  }, [id]);

  return (
    <section ref={sectionRef} id={id} aria-labelledby={headingId} className="scroll-mt-28 overflow-hidden rounded-[18px] border border-surface-border/55 bg-surface/90 shadow-sm">
      <h2 id={headingId}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          aria-describedby={descriptionId}
          onClick={() => setOpen(value => !value)}
          className={`flex w-full items-center gap-2.5 px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${open ? "min-h-[52px] py-2" : "min-h-[60px] py-2.5"}`}
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg border border-surface-border/45 bg-surface-raised/60 ${iconClassName}`} aria-hidden="true">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-snug text-ink-primary">{title}</span>
            <span id={descriptionId} className={`mt-0.5 block break-words text-[11px] leading-snug text-ink-muted ${open ? "sr-only" : "line-clamp-2"}`}>{description}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {open && (
        <div id={`${id}-panel`} role="region" aria-labelledby={headingId} className="space-y-3 border-t border-surface-border/50 bg-void/10 p-2.5 sm:p-3.5">
          {typeof children === "function" ? children() : children}
        </div>
      )}
    </section>
  );
}
