// app/vaults/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useVaults } from "@/hooks/useVaults";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { VaultCard } from "@/components/VaultCard";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { db } from "@/lib/db";
import { ListPageHeader } from "@/components/list";

export default function VaultsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { vaults } = useVaults();
  const { activePersonId } = useActivePersonId();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const filteredVaults = useMemo(() => {
    if (!vaults) return [];
    return vaults.filter((v: any) => !activePersonId || !v.person_id || v.person_id === activePersonId);
  }, [vaults, activePersonId]);

  useEffect(() => {
    const countMembers = async () => {
      if (!filteredVaults || filteredVaults.length === 0) return;
      const counts: Record<string, number> = {};
      for (const vault of filteredVaults) {
        if (vault.id) {
          const count = await db.vaultMembers.where("vault_id").equals(vault.id).count();
          counts[vault.id] = count;
        }
      }
      setMemberCounts(counts);
    };
    countMembers();
  }, [filteredVaults]);

  if (vaults === undefined) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Meus cofres"
          subtitle="Compartilhe documentos com família, médicos e cuidadores"
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={<Lock size={14} />}
          iconColor="text-ice"
        />

        <section className="space-y-4 px-5 pt-6">
          {!filteredVaults || filteredVaults.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="Nenhum cofre criado"
              description="Crie um cofre para compartilhar documentos com sua família, médicos ou cuidadores."
              actionLabel="Criar cofre"
              onAction={() => {
                trigger("vibrate");
                router.push("/vaults/novo");
              }}
            />
          ) : (
            filteredVaults.map((vault, index) => (
              <div
                key={vault.id}
                className="transition-opacity"
                style={{
                  animationDelay: `${Math.min(index * 0.05, 0.24)}s`,
                }}
              >
                <VaultCard vault={vault} memberCount={memberCounts[vault.id!] || 0} />
              </div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}