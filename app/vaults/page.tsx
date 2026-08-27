// app/vaults/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
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
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const { vaults } = useVaults();
  const { activePersonId } = useActivePersonId();

  const [memberCounts, setMemberCounts] = useState<Record<string, number>>(
    {}
  );

  /**
   * Mantém apenas os cofres:
   * - sem pessoa vinculada; ou
   * - vinculados à pessoa atualmente ativa.
   *
   * Isso mantém o comportamento global do Vault baseado
   * no perfil/pessoa ativa.
   */
  const filteredVaults = useMemo(() => {
    if (!vaults) return [];

    return vaults.filter(
      (vault) =>
        !activePersonId ||
        !vault.person_id ||
        vault.person_id === activePersonId
    );
  }, [vaults, activePersonId]);

  /**
   * Busca a quantidade de membros de cada cofre.
   *
   * A consulta é executada novamente somente quando
   * a lista efetivamente filtrada muda.
   */
  useEffect(() => {
    let cancelled = false;

    const countMembers = async () => {
      if (filteredVaults.length === 0) {
        if (!cancelled) {
          setMemberCounts({});
        }
        return;
      }

      try {
        const entries = await Promise.all(
          filteredVaults
            .filter((vault) => Boolean(vault.id))
            .map(async (vault) => {
              const count = await db.vaultMembers
                .where("vault_id")
                .equals(vault.id!)
                .count();

              return [vault.id!, count] as const;
            })
        );

        if (!cancelled) {
          setMemberCounts(Object.fromEntries(entries));
        }
      } catch (error) {
        console.error("Erro ao contar membros dos cofres:", error);

        if (!cancelled) {
          setMemberCounts({});
        }
      }
    };

    void countMembers();

    return () => {
      cancelled = true;
    };
  }, [filteredVaults]);

  if (vaults === undefined) {
    return <CardListSkeleton />;
  }

  const handleCreateVault = () => {
    trigger("vibrate");
    router.push("/vaults/novo");
  };

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
          {filteredVaults.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="Nenhum cofre criado"
              description="Crie um cofre para compartilhar documentos com sua família, médicos ou cuidadores."
              actionLabel="Criar cofre"
              onAction={handleCreateVault}
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
                <VaultCard
                  vault={vault}
                  memberCount={vault.id ? memberCounts[vault.id] ?? 0 : 0}
                />
              </div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}