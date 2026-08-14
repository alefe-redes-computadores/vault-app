"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "vault_notifications_enabled";

export function useNotificationPreference() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setIsEnabled(stored === "true");
    setIsLoading(false);
  }, []);

  const toggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  const enable = () => {
    setIsEnabled(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const disable = () => {
    setIsEnabled(false);
    localStorage.setItem(STORAGE_KEY, "false");
  };

  return { isEnabled, isLoading, toggle, enable, disable };
}
