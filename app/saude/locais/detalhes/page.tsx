"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, FileText } from "lucide-react";

export default function DetalhesLocalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [local, setLocal] = useState<any>(null);
  const [renovacoes, setRenovacoes] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    db.table("locais").get(id).then((res) => {
      if (res) setLocal(res);
    });

    db.renovacoes.where("local_id" as any).equals(id).toArray().then(setRenovacoes);
  }, [id]);

  if (!local) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void p-5">
        <button onClick={() => router.back()} className="mb-4 text-ink-primary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ink-primary">{local.nome}</h1>
        <p className="text-ink-muted mb-6">{local.endereco || "Endereço não informado"}</p>

        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-ink-muted">Histórico de Renovação</h2>
          {renovacoes.length === 0 ? (
            <p className="text-xs text-ink-faint">Nenhuma renovação registrada para este local.</p>
          ) : (
            renovacoes.map((r) => (
              <div key={r.id} className="p-4 bg-surface rounded-2xl flex justify-between items-center border border-surface-border/50">
                <div>
                  <p className="font-semibold text-ink-primary">{r.data}</p>
                  <p className="text-sm text-emerald-400 font-mono">
                    {r.preco ? `R$ ${r.preco.toFixed(2).replace(".", ",")}` : "Sem valor registrado"}
                  </p>
                </div>
                <FileText size={20} className="text-ice" />
              </div>
            ))
          )}
        </div>
      </main>
    </PageTransition>
  );
}
