"use client";

import { useState, useEffect } from "react";

// Evento customizado para sincronizar o estado de privacidade entre componentes na mesma aba
const PRIVACY_EVENT = "vault:privacy-change";

export function usePrivacyMode() {
  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("vault_privacy_mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "vault_privacy_mode") {
        setIsPrivate(e.newValue === "true");
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === "boolean") {
        setIsPrivate(customEvent.detail);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(PRIVACY_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(PRIVACY_EVENT, handleCustomEvent);
    };
  }, []);

  const togglePrivacy = () => {
    const newState = !isPrivate;
    setIsPrivate(newState);
    
    if (typeof window !== "undefined") {
      localStorage.setItem("vault_privacy_mode", String(newState));
      window.dispatchEvent(new CustomEvent(PRIVACY_EVENT, { detail: newState }));
    }
  };

  return {
    isPrivate,
    togglePrivacy,
  };
}
