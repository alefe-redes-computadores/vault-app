import { useEffect, useState } from 'react';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

interface UseBiometricOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  title?: string;
  subtitle?: string;
  description?: string;
  fallbackTitle?: string;
}

export function useBiometric(options: UseBiometricOptions = {}) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'iris' | 'none'>('none');

  const {
    onSuccess,
    onError,
    title = 'Desbloqueie o Vault',
    subtitle = 'Use sua impressão digital ou Face ID para acessar',
    description = 'Mantenha seus documentos seguros',
    fallbackTitle = 'Usar senha',
  } = options;

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { isAvailable, biometricType } = await NativeBiometric.isAvailable();
          setIsAvailable(isAvailable);
          if (biometricType === 'fingerprint') setBiometricType('fingerprint');
          else if (biometricType === 'face') setBiometricType('face');
          else if (biometricType === 'iris') setBiometricType('iris');
        } else {
          setIsAvailable(true);
          setBiometricType('fingerprint');
        }
      } catch (error) {
        console.error('Erro ao verificar biometria:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, []);

  const authenticate = async () => {
    if (!isAvailable) {
      const error = new Error('Biometria não disponível neste dispositivo');
      onError?.(error);
      return false;
    }

    try {
      setIsLoading(true);
      const result = await NativeBiometric.verifyIdentity({
        title,
        subtitle,
        description,
        fallbackTitle,
        disableBackup: true,
      });

      if (result?.verified) {
        setIsAuthenticated(true);
        onSuccess?.();
        return true;
      } else {
        console.log('Autenticação biométrica não foi concluída');
        return false;
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      onError?.(error as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsAuthenticated(false);
  };

  return {
    isAvailable,
    isAuthenticated,
    isLoading,
    biometricType,
    authenticate,
    reset,
  };
}