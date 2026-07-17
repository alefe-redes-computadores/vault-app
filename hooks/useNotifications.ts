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
    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (notification) => {
        console.log('Ação na notificação:', notification);
        callback(notification.notification.extra);
      }
    );

    return () => {
      listener.remove();
    };
  };

  return {
    permissionsGranted,
    handleNotificationAction,
  };
}