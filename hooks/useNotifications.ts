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
        try {
          if (
            !Capacitor.isNativePlatform()
          ) {
            setPermissionGranted(
              false
            );

            return false;
          }

          const result =
            await LocalNotifications.checkPermissions();

          const granted =
            result.display ===
            "granted";

          setPermissionGranted(
            granted
          );

          return granted;
        } catch (error) {
          console.error(
            "[useNotifications] Erro ao verificar permissões:",
            error
          );

          setPermissionGranted(
            false
          );

          return false;
        } finally {
          setIsLoading(
            false
          );
        }
      },
      []
    );

  const requestPermissions =
    useCallback(
      async () => {
        try {
          if (
            !Capacitor.isNativePlatform()
          ) {
            setPermissionGranted(
              false
            );

            return false;
          }

          const current =
            await LocalNotifications.checkPermissions();

          if (
            current.display ===
            "granted"
          ) {
            setPermissionGranted(
              true
            );

            return true;
          }

          const result =
            await LocalNotifications.requestPermissions();

          const granted =
            result.display ===
            "granted";

          setPermissionGranted(
            granted
          );

          return granted;
        } catch (error) {
          console.error(
            "[useNotifications] Erro ao solicitar permissões:",
            error
          );

          setPermissionGranted(
            false
          );

          return false;
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

              callback(
                data
              );
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