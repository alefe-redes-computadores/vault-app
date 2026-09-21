"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
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
}> = [
  { id: "doses", label: "Medicamentos e doses", description: "Horários dos medicamentos de rotina." },
  { id: "consultas", label: "Consultas", description: "Avisos antes das consultas agendadas." },
  { id: "exames", label: "Exames", description: "Avisos de exames com data e horário." },
  { id: "retiradas", label: "Retiradas", description: "Retiradas programadas de medicamentos." },
  { id: "renovacoes", label: "Receitas e renovações", description: "Planejamento de renovação de medicamentos." },
  { id: "documentos", label: "Documentos", description: "Vencimentos relevantes de documentos." },
  { id: "lembretes_saude", label: "Lembretes de saúde", description: "Hidratação, medições, sintomas e lembretes criados por você." },
  { id: "insights", label: "Insights importantes", description: "Sinais importantes ou críticos selecionados pelo cérebro do Vault." },
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
            <p className="text-sm font-semibold text-ink-primary">Notificações do Vault</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Escolha o que pode aparecer como notificação neste aparelho.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
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

      <div className={`mt-4 space-y-2 ${master ? "" : "opacity-50"}`}>
        {OPTIONS.map((option) => {
          const checked = prefs[option.id];
          return (
            <button
              key={option.id}
              type="button"
              disabled={!master}
              onClick={() =>
                setPrefs(
                  setVaultNotificationCategoryEnabled(option.id, !checked)
                )
              }
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-surface-border bg-void/30 p-3 text-left disabled:cursor-not-allowed"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink-primary">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-muted">
                  {option.description}
                </span>
              </span>
              <span
                role="switch"
                aria-checked={checked}
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
