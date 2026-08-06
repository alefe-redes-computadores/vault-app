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
    // Cria a camada de ofuscação (Blur) diretamente no DOM para ser imediato
    const overlay = document.createElement("div");
    overlay.id = "vault-secure-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(9, 9, 11, 0.95)"; // Cor Void com opacidade
    overlay.style.backdropFilter = "blur(24px)";
    
    // ✅ Correção TypeScript para evitar erro de propriedade no Webkit
    (overlay.style as any).WebkitBackdropFilter = "blur(24px)";
    
    overlay.style.zIndex = "999999";
    overlay.style.display = "none";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.gap = "16px";
    overlay.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2FE3C9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span style="color: #F8FAFC; font-family: sans-serif; font-weight: 500;">Vault Protegido</span>
    `;
    document.body.appendChild(overlay);

    // Escuta mudanças de estado do aplicativo (Background / Foreground)
    const listener = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) {
        // App minimizado: Exibe o overlay imediatamente
        overlay.style.display = "flex";
        setIsLocked(true);
      } else {
        // App voltou: Mantém o overlay até passar pela biometria
        overlay.style.display = "flex";
        setIsLocked(true);
        
        const success = await authenticate();
        if (success) {
          overlay.style.display = "none";
          setIsLocked(false);
        } else {
          overlay.style.display = "none";
          router.replace("/mais");
        }
      }
    });

    return () => {
      listener.then((l) => l.remove());
      const existingOverlay = document.getElementById("vault-secure-overlay");
      if (existingOverlay) existingOverlay.remove();
    };
  }, [authenticate, router]);

  return { isLocked };
}
