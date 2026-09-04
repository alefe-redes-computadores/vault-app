// hooks/useNotifications.ts
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import {
  checkNotificationPermissions,
  requestNotificationPermissions,
} from "@/lib/notifications";

export function useNotifications() {
  const [
    permissionGranted,
    setPermissionGranted,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const checkPermissions =
    useCallback(
      async () => {
        setIsLoading(true);

        try {
          const granted =
            await checkNotificationPermissions();

          setPermissionGranted(
            granted
          );

          return granted;
        } finally {
          setIsLoading(false);
        }
      },
      []
    );

  const requestPermissions =
    useCallback(
      async () => {
        setIsLoading(true);

        try {
          const granted =
            await requestNotificationPermissions();

          setPermissionGranted(
            granted
          );

          return granted;
        } finally {
          setIsLoading(false);
        }
      },
      []
    );

  const handleNotificationAction =
    useCallback(
      (
        callback: (
          data: unknown
        ) => void
      ) => {
        if (
          !Capacitor.isNativePlatform()
        ) {
          return () => {};
        }

        let disposed =
          false;

        const listenerPromise =
          LocalNotifications.addListener(
            "localNotificationActionPerformed",
            (
              event
            ) => {
              if (
                disposed
              ) {
                return;
              }

              const data =
                event.notification
                  ?.extra;

              if (
                !data
              ) {
                return;
              }

              const record =
                data &&
                typeof data ===
                  "object"
                  ? {
                      ...(
                        data as Record<
                          string,
                          unknown
                        >
                      ),
                    }
                  : {};

              callback({
                ...record,

                actionId:
                  event.actionId,
              });
            }
          );

        return () => {
          disposed =
            true;

          void listenerPromise
            .then(
              (
                listener
              ) =>
                listener.remove()
            )
            .catch(
              (
                error
              ) => {
                console.error(
                  "[useNotifications] Erro ao remover listener:",
                  error
                );
              }
            );
        };
      },
      []
    );

  useEffect(
    () => {
      void checkPermissions();
    },
    [
      checkPermissions,
    ]
  );

  return {
    permissionGranted,
    isLoading,
    checkPermissions,
    requestPermissions,
    handleNotificationAction,
  };
}