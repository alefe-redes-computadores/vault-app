"use client";

import { useEffect, useState, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Função para verificar permissões
  const checkPermissions = useCallback(async () => {
    try {
      // Verifica se está em ambiente Capacitor/Cordova
      if (typeof window !== 'undefined' && 'cordova' in window) {
        const result = await LocalNotifications.checkPermissions();
        const granted = result.display === 'granted';
        setPermissionGranted(granted);
        return granted;
      }
      // Em ambiente web, retorna true (mas não faz nada)
      setPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setPermissionGranted(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para solicitar permissões
  const requestPermissions = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && 'cordova' in window) {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        setPermissionGranted(granted);
        return granted;
      }
      setPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }, []);

  // Listener para quando o usuário clica em uma notificação
  const handleNotificationAction = useCallback((callback: (data: any) => void) => {
    let listener: any;

    const setupListener = async () => {
      try {
        if (typeof window !== 'undefined' && 'cordova' in window) {
          listener = await LocalNotifications.addListener(
            'localNotificationActionPerformed',
            (notification: any) => {
              const data = notification.notification?.extra;
              if (data) {
                callback(data);
              }
            }
          );
        }
      } catch (error) {
        console.error('Erro ao configurar listener de notificações:', error);
      }
    };

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  // Verificar permissões ao montar
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissionGranted,
    isLoading,
    checkPermissions,
    requestPermissions,
    handleNotificationAction,
  };
}