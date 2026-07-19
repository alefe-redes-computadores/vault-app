"use client";

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vault_biometric_enabled';

export function useBiometricPreference() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carrega a preferência do localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    // Por padrão, desabilitado (false)
    setIsEnabled(stored === 'true');
    setIsLoading(false);
  }, []);

  const toggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  const enable = () => {
    setIsEnabled(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const disable = () => {
    setIsEnabled(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  };

  return { isEnabled, isLoading, toggle, enable, disable };
}