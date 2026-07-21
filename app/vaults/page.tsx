"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock } from "lucide-react";
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
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>({});

  const vaults = useLiveQuery(
    () => db.vaults.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  useEffect(() => {
    const countMembers = async () => {
      if (!vaults || vaults.length === 0) return;
      const counts: Record<number, number> = {};
      for (const vault of vaults) {
        if (vault.id) {
          const count = await db.vaultMembers.where('vault_id').equals(vault.id).count();
          counts[vault.id] = count;
        }
      }
      setMemberCounts(counts);
    };
    countMembers();
  }, [vaults]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Meus Cofres
              </h1>
              <p className="text-sm text-ink-muted">
                Compartilhe documentos com sua família
              </p>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/vaults/novo");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ice text-void active:scale-[0.98] transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {!vaults || vaults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                <Lock size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum cofre criado</h3>
              <p className="text-sm text-ink-muted mt-1 max-w-xs">
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
            </div>
          ) : (
            vaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                memberCount={memberCounts[vault.id!] || 0}
              />
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}