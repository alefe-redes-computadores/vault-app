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
import { VAULT_UPDATE_FRAGMENT_M117 } from "@/lib/updates/update-navigation-m117";
import { VaultUpdateHistory } from "@/components/updates/VaultUpdateHistory";
import { getVaultReleaseRunGapMessage } from "@/lib/updates/release-registry";

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
  // M117: only the fixed updates fragment expands the existing preferences group.
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash !== VAULT_UPDATE_FRAGMENT_M117) return;
      const target = document.getElementById("vault-updates");
      if (!target) return;
      const disclosure = target.closest("details");
      if (disclosure && !disclosure.open) disclosure.open = true;
      window.requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: "auto" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  const native = state.runtime === "android";
  const release = state.release;
  const lastKnown = state.lastConfirmedRelease;
  const hasUpdate = native && state.phase === "ready" && state.decision === "available" && Boolean(release);
  const checking = state.phase === "checking";
  const runWarning = state.newestRunWarning;
  const failureCode = runWarning === "failed" && state.run
    ? `VAULT-UPD-BUILD-FAILED-${state.run.id}` : state.errorCode;
  const artifactStatus = getVaultTemporaryArtifactStatus(state.artifact);
  const status = checking ? "Verificando atualização…"
    : state.phase === "error" ? "Consulta indisponível · atualização não confirmada"
    : !native ? "PWA · atualizações pela web"
    : state.decision === "available" ? "Atualização distribuída e instalável"
    : state.decision === "current" ? (state.run?.number && release && state.run.number > release.build && state.run.status === "completed" && state.run.conclusion === "success"
      ? "Última versão distribuída instalada · compilação mais recente não liberada" : "Última versão distribuída instalada")
    : state.decision === "preparing" ? "O APK está sendo preparado"
    : state.decision === "failed" ? "Compilação não concluída"
    : state.decision === "unknown_installed" ? "Versão instalada não identificada"
    : state.phase === "idle" ? "Consultar versões" : "Nenhum APK certificado disponível";

  async function copyDiagnostic() {
    const summary = [
      "VAULT UPDATE DIAGNÓSTICO", `Código: ${failureCode || "VAULT-UPD-STATUS"}`,
      `App: ${native ? "Android" : "PWA"} ${state.installedVersion || APP_VERSION}`,
      `Build instalado: ${state.installedBuild ?? "não identificado"}`,
      `Release consultada: ${release?.tag || "não confirmada nesta consulta"}`,
      `Última release antes da falha: ${state.lastConfirmedRelease?.tag || "sem referência"}`,
      `Última consulta confirmada: ${state.lastConfirmedAt ? humanDate(state.lastConfirmedAt) : "não disponível"}`,
      `Último run: ${(state.run || state.lastConfirmedRun)?.id ?? "não consultado"} / ${(state.run || state.lastConfirmedRun)?.status ?? "desconhecido"} / ${(state.run || state.lastConfirmedRun)?.conclusion ?? "sem conclusão"}`,
      `Commit da Action: ${(state.run || state.lastConfirmedRun)?.sha ?? "não informado"}`,
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

  const actionIsNewer = Boolean(state.run && release && state.run.number > release.build);
  const actionTime = state.run?.createdAt ? humanDate(state.run.createdAt) : "Horário não informado";
  const actionState = !state.run ? "Não foi possível consultar as execuções"
    : state.run.status !== "completed" ? "Em andamento"
    : state.run.conclusion === "success" ? "Concluída com sucesso"
    : state.run.conclusion === "cancelled" ? "Cancelada"
    : state.run.conclusion === "failure" ? "Falhou"
    : state.run.conclusion === "timed_out" ? "Tempo esgotado" : "Sem resultado confirmado";
  const activeRun = Boolean(state.run && state.run.status !== "completed");
  const releaseRunGap = actionIsNewer && state.run?.status === "completed" && state.run.conclusion === "success";
  const checkedLabel = state.checkedAt ? humanDate(state.checkedAt) : "Ainda não consultado";

  return (
    <motion.section id="vault-updates" aria-label="Central de atualizações do Vault"
      initial={reducedMotion ? false : {opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: reducedMotion ? 0 : 0.24}}
      className="relative scroll-mt-24 overflow-hidden rounded-[22px] border border-emerald-300/20 bg-surface p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300"><Smartphone size={20}/></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-ink-primary">Atualizações do VAULT</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${state.phase}-${state.decision}`} role="status" aria-live="polite"
              initial={reducedMotion ? false : {opacity:0, y:3}}
              animate={{opacity:1, y:0}} exit={{opacity:0}}
              transition={{duration: reducedMotion ? 0 : 0.16}}
              className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
              {checking ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none"/> : hasUpdate ? <CheckCircle2 size={14} className="text-emerald-300"/> : null}{status}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs" aria-label="Estado do aplicativo e da distribuição">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface-raised/40 p-3">
            <p className="text-[11px] text-ink-muted">{native ? "Instalado neste aparelho" : "Versão PWA"}</p>
            <p className="mt-1 truncate text-base font-bold text-ink-primary">v{state.installedVersion || APP_VERSION}</p>
            <p className="mt-1 text-xs text-ink-secondary">{native ? state.installedBuild ? `Build ${state.installedBuild}` : "Build não identificado" : "Distribuição web independente"}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface-raised/40 p-3">
            <p className="text-[11px] text-ink-muted">Última compilação</p>
            <p className="mt-1 truncate text-base font-bold text-ink-primary">{state.run ? `Build ${state.run.number}` : "Não confirmada"}</p>
            <p className="mt-1 text-xs text-ink-secondary">{state.run ? `Action #${state.run.number} · ${actionState}` : "Nenhuma execução revalidada"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.035] p-3">
          <div className="flex items-center justify-between gap-2"><p className="font-semibold text-ink-primary">Última release distribuída</p><PackageCheck size={16} className="text-emerald-300"/></div>
          <p className="mt-1 font-bold text-ink-primary">{release ? `v${release.version} · Build ${release.build}` : "Nenhuma release confirmada nesta consulta"}</p>
          {releaseRunGap ? <p className="mt-1 text-amber-200">{getVaultReleaseRunGapMessage(state.installedBuild, release, state.run, native)}</p> : null}
          {state.phase === "error" && lastKnown ? <p className="mt-1 text-amber-200">Referência anterior: v{lastKnown.version} · Build {lastKnown.build}. Apenas informativa; não habilita instalação.</p> : null}
        </div>
      </div>
      {state.phase === "error" ? <p role="alert" className="mt-2 text-xs text-amber-200">
        {state.errorCode === "VAULT-UPD-OFFLINE" ? "Sem conexão. Tente novamente ao voltar à internet." :
         state.errorCode === "VAULT-UPD-RATE-LIMIT" ? "A consulta ao GitHub atingiu o limite. Tente novamente mais tarde." :
         "A consulta falhou. Não é possível garantir que exista uma atualização nova."}
        {state.lastConfirmedAt ? ` Última consulta confirmada em ${humanDate(state.lastConfirmedAt)}.` : " Ainda não há consulta confirmada."}
      </p> : null}

      {release && state.phase === "ready" ? <p className="mt-2 text-xs text-ink-secondary">
        Release certificada publicada em {humanDate(release.publishedAt)} · {humanSize(release.bytes)}.
        {native && state.installedBuild !== null && release.build <= state.installedBuild ? " Este aparelho já possui esse build ou um superior." : ""}
      </p> : null}

      {native ? <VaultNativeUpdateFlow release={release} installedBuild={state.installedBuild} available={hasUpdate}/> : null}

      {release && state.phase === "ready" ? <section aria-label="Novidades da atualização" className="mt-3 rounded-xl border border-surface-border/40 bg-surface-raised/20 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Sparkles size={15} className="text-emerald-300"/> O que mudou nesta atualização</div>
        {release.highlights.length ? <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-secondary">
          {release.highlights.slice(0, 4).map((item, i) => <li key={`${release.tag}-${i}`}>• {item.replace(/^(?:feat|fix|chore|docs|refactor|perf|test)(?:\([^)]+\))?:\s*/i, "")}</li>)}
        </ul> : <p className="mt-2 text-xs text-ink-muted">Esta release ainda não possui um resumo público detalhado. Consulte o histórico certificado.</p>}
        {release.highlights.length > 4 ? <details className="mt-2 rounded-lg border border-surface-border/30 px-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-ink-secondary">Ver mais {release.highlights.length - 4} melhorias</summary>
          <ul className="space-y-1 pb-2 text-xs text-ink-secondary">{release.highlights.slice(4).map((item,i) => <li key={`${release.tag}-extra-${i}`}>• {item.replace(/^(?:feat|fix|chore|docs|refactor|perf|test)(?:\([^)]+\))?:\s*/i, "")}</li>)}</ul>
        </details> : null}
        <p className="mt-2 text-[11px] text-ink-muted">As novidades correspondem à release oferecida. O histórico recente de releases fica nos detalhes; versões antigas podem não aparecer.</p>
      </section> : null}

      <div className="mt-3 rounded-xl border border-surface-border/40 bg-surface-raised/20 px-3 py-2.5" aria-label="Situação da compilação no GitHub">
        <div className="flex items-start gap-2.5">
          <Clock3 size={17} className="mt-0.5 shrink-0 text-ink-secondary"/>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-primary">{activeRun ? "Compilação em andamento" : "Última compilação consultada"}</p>
            <p className="mt-1 text-xs text-ink-secondary">{state.run ? `Action #${state.run.number} · ${actionState}` : "Nenhuma execução identificada"}</p>
            {state.run ? <p className="mt-1 text-[11px] text-ink-muted">Iniciada: {actionTime}</p> : null}
            {releaseRunGap ? <p className="mt-1 text-xs text-amber-200">Essa Action terminou com sucesso, mas o APK oferecido continua sendo o Build {release?.build}: ainda não foi confirmada uma release certificada dessa execução.</p> : null}
            {actionIsNewer && activeRun && release ? <p className="mt-1 text-xs text-amber-200">O Build {release.build} permanece o último APK certificado enquanto a compilação nova não é publicada.</p> : null}
            <p className="mt-1 text-[11px] text-ink-muted">Verificado em: {checkedLabel}</p>
          </div>
        </div>
      </div>

      {runWarning && !releaseRunGap ? <p role="note" className="mt-2 text-xs text-amber-200">
        {runWarning === "failed" ? "A última compilação apresentou falha; uma release certificada anterior continua independente." : "A nova compilação não é, por si só, uma atualização pronta."}
      </p> : null}
      {failureCode ? <p role="alert" className="mt-2 text-xs text-coral">Consulta com atenção. Código para suporte: {failureCode}.</p> : null}
      {!native ? <p className="mt-2 text-xs text-ink-secondary">O PWA recebe atualizações pelo navegador. A versão web não é comparável ao build do APK Android.</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => {setFeedback("");void checkVaultUpdates(true);}} disabled={checking}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary disabled:opacity-50">
          <RefreshCw size={16} className={checking ? "animate-spin motion-reduce:animate-none" : ""}/> Procurar atualizações
        </button>
        {(hasUpdate || (!native && Boolean(release) && state.phase === "ready")) ? <button type="button" onClick={()=>void openApk()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border/60 px-3 text-xs font-semibold text-ink-secondary">
          <Download size={16}/> {native ? "Baixar manualmente" : "Baixar APK Android"}
        </button> : null}
      </div>

      <details className="mt-3 rounded-xl border border-surface-border/45 px-3 py-1" aria-label="Detalhes técnicos e histórico">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-ink-secondary">Segurança, detalhes técnicos e histórico <ChevronRight size={16}/></summary>
        <div className="space-y-3 border-t border-surface-border/30 pb-3 pt-3 text-xs text-ink-secondary">
          {release ? <div className="space-y-2">
            <p className="font-semibold text-ink-primary"><PackageCheck size={14} className="mr-1 inline text-emerald-300"/> Release certificada · Build {release.build}</p>
            <p>Publicada em: {humanDate(release.publishedAt)}. Download oficial via GitHub Releases, sem expiração automática de 7 dias.</p>
            <p>Arquivo: Vault-App.apk · {humanSize(release.bytes)} · versão {release.version}.</p>
            <p>O download nativo verifica SHA-256, assinatura e identidade do pacote. A instalação do APK requer sua confirmação no Android.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>void copyChecksum()} className="min-h-11 rounded-lg border border-surface-border/60 px-2 text-xs">Copiar SHA-256</button>
              <button type="button" onClick={()=>void openTrusted(release.releaseUrl)} className="min-h-11 rounded-lg border border-surface-border/60 px-2 text-xs">Ver release</button>
            </div>
          </div> : <p>Release certificada não está disponível ou ainda não foi confirmada pela consulta.</p>}
          <div className="border-t border-surface-border/30 pt-2">
            <p className="font-semibold text-ink-primary">Execução do GitHub Actions</p>
            <p className="mt-1">{state.run ? `Action #${state.run.number} · ${actionState}` : "Não consultada"}. Esse processo não é o APK oferecido.</p>
            {state.run ? <button type="button" onClick={()=>void openTrusted(state.run!.url)} className="mt-2 min-h-11 text-emerald-300 underline">Ver execução no GitHub</button> : null}
          </div>
          <div className="border-t border-surface-border/30 pt-2">
            <p className="font-semibold text-ink-primary">Cópia temporária para testes</p>
            {state.artifact ? <p className="mt-1">{artifactStatus === "expired" ? "Expirada" : artifactStatus === "expiring" ? "Perto de expirar" : "Disponível no Actions"} · Expira em {humanDate(state.artifact.expiresAt)}. Esse prazo não afeta a release certificada.</p>
              : <p className="mt-1">O prazo do arquivo temporário não foi confirmado. Nenhum prazo foi presumido.</p>}
          </div>
          <VaultUpdateHistory installedBuild={native ? state.installedBuild : null}/>
          <button type="button" onClick={()=>void copyDiagnostic()} className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-surface-border/30 pt-2 text-ink-secondary"><span className="flex items-center gap-2"><Copy size={16}/> Copiar diagnóstico técnico</span><ChevronRight size={15}/></button>
        </div>
      </details>

      {native ? <div className="mt-3 rounded-xl border border-surface-border/40 px-3 py-1">
        <button type="button" onClick={()=>void toggleNotify()} aria-pressed={notifyEnabled}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs text-ink-secondary">
          <span className="flex items-center gap-2"><BellRing size={16}/> Avisar quando houver nova versão</span>
          <span className={notifyEnabled ? "font-semibold text-emerald-300" : "text-ink-muted"}>{notifyEnabled ? "Ativado" : "Desativado"}</span>
        </button>
      </div> : null}
      <p className="mt-2 text-[11px] text-ink-muted">A release depende da publicação no GitHub. Alertas exigem uma consulta ao abrir/retomar o aplicativo; push remoto com o aplicativo fechado ainda não está disponível.</p>
      {feedback ? <p role="status" className="mt-2 text-xs text-emerald-300">{feedback}</p> : null}
    </motion.section>
  );
}
