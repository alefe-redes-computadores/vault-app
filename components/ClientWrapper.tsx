"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase/client";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const setupListener = async () => {
      await App.addListener("appUrlOpen", async (data: any) => {
        if (!data?.url || !data.url.includes("callback")) return;

        // Fecha a Custom Tab imediatamente
        await Browser.close().catch(() => {});

        try {
          const urlObj = new URL(data.url);

          // --- Fluxo PKCE (?code=...) ---
          const code = urlObj.searchParams.get("code");

          if (code) {
            const { data: sessionData, error } =
              await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              console.error("Erro no exchangeCodeForSession:", error.message);
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
              return;
            }

            if (sessionData?.session) {
              router.replace("/");
              return;
            }
          }

          // --- Fallback: fluxo implícito (#access_token=...) ---
          // Alguns providers/configs ainda retornam via hash em vez de code.
          const hash = urlObj.hash?.startsWith("#")
            ? urlObj.hash.substring(1)
            : urlObj.hash;

          if (hash) {
            const hashParams = new URLSearchParams(hash);
            const access_token = hashParams.get("access_token");
            const refresh_token = hashParams.get("refresh_token");

            if (access_token && refresh_token) {
              const { data: sessionData, error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

              if (error) {
                console.error("Erro no setSession:", error.message);
                router.replace(`/login?error=${encodeURIComponent(error.message)}`);
                return;
              }

              if (sessionData?.session) {
                router.replace("/");
                return;
              }
            }
          }

          // Se chegou aqui, não tinha nem code nem token válido na URL
          const errorParam = urlObj.searchParams.get("error_description")
            || urlObj.searchParams.get("error");

          console.error("Callback sem code/token válido:", data.url, errorParam);
          router.replace(`/login${errorParam ? `?error=${encodeURIComponent(errorParam)}` : ""}`);
        } catch (err) {
          console.error("Erro ao processar deep link de callback:", err);
          router.replace("/login?error=callback_parse_failed");
        }
      });
    };

    setupListener();

    return () => {
      App.removeAllListeners();
    };
  }, [router]);

  return <>{children}</>;
}
