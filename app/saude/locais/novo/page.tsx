"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, Building2, ChevronRight } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";

export default function NovoLocalPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const options = [
    {
      id: "farmacia",
      label: "Farmácia",
      description: "Onde você compra ou retira medicamentos",
      icon: Pill,
      path: "/saude/farmacias/novo",
    },
    {
      id: "hospital",
      label: "Hospital",
      description: "Onde você faz consultas, exames ou internações",
      icon: Building2,
      path: "/saude/hospitais/novo",
    },
  ];

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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                O que você quer cadastrar?
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-6">
          {options.map((opt, index) => {
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.05 }}
                onClick={() => {
                  trigger("vibrate");
                  router.push(opt.path);
                }}
                className="flex w-full items-center gap-4 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-ink-primary">
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{opt.description}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </motion.button>
            );
          })}
        </section>
      </main>
    </PageTransition>
  );
}
