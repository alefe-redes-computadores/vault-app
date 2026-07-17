"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase/client";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // 1. ESCUTA O RETORNO DO ANDROID (Deep Link)
    const setupListener = async () => {
      await App.addListener("appUrlOpen", async (data: any) => {
        // Se a URL for o nosso callback interno
        if (data.url.includes("callback")) {
          // Fecha o navegador imediatamente
          await Browser.close();

          // Extrai o token da URL que o Android devolveu
          const hash = data.url.split("#")[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");

            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
              router.replace("/");
            }
          }
        }
      });
    };

    setupListener();
  }, [router]);

  return <>{children}</>;
}
