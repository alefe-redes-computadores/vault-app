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
          const result = await NativeBiometric.isAvailable();
          setIsAvailable(result.isAvailable);
          
          // @ts-ignore: O pacote novo usa biometryType (com Y) e pode ter retornos diferentes
          const type = result.biometryType;
          
          const typeStr = String(type).toLowerCase();
          if (typeStr.includes('fingerprint') || typeStr.includes('touch')) {
            setBiometricType('fingerprint');
          } else if (typeStr.includes('face')) {
            setBiometricType('face');
          } else if (typeStr.includes('iris')) {
            setBiometricType('iris');
          }
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
        fallbackTitle
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
