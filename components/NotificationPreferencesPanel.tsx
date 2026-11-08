"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BrainCircuit, CalendarClock, ClipboardList, Droplets, FileText, Package, Pill, Stethoscope } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getVaultNotificationPreferences,
  setAllVaultNotificationCategories,
  setVaultNotificationCategoryEnabled,
  VAULT_NOTIFICATION_PREFERENCES_EVENT,
  type VaultNotificationCategory,
  type VaultNotificationPreferences,
} from "@/lib/notification-preferences";
import {
  isNotificationPreferenceEnabled,
  setNotificationPreferenceEnabled,
} from "@/lib/notifications";

const OPTIONS: Array<{
  id: VaultNotificationCategory;
  label: string;
  description: string;
  icon: typeof Bell;
}> = [
  { id: "doses", label: "Medicamentos e doses", description: "Horários dos medicamentos de rotina.", icon: Pill },
  { id: "consultas", label: "Consultas", description: "Avisos antes das consultas agendadas.", icon: Stethoscope },
  { id: "exames", label: "Exames", description: "Avisos de exames com data e horário.", icon: ClipboardList },
  { id: "retiradas", label: "Retiradas", description: "Retiradas programadas de medicamentos.", icon: Package },
  { id: "renovacoes", label: "Receitas e renovações", description: "Planejamento de renovação de medicamentos.", icon: CalendarClock },
  { id: "documentos", label: "Documentos", description: "Vencimentos relevantes de documentos.", icon: FileText },
  { id: "lembretes_saude", label: "Lembretes de saúde", description: "Hidratação, medições, sintomas e lembretes criados por você.", icon: Droplets },
  { id: "insights", label: "Insights importantes", description: "Sinais importantes ou críticos selecionados pelo cérebro do Vault.", icon: BrainCircuit },
];

export function NotificationPreferencesPanel() {
  const [master, setMaster] = useState(false);
  const [prefs, setPrefs] =
    useState<VaultNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    const refresh = () => {
      setMaster(isNotificationPreferenceEnabled());
      setPrefs(getVaultNotificationPreferences());
    };
    refresh();
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
    return () =>
      window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
  }, []);

  const setMasterPreference = (enabled: boolean) => {
    triggerHaptic("light");
    setNotificationPreferenceEnabled(enabled);
    setMaster(enabled);
    window.dispatchEvent(new CustomEvent("vault:health-reminders-reconcile"));
  };

  return (
    <section className="rounded-3xl border border-surface-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 rounded-xl border border-ice/20 bg-ice/10 p-2 text-ice">
            {master ? <Bell size={18} /> : <BellOff size={18} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">Notificações do Vault · avisos automáticos</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Escolha quais tipos de eventos podem gerar avisos. A permissão do Android é independente.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Ativar ou desativar notificações do Vault"
          aria-checked={master}
          onClick={() => setMasterPreference(!master)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
            master ? "border-ice/40 bg-ice/30" : "border-surface-border bg-void"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-ink-primary transition-all ${
              master ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <p aria-live="polite" className="mt-3 rounded-xl border border-surface-border/50 bg-void/35 px-3 py-2 text-[11px] text-ink-muted">
        {Object.values(prefs).filter(Boolean).length} de {OPTIONS.length} categorias selecionadas · {master ? "preferência geral ativa" : "preferência geral desativada"}.
      </p>
      <div className={`mt-3 space-y-2 ${master ? "" : "opacity-50"}`}>
        {OPTIONS.map((option) => {
          const checked = prefs[option.id];
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!master}
              role="switch"
              aria-label={`${option.label}: ${checked ? "ativada" : "desativada"}`}
              aria-checked={checked}
              onClick={() =>
                setPrefs(
                  setVaultNotificationCategoryEnabled(option.id, !checked)
                )
              }
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-surface-border bg-void/30 p-3 text-left disabled:cursor-not-allowed"
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-xl border ${checked ? "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300" : "border-surface-border bg-surface-raised text-ink-muted"}`}><Icon size={17}/></span>
                <span className="min-w-0"><span className="block text-xs font-semibold text-ink-primary">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {option.description}
                </span></span>
              </span>
              <span
                aria-hidden="true"
                className={`relative h-6 w-10 shrink-0 rounded-full border ${
                  checked
                    ? "border-ice/40 bg-ice/25"
                    : "border-surface-border bg-surface"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-ink-primary transition-all ${
                    checked ? "left-5" : "left-1"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!master}
          onClick={() => setPrefs(setAllVaultNotificationCategories(true))}
          className="rounded-xl border border-surface-border px-3 py-2 text-[10px] font-semibold text-ink-muted disabled:opacity-40"
        >
          Ativar todas
        </button>
        <button
          type="button"
          disabled={!master}
          onClick={() => setPrefs(setAllVaultNotificationCategories(false))}
          className="rounded-xl border border-surface-border px-3 py-2 text-[10px] font-semibold text-ink-muted disabled:opacity-40"
        >
          Silenciar categorias
        </button>
      </div>
    </section>
  );
}
