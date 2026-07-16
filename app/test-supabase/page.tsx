"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Carregando...");
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    async function testConnection() {
      if (!isSupabaseConfigured) {
        setStatus("❌ Supabase não configurado. Verifique .env.local");
        return;
      }

      try {
        // Testa a conexão buscando os perfis
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(5);

        if (error) throw error;

        setProfiles(data || []);
        setStatus(`✅ Conectado! ${data?.length || 0} perfis encontrados`);
      } catch (error) {
        console.error("Erro:", error);
        setStatus(`❌ Erro: ${error instanceof Error ? error.message : "Desconhecido"}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="bg-surface p-6 rounded-card border border-surface-border max-w-md w-full">
        <h1 className="font-display text-xl text-ink-primary text-center">🧪 Teste Supabase</h1>
        
        <div className="mt-4 p-3 rounded-xl bg-surface-raised border border-surface-border">
          <p className="text-sm text-ink-muted text-center">{status}</p>
        </div>

        {profiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-ink-muted font-mono">Perfis encontrados:</p>
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-raised border border-surface-border">
                <span>{profile.icon}</span>
                <span className="text-sm text-ink-primary">{profile.name}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.location.href = "/"}
          className="mt-4 w-full py-2 rounded-full bg-ice text-void font-medium active:scale-[0.98] transition-all"
        >
          Voltar para o app
        </button>
      </div>
    </div>
  );
}
