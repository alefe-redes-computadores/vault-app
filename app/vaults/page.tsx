// app/vaults/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
} from "lucide-react";

import { useVaults } from "@/hooks/useVaults";
import { useHapticFeedback } from "@/lib/haptics";
import { VaultCard } from "@/components/VaultCard";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ListPageHeader } from "@/components/list";

// ============================================================
// PAGE
// ============================================================

export default function VaultsPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const {
    vaults,
    pendingInvites,
    activePersonId,
    getMemberCount,
  } = useVaults();

  const [memberCounts, setMemberCounts] =
    useState<Record<string, number>>({});

  const [isCountingMembers, setIsCountingMembers] =
    useState(false);

  // ==========================================================
  // CONTAGEM DE MEMBROS
  // ==========================================================

  /**
   * `vaults` já chega filtrado pelo domínio:
   *
   * - cofres próprios:
   *   user_id atual + person_id da pessoa ativa;
   *
   * - cofres compartilhados:
   *   membership aceita + user_id atual +
   *   person_id da pessoa ativa.
   *
   * Portanto NÃO aplicamos novamente filtros permissivos
   * nesta página e registros legados sem person_id não
   * "vazam" para a pessoa ativa.
   */
  useEffect(() => {
    let cancelled = false;

    const loadMemberCounts = async () => {
      const vaultIds = vaults
        .map((vault) => vault.id)
        .filter(
          (id): id is string =>
            Boolean(id)
        );

      if (vaultIds.length === 0) {
        if (!cancelled) {
          setMemberCounts({});
          setIsCountingMembers(false);
        }

        return;
      }

      setIsCountingMembers(true);

      try {
        const entries =
          await Promise.all(
            vaultIds.map(
              async (vaultId) => {
                try {
                  const count =
                    await getMemberCount(
                      vaultId
                    );

                  return [
                    vaultId,
                    count,
                  ] as const;
                } catch (error) {
                  console.error(
                    `Erro ao contar membros do cofre ${vaultId}:`,
                    error
                  );

                  /**
                   * Não derrubamos a listagem inteira
                   * se apenas uma contagem falhar.
                   */
                  return [
                    vaultId,
                    1,
                  ] as const;
                }
              }
            )
          );

        if (!cancelled) {
          setMemberCounts(
            Object.fromEntries(entries)
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar contagem de membros dos cofres:",
          error
        );

        if (!cancelled) {
          setMemberCounts({});
        }
      } finally {
        if (!cancelled) {
          setIsCountingMembers(false);
        }
      }
    };

    void loadMemberCounts();

    return () => {
      cancelled = true;
    };
  }, [
    vaults,
    getMemberCount,
  ]);

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const handleCreateVault = () => {
    trigger("vibrate");
    router.push("/vaults/novo");
  };

  const handleOpenInvites = () => {
    trigger("vibrate");
    router.push(
      "/vaults/convites"
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  /**
   * No hook novo o default do useLiveQuery é [],
   * então `vaults` não chega mais como undefined.
   *
   * A pessoa ativa, porém, ainda pode estar sendo resolvida.
   * Evitamos mostrar um EmptyState enganoso nesse intervalo.
   */
  if (!activePersonId) {
    return <CardListSkeleton />;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Meus cofres"
          subtitle="Compartilhe documentos com família, médicos e cuidadores"
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={
            <Lock size={14} />
          }
          iconColor="text-ice"
        />

        <section className="space-y-4 px-5 pt-6">
          {/* =============================================== */}
          {/* CONVITES PENDENTES */}
          {/* =============================================== */}

          {pendingInvites.length > 0 && (
            <button
              type="button"
              onClick={
                handleOpenInvites
              }
              className="flex w-full items-center gap-3 rounded-[22px] border border-ice/20 bg-ice/10 p-4 text-left transition-colors hover:bg-ice/15"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                <Mail
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-primary">
                  {pendingInvites.length ===
                  1
                    ? "Você tem 1 convite pendente"
                    : `Você tem ${pendingInvites.length} convites pendentes`}
                </p>

                <p className="mt-0.5 text-xs text-ink-muted">
                  Revise os cofres compartilhados com você.
                </p>
              </div>

              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-ice px-1.5 text-[11px] font-bold text-void">
                {
                  pendingInvites.length
                }
              </span>
            </button>
          )}

          {/* =============================================== */}
          {/* LISTA */}
          {/* =============================================== */}

          {vaults.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="Nenhum cofre criado"
              description="Crie um cofre para organizar e compartilhar documentos com sua família, médicos ou cuidadores."
              actionLabel="Criar cofre"
              onAction={
                handleCreateVault
              }
            />
          ) : (
            vaults.map(
              (vault, index) => {
                const memberCount =
                  vault.id
                    ? memberCounts[
                        vault.id
                      ]
                    : undefined;

                return (
                  <div
                    key={
                      vault.id ??
                      `${vault.name}-${index}`
                    }
                    className="transition-opacity"
                    style={{
                      animationDelay: `${Math.min(
                        index * 0.05,
                        0.24
                      )}s`,
                    }}
                  >
                    <VaultCard
                      vault={vault}
                      memberCount={
                        memberCount ??
                        (isCountingMembers
                          ? 1
                          : 1)
                      }
                    />
                  </div>
                );
              }
            )
          )}
        </section>

        {/* =============================================== */}
        {/* FAB */}
        {/* =============================================== */}

        {vaults.length > 0 && (
          <button
            type="button"
            onClick={
              handleCreateVault
            }
            className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-xl transition-transform active:scale-95"
            aria-label="Criar novo cofre"
          >
            <Lock
              size={22}
              aria-hidden="true"
            />
          </button>
        )}
      </main>
    </PageTransition>
  );
}