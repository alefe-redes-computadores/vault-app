"use client";

import { useEffect, useState } from "react";
import { Brain, Clock3, Pill } from "lucide-react";
import {
  DEFAULT_NOTIFICATION_BRAIN_SETTINGS,
  DOSE_OVERDUE_OFFSET_OPTIONS,
  EVENT_OFFSET_OPTIONS,
  getVaultNotificationBrainSettings,
  setVaultNotificationBrainSettings,
  VAULT_NOTIFICATION_BRAIN_EVENT,
  type EventReminderKind,
  type VaultNotificationBrainSettings,
} from "@/lib/notification-brain";

const EVENT_GROUPS: Array<{ kind: EventReminderKind; label: string }> = [
  { kind: "consulta", label: "Consultas" },
  { kind: "exame", label: "Exames" },
  { kind: "retirada", label: "Retiradas" },
];

export function NotificationBrainPanel() {
  const [settings, setSettings] = useState<VaultNotificationBrainSettings>(DEFAULT_NOTIFICATION_BRAIN_SETTINGS);

  useEffect(() => {
    const refresh = () => setSettings(getVaultNotificationBrainSettings());
    refresh();
    window.addEventListener(VAULT_NOTIFICATION_BRAIN_EVENT, refresh);
    return () => window.removeEventListener(VAULT_NOTIFICATION_BRAIN_EVENT, refresh);
  }, []);

  const save = (next: VaultNotificationBrainSettings) => {
    setSettings(setVaultNotificationBrainSettings(next));
  };

  const toggleEvent = (kind: EventReminderKind, minutes: number) => {
    const current = settings.eventOffsets[kind];
    const nextValues = current.includes(minutes)
      ? current.filter((value) => value !== minutes)
      : [...current, minutes];
    if (!nextValues.length) return;
    save({ ...settings, eventOffsets: { ...settings.eventOffsets, [kind]: nextValues } });
  };

  const toggleDose = (minutes: number) => {
    const current = settings.doseOverdueOffsets;
    const nextValues = current.includes(minutes)
      ? current.filter((value) => value !== minutes)
      : [...current, minutes];
    if (!nextValues.length) return;
    save({ ...settings, doseOverdueOffsets: nextValues });
  };

  return (
    <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-ice/20 bg-ice/10 p-2 text-ice"><Brain size={18} /></div>
        <div>
          <p className="text-sm font-semibold text-ink-primary">Cérebro de notificações</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">Escolha vários momentos. O Vault reconcilia a agenda quando o compromisso ou a dose muda.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {EVENT_GROUPS.map(({ kind, label }) => (
          <div key={kind}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-primary"><Clock3 size={14} />{label}</div>
            <div className="flex flex-wrap gap-2">
              {EVENT_OFFSET_OPTIONS.map((option) => {
                const selected = settings.eventOffsets[kind].includes(option.minutes);
                return <button key={option.minutes} type="button" onClick={() => toggleEvent(kind, option.minutes)} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${selected ? "border-ice/50 bg-ice/10 text-ice" : "border-surface-border bg-void/40 text-ink-muted"}`}>{option.label}</button>;
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-surface-border pt-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink-primary"><Pill size={14} />Dose ainda pendente</div>
          <p className="mb-2 text-[10px] leading-relaxed text-ink-muted">Repetições após o horário. Assim que a dose for tomada ou ignorada, os avisos restantes daquele slot são removidos.</p>
          <div className="flex flex-wrap gap-2">
            {DOSE_OVERDUE_OFFSET_OPTIONS.map((option) => {
              const selected = settings.doseOverdueOffsets.includes(option.minutes);
              return <button key={option.minutes} type="button" onClick={() => toggleDose(option.minutes)} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${selected ? "border-ice/50 bg-ice/10 text-ice" : "border-surface-border bg-void/40 text-ink-muted"}`}>{option.label}</button>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
