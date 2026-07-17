"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase/client";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // 1. Ouvinte para o fluxo Web/PWA (fechamento de pop-up via postMessage)
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data === "auth-success") {
        router.replace("/"); // Redireciona para a Home do Vault
      }
    };
    window.addEventListener("message", handleAuthMessage);

    // 2. Ouvinte para o Deep Link (Fluxo nativo Capacitor/Android)
    const setupListener = async () => {
      await App.addListener("appUrlOpen", async (data: any) => {
        if (!isMounted) return;

        if (data.url.includes("callback") || data.url.includes("#access_token")) {
          // Fecha a Custom Tab do Chrome imediatamente
          await Browser.close();

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

    return () => {
      isMounted = false;
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [router]);

  return <>{children}</>;
}
