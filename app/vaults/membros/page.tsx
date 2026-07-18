"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Mail, X, Loader2, Check, Users, Shield, Edit, Eye } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddVaultMember, safeUpdateVaultMember } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

export default function VaultMembersPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = Number(searchParams.get("cofre_id"));
  const { user } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit" | "admin">("view");
  const [isAdding, setIsAdding] = useState(false);

  const vault = useLiveQuery(
    () => db.vaults.get(vaultId),
    [vaultId],
    null
  );

  const members = useLiveQuery(
    () => db.vaultMembers.where('vault_id').equals(vaultId).toArray(),
    [vaultId],
    []
  );

  if (!vault) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-muted">Cofre não encontrado</p>
            <Button variant="primary" onClick={() => router.push("/vaults")} className="mt-4">
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

  const handleUpdateStatus = async (memberId: number, status: "accepted" | "rejected") => {
    try {
      await safeUpdateVaultMember(memberId, { status });
      trigger("vibrate");
      showToast(status === "accepted" ? "Membro aceito!" : "Convite rejeitado", "info");
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

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                Membros - {vault.name}
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <div className="rounded-card border border-surface-border bg-surface p-4 shadow-vault">
            <h3 className="font-display text-sm font-medium text-ink-primary mb-3 flex items-center gap-2">
              <UserPlus size={16} className="text-ink-muted" />
              Convidar membro
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="E-mail do convidado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as "view" | "edit" | "admin")}
                  className="px-3 py-2 rounded-xl bg-surface-raised border border-surface-border text-ink-primary focus:outline-none focus:border-steel-light"
                >
                  <option value="view">👁️ Visualizar</option>
                  <option value="edit">✏️ Editar</option>
                  <option value="admin">🛡️ Admin</option>
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
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                Convidar
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-medium text-ink-primary mb-3 flex items-center gap-2">
              <Users size={16} className="text-ink-muted" />
              Membros ({members?.length || 0})
            </h3>
            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => {
                  const perm = permissionLabels[member.permission as keyof typeof permissionLabels] || permissionLabels.view;
                  const PermIcon = perm.icon;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-surface-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-steel-dark/40 flex items-center justify-center text-ink-muted text-sm font-medium">
                          {member.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm text-ink-primary">{member.name || member.email}</p>
                          <p className="text-xs text-ink-muted">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          member.status === "accepted" ? "bg-green-500/20 text-green-400" :
                          member.status === "pending" ? "bg-ice/20 text-ice" :
                          "bg-coral/20 text-coral"
                        }`}>
                          <PermIcon size={10} />
                          {member.status === "accepted" ? "Aceito" :
                           member.status === "pending" ? "Pendente" : "Rejeitado"}
                        </span>
                        {member.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(member.id!, "accepted")}
                              className="p-1 rounded-full hover:bg-surface-border transition-colors"
                            >
                              <Check size={14} className="text-green-400" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(member.id!, "rejected")}
                              className="p-1 rounded-full hover:bg-surface-border transition-colors"
                            >
                              <X size={14} className="text-coral" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-muted text-center py-4">
                Nenhum membro neste cofre
              </p>
            )}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}