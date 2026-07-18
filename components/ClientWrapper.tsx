"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const setupListener = async () => {
      await App.addListener("appUrlOpen", async (data: any) => {
        if (data.url.includes("callback")) {
          // Fecha o navegador imediatamente
          await Browser.close().catch(() => {});

          try {
            // Pega a URL completa e extrai os códigos (?code=... ou #...)
            const urlObj = new URL(data.url);
            const params = urlObj.search + urlObj.hash;

            // Manda o Next.js para a página de callback com os dados
            if (params) {
              router.push(`/auth/callback${params}`);
            }
          } catch (err) {
            console.error("Erro ao processar URL:", err);
          }
        }
      });
    };

    setupListener();
  }, [router]);

  return <>{children}</>;
}
