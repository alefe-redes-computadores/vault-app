import { useEffect, useState } from 'react';
import { BiometricAuth } from '@capacitor-community/biometric-auth';
import { Platform } from '@capacitor/core';

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

  // Verifica disponibilidade ao montar
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Só funciona em dispositivos móveis com Capacitor
        if (Platform.isNative) {
          const { available, types } = await BiometricAuth.checkAvailability();
          setIsAvailable(available);
          if (types && types.length > 0) {
            const type = types[0];
            if (type === 'fingerprint') setBiometricType('fingerprint');
            else if (type === 'face') setBiometricType('face');
            else if (type === 'iris') setBiometricType('iris');
          }
        } else {
          // Em ambiente web, simula disponibilidade para teste
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
      const result = await BiometricAuth.authenticate({
        title,
        subtitle,
        description,
        fallbackTitle,
        disableBackup: true,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setIsAuthenticated(true);
      onSuccess?.();
      return true;
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