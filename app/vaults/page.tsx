"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { VaultCard } from "@/components/VaultCard";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function VaultsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const vaults = useLiveQuery(
    () => db.vaults.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  useEffect(() => {
    const countMembers = async () => {
      if (!vaults || vaults.length === 0) return;

      const counts: Record<string, number> = {};
      for (const vault of vaults) {
        if (vault.id) {
          const count = await db.vaultMembers.where("vault_id").equals(vault.id).count();
          counts[vault.id] = count;
        }
      }
      setMemberCounts(counts);
    };

    countMembers();
  }, [vaults]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 560);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Meus cofres
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Compartilhe documentos com família, médicos e cuidadores
              </p>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/vaults/novo");
              }}
              aria-label="Criar cofre"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!vaults || vaults.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Lock size={32} className="text-ink-muted" />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum cofre criado
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Crie um cofre para compartilhar documentos com sua família, médicos ou cuidadores.
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/vaults/novo");
                }}
                className="mt-6"
              >
                Criar cofre
              </Button>
            </motion.div>
          ) : (
            vaults.map((vault, index) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.24) }}
              >
                <VaultCard
                  vault={vault}
                  memberCount={memberCounts[vault.id!] || 0}
                />
              </motion.div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}