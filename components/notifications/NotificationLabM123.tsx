"use client";
/** M123: safe local preview; does not schedule, notify, write or change permissions. */
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { BellRing, EyeOff, ShieldCheck } from "lucide-react";
import type { HealthReminderRule } from "@/lib/health-reminders/types";
import { nextHealthReminderOccurrence } from "@/lib/health-reminders/domain";
import { readQuietHoursM115, quietAtM115, type QuietHoursM115 } from "@/lib/health-reminders/quiet-hours-m115";
import { isNotificationPreferenceEnabled } from "@/lib/notifications";
import { isVaultNotificationCategoryEnabled, VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";
import { projectNotificationLabM123 } from "@/lib/health-reminders/notification-lab-m123";

export function NotificationLabM123({ reminders, userId, personId, permission }: {
  reminders: readonly HealthReminderRule[]; userId: string; personId: string; permission: string;
}) {
  const [opened, setOpened] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { setChosen(null); setOpened(false); }, [userId, personId]);
  useEffect(() => {
    if (!opened) return;
    const refresh = () => setRefreshKey(value => value + 1);
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
    window.addEventListener("vault:health-reminders-reconcile", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
      window.removeEventListener("vault:health-reminders-reconcile", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [opened]);
  const scoped = useMemo(() => userId && personId ? reminders.filter(rule => rule.user_id === userId && rule.person_id === personId) : [], [reminders,userId,personId]);
  const selection = scoped.find(rule => rule.id === chosen) ?? scoped[0] ?? null;
  const preview = useMemo(() => {
    if (!opened) return null;
    const quiet: QuietHoursM115 = readQuietHoursM115();
    const next = selection ? nextHealthReminderOccurrence(selection) : null;
    return projectNotificationLabM123({ rule: selection, userId, personId, next,
      quietAtNext: Boolean(next && quietAtM115(next,quiet)),
      master: isNotificationPreferenceEnabled(),
      category: isVaultNotificationCategoryEnabled("lembretes_saude"), permission });
  }, [opened, selection, userId, personId, permission, refreshKey]);
  const fmt = (iso: string | null) => {
    if (!iso) return "Não informada";
    const date=new Date(iso);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(date) : "Não informada";
  };
  return <details onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => setOpened(event.currentTarget.open)} className="mx-auto mt-3 max-w-xl rounded-[22px] border border-sky-300/20 bg-sky-300/[.035] p-3" aria-label="Laboratório de notificações e privacidade">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><BellRing size={17} className="text-sky-300"/><span className="min-w-0 flex-1">Laboratório de notificações<span className="mt-0.5 block text-[10px] font-normal text-ink-muted">Veja horário, texto e privacidade antes de esperar um aviso</span></span><ShieldCheck size={16} className="text-sky-300"/></summary>
    {opened && <div className="space-y-3 border-t border-surface-border/50 pt-3">
      <p className="text-[11px] leading-relaxed text-ink-muted">Prévia dos lembretes personalizados desta pessoa. Não agenda, não envia, não pede permissão e não altera preferências. Os avisos automáticos têm regras próprias.</p>
      {scoped.length > 0 && <div className="max-h-32 space-y-1 overflow-y-auto" aria-label="Escolher lembrete para prévia">{scoped.slice(0,20).map(rule => <button key={rule.id} type="button" aria-pressed={selection?.id===rule.id} onClick={() => setChosen(rule.id)} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs ${selection?.id===rule.id ? "border-sky-300/50 bg-sky-300/[.07] text-sky-200" : "border-surface-border bg-surface text-ink-secondary"}`}><span className="min-w-0 truncate">{rule.title}</span><span className="shrink-0 font-mono text-[11px]">{rule.time}</span></button>)}</div>}
      {scoped.length>20 && <p className="text-[10px] text-ink-muted">Mostrando os primeiros 20 lembretes. Os demais continuam acessíveis na lista original.</p>}
      {preview && <div className="rounded-2xl border border-surface-border bg-void/55 p-3" aria-label="Prévia sem disparo">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Como o aviso foi configurado</p>
        <strong className="mt-2 block break-words text-sm text-ink-primary">{preview.title}</strong>
        <p className="mt-1 break-words text-xs leading-relaxed text-ink-secondary">{preview.body}</p>
        <div className="mt-3 space-y-1.5 border-t border-surface-border/50 pt-2 text-[11px] text-ink-muted">
          <p>Próxima ocorrência calculada: {fmt(preview.nextTime)}</p>
          <p>{preview.visibility === "private" ? "Canal privado: conteúdo oculto na tela bloqueada (visibility -1)." : preview.visibility === "public" ? "Canal normal: conteúdo potencialmente visível na tela bloqueada (visibility 1)." : "Privacidade indisponível sem lembrete válido."}</p>
          <p>{preview.note}</p>
          <p>Destino registrado: {preview.route ?? "Não informado"}</p>
        </div>
      </div>}
      <p className="flex items-start gap-2 text-[10px] leading-relaxed text-ink-faint"><EyeOff size={14} className="mt-0.5 shrink-0"/>Esta é a configuração do canal, não uma captura do Android. A tela bloqueada, as permissões, o modo Não Perturbe e o sistema podem mudar o resultado.</p>
    </div>}
  </details>;
}
