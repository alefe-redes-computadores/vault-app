"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { BookOpen, X } from "lucide-react";
import { findHelpTopic } from "@/lib/help/catalog";
import { hasSeenHelp, markHelpSeen } from "@/lib/help/preferences";

const HelpTopicGuide = dynamic(() => import("./HelpTopicGuide").then(module => module.HelpTopicGuide));

export function ContextualHelp({ userId, personId }: { userId: string; personId: string | null | undefined }) {
  const pathname = usePathname();
  // Remount on navigation or identity change so an old dialog never crosses profiles.
  return <HelpInvitation key={`${userId}:${personId}:${pathname}`} userId={userId} pathname={pathname} />;
}

function HelpInvitation({ userId, pathname }: { userId: string; pathname: string }) {
  const topic = findHelpTopic(pathname);
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!topic || !userId) return;
    try { setAvailable(!hasSeenHelp(window.localStorage, userId, topic.id)); }
    catch { /* Guides remain available through Help when storage is unavailable. */ }
  }, [userId, topic?.id]);

  function dismiss() {
    if (topic) {
      try { markHelpSeen(window.localStorage, userId, topic.id); }
      catch { /* A dismissed invitation stays dismissed for this mounted page. */ }
    }
    setAvailable(false);
    setOpen(false);
  }

  if (!topic || !available) return null;
  return (
    <aside aria-label={`Guia de ${topic.title}`} className="mx-auto flex max-w-2xl items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-left text-xs font-medium text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        <BookOpen size={16} className="shrink-0" aria-hidden="true" />Primeira visita? Conheça {topic.title}
      </button>
      <button type="button" onClick={dismiss} aria-label={`Dispensar guia de ${topic.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><X size={17} aria-hidden="true" /></button>
      {open ? <HelpTopicGuide topic={topic} onClose={dismiss} /> : null}
    </aside>
  );
}
