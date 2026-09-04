// hooks/useNotificationPreference.ts
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  isNotificationPreferenceEnabled,
  setNotificationPreferenceEnabled,
} from "@/lib/notifications";

export function useNotificationPreference() {
  const [
    isEnabled,
    setIsEnabled,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    setIsEnabled(
      isNotificationPreferenceEnabled()
    );

    setIsLoading(false);
  }, []);

  const updatePreference =
    useCallback(
      (
        enabled: boolean
      ) => {
        setNotificationPreferenceEnabled(
          enabled
        );

        setIsEnabled(
          enabled
        );
      },
      []
    );

  const toggle =
    useCallback(
      () => {
        updatePreference(
          !isEnabled
        );
      },
      [
        isEnabled,
        updatePreference,
      ]
    );

  const enable =
    useCallback(
      () => {
        updatePreference(
          true
        );
      },
      [
        updatePreference,
      ]
    );

  const disable =
    useCallback(
      () => {
        updatePreference(
          false
        );
      },
      [
        updatePreference,
      ]
    );

  return {
    isEnabled,
    isLoading,
    toggle,
    enable,
    disable,
  };
}
