"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, ChevronRight, Download, Settings2, ShieldCheck } from "lucide-react";
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
export function VaultNotificationHub({ activeCustomCount, totalCustomCount, permission, onConfigure, onUpdates }: Props) {
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
    <section aria-label="Visão geral de notificações" className="mx-auto mt-4 max-w-xl overflow-hidden rounded-[24px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.055] via-surface to-surface p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><BellRing size={19}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300">Central de avisos</p>
          <h2 className="mt-0.5 text-sm font-bold text-ink-primary">Tudo que o VAULT pode lembrar</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Doses, consultas, documentos e outros avisos automáticos não aparecem na lista de lembretes criados por você.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-xl border border-surface-border/55 bg-void/35 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted"><ShieldCheck size={13}/> Categorias automáticas</div>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink-primary">{categories.active}<span className="text-xs font-normal text-ink-muted">/{categories.total}</span></p>
          <p className="text-[10px] text-ink-muted">{!categories.master ? "Preferência geral desligada" : !canNotify ? "Permissão do aparelho a conferir" : "Preferências permitidas"}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-surface-border/55 bg-void/35 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted"><CalendarClock size={13}/> Personalizados</div>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink-primary">{activeCustomCount}<span className="text-xs font-normal text-ink-muted">/{totalCustomCount}</span></p>
          <p className="text-[10px] text-ink-muted">Criados para sua rotina</p>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onConfigure} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.075] px-3 text-left text-xs font-semibold text-emerald-200 transition-colors active:scale-[0.985] motion-reduce:transform-none"><span className="flex items-center gap-2"><Settings2 size={15}/> Personalizar avisos</span><ChevronRight size={14}/></button>
        <button type="button" onClick={onUpdates} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-surface-border/55 bg-surface-raised/40 px-3 text-left text-xs font-semibold text-ink-secondary transition-colors active:scale-[0.985] motion-reduce:transform-none"><span className="flex items-center gap-2"><Download size={15}/> Atualizações do app</span><ChevronRight size={14}/></button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Avisos sobre APKs usam preferência própria na aba Mais. No PWA, lembretes com o navegador fechado não são garantidos. Ativar categorias não equivale à permissão do Android.</p>
    </section>
  );
}
