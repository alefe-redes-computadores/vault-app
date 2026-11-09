"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, ChevronRight, Settings2, ShieldCheck } from "lucide-react";
import { getVaultNotificationPreferences, VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";
import { isNotificationPreferenceEnabled } from "@/lib/notifications";

type Props = {
  activeCustomCount: number;
  totalCustomCount: number;
  permission: string;
  onConfigure: () => void;
  onUpdates: () => void;
};

/** M94: painel de navegação e apresentação. Não agenda, apaga ou confirma avisos. */
export function VaultNotificationHub({ activeCustomCount, totalCustomCount, permission, onConfigure }: Props) {
  const [categories, setCategories] = useState({ active: 0, total: 8, master: false });
  useEffect(() => {
    const refresh = () => {
      const values = Object.values(getVaultNotificationPreferences());
      setCategories({ active: values.filter(Boolean).length, total: values.length, master: isNotificationPreferenceEnabled() });
    };
    refresh();
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
    window.addEventListener("vault:health-reminders-reconcile", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
      window.removeEventListener("vault:health-reminders-reconcile", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const canNotify = categories.master && permission === "granted";
  return (
    <section aria-label="Visão geral de notificações" className="mx-auto mt-4 max-w-xl rounded-[22px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[.045] via-surface to-surface p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><BellRing size={18}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Central de avisos</p>
          <h2 className="mt-0.5 text-sm font-bold text-ink-primary">Avisos da sua rotina</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Categorias automáticas e lembretes pessoais, sem misturar com atualizações do aplicativo.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-xl border border-surface-border/55 bg-void/30 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted"><ShieldCheck size={13}/> Automáticos</div>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink-primary">{categories.active}<span className="text-xs font-normal text-ink-muted">/{categories.total}</span></p>
          <p className="text-[10px] text-ink-muted">{!categories.master ? "Preferência geral desligada" : !canNotify ? "Permissão do aparelho a conferir" : "Preferências permitidas"}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-surface-border/55 bg-void/30 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted"><CalendarClock size={13}/> Personalizados</div>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink-primary">{activeCustomCount}<span className="text-xs font-normal text-ink-muted">/{totalCustomCount}</span></p>
          <p className="text-[10px] text-ink-muted">Criados por você</p>
        </div>
      </div>
      <button type="button" onClick={onConfigure} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/[0.075] px-3 text-left text-xs font-semibold text-emerald-200 active:scale-[0.985] motion-reduce:transform-none">
        <span className="flex items-center gap-2"><Settings2 size={15}/> Configurar categorias e horários</span><ChevronRight size={15}/>
      </button>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">No PWA, lembretes com o navegador fechado não são garantidos. No APK, o Android controla as permissões. Atualizações do APK ficam na aba Mais.</p>
    </section>
  );
}
