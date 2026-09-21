"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// VAULT_GLOBAL_NAV_PROBE_V39_R3
export function GlobalNavigationProbe() {
  const pathname = usePathname();
  const [real, setReal] = useState("");
  const [locked, setLocked] = useState(false);
  const [last, setLast] = useState("boot");

  useEffect(() => {
    const sample = (reason: string) => {
      setReal(`${window.location.pathname}${window.location.search}`);
      setLocked(document.body.classList.contains("biometric-locked"));
      setLast(`${new Date().toLocaleTimeString()} ${reason}`);
    };
    sample("route");
    const bio=()=>sample("bio"), pop=()=>sample("pop");
    window.addEventListener("biometric:lockchange", bio);
    window.addEventListener("popstate", pop);
    const observer=new MutationObserver(()=>sample("body"));
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
    const timer=window.setInterval(()=>sample("tick"),750);
    return ()=>{
      window.removeEventListener("biometric:lockchange",bio);
      window.removeEventListener("popstate",pop);
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [pathname]);

  return (
    <div data-vault-global-nav-probe="v39-r3" className="fixed left-2 right-2 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] z-[9999] rounded-xl border border-cyan-400/60 bg-black/95 px-3 py-2 font-mono text-[10px] leading-4 text-cyan-200 shadow-2xl pointer-events-none">
      V39 · next={pathname || "∅"} · real={real || "∅"} · bio={locked ? "LOCK" : "OK"} · {last}
    </div>
  );
}
