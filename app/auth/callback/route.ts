"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleAuth = async () => {
      // O Supabase no modo client pega o hash da URL automaticamente
      const { error } = await supabase.auth.getSession();
      
      if (!error) {
        // Fecha o pop-up
        window.opener?.postMessage("auth-success", "*");
        window.close();
      }
    };

    handleAuth();
  }, []);

  return (
    <div style={{ background: '#0A0C0F', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Autenticando...</p>
    </div>
  );
}
