"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const handleAuth = async () => {
      const redirecionar = () => setTimeout(() => router.replace("/"), 800);

      // 1) Já existe sessão? (caso comum no Web, onde o Supabase
      //    já processou a URL sozinho via detectSessionInUrl)
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        redirecionar();
        return;
      }

      // 2) Existe um ?code= na própria URL desta página?
      //    (cobre cold start no Android, quando o app abre direto
      //    aqui via deep link antes do ClientWrapper processar)
      const code = searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Erro no exchangeCodeForSession (callback page):", error.message);
          setErrorMsg(error.message);
          return;
        }
        if (data?.session) {
          redirecionar();
          return;
        }
      }

      // 3) Senão, espera o evento (ex: se o ClientWrapper ainda está
      //    processando o exchange em paralelo)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_IN" && session) redirecionar();
        }
      );
      unsub = () => authListener.subscription.unsubscribe();
    };

    handleAuth();

    return () => unsub?.();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        {errorMsg ? (
          <>
            <p className="text-red-400 mb-2">Falha ao conectar.</p>
            <p className="text-ink-muted text-sm">{errorMsg}</p>
          </>
        ) : (
          <p className="text-ink-muted">Conectando...</p>
        )}
      </div>
    </div>
  );
}
