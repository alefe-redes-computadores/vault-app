"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Browser } from "@capacitor/browser";
import { Clipboard } from "@capacitor/clipboard";
import {
  AlertTriangle, BellRing, CheckCircle2, ChevronRight, Clock3, Copy, Download,
  ExternalLink, FileCheck2, Loader2, PackageCheck, RefreshCw, ShieldCheck, Smartphone, Sparkles,
} from "lucide-react";
import {
  checkVaultUpdates, getVaultUpdateServerSnapshot, getVaultUpdateSnapshot, subscribeVaultUpdates,
} from "@/lib/updates/client";
import {
  notifyVaultUpdateOnce, reconcileVaultArtifactExpiryReminder,
  setVaultUpdateNotificationsEnabled, vaultUpdateNotificationsEnabled,
} from "@/lib/updates/notifications";
import { getVaultTemporaryArtifactStatus } from "@/lib/updates/artifacts";
import { APP_VERSION } from "@/lib/app-version";
import { VaultNativeUpdateFlow } from "@/components/updates/VaultNativeUpdateFlow";
import { VaultUpdateHistory } from "@/components/updates/VaultUpdateHistory";

const humanDate = (date: string): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Data indisponível" : new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(parsed);
};
const humanSize = (bytes: number) => `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;

/** VAULT M90 — visual and state polish only; never reads or alters clinical records. */
export function VaultUpdateCenter() {
  const state = useSyncExternalStore(subscribeVaultUpdates, getVaultUpdateSnapshot, getVaultUpdateServerSnapshot);
  const reducedMotion = useReducedMotion();
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setNotifyEnabled(vaultUpdateNotificationsEnabled());
    void checkVaultUpdates();
  }, []);
  const native = state.runtime === "android";
  const release = state.release;
  const hasUpdate = native && state.phase === "ready" && state.decision === "available" && Boolean(release);
  const checking = state.phase === "checking";
  const runWarning = state.newestRunWarning;
  const failureCode = runWarning === "failed" && state.run
    ? `VAULT-UPD-BUILD-FAILED-${state.run.id}` : state.errorCode;
  const artifactStatus = getVaultTemporaryArtifactStatus(state.artifact);
  const status = checking ? "Verificando atualização…"
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
      `Artefato Actions: ${state.artifact?.id ?? "não confirmado"}; estado: ${artifactStatus}`,
      `Prazo informado pelo GitHub: ${state.artifact?.expiresAt ?? "desconhecido"}`,
      `SHA-256 do APK certificado: ${release?.checksum ?? "não disponível"}`,
      `Consulta: ${state.checkedAt || "não realizada"}`,
    ].join("\n");
    try { await Clipboard.write({string: summary}); setFeedback("Diagnóstico copiado."); }
    catch { setFeedback("Não foi possível copiar o diagnóstico."); }
  }
  async function openTrusted(url: string) {
    try {
      await Browser.open({url});
      setFeedback("Link oficial aberto. A instalação do APK requer sua confirmação no Android.");
    } catch { setFeedback("Não foi possível abrir o link. Verifique sua conexão."); }
  }
  async function openApk() {
    if (state.phase !== "ready" || !release || (native && !hasUpdate)) return;
    await openTrusted(release.apkUrl);
  }
  async function copyChecksum() {
    if (!release) return;
    try { await Clipboard.write({string: release.checksum}); setFeedback("SHA-256 certificado copiado."); }
    catch { setFeedback("Não foi possível copiar o SHA-256."); }
  }
  async function toggleNotify() {
    try {
      const enabled = await setVaultUpdateNotificationsEnabled(!notifyEnabled);
      setNotifyEnabled(enabled);
      setFeedback(!notifyEnabled && !enabled
        ? "Permissão não concedida. Ative notificações nas configurações do Android."
        : "Preferência atualizada neste aparelho.");
      if (enabled) {
        const snapshot = getVaultUpdateSnapshot();
        void notifyVaultUpdateOnce(snapshot);
        void reconcileVaultArtifactExpiryReminder(snapshot);
      }
    } catch { setFeedback("Não foi possível configurar as notificações agora."); }
  }

  return (
    <motion.section id="vault-updates" aria-label="Central de atualizações do Vault"
      initial={reducedMotion ? false : {opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: reducedMotion ? 0 : 0.24}}
      className="relative overflow-hidden rounded-[22px] border border-emerald-300/20 bg-surface p-3.5 shadow-sm">
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-emerald-400/[.035] blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300"><Smartphone size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">VAULT UPDATE CENTER</p>
          <h2 className="mt-0.5 text-sm font-bold text-ink-primary">Atualizações do aplicativo</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${state.phase}-${state.decision}`} role="status" aria-live="polite"
              initial={reducedMotion ? false : {opacity:0, y:3}}
              animate={{opacity:1,y:0}} exit={{opacity:0}}
              transition={{duration: reducedMotion ? 0 : 0.16}}
              className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
              {checking ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none"/> : null}{status}
            </motion.p>
          </AnimatePresence>
        </div>
        {state.decision === "current" && native && state.phase === "ready" ? <CheckCircle2 size={18} className="shrink-0 text-emerald-300"/> : null}
        {hasUpdate ? <Sparkles size={18} className="shrink-0 text-emerald-300" aria-label="Nova versão"/> : null}
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface-raised/50 p-2.5">
          <p className="text-[10px] text-ink-muted">{native ? "Versão instalada" : "Versão PWA"}</p>
          <p className="mt-1 truncate font-bold text-ink-primary">{state.installedVersion}</p>
          <p className="mt-1 text-[10px] text-ink-muted">{native ? state.installedBuild ? `Build ${state.installedBuild}` : "Build não identificado" : "Atualização web independente"}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-emerald-400/10 bg-emerald-400/[.03] p-2.5">
          <p className="text-[10px] text-ink-muted">APK certificado</p>
          <p className="mt-1 truncate font-bold text-ink-primary">{release ? `v${release.version}` : "Indisponível"}</p>
          <p className="mt-1 text-[10px] text-ink-muted">{release ? `Build ${release.build} · ${humanSize(release.bytes)}` : "Aguardando release aprovada"}</p>
        </div>
      </div>

      {release ? <div className="mt-2 rounded-xl border border-surface-border/40 bg-surface-raised/25 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
        <div className="flex items-center gap-2"><PackageCheck size={13} className="shrink-0 text-emerald-300" /> Release certificada · {humanDate(release.publishedAt)}</div>
        <p className="mt-1">Download via GitHub Releases, sem expiração automática de 7 dias. Disponibilidade depende da manutenção da release.</p>
        <p className="mt-1">No APK com suporte M111, o VAULT confere integridade, versão, identificador e assinatura antes de abrir o instalador oficial. O download manual permanece disponível.</p>
        {release.highlights.length > 0 ? <div className="mt-2 border-t border-surface-border/40 pt-2"><p className="flex items-center gap-1 font-semibold text-ink-secondary"><Sparkles size={13}/> Novidades desta compilação</p>{release.highlights.map((item,i)=><p key={i} className="mt-1">• {item}</p>)}</div> : null}
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-2">
          <button type="button" onClick={()=>void copyChecksum()} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-surface-border/60 text-[10px] font-semibold text-ink-secondary"><Copy size={12}/> Copiar SHA-256</button>
          <button type="button" onClick={()=>void openTrusted(release.releaseUrl)} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-surface-border/60 text-[10px] font-semibold text-ink-secondary"><ExternalLink size={12}/> Ver release</button>
        </div>
      </div> : null}

      {native ? <VaultNativeUpdateFlow release={release} installedBuild={state.installedBuild} available={hasUpdate} /> : null}
      <VaultUpdateHistory />

      {/* M94: os estados do run e da release são independentes; uma Action nova não homologa APK. */}
      {state.run && state.phase === "ready" ? <div aria-label="Situação da compilação no GitHub" className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-surface-border/40 bg-void/25 px-3 py-2 text-[11px]">
        <span className="min-w-0 text-ink-secondary">Action #{state.run.number} · {state.run.status !== "completed" ? "Compilando" : state.run.conclusion === "success" ? "Concluída" : "Falhou ou foi cancelada"}</span>
        <span className={`shrink-0 text-[10px] font-semibold ${state.run.status !== "completed" ? "text-amber-200" : state.run.conclusion === "success" ? "text-emerald-300" : "text-coral"}`}>{state.run.status !== "completed" ? "Em andamento" : state.run.conclusion === "success" ? "Sucesso" : "Atenção"}</span>
      </div> : null}
      {state.artifact && state.phase === "ready" ? <div role="note" className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${artifactStatus === "expired" ? "border-coral/20 bg-coral/[.04] text-coral" : artifactStatus === "expiring" ? "border-amber-400/25 bg-amber-400/[.05] text-amber-200" : "border-surface-border/40 bg-surface-raised/25 text-ink-muted"}`}>
        <Clock3 size={15} className="mt-0.5 shrink-0"/>
        <div className="min-w-0">
          <p className="font-semibold">{artifactStatus === "expired" ? "Artefato temporário expirou" : artifactStatus === "expiring" ? "Artefato temporário próximo do prazo" : "Artefato temporário do Actions"}</p>
          <p>Prazo informado pelo GitHub: {humanDate(state.artifact.expiresAt)}. {artifactStatus === "expired" ? "Esse ZIP do Actions não está mais disponível." : "Prazo válido apenas para a cópia de teste do Actions."}</p>
          <p>A release certificada, quando publicada, possui distribuição independente desse prazo.</p>
        </div>
      </div> : null}
      {!state.artifact && state.phase === "ready" ? <p className="mt-2 flex items-start gap-2 text-[10px] text-ink-muted"><FileCheck2 size={13} className="mt-0.5 shrink-0"/>Validade do artefato temporário não confirmada pelo GitHub. Nenhum prazo foi presumido.</p> : null}
      {runWarning ? <div role="note" className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-3 py-2 text-xs text-amber-200">
        <AlertTriangle size={15} className="mt-0.5 shrink-0"/>
        <span>{runWarning === "failed" ? "A compilação mais recente falhou. Uma release certificada anterior continua identificada separadamente." : "Há uma compilação mais recente em andamento. O download disponível, se houver, é da última release aprovada."}</span>
      </div> : null}
      {failureCode ? <div role="alert" className="mt-2 rounded-xl border border-coral/20 bg-coral/[.05] px-3 py-2 text-xs text-coral">Falha de verificação: <span className="font-mono">{failureCode}</span>. Copie o diagnóstico se precisar de suporte.</div> : null}
      {!native ? <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">O PWA recebe atualizações pelo navegador. O APK Android é um produto separado; esta tela não compara sua versão web com um APK.</p> : null}

      <div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2">
        <button type="button" onClick={() => {setFeedback("");void checkVaultUpdates(true);}} disabled={checking}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary transition-colors active:scale-[0.985] disabled:opacity-50 motion-reduce:transform-none"><RefreshCw size={15} className={checking ? "animate-spin motion-reduce:animate-none" : ""}/> Procurar atualizações</button>
        {(hasUpdate || (!native && Boolean(release) && state.phase === "ready")) ? <button type="button" onClick={()=>void openApk()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-300 transition-colors active:scale-[0.985] motion-reduce:transform-none"><Download size={15}/> {native ? "Baixar manualmente" : "Baixar APK Android"}</button> : <button type="button" onClick={()=>void copyDiagnostic()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-muted transition-colors active:scale-[0.985] motion-reduce:transform-none"><Copy size={15}/> Copiar diagnóstico</button>}
      </div>
      {release ? <button type="button" onClick={()=>void copyDiagnostic()} className="mt-2 flex min-h-10 w-full items-center justify-between px-2 text-[11px] text-ink-muted"><span className="flex items-center gap-1.5"><Copy size={13}/> Copiar diagnóstico técnico</span><ChevronRight size={14}/></button> : null}
      {state.run && state.phase === "ready" && (runWarning || !release) ? <button type="button" onClick={()=>void openTrusted(state.run!.url)} className="mt-1 flex min-h-10 w-full items-center justify-between px-2 text-[11px] text-ink-muted"><span className="flex items-center gap-1.5"><ExternalLink size={13}/> Ver execução no GitHub</span><ChevronRight size={14}/></button> : null}
      {native ? <button type="button" onClick={()=>void toggleNotify()} aria-pressed={notifyEnabled} className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-surface-border/60 px-3 text-left text-xs text-ink-secondary transition-colors active:scale-[0.985] motion-reduce:transform-none"><span className="flex items-center gap-2"><BellRing size={15}/> Avisar sobre novos APKs e prazo do artefato</span><span className={notifyEnabled ? "shrink-0 font-bold text-emerald-300" : "shrink-0 text-ink-muted"}>{notifyEnabled ? "Ativado" : "Desativado"}</span></button> : null}
      <p className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>O aplicativo nunca instala APK sem sua confirmação. Alertas sobre novas versões exigem consulta ao abrir/retomar o VAULT; lembretes de prazo já agendados podem aparecer com o app fechado. Push remoto ainda não está disponível.</p>
      {feedback ? <p role="status" className="mt-2 text-[11px] text-emerald-300">{feedback}</p> : null}
    </motion.section>
  );
}
