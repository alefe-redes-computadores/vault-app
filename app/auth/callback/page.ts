"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Obtém o token da URL (fragmento)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // Define a sessão manualmente
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          // Limpa a URL e redireciona para a home
          window.location.hash = "";
          router.push("/");
        } else {
          console.error("Erro ao definir sessão:", error);
          router.push("/login");
        }
      } else {
        // Se não houver token, redireciona para login
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-ink-muted mt-4">Autenticando...</p>
      </div>
    </div>
  );
}