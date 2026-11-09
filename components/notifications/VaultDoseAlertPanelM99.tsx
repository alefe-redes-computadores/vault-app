"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, ChevronDown, Clock3, RefreshCw, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { isVaultAndroid } from "@/lib/native-runtime";
import {
  getVaultDoseAlertMode,
  setVaultDoseAlertMode,
  type VaultDoseAlertMode,
  VAULT_DOSE_ALERT_MODE_EVENT,
} from "@/lib/dose-alert-policy-m99";
import { summarizeNativeCareAgenda } from "@/lib/dose-reminder-diagnostics";
import { getVaultDosePauseUntil, setVaultDosePauseMinutes } from "@/lib/dose-alert-pause-m99p2";
import { ensureVaultNotificationChannel, VAULT_NOTIFICATION_CHANNEL_ID } from "@/lib/notifications";

const OPTIONS: Array<{id: VaultDoseAlertMode; title: string; description: string}> = [
  { id: "suave", title: "Suave", description: "Um aviso de dose pendente, como antes." },
  { id: "reforcado", title: "Reforçado", description: "Até duas tentativas por slot não resolvido." },
  { id: "persistente", title: "Persistente", description: "Até quatro tentativas espaçadas, sem toque contínuo." },
];

type Diagnostic = {
  display: "granted" | "denied" | "prompt" | "unavailable" | "error";
  exact: "granted" | "denied" | "prompt" | "unavailable" | "error";
  scheduled: number | null;
};

export function VaultDoseAlertPanelM99() {
  const { activePersonId } = useActivePersonId();
  const [mode, setMode] = useState<VaultDoseAlertMode>("suave");
  const [diag, setDiag] = useState<Diagnostic>({ display: "unavailable", exact: "unavailable", scheduled: null });
  const [busy, setBusy] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const android = isVaultAndroid();

  const refresh = useCallback(async () => {
    if (!activePersonId) return;
    setMode(getVaultDoseAlertMode(activePersonId));
    setPauseUntil(getVaultDosePauseUntil(activePersonId));
    if (!android) {
      setDiag({ display: "unavailable", exact: "unavailable", scheduled: null });
      return;
    }
    try {
      const [permissions, exact, pending] = await Promise.all([
        LocalNotifications.checkPermissions(),
        LocalNotifications.checkExactNotificationSetting(),
        LocalNotifications.getPending(),
      ]);
      setDiag({
        display: permissions.display === "granted" ? "granted" : permissions.display === "denied" ? "denied" : "prompt",
        exact: exact.exact_alarm === "granted" ? "granted" : exact.exact_alarm === "denied" ? "denied" : "prompt",
        scheduled: summarizeNativeCareAgenda(pending.notifications, activePersonId).total,
      });
    } catch {
      setDiag({ display: "error", exact: "error", scheduled: null });
    }
  }, [activePersonId, android]);

  useEffect(() => {
    void refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    const onSettings = () => void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(VAULT_DOSE_ALERT_MODE_EVENT, onSettings);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(VAULT_DOSE_ALERT_MODE_EVENT, onSettings);
    };
  }, [refresh]);

  const choose = (value: VaultDoseAlertMode) => {
    if (!activePersonId) return;
    if (setVaultDoseAlertMode(activePersonId, value)) {
      setMode(value);
      setFeedback("Modo salvo neste aparelho para a pessoa ativa. Agenda em reconciliação.");
    } else setFeedback("Não foi possível salvar neste aparelho.");
  };

  const choosePause = (minutes: 0 | 15 | 30 | 60 | 120) => {
    if (!activePersonId) return;
    const saved = setVaultDosePauseMinutes(activePersonId, minutes);
    setFeedback(saved
      ? (minutes ? `Reforços de atraso pausados por ${minutes} minutos. Horários principais preservados.` : "Reforços retomados neste aparelho.")
      : "Não foi possível alterar a pausa neste aparelho.");
    if (saved) void refresh();
  };

  const configureExact = async () => {
    if (!android || busy) return;
    setBusy(true);
    try {
      await LocalNotifications.changeExactNotificationSetting();
      setFeedback("Confira a autorização do Android e volte ao Vault para reavaliar.");
    } catch {
      setFeedback("Não foi possível abrir a configuração de alarmes exatos.");
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const testChannel = async () => {
    if (!android || busy || diag.display !== "granted") return;
    setBusy(true);
    try {
      await ensureVaultNotificationChannel();
      // ID reservado ao ensaio: não é uma dose nem altera histórico/estoque.
      const id = 1899000099;
      await LocalNotifications.cancel({ notifications: [{ id }] });
      await LocalNotifications.schedule({ notifications: [{
        id,
        title: "Teste de notificações do VAULT",
        body: "Aviso de teste. Nenhuma medicação foi registrada.",
        schedule: { at: new Date(Date.now() + 15_000), allowWhileIdle: true },
        channelId: VAULT_NOTIFICATION_CHANNEL_ID,
        extra: { type: "vault_m99_test" },
      }] });
      setFeedback("Aviso de teste agendado para daqui a 15 segundos. Agendar não comprova entrega.");
      void refresh();
    } catch {
      setFeedback("Falha ao agendar o teste; revise permissões e canal Android.");
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="Confiabilidade dos lembretes Android" className="mx-auto mt-3 max-w-xl rounded-3xl border border-emerald-400/15 bg-surface p-4">
      <details className="group">
      <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300"><BellRing size={19}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">M99 · Android</p>
          <h2 className="mt-0.5 text-sm font-bold text-ink-primary">Intensidade e confiabilidade das doses</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">Modo atual: {OPTIONS.find(item => item.id === mode)?.title}. Toque para ajustar intensidade e verificar o Android.</p>
        </div>
        <ChevronDown size={18} className="mt-2 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </div>
      </summary>
      <div className="mt-3 border-t border-surface-border/60 pt-3">
      <p className="mb-2 text-[11px] text-ink-muted">Só muda notificações futuras da pessoa ativa: nenhuma dose é marcada automaticamente.</p>
      <div className="mt-3 grid gap-2">
        {OPTIONS.map(option => (
          <button key={option.id} type="button" onClick={() => choose(option.id)} disabled={!activePersonId}
            aria-pressed={mode === option.id}
            className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${mode === option.id ? "border-emerald-400/40 bg-emerald-400/[0.075]" : "border-surface-border/70 bg-void/30"}`}>
            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${mode === option.id ? "border-emerald-300 bg-emerald-300" : "border-ink-muted"}`}/>
            <span><span className="block text-xs font-semibold text-ink-primary">{option.title}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">{option.description}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-surface-border/70 bg-void/30 p-3">
        <p className="text-xs font-semibold text-ink-primary">Pausar reforços por um período</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Não adia o horário prescrito nem o aviso principal. Pausa apenas avisos repetidos de doses pendentes desta pessoa neste aparelho.</p>
        {pauseUntil !== null && <p role="status" className="mt-2 text-[11px] text-amber-200">Reforços pausados até {new Date(pauseUntil).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {([15, 30, 60, 120] as const).map(minutes => (
            <button key={minutes} type="button" disabled={!android || !activePersonId} onClick={() => choosePause(minutes)}
              className="rounded-xl border border-surface-border px-3 py-2 text-[11px] font-semibold text-ink-primary disabled:opacity-40">{minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}</button>
          ))}
          {pauseUntil !== null && <button type="button" onClick={() => choosePause(0)} className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-200">Retomar</button>}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-surface-border/70 bg-void/30 p-3">
        <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Smartphone size={15}/> Diagnóstico deste aparelho</p><button type="button" onClick={() => void refresh()} aria-label="Atualizar diagnóstico" className="rounded-lg p-2 text-ink-muted"><RefreshCw size={15}/></button></div>
        {android ? <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <p className="rounded-xl bg-surface-raised/60 p-2 text-ink-muted">Notificações <strong className="block text-ink-primary">{diag.display === "granted" ? "Permitidas" : diag.display === "denied" ? "Bloqueadas" : "Verificar"}</strong></p>
          <p className="rounded-xl bg-surface-raised/60 p-2 text-ink-muted">Alarmes exatos <strong className="block text-ink-primary">{diag.exact === "granted" ? "Autorizados" : diag.exact === "denied" ? "Sem autorização" : "Verificar"}</strong></p>
          <p className="col-span-2 rounded-xl bg-surface-raised/60 p-2 text-ink-muted">Avisos futuros da pessoa ativa <strong className="ml-1 text-ink-primary">{diag.scheduled ?? "Indisponível"}</strong></p>
        </div> : <p className="mt-2 text-[11px] text-ink-muted">No PWA, o navegador fechado não garante alarmes. Verifique a confiabilidade no APK Android.</p>}
        {android && <div className="mt-3 flex flex-wrap gap-2">
          {diag.exact !== "granted" && <button type="button" onClick={() => void configureExact()} disabled={busy} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-[11px] font-semibold text-emerald-300 disabled:opacity-50"><Clock3 size={13} className="mr-1 inline"/> Ajustar alarmes exatos</button>}
          <button type="button" onClick={() => void testChannel()} disabled={busy || diag.display !== "granted"} className="rounded-xl border border-surface-border px-3 py-2 text-[11px] font-semibold text-ink-primary disabled:opacity-50"><ShieldCheck size={13} className="mr-1 inline"/> Testar aviso (15s)</button>
        </div>}
        <p className="mt-3 flex gap-2 text-[10px] leading-relaxed text-ink-muted"><ShieldAlert size={14} className="shrink-0"/> O Android pode atrasar alarmes por economia de bateria, modo silencioso, permissões ou reinício. Este painel verifica agendamentos, não a entrega efetiva com a tela apagada.</p>
      </div>
      {feedback && <p role="status" className="mt-3 text-[11px] leading-relaxed text-emerald-200">{feedback}</p>}
      </div>
      </details>
    </section>
  );
}
