"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ChevronDown, DownloadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { getVaultUpdateServerSnapshot, getVaultUpdateSnapshot, subscribeVaultUpdates } from "@/lib/updates/client";
import { APP_VERSION } from "@/lib/app-version";
import { VAULT_UPDATE_FRAGMENT_M117 } from "@/lib/updates/update-navigation-m117";

/** R4: header of the native disclosure. Installed version/status are sourced from the
 * update runtime. No claim of APK currency is made while the version is unknown. */
export function VaultUpdateDisclosureR4() {
  const state = useSyncExternalStore(subscribeVaultUpdates, getVaultUpdateSnapshot, getVaultUpdateServerSnapshot);
  useEffect(() => {
    const reveal = () => {
      if(window.location.hash !== VAULT_UPDATE_FRAGMENT_M117) return;
      const disclosure=document.getElementById("vault-updates-r4") as HTMLDetailsElement|null;
      if (!disclosure) return;
      disclosure.open=true;
      window.requestAnimationFrame(()=>disclosure.scrollIntoView({block:"start",behavior:"auto"}));
    };
    reveal();window.addEventListener("hashchange",reveal);
    return () => window.removeEventListener("hashchange",reveal);
  },[]);
  const native = state.runtime === "android";
  const needsUpdate = native && state.phase === "ready" && state.decision === "available";
  const status = state.phase === "checking" ? "Verificando atualização"
    : state.phase === "error" ? "Consulta indisponível"
    : !native ? "PWA · atualizações pela web"
    : state.decision === "current" ? "Última versão distribuída instalada"
    : needsUpdate ? "Atualização disponível"
    : state.decision === "preparing" ? "APK em preparação"
    : state.decision === "unknown_installed" ? "Versão instalada não identificada"
    : "Conferir atualizações";
  return <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${needsUpdate ? "bg-amber-300/10 text-amber-300" : state.decision === "current" ? "bg-emerald-300/10 text-emerald-300" : "bg-ice/10 text-ice"}`} aria-hidden="true">
      {needsUpdate ? <DownloadCloud size={17}/> : state.decision === "current" ? <CheckCircle2 size={17}/> : <AlertTriangle size={17}/>}
    </span>
    <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-ink-primary">VAULT Update Center · v{state.installedVersion||APP_VERSION}</strong><span className="mt-0.5 block truncate text-[11px] text-ink-muted">{status}</span></span>
    <ChevronDown size={17} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true"/>
  </summary>;
}
