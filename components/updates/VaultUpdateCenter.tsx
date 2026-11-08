"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Browser } from "@capacitor/browser";
import { Clipboard } from "@capacitor/clipboard";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, Copy, Download, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import {
  checkVaultUpdates, getVaultUpdateServerSnapshot, getVaultUpdateSnapshot, subscribeVaultUpdates,
} from "@/lib/updates/client";
import { notifyVaultUpdateOnce, setVaultUpdateNotificationsEnabled, vaultUpdateNotificationsEnabled } from "@/lib/updates/notifications";
import { APP_VERSION } from "@/lib/app-version";

const humanDate = (date: string): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Data indisponível" : new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(parsed);
};
const humanSize = (bytes: number) => `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;

export function VaultUpdateCenter() {
  const state = useSyncExternalStore(subscribeVaultUpdates, getVaultUpdateSnapshot, getVaultUpdateServerSnapshot);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setNotifyEnabled(vaultUpdateNotificationsEnabled());
    void checkVaultUpdates();
  }, []);
  const native = state.runtime === "android";
  const release = state.release;
  const hasUpdate = native && state.phase === "ready" && state.decision === "available" && Boolean(release);
  const runWarning = state.newestRunWarning;
  const failureCode = runWarning === "failed" && state.run
    ? `VAULT-UPD-BUILD-FAILED-${state.run.id}` : state.errorCode;
  const status = state.phase === "checking" ? "Verificando atualização…"
    : state.phase === "error" ? "Não foi possível consultar agora"
    : !native ? "PWA · atualizações pela web"
    : state.decision === "available" ? "Atualização Android disponível"
    : state.decision === "current" ? "Seu APK está atualizado"
    : state.decision === "preparing" ? "O APK está sendo preparado"
    : state.decision === "failed" ? "Compilação não concluída"
    : state.decision === "unknown_installed" ? "Versão instalada não identificada"
    : state.phase === "idle" ? "Consultar versões" : "Nenhum APK certificado disponível";

  async function copyDiagnostic() {
    const summary = [
      "VAULT UPDATE DIAGNÓSTICO", `Código: ${failureCode || "VAULT-UPD-STATUS"}`,
      `App: ${native ? "Android" : "PWA"} ${state.installedVersion || APP_VERSION}`,
      `Build instalado: ${state.installedBuild ?? "não identificado"}`,
      `Release: ${release?.tag || "não encontrada"}`,
      `Último run: ${state.run?.id ?? "não consultado"} / ${state.run?.status ?? "desconhecido"} / ${state.run?.conclusion ?? "sem conclusão"}`,
      `Consulta: ${state.checkedAt || "não realizada"}`,
    ].join("\n");
    try { await Clipboard.write({string: summary}); setFeedback("Diagnóstico copiado."); }
    catch { setFeedback("Não foi possível copiar o diagnóstico."); }
  }
  async function openApk() {
    if (state.phase !== "ready" || !release || (native && !hasUpdate)) return;
    try { await Browser.open({url: release.apkUrl}); }
    catch { window.location.assign(release.apkUrl); }
  }
  async function toggleNotify() {
    try {
      const enabled = await setVaultUpdateNotificationsEnabled(!notifyEnabled);
      setNotifyEnabled(enabled);
      setFeedback(!notifyEnabled && !enabled ? "Permissão não concedida. Ative as notificações nas configurações do Android." : "Preferência atualizada neste aparelho.");
      if (enabled) void notifyVaultUpdateOnce(getVaultUpdateSnapshot());
    } catch { setFeedback("Não foi possível configurar as notificações agora."); }
  }
  return (
    <section id="vault-updates" aria-label="Central de atualizações do Vault" className="rounded-[22px] border border-emerald-300/20 bg-surface p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><Smartphone size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">VAULT UPDATE CENTER</p>
          <h2 className="mt-0.5 text-sm font-bold text-ink-primary">Atualizações do aplicativo</h2>
          <p role="status" className="mt-1 text-xs text-ink-muted">{status}</p>
        </div>
        {state.decision === "current" && native && state.phase === "ready" ? <CheckCircle2 size={18} className="shrink-0 text-emerald-300"/> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface-raised/50 p-2.5">
          <p className="text-[10px] text-ink-muted">{native ? "Versão instalada" : "Versão PWA"}</p>
          <p className="mt-1 truncate font-bold text-ink-primary">{state.installedVersion}</p>
          <p className="mt-1 text-[10px] text-ink-muted">{native ? state.installedBuild ? `Build ${state.installedBuild}` : "Build não identificado" : "Atualização web independente"}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface-raised/50 p-2.5">
          <p className="text-[10px] text-ink-muted">APK certificado</p>
          <p className="mt-1 truncate font-bold text-ink-primary">{release ? `v${release.version}` : "Indisponível"}</p>
          <p className="mt-1 text-[10px] text-ink-muted">{release ? `Build ${release.build} · ${humanSize(release.bytes)}` : "Aguardando release aprovada"}</p>
        </div>
      </div>
      {release ? <div className="mt-2 rounded-xl border border-surface-border/40 bg-surface-raised/25 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
        <div className="flex items-center gap-2"><Clock3 size={13} className="shrink-0" /> Publicado em {humanDate(release.publishedAt)}</div>
        <p className="mt-1">Download via GitHub Releases, sem expiração automática de 7 dias. Disponibilidade depende da manutenção da release.</p>
        {release.highlights.length > 0 ? <div className="mt-2 border-t border-surface-border/40 pt-2"><p className="font-semibold text-ink-secondary">Novidades desta compilação</p>{release.highlights.map((item,i)=><p key={i} className="mt-1">• {item}</p>)}</div> : null}
      </div> : null}
      {runWarning ? <div role="note" className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-3 py-2 text-xs text-amber-200">
        <AlertTriangle size={15} className="mt-0.5 shrink-0"/>
        <span>{runWarning === "failed" ? "A compilação mais recente falhou. Uma release certificada anterior continua identificada separadamente." : "Há uma compilação mais recente em andamento. O download disponível, se houver, é da última release aprovada."}</span>
      </div> : null}
      {failureCode ? <div role="alert" className="mt-2 rounded-xl border border-coral/20 bg-coral/[.05] px-3 py-2 text-xs text-coral">Falha de verificação: <span className="font-mono">{failureCode}</span>. Copie o diagnóstico se precisar de suporte.</div> : null}
      {!native ? <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">O PWA recebe atualizações pelo navegador. O APK Android é um produto separado; esta tela não compara sua versão web com um APK.</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2">
        <button type="button" onClick={() => {setFeedback("");void checkVaultUpdates(true);}} disabled={state.phase === "checking"} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary disabled:opacity-50"><RefreshCw size={15} className={state.phase === "checking" ? "animate-spin" : ""}/> Procurar atualizações</button>
        {(hasUpdate || (!native && Boolean(release) && state.phase === "ready")) ? <button type="button" onClick={()=>void openApk()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-300"><Download size={15}/> {native ? "Baixar atualização" : "Baixar APK Android"}</button> : <button type="button" onClick={()=>void copyDiagnostic()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-muted"><Copy size={15}/> Copiar diagnóstico</button>}
      </div>
      {native ? <button type="button" onClick={()=>void toggleNotify()} aria-pressed={notifyEnabled} className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-surface-border/60 px-3 text-left text-xs text-ink-secondary"><span className="flex items-center gap-2"><BellRing size={15}/> Avisar sobre novos APKs</span><span className={notifyEnabled ? "font-bold text-emerald-300" : "text-ink-muted"}>{notifyEnabled ? "Ativado" : "Desativado"}</span></button> : null}
      <p className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>O aplicativo nunca instala APK sem sua confirmação. Alertas automáticos são locais ao abrir/retomar o VAULT; avisos com o app fechado exigem push nativo futuro.</p>
      {feedback ? <p role="status" className="mt-2 text-[11px] text-emerald-300">{feedback}</p> : null}
    </section>
  );
}
