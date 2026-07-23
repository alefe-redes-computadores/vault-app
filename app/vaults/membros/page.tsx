"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  X,
  Loader2,
  Check,
  Users,
  Shield,
  Edit,
  Eye,
  Mail,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddVaultMember, safeUpdateVaultMember } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { motion } from "framer-motion";

export default function VaultMembersPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = searchParams.get("cofre_id") || "";
  const { user } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit" | "admin">("view");
  const [isAdding, setIsAdding] = useState(false);

  const vault = useLiveQuery(() => db.vaults.get(vaultId), [vaultId], null);
  const members = useLiveQuery(
    () => db.vaultMembers.where("vault_id").equals(vaultId).toArray(),
    [vaultId],
    []
  );

  if (!vault) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Cofre não encontrado</p>
            <Button
              variant="primary"
              onClick={() => router.push("/vaults")}
              className="mt-4"
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const handleAddMember = async () => {
    if (!email.trim() || !user) {
      trigger("error");
      showToast("Digite um e-mail válido", "error");
      return;
    }

    setIsAdding(true);
    try {
      await safeAddVaultMember({
        vault_id: vaultId,
        user_id: email,
        email: email.trim(),
        name: email.split("@")[0],
        permission,
        invited_by: user.id,
        status: "pending",
      });
      trigger("success");
      showToast("Membro convidado com sucesso!", "success");
      setEmail("");
    } catch (error) {
      console.error(error);
      trigger("error");
      showToast("Erro ao adicionar membro", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateStatus = async (
    memberId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      await safeUpdateVaultMember(memberId, { status });
      trigger("vibrate");
      showToast(
        status === "accepted" ? "Membro aceito!" : "Convite rejeitado",
        "info"
      );
    } catch (error) {
      console.error(error);
      trigger("error");
    }
  };

  const permissionLabels = {
    view: { label: "Visualizar", icon: Eye },
    edit: { label: "Editar", icon: Edit },
    admin: { label: "Admin", icon: Shield },
  };

  const permissionTone = {
    view: "bg-surface-raised text-ink-muted",
    edit: "bg-ice/10 text-ice",
    admin: "bg-violet-500/15 text-violet-300",
  };

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
              <h1 className="max-w-[220px] truncate font-display text-xl font-semibold text-ink-primary">
                Membros
              </h1>
              <p className="truncate text-sm text-ink-muted">{vault.name}</p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-ink-primary">
                  Convidar membro
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Envie acesso com a permissão correta para visualizar, editar ou administrar este cofre.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail do convidado"
                  placeholder="nome@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Permissão
                </label>
                <select
                  value={permission}
                  onChange={(e) =>
                    setPermission(e.target.value as "view" | "edit" | "admin")
                  }
                  className="h-12 w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                >
                  <option value="view">Visualizar</option>
                  <option value="edit">Editar</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleAddMember}
                disabled={isAdding}
                className="flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Convidando...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Convidar membro
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.04 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink-primary">
                <Users size={16} className="text-ink-muted" />
                Membros
              </h3>
              <span className="text-xs text-ink-muted">
                {members?.length || 0} total
              </span>
            </div>

            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member, index) => {
                  const perm =
                    permissionLabels[
                      member.permission as keyof typeof permissionLabels
                    ] || permissionLabels.view;
                  const PermIcon = perm.icon;

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                      className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-semibold text-ink-muted">
                            {member.name?.charAt(0).toUpperCase() || "?"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {member.name || member.email}
                            </p>
                            <p className="truncate text-xs text-ink-muted">
                              {member.email}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  permissionTone[
                                    member.permission as keyof typeof permissionTone
                                  ] || permissionTone.view
                                }`}
                              >
                                <PermIcon size={10} />
                                {perm.label}
                              </span>

                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  member.status === "accepted"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : member.status === "pending"
                                    ? "bg-ice/10 text-ice"
                                    : "bg-coral/15 text-coral"
                                }`}
                              >
                                {member.status === "accepted"
                                  ? "Aceito"
                                  : member.status === "pending"
                                  ? "Pendente"
                                  : "Rejeitado"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {member.status === "pending" && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => handleUpdateStatus(member.id!, "accepted")}
                              aria-label="Aceitar convite"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-300 transition-colors active:scale-95 hover:bg-surface-raised"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(member.id!, "rejected")}
                              aria-label="Rejeitar convite"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-coral transition-colors active:scale-95 hover:bg-surface-raised"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
                  <Users size={20} />
                </div>
                <p className="text-sm font-medium text-ink-primary">
                  Nenhum membro neste cofre
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Convide pessoas para compartilhar documentos com segurança.
                </p>
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}