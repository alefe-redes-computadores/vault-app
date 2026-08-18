// app/vaults/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useVaults } from "@/hooks/useVaults";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { VaultCard } from "@/components/VaultCard";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { db } from "@/lib/db";

export default function VaultsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { vaults } = useVaults();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

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

  if (vaults === undefined) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
            <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Meus cofres</h1>
            <p className="mt-1 text-sm text-ink-muted">Compartilhe documentos com família, médicos e cuidadores</p>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!vaults || vaults.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="Nenhum cofre criado"
              description="Crie um cofre para compartilhar documentos com sua família, médicos ou cuidadores."
              actionLabel="Criar cofre"
              onAction={() => { trigger("vibrate"); router.push("/vaults/novo"); }}
            />
          ) : (
            vaults.map((vault, index) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.24) }}
              >
                <VaultCard vault={vault} memberCount={memberCounts[vault.id!] || 0} />
              </motion.div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}