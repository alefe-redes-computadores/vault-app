import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { signIn, signUp, signInWithGoogle, signOut } from '@/lib/supabase/auth';
import { pullAllData } from '@/lib/sync/pull';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  // Função para sincronizar dados do Supabase para o local
  const syncDataFromCloud = async (userId: string) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await pullAllData(userId);
      console.log('✅ Dados sincronizados da nuvem');
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Busca usuário inicial
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setLoading(false);
      
      // Se tiver usuário, puxa dados do Supabase
      if (data.user) {
        await syncDataFromCloud(data.user.id);
      }
    });

    // Escuta mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      setLoading(false);
      
      // Se o usuário logou, puxa dados do Supabase
      if (event === 'SIGNED_IN' && user) {
        await syncDataFromCloud(user.id);
        router.push('/');
      }
      
      // Se o usuário deslogou, joga pro Login
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password);
    return result;
  };

  const register = async (email: string, password: string) => {
    const result = await signUp(email, password);
    return result;
  };

  const loginWithGoogle = async () => {
    const result = await signInWithGoogle();
    return result;
  };

  const logout = async () => {
    await signOut();
  };

  const refresh = async () => {
    if (user) {
      await syncDataFromCloud(user.id);
    }
  };

  return { 
    user, 
    loading, 
    isSyncing, 
    login, 
    register, 
    loginWithGoogle, 
    logout,
    refresh 
  };
}