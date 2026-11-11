"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import type { PluginListenerHandle } from "@capacitor/core";
import type { VaultApprovedRelease } from "@/lib/updates/release-registry";
import {
  getVaultNativeUpdater, nativeMetadataForRelease, type VaultNativeDownloadProgress,
} from "@/lib/updates/native-apk-updater";

type Stage = "idle" | "downloading" | "verified" | "permission" | "permitted" | "installing" | "error";

/** Read-only until explicitly tapped. Native plugin owns integrity, version and signer checks. */
export function VaultNativeUpdateFlow({ release, installedBuild, available }: {
  release: VaultApprovedRelease | null;
  installedBuild: number | null;
  available: boolean;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [received, setReceived] = useState(0);
  const [problem, setProblem] = useState("");
  const busy = useRef(false);
  const listener = useRef<PluginListenerHandle | null>(null);
  const metadata = release ? nativeMetadataForRelease(release, installedBuild) : null;
  const native = getVaultNativeUpdater();
  const enabled = Boolean(available && metadata && native);

  useEffect(() => {
    busy.current = false;
    setStage("idle");
    setProgress(0);
    setReceived(0);
    setProblem("");
    return () => { void listener.current?.remove(); listener.current = null; };
  }, [release?.build]);

  // M117: check permission only after returning from Android settings.
  // Missing method on pre-M117 APKs is tolerated; the manual retry remains available.
  useEffect(() => {
    if (stage !== "permission" || !native) return;
    let active = true;
    const check = async () => {
      try {
        const status = await native.checkInstallPermission();
        if (active && status.granted) setStage("permitted");
      } catch { /* Old APK bridge: continue using manual installation retry. */ }
    };
    const onFocus = () => { void check(); };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stage, native]);

  async function download() {
    if (!enabled || !native || !metadata || busy.current) return;
    busy.current = true;
    setProblem(""); setStage("downloading"); setProgress(0); setReceived(0);
    try {
      listener.current = await native.addListener("downloadProgress", (event: VaultNativeDownloadProgress) => {
        if (event.build !== metadata.build) return;
        setProgress(Math.max(0, Math.min(100, event.percent)));
        setReceived(event.received);
      });
      const result = await native.downloadVerified(metadata);
      if (!result.verified || result.build !== metadata.build) throw new Error("O Android não confirmou a integridade do arquivo.");
      setProgress(100); setReceived(metadata.bytes); setStage("verified");
      // Finance-style one-tap flow: the Android bridge revalidates the APK before opening.
      try {
        const opened = await native.installVerified(metadata);
        if (opened.permissionRequired) setStage("permission");
        else if (!opened.opened) throw new Error("O Android não abriu o instalador.");
      } catch (error) {
        // The verified private APK stays available: retry does not redownload.
        setStage("verified");
        setProblem(error instanceof Error ? error.message : "Toque em abrir instalador para continuar.");
      }
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Falha no download. Confira a conexão e tente novamente.");
      setStage("error");
    } finally {
      void listener.current?.remove(); listener.current = null;
      busy.current = false;
    }
  }
  async function install() {
    if (!native || !metadata || busy.current || (stage !== "verified" && stage !== "permission" && stage !== "permitted")) return;
    busy.current = true; setProblem(""); setStage("installing");
    try {
      const result = await native.installVerified(metadata);
      if (result.permissionRequired) { setStage("permission"); return; }
      if (!result.opened) throw new Error("O Android não conseguiu abrir a tela de instalação.");
      setStage("verified");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "O instalador não pôde ser aberto.");
      setStage("verified");
    } finally { busy.current = false; }
  }
  async function permit() {
    if (!native || busy.current) return;
    busy.current = true;
    try { await native.openInstallSettings(); }
    catch (err) { setProblem(err instanceof Error ? err.message : "Permissão indisponível."); }
    finally { busy.current = false; }
  }
  async function cancel() {
    if (!native || stage !== "downloading") return;
    setProblem("Cancelando o download…");
    try { await native.cancelDownload(); }
    catch { setProblem("O download poderá ser interrompido ao falhar ou expirar."); }
  }

  if (!available || !release) return null;
  if (!metadata) return <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-3 text-xs text-amber-200">Esta release não possui todos os metadados exigidos para instalação nativa. Use o download manual certificado.</p>;
  if (!native) return <p className="mt-2 rounded-xl border border-surface-border/50 bg-surface-raised/30 p-3 text-xs text-ink-secondary">Este APK ainda não contém a ponte nativa M111. Instale esta versão manualmente; as próximas atualizações poderão ocorrer aqui.</p>;

  return <section aria-label="Atualização nativa verificada" className="mt-3 space-y-2 rounded-[18px] border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[.075] via-surface to-surface p-3">
    <div className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Smartphone size={17} className="text-emerald-300"/> Atualizar dentro do VAULT</div>
    <p className="text-[11px] leading-relaxed text-ink-muted">Download privado e verificado: SHA-256, versão, identificador e assinatura. O instalador oficial do Android solicitará sua confirmação.</p>
    {stage === "downloading" && <div className="space-y-1.5">
      <div className="flex justify-between text-xs tabular-nums text-ink-secondary"><span>Baixando APK…</span><span>{progress}%</span></div>
      <div role="progressbar" aria-label="Progresso do download do APK" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-border"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-200 motion-reduce:transition-none" style={{width:`${progress}%`}}/></div>
      <p className="text-[10px] text-ink-muted">{(received / 1048576).toFixed(1)} de {(metadata.bytes / 1048576).toFixed(1)} MB. Se a rede cair, você pode tentar novamente.</p>
      <button type="button" onClick={() => void cancel()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-secondary"><XCircle size={15}/> Cancelar download</button>
    </div>}
    {(stage === "idle" || stage === "error") && <button type="button" onClick={() => void download()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400/15 text-sm font-bold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Download size={17}/>{stage === "error" ? "Tentar baixar novamente" : `Baixar e atualizar no VAULT · Build ${metadata.build}`}</button>}
    {(stage === "verified" || stage === "installing" || stage === "permission" || stage === "permitted") && <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><CheckCircle2 size={16}/> APK íntegro e assinatura conferida</p>
      {stage === "permission" && <p className="text-xs leading-relaxed text-amber-200">Autorize instalações desta origem nas configurações do Android. Ao retornar, o VAULT verificará a permissão.</p>}
      {stage === "permitted" && <p role="status" className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[.08] px-3 text-xs font-bold text-emerald-300"><CheckCircle2 size={16}/> Permissão concedida</p>}
      {stage === "permission" && <button type="button" onClick={() => void permit()} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/[.07] text-xs font-semibold text-amber-200">Autorizar instalação no Android</button>}
      {stage !== "permission" ? <button type="button" disabled={stage === "installing"} onClick={() => void install()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400/15 text-sm font-bold text-emerald-300 disabled:opacity-60"><ShieldCheck size={17}/>{stage === "installing" ? "Conferindo APK…" : stage === "permitted" ? "Continuar instalação" : "Abrir instalador do Android"}</button> : <button type="button" onClick={() => void install()} className="min-h-11 w-full rounded-xl border border-surface-border text-xs font-semibold text-ink-secondary">Já autorizei · continuar</button>}
    </div>}
    {problem && <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-amber-200"><AlertTriangle size={15} className="mt-0.5 shrink-0"/>{problem}</p>}
    {stage === "downloading" && <span className="sr-only"><Loader2/>Download em andamento</span>}
  </section>;
}
