"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { useBiometric } from "@/hooks/useBiometric";

export function useSecureScreen() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);

  const { authenticate } = useBiometric({
    title: "Vault Bloqueado",
    subtitle: "Por segurança, autentique-se ao retornar ao aplicativo.",
  });

  useEffect(() => {
    // Escuta mudanças de estado do aplicativo (Background / Foreground)
    const listener = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) {
        // O app foi minimizado (Background)
        setIsLocked(true);
      } else {
        // O app voltou para a tela (Foreground)
        setIsLocked(true); // Garante que a interface seja escondida antes de ler a biometria
        
        const success = await authenticate();
        if (success) {
          setIsLocked(false);
        } else {
          // Se falhar ou cancelar, chuta o usuário pra fora da área de senhas
          router.replace("/mais");
        }
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [authenticate, router]);

  return { isLocked };
}
