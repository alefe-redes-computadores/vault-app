"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Stethoscope,
  Pill,
  Building2,
  Plus,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";

type Tab = "medicos" | "farmacias" | "hospitais";

export default function RedeSaudePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();

  const [tab, setTab] = useState<Tab>("medicos");

  const tabs: { id: Tab; label: string; icon: any; createPath: string; editPath: string }[] = [
    {
      id: "medicos",
      label: "Médicos",
      icon: Stethoscope,
      createPath: "/saude/medicos/novo",
      editPath: "/saude/medicos/editar",
    },
    {
      id: "farmacias",
      label: "Farmácias",
      icon: Pill,
      createPath: "/saude/farmacias/novo",
      editPath: "/saude/farmacias/editar",
    },
    {
      id: "hospitais",
      label: "Hospitais",
      icon: Building2,
      createPath: "/saude/hospitais/novo",
      editPath: "/saude/hospitais/editar",
    },
  ];

  const activeTab = tabs.find((t) => t.id === tab)!;

  const items: any[] =
    tab === "medicos" ? medicos || [] : tab === "farmacias" ? farmacias || [] : hospitais || [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Sua rede
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Toque em um item pra editar ou excluir.
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    trigger("vibrate");
                    setTab(t.id);
                  }}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    active
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="space-y-3 px-5 pt-5">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                <activeTab.icon size={22} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nenhum(a) {activeTab.label.toLowerCase()} cadastrado(a)
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre pra vincular em receitas, medicamentos e consultas.
              </p>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(activeTab.createPath);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void shadow-lg shadow-ice/15 transition-all duration-200 active:scale-95"
              >
                <Plus size={16} />
                Cadastrar {activeTab.label.toLowerCase().slice(0, -1) || activeTab.label.toLowerCase()}
              </button>
            </motion.div>
          ) : (
            <>
              {items.map((item: any, index: number) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`${activeTab.editPath}?id=${item.id}`);
                  }}
                  className="flex w-full items-start gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                    <activeTab.icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-ink-primary">
                      {item.nome}
                    </p>
                    {tab === "medicos" && item.especialidade && (
                      <p className="mt-0.5 text-xs text-ink-muted">{item.especialidade}</p>
                    )}
                    {tab === "medicos" && item.crm && (
                      <p className="mt-0.5 text-xs text-ink-faint">CRM {item.crm}</p>
                    )}
                    {(tab === "farmacias" || tab === "hospitais") && item.endereco && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin size={11} />
                        <span className="truncate">{item.endereco}</span>
                      </div>
                    )}
                    {item.telefone && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                        <Phone size={11} />
                        <span>{item.telefone}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                </motion.button>
              ))}

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(activeTab.createPath);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 py-4 text-sm font-medium text-ink-muted transition-all active:scale-[0.985] hover:border-ice/30 hover:text-ice"
              >
                <Plus size={16} />
                Cadastrar {activeTab.label.toLowerCase().slice(0, -1) || activeTab.label.toLowerCase()}
              </button>
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
