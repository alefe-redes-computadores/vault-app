"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileText, Clock } from "lucide-react";

export default function DetalhesLocalPage() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [local, setLocal] = useState<any>(null);
  const [renovacoes, setRenovacoes] = useState<any[]>([]);

  useEffect(() => {
    db.table("locais").get(id).then(setLocal);
    db.renovacoes.where({ local_id: id }).toArray().then(setRenovacoes);
  }, [id]);

  if (!local) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void p-5">
        <button onClick={() => router.back()} className="mb-4"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">{local.nome}</h1>
        <p className="text-ink-muted mb-6">{local.endereco}</p>

        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-ink-muted">Histórico de Renovação</h2>
          {renovacoes.map(r => (
            <div key={r.id} className="p-4 bg-surface rounded-2xl flex justify-between">
              <div>
                <p className="font-semibold">{r.data}</p>
                <p className="text-sm text-emerald-400">R$ {r.preco?.toFixed(2)}</p>
              </div>
              <FileText size={20} className="text-ice" />
            </div>
          ))}
        </div>
      </main>
    </PageTransition>
  );
}
