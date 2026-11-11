"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChevronRight, X } from "lucide-react";
import { getVaultUpdateServerSnapshot, getVaultUpdateSnapshot, subscribeVaultUpdates } from "@/lib/updates/client";
import {
  VAULT_UPDATE_DESTINATION_M117, ignoreUpdateBuildM117, readIgnoredUpdateBuildM117,
  shouldShowUpdatePromptM117,
} from "@/lib/updates/update-navigation-m117";

/** Shared release snapshot: no extra GitHub fetch, no clinical or person data. */
export function VaultUpdateHomePromptM117() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeVaultUpdates, getVaultUpdateSnapshot, getVaultUpdateServerSnapshot);
  const [ignoredBuild, setIgnoredBuild] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    setIgnoredBuild(readIgnoredUpdateBuildM117(window.localStorage));
  }, []);
  if (ignoredBuild === undefined || !shouldShowUpdatePromptM117(snapshot, ignoredBuild)) return null;
  const build = snapshot.release!.build;
  return <section aria-label="Nova atualização do VAULT" className="rounded-[20px] border border-emerald-400/25 bg-emerald-400/[.055] p-3 shadow-sm">
    <div className="flex items-start gap-2.5">
      <BellRing size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300"/>
      <div className="min-w-0 flex-1">
        <strong className="text-xs font-bold text-ink-primary">Novo APK disponível · Build {build}</strong>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Versão certificada pronta para conferir e instalar dentro do VAULT.</p>
      </div>
      <button type="button" aria-label="Ignorar este aviso de atualização" onClick={() => {
        ignoreUpdateBuildM117(window.localStorage, build);
        setIgnoredBuild(build);
      }} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><X size={17}/></button>
    </div>
    <button type="button" onClick={() => router.push(VAULT_UPDATE_DESTINATION_M117)} className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Ver e atualizar <ChevronRight size={15}/></button>
  </section>;
}
