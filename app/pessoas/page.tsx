"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Trash2, Loader2 } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/hooks/useAuth";

export default function PessoasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const persons = usePersons();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const deletePerson = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja remover "${name}"?\nTodos os documentos desta pessoa também serão removidos.`)) {
      return;
    }

    setIsDeleting(id);
    try {
      await db.transaction('rw', db.persons, db.documents, async () => {
        // Remove todos os documentos da pessoa
        await db.documents.where('person_id').equals(id).delete();
        // Remove a pessoa
        await db.persons.delete(id);
      });
      trigger("success");
      showToast(`"${name}" removido com sucesso!`, "success");
    } catch (error) {
      console.error("Erro ao remover pessoa:", error);
      trigger("error");
      showToast("Erro ao remover pessoa", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Pessoas
              </h1>
              <p className="text-sm text-ink-muted">
                {persons.length} pessoa{persons.length !== 1 ? "s" : ""} cadastrada{persons.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/pessoas/novo");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ice text-void active:scale-[0.98] transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {persons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border">
                <User size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhuma pessoa</h3>
              <p className="text-sm text-ink-muted mt-1 max-w-xs">
                Cadastre pessoas para começar a organizar seus documentos.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/pessoas/novo");
                }}
                className="mt-6"
              >
                Adicionar pessoa
              </Button>
            </div>
          ) : (
            persons.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-4 rounded-card border border-surface-border bg-surface shadow-vault"
              >
                <div className="flex items-center gap-3">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="w-12 h-12 rounded-full border-2 border-ice/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-steel-dark/40 flex items-center justify-center text-ink-muted text-lg">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-display text-[15px] font-medium text-ink-primary">
                      {person.name}
                    </h3>
                    {person.email && (
                      <p className="text-xs text-ink-muted">{person.email}</p>
                    )}
                    {person.phone && (
                      <p className="text-xs text-ink-muted">{person.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deletePerson(person.id!, person.name)}
                  disabled={isDeleting === person.id}
                  className="p-2 rounded-full hover:bg-surface-border transition-colors disabled:opacity-50"
                  title="Remover pessoa"
                >
                  {isDeleting === person.id ? (
                    <Loader2 size={16} className="animate-spin text-coral" />
                  ) : (
                    <Trash2 size={16} className="text-ink-muted hover:text-coral transition-colors" />
                  )}
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}