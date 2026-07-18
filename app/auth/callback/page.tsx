"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // O Supabase lê o código da URL automaticamente e cria a sessão
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        router.replace("/");
      } else {
        // Se ainda estiver validando, aguarda o evento de sucesso
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' || session) {
            router.replace("/");
          }
        });
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{ background: '#0A0C0F', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'sans-serif' }}>Autenticando e voltando para o Vault...</p>
    </div>
  );
}
