"use client";

import { useEffect, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { requestNotificationPermissions } from '@/lib/notifications';

export function useNotifications() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const granted = await requestNotificationPermissions();
      setPermissionsGranted(granted);
    };
    init();
  }, []);

  const handleNotificationAction = (callback: (data: any) => void) => {
    const listenerPromise = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action) => {
        console.log('Ação na notificação:', action);
        callback(action.notification.extra);
      }
    );

    // O Capacitor v6+ retorna uma Promise, então precisamos aguardar o ouvinte (handle)
    // ser criado antes de mandar removê-lo.
    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  };

  return {
    permissionsGranted,
    handleNotificationAction,
  };
}
