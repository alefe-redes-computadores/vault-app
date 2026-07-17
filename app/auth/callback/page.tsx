"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleAuth = async () => {
      // Confirma que o Supabase pegou o hash e validou a sessão no banco
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        // Envia o sinal "estou logado" para o ClientWrapper (PWA)
        window.opener?.postMessage("auth-success", "*");
        // Fecha o popup do Custom Tab do Chrome
        window.close();
      }
    };

    handleAuth();
  }, []);

  return (
    <div style={{ background: '#0A0C0F', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'sans-serif' }}>Autenticando e voltando para o Vault...</p>
    </div>
  );
}
