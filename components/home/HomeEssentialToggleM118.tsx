"use client";

import { useEffect, useState } from "react";
import { Layers3, Check } from "lucide-react";

/** One control at the start of Home, same preference and same HomeCommandCenter. */
const KEY = "vault:home:essential:v1";
const EVENT = "vault:home:essential-changed";

export function HomeEssentialToggleM118() {
  const [essential, setEssential] = useState(false);
  useEffect(() => {
    const sync = () => {
      try { setEssential(window.localStorage.getItem(KEY) === "1"); }
      catch { setEssential(false); }
    };
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const toggle = () => {
    const next = !essential;
    try { window.localStorage.setItem(KEY, next ? "1" : "0"); }
    catch { /* UI preference only; never blocks health tasks. */ }
    setEssential(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return <button type="button" aria-pressed={essential} onClick={toggle}
    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] px-3.5 py-2 text-left transition-colors active:scale-[.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
    <span className="flex min-w-0 items-center gap-2.5">
      <Layers3 size={17} className="shrink-0 text-emerald-300" aria-hidden="true"/>
      <span className="min-w-0"><strong className="block text-xs text-ink-primary">Modo Essencial</strong><span className="block text-[10px] text-ink-muted">{essential?"Somente ações principais nas áreas da Home":"Reduzir áreas secundárias da Home"}</span></span>
    </span>
    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${essential?"bg-emerald-300 text-void":"bg-surface-raised text-ink-muted"}`}>
      {essential?<Check size={12}/>:null}{essential?"ATIVO":"ATIVAR"}
    </span>
  </button>;
}
